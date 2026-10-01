'use strict';
// Programma client: pacchetti serviti dall'host, aggiornamento del client, motore locale, sito pubblico.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const { startPortal, setupHacker } = require('./helpers');
const { readZip } = require('../src/trama/zip');

let portal; let hacker; let base; let fakeOllama; let ollamaPort;
const get = (p, headers = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port: portal.port, path: p, headers }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', reject);
  req.end();
});

before(async () => {
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-client-'));
  // Ollama finto: versione, modelli, chat in streaming
  fakeOllama = http.createServer((req, res) => {
    if (req.url === '/api/version') return res.end(JSON.stringify({ version: '0.0-prova' }));
    if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'qwen2.5:3b', size: 1 }] }));
    if (req.url === '/api/chat') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const b = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        res.write(JSON.stringify({ message: { content: 'Ciao ' } }) + '\n');
        res.end(JSON.stringify({ message: { content: `(${b.messages.length} messaggi)` }, done: true }) + '\n');
      });
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise((r) => fakeOllama.listen(0, '127.0.0.1', r));
  ollamaPort = fakeOllama.address().port;
});
after(() => { portal && portal.stop(); fakeOllama && fakeOllama.close(); fs.rmSync(base, { recursive: true, force: true }); });

test('versione e pacchetto client dall\'host, sito pubblico senza accesso', async () => {
  const v = JSON.parse((await get('/api/version')).body);
  assert.match(v.client.sha256, /^[0-9a-f]{64}$/);
  assert.equal(v.client.version, v.version);
  for (const p of ['/benvenuto', '/guida', '/scarica']) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.match(r.body.toString(), /HSPI Team Manager/);
  }
  assert.equal((await get('/scarica/node.exe')).status, 404, 'su Linux non c\'e\' node.exe da distribuire');
});

test('l\'installer porta con se\' l\'indirizzo da cui e\' stato scaricato', async () => {
  const local = readZip((await get('/scarica/HSPI-Client.zip')).body);
  assert.equal(local.get('host.txt')().toString().trim(), `http://127.0.0.1:${portal.port}`);
  for (const f of ['installa.bat', 'HSPI.bat', 'LEGGIMI.txt', 'app/hspi-client.js', 'app/ollama.js', 'app/zip.js', 'app/version.json']) assert.ok(local.has(f), f);
  // dietro "tailscale serve"
  const ts = readZip((await get('/scarica/HSPI-Client.zip', { host: 'pc-ufficio.tail1234.ts.net', 'x-forwarded-proto': 'https' })).body);
  assert.equal(ts.get('host.txt')().toString().trim(), 'https://pc-ufficio.tail1234.ts.net');
});

test('il client si allinea alla versione dell\'host (e se e\' gia\' allineato non tocca nulla)', async () => {
  const inst = path.join(base, 'HSPI-Client');
  const zip = readZip((await get('/scarica/HSPI-Client.zip')).body);
  for (const [name, read] of zip) {
    const dest = path.join(inst, ...name.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, read());
  }
  const host = JSON.parse((await get('/api/version')).body).version;
  fs.writeFileSync(path.join(inst, 'app', 'version.json'), JSON.stringify({ version: '0.0.1' }));
  const run = () => spawnSync(process.execPath, [path.join(inst, 'app', 'hspi-client.js'), '--solo-aggiorna'], { encoding: 'utf8', timeout: 60000 });
  let r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Aggiornamento: 0\.0\.1 -> /);
  assert.equal(JSON.parse(fs.readFileSync(path.join(inst, 'app', 'version.json'), 'utf8')).version, host);
  assert.equal(fs.readdirSync(path.join(inst, 'precedenti')).length, 1, 'la versione vecchia e\' messa da parte');
  r = run();
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Versione allineata/);
  assert.equal(fs.readdirSync(path.join(inst, 'precedenti')).length, 1);
});

test('motore locale: AI sul PC del client, solo per le pagine del portale', async () => {
  const inst = path.join(base, 'HSPI-Client');
  const port = 30000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, [path.join(inst, 'app', 'hspi-client.js'), '--senza-browser'], {
    env: { ...process.env, HSPI_CLIENT_PORT: String(port), OLLAMA_HOST: `http://127.0.0.1:${ollamaPort}` }, stdio: 'ignore',
  });
  const E = `http://127.0.0.1:${port}`;
  const origin = `http://127.0.0.1:${portal.port}`;
  try {
    let st = null;
    for (let i = 0; i < 50 && !st; i++) { await new Promise((r) => setTimeout(r, 150)); try { st = await (await fetch(`${E}/stato`, { headers: { origin } })).json(); } catch { /* non ancora */ } }
    assert.equal(st.app, 'hspi-client');
    assert.equal(st.ollama.running, true);
    const pre = await fetch(`${E}/ollama/chat`, { method: 'OPTIONS', headers: { origin, 'access-control-request-private-network': 'true' } });
    assert.equal(pre.headers.get('access-control-allow-private-network'), 'true');
    assert.equal(pre.headers.get('access-control-allow-origin'), origin);
    assert.equal((await fetch(`${E}/stato`, { headers: { origin: 'https://sito-cattivo.example' } })).status, 403);
    // il portale prepara il contesto (leggero), il client fa girare l'AI
    const pid = (await hacker.post('/api/projects', { name: 'ATAC' })).data.id;
    const cp = (await hacker.post(`/api/vs/projects/${pid}/checkpoints`, { title: 'Riunione' })).data;
    const prep = await hacker.post('/api/vs/ollama/prepare', { kind: 'chat', projectId: pid, checkpointId: cp.id, messages: [{ role: 'user', content: 'Riassumi' }], context: {} });
    assert.equal(prep.status, 200, JSON.stringify(prep.data));
    assert.match(prep.data.messages[0].content, /ATAC/);
    const res = await fetch(`${E}/ollama/chat`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ ...prep.data, model: 'qwen2.5:3b' }) });
    const text = (await res.text()).trim().split('\n').map((l) => JSON.parse(l).message.content).join('');
    assert.equal(text, 'Ciao (2 messaggi)');
  } finally { proc.kill(); }
});

test('AI sull\'host spenta di default, riaccendibile dall\'Hacker', async () => {
  const st = (await hacker.get('/api/vs/ollama/status')).data;
  assert.equal(st.disabled, true);
  assert.equal((await hacker.post('/api/vs/ollama/task', { projectId: 1, task: 'rewrite', text: 'x' })).status, 400);
  await hacker.patch('/api/settings', { portalName: 'HSPI Team Manager', quotaGb: 100, maxFileMb: 2048, hostAi: true });
  assert.notEqual((await hacker.get('/api/vs/ollama/status')).data.disabled, true);
  const sys = (await hacker.get('/api/system')).data;
  assert.ok(sys.host.memTotal > 0 && sys.host.rss > 0);
  assert.equal(sys.settings.hostAi, true);
});
