'use strict';
// Allinea la cartella di lavoro all'ultima versione scaricata.
// aggiorna.bat copia i file nuovi e modificati; questo script fa il resto: toglie i file del
// portale che nella nuova versione non esistono piu' (spostati, rinominati o eliminati),
// cosi' la cartella di lavoro resta identica alla versione pubblicata.
//
// Tocca SOLO file che erano arrivati con un aggiornamento precedente (li ricorda in
// .elenco-aggiornamento.json) o che sono elencati in scripts/file-rimossi.txt.
// Non tocca mai i tuoi file: data, progetti, apptools, immagini, Node.js, PortableGit.
//
// Uso (lo chiama aggiorna.bat):  node scripts/allinea-cartella.js "<cartella della versione scaricata>"
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, '.elenco-aggiornamento.json');
const PROTECTED = [/^data\//i, /^progetti\//i, /^projects\//i, /^apptools\//i, /^node-v/i, /^portablegit/i, /^\.git\//i];

function listFiles(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, base, out);
    else if (e.isFile()) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function readLines(file) {
  try { return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')); } catch { return []; }
}

const source = process.argv[2];
if (!source || !fs.existsSync(source)) {
  console.log('  Allineamento saltato: cartella della nuova versione non trovata.');
  process.exit(0);
}

const current = new Set(listFiles(source));
let previous = [];
try { previous = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).files || []; } catch { /* primo aggiornamento con questo sistema */ }
const retired = readLines(path.join(source, 'scripts', 'file-rimossi.txt'));

let removed = 0;
for (const rel of new Set([...previous, ...retired])) {
  if (current.has(rel) || PROTECTED.some((re) => re.test(rel)) || rel.includes('..')) continue;
  const file = path.join(ROOT, ...rel.split('/'));
  try {
    if (!fs.statSync(file).isFile()) continue;
    fs.rmSync(file);
    removed++;
    // Toglie le cartelle rimaste vuote, risalendo fino alla cartella del progetto.
    let dir = path.dirname(file);
    while (dir !== ROOT && dir.startsWith(ROOT) && fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); dir = path.dirname(dir); }
  } catch { /* gia' assente o in uso: si riprova al prossimo aggiornamento */ }
}

fs.writeFileSync(MANIFEST, JSON.stringify({ updatedAt: new Date().toISOString(), files: [...current].sort() }));
console.log(`  Cartella allineata: ${current.size} file del portale aggiornati, ${removed} vecchi file rimossi.`);
