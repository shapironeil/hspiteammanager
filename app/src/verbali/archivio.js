'use strict';
// Archivio di Verbale Studio dentro le cartelle dei progetti del portale.
//
// Un solo archivio, leggibile anche senza il programma:
//   progetti/<progetto>/Verbali/<data> <titolo>/            <- cartella del checkpoint (vista anche in Esplora file)
//       Registrazione.mp4, Transcript originale.vtt, Transcript revisionato.txt, Email di riepilogo.txt, ...
//       .verbale/checkpoint.json                            <- dati del programma (nascosti in Esplora file)
//       .verbale/versioni/<data>_<motivo>.json              <- versioni precedenti del checkpoint
//   progetti/<progetto>/Verbali/.verbale-progetto.json      <- impostazioni del progetto (destinatari, glossario, ...)
//   progetti/<progetto>/Verbali/.verbale-apprendimento.json <- apprendimento locale
//   progetti/<progetto>/Verbali/.verbale-previsione.json    <- previsione del prossimo checkpoint
// La tabella "verbali" del database e' solo un indice: si ricostruisce dalle cartelle (sync).
// Se qualcuno rinomina o sposta la cartella di un checkpoint da Esplora file, il programma la ritrova.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../config');
const db = require('../db');
const ex = require('../explorer');
const storage = require('../storage');
const projects = require('../routes/projects');
const { HttpError } = require('../http');
const { DEFAULT_EXAMPLE_EMAIL, ATAC_GLOSSARY } = require('./testi');

const VERBALI = 'Verbali';
const META = '.verbale';
const PROJECT_FILE = '.verbale-progetto.json';
const LEARNING_FILE = '.verbale-apprendimento.json';
const FORECAST_FILE = '.verbale-previsione.json';
const SAVE_FIELDS = ['date', 'title', 'status', 'templateId', 'transcript', 'notes', 'summary', 'email', 'analysis', 'pins', 'chat'];
const KEEP_VERSIONS = 80;
const SNAPSHOT_EVERY_MS = 3 * 60 * 1000;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|m4a|mp3|wav)$/i;
const TRANSCRIPT_EXT = /\.(vtt|srt|txt|docx)$/i;

