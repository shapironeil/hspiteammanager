'use strict';
// Avvia un portale di prova in una cartella temporanea (mai quella vera) e offre un piccolo client HTTP.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

async function startPortal() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-test-'));
  const port = await freePort();
  const proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, HSPI_ROOT: root, HSPI_DATA_DIR: path.join(root, 'data'), PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  proc.stdout.on('data', (d) => { output += d; });
  proc.stderr.on('data', (d) => { output += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + '/api/state'); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
    if (i === 99) throw new Error('Il portale di prova non parte:\n' + output);
  }
  return {
    root, base, port, proc, output: () => output,
    stop() { proc.kill(); fs.rmSync(root, { recursive: true, force: true }); },
  };
}

// Client con cookie di sessione.
function client(base) {
  let cookie = '';
  async function req(method, url, body, headers = {}) {
    const isBuf = body instanceof Buffer || typeof body === 'string';
    const res = await fetch(base + url, {
      method,
      headers: { 'x-hspi': '1', ...(cookie ? { cookie } : {}), ...(body && !isBuf ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : (isBuf ? body : JSON.stringify(body)),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  }
  return {
    get: (u, h) => req('GET', u, undefined, h),
    post: (u, b) => req('POST', u, b || {}),
    put: (u, b) => req('PUT', u, b),
    patch: (u, b) => req('PATCH', u, b),
    del: (u) => req('DELETE', u),
  };
}

// Crea l'Hacker (primo account) e restituisce il suo client.
async function setupHacker(base) {
  const c = client(base);
  const r = await c.post('/api/register', { firstName: 'Anna', lastName: 'Hacker', password: 'password-sicura-1' });
  if (r.status !== 201) throw new Error('registrazione: ' + JSON.stringify(r.data));
  return c;
}

// Crea un altro account con il ruolo indicato, gia' pronto (password cambiata).
async function addUser(base, hacker, firstName, role) {
  const r = await hacker.post('/api/users', { firstName, lastName: 'Prova', role, password: 'iniziale-123' });
  if (r.status !== 201) throw new Error('nuovo utente: ' + JSON.stringify(r.data));
  const c = client(base);
  await c.post('/api/login', { username: r.data.username, password: 'iniziale-123' });
  const ch = await c.post('/api/me/password', { current: 'iniziale-123', next: 'definitiva-456' });
  if (ch.status !== 200) throw new Error('cambio password: ' + JSON.stringify(ch.data));
  c.id = r.data.id;
  return c;
}

module.exports = { startPortal, client, setupHacker, addUser };
