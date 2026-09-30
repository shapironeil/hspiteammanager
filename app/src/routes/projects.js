'use strict';
// Progetti: scheda, persone autorizzate, collegamento alla cartella aziendale e file locali.
//
// Regola dei permessi: un progetto lo vede solo chi ne e' membro (e l'Hacker).
// I file "veri" restano dove sono gia' protetti dall'azienda (OneDrive/SharePoint):
// il portale tiene il link alla cartella, non una copia. La cartella locale
// progetti/<nome> serve per il materiale di lavoro che nasce nel portale.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const db = require('../db');
const media = require('../media');
const storage = require('../storage');
const { route, HttpError } = require('../http');
const { cleanText } = require('./auth');

const STATUSES = { attivo: 'Attivo', 'in-pausa': 'In pausa', chiuso: 'Chiuso' };
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const optional = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function baseDir() {
  try {
    const hit = fs.readdirSync(config.ROOT, { withFileTypes: true }).find((e) => e.isDirectory() && ['progetti', 'projects'].includes(norm(e.name)));
    if (hit) return path.join(config.ROOT, hit.name);
  } catch { /* si crea sotto */ }
  const dir = path.join(config.ROOT, 'progetti');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Nome di cartella sicuro a partire dal nome del progetto.
function folderName(name) {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'progetto';
  let candidate = clean;
  for (let n = 2; fs.existsSync(path.join(baseDir(), candidate)); n++) candidate = `${clean}-${n}`;
  return candidate;
}

// Una cartella messa a mano in "progetti" diventa un progetto visibile solo all'Hacker,
// che poi decide chi puo' vederlo.
function sync() {
  let names = [];
  try { names = fs.readdirSync(baseDir(), { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name); } catch { return; }
  const known = db.all('SELECT folder FROM projects').map((r) => r.folder);
  for (const folder of names) {
    if (known.includes(folder)) continue;
    db.run('INSERT INTO projects(name, client, description, status, onedrive_url, folder, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?)',
      folder.replace(/[_-]+/g, ' '), '', '', 'attivo', '', folder, db.now(), db.now());
  }
}

const isMember = (user, id) => !!db.get('SELECT 1 AS x FROM project_members WHERE project_id = ? AND user_id = ?', id, user.id);
const canSee = (user, p) => user.role === 'hacker' || isMember(user, p.id);
const canEdit = (user, p) => user.role === 'hacker' || (user.role === 'manager' && isMember(user, p.id));

function find(ctx, needEdit) {
  const p = db.get('SELECT * FROM projects WHERE id = ?', Number(ctx.params.id));
  // Chi non puo' vederlo riceve "non trovato": non deve nemmeno sapere che esiste.
  if (!p || !canSee(ctx.user, p)) throw new HttpError(404, 'Progetto non trovato.');
  if (needEdit && !canEdit(ctx.user, p)) throw new HttpError(403, 'Non puoi modificare questo progetto.');
  return p;
}

function members(id) {
  return db.all(
    `SELECT u.id, u.name, u.username, u.avatar FROM project_members m JOIN users u ON u.id = m.user_id
     WHERE m.project_id = ? ORDER BY u.name`, id).map((u) => ({ ...u, avatar: media.avatarUrl(u.avatar) }));
}

const view = (user, p) => ({
  id: p.id, name: p.name, client: p.client, description: p.description, status: p.status,
  onedriveUrl: p.onedrive_url, folder: p.folder, updatedAt: p.updated_at,
  members: members(p.id), canEdit: canEdit(user, p),
});

function readFields(b) {
  const status = b.status || 'attivo';
  if (!Object.hasOwn(STATUSES, status)) throw new HttpError(400, 'Stato non valido.');
  const url = optional(b.onedriveUrl, 1000);
  if (url && !/^https:\/\/[^\s]+$/i.test(url)) throw new HttpError(400, 'Il link alla cartella deve iniziare con https://');
  return { name: cleanText(b.name, 80, 'Nome'), client: optional(b.client, 80), description: optional(b.description, 500), status, url };
}

function setMembers(projectId, ids, always) {
  const wanted = new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger));
  if (always) wanted.add(always);
  db.run('DELETE FROM project_members WHERE project_id = ?', projectId);
  for (const id of wanted) {
    if (db.get('SELECT 1 AS x FROM users WHERE id = ? AND active = 1', id)) db.run('INSERT INTO project_members(project_id, user_id) VALUES(?, ?)', projectId, id);
  }
}

route('GET', '/api/projects', {}, (ctx) => {
  sync();
  const rows = db.all('SELECT * FROM projects ORDER BY status = \'chiuso\', name');
  ctx.json(200, { statuses: STATUSES, canCreate: config.roleRank(ctx.user.role) >= config.roleRank('manager'), projects: rows.filter((p) => canSee(ctx.user, p)).map((p) => view(ctx.user, p)) });
});

