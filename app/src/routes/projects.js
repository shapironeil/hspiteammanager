'use strict';
// Progetti: scheda, persone autorizzate, collegamento alla cartella aziendale e file locali.
//
// Regola dei permessi: un progetto lo vede solo chi ne e' membro (e l'Hacker).
// I file "veri" restano dove sono gia' protetti dall'azienda (OneDrive/SharePoint):
// il portale tiene il link alla cartella, non una copia. La cartella locale
// progetti/<nome> serve per il materiale di lavoro che nasce nel portale.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const db = require('../db');
const media = require('../media');
const storage = require('../storage');
const { route, HttpError } = require('../http');
const { cleanText } = require('./auth');

const STATUSES = { attivo: 'Attivo', 'in-pausa': 'In pausa', chiuso: 'Chiuso' };
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const optional = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function baseDir() {
  try {
    const hit = fs.readdirSync(config.ROOT, { withFileTypes: true }).find((e) => e.isDirectory() && ['progetti', 'projects'].includes(norm(e.name)));
    if (hit) return path.join(config.ROOT, hit.name);
  } catch { /* si crea sotto */ }
  const dir = path.join(config.ROOT, 'progetti');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Nome di cartella sicuro a partire dal nome del progetto.
function folderName(name) {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'progetto';
  let candidate = clean;
  for (let n = 2; fs.existsSync(path.join(baseDir(), candidate)); n++) candidate = `${clean}-${n}`;
  return candidate;
}

// Una cartella messa a mano in "progetti" diventa un progetto visibile solo all'Hacker,
// che poi decide chi puo' vederlo.
function sync() {
  let names = [];
  try { names = fs.readdirSync(baseDir(), { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name); } catch { return; }
  const known = db.all('SELECT folder FROM projects').map((r) => r.folder);
  for (const folder of names) {
    if (known.includes(folder)) continue;
    db.run('INSERT INTO projects(name, client, description, status, onedrive_url, folder, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)',
      folder.replace(/[_-]+/g, ' '), '', '', 'attivo', '', folder, db.now(), db.now());
  }
}

// Membro = permanente (expires_at vuoto) oppure ospite con accesso non ancora scaduto.
const isMember = (user, id) => !!db.get('SELECT 1 AS x FROM project_members WHERE project_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > ?)', id, user.id, db.now());
const canSee = (user, p) => user.role === 'hacker' || isMember(user, p.id);
const canEdit = (user, p) => user.role === 'hacker' || (user.role === 'manager' && isMember(user, p.id));

function find(ctx, needEdit) {
  const p = db.get('SELECT * FROM projects WHERE id = ?', Number(ctx.params.id));
  // Chi non puo' vederlo riceve "non trovato": non deve nemmeno sapere che esiste.
  if (!p || !canSee(ctx.user, p)) throw new HttpError(404, 'Progetto non trovato.');
  if (needEdit && !canEdit(ctx.user, p)) throw new HttpError(403, 'Non puoi modificare questo progetto.');
  return p;
}

function members(id) {
  return db.all(
    `SELECT u.id, u.name, u.username, u.avatar FROM project_members m JOIN users u ON u.id = m.user_id
     WHERE m.project_id = ? AND m.expires_at IS NULL AND u.deleted_at IS NULL ORDER BY u.name`, id).map((u) => ({ ...u, avatar: media.avatarUrl(u.avatar) }));
}
// Ospiti con accesso a tempo, ancora validi.
function guests(id) {
  return db.all(
    `SELECT u.id, u.name, u.username, u.avatar, m.expires_at AS expiresAt, m.added_at AS addedAt, b.name AS addedBy
     FROM project_members m JOIN users u ON u.id = m.user_id LEFT JOIN users b ON b.id = m.added_by
     WHERE m.project_id = ? AND m.expires_at IS NOT NULL AND m.expires_at > ? AND u.deleted_at IS NULL ORDER BY m.expires_at`, id, db.now())
    .map((u) => ({ ...u, avatar: media.avatarUrl(u.avatar) }));
}

const view = (user, p) => ({
  id: p.id, name: p.name, client: p.client, description: p.description, status: p.status,
  onedriveUrl: p.onedrive_url, folder: p.folder, updatedAt: p.updated_at,
  members: members(p.id), guests: guests(p.id), canEdit: canEdit(user, p),
});

function readFields(b) {
  const status = b.status || 'attivo';
  if (!Object.hasOwn(STATUSES, status)) throw new HttpError(400, 'Stato non valido.');
  const url = optional(b.onedriveUrl, 1000);
  if (url && !/^https:\/\/[^\s]+$/i.test(url)) throw new HttpError(400, 'Il link alla cartella deve iniziare con https://');
  return { name: cleanText(b.name, 80, 'Nome'), client: optional(b.client, 80), description: optional(b.description, 500), status, url };
}

// Membri permanenti scelti nella scheda. Gli ospiti a tempo restano (chi diventa membro permanente smette di essere ospite).
function setMembers(projectId, ids, always) {
  const wanted = new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger));
  if (always) wanted.add(always);
  db.run('DELETE FROM project_members WHERE project_id = ? AND expires_at IS NULL', projectId);
  for (const id of wanted) {
    if (!db.get('SELECT 1 AS x FROM users WHERE id = ? AND active = 1 AND deleted_at IS NULL', id)) continue;
    db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', projectId, id);
    db.run('UPDATE project_access_log SET ended_at = ? WHERE project_id = ? AND user_id = ? AND ended_at IS NULL', db.now(), projectId, id);
    db.run('INSERT INTO project_members(project_id, user_id, added_at) VALUES(?, ?, ?)', projectId, id, db.now());
  }
}

