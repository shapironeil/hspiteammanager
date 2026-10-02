'use strict';
// GestioneCelle: mappe di processi (macro → processo → micro) per progetto.
// Vede e modifica una mappa chi vede il progetto. Crea/elimina mappe, ripristina dal cestino e decide le
// richieste di eliminazione chi gestisce il progetto (Manager membro o Hacker) o chi ha creato la mappa.
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('../db');
const ex = require('../explorer');
const M = require('../celle/model');
const IMP = require('../celle/import');
const { buildBpbWorkbook } = require('../celle/xlsx-write');
const { buildFromTemplate, isBpbTemplate } = require('../celle/xlsx-template');
const { route, HttpError } = require('../http');
const projects = require('./projects');

const people = () => new Map(db.all('SELECT id, name FROM users WHERE deleted_at IS NULL').map((u) => [u.id, u.name]));
const peopleByName = () => new Map(db.all('SELECT id, name FROM users WHERE deleted_at IS NULL').map((u) => [M.key(u.name), u.id]));

// ---- Il file di origine (modello) --------------------------------------------------------------------
// Il file Excel da cui e' nata la mappa resta con la mappa: l'esportazione riscrive i dati dentro quel file, cosi'
// colori, intestazioni, colonne e fogli sono quelli che il team conosce. Senza modello si usa il formato BPB interno.
const templateInfo = (mapId, ppl) => {
  const t = db.get('SELECT name, size, imported_by, imported_at FROM celle_map_templates WHERE map_id = ?', mapId);
  return t ? { name: t.name, size: t.size, importedAt: t.imported_at, by: (ppl || people()).get(t.imported_by) || null } : null;
};
function saveTemplate(mapId, buf, name, userId, { replace = false } = {}) {
  if (!replace && db.get('SELECT 1 AS x FROM celle_map_templates WHERE map_id = ?', mapId)) return false;
  db.run('INSERT INTO celle_map_templates(map_id, name, size, data, imported_by, imported_at) VALUES(?,?,?,?,?,?) ON CONFLICT(map_id) DO UPDATE SET name = excluded.name, size = excluded.size, data = excluded.data, imported_by = excluded.imported_by, imported_at = excluded.imported_at',
    mapId, name, buf.length, buf, userId, db.now());
  M.history(mapId, null, userId, 'file di origine conservato', { file: name });
  return true;
}

function openMap(user, id, { manage = false } = {}) {
  const map = db.get('SELECT * FROM celle_maps WHERE id = ? AND deleted_at IS NULL', Number(id));
  const p = map && db.get('SELECT * FROM projects WHERE id = ?', map.project_id);
  if (!map || !p || !projects.canSee(user, p)) throw new HttpError(404, 'Mappa non trovata.');
  // canApprove: Manager del progetto (o Hacker): protegge voci e decide le richieste di eliminazione.
  // canManage: in piu' chi ha creato la mappa: la rinomina, la elimina, ripristina dal cestino.
  const canApprove = projects.canEdit(user, p);
  const canManage = canApprove || map.created_by === user.id;
  if (manage === 'approve' && !canApprove) throw new HttpError(403, 'Serve un Manager del progetto.');
  if (manage && !canManage) throw new HttpError(403, 'Serve un Manager del progetto (o chi ha creato la mappa).');
  return { map, project: p, canManage, canApprove };
}
function nodeAndMap(user, nodeId, opts) {
  const n = M.getNode(nodeId);
  return { node: n, ...openMap(user, n.map_id, opts) };
}

function counts(mapId) {
  const r = db.all('SELECT level, COUNT(*) AS n FROM celle_nodes WHERE map_id = ? AND deleted_at IS NULL GROUP BY level', mapId);
  const c = { macros: 0, processes: 0, micros: 0 };
  for (const x of r) c[{ 1: 'macros', 2: 'processes', 3: 'micros' }[x.level]] = x.n;
  return c;
}

