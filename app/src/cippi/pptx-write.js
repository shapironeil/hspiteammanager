'use strict';
// Cippi: scrittura di una presentazione PowerPoint a partire da quella di origine (o da un modello).
//
// build(sorgente, slides, modifiche) -> Buffer .pptx
//   slides = [{ src: numero della slide di origine (1..), texts: { <id forma>: ['riga', { text, lvl }] },
//              cells: { <id tabella>: { "riga,colonna": ['riga di testo'] } }, tableRows: { <id tabella>: [{ after, cells }] } }]
//   modifiche = { replace: [{ find, replace, matchCase, whole }] } applicate a layout e master (piè di pagina, loghi con testo)
//   - l'ordine dell'elenco e' l'ordine della nuova presentazione;
//   - una slide di origine non elencata viene tolta (con le sue note);
//   - una slide elencata due volte viene duplicata (per i documenti nati da un modello);
//   - texts sostituisce i paragrafi del testo di quella forma mantenendo lo stile del primo paragrafo.
// Tutto il resto (master, layout, tema, immagini, forme) resta quello di origine: il risultato si apre in PowerPoint
// con la stessa grafica.
const posix = require('node:path').posix;
const { readZip, writeZip } = require('../celle/zip');
const E = require('./pptx-edit');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const relsOf = (part) => posix.join(posix.dirname(part), '_rels', posix.basename(part) + '.rels');
const REL_SLIDE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';
const CT_SLIDE = 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml';

