'use strict';
// Cippi: letture aggiuntive dal pacchetto .pptx, senza librerie. Le usa pptx-read.js:
//   - sezioni native di PowerPoint (p14:sectionLst), quelle del riquadro "Sezioni" di PowerPoint;
//   - metadati estesi: azienda, applicazione, co-autori, registro delle revisioni (chi ha toccato quale slide e quando),
//     caratteri dichiarati e caratteri usati davvero nelle slide;
//   - tabelle con celle unite, riempimenti, grassetti e larghezze delle colonne;
//   - geometrie personalizzate (custGeom) come percorso SVG in un riquadro 0..100;
//   - riduzione automatica del testo (normAutofit fontScale).
const X = require('./xml');

const xmlOf = (files, part) => { const f = files.get(part); return f ? X.parse(f().toString('utf8')) : null; };

// ---- Sezioni native ---------------------------------------------------------------------------
// presentation.xml: <p14:sectionLst><p14:section name="..."><p14:sldIdLst><p14:sldId id="256"/>...
// idToN: id della slide -> numero nella presentazione (1..)
function nativeSections(pres, idToN) {
  const lst = X.find(pres, 'p14:sectionLst');
  if (!lst) return [];
  const out = [];
  for (const sec of X.children(lst, 'p14:section')) {
    const slides = X.findAll(sec, 'p14:sldId').map((s) => idToN[s.attrs.id]).filter((n) => n);
    out.push({ name: (sec.attrs.name || '').trim(), slides });
  }
  return out.filter((s) => s.name || s.slides.length);
}

// ---- Metadati estesi --------------------------------------------------------------------------
function metaExtra(files, idToN) {
  const out = { company: '', application: '', words: null, paragraphs: null, fontsDeclared: [], authors: [], revisions: [], lastChanges: [], comments: 0 };
  const app = xmlOf(files, 'docProps/app.xml');
  if (app) {
    out.company = X.text(X.find(app, 'Company')).trim();
    out.application = `${X.text(X.find(app, 'Application')).trim()} ${X.text(X.find(app, 'AppVersion')).trim()}`.trim();
    out.words = Number(X.text(X.find(app, 'Words'))) || null;
    out.paragraphs = Number(X.text(X.find(app, 'Paragraphs'))) || null;
    // HeadingPairs: "Fonts Used" N -> i primi N TitlesOfParts sono i caratteri
    const pairs = X.findAll(X.find(app, 'HeadingPairs'), 'vt:variant');
    const titles = X.findAll(X.find(app, 'TitlesOfParts'), 'vt:lpstr').map(X.text);
    let at = 0;
    for (let i = 0; i + 1 < pairs.length; i += 2) {
      const name = X.text(pairs[i]).trim(); const n = Number(X.text(pairs[i + 1])) || 0;
      if (/fonts/i.test(name)) out.fontsDeclared = titles.slice(at, at + n);
      at += n;
    }
  }
  const authors = xmlOf(files, 'ppt/authors.xml');
  if (authors) out.authors = X.findAll(authors, 'p188:author').map((a) => a.attrs.name).filter(Boolean);
  const rev = xmlOf(files, 'ppt/revisionInfo.xml');
  if (rev) out.revisions = X.findAll(rev, 'p1510:client').map((c) => ({ at: c.attrs.dt || '', edits: Number(c.attrs.v) || 0 }));
  // registro delle modifiche: una voce per slide, con l'ultima persona e l'ultima data
  const last = new Map();
  for (const name of [...files.keys()].filter((k) => /^ppt\/changesInfos\/.*\.xml$/.test(k))) {
    const doc = xmlOf(files, name);
    for (const ch of X.findAll(doc, 'pc:sldChg')) {
      const data = X.child(ch, 'pc:chgData'); const mk = X.find(ch, 'pc:sldMk');
      if (!data || !mk) continue;
      const n = idToN[mk.attrs.sldId];
      if (!n) continue;
      const cur = last.get(n);
      if (!cur || (data.attrs.dt || '') > cur.at) last.set(n, { slide: n, by: data.attrs.name || '', at: data.attrs.dt || '' });
    }
  }
  out.lastChanges = [...last.values()].sort((a, b) => a.slide - b.slide);
  out.comments = [...files.keys()].filter((k) => /^ppt\/comments\/.*\.xml$/.test(k)).length;
  return out;
}