// ---- Mappe ---------------------------------------------------------------------------
route('GET', '/api/celle/maps', {}, (ctx) => {
  projects.sync();
  const visible = db.all('SELECT * FROM projects').filter((p) => projects.canSee(ctx.user, p));
  const ids = visible.map((p) => p.id);
  const maps = ids.length ? db.all(`SELECT m.*, u.name AS author FROM celle_maps m LEFT JOIN users u ON u.id = m.created_by
    WHERE m.deleted_at IS NULL AND m.project_id IN (${ids.map(() => '?').join(',')}) ORDER BY m.updated_at DESC`, ...ids) : [];
  ctx.json(200, {
    projects: visible.map((p) => ({ id: p.id, name: p.name, canManage: projects.canEdit(ctx.user, p) })),
    maps: maps.map((m) => ({ id: m.id, projectId: m.project_id, project: visible.find((p) => p.id === m.project_id).name, name: m.name, description: m.description,
      author: m.author, updatedAt: m.updated_at, ...counts(m.id),
      pendingRequests: db.get('SELECT COUNT(*) AS n FROM celle_delete_requests WHERE map_id = ? AND decided_at IS NULL', m.id).n })),
  });
});

route('POST', '/api/celle/maps', {}, async (ctx) => {
  const b = await ctx.body();
  const p = db.get('SELECT * FROM projects WHERE id = ?', Number(b.projectId));
  if (!p || !projects.canSee(ctx.user, p)) throw new HttpError(404, 'Progetto non trovato.');
  const name = M.norm(b.name).slice(0, 120);
  if (!name) throw new HttpError(400, 'Dai un nome alla mappa.');
  const now = db.now();
  const r = db.run('INSERT INTO celle_maps(project_id, name, description, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?)', p.id, name, String(b.description || '').slice(0, 500), ctx.user.id, now, now);
  const id = Number(r.lastInsertRowid);
  M.history(id, null, ctx.user.id, 'mappa creata', { name });
  db.log(ctx, 'celle.mappa-creata', `${p.name}: ${name}`);
  ctx.json(201, { id });
});

route('PATCH', '/api/celle/maps/:id', {}, async (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id, { manage: true });
  const b = await ctx.body();
  const name = b.name !== undefined ? M.norm(b.name).slice(0, 120) : map.name;
  if (!name) throw new HttpError(400, 'Dai un nome alla mappa.');
  db.run('UPDATE celle_maps SET name = ?, description = ?, updated_at = ? WHERE id = ?', name, b.description !== undefined ? String(b.description).slice(0, 500) : map.description, db.now(), map.id);
  ctx.json(200, { ok: true });
});

// La mappa va nel cestino (resta nel database, recuperabile dall'Hacker).
route('DELETE', '/api/celle/maps/:id', {}, (ctx) => {
  const { map, project } = openMap(ctx.user, ctx.params.id, { manage: true });
  db.run('UPDATE celle_maps SET deleted_at = ? WHERE id = ?', db.now(), map.id);
  M.history(map.id, null, ctx.user.id, 'mappa eliminata', { name: map.name });
  db.log(ctx, 'celle.mappa-eliminata', `${project.name}: ${map.name}`);
  ctx.json(200, { ok: true });
});

