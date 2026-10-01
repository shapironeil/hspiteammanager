'use strict';
// HSPI Client: il programma che ogni persona installa sul proprio PC.
//
// All'avvio:
//   1. legge l'indirizzo dell'host (host.txt) e chiede all'host la sua versione;
//   2. se la propria versione e' diversa, scarica dall'host la stessa versione, la verifica (impronta SHA-256),
//      la mette al posto della vecchia in modo sicuro (se qualcosa va storto resta quella di prima) e riparte;
//   3. aggiorna allo stesso modo le APP del catalogo gia' scaricate (Verbale Studio, GestioneCelle, ...);
//   4. avvia il MOTORE LOCALE su 127.0.0.1:4320: i lavori pesanti delle app (per esempio l'AI locale di
//      Verbale Studio con Ollama) girano qui, sul PC dell'utente, non sull'host;
//   5. apre il portale nel browser (oppure, con --apri <app>, l'app nella sua finestra).
//
// Le app si scaricano dal portale (pagina App): niente installazioni guidate, niente cartelle da spostare.
// Vanno in apps\<id>\ accanto al programma, con un collegamento sul desktop che le apre.
//
// Uso: HSPI.bat (oppure node app/hspi-client.js [--apri <app>] [--solo-aggiorna] [--senza-browser])
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn, exec } = require('node:child_process');

const APP = __dirname;
const DIR = path.resolve(APP, '..');
const APPS = path.join(DIR, 'apps');
const PORT = Number(process.env.HSPI_CLIENT_PORT) || 4320;
const ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] || '' : null; };
const say = (m) => console.log('  ' + m);

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const readVersion = (dir) => (readJson(path.join(dir, 'version.json')) || {}).version || null;
const hostUrl = () => { try { return fs.readFileSync(path.join(DIR, 'host.txt'), 'utf8').trim().replace(/\/+$/, ''); } catch { return ''; } };
const stamp = () => new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
const fail = (status, message) => Object.assign(new Error(message), { status });

async function getJson(url, timeout = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try { const r = await fetch(url, { signal: ctrl.signal }); return r.ok ? await r.json() : null; } catch { return null; } finally { clearTimeout(t); }
}

// Scarica un pacchetto dall'host, controlla l'impronta e lo estrae in una cartella nuova.
async function fetchPackage(url, sha256, staged, keep) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download non riuscito (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (crypto.createHash('sha256').update(buf).digest('hex') !== sha256) throw new Error('il pacchetto scaricato non corrisponde (impronta diversa): non lo installo');
  const { readZip } = require('./zip');
  fs.rmSync(staged, { recursive: true, force: true });
  for (const [name, read] of readZip(buf)) {
    const rel = keep(name);
    if (!rel || name.endsWith('/') || name.includes('..')) continue;
    const dest = path.join(staged, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, read());
  }
}

// ---- Aggiornamento del programma dall'host ------------------------------------------------
async function update(host, info) {
  say(`Aggiornamento: ${readVersion(APP) || '?'} -> ${info.version}`);
  const staged = path.join(DIR, `app.nuova-${process.pid}`);
  await fetchPackage(host + info.client.updateUrl, info.client.sha256, staged, (n) => (n.startsWith('app/') ? n.slice(4) : null));
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

// ---- App del catalogo ---------------------------------------------------------------------
const appManifest = (id) => readJson(path.join(APPS, id, 'app.json'));
function installedApps() {
  const out = {};
  try {
    for (const e of fs.readdirSync(APPS, { withFileTypes: true })) {
      if (!e.isDirectory() || !ID.test(e.name)) continue;
      const m = appManifest(e.name);
      if (m && m.id === e.name) out[e.name] = m.version;
    }
  } catch { /* nessuna app ancora */ }
  return out;
}

// Motori delle app caricati: id -> { routes }
const engines = new Map();
function loadEngine(id) {
  const dir = path.join(APPS, id) + path.sep;
  for (const k of Object.keys(require.cache)) if (k.startsWith(dir)) delete require.cache[k];
  engines.delete(id);
  const m = appManifest(id);
  if (!m || !m.engine || !m.engine.main) return;
  try { engines.set(id, require(path.join(APPS, id, m.engine.main))); } catch (err) { say(`Motore di ${m.name} non avviato: ${err.message}`); }
}

// Icona del collegamento: Windows vuole un .ico, che puo' contenere direttamente un PNG.
function pngToIco(png) {
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  const head = Buffer.alloc(22);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head.writeUInt8(w >= 256 ? 0 : w, 6); head.writeUInt8(h >= 256 ? 0 : h, 7);
  head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  return Buffer.concat([head, png]);
}

const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const linkName = (m) => String(m.name).replace(/[^\w .-]/g, '').trim() || m.id;
function powershell(script) {
  if (process.platform !== 'win32') return;
  spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { stdio: 'ignore', windowsHide: true }).on('error', () => {});
}

