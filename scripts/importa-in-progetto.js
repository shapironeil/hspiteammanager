'use strict';
// Importazione una tantum: COPIA i file di una cartella (per esempio l'archivio di Verbale Studio)
// dentro la cartella di un progetto del portale.
//
// Regole di sicurezza:
//  - copia soltanto: l'origine non viene mai modificata ne' cancellata;
//  - non sovrascrive mai: se nel progetto esiste gia' un file con lo stesso nome ma contenuto
//    diverso, lo segnala e lo lascia com'e';
//  - salta i file di programma (motore dell'app, librerie, script).
//
// Uso interattivo:  doppio clic su sincronizza-una-tantum.bat
// Uso diretto:      node scripts/importa-in-progetto.js --da "C:\...\dati" --progetto ATAC --cartella "Verbale Studio" --si
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const ROOT = path.resolve(__dirname, '..');
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const SKIP_DIRS = ['node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build', 'bin', 'obj'];
const SKIP_EXT = ['.exe', '.dll', '.bat', '.cmd', '.ps1', '.sh', '.js', '.mjs', '.cjs', '.ts', '.py', '.pyc', '.map', '.css', '.lock', '.part'];
// Nomi di cartella che di solito contengono dati e non codice.
const DATA_HINTS = ['data', 'dati', 'archivio', 'storage', 'verbali', 'verbale', 'progetti', 'projects', 'checkpoint', 'checkpoints', 'storico', 'output', 'documenti', 'uploads', 'salvataggi', 'backup'];

function findDir(names) {
  try {
    const hit = fs.readdirSync(ROOT, { withFileTypes: true }).find((e) => e.isDirectory() && names.includes(norm(e.name)));
    return hit ? path.join(ROOT, hit.name) : null;
  } catch { return null; }
}

function walk(dir, base, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.includes(e.name.toLowerCase())) { out.skippedDirs.push(path.relative(base, full)); continue; }
      walk(full, base, out);
    } else if (e.isFile()) {
      const rel = path.relative(base, full);
      if (SKIP_EXT.includes(path.extname(e.name).toLowerCase())) out.skipped.push(rel);
      else out.files.push({ rel, full, size: fs.statSync(full).size });
    }
  }
  return out;
}
const scan = (dir) => walk(dir, dir, { files: [], skipped: [], skippedDirs: [] });

// Cartelle di dati dentro apptools: le propone come origine.
function candidates() {
  const tools = findDir(['apptools', 'apptool', 'apps', 'webapps']);
  const found = [];
  if (!tools) return found;
  const visit = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory() || SKIP_DIRS.includes(e.name.toLowerCase()) || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (DATA_HINTS.includes(norm(e.name))) {
        const s = scan(full);
        if (s.files.length) found.push({ dir: full, count: s.files.length, size: s.files.reduce((a, f) => a + f.size, 0) });
      } else if (depth < 3) visit(full, depth + 1);
    }
  };
  visit(tools, 0);
  return found;
}

