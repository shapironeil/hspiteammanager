'use strict';
// Lettura di un file PowerPoint (.pptx) senza librerie: slide nell'ordine della presentazione, layout, colori del tema,
// e per ogni slide TUTTI gli elementi (forme, testi con i livelli dei punti elenco, immagini, tabelle, connettori
// con le forme che collegano, gruppi) con posizione e dimensione in percentuale della slide.
// Il risultato e' un oggetto JSON puro: lo usano analyze.js (struttura, flussi, punti chiave) e la pagina di Cippi
// (anteprima delle slide). E' codice puro, senza accesso al portale: puo' girare anche nel motore di HSPI Client.
const posix = require('node:path').posix;
const { readZip } = require('../celle/zip');
const X = require('./xml');
const extra = require('./pptx-extra');
const { gantt } = require('./gantt-svg');

const EMU_CM = 360000;
const relsPath = (part) => posix.join(posix.dirname(part), '_rels', posix.basename(part) + '.rels');

function readRels(files, part) {
  const out = {};
  const f = files.get(relsPath(part));
  if (!f) return out;
  for (const r of X.findAll(X.parse(f().toString('utf8')), 'Relationship')) {
    const target = r.attrs.TargetMode === 'External' ? r.attrs.Target : posix.normalize(posix.join(posix.dirname(part), r.attrs.Target));
    out[r.attrs.Id] = { type: r.attrs.Type.split('/').pop(), target, external: r.attrs.TargetMode === 'External' };
  }
  return out;
}
const xmlOf = (files, part) => { const f = files.get(part); return f ? X.parse(f().toString('utf8')) : null; };

// ---- Colori -----------------------------------------------------------------------------------
const PRESET = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080' };
const SCHEME_ALIAS = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };
function themeColors(theme) {
  const out = {};
  const scheme = theme && X.find(theme, 'a:clrScheme');
  for (const c of X.children(scheme)) {
    const v = X.child(c, 'a:srgbClr') || X.child(c, 'a:sysClr');
    if (v) out[c.name.replace('a:', '')] = (v.attrs.val && v.name === 'a:srgbClr' ? v.attrs.val : v.attrs.lastClr || '000000').toUpperCase();
  }
  return out;
}
function color(node, theme) {
  if (!node) return null;
  const c = X.child(node, 'a:srgbClr') || X.child(node, 'a:schemeClr') || X.child(node, 'a:prstClr') || X.child(node, 'a:sysClr');
  if (!c) return null;
  if (c.name === 'a:srgbClr') return c.attrs.val.toUpperCase();
  if (c.name === 'a:prstClr') return PRESET[c.attrs.val] || null;
  if (c.name === 'a:sysClr') return (c.attrs.lastClr || '000000').toUpperCase();
  const key = SCHEME_ALIAS[c.attrs.val] || c.attrs.val;
  return theme[key] || null;
}
function fillOf(spPr, theme) {
  if (!spPr) return undefined;
  if (X.child(spPr, 'a:noFill')) return null;
  const solid = X.child(spPr, 'a:solidFill');
  if (solid) return color(solid, theme);
  const grad = X.child(spPr, 'a:gradFill');
  if (grad) { const gs = X.find(grad, 'a:gs'); return gs ? color(gs, theme) : null; }
  return undefined; // non indicato: dipende dallo stile
}
function lineOf(spPr, theme) {
  const ln = spPr && X.child(spPr, 'a:ln');
  if (!ln) return undefined;
  if (X.child(ln, 'a:noFill')) return null;
  const dash = X.child(ln, 'a:prstDash');
  return { color: color(X.child(ln, 'a:solidFill'), theme), dash: dash ? dash.attrs.val : 'solid', w: Number(ln.attrs.w || 9525), tail: (X.child(ln, 'a:tailEnd') || { attrs: {} }).attrs.type || 'none', head: (X.child(ln, 'a:headEnd') || { attrs: {} }).attrs.type || 'none' };
}
// Colore "di stile" (p:style) quando la forma non ne indica uno suo
function styleColor(sp, ref, theme) {
  const st = X.child(sp, 'p:style');
  const r = st && X.child(st, ref);
  return r ? color(r, theme) : null;
}

