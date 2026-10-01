'use strict';
// Aggiornamento dell'host, sicuro e ripetibile. Lo lancia aggiorna.bat.
//
//   1. confronta la versione installata (version.json) con quella disponibile: se sono uguali non fa nulla;
//   2. un aggiornamento alla volta (lucchetto);
//   3. ferma il portale se e' acceso;
//   4. fa un backup completo (data, progetti, immagini, web app);
//   5. prepara la nuova versione in una cartella di appoggio accanto al programma;
//   6. scambia le cartelle del programma (le vecchie vanno in .aggiornamento/precedenti/<data>);
//   7. avvia il portale nuovo su una porta di prova: se non risponde con la nuova versione,
//      rimette tutto com'era (programma e database).
// Non tocca MAI: data, progetti, Backup, apptools, Node.js e Git portatili. In images aggiunge solo file mancanti.
//
// Uso:  node scripts/aggiorna.js [--da <cartella>|--zip <url>] [--ramo main] [--forza] [--solo-controllo]
//   senza --da/--zip: con Git (cartella .git presente) aggiorna dal ramo; altrimenti scarica lo ZIP da GitHub.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const H = require('./lib-host');

const ROOT = H.ROOT;
const REPO = 'shapironeil/hspiteammanager';
const WORK = path.join(ROOT, '.aggiornamento');
const LOCK = path.join(WORK, 'in-corso.lock');
// Cartelle e file che l'aggiornamento non tocca mai
const PROTECTED = [/^data$/i, /^progetti$/i, /^projects$/i, /^backup$/i, /^apptools$/i, /^node-v/i, /^portablegit/i, /^\.git$/i, /^\.aggiornamento$/i, /^\.ripristino-precedente$/i, /^\.elenco-aggiornamento\.json$/i];
const MERGE_ONLY = [/^images$/i]; // risorse dell'utente: si aggiungono solo i file nuovi

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const flag = (name) => args.includes(name);
const say = (msg) => console.log('  ' + msg);
const stamp = () => new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
const isProtected = (name) => PROTECTED.some((re) => re.test(name));

function findGit() {
  for (const base of [ROOT, path.dirname(ROOT)]) {
    try {
      for (const d of fs.readdirSync(base)) if (/^portablegit/i.test(d) && fs.existsSync(path.join(base, d, 'cmd', 'git.exe'))) return path.join(base, d, 'cmd', 'git.exe');
    } catch { /* ignorato */ }
  }
  try { execFileSync('git', ['--version'], { stdio: 'ignore' }); return 'git'; } catch { return null; }
}

// Prende il lucchetto; uno vecchio di oltre 2 ore (aggiornamento interrotto) viene ignorato.
function lock() {
  fs.mkdirSync(WORK, { recursive: true });
  try {
    const st = fs.statSync(LOCK);
    if (Date.now() - st.mtimeMs < 2 * 3600 * 1000) throw new Error('C\'e\' gia\' un aggiornamento in corso. Se non e\' vero, aspetta 2 ore o cancella .aggiornamento\\in-corso.lock.');
  } catch (err) { if (err.code !== 'ENOENT') throw err; }
  fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
}
const unlock = () => fs.rmSync(LOCK, { force: true });

function copyDir(src, dst, { onlyMissing = false } = {}) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, { onlyMissing });
    else if (e.isFile() && !(onlyMissing && fs.existsSync(d))) fs.copyFileSync(s, d);
  }
}