route('GET', '/api/projects', {}, (ctx) => {
  sync();
  const rows = db.all('SELECT * FROM projects ORDER BY status = \'chiuso\', name');
  ctx.json(200, { statuses: STATUSES, canCreate: config.roleRank(ctx.user.role) >= config.roleRank('manager'), projects: rows.filter((p) => canSee(ctx.user, p)).map((p) => view(ctx.user, p)) });
});

route('POST', '/api/projects', { role: 'manager' }, async (ctx) => {
  const b = await ctx.body();
  const f = readFields(b);
  const folder = folderName(f.name);
  fs.mkdirSync(path.join(baseDir(), folder), { recursive: true });
  const r = db.run('INSERT INTO projects(name, client, description, status, onedrive_url, folder, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
    f.name, f.client, f.description, f.status, f.url, folder, ctx.user.id, db.now(), db.now());
  const id = Number(r.lastInsertRowid);
  // Chi crea il progetto ne fa parte (l'Hacker lo vede comunque).
  setMembers(id, b.members, ctx.user.role === 'hacker' ? null : ctx.user.id);
  db.log(ctx, 'progetto.creato', f.name);
  ctx.json(201, { id });
});

route('PATCH', '/api/projects/:id', {}, async (ctx) => {
  const p = find(ctx, true);
  const b = await ctx.body();
  const f = readFields(b);
  db.run('UPDATE projects SET name = ?, client = ?, description = ?, status = ?, onedrive_url = ?, updated_at = ? WHERE id = ?',
    f.name, f.client, f.description, f.status, f.url, db.now(), p.id);
  if (b.members !== undefined) setMembers(p.id, b.members, ctx.user.role === 'hacker' ? null : ctx.user.id);
  db.log(ctx, 'progetto.modificato', f.name);
  ctx.json(200, { ok: true });
});

// Toglie il progetto dal portale. La cartella con i file NON viene cancellata.
route('DELETE', '/api/projects/:id', { role: 'hacker' }, (ctx) => {
  const p = find(ctx, true);
  db.run('DELETE FROM project_members WHERE project_id = ?', p.id);
  db.run('DELETE FROM projects WHERE id = ?', p.id);
  db.log(ctx, 'progetto.rimosso', `${p.name} (cartella conservata: ${p.folder})`);
  ctx.json(200, { ok: true });
});

