'use strict';
// Gestione account. Manager: elenco in sola lettura. Hacker: crea, modifica, disabilita.
const config = require('../config');
const db = require('../db');
const security = require('../security');
const { route, HttpError } = require('../http');
const media = require('../media');
const { cleanText, identity, randomAvatar } = require('./auth');
const grades = require('../grades');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const activeHackers = () => db.get("SELECT COUNT(*) AS n FROM users WHERE role = 'hacker' AND active = 1 AND deleted_at IS NULL").n;

// Grado scelto: deve esistere. Il livello del grado decide i permessi (l'Hacker resta Hacker).
function gradeFrom(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback || grades.defaultGrade();
  const g = grades.byId(value);
  if (!g) throw new HttpError(400, 'Grado non valido.');
  return g;
}
const cleanBadge = (v) => (v == null || v === '' ? null : /^#[0-9a-f]{6}$/i.test(v) ? v : (() => { throw new HttpError(400, 'Colore del badge non valido.'); })());

// Qualifica facoltativa: stringa vuota = nessuna.
function cleanTitle(value) {
  if (value == null || value === '') return null;
  if (!Object.hasOwn(config.TITLES, value)) throw new HttpError(400, 'Qualifica non valida.');
  return value;
}

function findUser(id) {
  const user = db.get('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', Number(id));
  if (!user) throw new HttpError(404, 'Account non trovato.');
  return user;
}

// Elenco minimo per scegliere a chi inviare un file (tutti i ruoli).
route('GET', '/api/recipients', {}, (ctx) => {
  ctx.json(200, db.all('SELECT id, name, username, avatar FROM users WHERE active = 1 AND id != ? ORDER BY name', ctx.user.id)
    .map((u) => ({ ...u, avatar: media.avatarUrl(u.avatar) })));
});

route('GET', '/api/users', { role: 'manager' }, (ctx) => {
  const rows = db.all('SELECT id, username, name, role, title, active, pending, must_change, avatar, created_at, last_login, grade_id, badge FROM users WHERE deleted_at IS NULL ORDER BY pending DESC, active DESC, name');
  ctx.json(200, rows.map((u) => ({
    id: u.id, username: u.username, name: u.name, role: grades.visibleRole(u, ctx.user), title: u.title || null, active: !!u.active, pending: !!u.pending,
    avatar: media.avatarUrl(u.avatar), ...grades.card(u, ctx.user),
    mustChange: !!u.must_change, createdAt: u.created_at, lastLogin: u.last_login,
  })));
});

function createUser(ctx, b) {
  const { name, username } = identity(b);
  const g = gradeFrom(b.gradeId);
  // compatibilita': si puo' ancora indicare il ruolo; "hacker" e' una qualita' a parte
  if (b.role !== undefined && !config.ROLES.includes(b.role)) throw new HttpError(400, 'Ruolo non valido.');
  const role = b.hacker === true || b.role === 'hacker' ? 'hacker' : b.role === 'manager' && b.gradeId == null ? 'manager' : g.level;
  const pwErr = security.checkPassword(b.password);
  if (pwErr) throw new HttpError(400, pwErr);
  const r = db.run('INSERT INTO users(username, name, role, title, pass_hash, must_change, avatar, created_at, grade_id, badge) VALUES(?,?,?,?,?,1,?,?,?,?)',
    username, name, role, cleanTitle(b.title), security.hashPassword(b.password), randomAvatar(), db.now(), g.id, role === 'hacker' ? '#2dd4bf' : null);
  db.log(ctx, 'account.creato', `${username} (${g.name})`);
  return { id: Number(r.lastInsertRowid), username, name, grade: g.name };
}

route('POST', '/api/users', { role: 'hacker' }, async (ctx) => {
  const u = createUser(ctx, await ctx.body());
  ctx.json(201, { id: u.id, username: u.username });
});

// Team in blocco: una persona per riga, "Nome Cognome; Grado". Password provvisorie generate e mostrate una volta.
route('POST', '/api/users/bulk', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const lines = String(b.text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new HttpError(400, 'Scrivi almeno una persona.');
  if (lines.length > 100) throw new HttpError(400, 'Massimo 100 persone alla volta.');
  const byName = new Map(grades.all().map((g) => [g.name.toLowerCase(), g]));
  const created = [];
  const errors = [];
  for (const line of lines) {
    const [who, gradeName] = line.split(/[;\t]/).map((x) => (x || '').trim());
    const parts = who.split(/\s+/);
    try {
      if (parts.length < 2) throw new Error('servono nome e cognome');
      const g = gradeName ? byName.get(gradeName.toLowerCase()) : grades.defaultGrade();
      if (!g) throw new Error(`grado "${gradeName}" non trovato`);
      // prima parola = nome, il resto = cognome (es. "Alessia D'Ippoliti", "Sara Della Vecchia")
      const password = `Hspi-${crypto.randomBytes(4).toString('hex')}`;
      created.push({ ...createUser(ctx, { firstName: parts[0], lastName: parts.slice(1).join(' '), gradeId: g.id, password }), password });
    } catch (err) { errors.push(`${line}: ${err.message}`); }
  }
  ctx.json(201, { created, errors });
});

// "Elimina persona": non cancella i suoi dati. L'account sparisce dal portale (non puo' piu' entrare,
// non compare negli elenchi, il nome utente torna libero); file e cartella personale restano, visibili all'Hacker.
route('DELETE', '/api/users/:id', { role: 'hacker' }, (ctx) => {
  const target = findUser(ctx.params.id);
  if (target.id === ctx.user.id) throw new HttpError(400, 'Non puoi eliminare te stesso.');
  if (target.role === 'hacker' && activeHackers() <= 1) throw new HttpError(400, 'Deve restare almeno un account Hacker attivo.');
  db.run('UPDATE users SET active = 0, deleted_at = ?, username = ? WHERE id = ?', db.now(), `eliminato-${target.id}-${target.username}`.slice(0, 64), target.id);
  db.run('DELETE FROM project_members WHERE user_id = ?', target.id);
  db.run('UPDATE project_access_log SET ended_at = ? WHERE user_id = ? AND ended_at IS NULL', db.now(), target.id);
  security.destroyUserSessions(target.id);
  // la cartella personale viene rinominata, non cancellata
  const personal = path.join(config.PERSONAL_DIR, String(target.id));
  if (fs.existsSync(personal)) {
    try { fs.renameSync(personal, path.join(config.PERSONAL_DIR, `eliminato-${target.id}-${target.username}`)); } catch { /* resta dov'e' */ }
  }
  db.log(ctx, 'account.eliminato', `${target.username} (${target.name}): dati conservati`);
  ctx.json(200, { ok: true });
});

route('PATCH', '/api/users/:id', { role: 'hacker' }, async (ctx) => {
  const target = findUser(ctx.params.id);
  const b = await ctx.body();
  const name = b.name !== undefined ? cleanText(b.name, 80, 'Nome') : target.name;
  const g = b.gradeId !== undefined ? gradeFrom(b.gradeId) : grades.of(target);
  // Hacker: qualita' nascosta. Gli altri prendono i permessi dal livello del grado.
  const hacker = b.hacker !== undefined ? b.hacker === true : b.role !== undefined ? b.role === 'hacker' : target.role === 'hacker';
  const role = hacker ? 'hacker' : b.gradeId === undefined && b.role !== undefined ? b.role : g.level;
  const badge = b.badge !== undefined ? cleanBadge(b.badge) : target.badge;
  const active = b.active !== undefined ? (b.active ? 1 : 0) : target.active;
  if (!config.ROLES.includes(role)) throw new HttpError(400, 'Ruolo non valido.');
  const losesHacker = target.role === 'hacker' && target.active && (role !== 'hacker' || !active);
  if (losesHacker && activeHackers() <= 1) throw new HttpError(400, 'Deve restare almeno un account Hacker attivo.');
  // Attivare un account in attesa equivale ad approvarlo.
  const pending = active ? 0 : target.pending;
  const title = b.title !== undefined ? cleanTitle(b.title) : target.title;
  // Se la persona perde la qualifica che sbloccava il suo avatar, torna a un avatar libero.
  const avatar = target.avatar && media.avatarAllowed({ role, title }, target.avatar) ? target.avatar : randomAvatar();
  db.run('UPDATE users SET name = ?, role = ?, title = ?, active = ?, pending = ?, avatar = ?, grade_id = ?, badge = ? WHERE id = ?', name, role, title, active, pending, avatar, g.id, badge, target.id);
  if (!active) security.destroyUserSessions(target.id);
  db.log(ctx, target.pending && active ? 'account.approvato' : 'account.modificato', `${target.username}: ${g.name}${hacker ? ' (+H)' : ''}, ${active ? 'attivo' : 'disabilitato'}`);
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
