'use strict';
// Esplora file: operazioni su cartelle VERE del disco (spazio personale e cartelle dei progetti)
// con un indice nel database per la ricerca e le modifiche recenti.
//
// Regole che non si cambiano:
//  - niente si cancella davvero: "Elimina" sposta nel cestino nascosto ".cestino" dello spazio;
//  - sostituire un file conserva la versione precedente nella cartella nascosta ".storico";
//  - nessun percorso puo' uscire dalla radice dello spazio;
//  - i nomi che iniziano con "." sono riservati al portale e non si vedono.
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const storage = require('./storage');
const { HttpError } = require('./http');

const TRASH = '.cestino';
const HISTORY = '.storico';

// Tipi che si possono aprire nel browser (anteprima); gli altri si scaricano.
const VIEW = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.json': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8', '.vtt': 'text/plain; charset=utf-8', '.srt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};
const viewType = (name) => VIEW[path.extname(name).toLowerCase()] || null;

const stamp = () => db.now().replace(/[:.]/g, '-');

// ---- Percorsi -------------------------------------------------------------------
function splitRel(rel) {
  const parts = String(rel || '').replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.some((s) => s === '..' || s === '.' || s.includes('\0') || s.includes(':') || s.startsWith('.'))) throw new HttpError(400, 'Percorso non valido.');
  return parts;
}
function resolve(root, rel) {
  const parts = splitRel(rel);
  const full = path.join(root, ...parts);
  if (full !== root && !full.startsWith(root + path.sep)) throw new HttpError(400, 'Percorso non valido.');
  return { full, rel: parts.join('/'), parts };
}
const join = (a, b) => (a ? `${a}/${b}` : b);
const parentOf = (rel) => rel.split('/').slice(0, -1).join('/');

function cleanName(raw) {
  const name = storage.cleanName(raw);
  if (name.startsWith('.')) throw new HttpError(400, 'Il nome non può iniziare con un punto.');
  return name;
}

// Nome libero: "Verbale.docx" -> "Verbale (2).docx" se esiste gia'
function freeName(dir, name) {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!fs.existsSync(path.join(dir, candidate))) return candidate;
  }
}

// ---- Indice ---------------------------------------------------------------------
function upsert(space, rel, st, userId) {
  if (!rel) return;
  db.run(
    `INSERT INTO fs_index(space, path, parent, name, is_dir, size, mtime, updated_by, updated_at) VALUES(?,?,?,?,?,?,?,?,?)
     ON CONFLICT(space, path) DO UPDATE SET is_dir = excluded.is_dir, size = excluded.size, mtime = excluded.mtime,
       updated_by = COALESCE(excluded.updated_by, fs_index.updated_by), updated_at = excluded.updated_at`,
    space, rel, parentOf(rel), rel.split('/').pop(), st.isDirectory() ? 1 : 0, st.isDirectory() ? 0 : st.size, st.mtime.toISOString(), userId || null,
    userId ? db.now() : st.mtime.toISOString());
}
function unindex(space, rel) {
  db.run("DELETE FROM fs_index WHERE space = ? AND (path = ? OR path LIKE ? ESCAPE '\\')", space, rel, `${rel.replace(/[%_\\]/g, '\\$&')}/%`);
}
// Allinea l'indice al contenuto reale di una cartella (file aggiunti o tolti da fuori dal portale).
function reconcile(space, relDir, seen) {
  const known = db.all('SELECT path FROM fs_index WHERE space = ? AND parent = ?', space, relDir).map((r) => r.path);
  for (const p of known) if (!seen.has(p)) unindex(space, p);
}
// Indicizza tutto uno spazio (all'avvio e periodicamente): serve alla ricerca.
function reindex(space, root, limit = 50000) {
  if (!fs.existsSync(root)) return 0;
  let count = 0;
  const walk = (dir, rel) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const seen = new Set();
    for (const e of entries) {
      if (count >= limit || e.name.startsWith('.') || e.name.endsWith('.part') || e.name.endsWith('.nuovo')) continue;
      const r = join(rel, e.name);
      const full = path.join(dir, e.name);
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      const row = db.get('SELECT mtime, size FROM fs_index WHERE space = ? AND path = ?', space, r);
      if (!row || row.mtime !== st.mtime.toISOString() || row.size !== (st.isDirectory() ? 0 : st.size)) upsert(space, r, st, null);
      seen.add(r);
      count++;
      if (st.isDirectory()) walk(full, r);
    }
    reconcile(space, rel, seen);
  };
  walk(root, '');
  return count;
}

