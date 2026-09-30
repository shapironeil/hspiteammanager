'use strict';
// File personali: carico, invio a un collega o a tutti, scarico.
const db = require('../db');
const storage = require('../storage');
const { route, HttpError } = require('../http');

const SELECT = `
  SELECT f.id, f.name, f.size, f.owner_id, f.to_user, f.to_all, f.created_at,
         o.name AS owner_name, t.name AS to_name
  FROM files f JOIN users o ON o.id = f.owner_id LEFT JOIN users t ON t.id = f.to_user`;

const view = (f) => ({
  id: f.id, name: f.name, size: f.size, createdAt: f.created_at,
  ownerId: f.owner_id, ownerName: f.owner_name,
  sentTo: f.to_all ? 'Tutti' : (f.to_name || null),
});

function canRead(user, f) {
  return f.owner_id === user.id || f.to_user === user.id || !!f.to_all || user.role === 'hacker';
}

route('GET', '/api/files', {}, (ctx) => {
  const id = ctx.user.id;
  ctx.json(200, {
    mine: db.all(`${SELECT} WHERE f.owner_id = ? ORDER BY f.created_at DESC`, id).map(view),
    received: db.all(`${SELECT} WHERE f.owner_id != ? AND (f.to_user = ? OR f.to_all = 1) ORDER BY f.created_at DESC`, id, id).map(view),
  });
});

// Il corpo della richiesta e' il file stesso; nome e destinatario sono nella query.
route('PUT', '/api/files', {}, async (ctx) => {
  const name = storage.cleanName(ctx.query.get('name'));
  const to = ctx.query.get('to') || '';
  let toUser = null;
  let toAll = 0;
  if (to === 'all') toAll = 1;
  else if (to) {
    const target = db.get('SELECT id FROM users WHERE id = ? AND active = 1', Number(to));
    if (!target) throw new HttpError(400, 'Destinatario non valido.');
    toUser = target.id;
  }
  const saved = await storage.saveUpload(ctx.req, 'files');
  db.run('INSERT INTO files(id, name, size, owner_id, to_user, to_all, created_at) VALUES(?,?,?,?,?,?,?)',
    saved.id, name, saved.size, ctx.user.id, toUser, toAll, db.now());
  db.log(ctx, toAll || toUser ? 'file.inviato' : 'file.caricato', name);
  ctx.json(201, { id: saved.id });
});

route('GET', '/api/files/:id/download', {}, (ctx) => {
  const f = db.get('SELECT * FROM files WHERE id = ?', ctx.params.id);
  if (!f || !canRead(ctx.user, f)) throw new HttpError(404, 'File non trovato.');
  db.log(ctx, 'file.scaricato', f.name);
  storage.sendDownload(ctx.res, 'files', f.id, f.name);
});

route('DELETE', '/api/files/:id', {}, (ctx) => {
  const f = db.get('SELECT * FROM files WHERE id = ?', ctx.params.id);
  if (!f || !canRead(ctx.user, f)) throw new HttpError(404, 'File non trovato.');
  if (f.owner_id !== ctx.user.id && ctx.user.role !== 'hacker') throw new HttpError(403, 'Solo chi ha caricato il file puo\' eliminarlo.');
  db.run('DELETE FROM files WHERE id = ?', f.id);
  storage.remove('files', f.id);
  db.log(ctx, 'file.eliminato', f.name);
  ctx.json(200, { ok: true });
});