// ---- Testo ------------------------------------------------------------------------------------
function paragraphs(txBody, theme) {
  if (!txBody) return [];
  const out = [];
  for (const p of X.children(txBody, 'a:p')) {
    const pPr = X.child(p, 'a:pPr');
    let s = '';
    let bold = false; let size = null; let col = null; let italic = false;
    for (const r of X.children(p)) {
      if (r.name === 'a:r' || r.name === 'a:fld') {
        const t = X.text(X.child(r, 'a:t'));
        const rPr = X.child(r, 'a:rPr');
        if (rPr && t.trim()) {
          if (rPr.attrs.b === '1') bold = true;
          if (rPr.attrs.i === '1') italic = true;
          if (rPr.attrs.sz && !size) size = Number(rPr.attrs.sz) / 100;
          if (!col) col = color(X.child(rPr, 'a:solidFill'), theme);
        }
        s += t;
      } else if (r.name === 'a:br') s += '\n';
    }
    s = s.replace(/[​ ]/g, (c) => (c === ' ' ? ' ' : '')).replace(/[ \t]+$/g, '');
    out.push({
      text: s, lvl: Number((pPr && pPr.attrs.lvl) || 0), bold, italic, size, color: col,
      bullet: !!(pPr && (X.child(pPr, 'a:buChar') || X.child(pPr, 'a:buAutoNum'))), noBullet: !!(pPr && X.child(pPr, 'a:buNone')),
      align: (pPr && pPr.attrs.algn) || null,
    });
  }
  // via le righe vuote in coda
  while (out.length && !out[out.length - 1].text.trim()) out.pop();
  return out;
}

// ---- Forme ------------------------------------------------------------------------------------
function xfrmOf(spPr) {
  const xf = spPr && X.child(spPr, 'a:xfrm');
  if (!xf) return null;
  const off = X.child(xf, 'a:off'); const ext = X.child(xf, 'a:ext');
  if (!off || !ext) return null;
  return { x: Number(off.attrs.x), y: Number(off.attrs.y), w: Number(ext.attrs.cx), h: Number(ext.attrs.cy), rot: Number(xf.attrs.rot || 0) / 60000, flipH: xf.attrs.flipH === '1', flipV: xf.attrs.flipV === '1' };
}
// trasformazione di un gruppo: coordinate dei figli -> coordinate della slide
function groupMap(grpSpPr, parent) {
  const xf = grpSpPr && X.child(grpSpPr, 'a:xfrm');
  if (!xf) return parent;
  const off = X.child(xf, 'a:off'); const ext = X.child(xf, 'a:ext'); const choff = X.child(xf, 'a:chOff'); const chext = X.child(xf, 'a:chExt');
  if (!off || !ext || !choff || !chext) return parent;
  const sx = Number(chext.attrs.cx) ? Number(ext.attrs.cx) / Number(chext.attrs.cx) : 1;
  const sy = Number(chext.attrs.cy) ? Number(ext.attrs.cy) / Number(chext.attrs.cy) : 1;
  const local = (r) => ({ ...r, x: Number(off.attrs.x) + (r.x - Number(choff.attrs.x)) * sx, y: Number(off.attrs.y) + (r.y - Number(choff.attrs.y)) * sy, w: r.w * sx, h: r.h * sy });
  return (r) => parent(local(r));
}

function placeholderInfo(nv) {
  const ph = nv && X.find(nv, 'p:ph');
  return ph ? { type: ph.attrs.type || 'body', idx: ph.attrs.idx || null } : null;
}

