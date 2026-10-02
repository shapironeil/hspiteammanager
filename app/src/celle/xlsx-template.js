'use strict';
// Esportazione "nel file di origine". La mappa viene riscritta dentro il file Excel da cui e' nata (il modello),
// cosi' il file scaricato ha lo stesso aspetto di quello che il team conosce: stessi colori, stesse intestazioni,
// stesse colonne (nessuna in piu', nessuna in meno), stesse larghezze, stessi fogli (anche quelli che GestioneCelle
// non usa), stesse formule, menu a tendina e formati condizionali.
// Si riscrivono soltanto le righe di dati delle tre tabelle tblMacro, tblProcessi e tblBPB; tutto il resto resta
// com'era, byte per byte. Se il modello non ha le tre tabelle, restituisce null e si usa il modello interno (xlsx-write.js).
const path = require('node:path');
const { readZip, writeZip } = require('./zip');
const { attr, decode, cellRef, rangeRef } = require('./xlsx-read');
const { excelDate } = require('./xlsx-write');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
const colName = (n) => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const low = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
// "2026-10-05" -> "05/10/2026" (quando la colonna del modello non ha un formato data)
const displayDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso)); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso); };

// ---- Che cosa va in ogni colonna, riconosciuta dal nome (gli stessi nomi dell'importazione) -----------------
// x = { m: macro, p: processo, u: micro, n: progressivo del processo }. Un oggetto { date } e' una scadenza.
const COLUMNS = {
  tblbpb: {
    'ambito analisi': (x) => x.u.ambito, 'dipartimenti coinvolti': (x) => x.u.dipartimenti, 'id macroprocesso': (x) => x.m.code,
    'macro processo': (x) => x.m.name, 'id processo': (x) => x.p.code, processo: (x) => x.p.name, 'id micro processi': (x) => x.u.code,
    'sotto processi': (x) => x.u.name, note: (x) => x.u.note, 'check automatico': (x) => x.u.check || 'OK',
    'chiave (tecnica)': (x) => `${x.m.code ?? ''}|${String(x.p.name).trim()}`,
    responsabile: (x) => x.u.responsabile, scadenza: (x) => ({ date: x.u.scadenza }), stato: (x) => x.u.stato,
  },
  tblmacro: {
    'id macro': (x) => x.m.code, 'macro processo': (x) => x.m.name, 'n. processi': (x) => x.m.processes.length,
    'n. micro processi': (x) => x.m.processes.reduce((n, p) => n + p.micros.length, 0), check: (x) => x.m.check || 'OK',
  },
  tblprocessi: {
    'id macro': (x) => x.m.code, 'macro processo': (x) => x.m.name, 'n. progressivo': (x) => x.n, 'id processo': (x) => x.p.code,
    processo: (x) => x.p.name, 'n. micro processi': (x) => x.p.micros.length, check: (x) => x.p.check || 'OK',
    'chiave (tecnica)': (x) => `${x.m.code ?? ''}|${String(x.p.name).trim()}`,
  },
};
function recordsOf(map) {
  const bpb = [];
  const procs = [];
  for (const m of map.macros) m.processes.forEach((p, i) => { procs.push({ m, p, n: i + 1 }); for (const u of p.micros) bpb.push({ m, p, u }); });
  return { tblbpb: bpb, tblmacro: map.macros.map((m) => ({ m })), tblprocessi: procs };
}