// ---- Ospiti a tempo -------------------------------------------------------------
// Chi gestisce il progetto aggiunge una persona per un numero di giorni. Resta traccia nello storico degli accessi.
route('POST', '/api/projects/:id/guests', {}, async (ctx) => {
  const p = find(ctx, true);
  const b = await ctx.body();
  const days = Math.round(Number(b.days));
  if (!Number.isFinite(days) || days < 1 || days > 365) throw new HttpError(400, 'Giorni: tra 1 e 365.');
  const u = db.get('SELECT id, name FROM users WHERE id = ? AND active = 1 AND deleted_at IS NULL AND pending = 0', Number(b.userId));
  if (!u) throw new HttpError(400, 'Persona non trovata.');
  if (db.get('SELECT 1 AS x FROM project_members WHERE project_id = ? AND user_id = ? AND expires_at IS NULL', p.id, u.id)) throw new HttpError(409, `${u.name} fa già parte del progetto.`);
  const now = db.now();
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  const note = optional(b.note, 200);
  db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', p.id, u.id);
  db.run('INSERT INTO project_members(project_id, user_id, expires_at, added_by, added_at) VALUES(?,?,?,?,?)', p.id, u.id, expires, ctx.user.id, now);
  db.run('UPDATE project_access_log SET ended_at = ? WHERE project_id = ? AND user_id = ? AND ended_at IS NULL', now, p.id, u.id);
  db.run('INSERT INTO project_access_log(project_id, user_id, added_by, days, note, starts_at, expires_at) VALUES(?,?,?,?,?,?,?)', p.id, u.id, ctx.user.id, days, note, now, expires);
  db.log(ctx, 'progetto.ospite-aggiunto', `${p.name}: ${u.name} per ${days} giorni${note ? ` (${note})` : ''}`);
  ctx.json(201, { expiresAt: expires });
});

route('DELETE', '/api/projects/:id/guests/:userId', {}, (ctx) => {
  const p = find(ctx, true);
  const uid = Number(ctx.params.userId);
  const r = db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ? AND expires_at IS NOT NULL', p.id, uid);
  if (!r.changes) throw new HttpError(404, 'Ospite non trovato.');
  db.run('UPDATE project_access_log SET ended_at = ? WHERE project_id = ? AND user_id = ? AND ended_at IS NULL', db.now(), p.id, uid);
  db.log(ctx, 'progetto.ospite-tolto', `${p.name}: utente ${uid}`);
  ctx.json(200, { ok: true });
});

// ---- File locali del progetto -------------------------------------------------
// Risolve un percorso dentro la cartella del progetto e rifiuta tutto cio' che ne esce.
function inside(p, rel) {
  const root = path.join(baseDir(), p.folder);
  const clean = String(rel || '').replace(/\\/g, '/').split('/').filter(Boolean);
  if (clean.some((s) => s === '..' || s === '.' || s.includes('\0') || s.includes(':'))) throw new HttpError(400, 'Percorso non valido.');
  const full = path.join(root, ...clean);
  if (full !== root && !full.startsWith(root + path.sep)) throw new HttpError(400, 'Percorso non valido.');
  return { root, full, rel: clean.join('/') };
}

route('GET', '/api/projects/:id/files', {}, (ctx) => {
  const p = find(ctx);
  const at = inside(p, ctx.query.get('path'));
  fs.mkdirSync(at.root, { recursive: true });
  let entries;
  try { entries = fs.readdirSync(at.full, { withFileTypes: true }); } catch { throw new HttpError(404, 'Cartella non trovata.'); }
  const folders = [];
  const files = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith('.') || e.name.endsWith('.part') || e.name.endsWith('.nuovo')) continue;
    if (e.isDirectory()) folders.push(e.name);
    else if (e.isFile()) {
      const st = fs.statSync(path.join(at.full, e.name));
      files.push({ name: e.name, size: st.size, modifiedAt: st.mtime.toISOString(), viewable: Object.hasOwn(VIEW, path.extname(e.name).toLowerCase()) });
    }
  }
  ctx.json(200, { path: at.rel, folders, files });
});