route('GET', '/api/celle/maps/:id', {}, (ctx) => {
  const { map, project, canManage, canApprove } = openMap(ctx.user, ctx.params.id);
  const ppl = people();
  const macros = M.tree(map.id, ppl);
  const flat = M.flatten(macros);
  const members = db.all(`SELECT u.id, u.name FROM project_members m JOIN users u ON u.id = m.user_id
    WHERE m.project_id = ? AND (m.expires_at IS NULL OR m.expires_at > ?) AND u.deleted_at IS NULL ORDER BY u.name`, project.id, db.now());
  ctx.json(200, {
    map: { id: map.id, name: map.name, description: map.description, projectId: project.id, project: project.name, updatedAt: map.updated_at },
    template: templateInfo(map.id, ppl),
    canManage, canApprove, macros, statuses: M.STATUSES,
    ambiti: [...new Set([...M.AMBITI, ...flat.map((n) => n.ambito).filter(Boolean)])],
    people: members,
    issues: flat.filter((n) => n.checks.length).map((n) => ({ id: n.id, code: n.code, name: n.name, level: n.level, checks: n.checks })),
    requests: db.all(`SELECT r.id, r.node_id AS nodeId, r.reason, r.created_at AS createdAt, u.name AS by FROM celle_delete_requests r LEFT JOIN users u ON u.id = r.requested_by
      WHERE r.map_id = ? AND r.decided_at IS NULL ORDER BY r.id`, map.id).map((r) => ({ ...r, code: (flat.find((n) => n.id === r.nodeId) || {}).code || '?', name: (flat.find((n) => n.id === r.nodeId) || {}).name || '(già eliminata)' })),
  });
});

// ---- Voci (macro, processi, micro) ----------------------------------------------------------
route('POST', '/api/celle/maps/:id/nodes', {}, async (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id);
  const b = await ctx.body();
  const id = M.create(map.id, { level: b.level, parentId: b.parentId, name: b.name, afterId: b.afterId, fields: b.fields || {} }, ctx.user.id);
  ctx.json(201, { id, code: M.codeOf(map.id, id) });
});

route('GET', '/api/celle/nodes/:id', {}, (ctx) => {
  const { node } = nodeAndMap(ctx.user, ctx.params.id);
  const ppl = people();
  ctx.json(200, {
    comments: db.all('SELECT c.id, c.text, c.created_at AS at, u.name AS by FROM celle_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.node_id = ? ORDER BY c.id', node.id),
    history: db.all('SELECT action, detail, at, user_id FROM celle_history WHERE node_id = ? ORDER BY id DESC LIMIT 50', node.id)
      .map((h) => ({ action: h.action, detail: h.detail ? JSON.parse(h.detail) : null, at: h.at, by: ppl.get(h.user_id) || null })),
    createdBy: ppl.get(node.created_by) || null, createdAt: node.created_at, updatedBy: ppl.get(node.updated_by) || null,
  });
});

route('PATCH', '/api/celle/nodes/:id', {}, async (ctx) => {
  const { node, map } = nodeAndMap(ctx.user, ctx.params.id);
  const b = await ctx.body();
  // proteggere o sproteggere una voce spetta a chi gestisce il progetto
  if (b.protected !== undefined && !!b.protected !== !!node.protected && !openMap(ctx.user, map.id).canApprove) throw new HttpError(403, 'Solo un Manager del progetto può proteggere o sproteggere una voce.');
  ctx.json(200, { changed: Object.keys(M.update(node, b, ctx.user.id)) });
});

route('POST', '/api/celle/nodes/:id/move', {}, async (ctx) => {
  const { node } = nodeAndMap(ctx.user, ctx.params.id);
  ctx.json(200, M.move(node, await ctx.body(), ctx.user.id));
});

route('POST', '/api/celle/nodes/:id/comments', {}, async (ctx) => {
  const { node } = nodeAndMap(ctx.user, ctx.params.id);
  const b = await ctx.body();
  const text = String(b.text || '').trim().slice(0, 4000);
  if (!text) throw new HttpError(400, 'Scrivi la nota.');
  db.run('INSERT INTO celle_comments(node_id, user_id, text, created_at) VALUES(?,?,?,?)', node.id, ctx.user.id, text, db.now());
  M.history(node.map_id, node.id, ctx.user.id, 'nota aggiunta', { text: text.slice(0, 120) });
  ctx.json(201, { ok: true });
});

