'use strict';
// HSPI Client: il programma che ogni persona installa sul proprio PC.
//
// All'avvio:
//   1. legge l'indirizzo dell'host (host.txt) e chiede all'host la sua versione;
//   2. se la propria versione e' diversa, scarica dall'host la stessa versione, la verifica (impronta SHA-256),
//      la mette al posto della vecchia in modo sicuro (se qualcosa va storto resta quella di prima) e riparte;
//   3. avvia il MOTORE LOCALE su 127.0.0.1:4320: i lavori pesanti (AI locale con Ollama) girano qui, sul PC
//      dell'utente, non sull'host;
//   4. apre il portale nel browser.
//
// Uso: HSPI.bat (oppure node app/hspi-client.js [--solo-aggiorna] [--senza-browser])
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn, exec } = require('node:child_process');

const APP = __dirname;
const DIR = path.resolve(APP, '..');
const PORT = Number(process.env.HSPI_CLIENT_PORT) || 4320;
const args = process.argv.slice(2);
const say = (m) => console.log('  ' + m);

const readVersion = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')).version; } catch { return null; } };
const hostUrl = () => { try { return fs.readFileSync(path.join(DIR, 'host.txt'), 'utf8').trim().replace(/\/+$/, ''); } catch { return ''; } };
const stamp = () => new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');

async function getJson(url, timeout = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try { const r = await fetch(url, { signal: ctrl.signal }); return r.ok ? await r.json() : null; } catch { return null; } finally { clearTimeout(t); }
}

