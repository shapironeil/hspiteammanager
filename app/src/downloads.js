'use strict';
// Pagine pubbliche (senza accesso) e download del programma client.
// Il portale e' raggiungibile solo da questo PC o via Tailscale: "pubbliche" vuol dire solo "senza login".
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const pkg = require('./client-package');
const catalogo = require('./catalogo');
const { SECURITY_HEADERS } = require('./http-headers');

const PAGES = { '/benvenuto': 'benvenuto.html', '/guida': 'guida.html', '/scarica': 'scarica.html' };

// Indirizzo con cui l'utente vede il portale (dietro "tailscale serve" e' https://<pc>.<rete>.ts.net)
function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${config.PORT}`).split(',')[0].trim();
  return `${/^https?$/.test(proto) ? proto : 'http'}://${host.replace(/[^\w.:-]/g, '')}`;
}

function sendBuffer(res, buf, type, name) {
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length, 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="${name}"`, ...SECURITY_HEADERS });
  res.end(buf);
}

// true se la richiesta e' stata gestita qui
function handle(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (PAGES[pathname]) {
    const file = path.join(config.PUBLIC_DIR, 'sito', PAGES[pathname]);
    if (!fs.existsSync(file)) return false;
    const body = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
    res.end(body);
    return true;
  }
  if (pathname === '/scarica/HSPI-Client.zip') { sendBuffer(res, pkg.installer(originOf(req)), 'application/zip', 'HSPI-Client.zip'); return true; }
  if (pathname === '/scarica/client-app.zip') { sendBuffer(res, pkg.payload().buf, 'application/zip', 'client-app.zip'); return true; }
  // Catalogo delle app: pacchetto per HSPI Client, icone, manifest per installarle nel browser
  let m = /^\/scarica\/app\/([a-z0-9-]+)\.zip$/.exec(pathname);
  if (m) {
    const p = catalogo.pack(m[1]);
    if (!p) return false;
    sendBuffer(res, p.buf, 'application/zip', `${m[1]}.zip`);
    return true;
  }
  m = /^\/catalogo\/([a-z0-9-]+)\/([\w.-]+)$/.exec(pathname);
  if (m) {
    if (m[2] === 'manifest.webmanifest') {
      const man = catalogo.manifest(m[1]);
      if (!man) return false;
      const body = Buffer.from(JSON.stringify(man));
      res.writeHead(200, { 'Content-Type': 'application/manifest+json', 'Content-Length': body.length, 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
      res.end(body);
      return true;
    }
    const file = catalogo.iconFile(m[1], m[2]);
    if (!file) return false;
    const body = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': file.endsWith('.svg') ? 'image/svg+xml' : 'image/png', 'Content-Length': body.length, 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
    res.end(body);
    return true;
  }
  if (pathname === '/scarica/node.exe') {
    const exe = pkg.nodeExe();
    if (!exe) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
      res.end('Node.js per Windows non disponibile su questo host.');
      return true;
    }
    const st = fs.statSync(exe);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="node.exe"', ...SECURITY_HEADERS });
    if (req.method === 'HEAD') { res.end(); return true; }
    fs.createReadStream(exe).pipe(res);
    return true;
  }
  return false;
}

module.exports = { handle, originOf };
