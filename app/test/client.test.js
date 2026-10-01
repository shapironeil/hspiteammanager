'use strict';
// Programma client: pacchetti serviti dall'host, aggiornamento del client, catalogo delle app, motore locale, sito pubblico.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const { startPortal, setupHacker } = require('./helpers');
const { readZip } = require('../src/celle/zip');
const crypto = require('node:crypto');

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
  for (const f of ['installa.bat', 'HSPI.bat', 'LEGGIMI.txt', 'app/hspi-client.js', 'app/zip.js', 'app/version.json']) assert.ok(local.has(f), f);
  assert.ok(!local.has('app/ollama.js'), 'il motore dell\'AI arriva con il pacchetto di Verbale Studio, non con il client');
  // dietro "tailscale serve"
  const ts = readZip((await get('/scarica/HSPI-Client.zip', { host: 'pc-ufficio.tail1234.ts.net', 'x-forwarded-proto': 'https' })).body);
  assert.equal(ts.get('host.txt')().toString().trim(), 'https://pc-ufficio.tail1234.ts.net');
});

test('catalogo delle app: versioni proprie, pacchetti con impronta, icone e manifest per installarle nel browser', async () => {
  const c = JSON.parse((await get('/api/catalogo')).body);
  const ids = c.apps.map((a) => a.id);
  assert.deepEqual(ids, ['gestione-celle', 'mpoint', 'verbale-studio']);
  const v = JSON.parse((await get('/api/version')).body);
  for (const a of c.apps) {
    assert.match(a.version, /^\d+\.\d+\.\d+$/);
    assert.equal(a.compatible, true);
    assert.equal(v.apps[a.id].version, a.version, 'la versione dell\'app e\' la stessa in /api/version');
    const zip = (await get(a.package.url)).body;
    assert.equal(crypto.createHash('sha256').update(zip).digest('hex'), a.package.sha256, `${a.id}: impronta del pacchetto`);
    const files = readZip(zip);
    assert.equal(JSON.parse(files.get('app.json')().toString()).version, a.version);
    for (const f of ['icon.svg', 'icon-192.png', 'icon-512.png']) assert.ok(files.has(f), `${a.id}: ${f}`);
    const man = JSON.parse((await get(a.manifest)).body);
    assert.equal(man.start_url, a.web);
    assert.equal(man.scope, a.web);
    assert.ok(man.icons.some((i) => i.sizes === '512x512'));
    assert.equal((await get(a.icon)).headers['content-type'], 'image/svg+xml');
  }
  const vs = readZip((await get('/scarica/app/verbale-studio.zip')).body);
  assert.ok(vs.has('engine.js') && vs.has('ollama.js'), 'Verbale Studio porta con se\' il motore dell\'AI');
  assert.equal((await get('/scarica/app/inesistente.zip')).status, 404);
  assert.equal((await get('/catalogo/verbale-studio/app.json')).status, 404, 'dalla cartella dell\'app si servono solo icone e manifest');
  assert.equal((await get('/catalogo/..%2Fsrc/icon.svg')).status, 404);
  // pagine delle app con il proprio manifest
  assert.match((await get('/verbali/')).body.toString(), /\/catalogo\/verbale-studio\/manifest\.webmanifest/);
  assert.match((await get('/celle/')).body.toString(), /\/catalogo\/gestione-celle\/manifest\.webmanifest/);
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
  // un'app scaricata e rimasta indietro si aggiorna da sola all'avvio
  const celle = JSON.parse((await get('/api/catalogo')).body).apps.find((a) => a.id === 'gestione-celle');
  fs.mkdirSync(path.join(inst, 'apps', 'gestione-celle'), { recursive: true });
  fs.writeFileSync(path.join(inst, 'apps', 'gestione-celle', 'app.json'), JSON.stringify({ id: 'gestione-celle', name: 'GestioneCelle', version: '0.0.1', web: '/celle/' }));
  r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /gestione-celle: aggiornamento 0\.0\.1 -> /);
  assert.equal(JSON.parse(fs.readFileSync(path.join(inst, 'apps', 'gestione-celle', 'app.json'), 'utf8')).version, celle.version);
  assert.ok(fs.existsSync(path.join(inst, 'apps', '.precedente-gestione-celle')), 'la versione di prima resta da parte');
  fs.rmSync(path.join(inst, 'apps'), { recursive: true, force: true });
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
    assert.deepEqual(st.apps, {}, 'nessuna app scaricata');
    assert.equal((await fetch(`${E}/app/verbale-studio/ollama/status`, { headers: { origin } })).status, 404, 'senza Verbale Studio sul PC niente AI locale');
    // la pagina App del portale chiede al client di scaricare Verbale Studio
    const installed = await fetch(`${E}/app/installa`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'verbale-studio' }) });
    assert.equal(installed.status, 200, await installed.clone().text());
    const vsVersion = JSON.parse((await get('/api/catalogo')).body).apps.find((a) => a.id === 'verbale-studio').version;
    assert.equal((await installed.json()).version, vsVersion);
    assert.equal((await (await fetch(`${E}/stato`)).json()).apps['verbale-studio'], vsVersion);
    assert.ok(fs.existsSync(path.join(inst, 'apps', 'verbale-studio', 'engine.js')), 'il pacchetto e\' nella cartella del client, accanto al programma');
    // fuori dal portale non si installa niente
    assert.equal((await fetch(`${E}/app/installa`, { method: 'POST', headers: { origin: 'https://sito-cattivo.example', 'content-type': 'application/json' }, body: '{"id":"gestione-celle"}' })).status, 403);
    assert.equal((await fetch(`${E}/app/installa`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{"id":"../x"}' })).status, 400);
    // gia' scaricata: si apre (qui senza browser)
    const open = await (await fetch(`${E}/app/apri`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{"id":"verbale-studio"}' })).json();
    assert.equal(open.url, `${origin}/verbali/`);
    const ai = await (await fetch(`${E}/app/verbale-studio/ollama/status`, { headers: { origin } })).json();
    assert.equal(ai.running, true);
    assert.equal(ai.onClient, true);
    const pre = await fetch(`${E}/app/verbale-studio/ollama/chat`, { method: 'OPTIONS', headers: { origin, 'access-control-request-private-network': 'true' } });
    assert.equal(pre.headers.get('access-control-allow-private-network'), 'true');
    assert.equal(pre.headers.get('access-control-allow-origin'), origin);
    assert.equal((await fetch(`${E}/stato`, { headers: { origin: 'https://sito-cattivo.example' } })).status, 403);
    // il portale prepara il contesto (leggero), il client fa girare l'AI
    const pid = (await hacker.post('/api/projects', { name: 'ATAC' })).data.id;
    const cp = (await hacker.post(`/api/vs/projects/${pid}/checkpoints`, { title: 'Riunione' })).data;
    const prep = await hacker.post('/api/vs/ollama/prepare', { kind: 'chat', projectId: pid, checkpointId: cp.id, messages: [{ role: 'user', content: 'Riassumi' }], context: {} });
    assert.equal(prep.status, 200, JSON.stringify(prep.data));
    assert.match(prep.data.messages[0].content, /ATAC/);
    const res = await fetch(`${E}/app/verbale-studio/ollama/chat`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ ...prep.data, model: 'qwen2.5:3b' }) });
    const text = (await res.text()).trim().split('\n').map((l) => JSON.parse(l).message.content).join('');
    assert.equal(text, 'Ciao (2 messaggi)');
    // vecchio indirizzo (client fino alla 0.6): porta allo stesso motore
    assert.equal((await (await fetch(`${E}/ollama/status`, { headers: { origin } })).json()).onClient, true);
    // rimozione
    assert.equal((await fetch(`${E}/app/rimuovi`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{"id":"verbale-studio"}' })).status, 200);
    assert.deepEqual((await (await fetch(`${E}/stato`)).json()).apps, {});
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
