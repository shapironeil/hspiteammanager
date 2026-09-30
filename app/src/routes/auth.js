'use strict';
// Stato del portale, primo avvio, login/logout, profilo personale.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const db = require('../db');
const security = require('../security');
const { route, HttpError } = require('../http');

const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, mustChange: !!u.must_change });
const userCount = () => db.get('SELECT COUNT(*) AS n FROM users').n;

// Immagini personalizzate: si cercano nelle cartelle "images" e "branding".
// 1) file chiamato esattamente logo / sfondo / favicon
// 2) file che contiene quella parola nel nome (es. "logo-hspi.png")
// 3) per il logo: la prima immagine rimasta nella cartella "images"
const IMAGE_EXT = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'];
function branding() {
  const out = { logo: null, sfondo: null, favicon: null };
  const found = [];
  for (const [prefix, dir] of [['/images/', config.IMAGES_DIR], ['/branding/', config.BRANDING_DIR]]) {
    let names = [];
    try { names = fs.readdirSync(dir).sort(); } catch { continue; }
    for (const n of names) {
      if (!IMAGE_EXT.includes(path.extname(n).toLowerCase())) continue;
      found.push({ url: prefix + encodeURIComponent(n), base: path.basename(n, path.extname(n)).toLowerCase(), prefix });
    }
  }
  const take = (key, test) => {
    if (out[key]) return;
    const hit = found.find((f) => !f.used && test(f));
    if (hit) { hit.used = true; out[key] = hit.url; }
  };
  for (const key of Object.keys(out)) take(key, (f) => f.base === key);
  for (const key of Object.keys(out)) take(key, (f) => f.base.includes(key));
  take('logo', (f) => f.prefix === '/images/');
  return out;
}

function cleanText(value, max, label) {
  const s = String(value == null ? '' : value).trim();
  if (!s) throw new HttpError(400, `${label}: campo obbligatorio.`);
  if (s.length > max) throw new HttpError(400, `${label}: massimo ${max} caratteri.`);
  return s;
}

route('GET', '/api/state', { public: true }, (ctx) => {
  const setupNeeded = userCount() === 0;
  ctx.json(200, {
    version: config.VERSION,
    portalName: db.getSetting('portalName'),
    branding: branding(),
    roles: config.ROLE_LABELS,
    setupNeeded,
    canSetup: setupNeeded && ctx.isLocal,
    maxFileMb: Number(db.getSetting('maxFileMb')),
    user: ctx.user ? publicUser(ctx.user) : null,
  });
});

// Primo avvio: crea l'account Hacker. Consentito solo dal PC che ospita il portale.
route('POST', '/api/setup', { public: true }, async (ctx) => {
  if (userCount() > 0) throw new HttpError(409, 'Il portale e\' gia\' configurato.');
  if (!ctx.isLocal) throw new HttpError(403, 'La configurazione iniziale si fa solo dal PC che ospita il portale.');
  const b = await ctx.body();
  const username = String(b.username || '').trim().toLowerCase();
  if (!security.USERNAME_RE.test(username)) throw new HttpError(400, 'Nome utente: 3-32 caratteri tra lettere minuscole, numeri, punto, trattino.');
  const name = cleanText(b.name, 80, 'Nome');
  const pwErr = security.checkPassword(b.password);
  if (pwErr) throw new HttpError(400, pwErr);
  const r = db.run('INSERT INTO users(username, name, role, pass_hash, created_at, last_login) VALUES(?,?,?,?,?,?)',
    username, name, 'hacker', security.hashPassword(b.password), db.now(), db.now());
  const id = Number(r.lastInsertRowid);
  db.run('INSERT INTO programs(name, description, version, guide, created_by, updated_at) VALUES(?,?,?,?,?,?)',
    'Verbale Studio', 'App per la redazione dei verbali.', '',
    '# Verbale Studio\n\nScrivi qui la guida all\'uso: installazione, primo avvio, funzioni principali.\n\nPoi carica il file del programma con **Carica file**.',
    id, db.now());
  const user = db.get('SELECT * FROM users WHERE id = ?', id);
  db.log({ user, ip: ctx.ip }, 'setup', 'Portale configurato, creato account Hacker');
  ctx.json(201, { user: publicUser(user) }, { 'Set-Cookie': security.sessionCookie(security.createSession(id)) });
});

route('POST', '/api/login', { public: true }, async (ctx) => {
  const b = await ctx.body();
  const username = String(b.username || '').trim().toLowerCase();
  const key = `${ctx.ip}|${username}`;
  if (security.loginBlocked(key)) throw new HttpError(429, 'Troppi tentativi. Riprova tra qualche minuto.');
  const user = db.get('SELECT * FROM users WHERE username = ?', username);
  const ok = user && user.active && typeof b.password === 'string' && security.verifyPassword(b.password, user.pass_hash);
  if (!ok) {
    security.loginFailed(key);
    db.log({ actor: username.slice(0, 32), ip: ctx.ip }, 'login.fallito', null);
    throw new HttpError(401, 'Nome utente o password non corretti.');
  }
  security.loginOk(key);
  db.run('UPDATE users SET last_login = ? WHERE id = ?', db.now(), user.id);
  db.log({ user, ip: ctx.ip }, 'login', null);
  ctx.json(200, { user: publicUser(user) }, { 'Set-Cookie': security.sessionCookie(security.createSession(user.id)) });
});

route('POST', '/api/logout', { allowMustChange: true }, (ctx) => {
  security.destroySession(ctx.user.token_hash);
  db.log(ctx, 'logout', null);
  ctx.json(200, { ok: true }, { 'Set-Cookie': security.clearCookie() });
});

route('PATCH', '/api/me', {}, async (ctx) => {
  const b = await ctx.body();
  const name = cleanText(b.name, 80, 'Nome');
  db.run('UPDATE users SET name = ? WHERE id = ?', name, ctx.user.id);
  db.log(ctx, 'profilo.modifica', null);
  ctx.json(200, { ok: true });
});

route('POST', '/api/me/password', { allowMustChange: true }, async (ctx) => {
  const b = await ctx.body();
  const row = db.get('SELECT pass_hash FROM users WHERE id = ?', ctx.user.id);
  if (typeof b.current !== 'string' || !security.verifyPassword(b.current, row.pass_hash)) {
    throw new HttpError(400, 'La password attuale non e\' corretta.');
  }
  const pwErr = security.checkPassword(b.next);
  if (pwErr) throw new HttpError(400, pwErr);
  if (b.next === b.current) throw new HttpError(400, 'La nuova password deve essere diversa da quella attuale.');
  db.run('UPDATE users SET pass_hash = ?, must_change = 0 WHERE id = ?', security.hashPassword(b.next), ctx.user.id);
  security.destroyUserSessions(ctx.user.id, ctx.user.token_hash);
  db.log(ctx, 'password.cambio', null);
  ctx.json(200, { ok: true });
});

module.exports = { publicUser, cleanText };