// ---- Elenco ---------------------------------------------------------------------
function versionNames(root, rel) {
  const dir = path.join(root, HISTORY, ...parentOf(rel).split('/').filter(Boolean));
  const name = rel.split('/').pop();
  try {
    return fs.readdirSync(dir).filter((n) => n.endsWith(`__${name}`)).sort().reverse();
  } catch { return []; }
}

function list(space, root, relDir) {
  fs.mkdirSync(root, { recursive: true });
  const at = resolve(root, relDir);
  let entries;
  try { entries = fs.readdirSync(at.full, { withFileTypes: true }); } catch { throw new HttpError(404, 'Cartella non trovata.'); }
  const folders = [];
  const files = [];
  const seen = new Set();
  const historyDir = path.join(root, HISTORY, ...at.parts);
  let history = [];
  try { history = fs.readdirSync(historyDir); } catch { /* nessuna versione */ }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name, 'it', { numeric: true }))) {
    if (e.name.startsWith('.') || e.name.endsWith('.part') || e.name.endsWith('.nuovo')) continue;
    const rel = join(at.rel, e.name);
    let st;
    try { st = fs.statSync(path.join(at.full, e.name)); } catch { continue; }
    upsert(space, rel, st, null);
    seen.add(rel);
    if (st.isDirectory()) {
      let items = 0;
      try { items = fs.readdirSync(path.join(at.full, e.name)).filter((n) => !n.startsWith('.')).length; } catch { /* illeggibile */ }
      folders.push({ name: e.name, modifiedAt: st.mtime.toISOString(), items });
    } else if (st.isFile()) {
      files.push({
        name: e.name, size: st.size, modifiedAt: st.mtime.toISOString(), type: viewType(e.name),
        versions: history.filter((n) => n.endsWith(`__${e.name}`)).length,
      });
    }
  }
  reconcile(space, at.rel, seen);
  // chi ha modificato per ultimo (dall'indice)
  const who = new Map(db.all(
    `SELECT f.path, u.name FROM fs_index f JOIN users u ON u.id = f.updated_by WHERE f.space = ? AND f.parent = ?`, space, at.rel).map((r) => [r.path, r.name]));
  for (const f of files) f.by = who.get(join(at.rel, f.name)) || null;
  return { path: at.rel, folders, files };
}

// ---- Modifiche ------------------------------------------------------------------
function mkdir(space, root, relDir, rawName, userId) {
  const name = cleanName(rawName);
  const dir = resolve(root, relDir);
  const target = path.join(dir.full, name);
  if (fs.existsSync(target)) throw new HttpError(409, 'Esiste già una cartella o un file con questo nome.');
  fs.mkdirSync(target, { recursive: true });
  upsert(space, join(dir.rel, name), fs.statSync(target), userId);
  return join(dir.rel, name);
}

// Salva il corpo della richiesta come file. Se esiste e overwrite e' vero, la versione attuale va in .storico.
async function upload(space, root, req, relDir, rawName, overwrite, userId) {
  const name = cleanName(rawName);
  const dir = resolve(root, relDir);
  fs.mkdirSync(dir.full, { recursive: true });
  const target = path.join(dir.full, name);
  const exists = fs.existsSync(target);
  if (exists && !overwrite) throw new HttpError(409, 'Esiste già un file con questo nome in questa cartella.');
  if (exists && !fs.statSync(target).isFile()) throw new HttpError(409, 'Esiste già una cartella con questo nome.');
  const incoming = target + '.nuovo';
  await storage.saveToPath(req, incoming);
  if (exists) keepVersion(root, dir.parts, target, name);
  fs.renameSync(incoming, target);
  const rel = join(dir.rel, name);
  upsert(space, rel, fs.statSync(target), userId);
  return { path: rel, replaced: exists };
}

function keepVersion(root, dirParts, file, name) {
  const keep = path.join(root, HISTORY, ...dirParts);
  fs.mkdirSync(keep, { recursive: true });
  fs.renameSync(file, path.join(keep, `${stamp()}__${name}`));
}

// Scrive un file a partire da dati in memoria (usato dalle app del portale, es. Verbale Studio).
function writeBuffer(space, root, rel, data, userId, { keepHistory = false } = {}) {
  const at = resolve(root, rel);
  fs.mkdirSync(path.dirname(at.full), { recursive: true });
  if (keepHistory && fs.existsSync(at.full)) {
    const copy = path.join(root, HISTORY, ...at.parts.slice(0, -1));
    fs.mkdirSync(copy, { recursive: true });
    fs.copyFileSync(at.full, path.join(copy, `${stamp()}__${at.parts[at.parts.length - 1]}`));
  }
  const tmp = `${at.full}.${process.pid}.part`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, at.full);
  upsert(space, at.rel, fs.statSync(at.full), userId);
}