const fmt = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const clean = (s) => String(s || '').trim().replace(/^"+|"+$/g, '');
const safeName = (s) => clean(s).replace(/[\\/:*?"<>|]/g, '-').replace(/^\.+/, '').trim();

function same(a, b) {
  const sa = fs.statSync(a);
  const sb = fs.statSync(b);
  if (sa.size !== sb.size) return false;
  if (sa.size > 64 * 1048576) return true; // file grandi: basta la dimensione
  return fs.readFileSync(a).equals(fs.readFileSync(b));
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const auto = args.includes('--si');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q, def) => new Promise((res) => (auto ? res(def || '') : rl.question(q, (a) => res(clean(a) || def || ''))));

  console.log('\n  HSPI Team Manager - importazione una tantum in un progetto');
  console.log('  I file vengono COPIATI: l\'origine resta com\'e\'.\n');

  // 1) Origine
  let from = clean(arg('--da'));
  if (!from) {
    const found = candidates();
    if (found.length) {
      console.log('  Cartelle di dati trovate dentro apptools:');
      found.forEach((c, i) => console.log(`    ${i + 1}) ${path.relative(ROOT, c.dir)}   (${c.count} file, ${fmt(c.size)})`));
      console.log('');
    }
    const a = await ask(found.length ? '  Numero della cartella, oppure trascina qui una cartella e premi Invio: ' : '  Trascina qui la cartella con i file da importare e premi Invio: ', '');
    from = /^\d+$/.test(a) && found[Number(a) - 1] ? found[Number(a) - 1].dir : a;
  }
  if (!from || !fs.existsSync(from) || !fs.statSync(from).isDirectory()) { console.log('\n  Cartella di origine non trovata. Nessun file copiato.\n'); rl.close(); return 1; }
  from = path.resolve(from);

  // 2) Progetto di destinazione
  const base = findDir(['progetti', 'projects']) || path.join(ROOT, 'progetti');
  fs.mkdirSync(base, { recursive: true });
  const existing = fs.readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
  if (existing.length && !arg('--progetto')) console.log('\n  Progetti gia\' presenti: ' + existing.join(', '));
  const project = safeName(arg('--progetto') || await ask('  Nome del progetto di destinazione [ATAC]: ', 'ATAC'));
  const sub = safeName(arg('--cartella') != null ? arg('--cartella') : await ask('  Sottocartella dentro il progetto [Verbale Studio]: ', 'Verbale Studio'));
  if (!project) { console.log('\n  Nome del progetto non valido. Nessun file copiato.\n'); rl.close(); return 1; }
  const dest = path.join(base, project, sub);
  if (dest === from || dest.startsWith(from + path.sep) || from.startsWith(dest + path.sep)) { console.log('\n  Origine e destinazione coincidono. Nessun file copiato.\n'); rl.close(); return 1; }

  // 3) Riepilogo e conferma
  const found = scan(from);
  const total = found.files.reduce((a, f) => a + f.size, 0);
  console.log('\n  Origine:       ' + from);
  console.log('  Destinazione:  ' + dest);
  console.log(`  File da copiare: ${found.files.length} (${fmt(total)})`);
  if (found.skipped.length || found.skippedDirs.length) console.log(`  Saltati perche' file di programma: ${found.skipped.length} file, ${found.skippedDirs.length} cartelle`);
  if (!found.files.length) { console.log('\n  Non c\'e\' niente da copiare.\n'); rl.close(); return 0; }
  const ok = auto ? 's' : await ask('\n  Procedo con la copia? [S/N]: ', 'n');
  if (!/^s/i.test(ok)) { console.log('\n  Annullato: nessun file copiato.\n'); rl.close(); return 0; }

  // 4) Copia
  let copied = 0;
  let already = 0;
  const conflicts = [];
  const errors = [];
  for (const f of found.files) {
    const target = path.join(dest, f.rel);
    try {
      if (fs.existsSync(target)) {
        if (same(f.full, target)) already++; else conflicts.push(f.rel);
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(f.full, target, fs.constants.COPYFILE_EXCL);
      const st = fs.statSync(f.full);
      fs.utimesSync(target, st.atime, st.mtime);
      copied++;
    } catch (err) { errors.push(`${f.rel}: ${err.message}`); }
  }

  // 5) Rapporto
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const report = [
    'Importazione una tantum - HSPI Team Manager',
    `Data: ${new Date().toISOString()}`, `Origine: ${from}`, `Destinazione: ${dest}`, '',
    `Copiati: ${copied}`, `Gia' presenti e identici: ${already}`, `Non copiati perche' nel progetto esiste un file diverso con lo stesso nome: ${conflicts.length}`, `Errori: ${errors.length}`,
    `Saltati perche' file di programma: ${found.skipped.length} file, ${found.skippedDirs.length} cartelle`, '',
    ...(conflicts.length ? ['FILE DIVERSI CON LO STESSO NOME (da controllare a mano):', ...conflicts.map((c) => '  ' + c), ''] : []),
    ...(errors.length ? ['ERRORI:', ...errors.map((c) => '  ' + c), ''] : []),
    ...(found.skipped.length ? ['FILE DI PROGRAMMA SALTATI:', ...found.skipped.map((c) => '  ' + c), ''] : []),
  ].join('\r\n');
  const reportFile = path.join(base, project, `_importazione-${stamp}.txt`);
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, report);

  console.log(`\n  Copiati: ${copied}   gia' presenti: ${already}   da controllare: ${conflicts.length}   errori: ${errors.length}`);
  console.log('  Rapporto: ' + reportFile);
  console.log('\n  L\'origine non e\' stata toccata. Quando hai verificato che nel portale c\'e\' tutto,');
  console.log('  puoi cancellare a mano la vecchia cartella.');
  console.log(`  Nel portale: Progetti -> ${project}. Il progetto lo vede solo l'Hacker finche' non scegli le persone.\n`);
  rl.close();
  return errors.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (err) => { console.error('\n  ERRORE: ' + err.message + '\n'); process.exitCode = 1; });
