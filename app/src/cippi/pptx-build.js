'use strict';
// Cippi: costruzione di slide NUOVE dentro un pacchetto .pptx esistente (il modello aziendale), per funzioni e non
// slide per slide. Tutto senza librerie: si leggono e si riscrivono le parti XML del pacchetto.
//
//   const deck = openDeck(buffer);
//   deck.layouts()                                        -> i layout disponibili con i loro segnaposto
//   deck.addSlide({ layout, title, body, picture, table, date, notes, at })
//   deck.addAgenda({ items, current, from, dividers })   -> agenda numerata con l'indicatore della voce corrente
//   deck.setDate('26/02/2026')                            -> data nei segnaposto data delle slide (copertina)
//   deck.clean()                                          -> via layout, master, temi e immagini non usati
//   deck.save()                                           -> Buffer .pptx
//
// Il risultato si apre in PowerPoint con la grafica del modello: le slide nuove usano i segnaposto del layout
// (titolo, contenuto, immagine, data, numero), quindi ereditano posizioni, caratteri e colori.
const posix = require('node:path').posix;
const { readZip, writeZip } = require('../celle/zip');
const { replaceShapeText } = require('./pptx-write');

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const relsOf = (part) => posix.join(posix.dirname(part), '_rels', posix.basename(part) + '.rels');
const REL = (t) => `http://schemas.openxmlformats.org/officeDocument/2006/relationships/${t}`;
const CT = {
  slide: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
  notes: 'application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml',
};
const IMG_CT = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp' };
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const TABLE_STYLE = '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}'; // "Stile medio 2 - Colore 1", lo stile predefinito di PowerPoint
const EMU_PT = 12700;

function parseRels(xml) {
  return [...String(xml || '').matchAll(/<Relationship\b([^>]*?)\/?>/g)].map((m) => {
    const a = {};
    m[1].replace(/([\w:]+)="([^"]*)"/g, (x, k, v) => { a[k] = v; });
    return a;
  });
}
const relsXml = (list) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map((r) => `<Relationship Id="${esc(r.Id)}" Type="${esc(r.Type)}" Target="${esc(r.Target)}"${r.TargetMode ? ` TargetMode="${esc(r.TargetMode)}"` : ''}/>`).join('')}</Relationships>`;
const resolveTarget = (part, target) => posix.normalize(posix.join(posix.dirname(part), target));
const attr = (xml, name) => { const m = new RegExp(`\\b${name}="([^"]*)"`).exec(xml || ''); return m ? m[1] : null; };
const decodeXml = (s) => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&');

// Dimensioni in pixel di un'immagine (PNG, JPEG, GIF): servono a non deformarla nel segnaposto
function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}
function imageExt(buf, hint) {
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return 'png';
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  const e = String(hint || '').toLowerCase().replace(/^.*\./, '');
  return IMG_CT[e] ? e : null;
}

// ---- Segnaposto di un albero (slide, layout o master) ------------------------------------------
// Restituisce [{ type, idx, x, y, w, h, name, id }] in EMU; x e' null se la forma non ha una posizione propria.
function placeholdersOf(xml) {
  const out = [];
  for (const m of String(xml || '').matchAll(/<p:(sp|pic)>([\s\S]*?)<\/p:\1>/g)) {
    const sp = m[2];
    const ph = /<p:ph\b([^>]*)\/>/.exec(sp);
    if (!ph) continue;
    const rawType = attr(ph[1], 'type');
    const type = rawType || 'body';
    const idx = attr(ph[1], 'idx');
    const xf = /<a:xfrm[^>]*>\s*<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(sp);
    const nv = /<p:cNvPr\b([^>]*)>/.exec(sp) || /<p:cNvPr\b([^>]*)\/>/.exec(sp);
    out.push({ kind: m[1], type, rawType, idx, name: nv ? decodeXml(attr(nv[1], 'name')) : '', id: nv ? Number(attr(nv[1], 'id')) : 0,
      x: xf ? Number(xf[1]) : null, y: xf ? Number(xf[2]) : null, w: xf ? Number(xf[3]) : null, h: xf ? Number(xf[4]) : null,
      sz: (() => { const s = /<a:defRPr[^>]*\bsz="(\d+)"/.exec(sp) || /<a:rPr[^>]*\bsz="(\d+)"/.exec(sp); return s ? Number(s[1]) : null; })() });
  }
  return out;
}
const isBodyPh = (p) => !['title', 'ctrTitle', 'subTitle', 'dt', 'ftr', 'sldNum', 'pic', 'chart', 'tbl', 'dgm', 'media', 'clipArt', 'hdr', 'sldImg'].includes(p.type);

class Deck {
  constructor(buf) {
    const zip = readZip(buf);
    this.files = new Map([...zip].map(([k, f]) => [k, f]));
    this.pres = this.txt('ppt/presentation.xml');
    if (!this.pres) throw Object.assign(new Error('Non è un file PowerPoint (.pptx) valido.'), { status: 400 });
    const sz = /<p:sldSz cx="(\d+)" cy="(\d+)"/.exec(this.pres);
    this.W = sz ? Number(sz[1]) : 12192000;
    this.H = sz ? Number(sz[2]) : 6858000;
    this._layouts = null;
  }