// Caratteri usati davvero nelle slide (a:latin typeface), senza quelli del tema (+mj-lt, +mn-lt)
function fontsUsed(files) {
  const count = {};
  for (const name of [...files.keys()].filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))) {
    const xml = files.get(name)().toString('utf8');
    for (const m of xml.matchAll(/<a:latin typeface="([^"+][^"]*)"/g)) count[m[1]] = (count[m[1]] || 0) + 1;
  }
  return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, count: n }));
}

// ---- Tabelle ----------------------------------------------------------------------------------
// Dettaglio di una tabella: colonne (larghezze), celle con unioni, riempimento, grassetto, allineamento, stile.
function tableDetail(tbl, color, paragraphs) {
  const pr = X.child(tbl, 'a:tblPr') || { attrs: {} };
  const style = X.text(X.child(pr, 'a:tableStyleId')).trim();
  const cols = X.findAll(X.child(tbl, 'a:tblGrid'), 'a:gridCol').map((c) => Number(c.attrs.w) || 0);
  const cells = X.children(tbl, 'a:tr').map((tr) => X.children(tr, 'a:tc').map((tc) => {
    const tcPr = X.child(tc, 'a:tcPr');
    const paras = paragraphs(X.child(tc, 'a:txBody'));
    const text = paras.map((p) => p.text).join('\n').trim();
    const c = { text };
    for (const k of ['gridSpan', 'rowSpan']) if (Number(tc.attrs[k]) > 1) c[k] = Number(tc.attrs[k]);
    if (tc.attrs.hMerge === '1' || tc.attrs.hMerge === 'true') c.hMerge = true;
    if (tc.attrs.vMerge === '1' || tc.attrs.vMerge === 'true') c.vMerge = true;
    const fill = tcPr && X.child(tcPr, 'a:solidFill');
    if (fill) c.fill = color(fill);
    if (paras.some((p) => p.bold)) c.bold = true;
    const al = paras.find((p) => p.align);
    if (al) c.align = al.align;
    if (tcPr && tcPr.attrs.anchor) c.anchor = tcPr.attrs.anchor;
    return c;
  }));
  return { cols, cells, tableStyle: { id: style, firstRow: pr.attrs.firstRow === '1', bandRow: pr.attrs.bandRow === '1', lastRow: pr.attrs.lastRow === '1' } };
}

// ---- Geometrie personalizzate -----------------------------------------------------------------
// custGeom -> percorso SVG in coordinate 0..100 (si deforma con la forma, come le geometrie predefinite dell'anteprima).
function custGeomPath(spPr) {
  const cg = spPr && X.child(spPr, 'a:custGeom');
  const paths = cg && X.findAll(cg, 'a:path');
  if (!paths || !paths.length) return null;
  const out = [];
  for (const p of paths) {
    const W = Number(p.attrs.w) || 1; const H = Number(p.attrs.h) || 1;
    const pt = (n) => { const x = Number(n.attrs.x) / W * 100; const y = Number(n.attrs.y) / H * 100; return `${x.toFixed(2)} ${y.toFixed(2)}`; };
    for (const c of X.children(p)) {
      const pts = X.children(c, 'a:pt');
      if (c.name === 'a:moveTo' && pts[0]) out.push(`M${pt(pts[0])}`);
      else if (c.name === 'a:lnTo' && pts[0]) out.push(`L${pt(pts[0])}`);
      else if (c.name === 'a:cubicBezTo' && pts.length === 3) out.push(`C${pts.map(pt).join(' ')}`);
      else if (c.name === 'a:quadBezTo' && pts.length === 2) out.push(`Q${pts.map(pt).join(' ')}`);
      else if (c.name === 'a:close') out.push('Z');
      // a:arcTo: approssimato con il tratto fino al punto successivo
    }
  }
  return out.length ? out.join('') : null;
}

// Riduzione automatica del testo: 1 = nessuna, 0.9 = testo ridotto al 90% per entrare nella forma
function fontScaleOf(txBody) {
  const bp = txBody && X.child(txBody, 'a:bodyPr');
  const na = bp && X.child(bp, 'a:normAutofit');
  if (!na) return null;
  return na.attrs.fontScale ? Number(na.attrs.fontScale) / 100000 : 1;
}

module.exports = { nativeSections, metaExtra, fontsUsed, tableDetail, custGeomPath, fontScaleOf };
