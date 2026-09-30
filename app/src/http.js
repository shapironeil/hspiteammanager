'use strict';
// Mini-router HTTP: rotte, controllo ruoli, file statici, gestione errori.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const db = require('./db');
const security = require('./security');
const media = require('./media');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.jfif': 'image/jpeg', '.bmp': 'image/bmp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

// Gestori extra per le web app ospitate (registrati da server.js per evitare dipendenze circolari).
let appHandler = null;
const setAppHandler = (h) => { appHandler = h; };

const routes = [];

// route('GET', '/api/users/:id', { role: 'manager' }, handler)
// opzioni: role = ruolo minimo; public = senza login; allowMustChange = consentita prima del cambio password
function route(method, pattern, opts, handler) {
  const names = [];
  const re = new RegExp('^' + pattern.replace(/:[a-zA-Z]+/g, (m) => { names.push(m.slice(1)); return '([^/]+)'; }) + '$');
  routes.push({ method, re, names, opts: opts || {}, handler });
}

function sendJson(res, status, data, extraHeaders) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...(extraHeaders || {}) });
  res.end(body);
}

function readJson(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Richiesta troppo grande.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(data && typeof data === 'object' ? data : {});
      } catch { reject(new HttpError(400, 'Dati non validi.')); }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  return String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}
const isLoopback = (ip) => ip === '127.0.0.1' || ip === '::1';

function serveFile(res, baseDir, relPath, cache) {
  const file = path.resolve(baseDir, '.' + path.sep + relPath);
  if (file !== baseDir && !file.startsWith(baseDir + path.sep)) return false;
  const ext = path.extname(file).toLowerCase();
  if (!MIME[ext]) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;
  res.writeHead(200, {
    'Content-Type': MIME[ext], 'Content-Length': stat.size,
    'Cache-Control': cache || 'no-cache', ...SECURITY_HEADERS,
  });
  fs.createReadStream(file).pipe(res);
  return true;
}

function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return false; }
  if (rel.includes('\0')) return false;
  const m = /^\/media\/([a-z]+)\/([^/]+)$/.exec(rel);
  if (m) {
    const file = media.resolve(m[1], m[2]);
    return file ? serveFile(res, path.dirname(file), path.basename(file), 'private, max-age=3600') : false;
  }
  if (rel === '/') rel = '/index.html';
  return serveFile(res, config.PUBLIC_DIR, rel.slice(1));
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const ctx = { req, res, query: url.searchParams, ip: clientIp(req), user: null, params: {} };
  ctx.isLocal = isLoopback(ctx.ip);
  ctx.json = (status, data, headers) => sendJson(res, status, data, headers);
  ctx.body = () => readJson(req);

  try {
    if (!pathname.startsWith('/api/')) {
      if (appHandler && pathname.startsWith('/apps/') && appHandler.handle(req, res, pathname)) return;
      if (serveStatic(req, res, pathname)) return;
      if (appHandler && appHandler.handleFromReferer(req, res, pathname)) return;
      throw new HttpError(404, 'Pagina non trovata.');
    }

    let matched = null;
    let pathExists = false;
    for (const r of routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathExists = true;
      if (r.method !== req.method) continue;
      matched = r;
      r.names.forEach((n, i) => { ctx.params[n] = decodeURIComponent(m[i + 1]); });
      break;
    }
    if (!matched) throw new HttpError(pathExists ? 405 : 404, 'Risorsa non trovata.');

    // Protezione CSRF: le richieste che modificano dati devono avere l'intestazione del portale.
    if (req.method !== 'GET' && req.headers['x-hspi'] !== '1') throw new HttpError(403, 'Richiesta non consentita.');

    const opts = matched.opts;
    ctx.user = security.userFromRequest(req);
    if (!opts.public) {
      if (!ctx.user) throw new HttpError(401, 'Accesso richiesto.');
      if (ctx.user.must_change && !opts.allowMustChange) throw new HttpError(403, 'Devi prima cambiare la password.');
      if (opts.role && config.roleRank(ctx.user.role) < config.roleRank(opts.role)) {
        throw new HttpError(403, 'Non hai i permessi per questa operazione.');
      }
    }
    await matched.handler(ctx);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) {
      console.error(err);
      try { db.issue('server', `${req.method} ${pathname}: ${err.message}`, err.stack, ctx.user); } catch { /* il log non deve far cadere la risposta */ }
    }
    if (res.headersSent) { res.destroy(); return; }
    sendJson(res, status, { error: status === 500 ? 'Errore interno del server.' : err.message });
  }
}

module.exports = { setAppHandler, HttpError, route, handle, sendJson, SECURITY_HEADERS };
