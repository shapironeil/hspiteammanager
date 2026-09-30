'use strict';
// Archivio file su disco locale. E' l'unico punto che tocca i file:
// per passare a OneDrive/SharePoint si sostituisce questo modulo.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const db = require('./db');
const { HttpError, SECURITY_HEADERS } = require('./http');

const AREAS = { files: path.join(config.STORAGE_DIR, 'files'), programs: path.join(config.STORAGE_DIR, 'programs') };
for (const dir of Object.values(AREAS)) {
  fs.mkdirSync(dir, { recursive: true });
  // Rimuove i caricamenti rimasti a meta' da un avvio precedente.
  for (const name of fs.readdirSync(dir)) if (name.endsWith('.part')) fs.rmSync(path.join(dir, name), { force: true });
}

const ID_RE = /^[a-f0-9]{32}$/;
function filePath(area, id) {
  if (!AREAS[area] || !ID_RE.test(id)) throw new HttpError(400, 'Identificativo file non valido.');
  return path.join(AREAS[area], id);
}

function usedBytes() {
  const a = db.get('SELECT COALESCE(SUM(size), 0) AS n FROM files').n;
  const b = db.get('SELECT COALESCE(SUM(file_size), 0) AS n FROM programs WHERE file_id IS NOT NULL').n;
  return Number(a) + Number(b);
}
const quotaBytes = () => Number(db.getSetting('quotaGb')) * 1024 ** 3;
const maxFileBytes = () => Number(db.getSetting('maxFileMb')) * 1024 ** 2;

function cleanName(raw) {
  const name = String(raw || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim().slice(0, 200);
  if (!name || name === '.' || name === '..') throw new HttpError(400, 'Nome file non valido.');
  return name;
}

// Salva il corpo della richiesta su disco, in streaming, rispettando i limiti.
function saveUpload(req, area) {
  return new Promise((resolve, reject) => {
    const maxFile = maxFileBytes();
    const free = quotaBytes() - usedBytes();
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > maxFile) return reject(new HttpError(413, `File troppo grande (massimo ${db.getSetting('maxFileMb')} MB).`));
    if (declared > free) return reject(new HttpError(507, 'Spazio di archiviazione esaurito.'));

    const id = crypto.randomBytes(16).toString('hex');
    const finalPath = filePath(area, id);
    const tmpPath = finalPath + '.part';
    const out = fs.createWriteStream(tmpPath);
    let size = 0;
    let failed = false;

    const fail = (err) => {
      if (failed) return;
      failed = true;
      req.unpipe(out);
      // Il file parziale si cancella solo a stream chiuso, altrimenti puo' ricomparire.
      out.once('close', () => fs.rm(tmpPath, { force: true }, () => {}));
      out.destroy();
      req.resume();
      reject(err);
    };

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxFile) fail(new HttpError(413, `File troppo grande (massimo ${db.getSetting('maxFileMb')} MB).`));
      else if (size > free) fail(new HttpError(507, 'Spazio di archiviazione esaurito.'));
    });
    req.on('aborted', () => fail(new HttpError(400, 'Caricamento interrotto.')));
    req.on('error', () => fail(new HttpError(400, 'Caricamento interrotto.')));
    out.on('error', (err) => fail(err));
    out.on('finish', () => {
      if (failed) return;
      if (size === 0) return fail(new HttpError(400, 'Il file e\' vuoto.'));
      fs.rename(tmpPath, finalPath, (err) => (err ? fail(err) : resolve({ id, size })));
    });
    req.pipe(out);
  });
}

function remove(area, id) {
  if (!id) return;
  fs.rm(filePath(area, id), { force: true }, () => {});
}

function sendDownload(res, area, id, name) {
  const file = filePath(area, id);
  let stat;
  try { stat = fs.statSync(file); } catch { throw new HttpError(404, 'File non trovato nell\'archivio.'); }
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
  });
  fs.createReadStream(file).pipe(res);
}

function diskFreeBytes() {
  try {
    const s = fs.statfsSync(config.DATA_DIR);
    return Number(s.bavail) * Number(s.bsize);
  } catch { return null; }
}

module.exports = { saveUpload, remove, sendDownload, usedBytes, quotaBytes, maxFileBytes, cleanName, diskFreeBytes };
