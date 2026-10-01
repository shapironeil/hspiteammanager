'use strict';
// Motore Word, scrittura: modifica un documento .docx esistente (un modello) per FUNZIONI, senza librerie.
//
//   const doc = openDocx(buffer);
//   doc.replaceAll('[Inserire Scrivente]', 'Maria Rossi')       in tutto il documento, intestazioni e pie' di pagina
//   doc.paragraphs()                                            i paragrafi del corpo, nell'ordine ({ i, text, xml, ... })
//   doc.setParagraphText(p, 'testo nuovo')                      conserva stile e carattere del paragrafo
//   doc.tables()                                                le tabelle ({ i, rows: [[celle]] })
//   doc.fillTable(t, { modelRow, rows: [['a', 'b'], ...] })     righe nuove copiate da una riga modello
//   doc.setCell(t, r, c, 'testo')
//   doc.insertAfter(p, [xml...]) / doc.remove(p)
//   doc.removeComments(); doc.updateFieldsOnOpen(); doc.removeHighlight()
//   doc.save() -> Buffer
//
// Word spezza il testo in tanti "run" (correttore, revisioni): prima di cercare una frase i run uguali vengono uniti,
// cosi' "[Inserire importo]" si trova anche se Word l'aveva diviso in tre pezzi.
const { readZip, writeZip } = require('../celle/zip');

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decode = (s) => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&');
const P_RE = /<w:p(?=[\s>])[^>]*?(?:\/>|>[\s\S]*?<\/w:p>)/g; // un paragrafo (non <w:pPr>)
const R_RE = /<w:r(?=[\s>])[^>]*>[\s\S]*?<\/w:r>/g;
const TBL_RE = /<w:tbl>[\s\S]*?<\/w:tbl>/g; // le tabelle del modello non sono annidate
const TR_RE = /<w:tr(?=[\s>])[^>]*>[\s\S]*?<\/w:tr>/g;
const TC_RE = /<w:tc(?=[\s>])[^>]*>[\s\S]*?<\/w:tc>/g;
const PARTS = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml', 'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml', 'word/footnotes.xml', 'word/endnotes.xml'];