// ---- File JSON ------------------------------------------------------------------
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
// Scrittura atomica (file temporaneo + rinomina); su Windows l'antivirus puo' bloccare il file per un istante.
async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now().toString(36)}.part`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  for (let attempt = 0; ; attempt++) {
    try { await fsp.rename(tmp, file); return; } catch (err) {
      if (attempt >= 5) { await fsp.copyFile(tmp, file); await fsp.rm(tmp, { force: true }); return; }
      await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
    }
  }
}
// Prima di sostituire un file di impostazioni se ne conserva una copia con data e ora (mai cancellato).
async function keepCopy(file) {
  if (!fs.existsSync(file)) return;
  const dir = path.join(path.dirname(file), '.storico-impostazioni');
  await fsp.mkdir(dir, { recursive: true });
  await fsp.copyFile(file, path.join(dir, `${stamp()}__${path.basename(file)}`));
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

// Scritture sullo stesso checkpoint una alla volta (salvataggi automatici + caricamenti lunghi).
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
}

const winSafe = (s) => String(s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^[. ]+|[. ]+$/g, '').slice(0, 80) || 'Senza titolo';
const folderName = (c) => `${c.date} ${winSafe(c.title)}`;
const safeId = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);

// ---- Progetti -------------------------------------------------------------------
function openProject(user, pid) {
  const p = db.get('SELECT * FROM projects WHERE id = ?', Number(pid));
  if (!p || !projects.canSee(user, p)) throw new HttpError(404, 'Progetto non trovato.');
  const root = path.join(projects.baseDir(), p.folder);
  fs.mkdirSync(path.join(root, VERBALI), { recursive: true });
  return { p, root, space: `p${p.id}`, dir: path.join(root, VERBALI), canEdit: projects.canEdit(user, p) };
}

function visibleProjects(user) {
  projects.sync();
  return db.all("SELECT * FROM projects ORDER BY status = 'chiuso', name").filter((p) => projects.canSee(user, p)).map((p) => openProject(user, p.id));
}

function defaultsFor(p) {
  const atac = /atac/i.test(p.name);
  return {
    description: p.description || '',
    recipients: '',
    subjectTemplate: `${p.name} | Checkpoint {data} — punti discussi`,
    templateId: 'checkpoint-settimanale',
    glossary: atac ? ATAC_GLOSSARY : '',
    exampleEmail: DEFAULT_EXAMPLE_EMAIL,
  };
}

function projectView(P) {
  const saved = readJson(path.join(P.dir, PROJECT_FILE), {});
  return { ...defaultsFor(P.p), ...saved, id: String(P.p.id), name: P.p.name, client: P.p.client, portalFolder: P.p.folder, canEdit: P.canEdit };
}

const PROJECT_FIELDS = ['description', 'recipients', 'subjectTemplate', 'glossary', 'exampleEmail', 'templateId'];
async function saveProject(P, body, user) {
  const file = path.join(P.dir, PROJECT_FILE);
  const current = readJson(file, {});
  for (const k of PROJECT_FIELDS) if (typeof body[k] === 'string') current[k] = body[k].slice(0, 20000);
  current.updatedAt = db.now();
  current.updatedBy = user ? user.name : null;
  await keepCopy(file);
  await writeJson(file, current);
  return projectView(P);
}

const learningFile = (P) => path.join(P.dir, LEARNING_FILE);
const forecastFile = (P) => path.join(P.dir, FORECAST_FILE);

// ---- Indice e ricerca delle cartelle dei checkpoint ----------------------------------
const dataFile = (P, folder) => path.join(P.root, ...folder.split('/'), META, 'checkpoint.json');

function indexRow(P, c, folder, userId) {
  const cues = (c.transcript && c.transcript.cues) || [];
  const items = Object.values(c.summary || {}).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  db.run(
    `INSERT INTO verbali(id, project_id, folder, date, title, status, template_id, cue_count, reviewed_count, pin_count, item_count, updated_by, updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET project_id = excluded.project_id, folder = excluded.folder, date = excluded.date, title = excluded.title,
       status = excluded.status, template_id = excluded.template_id, cue_count = excluded.cue_count, reviewed_count = excluded.reviewed_count,
       pin_count = excluded.pin_count, item_count = excluded.item_count, updated_by = COALESCE(excluded.updated_by, verbali.updated_by), updated_at = excluded.updated_at`,
    c.id, P.p.id, folder, c.date || '', c.title || '', c.status || 'bozza', c.templateId || null, cues.length,
    cues.filter((q) => q.reviewed).length, (c.pins || []).length, items, userId || null, c.updatedAt || db.now());
}

// Cerca nella cartella del progetto tutte le cartelle con ".verbale/checkpoint.json" e allinea l'indice.
function sync(P) {
  const found = new Map();
  let dirs = 0;
  const walk = (abs, rel, depth) => {
    if (depth > 5 || dirs > 5000) return;
    let entries = [];
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    dirs++;
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === META) {
        const c = readJson(path.join(abs, META, 'checkpoint.json'), null);
        if (!c || !c.id || !rel) continue;
        if (found.has(c.id) || db.get('SELECT 1 AS x FROM verbali WHERE id = ? AND project_id != ?', c.id, P.p.id)) {
          // cartella copiata: la copia diventa un checkpoint a se'
          c.id = `${safeId(c.date) || 'checkpoint'}-${crypto.randomBytes(3).toString('hex')}`;
          fs.writeFileSync(path.join(abs, META, 'checkpoint.json'), JSON.stringify(c, null, 2));
        }
        found.set(c.id, { rel, c });
        continue;
      }
      if (e.name.startsWith('.')) continue;
      walk(path.join(abs, e.name), ex.join(rel, e.name), depth + 1);
    }
  };
  walk(P.root, '', 0);
  for (const [id, { rel, c }] of found) {
    const row = db.get('SELECT folder, updated_at FROM verbali WHERE id = ?', id);
    if (!row || row.folder !== rel || row.updated_at !== (c.updatedAt || row.updated_at)) indexRow(P, c, rel, null);
  }
  for (const row of db.all('SELECT id FROM verbali WHERE project_id = ?', P.p.id)) {
    if (!found.has(row.id)) db.run('DELETE FROM verbali WHERE id = ?', row.id); // cartella nel cestino o tolta: resta solo sul disco
  }
  return found.size;
}

function locate(P, cid) {
  const id = safeId(cid);
  let row = db.get('SELECT folder FROM verbali WHERE id = ? AND project_id = ?', id, P.p.id);
  if (!row || !fs.existsSync(dataFile(P, row.folder))) {
    sync(P);
    row = db.get('SELECT folder FROM verbali WHERE id = ? AND project_id = ?', id, P.p.id);
  }
  if (!row) throw new HttpError(404, 'Checkpoint non trovato.');
  return { id, folder: row.folder, abs: path.join(P.root, ...row.folder.split('/')) };
}

function load(P, cid) {
  const at = locate(P, cid);
  const c = readJson(dataFile(P, at.folder), null);
  if (!c) throw new HttpError(404, 'Checkpoint non trovato.');
  return decorate(P, c, at.folder);
}

// Campi calcolati: cartella attuale (puo' essere stata spostata) e percorso leggibile del video.
function decorate(P, c, folder) {
  c.projectId = String(P.p.id);
  c.folder = folder;
  if (c.video) {
    if (c.video.file) c.video.external = `${folder}/${c.video.file}`;
    else if (c.video.link) c.video.external = c.video.link.label || c.video.link.path;
  }
  return c;
}

async function list(P) {
  sync(P);
  const out = [];
  for (const row of db.all('SELECT id, folder FROM verbali WHERE project_id = ?', P.p.id)) {
    const c = readJson(dataFile(P, row.folder), null);
    if (c) out.push(decorate(P, c, row.folder));
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function summaryOf(c) {
  const cues = (c.transcript && c.transcript.cues) || [];
  const s = c.summary || {};
  return {
    id: c.id, projectId: c.projectId, date: c.date, title: c.title, status: c.status, updatedAt: c.updatedAt, updatedByName: c.updatedByName || null,
    hasVideo: Boolean(c.video), cueCount: cues.length, reviewedCount: cues.filter((q) => q.reviewed).length,
    flaggedCount: cues.filter((q) => q.flagged).length, duration: cues.length ? cues[cues.length - 1].end : 0,
    itemCount: Object.values(s).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0), pinCount: (c.pins || []).length,
  };
}

// ---- Creazione e salvataggio --------------------------------------------------------
async function create(P, body, user, extra = {}) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date : new Date().toISOString().slice(0, 10);
  const now = db.now();
  const c = {
    id: `${date}-${crypto.randomBytes(3).toString('hex')}`,
    date, title: String(body.title || 'Checkpoint').slice(0, 200), templateId: String(body.templateId || ''), status: 'bozza',
    createdAt: now, updatedAt: now, createdByName: user ? user.name : null, updatedByName: user ? user.name : null,
    video: null, transcript: { sourceName: '', cues: [] }, notes: '', summary: null, email: { subject: '', body: '', edited: false },
    ...extra,
  };
  const name = ex.freeName(P.dir, folderName(c));
  const folder = `${VERBALI}/${name}`;
  fs.mkdirSync(path.join(P.dir, name, META), { recursive: true });
  await writeJson(dataFile(P, folder), c);
  ex.upsert(P.space, folder, fs.statSync(path.join(P.dir, name)), user ? user.id : null);
  indexRow(P, c, folder, user ? user.id : null);
  return decorate(P, c, folder);
}

async function snapshot(abs, data, reason = 'auto') {
  const dir = path.join(abs, META, 'versioni');
  await fsp.mkdir(dir, { recursive: true });
  const names = (await fsp.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  if (reason === 'auto' && names.length) {
    const st = await fsp.stat(path.join(dir, names[names.length - 1])).catch(() => null);
    if (st && Date.now() - st.mtimeMs < SNAPSHOT_EVERY_MS) return null;
  }
  const name = `${stamp()}_${reason}.json`;
  await fsp.writeFile(path.join(dir, name), JSON.stringify(data));
  // oltre il limite le versioni piu' vecchie vanno in una sottocartella "archiviate" (non si cancellano)
  if (names.length + 1 > KEEP_VERSIONS) {
    const old = path.join(dir, 'archiviate');
    await fsp.mkdir(old, { recursive: true });
    for (const n of names.slice(0, names.length + 1 - KEEP_VERSIONS)) await fsp.rename(path.join(dir, n), path.join(old, n)).catch(() => {});
  }
  return name;
}

function describe(c) {
  const items = Object.values(c.summary || {}).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  return { cues: (c.transcript && c.transcript.cues ? c.transcript.cues.length : 0), items, pins: (c.pins || []).length, title: c.title, date: c.date, by: c.updatedByName || null };
}

async function listVersions(P, cid) {
  const at = locate(P, cid);
  const dir = path.join(at.abs, META, 'versioni');
  const files = (await fsp.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')).sort().reverse();
  const out = [];
  for (const f of files) {
    try {
      const c = JSON.parse(await fsp.readFile(path.join(dir, f), 'utf8'));
      const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})[-\dZ]*_(.+)\.json$/.exec(f);
      out.push({ file: f, savedAt: m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z` : '', reason: m ? m[5] : '', ...describe(c) });
    } catch { /* versione illeggibile: ignorata */ }
  }
  return out;
}

