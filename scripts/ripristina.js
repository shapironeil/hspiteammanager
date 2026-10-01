'use strict';
// Ripristino da un backup. Lo lancia ripristina.bat.
//
//   1. mostra i backup disponibili e chiede quale usare (oppure: --backup <nome>);
//   2. ferma il portale se e' acceso;
//   3. NON cancella niente: le cartelle attuali (data, progetti, images, apptools) vengono spostate in
//      .ripristino-precedente/<data>/ e restano li', recuperabili;
//   4. copia (non collega) i file del backup al loro posto, cosi' il backup resta intatto.
//
// Uso:  node scripts/ripristina.js [--backup <nome>] [--si]   (--si: niente domanda di conferma)
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const H = require('./lib-host');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const say = (msg) => console.log('  ' + msg);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) { fs.copyFileSync(s, d); const st = fs.statSync(s); fs.utimesSync(d, st.atime, st.mtime); }
  }
}

async function main() {
  const config = require('../app/src/config');
  const backup = require('../app/src/backup');
  const getSetting = (key) => {
    try { const { DatabaseSync } = require('node:sqlite'); const c = new DatabaseSync(config.DB_FILE, { readOnly: true }); const r = c.prepare('SELECT value FROM settings WHERE key = ?').get(key); c.close(); return r ? r.value : null; } catch { return null; }
  };
  const dir = backup.settings(getSetting).dir;
  const all = backup.list(dir);
  console.log(`\n  HSPI Team Manager - ripristino da backup\n  Cartella dei backup: ${dir}\n`);
  if (!all.length) throw new Error('Nessun backup trovato.');

  let chosen = opt('--backup') ? all.find((b) => b.name === opt('--backup')) : null;
  const rl = args.includes('--si') ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  if (!chosen) {
    all.slice(0, 20).forEach((b, i) => say(`${String(i + 1).padStart(2)}. ${b.name}   (${b.files || '?'} file, versione ${b.version || '?'})`));
    if (!rl) throw new Error('Indica il backup con --backup <nome>.');
    const n = Number((await rl.question('\n  Numero del backup da ripristinare (invio per annullare): ')).trim());
    chosen = all[n - 1];
    if (!chosen) { rl.close(); say('Annullato.'); return 0; }
  }
  if (rl) {
    const ok = (await rl.question(`\n  Ripristino "${chosen.name}". I dati attuali NON vengono cancellati: vanno in .ripristino-precedente.\n  Confermi? (s/n) `)).trim().toLowerCase();
    rl.close();
    if (!ok.startsWith('s')) { say('Annullato.'); return 0; }
  }

  if (await H.stopPortal(config.DATA_DIR, 'ripristino da backup')) say('Portale fermato.');
  const src = backup.sources();
  const aside = path.join(H.ROOT, '.ripristino-precedente', backup.stamp());
  fs.mkdirSync(aside, { recursive: true });
  for (const area of backup.AREAS) {
    const from = path.join(chosen.path, area);
    if (!fs.existsSync(from)) continue;
    const current = src[area] || path.join(H.ROOT, area === 'data' ? 'data' : area);
    if (fs.existsSync(current)) fs.renameSync(current, path.join(aside, area));
    say(`Ripristino ${area}...`);
    copyDir(from, current);
  }
  fs.writeFileSync(path.join(aside, 'LEGGIMI.txt'), `﻿Cartelle com'erano prima del ripristino del backup ${chosen.name} (${new Date().toISOString()}).\r\n`);
  say(`Fatto. I dati di prima sono in ${aside}`);
  say('Avvia il portale con avvia.bat.');
  return 0;
}

main().then((code) => process.exit(code || 0)).catch((err) => { console.error('\n  ERRORE: ' + err.message + '\n'); process.exit(1); });