// ---- Aggiornamento dall'host -------------------------------------------------------------
async function update(host, info) {
  say(`Aggiornamento: ${readVersion(APP) || '?'} -> ${info.version}`);
  const res = await fetch(host + info.client.updateUrl);
  if (!res.ok) throw new Error(`download non riuscito (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== info.client.sha256) throw new Error('il pacchetto scaricato non corrisponde (impronta diversa): non lo installo');
  const { readZip } = require('./zip');
  const staged = path.join(DIR, `app.nuova-${process.pid}`);
  fs.rmSync(staged, { recursive: true, force: true });
  for (const [name, read] of readZip(buf)) {
    if (!name.startsWith('app/') || name.endsWith('/') || name.includes('..')) continue;
    const dest = path.join(staged, ...name.slice(4).split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, read());
  }
  if (readVersion(staged) !== info.version) throw new Error('il pacchetto non contiene la versione attesa');
  // scambio: la versione vecchia va in "precedenti" (si tengono le ultime 2), la nuova al suo posto
  const old = path.join(DIR, 'precedenti', `${stamp()}-${readVersion(APP) || 'vecchia'}`);
  fs.mkdirSync(path.dirname(old), { recursive: true });
  fs.renameSync(APP, old);
  try { fs.renameSync(staged, APP); } catch (err) { fs.renameSync(old, APP); throw err; }
  const keep = fs.readdirSync(path.join(DIR, 'precedenti')).sort();
  for (const n of keep.slice(0, Math.max(0, keep.length - 2))) fs.rmSync(path.join(DIR, 'precedenti', n), { recursive: true, force: true });
  say('Aggiornato.');
}

// ---- Motore locale ------------------------------------------------------------------------
function startEngine(host) {
  const ollama = require('./ollama');
  const allowed = new Set([host, 'http://localhost:8080', 'http://127.0.0.1:8080'].filter(Boolean));
  const send = (res, status, data, origin) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(origin) });
    res.end(JSON.stringify(data));
  };
  const cors = (origin) => (origin && allowed.has(origin) ? {
    'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true', Vary: 'Origin',
  } : {});
  const body = (req) => new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 30 * 1024 * 1024) { reject(Object.assign(new Error('Richiesta troppo grande'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(Object.assign(new Error('Dati non validi'), { status: 400 })); } });
    req.on('error', reject);
  });
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    // solo le pagine del portale possono usare il motore (o richieste senza Origin dal PC stesso)
    if (origin && !allowed.has(origin)) return send(res, 403, { error: 'Origine non consentita' }, '');
    if (req.method === 'OPTIONS') { res.writeHead(204, cors(origin)); return res.end(); }
    const url = new URL(req.url, 'http://127.0.0.1');
    try {
      if (req.method === 'GET' && url.pathname === '/stato') return send(res, 200, { app: 'hspi-client', version: readVersion(APP), host, ollama: await ollama.status() }, origin);
      if (req.method === 'GET' && url.pathname === '/ollama/status') {
        return send(res, 200, { ...(await ollama.status()), recommended: ollama.RECOMMENDED, jobs: ollama.jobs, platform: process.platform, canManage: true, onClient: true }, origin);
      }
      if (req.method !== 'POST') return send(res, 404, { error: 'Non trovato' }, origin);
      const b = await body(req);
      switch (url.pathname) {
        case '/ollama/install': return send(res, 200, ollama.install(), origin);
        case '/ollama/start': ollama.startApp(); return send(res, 200, { ok: true }, origin);
        case '/ollama/pull':
          if (!/^[\w.:/-]{2,80}$/.test(b.model || '')) return send(res, 400, { error: 'Nome modello non valido' }, origin);
          return send(res, 200, ollama.pull(b.model), origin);
        case '/ollama/delete': await ollama.removeModel(b.model); return send(res, 200, { ok: true }, origin);
        case '/ollama/task': return send(res, 200, { text: await ollama.task(b) }, origin);
        case '/ollama/train': return send(res, 200, await ollama.train(b), origin);
        case '/ollama/chat': {
          const upstream = await ollama.chatStream(b);
          res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', ...cors(origin) });
          try { for await (const chunk of upstream.body) res.write(chunk); } catch { /* interrotto */ }
          return res.end();
        }
        default: return send(res, 404, { error: 'Non trovato' }, origin);
      }
    } catch (err) {
      if (res.headersSent) return res.destroy();
      return send(res, err.status || 500, { error: err.message || 'Errore' }, origin);
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function main() {
  const host = hostUrl();
  console.log(`\n  HSPI Client v${readVersion(APP) || '?'}\n  Portale: ${host || '(non configurato)'}\n`);
  if (!host) { say('Manca l\'indirizzo del portale (host.txt): reinstalla dal portale, pagina Scarica.'); return 1; }
  const info = await getJson(`${host}/api/version`);
  if (!info) say('Il portale non risponde (Tailscale acceso? PC del portale acceso?). Avvio comunque il motore locale.');
  else if (info.client && info.version !== readVersion(APP)) {
    try {
      await update(host, info);
      if (args.includes('--solo-aggiorna')) return 0;
      // si riparte con la versione nuova
      spawn(process.execPath, [path.join(APP, 'hspi-client.js'), ...args], { detached: true, stdio: 'inherit' }).unref();
      return 0;
    } catch (err) { say(`Aggiornamento non riuscito, resta la versione di prima: ${err.message}`); }
  } else say(`Versione allineata al portale (${readVersion(APP)}).`);
  if (args.includes('--solo-aggiorna')) return 0;

  try {
    await startEngine(host);
    say(`Motore locale attivo su http://127.0.0.1:${PORT} (AI locale e lavori pesanti girano su questo PC).`);
  } catch (err) {
    const other = await getJson(`http://127.0.0.1:${PORT}/stato`, 1500);
    if (other && other.app === 'hspi-client') say('HSPI Client era gia\' aperto.');
    else say(`Non riesco ad avviare il motore locale (porta ${PORT}): ${err.message}`);
    if (!args.includes('--senza-browser')) openBrowser(host);
    return other ? 0 : 1;
  }
  if (!args.includes('--senza-browser')) openBrowser(host);
  say('Lascia aperta questa finestra (anche ridotta a icona) mentre usi il portale.');
  return null; // resta in esecuzione
}

main().then((code) => { if (code !== null) process.exit(code); }).catch((err) => { console.error('  ERRORE: ' + err.message); process.exit(1); });