function rename(space, root, rel, rawName, userId) {
  const at = resolve(root, rel);
  if (!at.rel) throw new HttpError(400, 'Non si può rinominare la cartella principale.');
  if (!fs.existsSync(at.full)) throw new HttpError(404, 'Elemento non trovato.');
  const name = cleanName(rawName);
  const target = path.join(path.dirname(at.full), name);
  if (fs.existsSync(target)) throw new HttpError(409, 'Esiste già un elemento con questo nome.');
  fs.renameSync(at.full, target);
  moveHistory(root, at.parts, [...at.parts.slice(0, -1), name]);
  unindex(space, at.rel);
  const newRel = join(parentOf(at.rel), name);
  upsert(space, newRel, fs.statSync(target), userId);
  if (fs.statSync(target).isDirectory()) reindexUnder(space, root, newRel);
  return newRel;
}

function move(space, root, rel, toDir, userId) {
  const at = resolve(root, rel);
  if (!at.rel) throw new HttpError(400, 'Non si può spostare la cartella principale.');
  if (!fs.existsSync(at.full)) throw new HttpError(404, 'Elemento non trovato.');
  const dest = resolve(root, toDir);
  if (dest.rel === at.rel || dest.rel.startsWith(at.rel + '/')) throw new HttpError(400, 'Non puoi spostare una cartella dentro sé stessa.');
  if (!fs.existsSync(dest.full) || !fs.statSync(dest.full).isDirectory()) throw new HttpError(404, 'Cartella di destinazione non trovata.');
  const name = at.parts[at.parts.length - 1];
  const target = path.join(dest.full, name);
  if (fs.existsSync(target)) throw new HttpError(409, 'Nella cartella di destinazione esiste già un elemento con questo nome.');
  fs.renameSync(at.full, target);
  moveHistory(root, at.parts, [...dest.parts, name]);
  unindex(space, at.rel);
  const newRel = join(dest.rel, name);
  upsert(space, newRel, fs.statSync(target), userId);
  if (fs.statSync(target).isDirectory()) reindexUnder(space, root, newRel);
  return newRel;
}

// Le versioni precedenti seguono file e cartelle quando vengono rinominati o spostati.
function moveHistory(root, fromParts, toParts) {
  const hist = path.join(root, HISTORY);
  const fromName = fromParts[fromParts.length - 1];
  const toName = toParts[toParts.length - 1];
  const fromDir = path.join(hist, ...fromParts.slice(0, -1));
  const toDir = path.join(hist, ...toParts.slice(0, -1));
  try {
    // versioni del file stesso: <data>__<nome>
    for (const n of fs.readdirSync(fromDir)) {
      if (!n.endsWith(`__${fromName}`)) continue;
      fs.mkdirSync(toDir, { recursive: true });
      fs.renameSync(path.join(fromDir, n), path.join(toDir, freeName(toDir, n.slice(0, -fromName.length) + toName)));
    }
  } catch { /* nessuna versione */ }
  // versioni dei file dentro una cartella: .storico/<cartella>/...
  const sub = path.join(hist, ...fromParts);
  if (!fs.existsSync(sub) || !fs.statSync(sub).isDirectory()) return;
  const dest = path.join(hist, ...toParts);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(sub, dest);
    return;
  }
  const merge = (a, b) => {
    for (const e of fs.readdirSync(a, { withFileTypes: true })) {
      const src = path.join(a, e.name);
      const dst = path.join(b, e.name);
      if (e.isDirectory() && fs.existsSync(dst)) merge(src, dst);
      else fs.renameSync(src, path.join(b, freeName(b, e.name)));
    }
  };
  merge(sub, dest);
}

function reindexUnder(space, root, rel) {
  const walk = (dir, r) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      const sub = join(r, e.name);
      upsert(space, sub, fs.statSync(full), null);
      if (e.isDirectory()) walk(full, sub);
    }
  };
  try { walk(path.join(root, ...rel.split('/')), rel); } catch { /* ignorato */ }
}

// "Elimina": sposta nel cestino nascosto dello spazio, con una scheda per poterlo rimettere a posto.
function trash(space, root, rel, user) {
  const at = resolve(root, rel);
  if (!at.rel) throw new HttpError(400, 'Non si può eliminare la cartella principale.');
  if (!fs.existsSync(at.full)) throw new HttpError(404, 'Elemento non trovato.');
  const bin = path.join(root, TRASH);
  fs.mkdirSync(bin, { recursive: true });
  const id = `${stamp()}__${at.parts[at.parts.length - 1]}`;
  const isDir = fs.statSync(at.full).isDirectory();
  fs.renameSync(at.full, path.join(bin, id));
  fs.writeFileSync(path.join(bin, `${id}.json`), JSON.stringify({ path: at.rel, isDir, by: user ? user.name : null, at: db.now() }, null, 2));
  unindex(space, at.rel);
  return id;
}