// Chi sta lavorando su un checkpoint (in memoria): serve ad avvisare se in due modificano lo stesso.
const editing = new Map();
function othersEditing(cid, user) {
  const e = editing.get(cid);
  return e && e.userId !== user.id && Date.now() - e.at < 120000 ? { name: e.name, at: new Date(e.at).toISOString() } : null;
}

async function save(P, cid, body, user) {
  const at = locate(P, cid);
  return withLock(`${P.p.id}/${at.id}`, async () => {
    const where = locate(P, cid);
    const file = dataFile(P, where.folder);
    const current = readJson(file, null);
    if (!current) throw new HttpError(404, 'Checkpoint non trovato.');
    const before = JSON.stringify(SAVE_FIELDS.map((k) => current[k]));
    const previous = JSON.parse(JSON.stringify(current));
    for (const k of SAVE_FIELDS) if (k in body) current[k] = body[k];
    if (typeof current.title !== 'string' || !current.title.trim()) current.title = previous.title || 'Checkpoint';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(current.date || '')) current.date = previous.date;
    const conflict = othersEditing(at.id, user);
    if (JSON.stringify(SAVE_FIELDS.map((k) => current[k])) !== before) {
      const replacedTranscript = previous.transcript && previous.transcript.cues && previous.transcript.cues.length && body.transcript && body.transcript.importedAt !== previous.transcript.importedAt;
      // se a modificare e' una persona diversa dall'ultima, la versione precedente si conserva sempre
      const reason = replacedTranscript ? 'prima-del-nuovo-transcript' : previous.updatedByName && previous.updatedByName !== user.name ? 'prima-di-' + safeId(user.name.replace(/\s+/g, '-')) : 'auto';
      await snapshot(where.abs, previous, reason).catch(() => {});
      current.updatedAt = db.now();
      current.updatedByName = user.name;
    }
    editing.set(at.id, { userId: user.id, name: user.name, at: Date.now() });
    let folder = where.folder;
    folder = renameFolderIfNeeded(P, current, folder, user);
    await writeJson(dataFile(P, folder), current);
    await writeExports(P, current, folder, user).catch((err) => db.issue('verbale-studio', 'Esportazione non riuscita: ' + err.message, err.stack, user));
    indexRow(P, current, folder, user.id);
    const out = decorate(P, current, folder);
    out.conflict = conflict;
    return out;
  });
}

