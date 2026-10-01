'use strict';
// Funzioni comuni agli script dell'host (aggiorna, ripristina, backup): versione, portale acceso/spento, prova di avvio.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;

function readVersion(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')).version || null; } catch { return null; }
}

// Confronto di versioni "1.2.10" > "1.2.9"
function compare(a, b) {
  const pa = String(a || '0').split(/[.-]/).map((x) => Number(x) || 0);
  const pb = String(b || '0').split(/[.-]/).map((x) => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

function request(port, method, pathname, headers = {}, timeout = 2500) {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method, headers, timeout }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(body) }); } catch { resolve({ status: res.statusCode, data: null }); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function portalVersion(port = PORT) {
  const r = await request(port, 'GET', '/api/version');
  return r && r.status === 200 && r.data ? r.data.version : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ferma il portale acceso su questo PC (con il codice segreto in data/.host-token).
async function stopPortal(dataDir, reason, port = PORT) {
  if (!(await portalVersion(port))) return false;
  let token = '';
  try { token = fs.readFileSync(path.join(dataDir, '.host-token'), 'utf8').trim(); } catch { /* manca */ }
  const r = await request(port, 'POST', `/api/host/shutdown?motivo=${encodeURIComponent(reason)}`, { 'x-host-token': token, 'x-hspi': '1' });
  if (!r || r.status !== 200) throw new Error('Il portale e\' acceso e non riesco a fermarlo: chiudi la sua finestra nera e riprova.');
  for (let i = 0; i < 40; i++) { await sleep(250); if (!(await portalVersion(port))) return true; }
  throw new Error('Il portale non si e\' fermato: chiudi la sua finestra nera e riprova.');
}

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

// Avvia il portale di una cartella su una porta libera e controlla che risponda con la versione attesa.
async function trialStart(root, expected, env = {}) {
  const port = await freePort();
  const proc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(root, 'app', 'server.js')], {
    env: { ...process.env, ...env, PORT: String(port), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  proc.stdout.on('data', (d) => { output += d; });
  proc.stderr.on('data', (d) => { output += d; });
  try {
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      if (proc.exitCode !== null) break;
      const v = await portalVersion(port);
      if (v) return { ok: v === expected, version: v, output };
    }
    return { ok: false, version: null, output };
  } finally { proc.kill(); await sleep(300); }
}

module.exports = { ROOT, PORT, readVersion, compare, portalVersion, stopPortal, trialStart, sleep, request };