function listTrash(root) {
  const bin = path.join(root, TRASH);
  let names = [];
  try { names = fs.readdirSync(bin); } catch { return []; }
  const out = [];
  for (const n of names.filter((x) => x.endsWith('.json')).sort().reverse()) {
    const id = n.slice(0, -5);
    if (!fs.existsSync(path.join(bin, id))) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(bin, n), 'utf8'));
      let size = 0;
      try { const st = fs.statSync(path.join(bin, id)); size = st.isFile() ? st.size : 0; } catch { /* ignorato */ }
      out.push({ id, name: id.split('__').slice(1).join('__'), path: meta.path, isDir: !!meta.isDir, by: meta.by, deletedAt: meta.at, size });
    } catch { /* scheda illeggibile */ }
  }
  return out;
}

function restore(space, root, id, userId) {
  if (!/^[\w-]+__[^/\\]+$/.test(id) || id.includes('..')) throw new HttpError(400, 'Elemento non valido.');
  const bin = path.join(root, TRASH);
  const src = path.join(bin, id);
  if (!fs.existsSync(src)) throw new HttpError(404, 'Elemento non trovato nel cestino.');
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(`${src}.json`, 'utf8')); } catch { /* senza scheda: torna nella cartella principale */ }
  let parent;
  try { parent = resolve(root, parentOf(meta.path || '')); } catch { parent = resolve(root, ''); }
  fs.mkdirSync(parent.full, { recursive: true });
  const name = freeName(parent.full, (meta.path || id.split('__').slice(1).join('__')).split('/').pop());
  fs.renameSync(src, path.join(parent.full, name));
  fs.rmSync(`${src}.json`, { force: true });
  const rel = join(parent.rel, name);
  upsert(space, rel, fs.statSync(path.join(parent.full, name)), userId);
  if (meta.isDir) reindexUnder(space, root, rel);
  return rel;
}

function versions(root, rel) {
  const at = resolve(root, rel);
  const dir = path.join(root, HISTORY, ...at.parts.slice(0, -1));
  return versionNames(root, at.rel).map((n) => {
    let size = 0;
    try { size = fs.statSync(path.join(dir, n)).size; } catch { /* ignorato */ }
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/.exec(n);
    return { id: n, savedAt: m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z` : null, size };
  });
}

// Riporta una versione precedente: quella attuale viene conservata a sua volta.
function restoreVersion(space, root, rel, versionId, userId) {
  const at = resolve(root, rel);
  const name = at.parts[at.parts.length - 1];
  if (!versionId.endsWith(`__${name}`) || versionId.includes('/') || versionId.includes('\\') || versionId.includes('..')) throw new HttpError(400, 'Versione non valida.');
  const dir = path.join(root, HISTORY, ...at.parts.slice(0, -1));
  const src = path.join(dir, versionId);
  if (!fs.existsSync(src)) throw new HttpError(404, 'Versione non trovata.');
  if (fs.existsSync(at.full)) keepVersion(root, at.parts.slice(0, -1), at.full, name);
  fs.copyFileSync(src, at.full);
  upsert(space, at.rel, fs.statSync(at.full), userId);
}

// Invia un file al browser: in anteprima (con Range, per far scorrere i video) o come download.
function send(req, res, file, name, { inline } = {}) {
  let st;
  try { st = fs.statSync(file); } catch { throw new HttpError(404, 'File non trovato.'); }
  if (!st.isFile()) throw new HttpError(404, 'File non trovato.');
  const type = inline ? viewType(name) : null;
  if (inline && !type) throw new HttpError(415, 'Questo tipo di file non si può vedere in anteprima: scaricalo.');
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const headers = {
    'Content-Type': type || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  };
  // HTML e SVG mostrati "in gabbia": niente script, niente accesso al portale.
  if (inline && /html|svg/.test(type)) headers['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:";
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : st.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : st.size - 1;
    if (start < 0) start = 0;
    if (end >= st.size) end = st.size - 1;
    if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); res.end(); return; }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}

module.exports = {
  TRASH, HISTORY, VIEW, viewType, resolve, cleanName, freeName, join, parentOf,
  upsert, unindex, reindex, list, mkdir, upload, writeBuffer, rename, move, trash, listTrash, restore, versions, restoreVersion, send, keepVersion,
};