// Forme di un albero (slide, layout o master), gruppi compresi
function shapesOf(tree, ctx, map = (r) => r, groupId = null, out = []) {
  for (const n of X.children(tree)) {
    const kind = { 'p:sp': 'sp', 'p:pic': 'pic', 'p:cxnSp': 'cxn', 'p:grpSp': 'group', 'p:graphicFrame': 'frame' }[n.name];
    if (!kind) continue;
    const nv = X.child(n, { sp: 'p:nvSpPr', pic: 'p:nvPicPr', cxn: 'p:nvCxnSpPr', group: 'p:nvGrpSpPr', frame: 'p:nvGraphicFramePr' }[kind]);
    const c = X.child(nv, 'p:cNvPr') || { attrs: {} };
    const base = { id: c.attrs.id || null, name: c.attrs.name || '', hidden: c.attrs.hidden === '1', z: out.length, group: groupId };
    if (kind === 'group') {
      const g = { ...base, kind: 'group' };
      const r = xfrmOf(X.child(n, 'p:grpSpPr'));
      if (r) Object.assign(g, map(r));
      out.push(g);
      shapesOf(n, ctx, groupMap(X.child(n, 'p:grpSpPr'), map), g.id, out);
      continue;
    }
    const spPr = X.child(n, 'p:spPr');
    let r = kind === 'frame' ? xfrmOf({ children: [X.child(n, 'p:xfrm') && { ...X.child(n, 'p:xfrm'), name: 'a:xfrm' }].filter(Boolean) }) : xfrmOf(spPr);
    const ph = placeholderInfo(nv);
    if (!r && ph && ctx.inherit) r = ctx.inherit(ph);
    const s = { ...base, kind, ph, ...(r ? map(r) : {}) };
    if (r) { s.rot = r.rot; s.flipH = r.flipH; s.flipV = r.flipV; }
    const geom = spPr && X.child(spPr, 'a:prstGeom');
    s.geom = geom ? geom.attrs.prst : (spPr && X.child(spPr, 'a:custGeom') ? 'custom' : null);
    if (kind === 'sp' || kind === 'cxn' || kind === 'pic') {
      const f = fillOf(spPr, ctx.theme);
      s.fill = f !== undefined ? f : styleColor(n, 'a:fillRef', ctx.theme);
      const l = lineOf(spPr, ctx.theme);
      s.line = l !== undefined ? l : (X.child(n, 'p:style') ? { color: styleColor(n, 'a:lnRef', ctx.theme), dash: 'solid', w: 9525, tail: 'none', head: 'none' } : null);
      if (s.line && !s.line.color && X.child(n, 'p:style')) s.line.color = styleColor(n, 'a:lnRef', ctx.theme);
    }
    if (kind === 'sp') {
      const txBody = X.child(n, 'p:txBody');
      s.paragraphs = paragraphs(txBody, ctx.theme);
      s.textbox = (X.child(nv, 'p:cNvSpPr') || { attrs: {} }).attrs.txBox === '1';
      // testo ridotto da PowerPoint per entrare nella forma (0.9 = 90%)
      const fsc = extra.fontScaleOf(txBody);
      if (fsc !== null && fsc < 1) s.fontScale = fsc;
      // geometria personalizzata: percorso SVG in un riquadro 0..100, per l'anteprima
      if (s.geom === 'custom') { const d = extra.custGeomPath(spPr); if (d) s.path = d; }
    }
    // regolazioni della geometria (per i connettori a gomito: dove piegano)
    const av = geom && X.child(geom, 'a:avLst');
    if (av) for (const gd of X.children(av, 'a:gd')) { const m = /val\s+(-?\d+)/.exec(gd.attrs.fmla || ''); if (m) { s.adj = s.adj || {}; s.adj[gd.attrs.name] = Number(m[1]); } }
    if (kind === 'cxn') {
      const cn = X.child(nv, 'p:cNvCxnSpPr');
      const st = X.child(cn, 'a:stCxn'); const en = X.child(cn, 'a:endCxn');
      s.from = st ? st.attrs.id : null;
      s.to = en ? en.attrs.id : null;
    }
    if (kind === 'pic') {
      const blip = X.find(n, 'a:blip');
      const rid = blip && (blip.attrs['r:embed'] || blip.attrs['r:link']);
      const svg = blip && X.find(blip, 'asvg:svgBlip');
      const rel = ctx.rels[(svg && svg.attrs['r:embed']) || rid];
      if (rel) s.image = rel.target;
      s.descr = c.attrs.descr || '';
    }
    if (kind === 'frame') {
      const tbl = X.find(n, 'a:tbl');
      if (tbl) {
        s.kind = 'table';
        s.rows = X.children(tbl, 'a:tr').map((tr) => X.children(tr, 'a:tc').map((tc) => paragraphs(X.child(tc, 'a:txBody'), ctx.theme).map((p) => p.text).join('\n').trim()));
        // celle unite, riempimenti, grassetti, larghezze delle colonne, stile
        Object.assign(s, extra.tableDetail(tbl, (node) => color(node, ctx.theme), (tb) => paragraphs(tb, ctx.theme)));
      } else {
        const gd = X.find(n, 'a:graphicData');
        const uri = (gd && gd.attrs.uri) || '';
        s.kind = /chart/.test(uri) ? 'chart' : /diagram/.test(uri) ? 'diagram' : 'object';
        if (s.kind === 'diagram') {
          // SmartArt: i testi stanno nel disegno precalcolato
          const dm = X.find(n, 'dgm:relIds');
          const rel = dm && ctx.rels[dm.attrs['r:dm']];
          const data = rel && ctx.files && xmlOf(ctx.files, rel.target);
          s.items = data ? X.findAll(data, 'a:p').map((p) => X.findAll(p, 'a:t').map(X.text).join('').trim()).filter(Boolean) : [];
        }
      }
    }
    out.push(s);
  }
  return out;
}