function parseRels(xml) {
  return [...String(xml || '').matchAll(/<Relationship\b([^>]*?)\/?>/g)].map((m) => {
    const a = {};
    m[1].replace(/([\w:]+)="([^"]*)"/g, (x, k, v) => { a[k] = v; });
    return a;
  });
}
const relsXml = (list) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map((r) => `<Relationship Id="${esc(r.Id)}" Type="${esc(r.Type)}" Target="${esc(r.Target)}"${r.TargetMode ? ` TargetMode="${esc(r.TargetMode)}"` : ''}/>`).join('')}</Relationships>`;

// Sostituisce il testo di una forma (p:sp con cNvPr id=...) mantenendo lo stile dei paragrafi esistenti
function replaceShapeText(xml, id, lines) {
  const at = xml.search(new RegExp(`<p:cNvPr\\b[^>]*\\bid="${String(id).replace(/\D/g, '')}"`));
  if (at < 0) return xml;
  const start = Math.max(xml.lastIndexOf('<p:sp>', at), xml.lastIndexOf('<p:sp ', at));
  if (start < 0 || xml.lastIndexOf('</p:sp>', at) > start) return xml; // non e' una forma con testo
  const end = xml.indexOf('</p:sp>', at);
  const sp = xml.slice(start, end);
  const tb = /<p:txBody>([\s\S]*?)<\/p:txBody>/.exec(sp);
  if (!tb) return xml;
  const body = tb[1];
  const head = (/^([\s\S]*?)(?=<a:p>|<a:p\s|$)/.exec(body) || ['', ''])[1]; // bodyPr + lstStyle
  const paras = [...body.matchAll(/<a:p>[\s\S]*?<\/a:p>|<a:p\s[^>]*>[\s\S]*?<\/a:p>|<a:p\/>/g)].map((m) => m[0]);
  const styleOf = (p) => ({
    pPr: (/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/.exec(p || '') || [''])[0],
    rPr: (/<a:rPr\b[^>]*\/>|<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/.exec(p || '') || ['<a:rPr lang="it-IT" dirty="0"/>'])[0],
  });
  // lo stile di riferimento: il paragrafo nella stessa posizione, altrimenti il primo con del testo
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
  const newSp = sp.replace(tb[0], `<p:txBody>${head}${out.join('') || '<a:p/>'}</p:txBody>`);
  return xml.slice(0, start) + newSp + xml.slice(end);
}

// Trova la forma (p:sp) con quell'id: { start, end } nel testo XML della slide
function shapeRange(xml, id) {
  const at = xml.search(new RegExp(`<p:cNvPr\\b[^>]*\\bid="${String(id).replace(/\D/g, '')}"`));
  if (at < 0) return null;
  const start = Math.max(xml.lastIndexOf('<p:sp>', at), xml.lastIndexOf('<p:sp ', at));
  if (start < 0 || xml.lastIndexOf('</p:sp>', at) > start) return null;
  return { start, end: xml.indexOf('</p:sp>', at) };
}
// Cambia la forma geometrica (es. rettangolo -> rombo) mantenendo posizione, testo e stile
function replaceShapeGeom(xml, id, prst) {
  const r = shapeRange(xml, id);
  if (!r) return xml;
  let sp = xml.slice(r.start, r.end);
  if (/<a:prstGeom\b/.test(sp)) sp = sp.replace(/<a:prstGeom\b[^>]*prst="[^"]*"[^>]*(\/>|>[\s\S]*?<\/a:prstGeom>)/, `<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>`);
  else if (/<a:custGeom\b/.test(sp)) sp = sp.replace(/<a:custGeom\b[\s\S]*?<\/a:custGeom>/, `<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>`);
  else sp = sp.replace(/(<a:xfrm\b[\s\S]*?<\/a:xfrm>)/, `$1<a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>`);
  return xml.slice(0, r.start) + sp + xml.slice(r.end);
}
// Cambia il colore di riempimento (es. verde = step nuovo, giallo = modificato, come dice la legenda)
function replaceShapeFill(xml, id, hex) {
  const r = shapeRange(xml, id);
  if (!r) return xml;
  let sp = xml.slice(r.start, r.end);
  const spPr = /<p:spPr\b[^>]*>([\s\S]*?)<\/p:spPr>/.exec(sp);
  if (!spPr) return xml;
  let inner = spPr[1].replace(/<a:(solidFill|gradFill|noFill|pattFill)\b[\s\S]*?<\/a:\1>|<a:noFill\/>/, '\u0000');
  const fill = `<a:solidFill><a:srgbClr val="${hex}"/></a:solidFill>`;
  // il riempimento va dopo la geometria e prima della linea
  if (inner.includes('\u0000')) inner = inner.replace('\u0000', fill);
  else if (/<a:ln\b/.test(inner)) inner = inner.replace(/<a:ln\b/, `${fill}<a:ln`);
  else inner += fill;
  sp = sp.replace(spPr[0], spPr[0].replace(spPr[1], inner));
  return xml.slice(0, r.start) + sp + xml.slice(r.end);
}

function build(srcBuf, slides, edits = {}) {
  const replaces = Array.isArray(edits && edits.replace) ? edits.replace.filter((r) => r && r.find) : [];
  const zip = readZip(srcBuf);
  const files = new Map([...zip].map(([k, f]) => [k, f]));
  const txt = (name) => (files.has(name) ? (typeof files.get(name) === 'function' ? files.get(name)().toString('utf8') : files.get(name).toString('utf8')) : null);
  const put = (name, data) => files.set(name, Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'));

  let pres = txt('ppt/presentation.xml');
  const presRelsName = 'ppt/_rels/presentation.xml.rels';
  const presRels = parseRels(txt(presRelsName));
  const ids = [...pres.matchAll(/<p:sldId\b[^>]*\bid="(\d+)"[^>]*\br:id="([^"]+)"[^>]*\/>/g)].map((m) => ({ id: m[1], rid: m[2] }));
  const source = ids.map((s) => ({ ...s, part: posix.normalize(posix.join('ppt', presRels.find((r) => r.Id === s.rid).Target)) }));
  if (!slides.length) throw Object.assign(new Error('La presentazione deve avere almeno una slide.'), { status: 400 });
  for (const s of slides) if (!source[s.src - 1]) throw Object.assign(new Error(`Slide di origine ${s.src} inesistente.`), { status: 400 });

  let ct = txt('[Content_Types].xml');
  let maxSlide = Math.max(0, ...[...files.keys()].map((k) => (/^ppt\/slides\/slide(\d+)\.xml$/.exec(k) || [0, 0])[1]).map(Number));
  let maxId = Math.max(255, ...ids.map((s) => Number(s.id)));
  let maxRid = Math.max(0, ...presRels.map((r) => Number((/^rId(\d+)$/.exec(r.Id) || [0, 0])[1])));
  const used = new Set();
  const order = []; // { id, rid, part, srcId }
  for (const s of slides) {
    const orig = source[s.src - 1];
    let part = orig.part;
    let entry;
    if (!used.has(orig.part)) {
      used.add(orig.part);
      entry = { id: orig.id, rid: orig.rid, part, srcId: orig.id };
    } else {
      // duplicato: nuova parte con le stesse relazioni (senza note e commenti, che restano all'originale)
      part = `ppt/slides/slide${++maxSlide}.xml`;
      put(part, txt(orig.part));
      const rels = parseRels(txt(relsOf(orig.part))).filter((r) => !/\/(notesSlide|comments)$/.test(r.Type));
      put(relsOf(part), relsXml(rels));
      ct = ct.replace('</Types>', `<Override PartName="/${part}" ContentType="${CT_SLIDE}"/></Types>`);
      const rid = `rId${++maxRid}`;
      presRels.push({ Id: rid, Type: REL_SLIDE, Target: posix.relative('ppt', part) });
      entry = { id: String(++maxId), rid, part, srcId: orig.id };
    }
    if ((s.texts && Object.keys(s.texts).length) || s.geom || s.fill) {
      let x = txt(part);
      for (const [id, lines] of Object.entries(s.texts || {})) if (Array.isArray(lines)) x = replaceShapeText(x, id, lines);
      for (const [id, prst] of Object.entries(s.geom || {})) if (/^[A-Za-z0-9]+$/.test(prst)) x = replaceShapeGeom(x, id, prst);
      for (const [id, hex] of Object.entries(s.fill || {})) if (/^[0-9A-F]{6}$/i.test(hex)) x = replaceShapeFill(x, id, hex);
      put(part, x);
    }
    // tabelle: testo delle celle e righe nuove (clonate da una riga esistente)
    if ((s.cells && Object.keys(s.cells).length) || (s.tableRows && Object.keys(s.tableRows).length)) {
      let x = txt(part);
      for (const [fid, cells] of Object.entries(s.cells || {})) x = E.setTableCells(x, fid, cells);
      for (const [fid, rows] of Object.entries(s.tableRows || {})) if (Array.isArray(rows)) x = E.addTableRows(x, fid, rows);
      put(part, x);
    }
    order.push(entry);
  }

  // slide tolte: via dalla presentazione, dalle relazioni, dal pacchetto (con le loro note)
  const removed = source.filter((s) => !used.has(s.part));
  const removedParts = new Set(removed.map((s) => s.part));
  for (const s of removed) {
    const rels = parseRels(txt(relsOf(s.part)));
    for (const r of rels.filter((x) => /\/notesSlide$/.test(x.Type))) {
      const np = posix.normalize(posix.join(posix.dirname(s.part), r.Target));
      files.delete(np); files.delete(relsOf(np));
      ct = ct.replace(new RegExp(`<Override PartName="/${np.replace(/[.]/g, '\\.')}"[^>]*/>`), '');
    }
    files.delete(s.part); files.delete(relsOf(s.part));
    ct = ct.replace(new RegExp(`<Override PartName="/${s.part.replace(/[.]/g, '\\.')}"[^>]*/>`), '');
  }
  const keptRels = presRels.filter((r) => !(r.Type === REL_SLIDE && removedParts.has(posix.normalize(posix.join('ppt', r.Target)))));
  put(presRelsName, relsXml(keptRels));
  // collegamenti verso slide tolte (per esempio i pulsanti "Back"): si tolgono, il resto resta valido
  for (const e of order) {
    const rels = parseRels(txt(relsOf(e.part)));
    const dead = rels.filter((r) => /\/slide$/.test(r.Type) && removedParts.has(posix.normalize(posix.join(posix.dirname(e.part), r.Target))));
    if (!dead.length) continue;
    let x = txt(e.part);
    for (const r of dead) x = x.replace(new RegExp(`<a:hlinkClick\\b[^>]*r:id="${r.Id}"[^>]*/>|<a:hlinkClick\\b[^>]*r:id="${r.Id}"[^>]*>[\\s\\S]*?</a:hlinkClick>`, 'g'), '');
    put(e.part, x);
    put(relsOf(e.part), relsXml(rels.filter((r) => !dead.includes(r))));
  }
  // elenco delle slide nel nuovo ordine
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${order.map((e) => `<p:sldId id="${e.id}" r:id="${e.rid}"/>`).join('')}</p:sldIdLst>`);
  // sezioni di PowerPoint (se ci sono): via le slide tolte, i duplicati accanto all'originale
  pres = pres.replace(/<p14:sldIdLst>([\s\S]*?)<\/p14:sldIdLst>/g, (m, inner) => {
    const list = [...inner.matchAll(/<p14:sldId id="(\d+)"\/>/g)].map((x) => x[1]);
    const out = [];
    for (const id of list) for (const e of order.filter((o) => o.srcId === id)) out.push(e.id);
    return `<p14:sldIdLst>${out.map((id) => `<p14:sldId id="${id}"/>`).join('')}</p14:sldIdLst>`;
  });
  // presentazioni personalizzate che citano slide tolte: si tolgono quelle voci
  pres = pres.replace(/<p:sld r:id="([^"]+)"\/>/g, (m, rid) => (keptRels.some((r) => r.Id === rid) ? m : ''));
  put('ppt/presentation.xml', pres);
  put('[Content_Types].xml', ct);
  const app = txt('docProps/app.xml');
  if (app) put('docProps/app.xml', app.replace(/<Slides>\d+<\/Slides>/, `<Slides>${order.length}</Slides>`));
  // trova e sostituisci nei layout e nei master (piè di pagina, scritte fisse): le slide hanno gia' i testi nuovi
  if (replaces.length) {
    for (const name of [...files.keys()].filter((k) => /^ppt\/(slideLayouts|slideMasters)\/[^/]+\.xml$/.test(k))) {
      let x = txt(name); let changed = false;
      for (const r of replaces) { const out = E.replaceText(x, r.find, r.replace, r); if (out.count) { x = out.xml; changed = true; } }
      if (changed) put(name, x);
    }
  }
  // il registro delle revisioni di PowerPoint cita slide che possono non esistere piu': non serve al file
  for (const k of [...files.keys()]) if (/^ppt\/changesInfos\//.test(k)) files.delete(k);
  if (txt(presRelsName).includes('changesInfo')) put(presRelsName, relsXml(keptRels.filter((r) => !/changesInfo/.test(r.Type))));
  ct = txt('[Content_Types].xml').replace(/<Override PartName="\/ppt\/changesInfos\/[^"]*"[^>]*\/>/g, '');
  put('[Content_Types].xml', ct);

  // via i media che nessuna slide usa piu'; contatori di slide e note aggiornati
  E.cleanPackage(files);
  const entries = [];
  // [Content_Types].xml per primo, come fa PowerPoint
  const names = [...files.keys()].sort((a, b) => (a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : 0));
  for (const name of names) {
    const v = files.get(name);
    entries.push({ name, data: typeof v === 'function' ? v() : v });
  }
  return writeZip(entries);
}

module.exports = { build, replaceShapeText, replaceShapeGeom, replaceShapeFill };