// Eliminazione: 1) senza "conferma" restituisce cosa coinvolge; 2) con conferma elimina (va nel cestino),
// oppure, se la voce e' protetta o ha voci di altri responsabili e chi chiede non gestisce il progetto, crea una richiesta.
route('DELETE', '/api/celle/nodes/:id', {}, (ctx) => {
  const { node, canApprove } = nodeAndMap(ctx.user, ctx.params.id);
  const imp = M.impact(node, ctx.user, people());
  const approval = M.needsApproval(imp) && !canApprove;
  if (ctx.query.get('conferma') !== '1') return ctx.json(409, { needsConfirm: true, needsApproval: approval, impact: imp });
  if (approval) {
    if (db.get('SELECT 1 AS x FROM celle_delete_requests WHERE node_id = ? AND decided_at IS NULL', node.id)) throw new HttpError(409, 'C\'è già una richiesta di eliminazione per questa voce.');
    db.run('INSERT INTO celle_delete_requests(node_id, map_id, requested_by, reason, created_at) VALUES(?,?,?,?,?)', node.id, node.map_id, ctx.user.id, String(ctx.query.get('motivo') || '').slice(0, 300), db.now());
    M.history(node.map_id, node.id, ctx.user.id, 'eliminazione richiesta', { code: imp.code, reason: ctx.query.get('motivo') || null });
    return ctx.json(202, { requested: true });
  }
  const r = M.trash(node, ctx.user.id, ctx.query.get('motivo'));
  db.run("UPDATE celle_delete_requests SET decided_by = ?, decided_at = ?, decision = 'eliminata' WHERE node_id = ? AND decided_at IS NULL", ctx.user.id, db.now(), node.id);
  ctx.json(200, { deleted: r.items });
});

route('POST', '/api/celle/requests/:id', {}, async (ctx) => {
  const req = db.get('SELECT * FROM celle_delete_requests WHERE id = ? AND decided_at IS NULL', Number(ctx.params.id));
  if (!req) throw new HttpError(404, 'Richiesta non trovata.');
  openMap(ctx.user, req.map_id, { manage: 'approve' });
  const b = await ctx.body();
  if (b.approve) {
    const node = db.get('SELECT * FROM celle_nodes WHERE id = ? AND deleted_at IS NULL', req.node_id);
    if (node) M.trash(node, ctx.user.id, `richiesta approvata: ${req.reason || ''}`);
  } else M.history(req.map_id, req.node_id, ctx.user.id, 'eliminazione rifiutata', null);
  db.run('UPDATE celle_delete_requests SET decided_by = ?, decided_at = ?, decision = ? WHERE id = ?', ctx.user.id, db.now(), b.approve ? 'approvata' : 'rifiutata', req.id);
  ctx.json(200, { ok: true });
});

route('GET', '/api/celle/maps/:id/trash', {}, (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id);
  ctx.json(200, { items: M.trashList(map.id, people()) });
});
route('POST', '/api/celle/nodes/:id/restore', {}, (ctx) => {
  const n = db.get('SELECT map_id FROM celle_nodes WHERE id = ?', Number(ctx.params.id));
  if (!n) throw new HttpError(404, 'Voce non trovata.');
  openMap(ctx.user, n.map_id, { manage: true });
  M.restore(ctx.params.id, ctx.user.id);
  ctx.json(200, { ok: true });
});

route('GET', '/api/celle/maps/:id/history', {}, (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id);
  const ppl = people();
  ctx.json(200, db.all('SELECT node_id, action, detail, at, user_id FROM celle_history WHERE map_id = ? ORDER BY id DESC LIMIT 200', map.id)
    .map((h) => ({ nodeId: h.node_id, action: h.action, detail: h.detail ? JSON.parse(h.detail) : null, at: h.at, by: ppl.get(h.user_id) || null })));
});

// ---- Importazione ----------------------------------------------------------------------
// 1) si carica il file: il portale lo analizza e lo tiene in memoria 30 minuti; 2) si conferma (con la mappatura se serve).
const pending = new Map();
setInterval(() => { for (const [k, v] of pending) if (Date.now() - v.at > 1800000) pending.delete(k); }, 600000).unref();