// Se cambiano data o titolo la cartella si rinomina (se il video e' in uso, si riprova al salvataggio dopo).
function renameFolderIfNeeded(P, c, folder, user) {
  const base = folder.split('/').pop();
  const wanted = folderName(c);
  if (base === wanted || base.startsWith(`${wanted} (`)) return folder;
  const parentAbs = path.join(P.root, ...ex.parentOf(folder).split('/').filter(Boolean));
  if (fs.existsSync(path.join(parentAbs, wanted))) return folder;
  try { return ex.rename(P.space, P.root, folder, wanted, user ? user.id : null); } catch { return folder; }
}

const fmtShort = (sec) => {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec % 60).padStart(2, '0')}`;
};

// File leggibili senza il programma, nella cartella del checkpoint. Si riscrivono solo se cambiano.
async function writeExports(P, c, folder, user) {
  const header = `${P.p.name} — ${c.title} — ${String(c.date).split('-').reverse().join('/')}`;
  const cues = (c.transcript && c.transcript.cues) || [];
  const files = {};
  if (cues.length) files['Transcript revisionato.txt'] = `${header}\r\n\r\n` + cues.map((q) => `[${fmtShort(q.start)}] ${q.speaker ? q.speaker + ': ' : ''}${q.text}`).join('\r\n') + '\r\n';
  if (c.email && c.email.body && c.email.body.trim()) files['Email di riepilogo.txt'] = `Oggetto: ${c.email.subject || ''}\r\n\r\n${c.email.body.replace(/\r?\n/g, '\r\n')}\r\n`;
  if (c.pins && c.pins.length) files['Punti chiave.txt'] = `${header} — punti chiave\r\n\r\n` + c.pins.map((p) => `[${fmtShort(p.start)}] ${p.speaker ? p.speaker + ': ' : ''}${p.text}${p.section ? '  (inserito nel riepilogo)' : ''}`).join('\r\n') + '\r\n';
  if (c.notes && c.notes.trim()) files['Note.txt'] = c.notes.replace(/\r?\n/g, '\r\n');
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from('﻿' + text, 'utf8');
    const abs = path.join(P.root, ...folder.split('/'), name);
    let same = false;
    try { same = fs.readFileSync(abs).equals(data); } catch { /* non esiste ancora */ }
    if (!same) ex.writeBuffer(P.space, P.root, `${folder}/${name}`, data, user ? user.id : null);
  }
}

async function restoreVersion(P, cid, file, user) {
  if (!/^[\w.-]+\.json$/.test(String(file || ''))) throw new HttpError(400, 'Versione non valida.');
  const at = locate(P, cid);
  const version = readJson(path.join(at.abs, META, 'versioni', file), null);
  if (!version) throw new HttpError(404, 'Versione non trovata.');
  return withLock(`${P.p.id}/${at.id}`, async () => {
    const where = locate(P, cid);
    const current = readJson(dataFile(P, where.folder), null);
    await snapshot(where.abs, current, 'prima-del-ripristino');
    for (const k of SAVE_FIELDS) if (k in version) current[k] = version[k];
    current.updatedAt = db.now();
    current.updatedByName = user.name;
    const folder = renameFolderIfNeeded(P, current, where.folder, user);
    await writeJson(dataFile(P, folder), current);
    await writeExports(P, current, folder, user).catch(() => {});
    indexRow(P, current, folder, user.id);
    return decorate(P, current, folder);
  });
}

// "Elimina checkpoint": la cartella intera va nel cestino del progetto (Esplora file → Cestino per recuperarla).
async function trash(P, cid, user) {
  const at = locate(P, cid);
  return withLock(`${P.p.id}/${at.id}`, async () => {
    const id = ex.trash(P.space, P.root, at.folder, user);
    db.run('DELETE FROM verbali WHERE id = ?', at.id);
    return id;
  });
}

// ---- Video e transcript -------------------------------------------------------------
// Il video vecchio non si cancella: va nel cestino del progetto.
function retireVideo(P, c, folder, user, keepName) {
  if (c.video && c.video.file && c.video.file !== keepName) {
    const rel = `${folder}/${c.video.file}`;
    if (fs.existsSync(path.join(P.root, ...rel.split('/')))) ex.trash(P.space, P.root, rel, user);
  }
}

async function uploadVideo(P, cid, req, originalName, user) {
  const at = locate(P, cid);
  const original = path.basename(String(originalName || 'video.mp4'));
  const ext = (path.extname(original).toLowerCase().match(/^\.[a-z0-9]{1,5}$/) || ['.mp4'])[0];
  const target = `Registrazione${ext}`;
  const incoming = path.join(at.abs, `${target}.nuovo`);
  await storage.saveToPath(req, incoming);
  return withLock(`${P.p.id}/${at.id}`, async () => {
    const where = locate(P, cid);
    const c = readJson(dataFile(P, where.folder), null);
    const abs = path.join(where.abs, target);
    if (fs.existsSync(abs)) ex.trash(P.space, P.root, `${where.folder}/${target}`, user);
    retireVideo(P, c, where.folder, user, target);
    fs.renameSync(path.join(where.abs, `${target}.nuovo`), abs);
    const st = fs.statSync(abs);
    ex.upsert(P.space, `${where.folder}/${target}`, st, user.id);
    c.video = { file: target, copied: true, name: original, size: st.size, uploadedAt: db.now() };
    c.updatedAt = db.now();
    await writeJson(dataFile(P, where.folder), c);
    return decorate(P, c, where.folder).video;
  });
}

// Usa un video gia' presente in uno spazio del portale. Da uno spazio personale si fa sempre una copia
// (gli altri membri del progetto non vedono i file personali); da un progetto si puo' solo collegare.
async function linkVideo(P, cid, src, copy, user) {
  const at = locate(P, cid);
  const st = fs.statSync(src.abs);
  return withLock(`${P.p.id}/${at.id}`, async () => {
    const where = locate(P, cid);
    const c = readJson(dataFile(P, where.folder), null);
    const mustCopy = copy || src.space !== P.space;
    const label = `${src.label}/${src.rel}`;
    if (mustCopy && !src.abs.startsWith(where.abs + path.sep)) {
      const target = `Registrazione${path.extname(src.abs).toLowerCase() || '.mp4'}`;
      const abs = path.join(where.abs, target);
      const tmp = `${abs}.nuovo`;
      await fsp.copyFile(src.abs, tmp);
      if (fs.existsSync(abs)) ex.trash(P.space, P.root, `${where.folder}/${target}`, user);
      retireVideo(P, c, where.folder, user, target);
      fs.renameSync(tmp, abs);
      ex.upsert(P.space, `${where.folder}/${target}`, fs.statSync(abs), user.id);
      c.video = { file: target, copied: true, source: label, sourceRel: src.id, name: path.basename(src.abs), size: st.size, uploadedAt: db.now() };
    } else if (src.abs.startsWith(where.abs + path.sep) && path.dirname(src.abs) === where.abs) {
      retireVideo(P, c, where.folder, user, path.basename(src.abs));
      c.video = { file: path.basename(src.abs), copied: false, source: label, sourceRel: src.id, name: path.basename(src.abs), size: st.size, uploadedAt: db.now() };
    } else {
      retireVideo(P, c, where.folder, user, null);
      c.video = { link: { space: src.space, path: src.rel, label }, copied: false, source: label, sourceRel: src.id, name: path.basename(src.abs), size: st.size, uploadedAt: db.now() };
    }
    c.updatedAt = db.now();
    await writeJson(dataFile(P, where.folder), c);
    return decorate(P, c, where.folder).video;
  });
}

async function removeVideo(P, cid, user) {
  const at = locate(P, cid);
  return withLock(`${P.p.id}/${at.id}`, async () => {
    const where = locate(P, cid);
    const c = readJson(dataFile(P, where.folder), null);
    retireVideo(P, c, where.folder, user, null);
    c.video = null;
    c.updatedAt = db.now();
    await writeJson(dataFile(P, where.folder), c);
  });
}

async function saveTranscriptFile(P, cid, buf, originalName, user) {
  const at = locate(P, cid);
  const ext = (path.extname(String(originalName || '')).toLowerCase().match(/^\.(vtt|srt|txt|docx)$/) || ['.txt'])[0];
  return withLock(`${P.p.id}/${at.id}`, async () => {
    const where = locate(P, cid);
    const c = readJson(dataFile(P, where.folder), null);
    const name = `Transcript originale${ext}`;
    // un transcript originale precedente (anche con estensione diversa) resta nelle versioni del file
    if (c.transcriptFile && c.transcriptFile !== name && fs.existsSync(path.join(where.abs, c.transcriptFile))) {
      ex.keepVersion(P.root, where.folder.split('/'), path.join(where.abs, c.transcriptFile), c.transcriptFile);
    }
    ex.writeBuffer(P.space, P.root, `${where.folder}/${name}`, buf, user.id, { keepHistory: true });
    c.transcriptFile = name;
    await writeJson(dataFile(P, where.folder), c);
    return `${where.folder}/${name}`;
  });
}

module.exports = {
  VERBALI, META, SAVE_FIELDS, VIDEO_EXT, TRANSCRIPT_EXT,
  readJson, writeJson, keepCopy, withLock, winSafe, folderName, safeId, stamp,
  openProject, visibleProjects, projectView, saveProject, learningFile, forecastFile,
  sync, locate, load, list, summaryOf, create, save, snapshot, listVersions, restoreVersion, trash, othersEditing,
  uploadVideo, linkVideo, removeVideo, saveTranscriptFile, writeExports, indexRow, dataFile, decorate,
};
