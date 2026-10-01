'use strict';
// Gradi (gestiti solo dall'Hacker) e statistiche del team (ognuno vede chi sta sotto di lui).
const config = require('../config');
const db = require('../db');
const media = require('../media');
const grades = require('../grades');
const { route, HttpError } = require('../http');
const { cleanText } = require('./auth');

const COLOR = /^#[0-9a-f]{6}$/i;
const cleanLevel = (v) => { if (!Object.hasOwn(grades.LEVELS, v)) throw new HttpError(400, 'Livello non valido.'); return v; };
const cleanColor = (v) => { if (!COLOR.test(String(v || ''))) throw new HttpError(400, 'Colore non valido.'); return v; };

// Chi ha un grado prende i permessi dal suo livello (l'Hacker resta Hacker).
const syncRoles = (gradeId, level) => db.run("UPDATE users SET role = ? WHERE grade_id = ? AND role != 'hacker'", level, gradeId);

route('GET', '/api/grades', { role: 'hacker' }, (ctx) => {
  const people = db.all(`SELECT id, name, username, avatar, role, grade_id, badge, active, pending FROM users WHERE deleted_at IS NULL ORDER BY name`);
  ctx.json(200, {
    levels: grades.LEVELS,
    grades: grades.all().map((g) => ({ ...g, people: people.filter((u) => u.grade_id === g.id).length })),
    people: people.map((u) => ({ id: u.id, name: u.name, username: u.username, avatar: media.avatarUrl(u.avatar), gradeId: u.grade_id, isHacker: u.role === 'hacker', badge: u.badge, active: !!u.active, pending: !!u.pending })),
  });
});

route('POST', '/api/grades', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const name = cleanText(b.name, 40, 'Nome del grado');
  if (db.get('SELECT 1 AS x FROM grades WHERE lower(name) = lower(?)', name)) throw new HttpError(409, 'Esiste già un grado con questo nome.');
  const top = db.get('SELECT MAX(position) AS p FROM grades').p || 0;
  const r = db.run('INSERT INTO grades(name, color, level, position, created_at) VALUES(?,?,?,?,?)', name, cleanColor(b.color || '#a89a8c'), cleanLevel(b.level || 'dipendente'), top + 10, db.now());
  db.log(ctx, 'grado.creato', name);
  ctx.json(201, { id: Number(r.lastInsertRowid) });
});

route('PATCH', '/api/grades/:id', { role: 'hacker' }, async (ctx) => {
  const g = grades.byId(ctx.params.id);
  if (!g) throw new HttpError(404, 'Grado non trovato.');
  const b = await ctx.body();
  const name = b.name !== undefined ? cleanText(b.name, 40, 'Nome del grado') : g.name;
  if (name.toLowerCase() !== g.name.toLowerCase() && db.get('SELECT 1 AS x FROM grades WHERE lower(name) = lower(?)', name)) throw new HttpError(409, 'Esiste già un grado con questo nome.');
  const color = b.color !== undefined ? cleanColor(b.color) : g.color;
  const level = b.level !== undefined ? cleanLevel(b.level) : g.level;
  db.run('UPDATE grades SET name = ?, color = ?, level = ? WHERE id = ?', name, color, level, g.id);
  if (level !== g.level) syncRoles(g.id, level);
  db.log(ctx, 'grado.modificato', `${g.name} -> ${name}, ${level}`);
  ctx.json(200, { ok: true });
});

// Nuovo ordine della gerarchia: ids dal piu' basso al piu' alto.
route('POST', '/api/grades/order', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number);
  const known = grades.all().map((g) => g.id);
  if (ids.length !== known.length || !known.every((id) => ids.includes(id))) throw new HttpError(400, 'Ordine non valido: servono tutti i gradi.');
  ids.forEach((id, i) => db.run('UPDATE grades SET position = ? WHERE id = ?', (i + 1) * 10, id));
  db.log(ctx, 'grado.ordine', ids.join(','));
  ctx.json(200, { ok: true });
});