  // ---- Pacchetto -----------------------------------------------------------------------------
  has(name) { return this.files.has(name); }
  raw(name) { const v = this.files.get(name); return v == null ? null : (typeof v === 'function' ? v() : v); }
  txt(name) { const b = this.raw(name); return b ? b.toString('utf8') : null; }
  put(name, data) { this.files.set(name, Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')); }
  rels(part) { return parseRels(this.txt(relsOf(part))); }
  setRels(part, list) { this.put(relsOf(part), relsXml(list)); }
  nextRid(list) { return `rId${Math.max(0, ...list.map((r) => Number((/^rId(\d+)$/.exec(r.Id) || [0, 0])[1]))) + 1}`; }
  addOverride(part, ct) {
    let x = this.txt('[Content_Types].xml');
    if (!x.includes(`PartName="/${part}"`)) x = x.replace('</Types>', `<Override PartName="/${part}" ContentType="${ct}"/></Types>`);
    this.put('[Content_Types].xml', x);
  }
  addDefault(ext, ct) {
    let x = this.txt('[Content_Types].xml');
    if (!new RegExp(`<Default Extension="${ext}"`, 'i').test(x)) x = x.replace('<Default ', `<Default Extension="${ext}" ContentType="${ct}"/><Default `);
    this.put('[Content_Types].xml', x);
  }
  nextPart(prefix, ext) {
    const n = Math.max(0, ...[...this.files.keys()].map((k) => Number((new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)\\.${ext}$`).exec(k) || [0, 0])[1]))) + 1;
    return `${prefix}${n}.${ext}`;
  }

  // ---- Slide e master --------------------------------------------------------------------------
  slideParts() {
    const rels = this.rels('ppt/presentation.xml');
    return [...this.pres.matchAll(/<p:sldId\b[^>]*\bid="(\d+)"[^>]*\br:id="([^"]+)"[^>]*\/>/g)].map((m) => {
      const r = rels.find((x) => x.Id === m[2]);
      return { id: m[1], rid: m[2], part: r ? resolveTarget('ppt/presentation.xml', r.Target) : null };
    }).filter((s) => s.part);
  }
  masters() {
    const rels = this.rels('ppt/presentation.xml');
    return [...this.pres.matchAll(/<p:sldMasterId\b[^>]*\br:id="([^"]+)"[^>]*\/>/g)].map((m) => {
      const r = rels.find((x) => x.Id === m[1]);
      return r ? resolveTarget('ppt/presentation.xml', r.Target) : null;
    }).filter(Boolean);
  }
  // I layout con i loro segnaposto (posizione ereditata dal master quando il layout non la indica)
  layouts() {
    if (this._layouts) return this._layouts;
    const out = [];
    for (const master of this.masters()) {
      const mx = this.txt(master);
      const mph = placeholdersOf(mx);
      const inherit = (p) => mph.find((q) => p.idx && q.idx === p.idx && q.x != null) || mph.find((q) => q.type === p.type && q.x != null)
        || (p.type === 'ctrTitle' ? mph.find((q) => q.type === 'title' && q.x != null) : null) || (isBodyPh(p) ? mph.find((q) => q.type === 'body' && q.x != null) : null) || null;
      for (const r of this.rels(master).filter((x) => x.Type === REL('slideLayout'))) {
        const part = resolveTarget(master, r.Target);
        const lx = this.txt(part);
        if (!lx) continue;
        const name = decodeXml((/<p:cSld\b[^>]*\bname="([^"]*)"/.exec(lx) || [0, posix.basename(part, '.xml')])[1]);
        const phs = placeholdersOf(lx).map((p) => {
          if (p.x != null) return p;
          const q = inherit(p);
          return q ? { ...p, x: q.x, y: q.y, w: q.w, h: q.h, sz: p.sz || q.sz } : p;
        });
        const fixed = [...lx.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)].filter((m) => !/<p:ph\b/.test(m[1]))
          .map((m) => [...m[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => decodeXml(t[1])).join('').trim()).filter(Boolean);
        out.push({ part, name, master, placeholders: phs, pictures: (lx.match(/<p:pic>/g) || []).length, fixedTexts: fixed,
          hasTitle: phs.some((p) => p.type === 'title' || p.type === 'ctrTitle'), bodies: phs.filter(isBodyPh).length, hasPicture: phs.some((p) => p.type === 'pic') });
      }
    }
    this._layouts = out;
    return out;
  }
  layoutOf(ref) {
    const all = this.layouts();
    if (!ref) return all[0];
    const byPart = all.find((l) => l.part === ref || posix.basename(l.part) === ref);
    if (byPart) return byPart;
    const key = String(ref).toLowerCase().trim();
    return all.find((l) => l.name.toLowerCase() === key) || all.find((l) => l.name.toLowerCase().replace(/^\d+_/, '') === key) || null;
  }
  // il layout usato da una slide di origine (per creare slide "come quella")
  layoutOfSlide(n) {
    const s = this.slideParts()[n - 1];
    const r = s && this.rels(s.part).find((x) => x.Type === REL('slideLayout'));
    return r ? this.layoutOf(resolveTarget(s.part, r.Target)) : null;
  }

  // ---- Slide nuova da un layout ------------------------------------------------------------------
  // opts: { layout, title, subtitle, body: ['riga', { text, lvl, bold, numbered }], body2, picture: { data, name },
  //         table: { rows: [[...]], header: true, widths: [...] }, date, notes, at (posizione 1..), section }
  addSlide(opts = {}) {
    const layout = this.layoutOf(opts.layout) || this.layouts()[0];
    if (!layout) throw Object.assign(new Error('Il modello non ha layout.'), { status: 400 });
    const phs = layout.placeholders;
    const shapes = [];
    let id = 2;
    const rels = [{ Id: 'rId1', Type: REL('slideLayout'), Target: posix.relative('ppt/slides', layout.part) }];
    const paraXml = (lines, { numbered = false, sz = null, bold = false, color = null, align = null } = {}) => {
      const list = (Array.isArray(lines) ? lines : String(lines == null ? '' : lines).split('\n')).map((l) => (typeof l === 'string' ? { text: l } : l || { text: '' }));
      if (!list.length) return '<a:p/>';
      return list.map((l) => {
        const lvl = Number(l.lvl) > 0 ? Math.min(8, Number(l.lvl)) : 0;
        const num = l.numbered !== undefined ? l.numbered : numbered;
        const pPr = `<a:pPr${lvl ? ` lvl="${lvl}"` : ''}${num ? ` marL="${457200 * (lvl + 1)}" indent="-457200"` : ''}${align ? ` algn="${align}"` : ''}>${num ? '<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>' : (l.bullet === false ? '<a:buNone/>' : '')}</a:pPr>`;
        const rPr = `<a:rPr lang="it-IT"${(l.sz || sz) ? ` sz="${l.sz || sz}"` : ''}${(l.bold || bold) ? ' b="1"' : ''}${l.italic ? ' i="1"' : ''}${(l.color || color) ? `><a:solidFill><a:srgbClr val="${esc(l.color || color)}"/></a:solidFill></a:rPr` : '/'}>`;
        const runs = String(l.text == null ? '' : l.text).split('\n').map((t, k) => `${k ? `<a:br>${rPr}</a:br>` : ''}<a:r>${rPr}<a:t>${esc(t)}</a:t></a:r>`).join('');
        return `<a:p>${pPr}${runs}</a:p>`;
      }).join('');
    };
    const phSp = (p, name, inner, extraNv = '') => {
      const phAttrs = `${p.rawType ? ` type="${p.rawType}"` : ''}${p.idx ? ` idx="${p.idx}"` : ''}`;
      return `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="${esc(name)}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph${phAttrs}/>${extraNv}</p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${inner}</p:txBody></p:sp>`;
    };
    const title = phs.find((p) => p.type === 'title' || p.type === 'ctrTitle');
    const sub = phs.find((p) => p.type === 'subTitle');
    const bodies = phs.filter(isBodyPh);
    const pic = phs.find((p) => p.type === 'pic');
    const dt = phs.find((p) => p.type === 'dt');
    const num = phs.find((p) => p.type === 'sldNum');
    if (title && opts.title !== undefined) shapes.push(phSp(title, 'Titolo', paraXml(opts.title)));
    if (sub && opts.subtitle !== undefined) shapes.push(phSp(sub, 'Sottotitolo', paraXml(opts.subtitle)));
    let bodyRect = bodies[0] && bodies[0].x != null ? bodies[0] : null;
    let usedBodies = 0;
    if (opts.body !== undefined && bodies[0]) { shapes.push(phSp(bodies[0], 'Contenuto', paraXml(opts.body, opts.bodyStyle || {}))); usedBodies = 1; }
    if (opts.body2 !== undefined && bodies[1]) { shapes.push(phSp(bodies[1], 'Contenuto 2', paraXml(opts.body2, opts.bodyStyle || {}))); usedBodies = 2; }
    if (dt && opts.date !== undefined) shapes.push(phSp(dt, 'Data', paraXml(opts.date)));
    if (num) shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Numero diapositiva"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldNum" sz="quarter"${num.idx ? ` idx="${num.idx}"` : ''}/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum"><a:rPr lang="it-IT"/><a:t>‹N›</a:t></a:fld></a:p></p:txBody></p:sp>`);
    // area libera per immagini e tabelle quando il layout non ha un segnaposto adatto
    const free = () => {
      const b = !usedBodies && bodyRect ? bodyRect : (bodies[usedBodies] && bodies[usedBodies].x != null ? bodies[usedBodies] : null);
      if (b) return b;
      const top = title && title.y != null ? title.y + title.h + Math.round(this.H * 0.02) : Math.round(this.H * 0.2);
      return { x: Math.round(this.W * 0.069), y: top, w: Math.round(this.W * 0.862), h: Math.round(this.H * 0.93) - top };
    };
    if (opts.picture && opts.picture.data) {
      const data = Buffer.isBuffer(opts.picture.data) ? opts.picture.data : Buffer.from(opts.picture.data);
      const ext = imageExt(data, opts.picture.name);
      if (!ext) throw Object.assign(new Error('Formato immagine non riconosciuto: usa PNG, JPEG o GIF.'), { status: 400 });
      const media = this.nextPart('ppt/media/image', ext);
      this.put(media, data);
      this.addDefault(ext, IMG_CT[ext]);
      const rid = this.nextRid(rels);
      rels.push({ Id: rid, Type: REL('image'), Target: posix.relative('ppt/slides', media) });
      const box = pic && pic.x != null ? pic : free();
      const size = imageSize(data);
      // dentro il riquadro, senza deformare, centrata
      let { x, y, w, h } = box;
      if (size && size.w && size.h) {
        const k = Math.min(box.w / size.w, box.h / size.h);
        w = Math.round(size.w * k); h = Math.round(size.h * k);
        x = box.x + Math.round((box.w - w) / 2); y = box.y + Math.round((box.h - h) / 2);
      }
      const ph = pic ? `<p:ph type="pic"${pic.idx ? ` idx="${pic.idx}"` : ''}/>` : '';
      shapes.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id++}" name="Immagine" descr="${esc(opts.picture.descr || opts.picture.name || '')}"/><p:cNvPicPr><a:picLocks noGrp="1" noChangeAspect="1"/></p:cNvPicPr><p:nvPr>${ph}</p:nvPr></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`);
    }
    if (opts.table && Array.isArray(opts.table.rows) && opts.table.rows.length) {
      const t = opts.table;
      const rows = t.rows.map((r) => (Array.isArray(r) ? r : [r]));
      const cols = Math.max(...rows.map((r) => r.length));
      const box = t.box || free();
      const weights = Array.isArray(t.widths) && t.widths.length === cols ? t.widths.map(Number) : rows[0].map(() => 1);
      const sum = weights.reduce((a, b) => a + b, 0) || cols;
      const widths = weights.map((w) => Math.round(box.w * w / sum));
      const rowH = Math.max(EMU_PT * 18, Math.min(Math.round(box.h / rows.length), EMU_PT * 36));
      const sz = t.sz || (rows.length > 10 ? 1000 : rows.length > 6 ? 1200 : 1400);
      const cell = (v, r) => {
        const val = v && typeof v === 'object' ? v : { text: v };
        const align = val.align || (r > 0 && /^[\s€%$.,\d-]+$/.test(String(val.text || '')) && String(val.text || '').trim() ? 'r' : null);
        const fill = val.fill ? `<a:solidFill><a:srgbClr val="${esc(val.fill)}"/></a:solidFill>` : '';
        return `<a:tc${val.span > 1 ? ` gridSpan="${val.span}"` : ''}><a:txBody><a:bodyPr/><a:lstStyle/>${paraXml([{ text: val.text == null ? '' : String(val.text), bold: val.bold || (r === 0 && t.header !== false), color: val.color || null }], { sz, align })}</a:txBody><a:tcPr>${fill}</a:tcPr></a:tc>`;
      };
      const trs = rows.map((r, i) => {
        const cells = []; let used = 0;
        for (const v of r) { cells.push(cell(v, i)); used += (v && typeof v === 'object' && v.span > 1) ? v.span : 1; }
        for (; used < cols; used++) cells.push('<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p/></a:txBody><a:tcPr/></a:tc>');
        return `<a:tr h="${rowH}">${cells.join('')}</a:tr>`;
      }).join('');
      shapes.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id++}" name="Tabella"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${widths.reduce((a, b) => a + b, 0)}" cy="${rowH * rows.length}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="${t.header === false ? 0 : 1}" bandRow="1"><a:tableStyleId>${t.style || TABLE_STYLE}</a:tableStyleId></a:tblPr><a:tblGrid>${widths.map((w) => `<a:gridCol w="${w}"/>`).join('')}</a:tblGrid>${trs}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
    }
    // forme libere aggiuntive (per esempio l'indicatore dell'agenda): xml gia' pronto
    for (const extra of opts.extraShapes || []) shapes.push(extra.replace(/\{ID\}/g, String(id++)));
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    const part = this.nextPart('ppt/slides/slide', 'xml');
    this.put(part, xml);
    this.setRels(part, rels);
    this.addOverride(part, CT.slide);
    const n = this.registerSlide(part, opts.at);
    if (opts.notes) this.setNotes(part, opts.notes);
    return { n, part, layout: layout.name, bodyRect: bodies[0] && bodies[0].x != null ? bodies[0] : null };
  }
  // la slide entra nell'elenco della presentazione (posizione 1.., in coda se manca) e nella sezione della slide precedente
  registerSlide(part, at) {
    const presRels = this.rels('ppt/presentation.xml');
    const rid = this.nextRid(presRels);
    presRels.push({ Id: rid, Type: REL('slide'), Target: posix.relative('ppt', part) });
    this.setRels('ppt/presentation.xml', presRels);
    const ids = [...this.pres.matchAll(/<p:sldId\b[^>]*\bid="(\d+)"/g)].map((m) => Number(m[1]));
    const id = Math.max(255, ...ids) + 1;
    const list = [...this.pres.matchAll(/<p:sldId\b[^>]*\/>/g)].map((m) => m[0]);
    const pos = at && Number(at) >= 1 && Number(at) <= list.length ? Number(at) - 1 : list.length;
    list.splice(pos, 0, `<p:sldId id="${id}" r:id="${rid}"/>`);
    this.pres = this.pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${list.join('')}</p:sldIdLst>`);
    // sezioni native di PowerPoint: accanto alla slide che precede, altrimenti nell'ultima sezione
    if (/<p14:sectionLst/.test(this.pres)) {
      const prev = pos > 0 ? Number((/id="(\d+)"/.exec(list[pos - 1]) || [])[1]) : null;
      let done = false;
      this.pres = this.pres.replace(/<p14:sldIdLst>([\s\S]*?)<\/p14:sldIdLst>/g, (m, inner) => {
        if (done) return m;
        if (prev != null && inner.includes(`<p14:sldId id="${prev}"/>`)) { done = true; return `<p14:sldIdLst>${inner.replace(`<p14:sldId id="${prev}"/>`, `<p14:sldId id="${prev}"/><p14:sldId id="${id}"/>`)}</p14:sldIdLst>`; }
        return m;
      });
      if (!done) {
        const sections = [...this.pres.matchAll(/<p14:sldIdLst>([\s\S]*?)<\/p14:sldIdLst>/g)];
        if (sections.length) {
          const target = prev == null ? sections[0] : sections[sections.length - 1];
          this.pres = this.pres.replace(target[0], `<p14:sldIdLst>${prev == null ? `<p14:sldId id="${id}"/>${target[1]}` : `${target[1]}<p14:sldId id="${id}"/>`}</p14:sldIdLst>`);
        }
      }
    }
    this.put('ppt/presentation.xml', this.pres);
    const app = this.txt('docProps/app.xml');
    if (app) this.put('docProps/app.xml', app.replace(/<Slides>\d+<\/Slides>/, `<Slides>${list.length}</Slides>`));
    return pos + 1;
  }
  setNotes(slidePart, text) {
    const nm = this.rels('ppt/presentation.xml').find((r) => r.Type === REL('notesMaster'));
    if (!nm) return false;
    const part = this.nextPart('ppt/notesSlides/notesSlide', 'xml');
    const paras = String(text).split('\n').map((t) => `<a:p><a:r><a:rPr lang="it-IT"/><a:t>${esc(t)}</a:t></a:r></a:p>`).join('');
    this.put(part, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:notes ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Segnaposto immagine diapositiva 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Segnaposto note 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paras}</p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`);
    this.setRels(part, [{ Id: 'rId1', Type: REL('notesMaster'), Target: posix.relative('ppt/notesSlides', resolveTarget('ppt/presentation.xml', nm.Target)) }, { Id: 'rId2', Type: REL('slide'), Target: posix.relative('ppt/notesSlides', slidePart) }]);
    this.addOverride(part, CT.notes);
    const rels = this.rels(slidePart).filter((r) => r.Type !== REL('notesSlide'));
    rels.push({ Id: this.nextRid(rels), Type: REL('notesSlide'), Target: posix.relative('ppt/slides', part) });
    this.setRels(slidePart, rels);
    return true;
  }

  // ---- Agenda --------------------------------------------------------------------------------
  // { items: ['Voce', ...], current: 0.., from: n (slide di origine da clonare, con elenco e rettangolo-indicatore),
  //   layout, title: 'Agenda', at, dividers: true -> una slide "Intestazione sezione" per ogni voce dopo l'agenda }
  // Con "from" si clona l'agenda del modello (caselle libere, numerazione automatica, rettangolo spostato sulla voce);
  // altrimenti si crea dal layout con un elenco numerato e un rettangolo-bordo come indicatore.
  addAgenda(opts = {}) {
    const items = (opts.items || []).map((x) => String(x)).filter(Boolean);
    if (!items.length) throw Object.assign(new Error('Agenda senza voci.'), { status: 400 });
    const current = opts.current == null ? -1 : Math.max(-1, Math.min(items.length - 1, Number(opts.current)));
    let made;
    const src = opts.from ? this.slideParts()[Number(opts.from) - 1] : null;
    if (src) made = this.cloneAgenda(src.part, items, current, opts);
    else {
      const layout = this.layoutOf(opts.layout) || this.layouts().find((l) => l.hasTitle && l.bodies >= 1) || this.layouts()[0];
      const body = layout.placeholders.filter(isBodyPh)[0];
      const sz = opts.sz || 2400;
      const extra = [];
      if (current >= 0 && body && body.x != null) {
        const line = Math.round((sz / 100) * 1.2 * EMU_PT + 10 * EMU_PT);
        const y = body.y + 45720 + current * line;
        extra.push(`<p:sp><p:nvSpPr><p:cNvPr id="{ID}" name="Indicatore"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${body.x - 300000}" y="${y}"/><a:ext cx="${body.w + 600000}" cy="${line - 2 * EMU_PT}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="19050"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:ln></p:spPr></p:sp>`);
      }
      made = this.addSlide({ layout: layout.part, title: opts.title || 'Agenda', body: items.map((t) => ({ text: t, numbered: true, bold: true, sz })), at: opts.at, extraShapes: extra });
    }
    const out = { agenda: made.n, dividers: [] };
    if (opts.dividers) {
      const div = this.layouts().find((l) => /intestazione sezione|section header/i.test(l.name)) || this.layouts().find((l) => l.hasTitle && !l.bodies) || null;
      let at = made.n + 1;
      items.forEach((t, i) => {
        const r = this.addSlide({ layout: div ? div.part : undefined, title: t, body: div && div.bodies ? `${i + 1} di ${items.length}` : undefined, at: opts.at ? at : undefined });
        out.dividers.push(r.n); at++;
      });
    }
    return out;
  }
  // clona l'agenda del modello: stessi testi liberi, numerazione automatica conservata, indicatore sulla voce corrente
  cloneAgenda(srcPart, items, current, opts) {
    let xml = this.txt(srcPart);
    const sps = [...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)].map((m) => ({ all: m[0], inner: m[1], id: Number(attr((/<p:cNvPr\b([^>]*)>/.exec(m[1]) || [0, ''])[1], 'id')), name: decodeXml(attr((/<p:cNvPr\b([^>]*)>/.exec(m[1]) || [0, ''])[1], 'name') || '') }));
    const textOf = (s) => [...s.inner.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => decodeXml(t[1])).join('\n');
    const paraCount = (s) => (s.inner.match(/<a:p>|<a:p /g) || []).length;
    const isNum = (s) => /^\d{1,3}$/.test(textOf(s).trim()) || /type="sldNum"/.test(s.inner);
    // l'elenco: la forma con piu' paragrafi (o con numerazione automatica); il titolo: la forma piu' in alto fra le altre
    const list = sps.filter((s) => !isNum(s) && textOf(s).trim()).sort((a, b) => (/<a:buAutoNum/.test(b.inner) - /<a:buAutoNum/.test(a.inner)) || (paraCount(b) - paraCount(a)))[0];
    if (!list) throw Object.assign(new Error('La slide di origine non ha un elenco.'), { status: 400 });
    const yOf = (s) => Number((/<a:off x="(-?\d+)" y="(-?\d+)"/.exec(s.inner) || [0, 0, 0])[2]);
    const title = sps.filter((s) => s !== list && !isNum(s) && textOf(s).trim()).sort((a, b) => yOf(a) - yOf(b))[0];
    xml = replaceShapeText(xml, list.id, items.map((t) => ({ text: t })));
    if (title && opts.title) xml = replaceShapeText(xml, title.id, [opts.title]);
    // l'indicatore: una forma senza testo, senza riempimento e con bordo, sovrapposta all'elenco
    const box = sps.find((s) => !textOf(s).trim() && /<a:noFill\/>/.test((/<p:spPr>([\s\S]*?)<\/p:spPr>/.exec(s.inner) || [0, ''])[1]) && /<a:ln\b/.test(s.inner));
    if (box) {
      const sz = Number((/<a:defRPr[^>]*\bsz="(\d+)"/.exec(list.inner) || /\bsz="(\d+)"/.exec(list.inner) || [0, 2400])[1]);
      const lnSpc = Number((/<a:lnSpc>\s*<a:spcPct val="(\d+)"/.exec(list.inner) || [0, 100000])[1]) / 100000;
      const spcBef = Number((/<a:spcBef>\s*<a:spcPts val="(\d+)"/.exec(list.inner) || [0, 0])[1]) / 100;
      const line = Math.round((sz / 100) * 1.2 * lnSpc * EMU_PT + spcBef * EMU_PT);
      const m = /<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(box.inner);
      if (m) {
        const listY = yOf(list);
        const newY = current >= 0 ? listY + 36000 + current * line : -10000000;
        const newBox = current >= 0 ? box.all.replace(m[0], `<a:off x="${m[1]}" y="${newY}"/><a:ext cx="${m[3]}" cy="${m[4]}"/>`) : '';
        xml = xml.replace(box.all, newBox);
      }
    }
    const part = this.nextPart('ppt/slides/slide', 'xml');
    this.put(part, xml);
    this.setRels(part, this.rels(srcPart).filter((r) => !/\/(notesSlide|comments)$/.test(r.Type)));
    this.addOverride(part, CT.slide);
    return { n: this.registerSlide(part, opts.at), part };
  }