// ---- Lettura del modello ----------------------------------------------------------------------------
function unpack(buf) { const out = new Map(); for (const [name, read] of readZip(buf)) out.set(name, read()); return out; }
const text = (files, name) => (files.has(name) ? files.get(name).toString('utf8') : null);
// relazioni di una parte: Id -> percorso nello zip
function rels(files, part) {
  const xml = text(files, path.posix.join(path.posix.dirname(part), '_rels', `${path.posix.basename(part)}.rels`));
  const out = new Map();
  if (!xml) return out;
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const t = attr(m[0], 'Target') || '';
    out.set(attr(m[0], 'Id'), t.startsWith('/') ? t.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(part), t)));
  }
  return out;
}
function parseTable(xml) {
  const head = /<table\b[^>]*>/.exec(xml || '');
  if (!head) return null;
  const columns = [...xml.matchAll(/<tableColumn\b([^>]*?)(?:\/>|>([\s\S]*?)<\/tableColumn>)/g)].map((c) => {
    const f = /<calculatedColumnFormula\b([^>]*)>([\s\S]*?)<\/calculatedColumnFormula>/.exec(c[2] || '');
    return { name: attr(`<tableColumn ${c[1]}>`, 'name') || '', formula: f ? decode(f[2]) : null, array: !!(f && /\barray="1"/.test(f[1])) };
  });
  return { name: attr(head[0], 'displayName') || attr(head[0], 'name') || '', ref: attr(head[0], 'ref'), columns, totals: Number(attr(head[0], 'totalsRowCount') || 0) };
}
// per ogni stile di cella (indice in cellXfs): e' un formato data?
const DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
function dateStyles(files) {
  const xml = text(files, 'xl/styles.xml') || '';
  const custom = new Map();
  for (const m of xml.matchAll(/<numFmt\b[^>]*>/g)) custom.set(Number(attr(m[0], 'numFmtId')), attr(m[0], 'formatCode') || '');
  const isDate = (id) => DATE_IDS.has(id) || /[dmyhs]/i.test((custom.get(id) || '').replace(/"[^"]*"|\[[^\]]*\]|\\./g, ''));
  const xfs = (/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml) || [, ''])[1];
  return [...xfs.matchAll(/<xf\b[^>]*>/g)].map((m) => isDate(Number(attr(m[0], 'numFmtId') || 0)));
}
// righe del foglio: numero -> { attrs, cells: Map colonna -> xml della cella, raw: la riga com'era, dirty: e' stata toccata }
// Le righe non toccate si riscrivono com'erano (raw), byte per byte.
function parseSheetData(xml) {
  const match = /<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>|<sheetData\s*\/>/.exec(xml);
  const rows = new Map();
  if (match && match[1]) {
    for (const r of match[1].matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const n = Number(attr(`<row ${r[1]}>`, 'r'));
      if (!n) continue;
      const row = { attrs: r[1].replace(/\s(?:r|spans)="[^"]*"/g, '').trim(), cells: new Map(), raw: r[0], dirty: false };
      for (const c of (r[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = cellRef(attr(`<c ${c[1]}>`, 'r') || '');
        if (ref) row.cells.set(ref.col, c[0]);
      }
      rows.set(n, row);
    }
  }
  return { match, rows };
}
// attributi comuni alle righe di dati del modello (altezza fissa uguale per tutte, stile di riga): valgono per le righe nuove
function commonRowAttrs(rows, from, to) {
  const count = new Map();
  let n = 0;
  for (let r = from; r <= to; r++) {
    const row = rows.get(r);
    if (!row) continue;
    n++;
    const a = row.attrs.replace(/\s?(?:hidden|collapsed|outlineLevel)="[^"]*"/g, '').trim();
    count.set(a, (count.get(a) || 0) + 1);
  }
  const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= n * 0.8 ? best[0] : '';
}
const mode = (list) => { const c = new Map(); for (const x of list) if (x != null) c.set(x, (c.get(x) || 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0])[0] ?? null; };

// ---- Scrittura ----------------------------------------------------------------------------------
function cellXml(ref, value, s) {
  const st = s == null ? '' : ` s="${s}"`;
  if (value === null || value === undefined || value === '') return `<c r="${ref}"${st}/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${st}><v>${value}</v></c>`;
  return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}
function formulaXml(ref, formula, cached, s, array) {
  const st = s == null ? '' : ` s="${s}"`;
  const f = array ? `<f t="array" ref="${ref}">${esc(formula)}</f>` : `<f>${esc(formula)}</f>`;
  if (typeof cached === 'number' && Number.isFinite(cached)) return `<c r="${ref}"${st}>${f}<v>${cached}</v></c>`;
  return `<c r="${ref}"${st} t="str">${f}<v>${esc(cached == null ? '' : cached)}</v></c>`;
}
const rowXml = (n, row) => {
  if (!row.dirty && row.raw) return row.raw;
  const cells = [...row.cells.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]).join('');
  return `<row r="${n}"${row.attrs ? ` ${row.attrs}` : ''}${cells ? `>${cells}</row>` : '/>'}`;
};
const moveCell = (xml, ref) => xml.replace(/(<c\b[^>]*?\sr=")[A-Z]+\d+(")/, (a, p, q) => `${p}${ref}${q}`);
function dimensionOf(rows) {
  let r1 = Infinity; let r2 = 0; let c1 = Infinity; let c2 = 0;
  for (const [n, row] of rows) {
    if (!row.cells.size) continue;
    r1 = Math.min(r1, n); r2 = Math.max(r2, n);
    for (const c of row.cells.keys()) { c1 = Math.min(c1, c); c2 = Math.max(c2, c); }
  }
  return r2 ? `${colName(c1)}${r1}:${colName(c2)}${r2}` : 'A1';
}
// La tabella con il nuovo intervallo; via filtri e ordinamenti attivi (si riferivano alle righe di prima).
function retable(xml, ref) {
  return xml.replace(/(<table\b[^>]*?\sref=")[^"]*(")/, (a, p, q) => `${p}${ref}${q}`)
    .replace(/<autoFilter\b[^>]*?(?:\/>|>[\s\S]*?<\/autoFilter>)/, () => `<autoFilter ref="${ref}"/>`)
    .replace(/<sortState\b[^>]*?(?:\/>|>[\s\S]*?<\/sortState>)/, '');
}

// Un intervallo ("A2:A2000", anche con $) che copriva le righe di dati di una tabella si allunga fino alla nuova ultima riga,
// cosi' colori condizionali, menu a tendina e nomi definiti valgono anche per le righe aggiunte.
function extendRange(ref, zones) {
  const m = /^(\$?)([A-Z]+)(\$?)(\d+)(?::(\$?)([A-Z]+)(\$?)(\d+))?$/.exec(ref);
  if (!m) return ref;
  const a = cellRef(m[2] + m[4]);
  const b = m[6] ? cellRef(m[6] + m[8]) : a;
  let end = b.row;
  for (const z of zones) {
    if (a.col <= z.cols[1] && b.col >= z.cols[0] && a.row <= z.dataFrom && b.row >= z.oldTo && z.newTo > end) end = z.newTo;
  }
  if (end === b.row) return ref;
  return `${m[1]}${m[2]}${m[3]}${m[4]}:${m[5] ?? m[1]}${m[6] || m[2]}${m[7] ?? m[3]}${end}`;
}
function extendRefs(xml, zones) {
  if (!zones.length) return xml;
  const fix = (list) => list.split(/\s+/).filter(Boolean).map((r) => extendRange(r, zones)).join(' ');
  return xml.replace(/\ssqref="([^"]*)"/g, (all, list) => ` sqref="${fix(list)}"`)
    .replace(/<xm:sqref>([^<]*)<\/xm:sqref>/g, (all, list) => `<xm:sqref>${fix(list)}</xm:sqref>`);
}
function extendDefinedNames(wb, zonesBySheet) {
  return wb.replace(/(<definedName\b[^>]*>)([^<]*)(<\/definedName>)/g, (all, open, body, close) => {
    const fixed = body.replace(/((?:'(?:[^']|'')+'|[A-Za-z0-9_.]+)!)(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)/g, (m, sheetPart, ref) => {
      const name = sheetPart.slice(0, -1).replace(/^'|'$/g, '').replace(/''/g, "'");
      const zones = zonesBySheet.get(name);
      return zones ? sheetPart + extendRange(ref, zones) : m;
    });
    return open + fixed + close;
  });
}

// ---- La mappa dentro il modello -----------------------------------------------------------------------
// map: la stessa struttura di buildBpbWorkbook. Restituisce il Buffer del file, oppure null se il modello non e' nel formato BPB.
function buildFromTemplate(templateBuf, map) {
  const files = unpack(templateBuf);
  const wbXml = text(files, 'xl/workbook.xml');
  if (!wbXml) return null;
  const wbRels = rels(files, 'xl/workbook.xml');
  const sheets = [];
  for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
    const file = wbRels.get(attr(m[0], 'r:id'));
    const xml = file && text(files, file);
    if (!xml) continue;
    const sRels = rels(files, file);
    const tables = [];
    for (const tp of xml.matchAll(/<tablePart\b[^>]*>/g)) {
      const tfile = sRels.get(attr(tp[0], 'r:id'));
      const t = tfile && parseTable(text(files, tfile));
      if (t && t.ref) tables.push({ ...t, file: tfile, key: t.name.toLowerCase() });
    }
    sheets.push({ name: attr(m[0], 'name'), file, xml, tables });
  }
  const managed = new Map(); // tblbpb / tblmacro / tblprocessi -> tabella (la prima con quel nome)
  for (const s of sheets) for (const t of s.tables) if (COLUMNS[t.key] && !managed.has(t.key)) managed.set(t.key, t);
  if (managed.size < 3) return null;

  const isDate = dateStyles(files);
  const records = recordsOf(map);
  const out = new Map(files);
  const zonesBySheet = new Map();

  for (const sheet of sheets) {
    const own = sheet.tables.filter((t) => managed.get(t.key) === t);
    if (!own.length) continue;
    const { match, rows } = parseSheetData(sheet.xml);
    if (!match) continue;
    const plans = own.map((t) => {
      const { from, to } = rangeRef(t.ref);
      const dataFrom = from.row + 1;
      const dataTo = to.row - t.totals;
      const styles = [];
      for (let c = from.col; c <= to.col; c++) {
        const seen = [];
        for (let r = dataFrom; r <= dataTo; r++) { const cx = rows.get(r) && rows.get(r).cells.get(c); seen.push(cx ? attr(cx, 's') : null); }
        styles.push(mode(seen));
      }
      const totalsCells = [];
      if (t.totals) for (let c = from.col; c <= to.col; c++) { const cx = rows.get(to.row) && rows.get(to.row).cells.get(c); if (cx) totalsCells.push([c, cx]); }
      const recs = records[t.key].length ? records[t.key] : [null];
      return { t, from, to, dataFrom, dataTo, styles, rowAttrs: commonRowAttrs(rows, dataFrom, dataTo), totalsCells, recs, newTo: dataFrom + recs.length - 1 };
    });
    // 1) via le vecchie righe di dati delle tabelle gestite (solo le loro colonne: il resto della riga resta)
    let zoneFrom = Infinity;
    let zoneTo = 0;
    for (const pl of plans) {
      for (let r = pl.dataFrom; r <= pl.to.row; r++) { const row = rows.get(r); if (row) for (let c = pl.from.col; c <= pl.to.col; c++) if (row.cells.delete(c)) row.dirty = true; }
      zoneFrom = Math.min(zoneFrom, pl.dataFrom);
      zoneTo = Math.max(zoneTo, pl.to.row, pl.newTo + pl.t.totals);
    }
    // gli attributi di riga (altezze) del modello valevano per il vecchio contenuto
    for (let r = zoneFrom; r <= zoneTo; r++) { const row = rows.get(r); if (row && row.attrs) { row.attrs = ''; row.dirty = true; } }
    // 2) le righe nuove, con lo stile di colonna del modello
    for (const pl of plans) {
      const getters = COLUMNS[pl.t.key];
      pl.recs.forEach((x, i) => {
        const r = pl.dataFrom + i;
        if (!rows.has(r)) rows.set(r, { attrs: '', cells: new Map(), dirty: true });
        const row = rows.get(r);
        row.dirty = true;
        if (pl.rowAttrs) row.attrs = pl.rowAttrs;
        pl.t.columns.forEach((col, j) => {
          const c = pl.from.col + j;
          if (c > pl.to.col) return;
          const ref = `${colName(c)}${r}`;
          const s = pl.styles[j];
          const get = getters[low(col.name)];
          let v = x && get ? get(x) : null;
          if (v && typeof v === 'object' && 'date' in v) v = v.date ? (s != null && isDate[Number(s)] ? excelDate(v.date) : displayDate(v.date)) : null;
          row.cells.set(c, col.formula ? formulaXml(ref, col.formula, v == null ? '' : v, s, col.array) : cellXml(ref, v, s));
        });
      });
      if (pl.totalsCells.length) {
        const r = pl.newTo + 1;
        if (!rows.has(r)) rows.set(r, { attrs: '', cells: new Map(), dirty: true });
        rows.get(r).dirty = true;
        for (const [c, cx] of pl.totalsCells) rows.get(r).cells.set(c, moveCell(cx, `${colName(c)}${r}`));
      }
      out.set(pl.t.file, Buffer.from(retable(text(files, pl.t.file), `${colName(pl.from.col)}${pl.from.row}:${colName(pl.to.col)}${pl.newTo + pl.t.totals}`), 'utf8'));
    }
    const zones = plans.map((pl) => ({ cols: [pl.from.col, pl.to.col], dataFrom: pl.dataFrom, oldTo: pl.dataTo, newTo: pl.newTo }));
    zonesBySheet.set(sheet.name, zones);
    // 3) il foglio: stesse parti, solo le righe cambiano (e gli intervalli che le coprivano si allungano)
    const sheetData = [...rows.entries()].filter(([, row]) => row.cells.size || row.attrs).sort((a, b) => a[0] - b[0]).map(([n, row]) => rowXml(n, row)).join('');
    let xml = sheet.xml.replace(match[0], () => `<sheetData>${sheetData}</sheetData>`);
    xml = xml.replace(/<dimension\b[^>]*\/>/, () => `<dimension ref="${dimensionOf(rows)}"/>`);
    out.set(sheet.file, Buffer.from(extendRefs(xml, zones), 'utf8'));
  }

  // cartella: nomi definiti allargati, ricalcolo all'apertura, via la catena di calcolo (si riferiva alle celle di prima)
  let wb = extendDefinedNames(wbXml, zonesBySheet);
  if (/<calcPr\b/.test(wb)) wb = /fullCalcOnLoad=/.test(wb) ? wb.replace(/fullCalcOnLoad="[^"]*"/, 'fullCalcOnLoad="1"') : wb.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
  else {
    const anchor = ['</definedNames>', '</externalReferences>', '</functionGroups>', '</sheets>'].find((t) => wb.includes(t));
    if (anchor) wb = wb.replace(anchor, () => `${anchor}<calcPr fullCalcOnLoad="1"/>`);
  }
  out.set('xl/workbook.xml', Buffer.from(wb, 'utf8'));
  if (files.has('xl/calcChain.xml')) {
    out.delete('xl/calcChain.xml');
    const ct = text(files, '[Content_Types].xml');
    if (ct) out.set('[Content_Types].xml', Buffer.from(ct.replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/, ''), 'utf8'));
    const wr = text(files, 'xl/_rels/workbook.xml.rels');
    if (wr) out.set('xl/_rels/workbook.xml.rels', Buffer.from(wr.replace(/<Relationship\b[^>]*Target="[^"]*calcChain\.xml"[^>]*\/>/, ''), 'utf8'));
  }
  const core = text(files, 'docProps/core.xml');
  if (core && /<dcterms:modified\b/.test(core)) {
    out.set('docProps/core.xml', Buffer.from(core.replace(/(<dcterms:modified\b[^>]*>)[^<]*(<\/dcterms:modified>)/, (a, p, q) => `${p}${new Date().toISOString().slice(0, 19)}Z${q}`), 'utf8'));
  }
  return writeZip([...out.entries()].map(([name, data]) => ({ name, data })));
}

// Il file e' un modello utilizzabile (ha le tre tabelle)?
function isBpbTemplate(buf) {
  try {
    const files = unpack(buf);
    const names = new Set();
    for (const [name, data] of files) if (/^xl\/tables\/.*\.xml$/.test(name)) { const t = parseTable(data.toString('utf8')); if (t) names.add(t.name.toLowerCase()); }
    return ['tblbpb', 'tblmacro', 'tblprocessi'].every((n) => names.has(n));
  } catch { return false; }
}

module.exports = { buildFromTemplate, isBpbTemplate, extendRange, COLUMNS };