route('POST', '/api/projects', { role: 'manager' }, async (ctx) => {
  const b = await ctx.body();
  const f = readFields(b);
  const folder = folderName(f.name);
  fs.mkdirSync(path.join(baseDir(), folder), { recursive: true });
  const r = db.run('INSERT INTO projects(name, client, description, status, onedrive_url, folder, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
    f.name, f.client, f.description, f.status, f.url, folder, ctx.user.id, db.now(), db.now());
  const id = Number(r.lastInsertRowid);
  // Chi crea il progetto ne fa parte (l'Hacker lo vede comunque).
  setMembers(id, b.members, ctx.user.role === 'hacker' ? null : ctx.user.id);
  db.log(ctx, 'progetto.creato', f.name);
  ctx.json(201, { id });
});

route('PATCH', '/api/projects/:id', {}, async (ctx) => {
  const p = find(ctx, true);
  const b = await ctx.body();
  const f = readFields(b);
  db.run('UPDATE projects SET name = ?, client = ?, description = ?, status = ?, onedrive_url = ?, updated_at = ? WHERE id = ?',
    f.name, f.client, f.description, f.status, f.url, db.now(), p.id);
  if (b.members !== undefined) setMembers(p.id, b.members, ctx.user.role === 'hacker' ? null : ctx.user.id);
  db.log(ctx, 'progetto.modificato', f.name);
  ctx.json(200, { ok: true });
});

// Toglie il progetto dal portale. La cartella con i file NON viene cancellata.
route('DELETE', '/api/projects/:id', { role: 'hacker' }, (ctx) => {
  const p = find(ctx, true);
  db.run('DELETE FROM project_members WHERE project_id = ?', p.id);
  db.run('DELETE FROM projects WHERE id = ?', p.id);
  db.log(ctx, 'progetto.rimosso', `${p.name} (cartella conservata: ${p.folder})`);
  ctx.json(200, { ok: true });
});

// ---- File locali del progetto -------------------------------------------------
// Risolve un percorso dentro la cartella del progetto e rifiuta tutto cio' che ne esce.
function inside(p, rel) {
  const root = path.join(baseDir(), p.folder);
  const clean = String(rel || '').replace(/\\/g, '/').split('/').filter(Boolean);
  if (clean.some((s) => s === '..' || s === '.' || s.includes('\0') || s.includes(':'))) throw new HttpError(400, 'Percorso non valido.');
  const full = path.join(root, ...clean);
  if (full !== root && !full.startsWith(root + path.sep)) throw new HttpError(400, 'Percorso non valido.');
  return { root, full, rel: clean.join('/') };
}

route('GET', '/api/projects/:id/files', {}, (ctx) => {
  const p = find(ctx);
  const at = inside(p, ctx.query.get('path'));
  fs.mkdirSync(at.root, { recursive: true });
  let entries;
  try { entries = fs.readdirSync(at.full, { withFileTypes: true }); } catch { throw new HttpError(404, 'Cartella non trovata.'); }
  const folders = [];
  const files = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith('.') || e.name.endsWith('.part')) continue;
    if (e.isDirectory()) folders.push(e.name);
    else if (e.isFile()) {
      const st = fs.statSync(path.join(at.full, e.name));
      files.push({ name: e.name, size: st.size, modifiedAt: st.mtime.toISOString() });
    }
  }
  ctx.json(200, { path: at.rel, folders, files });
});

route('GET', '/api/projects/:id/download', {}, (ctx) => {
  const p = find(ctx);
  const at = inside(p, ctx.query.get('path'));
  let stat;
  try { stat = fs.statSync(at.full); } catch { stat = null; }
  if (!stat || !stat.isFile()) throw new HttpError(404, 'File non trovato.');
  db.log(ctx, 'progetto.file-scaricato', `${p.name}: ${at.rel}`);
  storage.sendPath(ctx.res, at.full, path.basename(at.full));
});

route('PUT', '/api/projects/:id/files', {}, async (ctx) => {
  const p = find(ctx);
  const name = storage.cleanName(ctx.query.get('name'));
  const dir = inside(p, ctx.query.get('path'));
  fs.mkdirSync(dir.full, { recursive: true });
  const target = path.join(dir.full, name);
  if (fs.existsSync(target)) throw new HttpError(409, 'Esiste già un file con questo nome in questa cartella.');
  await storage.saveToPath(ctx.req, target);
  db.log(ctx, 'progetto.file-caricato', `${p.name}: ${dir.rel ? dir.rel + '/' : ''}${name}`);
  ctx.json(201, { ok: true });
});

module.exports = { baseDir };
