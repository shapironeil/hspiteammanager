'use strict';
// Esplora file: rotte per lo spazio personale ("me") e le cartelle dei progetti ("p<id>").
//
// Permessi:
//  - "me": solo la persona stessa (cartella data/personale/<id>);
//  - "p<id>": chi vede il progetto (membri e Hacker) legge e lavora sui file, come gia' succedeva
//    nella scheda del progetto. Nulla si cancella: "Elimina" va nel cestino dello spazio.
// Nell'indice del database lo spazio personale si chiama "u<id>", cosi' resta univoco.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const db = require('../db');
const ex = require('../explorer');
const { route, HttpError } = require('../http');
const projects = require('./projects');

function personalRoot(userId) {
  const dir = path.join(config.PERSONAL_DIR, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Restituisce { key, root, label, project } oppure "non trovato" se la persona non puo' vederlo.
function openSpace(user, id) {
  if (id === 'me') return { id: 'me', key: `u${user.id}`, root: personalRoot(user.id), label: 'I miei file', project: null };
  const m = /^p(\d+)$/.exec(id || '');
  const p = m && db.get('SELECT * FROM projects WHERE id = ?', Number(m[1]));
  if (!p || !projects.canSee(user, p)) throw new HttpError(404, 'Spazio non trovato.');
  const root = path.join(projects.baseDir(), p.folder);
  fs.mkdirSync(root, { recursive: true });
  return { id: `p${p.id}`, key: `p${p.id}`, root, label: p.name, project: p };
}

// Spazi visibili alla persona (per la colonna di sinistra, la ricerca e le modifiche recenti).
function visibleSpaces(user) {
  projects.sync();
  const list = [{ id: 'me', key: `u${user.id}`, label: 'I miei file', kind: 'personale' }];
  for (const p of db.all("SELECT * FROM projects ORDER BY status = 'chiuso', name")) {
    if (projects.canSee(user, p)) list.push({ id: `p${p.id}`, key: `p${p.id}`, label: p.name, kind: 'progetto', status: p.status });
  }
  return list;
}

const where = (s, rel) => `${s.label}: /${rel || ''}`;

route('GET', '/api/explorer/spaces', {}, (ctx) => {
  ctx.json(200, { spaces: visibleSpaces(ctx.user).map(({ key, ...s }) => s) });
});

route('GET', '/api/explorer/:space/list', {}, (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  ctx.json(200, { space: s.id, label: s.label, ...ex.list(s.key, s.root, ctx.query.get('path')) });
});

route('POST', '/api/explorer/:space/folder', {}, async (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  const b = await ctx.body();
  const rel = ex.mkdir(s.key, s.root, b.path, b.name, ctx.user.id);
  db.log(ctx, 'esplora.cartella-creata', where(s, rel));
  ctx.json(201, { path: rel });
});

// Il corpo della richiesta e' il file; cartella e nome nella query. overwrite=1 sostituisce (la versione attuale va nello storico).
route('PUT', '/api/explorer/:space/file', {}, async (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  const r = await ex.upload(s.key, s.root, ctx.req, ctx.query.get('path'), ctx.query.get('name'), ctx.query.get('overwrite') === '1', ctx.user.id);
  db.log(ctx, r.replaced ? 'esplora.file-sostituito' : 'esplora.file-caricato', where(s, r.path));
  ctx.json(201, r);
});

route('POST', '/api/explorer/:space/rename', {}, async (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  const b = await ctx.body();
  const rel = ex.rename(s.key, s.root, b.path, b.name, ctx.user.id);
  db.log(ctx, 'esplora.rinominato', `${where(s, b.path)} -> ${rel}`);
  ctx.json(200, { path: rel });
});

route('POST', '/api/explorer/:space/move', {}, async (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  const b = await ctx.body();
  const rel = ex.move(s.key, s.root, b.path, b.to, ctx.user.id);
  db.log(ctx, 'esplora.spostato', `${where(s, b.path)} -> ${rel}`);
  ctx.json(200, { path: rel });
});

route('POST', '/api/explorer/:space/trash', {}, async (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  const b = await ctx.body();
  const id = ex.trash(s.key, s.root, b.path, ctx.user);
  db.log(ctx, 'esplora.nel-cestino', where(s, b.path));
  ctx.json(200, { id });
});

route('GET', '/api/explorer/:space/trash', {}, (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  ctx.json(200, { items: ex.listTrash(s.root) });
});

route('POST', '/api/explorer/:space/trash/restore', {}, async (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  const b = await ctx.body();
  const rel = ex.restore(s.key, s.root, String(b.id || ''), ctx.user.id);
  db.log(ctx, 'esplora.ripristinato', where(s, rel));
  ctx.json(200, { path: rel });
});

route('GET', '/api/explorer/:space/versions', {}, (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  ctx.json(200, { versions: ex.versions(s.root, ctx.query.get('path')) });
});

route('POST', '/api/explorer/:space/versions/restore', {}, async (ctx) => {
  const s = openSpace(ctx.user, ctx.params.space);
  const b = await ctx.body();
  ex.restoreVersion(s.key, s.root, b.path, String(b.id || ''), ctx.user.id);
  db.log(ctx, 'esplora.versione-ripristinata', `${where(s, b.path)} (${b.id})`);
  ctx.json(200, { ok: true });
});

function sendFile(ctx, inline) {
  const s = openSpace(ctx.user, ctx.params.space);
  const at = ex.resolve(s.root, ctx.query.get('path'));
  const vid = ctx.query.get('version');
  let file = at.full;
  if (vid) {
    const name = at.parts[at.parts.length - 1];
    if (!vid.endsWith(`__${name}`) || /[\\/]|\.\./.test(vid)) throw new HttpError(400, 'Versione non valida.');
    file = path.join(s.root, ex.HISTORY, ...at.parts.slice(0, -1), vid);
  }
  // I video si aprono a pezzi (Range): si registra solo la prima richiesta.
  if (!ctx.req.headers.range || /bytes=0-/.test(ctx.req.headers.range)) db.log(ctx, inline ? 'esplora.file-aperto' : 'esplora.file-scaricato', where(s, at.rel));
  ex.send(ctx.req, ctx.res, file, path.basename(at.full), { inline });
}
route('GET', '/api/explorer/:space/download', {}, (ctx) => sendFile(ctx, false));
route('GET', '/api/explorer/:space/view', {}, (ctx) => sendFile(ctx, true));

// Ricerca per nome in tutti gli spazi visibili (dall'indice del database).
route('GET', '/api/explorer/search', {}, (ctx) => {
  const q = String(ctx.query.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return ctx.json(200, { results: [] });
  const spaces = visibleSpaces(ctx.user);
  const byKey = new Map(spaces.map((s) => [s.key, s]));
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
  const rows = db.all(
    `SELECT space, path, name, is_dir, size, updated_at FROM fs_index
     WHERE space IN (${spaces.map(() => '?').join(',')}) AND name LIKE ? ESCAPE '\\'
     ORDER BY is_dir DESC, updated_at DESC LIMIT 100`, ...spaces.map((s) => s.key), like);
  ctx.json(200, {
    results: rows.map((r) => ({
      space: byKey.get(r.space).id, spaceLabel: byKey.get(r.space).label, path: r.path, name: r.name,
      isDir: !!r.is_dir, size: r.size, modifiedAt: r.updated_at, type: r.is_dir ? null : ex.viewType(r.name),
    })),
  });
});

// Ultimi file modificati negli spazi visibili, con chi li ha toccati.
route('GET', '/api/explorer/recent', {}, (ctx) => {
  const spaces = visibleSpaces(ctx.user);
  const byKey = new Map(spaces.map((s) => [s.key, s]));
  const rows = db.all(
    `SELECT f.space, f.path, f.name, f.size, f.updated_at, u.name AS by_name FROM fs_index f LEFT JOIN users u ON u.id = f.updated_by
     WHERE f.space IN (${spaces.map(() => '?').join(',')}) AND f.is_dir = 0
     ORDER BY f.updated_at DESC LIMIT 30`, ...spaces.map((s) => s.key));
  ctx.json(200, {
    results: rows.map((r) => ({
      space: byKey.get(r.space).id, spaceLabel: byKey.get(r.space).label, path: r.path, name: r.name,
      size: r.size, modifiedAt: r.updated_at, by: r.by_name, type: ex.viewType(r.name),
    })),
  });
});

// Allinea l'indice con il disco (file messi o tolti da fuori dal portale). Chiamato all'avvio e ogni ora.
function reindexAll() {
  let total = 0;
  try {
    projects.sync();
    for (const p of db.all('SELECT id, folder FROM projects')) total += ex.reindex(`p${p.id}`, path.join(projects.baseDir(), p.folder));
    for (const u of db.all('SELECT id FROM users')) total += ex.reindex(`u${u.id}`, path.join(config.PERSONAL_DIR, String(u.id)));
  } catch (err) {
    try { db.issue('server', 'Indice dei file: ' + err.message, err.stack, null); } catch { /* niente */ }
  }
  return total;
}

module.exports = { openSpace, visibleSpaces, reindexAll };