function treeOf(doc) { return X.find(doc, 'p:spTree'); }

// Posizioni dei segnaposto di layout e master (per i segnaposto della slide senza posizione propria)
function phIndex(shapes) {
  const byIdx = {}; const byType = {};
  for (const s of shapes) {
    if (!s.ph || s.x === undefined) continue;
    const r = { x: s.x, y: s.y, w: s.w, h: s.h, rot: 0 };
    if (s.ph.idx) byIdx[s.ph.idx] = byIdx[s.ph.idx] || r;
    byType[s.ph.type] = byType[s.ph.type] || r;
  }
  return (ph) => (ph.idx && byIdx[ph.idx]) || byType[ph.type] || (ph.type === 'ctrTitle' && byType.title) || (ph.type === 'title' && byType.ctrTitle) || null;
}

const layoutCache = new WeakMap();
function readLayout(files, part, theme) {
  const cache = layoutCache.get(files) || new Map();
  layoutCache.set(files, cache);
  if (cache.has(part)) return cache.get(part);
  const doc = xmlOf(files, part);
  const rels = readRels(files, part);
  const masterRel = Object.values(rels).find((r) => r.type === 'slideMaster');
  let masterFind = () => null;
  if (masterRel) {
    const mdoc = xmlOf(files, masterRel.target);
    masterFind = phIndex(shapesOf(treeOf(mdoc), { theme, rels: readRels(files, masterRel.target) }));
  }
  const shapes = doc ? shapesOf(treeOf(doc), { theme, rels, inherit: masterFind }) : [];
  const own = phIndex(shapes);
  const cSld = doc && X.find(doc, 'p:cSld');
  const out = { name: (cSld && cSld.attrs.name) || posix.basename(part, '.xml'), find: (ph) => own(ph) || masterFind(ph), master: masterRel ? masterRel.target : null };
  cache.set(part, out);
  return out;
}