function readBody(req, limit = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'File troppo grande (massimo 40 MB).')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

route('PUT', '/api/celle/import', {}, async (ctx) => {
  const buf = await readBody(ctx.req);
  let a;
  try { a = IMP.analyze(buf); } catch (err) { throw new HttpError(400, err.message || 'File non leggibile.'); }
  const token = crypto.randomBytes(12).toString('hex');
  pending.set(token, { at: Date.now(), userId: ctx.user.id, analysis: a, buf, name: String(ctx.query.get('name') || 'file.xlsx').slice(0, 200) });
  if (a.format === 'bpb') return ctx.json(200, { token, format: 'bpb', summary: a.summary });
  ctx.json(200, { token, format: 'generico', fields: IMP.FIELD_LABELS, sheets: a.sheets.map((s) => ({ name: s.name, headers: s.headers, rows: s.rows.length, sample: s.rows.slice(0, 8), guess: s.guess })) });
});

route('POST', '/api/celle/maps/:id/import', {}, async (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id);
  const b = await ctx.body();
  const p = pending.get(String(b.token || ''));
  if (!p || p.userId !== ctx.user.id) throw new HttpError(410, 'Il file caricato è scaduto: caricalo di nuovo.');
  if (db.get('SELECT 1 AS x FROM celle_nodes WHERE map_id = ? AND deleted_at IS NULL', map.id) && !b.append) throw new HttpError(409, 'La mappa non è vuota: importa in una mappa nuova (o conferma di aggiungere in coda).');
  let r;
  try {
    if (p.analysis.format === 'bpb') r = IMP.importBpb(p.analysis, map.id, ctx.user.id, peopleByName());
    else {
      const sheet = p.analysis.sheets.find((s) => s.name === b.sheet) || p.analysis.sheets[0];
      r = IMP.importGeneric(sheet, b.mapping || sheet.guess, map.id, ctx.user.id, peopleByName());
    }
  } catch (err) { throw err instanceof HttpError ? err : new HttpError(400, err.message); }
  pending.delete(String(b.token));
  // il file BPB importato diventa il modello della mappa (se non ne ha gia' uno): l'Excel esportato avra' il suo stesso aspetto
  const template = p.analysis.format === 'bpb' ? saveTemplate(map.id, p.buf, p.name, ctx.user.id) : false;
  db.log(ctx, 'celle.importazione', `${map.name}: ${r.macros} macro, ${r.processes} processi, ${r.micros} micro da ${p.name}`);
  ctx.json(200, { ...r, template });
});

// Il file di origine: si scarica com'era, si sostituisce con un altro file BPB (solo lo stile: i dati restano quelli della mappa),
// si toglie per tornare al formato BPB interno di GestioneCelle.
route('GET', '/api/celle/maps/:id/template', {}, (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id);
  const t = db.get('SELECT name, data FROM celle_map_templates WHERE map_id = ?', map.id);
  if (!t) throw new HttpError(404, 'Questa mappa non ha un file di origine.');
  const buf = Buffer.from(t.data);
  const name = t.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').trim() || 'origine.xlsx';
  ctx.res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Length': buf.length, 'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  ctx.res.end(buf);
});
route('PUT', '/api/celle/maps/:id/template', {}, async (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id, { manage: true });
  const buf = await readBody(ctx.req);
  if (!isBpbTemplate(buf)) throw new HttpError(400, 'Il file non è nel formato BPB (tabelle tblMacro, tblProcessi e tblBPB): non può fare da modello.');
  const name = String(ctx.query.get('name') || 'modello.xlsx').slice(0, 200);
  saveTemplate(map.id, buf, name, ctx.user.id, { replace: true });
  db.log(ctx, 'celle.modello', `${map.name}: file di origine ${name}`);
  ctx.json(200, { template: templateInfo(map.id) });
});
route('DELETE', '/api/celle/maps/:id/template', {}, (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id, { manage: true });
  const t = db.get('SELECT name FROM celle_map_templates WHERE map_id = ?', map.id);
  if (t) {
    db.run('DELETE FROM celle_map_templates WHERE map_id = ?', map.id);
    M.history(map.id, null, ctx.user.id, 'file di origine tolto', { file: t.name });
    db.log(ctx, 'celle.modello', `${map.name}: tolto il file di origine ${t.name}`);
  }
  ctx.json(200, { ok: true });
});

