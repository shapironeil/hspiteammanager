'use strict';
// Aggiornamento, backup e ripristino su un'installazione di prova (copia del programma in una cartella temporanea).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { client } = require('./helpers');

const REPO = path.resolve(__dirname, '..', '..');
let base; let inst; let port; let proc;

function copyProgram(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (['.git', 'data', 'progetti', 'node_modules', 'screenshots', 'Backup', '.aggiornamento', 'test'].includes(e.name)) continue;
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) copyProgram(s, d); else if (e.isFile()) fs.copyFileSync(s, d);
  }
}
const setVersion = (dir, v) => fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ version: v, channel: 'prova' }));
const readVersion = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')).version;
const env = () => ({ ...process.env, PORT: String(port), HSPI_ROOT: '', HSPI_DATA_DIR: '' });
const run = (script, ...args) => spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(inst, 'scripts', script), ...args], { env: env(), encoding: 'utf8', timeout: 120000 });

async function startPortal() {
  proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(inst, 'app', 'server.js')], { env: env(), stdio: 'ignore' });
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/api/version`); if (r.ok) return; } catch { /* non ancora */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('portale di prova non partito');
}
const alive = async () => { try { return (await fetch(`http://127.0.0.1:${port}/api/version`)).ok; } catch { return false; } };

before(async () => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-agg-test-'));
  inst = path.join(base, 'portale');
  copyProgram(REPO, inst);
  setVersion(inst, '1.0.0');
  port = 20000 + Math.floor(Math.random() * 20000);
  await startPortal();
  const c = client(`http://127.0.0.1:${port}`);
  await c.post('/api/register', { firstName: 'Anna', lastName: 'Hacker', password: 'password-sicura-1' });
  const p = await c.post('/api/projects', { name: 'Prova' });
  await c.put(`/api/explorer/p${p.data.id}/file?path=&name=importante.txt`, 'dati del cliente');
});
after(() => { if (proc) proc.kill(); fs.rmSync(base, { recursive: true, force: true }); });

test('la versione arriva da version.json ed e\' pubblica', async () => {
  const v = await (await fetch(`http://127.0.0.1:${port}/api/version`)).json();
  assert.equal(v.version, '1.0.0');
  const sw = await (await fetch(`http://127.0.0.1:${port}/sw.js`)).text();
  assert.match(sw, /hspi-1\.0\.0/);
});

test('l\'arresto a distanza richiede il codice dell\'host', async () => {
  const r = await fetch(`http://127.0.0.1:${port}/api/host/shutdown`, { method: 'POST', headers: { 'x-hspi': '1', 'x-host-token': 'sbagliato' } });
  assert.equal(r.status, 403);
  assert.ok(await alive());
});

test('aggiornamento: ferma il portale, fa il backup, installa, non tocca i dati', async () => {
  const nuova = path.join(base, 'nuova');
  copyProgram(inst, nuova);
  setVersion(nuova, '1.1.0');
  fs.writeFileSync(path.join(nuova, 'scripts', 'novita.txt'), 'nuovo file');
  const r = run('aggiorna.js', '--da', nuova);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readVersion(inst), '1.1.0');
  assert.ok(fs.existsSync(path.join(inst, 'scripts', 'novita.txt')));
  assert.equal(await alive(), false, 'il portale e\' stato fermato');
  assert.equal(fs.readFileSync(path.join(inst, 'progetti', 'Prova', 'importante.txt'), 'utf8'), 'dati del cliente');
  const backups = fs.readdirSync(path.join(inst, 'Backup'));
  assert.equal(backups.length, 1);
  assert.match(backups[0], /prima-di-1\.1\.0/);
  assert.ok(fs.existsSync(path.join(inst, 'Backup', backups[0], 'data', 'portale.db')));
  assert.ok(fs.existsSync(path.join(inst, 'Backup', backups[0], 'progetti', 'Prova', 'importante.txt')));
  assert.ok(fs.readdirSync(path.join(inst, '.aggiornamento', 'precedenti')).length >= 1, 'il programma vecchio e\' messo da parte');
  // rilanciato con la stessa versione: non fa niente
  const again = run('aggiorna.js', '--da', nuova);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /Gia' aggiornato/);
  assert.equal(fs.readdirSync(path.join(inst, 'Backup')).length, 1);
});

test('una versione che non parte viene annullata e resta quella di prima', () => {
  const rotta = path.join(base, 'rotta');
  copyProgram(inst, rotta);
  setVersion(rotta, '1.2.0');
  fs.writeFileSync(path.join(rotta, 'app', 'server.js'), 'throw new Error("versione rotta");');
  const r = run('aggiorna.js', '--da', rotta);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /annullato/);
  assert.equal(readVersion(inst), '1.1.0');
  assert.doesNotMatch(fs.readFileSync(path.join(inst, 'app', 'server.js'), 'utf8'), /versione rotta/);
  assert.equal(fs.readFileSync(path.join(inst, 'progetti', 'Prova', 'importante.txt'), 'utf8'), 'dati del cliente');
  assert.ok(!fs.existsSync(path.join(inst, '.aggiornamento', 'in-corso.lock')), 'lucchetto tolto');
});

test('backup successivi: i file uguali non vengono ricopiati', () => {
  const r = run('backup.js', 'prova');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /uguali al backup precedente/);
  const list = fs.readdirSync(path.join(inst, 'Backup')).sort();
  const last = JSON.parse(fs.readFileSync(path.join(inst, 'Backup', list[list.length - 1], 'backup.json'), 'utf8'));
  assert.ok(last.linked >= 1, JSON.stringify(last));
});

test('ripristino: rimette i dati del backup e conserva quelli di prima', () => {
  const file = path.join(inst, 'progetti', 'Prova', 'importante.txt');
  fs.writeFileSync(file, 'modificato per sbaglio');
  const list = fs.readdirSync(path.join(inst, 'Backup')).sort();
  const r = run('ripristina.js', '--backup', list[list.length - 1], '--si');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), 'dati del cliente');
  const aside = fs.readdirSync(path.join(inst, '.ripristino-precedente'));
  assert.equal(fs.readFileSync(path.join(inst, '.ripristino-precedente', aside[0], 'progetti', 'Prova', 'importante.txt'), 'utf8'), 'modificato per sbaglio');
  // il backup non e' stato toccato
  assert.equal(fs.readFileSync(path.join(inst, 'Backup', list[list.length - 1], 'progetti', 'Prova', 'importante.txt'), 'utf8'), 'dati del cliente');
});