route('GET', '/api/projects/:id/download', {}, (ctx) => {
  const p = find(ctx);
  const at = inside(p, ctx.query.get('path'));
  let stat;
  try { stat = fs.statSync(at.full); } catch { stat = null; }
  if (!stat || !stat.isFile()) throw new HttpError(404, 'File non trovato.');
  db.log(ctx, 'progetto.file-scaricato', `${p.name}: ${at.rel}`);
  storage.sendPath(ctx.res, at.full, path.basename(at.full));
});

// Tipi che si possono guardare direttamente nel browser. Gli altri si scaricano.
const VIEW = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.json': 'text/plain; charset=utf-8',
  '.csv': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
};

route('GET', '/api/projects/:id/view', {}, (ctx) => {
  const p = find(ctx);
  const at = inside(p, ctx.query.get('path'));
  const type = VIEW[path.extname(at.full).toLowerCase()];
  if (!type) throw new HttpError(415, 'Questo tipo di file non si puo\' vedere in anteprima: scaricalo.');
  let stat;
  try { stat = fs.statSync(at.full); } catch { stat = null; }
  if (!stat || !stat.isFile()) throw new HttpError(404, 'File non trovato.');
  db.log(ctx, 'progetto.file-aperto', `${p.name}: ${at.rel}`);
  ctx.res.writeHead(200, {
    'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    // Un documento HTML viene mostrato "in gabbia": niente script, niente accesso al portale.
    'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:",
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(path.basename(at.full))}`,
  });
  fs.createReadStream(at.full).pipe(ctx.res);
});

route('POST', '/api/projects/:id/folders', {}, async (ctx) => {
  const p = find(ctx);
  const b = await ctx.body();
  const name = storage.cleanName(b.name);
  if (name.startsWith('.')) throw new HttpError(400, 'Il nome non puo\' iniziare con un punto.');
  const dir = inside(p, b.path);
  const target = path.join(dir.full, name);
  if (fs.existsSync(target)) throw new HttpError(409, 'Esiste già una cartella o un file con questo nome.');
  fs.mkdirSync(target, { recursive: true });
  db.log(ctx, 'progetto.cartella-creata', `${p.name}: ${dir.rel ? dir.rel + '/' : ''}${name}`);
  ctx.json(201, { ok: true });
});

// Carica un file. Se esiste gia' e si chiede di sostituirlo (overwrite=1), la versione precedente
// non va persa: viene spostata nella cartella nascosta ".storico" del progetto, con data e ora.
route('PUT', '/api/projects/:id/files', {}, async (ctx) => {
  const p = find(ctx);
  const name = storage.cleanName(ctx.query.get('name'));
  if (name.startsWith('.')) throw new HttpError(400, 'Il nome non puo\' iniziare con un punto.');
  const dir = inside(p, ctx.query.get('path'));
  fs.mkdirSync(dir.full, { recursive: true });
  const target = path.join(dir.full, name);
  const exists = fs.existsSync(target);
  if (exists && ctx.query.get('overwrite') !== '1') throw new HttpError(409, 'Esiste già un file con questo nome in questa cartella.');
  if (exists && !fs.statSync(target).isFile()) throw new HttpError(409, 'Esiste già una cartella con questo nome.');
  const incoming = target + '.nuovo';
  await storage.saveToPath(ctx.req, incoming);
  if (exists) {
    const stamp = db.now().replace(/[:.]/g, '-');
    const keep = path.join(dir.root, '.storico', ...dir.rel.split('/').filter(Boolean));
    fs.mkdirSync(keep, { recursive: true });
    fs.renameSync(target, path.join(keep, `${stamp}__${name}`));
  }
  fs.renameSync(incoming, target);
  db.log(ctx, exists ? 'progetto.file-sostituito' : 'progetto.file-caricato', `${p.name}: ${dir.rel ? dir.rel + '/' : ''}${name}`);
  ctx.json(201, { ok: true, replaced: exists });
});

module.exports = { baseDir, sync, canSee, canEdit, isMember, folderName };
