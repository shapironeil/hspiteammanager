'use strict';
// Aggiornamento con Git (cartella del portale clonata da GitHub): stesso comportamento della versione ZIP.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..', '..');
let base; let remote; let inst;
const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.email=prova@example.com', '-c', 'user.name=Prova', ...a], { cwd, stdio: 'pipe' }).toString();
function copyProgram(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (['.git', 'data', 'progetti', 'node_modules', 'screenshots', 'Backup', '.aggiornamento', 'test'].includes(e.name)) continue;
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) copyProgram(s, d); else if (e.isFile()) fs.copyFileSync(s, d);
  }
}
const setVersion = (dir, v) => fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ version: v }));
const readVersion = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')).version;
const run = () => spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(inst, 'scripts', 'aggiorna.js'), '--ramo', 'main'],
  { env: { ...process.env, PORT: '1', HSPI_ROOT: '', HSPI_DATA_DIR: '' }, encoding: 'utf8', timeout: 120000 });

before(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-git-test-'));
  remote = path.join(base, 'remoto');
  copyProgram(REPO, remote);
  setVersion(remote, '2.0.0');
  git(remote, 'init', '-q', '-b', 'main');
  git(remote, 'add', '-A');
  git(remote, 'commit', '-q', '-m', 'v2.0.0');
  inst = path.join(base, 'portale');
  execFileSync('git', ['clone', '-q', remote, inst]);
  fs.mkdirSync(path.join(inst, 'data'), { recursive: true });
  fs.writeFileSync(path.join(inst, 'data', 'mio.txt'), 'mio');
});
after(() => fs.rmSync(base, { recursive: true, force: true }));

test('con Git: stessa versione non fa nulla, nuova versione si installa, versione rotta si annulla', () => {
  let r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Gia' aggiornato/);

  setVersion(remote, '2.1.0');
  git(remote, 'commit', '-q', '-am', 'v2.1.0');
  r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readVersion(inst), '2.1.0');
  assert.equal(fs.readFileSync(path.join(inst, 'data', 'mio.txt'), 'utf8'), 'mio');

  setVersion(remote, '2.2.0');
  fs.writeFileSync(path.join(remote, 'app', 'server.js'), 'throw new Error("rotta")');
  git(remote, 'commit', '-q', '-am', 'v2.2.0 rotta');
  r = run();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(readVersion(inst), '2.1.0');
  assert.doesNotMatch(fs.readFileSync(path.join(inst, 'app', 'server.js'), 'utf8'), /rotta/);
  assert.equal(fs.readFileSync(path.join(inst, 'data', 'mio.txt'), 'utf8'), 'mio');
});