  // ---- Data nei segnaposto data delle slide (copertina) e nei master -----------------------------
  setDate(text) {
    let n = 0;
    for (const s of this.slideParts()) {
      let xml = this.txt(s.part);
      for (const m of [...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)]) {
        if (!/<p:ph\b[^>]*type="dt"/.test(m[1])) continue;
        const id = attr((/<p:cNvPr\b([^>]*)>/.exec(m[1]) || [0, ''])[1], 'id');
        // un campo data (aggiornato da PowerPoint) resta un campo; un testo fisso si sostituisce
        if (/<a:fld\b[^>]*type="datetime/.test(m[1])) xml = xml.replace(m[0], m[0].replace(/(<a:fld\b[^>]*type="datetime[^"]*"[^>]*>[\s\S]*?<a:t>)[^<]*(<\/a:t>)/, `$1${esc(text)}$2`));
        else xml = replaceShapeText(xml, id, [text]);
        n++;
      }
      this.put(s.part, xml);
    }
    return n;
  }

  // ---- Testi delle forme di una slide (per le slide copiate dal modello) ---------------------------
  setTexts(n, texts) {
    const s = this.slideParts()[n - 1];
    if (!s) return false;
    let xml = this.txt(s.part);
    for (const [id, lines] of Object.entries(texts || {})) if (Array.isArray(lines)) xml = replaceShapeText(xml, id, lines);
    this.put(s.part, xml);
    return true;
  }

  // ---- Compilare i segnaposto di una slide esistente (copertina del modello) ---------------------
  // { title, subtitle, date, body } -> { filled: n }
  fillSlide(n, values) {
    const s = this.slideParts()[n - 1];
    if (!s) return { filled: 0 };
    let xml = this.txt(s.part);
    let filled = 0;
    const want = { title: ['title', 'ctrTitle'], subtitle: ['subTitle'], date: ['dt'], body: ['body', 'obj'] };
    for (const p of placeholdersOf(xml)) {
      for (const [k, types] of Object.entries(want)) {
        if (values[k] === undefined || values[k] === null || !types.includes(p.type) || !p.id) continue;
        xml = replaceShapeText(xml, p.id, Array.isArray(values[k]) ? values[k] : [String(values[k])]);
        filled++;
      }
    }
    this.put(s.part, xml);
    return { filled };
  }
  // la prima slide (1..) il cui testo di una forma corrisponde (per esempio /^agenda$/i)
  findSlide(re) {
    const parts = this.slideParts();
    for (let i = 0; i < parts.length; i++) {
      const xml = this.txt(parts[i].part);
      for (const m of xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
        const t = [...m[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((x) => decodeXml(x[1])).join('').trim();
        if (t && re.test(t)) return i + 1;
      }
    }
    return null;
  }
  // via le slide indicate (posizioni 1.. nell'elenco attuale), con le loro note
  removeSlides(positions) {
    const parts = this.slideParts();
    const dead = new Set(positions.map((n) => parts[Number(n) - 1]).filter(Boolean).map((s) => s.part));
    if (!dead.size) return 0;
    let ct = this.txt('[Content_Types].xml');
    const drop = (p) => { this.files.delete(p); this.files.delete(relsOf(p)); ct = ct.replace(new RegExp(`<Override PartName="/${p.replace(/[.]/g, '\\.')}"[^>]*/>`), ''); };
    const ids = new Set();
    for (const s of parts.filter((x) => dead.has(x.part))) {
      ids.add(s.id);
      for (const r of this.rels(s.part).filter((x) => /\/notesSlide$/.test(x.Type))) drop(resolveTarget(s.part, r.Target));
      drop(s.part);
    }
    let presRels = this.rels('ppt/presentation.xml').filter((r) => !(r.Type === REL('slide') && dead.has(resolveTarget('ppt/presentation.xml', r.Target))));
    this.setRels('ppt/presentation.xml', presRels);
    this.pres = this.pres.replace(/<p:sldId\b[^>]*\bid="(\d+)"[^>]*\/>/g, (m, id) => (ids.has(id) ? '' : m));
    this.pres = this.pres.replace(/<p14:sldId id="(\d+)"\/>/g, (m, id) => (ids.has(id) ? '' : m));
    this.pres = this.pres.replace(/<p:sld r:id="([^"]+)"\/>/g, (m, rid) => (presRels.some((r) => r.Id === rid) ? m : ''));
    // collegamenti verso le slide tolte nelle slide rimaste
    for (const s of this.slideParts()) {
      const rels = this.rels(s.part);
      const gone = rels.filter((r) => /\/slide$/.test(r.Type) && dead.has(resolveTarget(s.part, r.Target)));
      if (!gone.length) continue;
      let x = this.txt(s.part);
      for (const r of gone) x = x.replace(new RegExp(`<a:hlinkClick\\b[^>]*r:id="${r.Id}"[^>]*/>|<a:hlinkClick\\b[^>]*r:id="${r.Id}"[^>]*>[\\s\\S]*?</a:hlinkClick>`, 'g'), '');
      this.put(s.part, x);
      this.setRels(s.part, rels.filter((r) => !gone.includes(r)));
    }
    this.put('ppt/presentation.xml', this.pres);
    this.put('[Content_Types].xml', ct);
    const app = this.txt('docProps/app.xml');
    if (app) this.put('docProps/app.xml', app.replace(/<Slides>\d+<\/Slides>/, `<Slides>${this.slideParts().length}</Slides>`));
    return dead.size;
  }

  // ---- Pulizia: via i layout non usati dalle slide, i master rimasti senza layout, temi e immagini orfane ----
  clean() {
    const used = new Set();
    for (const s of this.slideParts()) for (const r of this.rels(s.part)) if (r.Type === REL('slideLayout')) used.add(resolveTarget(s.part, r.Target));
    const removed = { layouts: 0, masters: 0, media: 0 };
    const masters = this.masters();
    let presRels = this.rels('ppt/presentation.xml');
    let ct = this.txt('[Content_Types].xml');
    const dropPart = (p) => { this.files.delete(p); this.files.delete(relsOf(p)); ct = ct.replace(new RegExp(`<Override PartName="/${p.replace(/[.]/g, '\\.')}"[^>]*/>`), ''); };
    const keptMasters = [];
    for (const master of masters) {
      let mrels = this.rels(master);
      let mx = this.txt(master);
      const layoutRels = mrels.filter((r) => r.Type === REL('slideLayout'));
      const keep = layoutRels.filter((r) => used.has(resolveTarget(master, r.Target)));
      // un master senza slide: via tutto (ma almeno un master deve restare)
      if (!keep.length && (keptMasters.length || masters.indexOf(master) < masters.length - 1)) {
        for (const r of layoutRels) { dropPart(resolveTarget(master, r.Target)); removed.layouts++; }
        dropPart(master); removed.masters++;
        const rid = presRels.find((r) => r.Type === REL('slideMaster') && resolveTarget('ppt/presentation.xml', r.Target) === master);
        presRels = presRels.filter((r) => r !== rid);
        if (rid) this.pres = this.pres.replace(new RegExp(`<p:sldMasterId\\b[^>]*r:id="${rid.Id}"[^>]*/>`), '');
        continue;
      }
      keptMasters.push(master);
      const keepIds = new Set(keep.map((r) => r.Id));
      const toDrop = layoutRels.filter((r) => !keepIds.has(r.Id));
      if (!keep.length) continue; // ultimo master rimasto: i suoi layout restano com'erano
      for (const r of toDrop) { dropPart(resolveTarget(master, r.Target)); removed.layouts++; }
      mrels = mrels.filter((r) => !toDrop.includes(r));
      mx = mx.replace(/<p:sldLayoutIdLst>[\s\S]*?<\/p:sldLayoutIdLst>/, (m) => m.replace(/<p:sldLayoutId\b[^>]*\/>/g, (x) => (keepIds.has(attr(x, 'r:id')) ? x : '')));
      this.put(master, mx);
      this.setRels(master, mrels);
    }
    this.setRels('ppt/presentation.xml', presRels);
    this.put('ppt/presentation.xml', this.pres);
    this.put('[Content_Types].xml', ct);
    // temi e immagini: restano solo quelli ancora citati da qualche .rels
    const cited = new Set();
    for (const [name] of this.files) {
      if (!name.endsWith('.rels')) continue;
      const owner = name.replace(/_rels\/([^/]+)\.rels$/, '$1');
      for (const r of parseRels(this.txt(name))) if (r.TargetMode !== 'External') cited.add(resolveTarget(owner, r.Target));
    }
    for (const name of [...this.files.keys()]) {
      if ((/^ppt\/media\//.test(name) || /^ppt\/theme\/theme\d+\.xml$/.test(name)) && !cited.has(name)) {
        this.files.delete(name);
        if (/theme/.test(name)) ct = this.txt('[Content_Types].xml').replace(new RegExp(`<Override PartName="/${name.replace(/[.]/g, '\\.')}"[^>]*/>`), '');
        else removed.media++;
      }
    }
    this.put('[Content_Types].xml', ct);
    this._layouts = null;
    return removed;
  }

  // ---- Salvataggio -------------------------------------------------------------------------------
  save() {
    this.put('ppt/presentation.xml', this.pres);
    // via il registro delle revisioni di PowerPoint: cita parti che possono non esistere piu'
    for (const k of [...this.files.keys()]) if (/^ppt\/changesInfos\//.test(k)) this.files.delete(k);
    const presRels = this.rels('ppt/presentation.xml').filter((r) => !/changesInfo/.test(r.Type));
    this.setRels('ppt/presentation.xml', presRels);
    this.put('[Content_Types].xml', this.txt('[Content_Types].xml').replace(/<Override PartName="\/ppt\/changesInfos\/[^"]*"[^>]*\/>/g, ''));
    const names = [...this.files.keys()].sort((a, b) => (a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : 0));
    return writeZip(names.map((name) => ({ name, data: this.raw(name) })));
  }
}

const openDeck = (buf) => new Deck(buf);

module.exports = { openDeck, Deck, placeholdersOf, imageSize, imageExt, TABLE_STYLE };