// testo di un frammento XML (run, paragrafo, cella): w:t, tabulazioni e a capo
function textOf(xml) {
  return String(xml || '').replace(/<w:tab\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n').replace(/<w:cr\/>/g, '\n')
    .replace(/<w:delText[^>]*>[\s\S]*?<\/w:delText>/g, '').replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, '')
    .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (m, t) => `\u0001${t}\u0002`).replace(/<[^>]+>/g, '')
    .replace(/[^\u0001\u0002\t\n]*\u0001/g, '\u0001').replace(/\u0002[^\u0001\u0002\t\n]*/g, '\u0002')
    .replace(/[\u0001\u0002]/g, '')
    .replace(/&[^;]+;/g, (e) => decode(e));
}
// testo di un paragrafo: solo i run (niente campi, niente testo cancellato)
function paraText(pXml) {
  const inner = pXml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '');
  let s = '';
  for (const r of inner.match(R_RE) || []) s += runText(r);
  return s;
}
function runText(rXml) {
  const body = rXml.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, '');
  let s = '';
  for (const m of body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\b[^>]*\/>|<w:cr\/>/g)) s += m[1] !== undefined ? decode(m[1]) : (m[0].startsWith('<w:tab') ? '\t' : '\n');
  return s;
}
const rPrOf = (rXml) => (/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(rXml) || [''])[0];
const noHighlight = (rPr) => rPr.replace(/<w:highlight\b[^>]*\/>/g, '').replace(/<w:shd\b[^>]*w:fill="(?:FFFF00|FFC000|yellow)"[^>]*\/>/gi, '');
// un run con testo (tab e a capo compresi) e il suo rPr
function runXml(rPr, text) {
  const parts = String(text == null ? '' : text).split(/(\t|\n)/).filter((x) => x !== '');
  const body = parts.map((x) => (x === '\t' ? '<w:tab/>' : x === '\n' ? '<w:br/>' : `<w:t xml:space="preserve">${esc(x)}</w:t>`)).join('');
  return `<w:r>${rPr || ''}${body}</w:r>`;
}
// unisce i run adiacenti con lo stesso rPr (solo quelli fatti di testo semplice)
function mergeRuns(pXml) {
  if (/<w:(ins|del|fldChar|instrText|hyperlink|sdt)\b/.test(pXml)) return pXml; // paragrafi con campi o revisioni: si lasciano stare
  const pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(pXml) || [''])[0];
  const open = (/^<w:p(?=[\s>])[^>]*>/.exec(pXml) || ['<w:p>'])[0];
  if (/\/>$/.test(open)) return pXml;
  const inner = pXml.slice(open.length, pXml.length - '</w:p>'.length).replace(pPr, '');
  const tokens = [];
  const re = /<w:r(?=[\s>])[^>]*>[\s\S]*?<\/w:r>|<w:bookmark(?:Start|End)\b[^>]*\/>|<w:proofErr\b[^>]*\/>|<[\s\S]+?>/g;
  let last = 0; let m;
  while ((m = re.exec(inner))) {
    if (m.index > last) tokens.push({ raw: inner.slice(last, m.index) });
    const x = m[0];
    if (x.startsWith('<w:r')) {
      const simple = /^<w:r>|^<w:r\s[^>]*>/.test(x) && !/<w:(drawing|pict|object|fldChar|instrText|footnoteReference|commentReference|sym|ruby)\b/.test(x);
      tokens.push(simple ? { run: true, rPr: rPrOf(x), text: runText(x) } : { raw: x });
    } else if (x.startsWith('<w:proofErr')) { /* via */ } else tokens.push({ raw: x });
    last = re.lastIndex;
  }
  if (last < inner.length) tokens.push({ raw: inner.slice(last) });
  const out = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (t.run && prev && prev.run && prev.rPr === t.rPr) prev.text += t.text; else out.push({ ...t });
  }
  return `${open}${pPr}${out.map((t) => (t.run ? runXml(t.rPr, t.text) : t.raw)).join('')}</w:p>`;
}
// sostituisce in un paragrafo (dopo l'unione dei run); find = stringa o RegExp; -> { xml, n }
// Una frase spezzata tra run con stili diversi si trova lo stesso: il testo nuovo prende lo stile del run in cui
// la frase comincia, i pezzi che seguono vengono accorciati. Il run toccato perde l'evidenziazione gialla.
function replaceInParagraph(pXml, find, replace, { keepHighlight = false } = {}) {
  const merged = mergeRuns(pXml);
  const runs = [];
  let pos = 0;
  for (const m of merged.matchAll(R_RE)) {
    const skip = /<w:(drawing|pict|object|fldChar|instrText)\b/.test(m[0]);
    const text = skip ? '' : runText(m[0]);
    runs.push({ xml: m[0], text, start: pos, skip, touched: false });
    pos += text.length;
  }
  if (!runs.length) return { xml: merged, n: 0 };
  const full = runs.map((r) => r.text).join('');
  const matches = [];
  if (find instanceof RegExp) {
    const re = new RegExp(find.source, find.flags.includes('g') ? find.flags : find.flags + 'g');
    let m;
    while ((m = re.exec(full))) { matches.push({ ms: m.index, me: m.index + m[0].length, rep: typeof replace === 'function' ? String(replace(...m, m.index, full)) : String(replace) }); if (!m[0].length) re.lastIndex++; }
  } else if (find) {
    let at = full.indexOf(find);
    while (at >= 0) { matches.push({ ms: at, me: at + find.length, rep: String(replace) }); at = full.indexOf(find, at + find.length); }
  }
  if (!matches.length) return { xml: merged, n: 0 };
  const texts = runs.map((r) => r.text);
  for (const { ms, me, rep } of matches.reverse()) {
    const i = runs.findIndex((r, k) => !r.skip && ms >= r.start && (ms < r.start + r.text.length || (k === runs.length - 1 && ms === r.start + r.text.length)));
    const j = runs.findIndex((r) => !r.skip && me > r.start && me <= r.start + r.text.length);
    if (i < 0) continue;
    const jj = j < 0 ? i : j;
    const tail = jj === i ? texts[i].slice(me - runs[i].start) : texts[jj].slice(me - runs[jj].start);
    texts[i] = texts[i].slice(0, ms - runs[i].start) + rep + (jj === i ? tail : '');
    for (let k = i + 1; k < jj; k++) texts[k] = '';
    if (jj !== i) texts[jj] = tail;
    runs[i].touched = true;
  }
  let k = 0;
  const xml = merged.replace(R_RE, (r) => {
    const run = runs[k++];
    if (run.skip || texts[k - 1] === run.text) return r;
    if (!texts[k - 1]) return '';
    return runXml(run.touched && !keepHighlight ? noHighlight(rPrOf(r)) : rPrOf(r), texts[k - 1]);
  });
  return { xml, n: matches.length };
}
// un paragrafo con lo stesso pPr e un solo run
function rebuildParagraph(pXml, rPr, text) {
  const pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(pXml) || [''])[0];
  const open = (/^<w:p(?=[\s>])[^>]*>/.exec(pXml) || ['<w:p>'])[0].replace(/\/>$/, '>');
  const marks = (pXml.match(/<w:bookmark(?:Start|End)\b[^>]*\/>/g) || []).join('');
  return `${open}${pPr}${marks}${runXml(rPr, text)}</w:p>`;
}

