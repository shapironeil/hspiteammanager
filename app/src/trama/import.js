'use strict';
// Importazione di un file Excel in una mappa di Trama.
//   - formato "BPB" (tabelle tblMacro, tblProcessi, tblBPB): riconosciuto da solo, ordine e codici come nel file;
//   - qualunque altro foglio: si sceglie quali colonne sono macro, processo e micro (mappatura assistita).
const db = require('../db');
const M = require('./model');
const { readXlsx, tableRows, sheetGrid } = require('./xlsx-read');

const FIELD_LABELS = {
  macroId: 'ID Macro', macro: 'Macro processo', processo: 'Processo', micro: 'Sotto processo (micro)',
  ambito: 'Ambito', dipartimenti: 'Dipartimenti', note: 'Note', responsabile: 'Responsabile', scadenza: 'Scadenza', stato: 'Stato',
};
// parole che fanno indovinare la colonna
const GUESS = {
  macroId: [/^id\s*macro/i], macro: [/^macro/i], processo: [/^processo$/i, /^processi$/i], micro: [/sotto\s*process/i, /^micro/i],
  ambito: [/ambito/i], dipartimenti: [/dipartiment/i], note: [/^note/i], responsabile: [/responsabil/i, /^owner/i], scadenza: [/scadenz/i, /deadline/i], stato: [/^stato/i, /^status/i],
};

function toIsoDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return null;
}
const cleanStatus = (v) => { const s = M.norm(v).toLowerCase(); return M.STATUSES.includes(s) ? s : ''; };

function analyze(buf) {
  const book = readXlsx(buf);
  const find = (name) => { for (const s of book.sheets) for (const t of s.tables) if (t.name.toLowerCase() === name.toLowerCase()) return { s, t }; return null; };
  const tm = find('tblMacro');
  const tp = find('tblProcessi');
  const tb = find('tblBPB');
  if (tm && tp && tb) {
    return {
      book, format: 'bpb',
      summary: { macros: tableRows(book, tm.s, tm.t).length, processes: tableRows(book, tp.s, tp.t).length, micros: tableRows(book, tb.s, tb.t).length },
      parts: { tm, tp, tb },
    };
  }
  const sheets = book.sheets.filter((s) => s.maxRow > 1).map((s) => {
    const g = sheetGrid(book, s);
    const guess = {};
    for (const [field, res] of Object.entries(GUESS)) {
      const i = g.headers.findIndex((h) => res.some((re) => re.test(h)));
      if (i >= 0 && !Object.values(guess).includes(i)) guess[field] = i;
    }
    return { name: s.name, headers: g.headers, rows: g.rows, guess };
  });
  if (!sheets.length) throw new Error('Il file non contiene dati.');
  return { book, format: 'generico', sheets };
}

// people: Map nome normalizzato -> id
function makeContext(mapId, userId, people) {
  const created = { macros: 0, processes: 0, micros: 0 };
  const warnings = [];
  const personId = (name) => (name ? people.get(M.key(name)) || null : null);
  const extra = (row) => {
    const f = {};
    if (row.ambito != null) f.ambito = M.norm(row.ambito);
    if (row.dipartimenti != null) f.dipartimenti = String(row.dipartimenti).trim();
    if (row.note != null) f.note = String(row.note);
    if (row.responsabile) { const id = personId(row.responsabile); if (id) f.responsibleId = id; else warnings.push(`Responsabile non trovato: ${row.responsabile}`); }
    if (row.scadenza != null) { const d = toIsoDate(row.scadenza); if (d) f.dueDate = d; }
    if (row.stato != null) f.status = cleanStatus(row.stato);
    return f;
  };
  return { created, warnings, extra, mapId, userId };
}

function inTransaction(fn) {
  db.db.exec('BEGIN');
  try { const r = fn(); db.db.exec('COMMIT'); return r; } catch (err) { db.db.exec('ROLLBACK'); throw err; }
}