// Elimina un grado: le persone che lo avevano passano al grado indicato.
route('DELETE', '/api/grades/:id', { role: 'hacker' }, (ctx) => {
  const g = grades.byId(ctx.params.id);
  if (!g) throw new HttpError(404, 'Grado non trovato.');
  if (grades.all().length <= 1) throw new HttpError(400, 'Deve restare almeno un grado.');
  const people = db.get('SELECT COUNT(*) AS n FROM users WHERE grade_id = ?', g.id).n;
  const to = ctx.query.get('spostaIn') ? grades.byId(ctx.query.get('spostaIn')) : null;
  if (people && (!to || to.id === g.id)) throw new HttpError(400, `${people} persone hanno questo grado: scegli in quale grado spostarle.`);
  if (to) {
    db.run('UPDATE users SET grade_id = ? WHERE grade_id = ?', to.id, g.id);
    syncRoles(to.id, to.level);
  }
  db.run('DELETE FROM grades WHERE id = ?', g.id);
  db.log(ctx, 'grado.eliminato', `${g.name}${to ? ` (persone spostate in ${to.name})` : ''}`);
  ctx.json(200, { ok: true });
});

// ---- Statistiche del team: chi sta sotto di me ----------------------------------------
route('GET', '/api/team/stats', {}, (ctx) => {
  const me = ctx.user;
  const myRank = grades.rankOf(me);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = db.all('SELECT id, name, username, avatar, role, grade_id, badge, last_login, active FROM users WHERE deleted_at IS NULL AND pending = 0 AND id != ? ORDER BY name', me.id)
    // l'Hacker e' nascosto: non compare nelle statistiche degli altri
    .filter((u) => (me.role === 'hacker' || u.role !== 'hacker') && grades.rankOf(u) < myRank);
  const count = (userId, pattern) => db.get('SELECT COUNT(*) AS n FROM logs WHERE user_id = ? AND ts >= ? AND action LIKE ?', userId, since, pattern).n;
  const now = db.now();
  ctx.json(200, {
    people: rows.map((u) => ({
      id: u.id, name: u.name, username: u.username, avatar: media.avatarUrl(u.avatar), active: !!u.active, lastLogin: u.last_login,
      ...grades.card(u, me),
      logins30: count(u.id, 'login'),
      files30: count(u.id, 'esplora.file-%') + count(u.id, 'file.caricato') + count(u.id, 'file.inviato'),
      verbali30: count(u.id, 'verbale.%'),
      guestNow: db.all(`SELECT p.name AS project, m.expires_at AS expiresAt FROM project_members m JOIN projects p ON p.id = m.project_id
        WHERE m.user_id = ? AND m.expires_at IS NOT NULL AND m.expires_at > ?`, u.id, now),
      guestTotal: db.get('SELECT COUNT(*) AS n FROM project_access_log WHERE user_id = ?', u.id).n,
    })),
    accessLog: db.all(`SELECT a.id, a.user_id AS userId, p.name AS project, u.name AS person, b.name AS addedBy, a.days, a.note, a.starts_at AS startsAt, a.expires_at AS expiresAt, a.ended_at AS endedAt
      FROM project_access_log a JOIN projects p ON p.id = a.project_id JOIN users u ON u.id = a.user_id LEFT JOIN users b ON b.id = a.added_by
      ORDER BY a.id DESC LIMIT 200`).filter((a) => rows.some((r) => r.id === a.userId)),
  });
});

// ---- Percorso (vista riservata all'Hacker) --------------------------------------------
// Note libere per ogni grado (nome della lega, tempi indicativi): salvate nelle impostazioni.
route('GET', '/api/percorso', { role: 'hacker' }, (ctx) => {
  let notes = {};
  try { notes = JSON.parse(db.getSetting('percorso') || '{}'); } catch { /* vuoto */ }
  const people = db.all('SELECT id, name, avatar, grade_id, badge FROM users WHERE deleted_at IS NULL AND active = 1 ORDER BY name');
  ctx.json(200, {
    notes,
    grades: grades.all().map((g) => ({ ...g, people: people.filter((u) => u.grade_id === g.id).map((u) => ({ id: u.id, name: u.name, avatar: media.avatarUrl(u.avatar), badge: u.badge })) })),
  });
});
route('PUT', '/api/percorso', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const out = {};
  for (const [id, v] of Object.entries(b.notes || {})) {
    if (!grades.byId(id)) continue;
    out[id] = { league: String(v.league || '').slice(0, 40), time: String(v.time || '').slice(0, 60) };
  }
  db.setSetting('percorso', JSON.stringify(out));
  ctx.json(200, { ok: true });
});

module.exports = {};