// Percorso di un connettore in coordinate della slide (EMU): segmenti dritti o a gomito, con ribaltamenti e rotazione.
// I connettori a gomito di PowerPoint sono spesso ruotati di 90/270 gradi: senza la rotazione le frecce andrebbero
// da un'altra parte e i collegamenti tra le forme sarebbero sbagliati.
function connectorPath(s) {
  const { w, h } = s;
  const a = (k, d) => (s.adj && s.adj[k] !== undefined ? s.adj[k] / 100000 : d);
  let pts;
  const g = s.geom || 'line';
  if (/bentConnector2|curvedConnector2/.test(g)) pts = [[0, 0], [w, 0], [w, h]];
  else if (/bentConnector3|curvedConnector3/.test(g)) { const xm = w * a('adj1', 0.5); pts = [[0, 0], [xm, 0], [xm, h], [w, h]]; }
  else if (/bentConnector4|curvedConnector4/.test(g)) { const x1 = w * a('adj1', 0.5); const y2 = h * a('adj2', 0.5); pts = [[0, 0], [x1, 0], [x1, y2], [w, y2], [w, h]]; }
  else if (/bentConnector5|curvedConnector5/.test(g)) { const x1 = w * a('adj1', 0.5); const y2 = h * a('adj2', 0.5); const x3 = w * a('adj3', 0.5); pts = [[0, 0], [x1, 0], [x1, y2], [x3, y2], [x3, h], [w, h]]; }
  else pts = [[0, 0], [w, h]];
  if (s.flipH) pts = pts.map(([x, y]) => [w - x, y]);
  if (s.flipV) pts = pts.map(([x, y]) => [x, h - y]);
  const rot = (s.rot || 0) * Math.PI / 180;
  if (rot) {
    const cx = w / 2; const cy = h / 2; const c = Math.cos(rot); const sn = Math.sin(rot);
    pts = pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * sn, cy + (x - cx) * sn + (y - cy) * c]);
  }
  return pts.map(([x, y]) => [s.x + x, s.y + y]);
}