// ---- Esportazione Excel ------------------------------------------------------------------
// Con un file di origine: i dati della mappa vengono riscritti dentro quel file (stesso aspetto). Altrimenti: formato BPB interno.
function workbookFor(map) {
  const macros = M.tree(map.id, people());
  const data = {
    name: map.name,
    macros: macros.map((m) => ({
      code: m.macroCode, name: m.name, check: m.checks.join('; ') || 'OK',
      processes: m.children.map((p) => ({
        code: p.code, name: p.name, check: p.checks.join('; ') || 'OK',
        micros: p.children.map((u) => ({ code: u.code, name: u.name, ambito: u.ambito, dipartimenti: u.dipartimenti, note: u.note, responsabile: u.responsible, scadenza: u.dueDate, stato: u.status, check: u.checks.join('; ') || 'OK' })),
      })),
    })),
  };
  const t = db.get('SELECT name, data FROM celle_map_templates WHERE map_id = ?', map.id);
  if (t) {
    try {
      const buf = buildFromTemplate(Buffer.from(t.data), data);
      if (buf) return buf;
    } catch (err) {
      db.issue('server', `GestioneCelle: esportazione nel file di origine "${t.name}" non riuscita (mappa ${map.id}); usato il formato BPB interno`, err.stack);
    }
  }
  return buildBpbWorkbook(data);
}
const fileName = (map) => `${map.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim() || 'GestioneCelle'}.xlsx`;

route('GET', '/api/celle/maps/:id/export', {}, (ctx) => {
  const { map } = openMap(ctx.user, ctx.params.id);
  const buf = workbookFor(map);
  const name = fileName(map);
  ctx.res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Length': buf.length, 'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  ctx.res.end(buf);
});

// Salva il file nella cartella del progetto (GestioneCelle/<nome>.xlsx): la versione precedente resta nelle versioni del file.
route('POST', '/api/celle/maps/:id/export', {}, (ctx) => {
  const { map, project } = openMap(ctx.user, ctx.params.id);
  const root = path.join(projects.baseDir(), project.folder);
  const rel = `GestioneCelle/${fileName(map)}`;
  ex.writeBuffer(`p${project.id}`, root, rel, workbookFor(map), ctx.user.id, { keepHistory: true });
  M.history(map.id, null, ctx.user.id, 'esportato', { file: rel });
  ctx.json(200, { space: `p${project.id}`, path: rel });
});

// Scadenze personali (per la Home): voci di cui sono responsabile, scadute o entro 14 giorni.
route('GET', '/api/celle/mine', {}, (ctx) => {
  const limit = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const rows = db.all(`SELECT n.id, n.map_id, n.name, n.level, n.due_date, n.status, m.name AS map, m.project_id FROM celle_nodes n JOIN celle_maps m ON m.id = n.map_id
    WHERE n.responsible_id = ? AND n.deleted_at IS NULL AND m.deleted_at IS NULL AND n.due_date IS NOT NULL AND n.due_date <= ? AND n.status != 'fatto' ORDER BY n.due_date LIMIT 30`, ctx.user.id, limit);
  const out = [];
  for (const r of rows) {
    const p = db.get('SELECT * FROM projects WHERE id = ?', r.project_id);
    if (!p || !projects.canSee(ctx.user, p)) continue;
    out.push({ id: r.id, mapId: r.map_id, map: r.map, project: p.name, name: r.name, code: M.codeOf(r.map_id, r.id), dueDate: r.due_date, status: r.status });
  }
  ctx.json(200, out);
});

module.exports = {};