class Docx {
  constructor(buf) {
    const zip = readZip(buf);
    this.files = new Map([...zip].map(([k, f]) => [k, f]));
    if (!this.files.has('word/document.xml')) throw Object.assign(new Error('Non è un file Word (.docx) valido.'), { status: 400 });
    this.xml = this.txt('word/document.xml');
  }
  raw(name) { const v = this.files.get(name); return v == null ? null : (typeof v === 'function' ? v() : v); }
  txt(name) { const b = this.raw(name); return b ? b.toString('utf8') : null; }
  put(name, data) { this.files.set(name, Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')); }

  // ---- Paragrafi e tabelle del corpo ----------------------------------------------------------
  // tutti i paragrafi del corpo (anche dentro le tabelle), con posizione nel documento
  paragraphs() {
    const out = [];
    for (const m of this.xml.matchAll(P_RE)) out.push(this.paraInfo(m[0], m.index));
    return out;
  }
  paraInfo(xml, at) {
    const pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(xml) || [''])[0];
    return {
      xml, at, text: paraText(xml), style: (/<w:pStyle w:val="([^"]+)"/.exec(pPr) || [0, ''])[1],
      numbered: /<w:numPr>/.test(pPr), outline: (/<w:outlineLvl w:val="(\d)"/.exec(pPr) || [0, null])[1],
      highlighted: /<w:highlight\b/.test(xml), inTable: this.inTable(at),
    };
  }
  inTable(at) {
    const before = this.xml.lastIndexOf('<w:tbl>', at); const closed = this.xml.lastIndexOf('</w:tbl>', at);
    return before >= 0 && before > closed;
  }
  // il primo paragrafo il cui testo corrisponde (stringa contenuta o RegExp), a partire da una posizione
  findParagraph(what, from = 0) {
    for (const p of this.paragraphs()) {
      if (p.at < from) continue;
      if (what instanceof RegExp ? what.test(p.text) : p.text.includes(what)) return p;
    }
    return null;
  }
  // i paragrafi di testo fuori dalle tabelle tra due posizioni
  paragraphsBetween(from, to) { return this.paragraphs().filter((p) => p.at >= from && p.at < to && !p.inTable); }
  tables() {
    const out = [];
    for (const m of this.xml.matchAll(TBL_RE)) out.push(this.tableInfo(m[0], m.index));
    return out;
  }
  tableInfo(xml, at) {
    const rows = (xml.match(TR_RE) || []).map((tr) => (tr.match(TC_RE) || []).map((tc) => textOf(tc).trim()));
    return { xml, at, rows, text: rows.map((r) => r.join(' | ')).join('\n') };
  }
  findTable(what, from = 0) { return this.tables().find((t) => t.at >= from && (what instanceof RegExp ? what.test(t.text) : t.text.includes(what))) || null; }
  // la posizione di un titolo (paragrafo fuori tabella che inizia con il testo dato)
  heading(re, from = 0) { return this.paragraphs().find((p) => p.at >= from && !p.inTable && (re instanceof RegExp ? re.test(p.text.trim()) : p.text.trim().startsWith(re))) || null; }