// Collegamento sul desktop: apre l'app (avvia HSPI Client se serve). Solo su Windows.
function desktopLink(id) {
  const m = appManifest(id);
  if (!m || process.platform !== 'win32') return;
  let ico = '';
  const png = path.join(APPS, id, 'icon-192.png');
  if (fs.existsSync(png)) { ico = path.join(APPS, id, 'icon.ico'); fs.writeFileSync(ico, pngToIco(fs.readFileSync(png))); }
  powershell(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\\'+${psQuote(linkName(m) + '.lnk')});`
    + `$s.TargetPath=${psQuote(path.join(DIR, 'HSPI.bat'))};$s.Arguments=${psQuote(`--apri ${id}`)};$s.WorkingDirectory=${psQuote(DIR)};$s.WindowStyle=7;`
    + `${ico ? `$s.IconLocation=${psQuote(ico)};` : ''}$s.Description=${psQuote(`${m.name} (HSPI)`)};$s.Save()`);
}

const installing = new Map();
function installApp(host, id, entry) {
  if (!installing.has(id)) {
    installing.set(id, (async () => {
      const before = (appManifest(id) || {}).version;
      say(before ? `${id}: aggiornamento ${before} -> ${entry.version}` : `${id}: scarico la versione ${entry.version}`);
      fs.mkdirSync(APPS, { recursive: true });
      const staged = path.join(APPS, `.nuova-${id}-${process.pid}`);
      await fetchPackage(host + entry.url, entry.sha256, staged, (n) => n);
      const m = readJson(path.join(staged, 'app.json'));
      if (!m || m.id !== id || m.version !== entry.version) { fs.rmSync(staged, { recursive: true, force: true }); throw new Error('il pacchetto non contiene l\'app attesa'); }
      // scambio: la versione di prima resta in .precedente-<id> finche' non arriva la successiva
      const dest = path.join(APPS, id);
      const prev = path.join(APPS, `.precedente-${id}`);
      fs.rmSync(prev, { recursive: true, force: true });
      if (fs.existsSync(dest)) fs.renameSync(dest, prev);
      try { fs.renameSync(staged, dest); } catch (err) { if (fs.existsSync(prev)) fs.renameSync(prev, dest); throw err; }
      loadEngine(id);
      desktopLink(id);
      return { id, version: m.version, name: m.name, updated: !!before };
    })().finally(() => installing.delete(id)));
  }
  return installing.get(id);
}

function removeApp(id) {
  const m = appManifest(id);
  if (!m) throw fail(404, 'App non scaricata su questo PC');
  engines.delete(id);
  fs.rmSync(path.join(APPS, id), { recursive: true, force: true });
  fs.rmSync(path.join(APPS, `.precedente-${id}`), { recursive: true, force: true });
  powershell(`Remove-Item -LiteralPath ([Environment]::GetFolderPath('Desktop')+'\\'+${psQuote(linkName(m) + '.lnk')}) -ErrorAction SilentlyContinue`);
  return { ok: true };
}

