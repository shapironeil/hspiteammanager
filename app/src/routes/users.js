'use strict';
// Gestione account. Manager: elenco in sola lettura. Hacker: crea, modifica, disabilita.
const config = require('../config');
const db = require('../db');
const security = require('../security');
const { route, HttpError } = require('../http');
const { cleanText } = require('./auth');

const activeHackers = () => db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'hacker' AND active = 1").n;

function findUser(id) {
  const user = db.get('SELECT * FROM users WHERE id = ?', Number(id));
  if (!user) throw new HttpError(404, 'Account non trovato.');
  return user;
}

// Elenco minimo per scegliere a chi inviare un file (tutti i ruoli).
route('GET', '/api/recipients', {}, (ctx) => {
  ctx.json(200, db.all('SELECT id, name, username FROM users WHERE active = 1 AND id != ? ORDER BY name', ctx.user.id));
});

route('GET', '/api/users', { role: 'manager' }, (ctx) => {
  const rows = db.all('SELECT id, username, name, role, active, must_change, created_at, last_login FROM users ORDER BY active DESC, name');
  ctx.json(200, rows.map((u) => ({
    id: u.id, username: u.username, name: u.name, role: u.role, active: !!u.active,
    mustChange: !!u.must_change, createdAt: u.created_at, lastLogin: u.last_login,
  })));
});

route('POST', '/api/users', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const username = String(b.username || '').trim().toLowerCase();
  if (!security.USERNAME_RE.test(username)) throw new HttpError(400, 'Nome utente: 3-32 caratteri tra lettere minuscole, numeri, punto, trattino.');
  if (db.get('SELECT 1 AS x FROM users WHERE username = ?', username)) throw new HttpError(409, 'Nome utente gia\' in uso.');
  const name = cleanText(b.name, 80, 'Nome');
  if (!config.ROLES.includes(b.role)) throw new HttpError(400, 'Ruolo non valido.');
  const pwErr = security.checkPassword(b.password);
  if (pwErr) throw new HttpError(400, pwErr);
  const r = db.run('INSERT INTO users(username, name, role, pass_hash, must_change, created_at) VALUES(?,?,?,?,1,?)',
    username, name, b.role, security.hashPassword(b.password), db.now());
  db.log(ctx, 'account.creato', `${username} (${b.role})`);
  ctx.json(201, { id: Number(r.lastInsertRowid) });
});

route('PATCH', '/api/users/:id', { role: 'hacker' }, async (ctx) => {
  const target = findUser(ctx.params.id);
  const b = await ctx.body();
  const name = b.name !== undefined ? cleanText(b.name, 80, 'Nome') : target.name;
  const role = b.role !== undefined ? b.role : target.role;
  const active = b.active !== undefined ? (b.active ? 1 : 0) : target.active;
  if (!config.ROLES.includes(role)) throw new HttpError(400, 'Ruolo non valido.');
  const losesHacker = target.role === 'hacker' && target.active && (role !== 'hacker' || !active);
  if (losesHacker && activeHackers() <= 1) throw new HttpError(400, 'Deve restare almeno un account Hacker attivo.');
  db.run('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?', name, role, active, target.id);
  if (!active) security.destroyUserSessions(target.id);
  db.log(ctx, 'account.modificato', `${target.username}: ruolo ${role}, ${active ? 'attivo' : 'disabilitato'}`);
  ctx.json(200, { ok: true });
});

route('POST', '/api/users/:id/reset-password', { role: 'hacker' }, async (ctx) => {
  const target = findUser(ctx.params.id);
  const b = await ctx.body();
  const pwErr = security.checkPassword(b.password);
  if (pwErr) throw new HttpError(400, pwErr);
  const self = target.id === ctx.user.id;
  db.run('UPDATE users SET pass_hash = ?, must_change = ? WHERE id = ?', security.hashPassword(b.password), self ? 0 : 1, target.id);
  security.destroyUserSessions(target.id, self ? ctx.user.token_hash : null);
  db.log(ctx, 'account.password-reimpostata', target.username);
  ctx.json(200, { ok: true });
});
