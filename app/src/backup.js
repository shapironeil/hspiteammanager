'use strict';
// Backup dell'host: copie complete e datate dei file importanti, in Backup/<data>__<motivo>/.
//
// Cosa e' "importante" (si salva sempre):
//   data/       database (copiato a caldo, coerente), file personali, file inviati, impostazioni di Verbale Studio
//   progetti/   file dei progetti, verbali, video, versioni e cestini
//   images/     logo, sfondi, avatar personalizzati
//   apptools/   web app del team
// Non si salvano: Node.js portatile, il programma (si riscarica), file temporanei, il pacchetto client (si rigenera).
//
// Ogni backup e' una cartella completa, apribile e copiabile a mano. Per non occupare spazio e non far lavorare
// il PC, i file non cambiati dal backup precedente non vengono ricopiati: si crea un "collegamento fisso"
// (hard link) allo stesso contenuto. Se la destinazione non lo permette (altro disco, cartella di rete) si copia.
// Un backup a meta' resta con il suffisso ".incompleto" e non viene mai usato per un ripristino.
// I backup NON si cancellano da soli: decide il proprietario (Sistema → Backup).
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const config = require('./config');

// solo nella cartella data/ (primo livello): codice segreto di avvio, stato del backup, pacchetto client rigenerabile
const SKIP_DATA_TOP = new Set(['.host-token', '.backup-stato.json', 'client', 'portale.db', 'portale.db-wal', 'portale.db-shm', 'portale.db-journal']);
const SKIP_EXT = /\.(part|nuovo|tmp|upload)$/i;
const INCOMPLETE = '.incompleto';
const AREAS = ['data', 'progetti', 'images', 'apptools'];

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, (c) => (c === 'T' ? '_' : '-'));
const statusFile = () => path.join(config.DATA_DIR, '.backup-stato.json');

function readStatus() {
  try { return JSON.parse(fs.readFileSync(statusFile(), 'utf8')); } catch { return {}; }
}
function writeStatus(patch) {
  const s = { ...readStatus(), ...patch };
  try { fs.writeFileSync(statusFile(), JSON.stringify(s, null, 2)); } catch { /* cartella dati non scrivibile */ }
  return s;
}

// Dove stanno le cartelle importanti (progetti puo' chiamarsi "Progetti" o "projects").
function sources() {
  const out = { data: config.DATA_DIR };
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  let names = [];
  try { names = fs.readdirSync(config.ROOT, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { /* radice illeggibile */ }
  const pick = (wanted) => names.find((n) => wanted.includes(norm(n)));
  const p = pick(['progetti', 'projects']);
  if (p) out.progetti = path.join(config.ROOT, p);
  const i = pick(['images', 'immagini']);
  if (i) out.images = path.join(config.ROOT, i);
  const a = pick(['apptools', 'apptool', 'apps', 'webapps']);
  if (a) out.apptools = path.join(config.ROOT, a);
  return out;
}

function settings(getSetting) {
  const get = (k, d) => { try { const v = getSetting && getSetting(k); return v == null || v === '' ? d : v; } catch { return d; } };
  return {
    dir: path.resolve(config.ROOT, get('backupDir', path.join(config.ROOT, 'Backup'))),
    extraDir: get('backupExtraDir', ''),
    auto: get('backupAuto', '1') !== '0',
  };
}

// Backup completi, dal piu' recente.
function list(dir) {
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.endsWith(INCOMPLETE) && /^\d{4}-\d{2}-\d{2}_/.test(e.name)).map((e) => e.name); } catch { return []; }
  return names.sort().reverse().map((name) => {
    let info = {};
    try { info = JSON.parse(fs.readFileSync(path.join(dir, name, 'backup.json'), 'utf8')); } catch { /* backup senza scheda */ }
    return { name, path: path.join(dir, name), ...info };
  });
}

