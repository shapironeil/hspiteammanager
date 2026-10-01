'use strict';
// MPoint: modifiche "per funzione" al pacchetto .pptx, senza librerie, usate da pptx-write.js:
//   - testo delle celle di una tabella e righe nuove (clonate da una riga esistente, stesso stile);
//   - trova e sostituisci nei testi di una parte (slide, layout, master), dentro <a:t> e basta;
//   - pulizia del pacchetto dopo le modifiche: immagini e file non più citati da nessuna relazione,
//     contatori in docProps/app.xml.
const posix = require('node:path').posix;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unesc = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return ENT[e] !== undefined ? ENT[e] : m;
});
const relsOf = (part) => posix.join(posix.dirname(part), '_rels', posix.basename(part) + '.rels');

// ---- Testo di un txBody mantenendo lo stile dei paragrafi esistenti -------------------------------
function replaceTxBody(bodyXml, lines) {
  const inner = (/<(?:p|a):txBody>([\s\S]*?)<\/(?:p|a):txBody>/.exec(bodyXml) || [null, bodyXml])[1];
  const head = (/^([\s\S]*?)(?=<a:p>|<a:p\s|$)/.exec(inner) || ['', ''])[1];
  const paras = [...inner.matchAll(/<a:p>[\s\S]*?<\/a:p>|<a:p\s[^>]*>[\s\S]*?<\/a:p>|<a:p\/>/g)].map((m) => m[0]);
  const styleOf = (p) => ({
    pPr: (/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/.exec(p || '') || [''])[0],
    rPr: (/<a:rPr\b[^>]*\/>|<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/.exec(p || '') || ['<a:rPr lang="it-IT"/>'])[0],
  });
  const firstText = paras.find((p) => /<a:t>/.test(p)) || paras[0];
  const out = lines.map((l, i) => {
    const line = typeof l === 'string' ? { text: l } : l;
    const st = styleOf(paras[i] && /<a:t>/.test(paras[i]) ? paras[i] : firstText);
    let pPr = st.pPr;
    if (line.lvl !== undefined) {
      const lvl = Number(line.lvl) > 0 ? ` lvl="${Math.min(8, Number(line.lvl))}"` : '';
      pPr = pPr ? pPr.replace(/\s+lvl="\d+"/, '').replace(/<a:pPr\b/, `<a:pPr${lvl}`) : (lvl ? `<a:pPr${lvl}/>` : '');
    }
    const rPr = st.rPr.replace(/\s+dirty="\d"/, '');
    const runs = String(line.text || '').split('\n').map((t, k) => `${k ? `<a:br>${rPr}</a:br>` : ''}<a:r>${rPr}<a:t>${esc(t)}</a:t></a:r>`).join('');
    return `<a:p>${pPr}${runs}</a:p>`;
  });
  return `${head}${out.join('') || '<a:p/>'}`;
}

// ---- Tabelle -------------------------------------------------------------------------------------
// La tabella sta in un p:graphicFrame con p:cNvPr id=<frameId>
function frameRange(xml, frameId) {
  const at = xml.search(new RegExp(`<p:cNvPr\\b[^>]*\\bid="${String(frameId).replace(/\D/g, '')}"`));
  if (at < 0) return null;
  const start = Math.max(xml.lastIndexOf('<p:graphicFrame>', at), xml.lastIndexOf('<p:graphicFrame ', at));
  if (start < 0 || xml.lastIndexOf('</p:graphicFrame>', at) > start) return null;
  const end = xml.indexOf('</p:graphicFrame>', at) + '</p:graphicFrame>'.length;
  return { start, end };
}
const rowsOf = (tblXml) => [...tblXml.matchAll(/<a:tr\b[^>]*>[\s\S]*?<\/a:tr>/g)].map((m) => ({ xml: m[0], at: m.index }));
const cellsOf = (trXml) => [...trXml.matchAll(/<a:tc\b[^>]*\/>|<a:tc\b[^>]*>[\s\S]*?<\/a:tc>/g)].map((m) => ({ xml: m[0], at: m.index }));

function withCell(tcXml, lines) {
  const tb = /<a:txBody>[\s\S]*?<\/a:txBody>/.exec(tcXml);
  if (!tb) return tcXml;
  return tcXml.replace(tb[0], `<a:txBody>${replaceTxBody(tb[0], lines)}</a:txBody>`);
}