// ---- Presentazione ----------------------------------------------------------------------------
function readPptx(buf) {
  const files = readZip(buf);
  const pres = xmlOf(files, 'ppt/presentation.xml');
  if (!pres) throw Object.assign(new Error('Non è un file PowerPoint (.pptx) valido.'), { status: 400 });
  const presRels = readRels(files, 'ppt/presentation.xml');
  const sz = X.find(pres, 'p:sldSz');
  const W = Number(sz ? sz.attrs.cx : 12192000);
  const H = Number(sz ? sz.attrs.cy : 6858000);
  // tema del primo master
  const firstMaster = Object.values(presRels).find((r) => r.type === 'slideMaster');
  const themeRel = firstMaster && Object.values(readRels(files, firstMaster.target)).find((r) => r.type === 'theme');
  const theme = themeColors(themeRel && xmlOf(files, themeRel.target));
  const fonts = (() => {
    const t = themeRel && xmlOf(files, themeRel.target);
    const major = t && X.find(X.find(t, 'a:majorFont'), 'a:latin');
    const minor = t && X.find(X.find(t, 'a:minorFont'), 'a:latin');
    return { major: major ? major.attrs.typeface : null, minor: minor ? minor.attrs.typeface : null };
  })();
  const pct = (s) => {
    if (s.x === undefined) return s;
    const o = { ...s, x: +(s.x / W * 100).toFixed(3), y: +(s.y / H * 100).toFixed(3), w: +(s.w / W * 100).toFixed(3), h: +(s.h / H * 100).toFixed(3) };
    if (s.kind === 'cxn' || (s.kind === 'sp' && /^(line|straightConnector1|bentConnector\d|curvedConnector\d)$/.test(s.geom || ''))) {
      o.pts = connectorPath(s).map(([px, py]) => [+(px / W * 100).toFixed(3), +(py / H * 100).toFixed(3)]);
    }
    return o;
  };
  const ids = X.children(X.child(pres, 'p:sldIdLst'), 'p:sldId');
  const slides = [];
  const idToN = {}; // id della slide in presentation.xml -> numero nella presentazione
  // forme di sfondo di layout e master (loghi, barre, numero di slide): quelle non segnaposto, una volta per layout
  const backgrounds = {};
  const backgroundOf = (layoutPart) => {
    if (!layoutPart) return [];
    if (backgrounds[layoutPart]) return backgrounds[layoutPart];
    const ldoc = xmlOf(files, layoutPart);
    const lrels = readRels(files, layoutPart);
    const out = [];
    const masterRel = Object.values(lrels).find((r) => r.type === 'slideMaster');
    if (masterRel && !(ldoc && ldoc.attrs.showMasterSp === '0')) {
      const mdoc = xmlOf(files, masterRel.target);
      if (mdoc) out.push(...shapesOf(treeOf(mdoc), { theme, rels: readRels(files, masterRel.target), files }).filter((s) => !s.ph));
    }
    if (ldoc) out.push(...shapesOf(treeOf(ldoc), { theme, rels: lrels, files }).filter((s) => !s.ph));
    backgrounds[layoutPart] = out.filter((s) => s.x !== undefined && !s.hidden && s.kind !== 'group').map(pct);
    return backgrounds[layoutPart];
  };
  ids.forEach((sid, i) => {
    const rel = presRels[sid.attrs['r:id']];
    if (!rel) return;
    const part = rel.target;
    const doc = xmlOf(files, part);
    if (!doc) return;
    const rels = readRels(files, part);
    const layoutRel = Object.values(rels).find((r) => r.type === 'slideLayout');
    const layout = layoutRel ? readLayout(files, layoutRel.target, theme) : { name: '', find: () => null };
    const shapes = shapesOf(treeOf(doc), { theme, rels, files, inherit: layout.find }).map(pct);
    const notesRel = Object.values(rels).find((r) => r.type === 'notesSlide');
    let notes = '';
    if (notesRel) {
      const nd = xmlOf(files, notesRel.target);
      const body = nd && shapesOf(treeOf(nd), { theme, rels: {} }).filter((s) => s.ph && s.ph.type === 'body');
      notes = (body || []).flatMap((s) => (s.paragraphs || []).map((p) => p.text)).join('\n').trim();
    }
    const show = doc.attrs.show !== '0';
    // un piano di progetto (Gantt) incollato come immagine SVG: i testi sono ancora leggibili
    for (const s of shapes) {
      if (s.kind === 'pic' && /\.svg$/i.test(s.image || '') && files.get(s.image)) {
        try { const g = gantt(files.get(s.image)().toString('utf8')); if (g) s.gantt = g; } catch { /* SVG non leggibile: resta un'immagine */ }
      }
    }
    const background = doc.attrs.showMasterSp === '0' ? [] : backgroundOf(layoutRel ? layoutRel.target : null);
    slides.push({ n: slides.length + 1, part, layout: layout.name, layoutPart: layoutRel ? layoutRel.target : null, hidden: !show, shapes, notes, background });
    idToN[sid.attrs.id] = slides.length;
  });
  const core = xmlOf(files, 'docProps/core.xml');
  const meta = core ? {
    title: X.text(X.find(core, 'dc:title')).trim(), author: X.text(X.find(core, 'dc:creator')).trim(),
    modifiedBy: X.text(X.find(core, 'cp:lastModifiedBy')).trim(), modified: X.text(X.find(core, 'dcterms:modified')).trim(),
  } : {};
  const layouts = [...new Set(Object.values(presRels).filter((r) => r.type === 'slideMaster').flatMap((m) => Object.values(readRels(files, m.target)).filter((r) => r.type === 'slideLayout').map((r) => readLayout(files, r.target, theme).name)))];
  // sezioni native di PowerPoint, metadati estesi (azienda, co-autori, revisioni) e caratteri usati davvero
  const sections = extra.nativeSections(pres, idToN);
  Object.assign(meta, extra.metaExtra(files, idToN));
  const fontsUsed = extra.fontsUsed(files);
  return { width: W, height: H, ratio: +(W / H).toFixed(4), widthCm: +(W / EMU_CM).toFixed(2), heightCm: +(H / EMU_CM).toFixed(2), theme, fonts, fontsUsed, meta, layouts, sections, slides };
}

// Un file del pacchetto (per le immagini dell'anteprima)
function mediaOf(buf, name) {
  if (!/^ppt\/media\/[\w.-]+$/.test(name)) return null;
  const f = readZip(buf).get(name);
  return f ? f() : null;
}

// Il testo XML delle parti il cui nome corrisponde (per esempio layout e master)
function partsXml(buf, re) {
  const out = {};
  for (const [name, f] of readZip(buf)) if (re.test(name)) out[name] = f().toString('utf8');
  return out;
}

module.exports = { readPptx, mediaOf, partsXml, EMU_CM };