// Copia un albero; i file uguali a quelli del backup precedente diventano collegamenti fissi.
async function copyTree(src, dst, prev, counters, skipTop = null) {
  let entries;
  try { entries = await fsp.readdir(src, { withFileTypes: true }); } catch { return; }
  await fsp.mkdir(dst, { recursive: true });
  for (const e of entries) {
    if ((skipTop && skipTop.has(e.name)) || SKIP_EXT.test(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    const p = prev ? path.join(prev, e.name) : null;
    if (e.isDirectory()) { await copyTree(s, d, p, counters, null); continue; }
    if (!e.isFile()) continue;
    let st;
    try { st = await fsp.stat(s); } catch { continue; }
    counters.files++;
    counters.bytes += st.size;
    if (p && counters.links !== false) {
      try {
        const ps = await fsp.stat(p);
        if (ps.size === st.size && Math.abs(ps.mtimeMs - st.mtimeMs) < 2000) {
          await fsp.link(p, d);
          counters.linked++;
          continue;
        }
      } catch (err) {
        if (err.code === 'EXDEV' || err.code === 'EPERM' || err.code === 'ENOTSUP') counters.links = false; // destinazione senza collegamenti fissi
      }
    }
    try {
      await fsp.copyFile(s, d);
      await fsp.utimes(d, st.atime, st.mtime);
      counters.copied++;
      counters.newBytes += st.size;
    } catch (err) {
      counters.errors.push(`${s}: ${err.message}`);
    }
    // ogni tanto si lascia respirare il portale (e il PC)
    if (counters.files % 200 === 0) await new Promise((r) => setTimeout(r, 5));
  }
}

let running = null;

// sqlite: l'istanza DatabaseSync da cui fare la copia coerente del database (VACUUM INTO).
// Se manca (portale fermo) si copia il file.
async function run({ reason = 'manuale', sqlite = null, getSetting = null, version = config.VERSION } = {}) {
  if (running) return running;
  running = (async () => {
    const conf = settings(getSetting);
    await fsp.mkdir(conf.dir, { recursive: true });
    const name = `${stamp()}__${String(reason).replace(/[^\w.-]+/g, '-').slice(0, 40)}`;
    const target = path.join(conf.dir, name);
    const tmp = target + INCOMPLETE;
    const previous = list(conf.dir)[0];
    const counters = { files: 0, bytes: 0, copied: 0, linked: 0, newBytes: 0, errors: [] };
    const started = Date.now();
    writeStatus({ running: { name, startedAt: new Date().toISOString() } });
    try {
      await fsp.mkdir(path.join(tmp, 'data'), { recursive: true });
      const dbCopy = path.join(tmp, 'data', 'portale.db');
      const vacuum = (conn) => conn.exec(`VACUUM INTO '${dbCopy.replace(/'/g, "''")}'`);
      if (sqlite) vacuum(sqlite);
      else if (fs.existsSync(config.DB_FILE)) {
        // portale fermo: si apre il database (cosi' entrano anche le ultime modifiche rimaste nel file -wal)
        const { DatabaseSync } = require('node:sqlite');
        const conn = new DatabaseSync(config.DB_FILE);
        try { vacuum(conn); } finally { conn.close(); }
      }
      try { const st = await fsp.stat(dbCopy); counters.files++; counters.bytes += st.size; counters.copied++; counters.newBytes += st.size; } catch { /* nessun database */ }
      const src = sources();
      for (const area of AREAS) {
        if (!src[area]) continue;
        await copyTree(src[area], path.join(tmp, area), previous ? path.join(previous.path, area) : null, counters, area === 'data' ? SKIP_DATA_TOP : null);
      }
      const info = {
        reason, version, createdAt: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000),
        files: counters.files, bytes: counters.bytes, copied: counters.copied, linked: counters.linked, newBytes: counters.newBytes,
        errors: counters.errors.slice(0, 50), areas: Object.keys(src),
      };
      await fsp.writeFile(path.join(tmp, 'backup.json'), JSON.stringify(info, null, 2));
      await fsp.writeFile(path.join(tmp, 'LEGGIMI.txt'), '﻿Backup di HSPI Team Manager.\r\nPer ripristinarlo usa ripristina.bat nella cartella del portale (scegli questo backup dall\'elenco).\r\nA mano: con il portale fermo, copia le cartelle data, progetti, images e apptools al loro posto.\r\n');
      await fsp.rename(tmp, target);
      let extra = null;
      if (conf.extraDir) extra = await copyToExtra(target, conf.extraDir).catch((err) => ({ error: err.message }));
      const result = { name, path: target, ...info, extra };
      writeStatus({ running: null, last: { name, at: info.createdAt, reason, files: info.files, newBytes: info.newBytes, errors: info.errors.length, extra }, lastError: null });
      return result;
    } catch (err) {
      writeStatus({ running: null, lastError: { at: new Date().toISOString(), message: err.message } });
      throw err;
    }
  })();
  try { return await running; } finally { running = null; }
}

// Copia aggiuntiva (es. un altro server): stessa struttura, collegata al backup precedente in quella cartella.
async function copyToExtra(snapshot, extraDir) {
  await fsp.mkdir(extraDir, { recursive: true });
  const name = path.basename(snapshot);
  const prev = list(extraDir)[0];
  const tmp = path.join(extraDir, name + INCOMPLETE);
  const counters = { files: 0, bytes: 0, copied: 0, linked: 0, newBytes: 0, errors: [] };
  await copyTreeAll(snapshot, tmp, prev ? prev.path : null, counters);
  await fsp.rename(tmp, path.join(extraDir, name));
  return { dir: extraDir, copied: counters.copied, linked: counters.linked, errors: counters.errors.length };
}
// Come copyTree ma senza filtri (copia un backup gia' pronto, compreso il database).
async function copyTreeAll(src, dst, prev, counters) {
  await fsp.mkdir(dst, { recursive: true });
  for (const e of await fsp.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    const p = prev ? path.join(prev, e.name) : null;
    if (e.isDirectory()) { await copyTreeAll(s, d, p, counters); continue; }
    const st = await fsp.stat(s);
    if (p && counters.links !== false) {
      try {
        const ps = await fsp.stat(p);
        if (ps.size === st.size && Math.abs(ps.mtimeMs - st.mtimeMs) < 2000) { await fsp.link(p, d); counters.linked++; continue; }
      } catch (err) { if (err.code === 'EXDEV' || err.code === 'EPERM' || err.code === 'ENOTSUP') counters.links = false; }
    }
    await fsp.copyFile(s, d);
    await fsp.utimes(d, st.atime, st.mtime);
    counters.copied++;
  }
}

// Backup automatico: uno al giorno, controllato ogni ora (parte solo se l'ultimo ha piu' di 20 ore).
function schedule({ sqlite, getSetting, onError }) {
  const tick = () => {
    if (!settings(getSetting).auto) return;
    const last = readStatus().last;
    if (last && Date.now() - Date.parse(last.at) < 20 * 3600 * 1000) return;
    run({ reason: 'giornaliero', sqlite, getSetting }).catch(onError);
  };
  setTimeout(tick, 60 * 1000).unref();
  setInterval(tick, 3600 * 1000).unref();
}

module.exports = { AREAS, INCOMPLETE, sources, settings, list, run, schedule, readStatus, copyTreeAll, stamp };