function importBpb(analysis, mapId, userId, people) {
  const { book, parts } = analysis;
  const ctx = makeContext(mapId, userId, people);
  return inTransaction(() => {
    const macroIds = new Map(); // codice -> id nodo
    const procIds = new Map(); // "codice|nome" -> id nodo
    const ensureMacro = (code, name) => {
      if (macroIds.has(code)) return macroIds.get(code);
      const id = M.create(mapId, { level: 1, name: name || `Macro ${code}`, fields: { macroCode: Number.isInteger(Number(code)) ? Number(code) : null } }, userId, { log: false });
      macroIds.set(code, id);
      ctx.created.macros++;
      return id;
    };
    const ensureProcess = (code, name) => {
      const k = `${code}|${M.key(name)}`;
      if (procIds.has(k)) return procIds.get(k);
      const id = M.create(mapId, { level: 2, parentId: ensureMacro(code), name }, userId, { log: false });
      procIds.set(k, id);
      ctx.created.processes++;
      return id;
    };
    for (const m of tableRows(book, parts.tm.s, parts.tm.t)) if (m['ID Macro'] != null) ensureMacro(m['ID Macro'], M.norm(m['Macro processo']));
    for (const p of tableRows(book, parts.tp.s, parts.tp.t)) if (p['ID Macro'] != null && M.norm(p.Processo)) ensureProcess(p['ID Macro'], M.norm(p.Processo));
    for (const r of tableRows(book, parts.tb.s, parts.tb.t)) {
      const code = r['ID Macroprocesso'];
      const proc = M.norm(r.Processo);
      if (code == null || !proc) { ctx.warnings.push(`Riga saltata (manca ID Macro o Processo): ${M.norm(r['Sotto processi']) || '?'}`); continue; }
      if (!macroIds.has(code)) ctx.warnings.push(`Macro ${code} non in anagrafica: creato`);
      if (!procIds.has(`${code}|${M.key(proc)}`)) ctx.warnings.push(`Processo "${proc}" non in anagrafica: creato`);
      const parentId = ensureProcess(code, proc);
      M.create(mapId, { level: 3, parentId, name: M.norm(r['Sotto processi']), fields: ctx.extra({
        ambito: r['Ambito Analisi'], dipartimenti: r['Dipartimenti coinvolti'], note: r.Note, responsabile: r.Responsabile, scadenza: r.Scadenza, stato: r.Stato,
      }) }, userId, { log: false });
      ctx.created.micros++;
    }
    M.history(mapId, null, userId, 'importato', { format: 'BPB', ...ctx.created });
    return { ...ctx.created, warnings: [...new Set(ctx.warnings)].slice(0, 50) };
  });
}

// mapping: { campo: indice di colonna }
function importGeneric(sheet, mapping, mapId, userId, people) {
  if (mapping.micro == null && mapping.processo == null && mapping.macro == null) throw new Error('Scegli almeno la colonna del macro processo.');
  const ctx = makeContext(mapId, userId, people);
  const col = (row, f) => (mapping[f] == null || mapping[f] === '' ? null : row[Number(mapping[f])]);
  return inTransaction(() => {
    const macros = new Map();
    const procs = new Map();
    let lastMacro = null;
    let lastProc = null;
    for (const row of sheet.rows) {
      // celle vuote: si eredita il valore della riga sopra (righe "raggruppate" come spesso nei fogli)
      const macroName = M.norm(col(row, 'macro')) || (mapping.macro == null ? 'Generale' : lastMacro);
      const macroCode = col(row, 'macroId');
      if (!macroName) continue;
      lastMacro = macroName;
      const mk = macroCode != null && macroCode !== '' ? `#${macroCode}` : M.key(macroName);
      if (!macros.has(mk)) {
        macros.set(mk, M.create(mapId, { level: 1, name: macroName, fields: { macroCode: Number.isInteger(Number(macroCode)) && macroCode !== '' && macroCode != null ? Number(macroCode) : undefined } }, userId, { log: false }));
        ctx.created.macros++;
      }
      const mId = macros.get(mk);
      if (mapping.processo == null) continue;
      const procName = M.norm(col(row, 'processo')) || lastProc;
      if (!procName) continue;
      lastProc = procName;
      const pk = `${mId}|${M.key(procName)}`;
      if (!procs.has(pk)) { procs.set(pk, M.create(mapId, { level: 2, parentId: mId, name: procName }, userId, { log: false })); ctx.created.processes++; }
      if (mapping.micro == null) continue;
      const microName = M.norm(col(row, 'micro'));
      if (!microName) continue;
      M.create(mapId, { level: 3, parentId: procs.get(pk), name: microName, fields: ctx.extra({
        ambito: col(row, 'ambito'), dipartimenti: col(row, 'dipartimenti'), note: col(row, 'note'), responsabile: col(row, 'responsabile'), scadenza: col(row, 'scadenza'), stato: col(row, 'stato'),
      }) }, userId, { log: false });
      ctx.created.micros++;
    }
    M.history(mapId, null, userId, 'importato', { format: 'foglio', sheet: sheet.name, ...ctx.created });
    return { ...ctx.created, warnings: [...new Set(ctx.warnings)].slice(0, 50) };
  });
}

module.exports = { analyze, importBpb, importGeneric, toIsoDate, FIELD_LABELS };
