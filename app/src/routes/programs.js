'use strict';
// Catalogo programmi: tutti vedono e scaricano, manager e hacker pubblicano.
const db = require('../db');
const storage = require('../storage');
const apps = require('../apps');
const { route, HttpError } = require('../http');
const { cleanText } = require('./auth');

function findProgram(id) {
  const p = db.get('SELECT * FROM programs WHERE id = ?', Number(id));
  if (!p) throw new HttpError(404, 'Programma non trovato.');
  return p;
}
const view = (p) => ({
  id: p.id, name: p.name, description: p.description, version: p.version, guide: p.guide,
  hasFile: !!p.file_id, fileName: p.file_name, fileSize: p.file_size, updatedAt: p.updated_at,
  folder: p.folder || null,
  // Web app in apptools: si apre dal portale a questo indirizzo.
  openUrl: p.folder && apps.entryOf(p.folder) ? `/apps/${p.id}/` : null,
});
const optional = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

route('GET', '/api/programs', {}, (ctx) => {
  apps.sync();
  const editor = ctx.user.role !== 'dipendente';
  // Le schede ancora vuote (niente da aprire o scaricare) le vede solo chi le gestisce.
  ctx.json(200, db.all('SELECT * FROM programs ORDER BY name').map(view).filter((p) => editor || p.openUrl || p.hasFile));
});

route('POST', '/api/programs', { role: 'manager' }, async (ctx) => {
  const b = await ctx.body();
  const name = cleanText(b.name, 80, 'Nome');
  const r = db.run('INSERT INTO programs(name, description, version, guide, created_by, updated_at) VALUES(?,?,?,?,?,?)',
    name, optional(b.description, 300), optional(b.version, 30), optional(b.guide, 50000), ctx.user.id, db.now());
  db.log(ctx, 'programma.creato', name);
  ctx.json(201, { id: Number(r.lastInsertRowid) });
});

route('PATCH', '/api/programs/:id', { role: 'manager' }, async (ctx) => {
  const p = findProgram(ctx.params.id);
  const b = await ctx.body();
  const name = cleanText(b.name, 80, 'Nome');
  db.run('UPDATE programs SET name = ?, description = ?, version = ?, guide = ?, updated_at = ? WHERE id = ?',
    name, optional(b.description, 300), optional(b.version, 30), optional(b.guide, 50000), db.now(), p.id);
  db.log(ctx, 'programma.modificato', name);
  ctx.json(200, { ok: true });
});

route('DELETE', '/api/programs/:id', { role: 'manager' }, (ctx) => {
  const p = findProgram(ctx.params.id);
  db.run('DELETE FROM programs WHERE id = ?', p.id);
  storage.remove('programs', p.file_id);
  db.log(ctx, 'programma.eliminato', p.name);
  ctx.json(200, { ok: true });
});

route('PUT', '/api/programs/:id/file', { role: 'manager' }, async (ctx) => {
  const p = findProgram(ctx.params.id);
  const name = storage.cleanName(ctx.query.get('name'));
  const saved = await storage.saveUpload(ctx.req, 'programs');
  db.run('UPDATE programs SET file_id = ?, file_name = ?, file_size = ?, updated_at = ? WHERE id = ?', saved.id, name, saved.size, db.now(), p.id);
  storage.remove('programs', p.file_id);
  db.log(ctx, 'programma.file-caricato', `${p.name}: ${name}`);
  ctx.json(200, { ok: true });
});

route('GET', '/api/programs/:id/download', {}, (ctx) => {
  const p = findProgram(ctx.params.id);
  if (!p.file_id) throw new HttpError(404, 'Questo programma non ha ancora un file.');
  db.log(ctx, 'programma.scaricato', p.name);
  storage.sendDownload(ctx.res, 'programs', p.file_id, p.file_name);
});
