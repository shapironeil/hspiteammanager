'use strict';
// Trama: mappe di processi a tre livelli, come nel file BPB.
//   livello 1 = macro processo (codice N, scritto a mano come "ID Macro")
//   livello 2 = processo       (codice N.N: ordine dentro il macro)
//   livello 3 = micro processo (codice N.N.N: ordine dentro il processo)
// I codici si calcolano dall'ordine, esattamente come le formule del file Excel.
// Ogni nodo ha anche un identificativo interno stabile: lo storico ritrova una voce anche se il suo codice cambia.
const db = require('../db');
const { HttpError } = require('../http');

const LEVEL_NAME = { 1: 'macro processo', 2: 'processo', 3: 'micro processo' };
const STATUSES = ['', 'da fare', 'in corso', 'fatto', 'bloccato'];
const AMBITI = ['In scope', 'In scope - Da attenzionare', 'Out of scope', 'Già analizzati da HSPI'];
// come TRIM di Excel: niente spazi all'inizio, alla fine e doppi
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const key = (s) => norm(s).toLowerCase();

// ---- Lettura e codici -------------------------------------------------------------
function nodesOf(mapId, { withDeleted = false } = {}) {
  return db.all(`SELECT * FROM trama_nodes WHERE map_id = ? ${withDeleted ? '' : 'AND deleted_at IS NULL'} ORDER BY level, position, id`, mapId);
}

// Albero con codici e controlli. people: Map id -> nome (per i responsabili)
function tree(mapId, people = new Map()) {
  const nodes = nodesOf(mapId);
  const byParent = new Map();
  for (const n of nodes) {
    const k = n.parent_id || 0;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(n);
  }
  const kids = (id) => (byParent.get(id) || []).sort((a, b) => a.position - b.position || a.id - b.id);
  const today = new Date().toISOString().slice(0, 10);
  const view = (n, code) => ({
    id: n.id, level: n.level, parentId: n.parent_id, code, name: n.name, macroCode: n.macro_code,
    ambito: n.ambito, dipartimenti: n.dipartimenti, note: n.note, responsibleId: n.responsible_id, responsible: n.responsible_id ? people.get(n.responsible_id) || null : null,
    dueDate: n.due_date, status: n.status, protected: !!n.protected, updatedAt: n.updated_at,
    overdue: !!(n.due_date && n.due_date < today && n.status !== 'fatto'), checks: [],
  });
  const macros = kids(0).filter((n) => n.level === 1).map((m) => {
    const mv = view(m, m.macro_code == null ? '?' : String(m.macro_code));
    mv.children = kids(m.id).filter((n) => n.level === 2).map((p, i) => {
      const pv = view(p, `${mv.code}.${i + 1}`);
      pv.children = kids(p.id).filter((n) => n.level === 3).map((u, j) => ({ ...view(u, `${pv.code}.${j + 1}`), children: [] }));
      return pv;
    });
    return mv;
  });
  // ---- controlli (gli stessi del file Excel, dove hanno senso in un albero)
  const codeCount = new Map();
  for (const m of macros) codeCount.set(m.macroCode, (codeCount.get(m.macroCode) || 0) + 1);
  for (const m of macros) {
    if (m.macroCode == null) m.checks.push('Inserire ID Macro');
    else if (codeCount.get(m.macroCode) > 1) m.checks.push('ID macro duplicato');
    if (!norm(m.name)) m.checks.push('Nome mancante');
    if (!m.children.length) m.checks.push('Nessun processo');
    else if (!m.children.some((p) => p.children.length)) m.checks.push('Nessun micro processo');
    const seen = new Map();
    for (const p of m.children) seen.set(key(p.name), (seen.get(key(p.name)) || 0) + 1);
    for (const p of m.children) {
      if (!norm(p.name)) p.checks.push('Nome del processo mancante');
      else if (seen.get(key(p.name)) > 1) p.checks.push('Processo duplicato');
      if (!p.children.length) p.checks.push('Nessun micro processo');
      const seenU = new Map();
      for (const u of p.children) seenU.set(key(u.name), (seenU.get(key(u.name)) || 0) + 1);
      for (const u of p.children) {
        if (!norm(u.name)) u.checks.push('Sotto processo mancante');
        else if (seenU.get(key(u.name)) > 1) u.checks.push('Sotto processo duplicato');
      }
    }
  }
  return macros;
}

function flatten(macros) {
  const out = [];
  const walk = (list) => { for (const n of list) { out.push(n); walk(n.children || []); } };
  walk(macros);
  return out;
}

// ---- Storico ----------------------------------------------------------------------
function history(mapId, nodeId, userId, action, detail) {
  db.run('INSERT INTO trama_history(map_id, node_id, user_id, action, detail, at) VALUES(?,?,?,?,?,?)', mapId, nodeId || null, userId || null, action, detail ? JSON.stringify(detail) : null, db.now());
  db.run('UPDATE trama_maps SET updated_at = ? WHERE id = ?', db.now(), mapId);
}
const codeOf = (mapId, nodeId) => { const n = flatten(tree(mapId)).find((x) => x.id === nodeId); return n ? n.code : null; };