// Prepara la nuova versione in una cartella accanto al programma (stesso disco: lo scambio e' una rinomina).
function stage(source) {
  let dir = path.join(WORK, `nuova-${stamp()}`);
  for (let n = 2; fs.existsSync(dir); n++) dir = path.join(WORK, `nuova-${stamp()}-${n}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const e of fs.readdirSync(source, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const s = path.join(source, e.name);
    if (e.isDirectory()) copyDir(s, path.join(dir, e.name)); else if (e.isFile()) fs.copyFileSync(s, path.join(dir, e.name));
  }
  if (!H.readVersion(dir)) throw new Error('La versione scaricata non contiene version.json: non la installo.');
  if (!fs.existsSync(path.join(dir, 'app', 'server.js'))) throw new Error('La versione scaricata e\' incompleta (manca app/server.js): non la installo.');
  return dir;
}

function download(branch) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-agg-'));
  const zip = path.join(tmp, 'repo.zip');
  const url = opt('--zip') || `https://github.com/${REPO}/archive/refs/heads/${branch}.zip`;
  say(`Scarico ${url}`);
  execFileSync('curl', ['-f', '-L', '-s', '-o', zip, url], { stdio: 'inherit' });
  execFileSync('tar', ['-xf', zip, '-C', tmp], { stdio: 'inherit' });
  const inner = fs.readdirSync(tmp, { withFileTypes: true }).find((e) => e.isDirectory());
  if (!inner) throw new Error('ZIP scaricato vuoto.');
  return { dir: path.join(tmp, inner.name), cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

// Scambia le voci del programma. Restituisce la funzione per tornare indietro.
function swap(staged) {
  let old = path.join(WORK, 'precedenti', stamp());
  for (let n = 2; fs.existsSync(old); n++) old = path.join(WORK, 'precedenti', `${stamp()}-${n}`);
  fs.mkdirSync(old, { recursive: true });
  const moved = []; // { name, hadOld }
  const rollback = () => {
    // la versione scartata va in una cartella a parte (resta da esaminare), la vecchia torna al suo posto
    const discarded = `${old}-scartata`;
    fs.mkdirSync(discarded, { recursive: true });
    for (const m of moved.reverse()) {
      try {
        if (fs.existsSync(path.join(ROOT, m.name))) fs.renameSync(path.join(ROOT, m.name), path.join(discarded, m.name));
        if (m.hadOld) fs.renameSync(path.join(old, m.name), path.join(ROOT, m.name));
      } catch (err) { console.error(`  ATTENZIONE: non riesco a rimettere ${m.name}: ${err.message} (copia in ${old})`); }
    }
  };
  try {
    const incoming = fs.readdirSync(staged);
    for (const name of incoming) {
      if (isProtected(name)) continue;
      if (MERGE_ONLY.some((re) => re.test(name))) { copyDir(path.join(staged, name), path.join(ROOT, name), { onlyMissing: true }); continue; }
      const hadOld = fs.existsSync(path.join(ROOT, name));
      if (hadOld) fs.renameSync(path.join(ROOT, name), path.join(old, name));
      moved.push({ name, hadOld });
      fs.renameSync(path.join(staged, name), path.join(ROOT, name));
    }
    // file del programma vecchio che la nuova versione non ha piu' (es. un .bat rinominato): messi da parte
    for (const name of fs.readdirSync(ROOT)) {
      if (isProtected(name) || incoming.includes(name) || MERGE_ONLY.some((re) => re.test(name))) continue;
      if (!isProgramFile(name)) continue;
      fs.renameSync(path.join(ROOT, name), path.join(old, name));
      moved.push({ name, hadOld: true });
    }
  } catch (err) {
    rollback();
    throw err;
  }
  return { rollback, old };
}
// Solo i file che il programma porta con se': gli altri file messi dall'utente nella cartella restano.
function isProgramFile(name) {
  return /^(app|client|scripts|docs|branding|version\.json|README\.md|\.gitignore|.*\.bat)$/i.test(name);
}

// Tiene le ultime 3 copie del programma sostituito (solo codice, mai dati).
function prunePrevious() {
  const dir = path.join(WORK, 'precedenti');
  let names = [];
  try { names = fs.readdirSync(dir).sort(); } catch { return; }
  for (const n of names.slice(0, Math.max(0, names.length - 3))) fs.rmSync(path.join(dir, n), { recursive: true, force: true });
}

function restoreDatabase(snapshotDir, dataDir) {
  const src = path.join(snapshotDir, 'data', 'portale.db');
  if (!fs.existsSync(src)) return;
  const db = path.join(dataDir, 'portale.db');
  const aside = path.join(WORK, `db-dopo-tentativo-${stamp()}`);
  fs.mkdirSync(aside, { recursive: true });
  for (const ext of ['', '-wal', '-shm']) if (fs.existsSync(db + ext)) fs.renameSync(db + ext, path.join(aside, 'portale.db' + ext));
  fs.copyFileSync(src, db);
}

async function main() {
  const local = H.readVersion(ROOT);
  const branch = opt('--ramo') || process.env.HSPI_BRANCH || 'main';
  console.log(`\n  HSPI Team Manager - aggiornamento\n  Versione installata: ${local || 'sconosciuta'}\n`);

  // 1. da dove arriva la nuova versione
  let source = null;
  let cleanup = () => {};
  let gitMode = false;
  const git = !opt('--da') && !opt('--zip') && fs.existsSync(path.join(ROOT, '.git')) ? findGit() : null;
  if (opt('--da')) source = path.resolve(opt('--da'));
  else if (git) {
    gitMode = true;
    say(`Controllo GitHub (ramo ${branch})...`);
    execFileSync(git, ['-C', ROOT, 'fetch', '--quiet', 'origin', branch], { stdio: 'inherit' });
  } else { const d = download(branch); source = d.dir; cleanup = d.cleanup; }

  let available;
  if (gitMode) {
    try { available = JSON.parse(execFileSync(git, ['-C', ROOT, 'show', `origin/${branch}:version.json`]).toString()).version; } catch { available = null; }
  } else available = H.readVersion(source);
  if (!available) { cleanup(); throw new Error('Non trovo la versione disponibile (version.json).'); }
  say(`Versione disponibile: ${available}`);
  if (available === local && !flag('--forza')) { cleanup(); say('Gia\' aggiornato: nessuna modifica.'); return 0; }
  if (flag('--solo-controllo')) { cleanup(); say('Aggiornamento disponibile (solo controllo: nessuna modifica).'); return 10; }

  lock();
  const config = require('../app/src/config');
  const backup = require('../app/src/backup');
  let snapshot = null;
  try {
    // 2. portale fermo e backup
    if (await H.stopPortal(config.DATA_DIR, `aggiornamento a ${available}`)) say('Portale fermato.');
    say('Backup di sicurezza (data, progetti, immagini, web app)...');
    snapshot = await backup.run({ reason: `prima-di-${available}`, version: local || '?', getSetting: settingReader(config) });
    say(`Backup pronto: ${snapshot.name} (${snapshot.files} file, ${snapshot.copied} copiati, ${snapshot.linked} gia' presenti)`);

    // 3. installazione
    let undo;
    if (gitMode) {
      const before = execFileSync(git, ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim();
      execFileSync(git, ['-C', ROOT, 'merge', '--ff-only', '--quiet', `origin/${branch}`], { stdio: 'inherit' });
      undo = () => execFileSync(git, ['-C', ROOT, 'reset', '--hard', '--quiet', before], { stdio: 'inherit' });
    } else {
      say('Preparo la nuova versione...');
      const staged = stage(source);
      const s = swap(staged);
      undo = s.rollback;
      fs.rmSync(staged, { recursive: true, force: true }); // ormai vuota: il contenuto e' stato spostato
    }

    // 4. prova di avvio
    say('Provo ad avviare la nuova versione...');
    const trial = await H.trialStart(ROOT, available);
    if (!trial.ok) {
      console.error('\n  La nuova versione non parte. Rimetto tutto com\'era...');
      console.error(trial.output.split('\n').slice(-15).map((l) => '    ' + l).join('\n'));
      undo();
      restoreDatabase(snapshot.path, config.DATA_DIR);
      throw new Error(`Aggiornamento annullato: resta installata la ${local}. Dettagli sopra; il backup ${snapshot.name} e' intatto.`);
    }
    prunePrevious();
    fs.writeFileSync(path.join(WORK, 'ultimo.json'), JSON.stringify({ from: local, to: available, at: new Date().toISOString(), backup: snapshot.name }, null, 2));
    say(`Aggiornato: ${local || '?'} -> ${available}`);
    return 0;
  } finally {
    unlock();
    cleanup();
  }
}

// Legge le impostazioni del backup dal database senza avviare il portale.
function settingReader(config) {
  let conn = null;
  return (key) => {
    try {
      if (!conn) { const { DatabaseSync } = require('node:sqlite'); if (!fs.existsSync(config.DB_FILE)) return null; conn = new DatabaseSync(config.DB_FILE, { readOnly: true }); }
      const row = conn.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row ? row.value : null;
    } catch { return null; }
  };
}

main().then((code) => process.exit(code || 0)).catch((err) => {
  console.error('\n  ERRORE: ' + err.message + '\n');
  process.exit(1);
});
