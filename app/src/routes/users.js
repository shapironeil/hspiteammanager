'use strict';
// Gestione account. Manager: elenco in sola lettura. Hacker: crea, modifica, disabilita.
const config = require('../config');
const db = require('../db');
const security = require('../security');
const { route, HttpError } = require('../http');
const media = require('../media');
const { cleanText, identity, randomAvatar } = require('./auth');

const activeHackers = () => db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'hacker' AND active = 1").n;

// Qualifica facoltativa: stringa vuota = nessuna.
function cleanTitle(value) {
  if (value == null || value === '') return null;
  if (!Object.hasOwn(config.TITLES, value)) throw new HttpError(400, 'Qualifica non valida.');
  return value;
}

function findUser(id) {
  const user = db.get('SELECT * FROM users WHERE id = ?', Number(id));
  if (!user) throw new HttpError(404, 'Account non trovato.');
  return user;
}

// Elenco minimo per scegliere a chi inviare un file (tutti i ruoli).
route('GET', '/api/recipients', {}, (ctx) => {
  ctx.json(200, db.all('SELECT id, name, username, avatar FROM users WHERE active = 1 AND id != ? ORDER BY name', ctx.user.id)
    .map((u) => ({ ...u, avatar: media.avatarUrl(u.avatar) })));
});

route('GET', '/api/users', { role: 'manager' }, (ctx) => {
  const rows = db.all('SELECT id, username, name, role, title, active, pending, must_change, avatar, created_at, last_login FROM users ORDER BY pending DESC, active DESC, name');
  ctx.json(200, rows.map((u) => ({
    id: u.id, username: u.username, name: u.name, role: u.role, title: u.title || null, active: !!u.active, pending: !!u.pending,
    avatar: media.avatarUrl(u.avatar),
    mustChange: !!u.must_change, createdAt: u.created_at, lastLogin: u.last_login,
  })));
});

route('POST', '/api/users', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const { name, username } = identity(b);
  if (!config.ROLES.includes(b.role)) throw new HttpError(400, 'Ruolo non valido.');
  const pwErr = security.checkPassword(b.password);
  if (pwErr) throw new HttpError(400, pwErr);
  const r = db.run('INSERT INTO users(username, name, role, title, pass_hash, must_change, avatar, created_at) VALUES(?,?,?,?,?,1,?,?)',
    username, name, b.role, cleanTitle(b.title), security.hashPassword(b.password), randomAvatar(), db.now());
  db.log(ctx, 'account.creato', `${username} (${b.role})`);
  ctx.json(201, { id: Number(r.lastInsertRowid), username });
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
  // Attivare un account in attesa equivale ad approvarlo.
  const pending = active ? 0 : target.pending;
  const title = b.title !== undefined ? cleanTitle(b.title) : target.title;
  // Se la persona perde la qualifica che sbloccava il suo avatar, torna a un avatar libero.
  const avatar = target.avatar && media.avatarAllowed({ role, title }, target.avatar) ? target.avatar : randomAvatar();
  db.run('UPDATE users SET name = ?, role = ?, title = ?, active = ?, pending = ?, avatar = ? WHERE id = ?', name, role, title, active, pending, avatar, target.id);
  if (!active) security.destroyUserSessions(target.id);
  db.log(ctx, target.pending && active ? 'account.approvato' : 'account.modificato', `${target.username}: ruolo ${role}, ${active ? 'attivo' : 'disabilitato'}`);
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