// ---- Modifiche ---------------------------------------------------------------------
function getNode(id) {
  const n = db.get('SELECT * FROM trama_nodes WHERE id = ? AND deleted_at IS NULL', Number(id));
  if (!n) throw new HttpError(404, 'Voce non trovata.');
  return n;
}
const siblings = (mapId, parentId) => db.all('SELECT id, position FROM trama_nodes WHERE map_id = ? AND parent_id IS ? AND deleted_at IS NULL ORDER BY position, id', mapId, parentId || null);
function renumber(mapId, parentId, order) {
  (order || siblings(mapId, parentId).map((s) => s.id)).forEach((id, i) => db.run('UPDATE trama_nodes SET position = ? WHERE id = ?', (i + 1) * 10, id));
}
function nextMacroCode(mapId) {
  return (db.get('SELECT MAX(macro_code) AS m FROM trama_nodes WHERE map_id = ? AND level = 1 AND deleted_at IS NULL', mapId).m || 0) + 1;
}

function checkParent(mapId, level, parentId) {
  if (level === 1) { if (parentId) throw new HttpError(400, 'Un macro processo non ha un livello sopra.'); return null; }
  const parent = getNode(parentId);
  if (parent.map_id !== mapId || parent.level !== level - 1) throw new HttpError(400, `Un ${LEVEL_NAME[level]} va dentro un ${LEVEL_NAME[level - 1]}.`);
  return parent;
}

const FIELDS = {
  name: (v) => norm(v).slice(0, 300),
  ambito: (v) => norm(v).slice(0, 80),
  dipartimenti: (v) => String(v || '').trim().slice(0, 1000),
  note: (v) => String(v || '').slice(0, 5000),
  responsible_id: (v) => (v == null || v === '' ? null : Number(v)),
  due_date: (v) => { if (v == null || v === '') return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, 'Scadenza non valida.'); return v; },
  status: (v) => { const s = norm(v).toLowerCase(); if (!STATUSES.includes(s)) throw new HttpError(400, 'Stato non valido.'); return s; },
  protected: (v) => (v ? 1 : 0),
  macro_code: (v) => { if (v == null || v === '') return null; const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 9999) throw new HttpError(400, 'ID Macro: un numero intero.'); return n; },
};
const API_TO_DB = { name: 'name', ambito: 'ambito', dipartimenti: 'dipartimenti', note: 'note', responsibleId: 'responsible_id', dueDate: 'due_date', status: 'status', protected: 'protected', macroCode: 'macro_code' };

