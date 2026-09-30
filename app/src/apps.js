'use strict';
// Web app ospitate dal portale. Ogni sottocartella di "apptools" e' un programma:
// il portale trova la sua pagina iniziale (index.html) e la apre all'indirizzo /apps/<id>/.
// Le app sono file messi a mano dall'Hacker sul PC: sono considerate fidate e girano
// con la sessione dell'utente che le apre. Non mettere in apptools codice di cui non ti fidi.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const db = require('./db');
const security = require('./security');

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const ROOT_NAMES = ['apptools', 'apptool', 'apps', 'webapps'];
const SKIP = ['node_modules', '.git', 'src'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.map': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.csv': 'text/csv; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.zip': 'application/zip',
};

function toolsDir() {
  try {
    const hit = fs.readdirSync(config.ROOT, { withFileTypes: true }).find((e) => e.isDirectory() && ROOT_NAMES.includes(norm(e.name)));
    return hit ? path.join(config.ROOT, hit.name) : null;
  } catch { return null; }
}

// Cerca la pagina iniziale: l'index.html meno profondo (fino a 3 livelli), altrimenti l'unico .html in cima.
function findEntry(dir) {
  let level = [dir];
  for (let depth = 0; depth <= 3 && level.length; depth++) {
    const next = [];
    for (const d of level) {
      let entries = [];
      try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
      const index = entries.find((e) => e.isFile() && e.name.toLowerCase() === 'index.html');
      if (index) return { dir: d, index: index.name };
      if (depth === 0) {
        const pages = entries.filter((e) => e.isFile() && /\.html?$/i.test(e.name));
        if (pages.length === 1) return { dir: d, index: pages[0].name };
      }
      for (const e of entries) if (e.isDirectory() && !SKIP.includes(e.name.toLowerCase()) && !e.name.startsWith('.')) next.push(path.join(d, e.name));
    }
    level = next;
  }
  return null;
}

function folders() {
  const base = toolsDir();
  if (!base) return [];
  try {
    return fs.readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name).sort();
  } catch { return []; }
}

function entryOf(folder) {
  const base = toolsDir();
  if (!base || !folder || folder !== path.basename(folder)) return null;
  return findEntry(path.join(base, folder));
}

// Allinea il catalogo alle cartelle: una cartella nuova diventa un programma; se esiste gia'
// un programma con lo stesso nome (es. "Verbale Studio" e cartella "VerbaleStudio") li collega.
function sync() {
  const names = folders();
  const rows = db.all('SELECT id, name, folder FROM programs');
  for (const folder of names) {
    if (rows.some((r) => r.folder === folder)) continue;
    const same = rows.find((r) => !r.folder && norm(r.name) === norm(folder));
    if (same) { db.run('UPDATE programs SET folder = ? WHERE id = ?', folder, same.id); same.folder = folder; continue; }
    const pretty = folder.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
    db.run('INSERT INTO programs(name, description, version, guide, folder, updated_at) VALUES(?,?,?,?,?,?)', pretty, '', '', '', folder, db.now());
  }
  // Una cartella rimossa scollega il programma (la scheda resta, senza pulsante Apri).
  for (const r of rows) if (r.folder && !names.includes(r.folder)) db.run('UPDATE programs SET folder = NULL WHERE id = ?', r.id);
}

function send(res, file, stat) {
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}

function serveFrom(res, entry, rel) {
  const file = path.resolve(entry.dir, '.' + path.sep + rel);
  if (file !== entry.dir && !file.startsWith(entry.dir + path.sep)) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { stat = null; }
  if (stat && stat.isDirectory()) {
    const idx = path.join(file, 'index.html');
    try { send(res, idx, fs.statSync(idx)); return true; } catch { return false; }
  }
  if (stat && stat.isFile()) { send(res, file, stat); return true; }
  return false;
}

const programById = (id) => db.get('SELECT id, name, folder FROM programs WHERE id = ?', Number(id));

// Gestisce /apps/<id>/... Restituisce true se ha risposto.
function handle(req, res, pathname) {
  const m = /^\/apps\/(\d+)(\/.*)?$/.exec(pathname);
  if (!m) return false;
  const user = security.userFromRequest(req);
  if (!user || user.must_change) { res.writeHead(302, { Location: '/' }); res.end(); return true; }
  if (m[2] === undefined) { res.writeHead(302, { Location: `/apps/${m[1]}/` }); res.end(); return true; }
  const program = programById(m[1]);
  const entry = program && entryOf(program.folder);
  if (!entry) return false;
  let rel;
  try { rel = decodeURIComponent(m[2].slice(1)); } catch { return false; }
  if (rel.includes('\0')) return false;
  if (rel === '') {
    db.log({ user, ip: String(req.socket.remoteAddress || '').replace(/^::ffff:/, '') }, 'programma.aperto', program.name);
    return serveFrom(res, entry, entry.index);
  }
  if (serveFrom(res, entry, rel)) return true;
  // App a pagina singola: un indirizzo interno senza estensione riporta alla pagina iniziale.
  if (!path.extname(rel)) return serveFrom(res, entry, entry.index);
  return false;
}

// Alcune app chiedono i propri file con un percorso assoluto (es. /assets/app.js).
// Se la richiesta arriva da una pagina /apps/<id>/..., si cerca il file dentro quell'app.
function handleFromReferer(req, res, pathname) {
  let ref;
  try { ref = new URL(req.headers.referer || '').pathname; } catch { return false; }
  const m = /^\/apps\/(\d+)\//.exec(ref);
  if (!m || !security.userFromRequest(req)) return false;
  const program = programById(m[1]);
  const entry = program && entryOf(program.folder);
  if (!entry) return false;
  let rel;
  try { rel = decodeURIComponent(pathname.slice(1)); } catch { return false; }
  return !rel.includes('\0') && serveFrom(res, entry, rel);
}

module.exports = { sync, entryOf, folders, toolsDir, handle, handleFromReferer };