  // ---- Sostituzioni ------------------------------------------------------------------------------
  // in tutto il documento, intestazioni e pie' di pagina; -> numero di sostituzioni
  replaceAll(find, replace, opts) {
    let n = 0;
    for (const part of PARTS) {
      const x = part === 'word/document.xml' ? this.xml : this.txt(part);
      if (!x || (typeof find === 'string' && !x.includes(find.slice(0, 1)))) continue;
      const y = x.replace(P_RE, (p) => { const r = replaceInParagraph(p, find, replace, opts); n += r.n; return r.xml; });
      if (y !== x) { if (part === 'word/document.xml') this.xml = y; else this.put(part, y); }
    }
    return n;
  }
  // sostituzione dentro un frammento (paragrafo, riga, tabella) gia' individuato: ritorna il frammento nuovo
  replaceIn(xml, find, replace, opts) { return xml.replace(P_RE, (p) => replaceInParagraph(p, find, replace, opts).xml); }
  // sostituisce il frammento "old" (xml esatto, una sola volta) con "neu"
  swap(old, neu) {
    const at = this.xml.indexOf(old);
    if (at < 0) return false;
    this.xml = this.xml.slice(0, at) + neu + this.xml.slice(at + old.length);
    return true;
  }
  setParagraphText(p, text, { rPr } = {}) {
    const runs = p.xml.match(R_RE) || [];
    const style = rPr !== undefined ? rPr : noHighlight(runs.length ? rPrOf(runs.find((r) => runText(r).trim()) || runs[0]) : '');
    return this.swap(p.xml, rebuildParagraph(p.xml, style, text));
  }
  insertAfter(p, xmls) { return this.swap(p.xml, p.xml + [].concat(xmls).join('')); }
  insertBefore(p, xmls) { return this.swap(p.xml, [].concat(xmls).join('') + p.xml); }
  remove(p) { return this.swap(p.xml, ''); }
  // un paragrafo nuovo copiato da uno esistente (stesso stile, stesso carattere), con un altro testo
  clonePara(p, text, { highlight = false } = {}) {
    const runs = p.xml.match(R_RE) || [];
    const rPr = runs.length ? rPrOf(runs.find((r) => runText(r).trim()) || runs[0]) : '';
    return rebuildParagraph(p.xml, highlight ? rPr : noHighlight(rPr), text).replace(/<w:bookmark(?:Start|End)\b[^>]*\/>/g, '');
  }