// Allinea le app gia' scaricate alle versioni dell'host
async function syncApps(host, info) {
  for (const [id, version] of Object.entries(installedApps())) {
    const entry = info.apps && info.apps[id];
    if (!entry || entry.version === version) continue;
    try { await installApp(host, id, entry); } catch (err) { say(`${id}: aggiornamento non riuscito, resta la versione di prima (${err.message})`); }
  }
}

// Chi aveva gia' l'AI locale nel programma (versioni fino alla 0.6) la ritrova: Verbale Studio si scarica da solo.
function hadLocalAi() {
  try { return fs.readdirSync(path.join(DIR, 'precedenti')).some((n) => fs.existsSync(path.join(DIR, 'precedenti', n, 'ollama.js'))); } catch { return false; }
}

// ---- Apertura nel browser -----------------------------------------------------------------
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}
// L'app nella sua finestra (Edge o Chrome in modalita' app, sempre presenti sui PC aziendali), altrimenti una scheda.
function openAppWindow(url) {
  if (process.platform === 'win32') {
    const bases = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
    const exe = bases.flatMap((b) => [path.join(b, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(b, 'Google', 'Chrome', 'Application', 'chrome.exe')]).find((p) => fs.existsSync(p));
    if (exe) { spawn(exe, [`--app=${url}`], { detached: true, stdio: 'ignore' }).on('error', () => openBrowser(url)).unref(); return 'finestra'; }
  }
  openBrowser(url);
  return 'browser';
}

async function openApp(host, id) {
  if (!appManifest(id)) {
    const info = await getJson(`${host}/api/version`);
    const entry = info && info.apps && info.apps[id];
    if (!entry) throw fail(404, 'App non trovata nel catalogo del portale');
    await installApp(host, id, entry);
  }
  const url = host + appManifest(id).web;
  return { ok: true, url, how: args.includes('--senza-browser') ? 'nessuna' : openAppWindow(url) };
}

// ---- Motore locale ------------------------------------------------------------------------
function startEngine(host) {
  const allowed = new Set([host, 'http://localhost:8080', 'http://127.0.0.1:8080'].filter(Boolean));
  const cors = (origin) => (origin && allowed.has(origin) ? {
    'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true', Vary: 'Origin',
  } : {});
  const send = (res, status, data, origin) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(origin) });
    res.end(JSON.stringify(data));
  };
  const body = (req) => new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 30 * 1024 * 1024) { reject(fail(413, 'Richiesta troppo grande')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(fail(400, 'Dati non validi')); } });
    req.on('error', reject);
  });
  const appId = (b) => { if (!ID.test(b.id || '')) throw fail(400, 'App non valida'); return b.id; };
  // Rotta di un motore: 'METODO /percorso' nella tabella routes del motore dell'app
  async function engineRoute(id, method, rest, req, res, origin) {
    const eng = engines.get(id);
    if (!eng) throw fail(404, appManifest(id) ? 'Questa app non ha un motore locale' : 'App non scaricata su questo PC: scaricala dalla pagina App del portale');
    const fn = eng.routes && eng.routes[`${method} ${rest}`];
    if (!fn) throw fail(404, 'Non trovato');
    const out = await fn({ body: method === 'POST' ? await body(req) : {}, res, cors: cors(origin), host });
    if (out !== undefined && !res.headersSent) send(res, 200, out, origin);
  }

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    // solo le pagine del portale possono usare il motore (o richieste senza Origin dal PC stesso)
    if (origin && !allowed.has(origin)) return send(res, 403, { error: 'Origine non consentita' }, '');
    if (req.method === 'OPTIONS') { res.writeHead(204, cors(origin)); return res.end(); }
    const url = new URL(req.url, 'http://127.0.0.1');
    const p = url.pathname;
    try {
      if (req.method === 'GET' && p === '/stato') return send(res, 200, { app: 'hspi-client', version: readVersion(APP), host, apps: installedApps() }, origin);
      if (req.method === 'GET' && p === '/app') return send(res, 200, { apps: installedApps() }, origin);
      if (req.method === 'POST' && p === '/app/installa') {
        const id = appId(await body(req));
        const info = await getJson(`${host}/api/version`);
        if (!info) throw fail(502, 'Il portale non risponde');
        const entry = info.apps && info.apps[id];
        if (!entry) throw fail(404, 'App non trovata nel catalogo del portale');
        return send(res, 200, await installApp(host, id, entry), origin);
      }
      if (req.method === 'POST' && p === '/app/apri') return send(res, 200, await openApp(host, appId(await body(req))), origin);
      if (req.method === 'POST' && p === '/app/rimuovi') return send(res, 200, removeApp(appId(await body(req))), origin);
      const m = /^\/app\/([a-z0-9-]+)(\/.*)$/.exec(p);
      if (m) return await engineRoute(m[1], req.method, m[2], req, res, origin);
      // indirizzi delle versioni fino alla 0.6 (AI locale di Verbale Studio)
      if (p.startsWith('/ollama/')) return await engineRoute('verbale-studio', req.method, p, req, res, origin);
      return send(res, 404, { error: 'Non trovato' }, origin);
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

async function main() {
  const host = hostUrl();
  const openId = argValue('--apri');
  console.log(`\n  HSPI Client v${readVersion(APP) || '?'}\n  Portale: ${host || '(non configurato)'}\n`);
  if (!host) { say('Manca l\'indirizzo del portale (host.txt): reinstalla dal portale, pagina Scarica.'); return 1; }
  if (openId !== null && !ID.test(openId)) { say('Indica quale app aprire: --apri <app>'); return 1; }

  // Collegamento di un'app con HSPI Client gia' aperto: chiede a lui di aprirla ed esce.
  if (openId) {
    const other = await getJson(`http://127.0.0.1:${PORT}/stato`, 1500);
    if (other && other.app === 'hspi-client') {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/app/apri`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: openId }) });
        if (r.ok) { say('Apro l\'app con HSPI Client gia\' aperto.'); return 0; }
      } catch { /* prosegue da solo */ }
    }
  }

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

  if (info) {
    await syncApps(host, info);
    if (!fs.existsSync(APPS) && hadLocalAi() && info.apps && info.apps['verbale-studio']) {
      await installApp(host, 'verbale-studio', info.apps['verbale-studio']).catch((err) => say(`Verbale Studio non scaricato: ${err.message}`));
    }
  }
  if (args.includes('--solo-aggiorna')) return 0;
  for (const id of Object.keys(installedApps())) loadEngine(id);
  const apps = installedApps();
  say(Object.keys(apps).length ? `App sul PC: ${Object.entries(apps).map(([id, v]) => `${id} ${v}`).join(', ')}` : 'Nessuna app scaricata: si scaricano dalla pagina App del portale.');

  try {
    await startEngine(host);
    say(`Motore locale attivo su http://127.0.0.1:${PORT} (i lavori pesanti delle app girano su questo PC).`);
  } catch (err) {
    const other = await getJson(`http://127.0.0.1:${PORT}/stato`, 1500);
    if (other && other.app === 'hspi-client') say('HSPI Client era gia\' aperto.');
    else say(`Non riesco ad avviare il motore locale (porta ${PORT}): ${err.message}`);
    if (!args.includes('--senza-browser')) openBrowser(host);
    return other ? 0 : 1;
  }
  if (openId) {
    try { await openApp(host, openId); } catch (err) { say(`Non riesco ad aprire ${openId}: ${err.message}`); }
  } else if (!args.includes('--senza-browser')) openBrowser(host);
  say('Lascia aperta questa finestra (anche ridotta a icona) mentre usi il portale e le app.');
  return null; // resta in esecuzione
}

main().then((code) => { if (code !== null) process.exit(code); }).catch((err) => { console.error('  ERRORE: ' + err.message); process.exit(1); });