function create(mapId, { level, parentId, name, afterId, fields = {} }, userId, { log = true } = {}) {
  level = Number(level);
  if (![1, 2, 3].includes(level)) throw new HttpError(400, 'Livello non valido.');
  checkParent(mapId, level, parentId);
  const now = db.now();
  const values = { name: FIELDS.name(name || '') };
  for (const [k, v] of Object.entries(fields)) if (API_TO_DB[k]) values[API_TO_DB[k]] = FIELDS[API_TO_DB[k]](v);
  if (level === 1 && values.macro_code == null) values.macro_code = nextMacroCode(mapId);
  const sibs = siblings(mapId, parentId);
  const r = db.run(
    `INSERT INTO trama_nodes(map_id, parent_id, level, position, name, macro_code, ambito, dipartimenti, note, responsible_id, due_date, status, protected, created_by, created_at, updated_by, updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    mapId, parentId || null, level, (sibs.length + 1) * 10, values.name, values.macro_code ?? null, values.ambito || '', values.dipartimenti || '', values.note || '',
    values.responsible_id ?? null, values.due_date ?? null, values.status || '', values.protected || 0, userId, now, userId, now);
  const id = Number(r.lastInsertRowid);
  if (afterId !== undefined && afterId !== null) {
    const order = sibs.map((s) => s.id);
    const at = afterId === 0 ? 0 : order.indexOf(Number(afterId)) + 1;
    order.splice(at < 0 ? order.length : at, 0, id);
    renumber(mapId, parentId, order);
  }
  if (log) history(mapId, id, userId, 'creato', { level, name: values.name, code: codeOf(mapId, id) });
  return id;
}

function update(node, body, userId) {
  const changes = {};
  for (const [k, v] of Object.entries(body)) {
    const col = API_TO_DB[k];
    if (!col) continue;
    if (col === 'macro_code' && node.level !== 1) continue;
    const val = FIELDS[col](v);
    if (val !== node[col]) changes[col] = val;
  }
  if (!Object.keys(changes).length) return {};
  const set = Object.keys(changes).map((c) => `${c} = ?`).join(', ');
  db.run(`UPDATE trama_nodes SET ${set}, updated_by = ?, updated_at = ? WHERE id = ?`, ...Object.values(changes), userId, db.now(), node.id);
  const before = Object.fromEntries(Object.keys(changes).map((c) => [c, node[c]]));
  history(node.map_id, node.id, userId, 'modificato', { code: codeOf(node.map_id, node.id), before, after: changes });
  return changes;
}

// Sposta un nodo (anche sotto un altro "genitore" dello stesso livello) in una posizione.
function move(node, { parentId, index }, userId) {
  const newParent = node.level === 1 ? null : Number(parentId || node.parent_id);
  checkParent(node.map_id, node.level, newParent);
  const before = codeOf(node.map_id, node.id);
  const order = siblings(node.map_id, newParent).map((s) => s.id).filter((id) => id !== node.id);
  const at = Math.max(0, Math.min(order.length, Number.isInteger(Number(index)) ? Number(index) : order.length));
  order.splice(at, 0, node.id);
  db.run('UPDATE trama_nodes SET parent_id = ?, updated_by = ?, updated_at = ? WHERE id = ?', newParent, userId, db.now(), node.id);
  renumber(node.map_id, newParent, order);
  if (newParent !== node.parent_id) renumber(node.map_id, node.parent_id);
  const after = codeOf(node.map_id, node.id);
  history(node.map_id, node.id, userId, 'spostato', { before, after });
  return { before, after };
}

// ---- Eliminazione con dipendenze ---------------------------------------------------------
function descendants(node) {
  const out = [];
  const walk = (id) => { for (const c of db.all('SELECT * FROM trama_nodes WHERE parent_id = ? AND deleted_at IS NULL', id)) { out.push(c); walk(c.id); } };
  walk(node.id);
  return out;
}

// Che cosa coinvolge l'eliminazione (per la finestra di conferma)
function impact(node, user, people = new Map()) {
  const all = [node, ...descendants(node)];
  const ids = all.map((n) => n.id);
  const others = new Set(all.filter((n) => n.responsible_id && n.responsible_id !== user.id).map((n) => n.responsible_id));
  return {
    code: codeOf(node.map_id, node.id), name: node.name, level: node.level,
    processes: all.filter((n) => n.level === 2 && n.id !== node.id).length,
    micros: all.filter((n) => n.level === 3 && n.id !== node.id).length,
    comments: ids.length ? db.get(`SELECT COUNT(*) AS n FROM trama_comments WHERE node_id IN (${ids.map(() => '?').join(',')})`, ...ids).n : 0,
    withDue: all.filter((n) => n.due_date && n.status !== 'fatto').length,
    protected: all.filter((n) => n.protected).length,
    otherResponsibles: [...others].map((id) => people.get(id) || `utente ${id}`),
  };
}

// Serve l'ok di un responsabile se: voce protetta, o con voci di cui e' responsabile qualcun altro.
const needsApproval = (imp) => imp.protected > 0 || imp.otherResponsibles.length > 0;

function trash(node, userId, reason) {
  const batch = `${Date.now()}-${node.id}`;
  const now = db.now();
  const code = codeOf(node.map_id, node.id);
  const all = [node, ...descendants(node)];
  for (const n of all) db.run('UPDATE trama_nodes SET deleted_at = ?, deleted_batch = ? WHERE id = ?', now, batch, n.id);
  renumber(node.map_id, node.parent_id);
  history(node.map_id, node.id, userId, 'eliminato', { code, name: node.name, items: all.length, reason: reason || null });
  return { batch, items: all.length };
}

function restore(nodeId, userId) {
  const n = db.get('SELECT * FROM trama_nodes WHERE id = ? AND deleted_at IS NOT NULL', Number(nodeId));
  if (!n) throw new HttpError(404, 'Voce non trovata nel cestino.');
  if (n.parent_id && db.get('SELECT deleted_at FROM trama_nodes WHERE id = ?', n.parent_id).deleted_at) throw new HttpError(409, 'La voce sopra è anch\'essa nel cestino: ripristina prima quella.');
  const pos = (siblings(n.map_id, n.parent_id).length + 1) * 10;
  db.run('UPDATE trama_nodes SET deleted_at = NULL, deleted_batch = NULL, position = ? WHERE id = ?', pos, n.id);
  db.run('UPDATE trama_nodes SET deleted_at = NULL, deleted_batch = NULL WHERE deleted_batch = ?', n.deleted_batch);
  history(n.map_id, n.id, userId, 'ripristinato', { name: n.name, code: codeOf(n.map_id, n.id) });
  return n;
}

function trashList(mapId, people = new Map()) {
  return db.all(`SELECT n.*, h.user_id AS by_id FROM trama_nodes n
    LEFT JOIN trama_history h ON h.node_id = n.id AND h.action = 'eliminato' AND h.id = (SELECT MAX(id) FROM trama_history WHERE node_id = n.id AND action = 'eliminato')
    WHERE n.map_id = ? AND n.deleted_at IS NOT NULL AND n.deleted_batch LIKE '%-' || n.id ORDER BY n.deleted_at DESC`, mapId)
    .map((n) => ({ id: n.id, level: n.level, name: n.name, deletedAt: n.deleted_at, by: n.by_id ? people.get(n.by_id) || null : null,
      items: db.get('SELECT COUNT(*) AS c FROM trama_nodes WHERE deleted_batch = ?', n.deleted_batch).c }));
}

module.exports = {
  LEVEL_NAME, STATUSES, AMBITI, norm, key, tree, flatten, nodesOf, history, codeOf, getNode, create, update, move,
  impact, needsApproval, trash, restore, trashList, renumber, nextMacroCode,
};