  // ---- Tabelle ------------------------------------------------------------------------------------
  rowsOf(t) { return t.xml.match(TR_RE) || []; }
  cellsOf(tr) { return tr.match(TC_RE) || []; }
  // cella con un testo nuovo: resta il primo paragrafo (stile, allineamento, carattere); piu' righe = piu' paragrafi
  cellWithText(tc, text, { highlight = false, rPr } = {}) {
    const paras = tc.match(P_RE) || [];
    const first = paras[0] || '<w:p/>';
    const runs = first.match(R_RE) || [];
    const style = rPr !== undefined ? rPr : (() => { const r = runs.find((x) => runText(x).trim()) || runs[0]; return r ? (highlight ? rPrOf(r) : noHighlight(rPrOf(r))) : ''; })();
    const lines = String(text == null ? '' : text).split('\n');
    const newParas = lines.map((l) => rebuildParagraph(first, style, l));
    const head = tc.slice(0, tc.indexOf(paras[0] || '<w:p')); // tcPr e quello che precede
    return `${head}${newParas.join('')}</w:tc>`;
  }
  rowWithTexts(tr, texts, opts) {
    const cells = this.cellsOf(tr);
    let out = tr;
    cells.forEach((tc, i) => {
      if (texts[i] === undefined || texts[i] === null) return;
      const v = texts[i];
      const neu = typeof v === 'object' ? this.cellWithFill(this.cellWithText(tc, v.text, opts), v.fill) : this.cellWithText(tc, v, opts);
      out = out.replace(tc, neu);
    });
    return out;
  }
  cellWithFill(tc, fill) {
    if (fill === undefined) return tc;
    const tcPr = (/<w:tcPr>[\s\S]*?<\/w:tcPr>/.exec(tc) || [''])[0];
    const shd = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : '';
    if (!tcPr) return tc.replace(/^(<w:tc(?=[\s>])[^>]*>)/, `$1<w:tcPr>${shd}</w:tcPr>`);
    const neu = /<w:shd\b[^>]*\/>/.test(tcPr) ? tcPr.replace(/<w:shd\b[^>]*\/>/, shd) : tcPr.replace('</w:tcPr>', `${shd}</w:tcPr>`);
    return tc.replace(tcPr, neu);
  }
  cellWithWidth(tc, w) {
    return /<w:tcW\b/.test(tc) ? tc.replace(/<w:tcW\b[^>]*\/>/, `<w:tcW w:w="${Math.round(w)}" w:type="dxa"/>`) : tc.replace(/<w:tcPr>/, `<w:tcPr><w:tcW w:w="${Math.round(w)}" w:type="dxa"/>`);
  }
  // riga con le prime "keep" celle com'erano e poi n copie della cella modello (indice keep), con testi e riempimenti:
  // serve per le tabelle "a mesi" quando i mesi del SAL non sono quelli del modello
  rowWithMonths(tr, keep, n, values = [], width) {
    const cells = this.cellsOf(tr);
    const model = cells[keep];
    if (!model) return tr;
    const head = tr.slice(0, tr.indexOf(cells[0]));
    const kept = cells.slice(0, keep).join('');
    const months = Array.from({ length: n }, (x, i) => {
      const v = values[i];
      let c = model.replace(/<w:gridSpan w:val="\d+"\/>/g, '');
      if (v !== undefined && v !== null) c = typeof v === 'object' ? this.cellWithFill(this.cellWithText(c, v.text == null ? '' : v.text), v.fill) : this.cellWithText(c, v);
      return width ? this.cellWithWidth(c, width) : c;
    }).join('');
    return `${head}${kept}${months}</w:tr>`;
  }
  setCell(t, r, c, text, opts) {
    const rows = this.rowsOf(t);
    if (!rows[r]) return false;
    const cells = this.cellsOf(rows[r]);
    if (!cells[c]) return false;
    const row = rows[r].replace(cells[c], this.cellWithText(cells[c], text, opts));
    const xml = t.xml.replace(rows[r], row);
    this.swap(t.xml, xml); t.xml = xml;
    return true;
  }
  // righe nuove copiate dalla riga modello (indice), al posto delle righe da "modelRow" a "until" (escluso);
  // rows = [['testo', { text, fill }], ...]; -> la tabella aggiornata
  fillTable(t, { modelRow, rows, until, keepModel = false, opts }) {
    const trs = this.rowsOf(t);
    const model = trs[modelRow];
    if (!model) throw Object.assign(new Error('Riga modello della tabella non trovata.'), { status: 400 });
    const end = until === undefined ? trs.length : until;
    const neu = rows.map((r) => this.rowWithTexts(model, r, opts)).join('');
    const before = trs.slice(0, modelRow).join(''); const after = trs.slice(end).join('');
    const head = t.xml.slice(0, t.xml.indexOf(trs[0]));
    const xml = `${head}${before}${keepModel ? model : ''}${neu}${after}</w:tbl>`;
    this.swap(t.xml, xml); t.xml = xml; t.rows = this.tableInfo(xml, t.at).rows;
    return t;
  }
  // una riga con un numero diverso di celle "a mese": la cella modello (indice) viene ripetuta n volte
  rowWithRepeatedCell(tr, cellIndex, n, texts = []) {
    const cells = this.cellsOf(tr);
    const model = cells[cellIndex];
    if (!model) return tr;
    const span = Number((/<w:gridSpan w:val="(\d+)"/.exec(model) || [0, 1])[1]);
    const rep = Array.from({ length: n }, (x, i) => (texts[i] !== undefined ? (typeof texts[i] === 'object' ? this.cellWithFill(this.cellWithText(model, texts[i].text), texts[i].fill) : this.cellWithText(model, texts[i])) : model)).join('');
    return tr.replace(model, span > 1 ? rep.replace(/<w:gridSpan w:val="\d+"\/>/g, '') : rep);
  }
  setGrid(t, widths) {
    const grid = `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${Math.round(w)}"/>`).join('')}</w:tblGrid>`;
    const xml = /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/.test(t.xml) ? t.xml.replace(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/, grid) : t.xml.replace(/<\/w:tblPr>/, `</w:tblPr>${grid}`);
    this.swap(t.xml, xml); t.xml = xml;
    return t;
  }
  gridOf(t) { return [...t.xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((m) => Number(m[1])); }
  // sostituisce l'intero xml di una tabella
  setTable(t, xml) { this.swap(t.xml, xml); t.xml = xml; t.rows = this.tableInfo(xml, t.at).rows; return t; }

  // ---- Pulizia e impostazioni ---------------------------------------------------------------------
  removeComments() {
    const n = (this.xml.match(/<w:commentReference\b/g) || []).length;
    this.xml = this.xml.replace(/<w:commentRange(?:Start|End)\b[^>]*\/>/g, '').replace(/<w:r(?=[\s>])[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:commentReference\b[^>]*\/>[\s\S]*?<\/w:r>/g, '');
    for (const f of ['word/comments.xml', 'word/commentsExtended.xml', 'word/commentsIds.xml', 'word/commentsExtensible.xml']) this.files.delete(f);
    const rels = this.txt('word/_rels/document.xml.rels');
    if (rels) this.put('word/_rels/document.xml.rels', rels.replace(/<Relationship\b[^>]*Target="comments[^"]*"[^>]*\/>/g, ''));
    this.put('[Content_Types].xml', this.txt('[Content_Types].xml').replace(/<Override PartName="\/word\/comments[^"]*"[^>]*\/>/g, ''));
    return n;
  }
  removeHighlight() {
    let n = 0;
    for (const part of PARTS) { const x = part === 'word/document.xml' ? this.xml : this.txt(part); if (!x) continue; const y = x.replace(/<w:highlight\b[^>]*\/>/g, () => { n++; return ''; }); if (y !== x) { if (part === 'word/document.xml') this.xml = y; else this.put(part, y); } }
    return n;
  }
  // Word aggiorna indice e campi all'apertura (chiede conferma)
  updateFieldsOnOpen() {
    let s = this.txt('word/settings.xml');
    if (!s) return false;
    if (/<w:updateFields\b/.test(s)) s = s.replace(/<w:updateFields\b[^>]*\/>/, '<w:updateFields w:val="true"/>');
    else {
      // l'ordine degli elementi di settings.xml e' fisso: updateFields sta prima di hdrShapeDefaults, footnotePr, compat...
      const after = /<w:(hdrShapeDefaults|footnotePr|endnotePr|compat|docVars|rsids)\b|<m:mathPr\b|<w:(attachedSchema|themeFontLang|clrSchemeMapping|doNotIncludeSubdocsInStats|doNotAutoCompressPictures|forceUpgrade|captions|readModeInkLockDown|smartTagType|schemaLibrary|shapeDefaults|doNotEmbedSmartTags|decimalSymbol|listSeparator)\b/.exec(s);
      s = after ? s.slice(0, after.index) + '<w:updateFields w:val="true"/>' + s.slice(after.index) : s.replace('</w:settings>', '<w:updateFields w:val="true"/></w:settings>');
    }
    this.put('word/settings.xml', s);
    return true;
  }
  // via la protezione "consigliata sola lettura" e lo stato di revisione
  unprotect() {
    const app = this.txt('docProps/app.xml');
    if (app) this.put('docProps/app.xml', app.replace(/<DocSecurity>\d+<\/DocSecurity>/, '<DocSecurity>0</DocSecurity>'));
    const s = this.txt('word/settings.xml');
    if (s) this.put('word/settings.xml', s.replace(/<w:documentProtection\b[^>]*\/>/g, '').replace(/<w:trackRevisions\b[^>]*\/>/g, ''));
  }
  setCoreProps({ title, creator } = {}) {
    let c = this.txt('docProps/core.xml');
    if (!c) return;
    if (title !== undefined) c = c.replace(/<dc:title>[\s\S]*?<\/dc:title>|<dc:title\/>/, `<dc:title>${esc(title)}</dc:title>`);
    if (creator !== undefined) c = c.replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, `<cp:lastModifiedBy>${esc(creator)}</cp:lastModifiedBy>`);
    c = c.replace(/<dcterms:modified([^>]*)>[^<]*<\/dcterms:modified>/, `<dcterms:modified$1>${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:modified>`);
    this.put('docProps/core.xml', c);
  }

  save() {
    this.put('word/document.xml', this.xml);
    const names = [...this.files.keys()].sort((a, b) => (a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : 0));
    return writeZip(names.map((name) => ({ name, data: this.raw(name) })));
  }
}

const openDocx = (buf) => new Docx(buf);

module.exports = { openDocx, Docx, textOf, paraText, runText, mergeRuns, replaceInParagraph, rebuildParagraph, runXml, esc, decode, P_RE, R_RE, TBL_RE, TR_RE, TC_RE };
