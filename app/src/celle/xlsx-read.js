'use strict';
// Lettura di un file .xlsx senza librerie: fogli, celle (valori gia' calcolati da Excel) e tabelle.
const path = require('node:path');
const { readZip } = require('./zip');

const decode = (s) => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&');
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag); return m ? decode(m[1]) : null; };
// testo di <t> (anche "rich text" a pezzi <r><t>…</t></r>)
const texts = (xml) => { let out = ''; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g; let m; while ((m = re.exec(xml))) out += m[1] ? decode(m[1]) : ''; return out; };

// "AB12" -> { col: 27, row: 12 }  (1-based)
function cellRef(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}
function rangeRef(ref) {
  const [a, b] = String(ref).replace(/\$/g, '').split(':');
  return { from: cellRef(a), to: cellRef(b || a) };
}

function readXlsx(buf) {
  const zip = readZip(buf);
  const get = (name) => { const f = zip.get(name); return f ? f().toString('utf8') : null; };
  const relsOf = (file) => {
    const xml = get(path.posix.join(path.posix.dirname(file), '_rels', path.posix.basename(file) + '.rels'));
    const out = new Map();
    if (!xml) return out;
    for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
      const target = attr(m[0], 'Target');
      out.set(attr(m[0], 'Id'), target.startsWith('/') ? target.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file), target)));
    }
    return out;
  };
  const wb = get('xl/workbook.xml');
  if (!wb) throw new Error('Il file non è un foglio Excel (.xlsx).');
  const wbRels = relsOf('xl/workbook.xml');
  const shared = [];
  const ss = get('xl/sharedStrings.xml');
  if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(texts(m[1]));

  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(m[0], 'name');
    const file = wbRels.get(attr(m[0], 'r:id'));
    const xml = file && get(file);
    if (!xml) continue;
    const cells = new Map(); // "r,c" -> valore
    let maxRow = 0;
    let maxCol = 0;
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const head = `<c ${c[1]}>`;
      const ref = cellRef(attr(head, 'r') || '');
      if (!ref) continue;
      const t = attr(head, 't');
      const inner = c[2] || '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
      let value = null;
      if (t === 's' && v) value = shared[Number(v[1])] ?? '';
      else if (t === 'inlineStr') value = texts(inner);
      else if (t === 'str' || t === 'e') value = v ? decode(v[1]) : '';
      else if (t === 'b' && v) value = v[1] === '1';
      else if (v) value = Number(v[1]);
      if (value === null || value === '') continue;
      cells.set(`${ref.row},${ref.col}`, value);
      if (ref.row > maxRow) maxRow = ref.row;
      if (ref.col > maxCol) maxCol = ref.col;
    }
    const tables = [];
    const rels = relsOf(file);
    for (const tp of xml.matchAll(/<tablePart\b[^>]*>/g)) {
      const tfile = rels.get(attr(tp[0], 'r:id'));
      const txml = tfile && get(tfile);
      if (!txml) continue;
      const head = /<table\b[^>]*>/.exec(txml)[0];
      tables.push({ name: attr(head, 'displayName') || attr(head, 'name'), ref: attr(head, 'ref'), columns: [...txml.matchAll(/<tableColumn\b[^>]*>/g)].map((x) => attr(x[0], 'name')) });
    }
    sheets.push({ name, cells, maxRow, maxCol, tables });
  }
  return { sheets, at: (sheet, row, col) => sheet.cells.get(`${row},${col}`) ?? null };
}

// Righe di una tabella Excel come oggetti { "nome colonna": valore }
function tableRows(book, sheet, table) {
  const { from, to } = rangeRef(table.ref);
  const rows = [];
  for (let r = from.row + 1; r <= to.row; r++) {
    const row = {};
    let empty = true;
    table.columns.forEach((name, i) => {
      const v = book.at(sheet, r, from.col + i);
      row[name] = v;
      if (v !== null && v !== '') empty = false;
    });
    if (!empty) rows.push(row);
  }
  return rows;
}

// Foglio come tabella semplice: prima riga = intestazioni (per l'importazione con mappatura delle colonne)
function sheetGrid(book, sheet, limit = 5000) {
  let headerRow = 1;
  for (let r = 1; r <= Math.min(sheet.maxRow, 10); r++) {
    let filled = 0;
    for (let c = 1; c <= sheet.maxCol; c++) if (book.at(sheet, r, c) !== null) filled++;
    if (filled >= 2) { headerRow = r; break; }
  }
  const headers = [];
  for (let c = 1; c <= sheet.maxCol; c++) headers.push(String(book.at(sheet, headerRow, c) ?? `Colonna ${c}`).trim());
  const rows = [];
  for (let r = headerRow + 1; r <= Math.min(sheet.maxRow, headerRow + limit); r++) {
    const row = headers.map((_, i) => book.at(sheet, r, i + 1));
    if (row.some((v) => v !== null && v !== '')) rows.push(row);
  }
  return { headers, rows };
}

module.exports = { readXlsx, tableRows, sheetGrid, cellRef, rangeRef };