// cells: { "r,c": righe } con r e c da 0
function setTableCells(xml, frameId, cells) {
  const fr = frameRange(xml, frameId);
  if (!fr) return xml;
  let frame = xml.slice(fr.start, fr.end);
  const rows = rowsOf(frame);
  const edits = new Map(); // r -> [[c, lines]]
  for (const [k, lines] of Object.entries(cells || {})) {
    const m = /^(\d+),(\d+)$/.exec(k);
    if (!m || !Array.isArray(lines)) continue;
    edits.set(Number(m[1]), (edits.get(Number(m[1])) || []).concat([[Number(m[2]), lines]]));
  }
  for (const [r, list] of [...edits.entries()].sort((a, b) => b[0] - a[0])) {
    const row = rows[r];
    if (!row) continue;
    let tr = row.xml;
    const cs = cellsOf(tr);
    for (const [c, lines] of list.sort((a, b) => b[0] - a[0])) {
      const cell = cs[c];
      if (!cell) continue;
      tr = tr.slice(0, cell.at) + withCell(cell.xml, lines) + tr.slice(cell.at + cell.xml.length);
    }
    frame = frame.slice(0, row.at) + tr + frame.slice(row.at + row.xml.length);
  }
  return xml.slice(0, fr.start) + frame + xml.slice(fr.end);
}

// Righe nuove: ognuna clonata dalla riga "after" (stesso stile), con i testi delle celle; inserite dopo di essa.
// rows: [{ after: r, cells: [righe per cella] }] (le celle unite restano come nella riga clonata)
function addTableRows(xml, frameId, rows) {
  const fr = frameRange(xml, frameId);
  if (!fr) return xml;
  let frame = xml.slice(fr.start, fr.end);
  for (const spec of [...(rows || [])].sort((a, b) => Number(b.after) - Number(a.after))) {
    const list = rowsOf(frame);
    const src = list[Number(spec.after)];
    if (!src) continue;
    let tr = src.xml;
    const cs = cellsOf(tr);
    for (let c = cs.length - 1; c >= 0; c--) {
      const lines = Array.isArray(spec.cells) && spec.cells[c] !== undefined ? (Array.isArray(spec.cells[c]) ? spec.cells[c] : [String(spec.cells[c])]) : [''];
      tr = tr.slice(0, cs[c].at) + withCell(cs[c].xml, lines) + tr.slice(cs[c].at + cs[c].xml.length);
    }
    const at = src.at + src.xml.length;
    frame = frame.slice(0, at) + tr + frame.slice(at);
  }
  return xml.slice(0, fr.start) + frame + xml.slice(fr.end);
}

// ---- Trova e sostituisci ------------------------------------------------------------------------
// Sostituisce solo dentro i testi (<a:t>): niente tag, niente attributi. Restituisce { xml, count }.
const regexOf = (find, { matchCase = false, whole = false } = {}) => new RegExp(`${whole ? '(?<![\\p{L}\\p{N}])' : ''}${String(find).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${whole ? '(?![\\p{L}\\p{N}])' : ''}`, (matchCase ? '' : 'i') + 'gu');
function replaceText(xml, find, replace, opts = {}) {
  if (!find) return { xml, count: 0 };
  const re = regexOf(find, opts);
  let count = 0;
  const out = xml.replace(/<a:t>([^<]*)<\/a:t>/g, (m, t) => {
    const text = unesc(t);
    const n = (text.match(re) || []).length;
    if (!n) return m;
    count += n;
    return `<a:t>${esc(text.replace(re, replace))}</a:t>`;
  });
  return { xml: out, count };
}

// ---- Pulizia del pacchetto ------------------------------------------------------------------------
// files: Map nome -> Buffer | () => Buffer. Toglie i media che nessuna relazione cita piu'. Aggiorna i contatori.
function cleanPackage(files) {
  const txt = (name) => { const v = files.get(name); return v == null ? null : (typeof v === 'function' ? v() : v).toString('utf8'); };
  const referenced = new Set();
  for (const name of [...files.keys()].filter((k) => /\.rels$/.test(k))) {
    const dir = posix.dirname(posix.dirname(name)); // la cartella della parte
    for (const m of txt(name).matchAll(/Target="([^"]+)"(?:[^>]*TargetMode="([^"]+)")?/g)) {
      if (m[2] === 'External' || /^https?:/i.test(m[1])) continue;
      referenced.add(m[1].startsWith('/') ? m[1].slice(1) : posix.normalize(posix.join(dir, m[1])));
    }
  }
  const removed = [];
  for (const name of [...files.keys()]) {
    if (/^ppt\/media\//.test(name) && !referenced.has(name)) { files.delete(name); removed.push(name); }
  }
  const app = txt('docProps/app.xml');
  if (app) {
    const slides = [...files.keys()].filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k)).length;
    const notes = [...files.keys()].filter((k) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(k)).length;
    files.set('docProps/app.xml', Buffer.from(app.replace(/<Slides>\d+<\/Slides>/, `<Slides>${slides}</Slides>`).replace(/<Notes>\d+<\/Notes>/, `<Notes>${notes}</Notes>`), 'utf8'));
  }
  return removed;
}

module.exports = { replaceTxBody, setTableCells, addTableRows, replaceText, regexOf, cleanPackage, relsOf };
