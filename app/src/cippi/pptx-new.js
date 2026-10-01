'use strict';
// Costruzione di una presentazione PowerPoint da zero (senza librerie): forme, testi, connettori, pacchetto .pptx.
// La usa Cippi per "Crea da zero" (presentazione base con la struttura tipica dei documenti di processo del team)
// e la usano i test per avere presentazioni di prova senza file veri dei clienti.
const { writeZip } = require('../celle/zip');

const W = 12192000; const H = 6858000;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const emu = (pctX, pctY) => [Math.round(pctX / 100 * W), Math.round(pctY / 100 * H)];
let nextId = 10;

// font = carattere esplicito (a:latin); autofit = testo ridotto da PowerPoint (0.8 = 80%); color = colore del testo
function sp({ id = nextId++, name = 'Forma', x, y, w, h, geom = 'rect', fill, line, dash, text, size, bold, color, font, autofit, paras, txBox, ph }) {
  const [ox, oy] = emu(x, y); const [cx, cy] = emu(w, h);
  const ps = paras || (text !== undefined ? String(text).split('\n').map((t) => ({ text: t })) : []);
  const fillXml = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>';
  const lineXml = line ? `<a:ln w="9525"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill>${dash ? `<a:prstDash val="${dash}"/>` : ''}</a:ln>` : '<a:ln><a:noFill/></a:ln>';
  const rPr = (p) => {
    const attrs = `lang="it-IT"${size ? ` sz="${size * 100}"` : ''}${bold || p.bold ? ' b="1"' : ''}`;
    const inner = `${color ? `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` : ''}${font ? `<a:latin typeface="${esc(font)}"/>` : ''}`;
    return inner ? `<a:rPr ${attrs}>${inner}</a:rPr>` : `<a:rPr ${attrs}/>`;
  };
  const bodyPr = autofit ? `<a:bodyPr><a:normAutofit fontScale="${Math.round(autofit * 100000)}"/></a:bodyPr>` : '<a:bodyPr/>';
  // numbered = elenco numerato automatico (buAutoNum), come gli indici dei kick-off
  const pPr = (p) => (p.numbered ? '<a:pPr marL="342900" indent="-342900"><a:buAutoNum type="arabicPeriod"/></a:pPr>' : p.lvl ? `<a:pPr lvl="${p.lvl}"><a:buChar char="•"/></a:pPr>` : '');
  const body = ps.length ? `<p:txBody>${bodyPr}<a:lstStyle/>${ps.map((p) => `<a:p>${pPr(p)}<a:r>${rPr(p)}<a:t>${esc(p.text)}</a:t></a:r></a:p>`).join('')}</p:txBody>` : '';
  return { id, xml: `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr${txBox ? ' txBox="1"' : ''}/><p:nvPr>${ph ? `<p:ph type="${ph}"/>` : ''}</p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="${ox}" y="${oy}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${geom}"><a:avLst/></a:prstGeom>${fillXml}${lineXml}</p:spPr>${body}</p:sp>` };
}
// Immagine: media = { file: 'piano.svg', data: Buffer | string, type: 'image/svg+xml' }
let mediaSeq = 1;
function pic({ id = nextId++, name = 'Immagine', x, y, w, h, media }) {
  const [ox, oy] = emu(x, y); const [cx, cy] = emu(w, h);
  const rid = `rId${100 + mediaSeq++}`;
  return { id, media: { ...media, rid }, xml: `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${ox}" y="${oy}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>` };
}
// Tabella: rows = [[cella, ...], ...]; cella = 'testo' oppure { text, gridSpan, hMerge, fill, bold }
function tbl({ id = nextId++, name = 'Tabella', x, y, w, h, rows, firstRow = true, bandRow = true }) {
  const [ox, oy] = emu(x, y); const [cx, cy] = emu(w, h);
  const ncol = Math.max(...rows.map((r) => r.length));
  const colW = Math.floor(cx / ncol); const rowH = Math.floor(cy / rows.length);
  const cell = (c) => {
    const o = typeof c === 'string' ? { text: c } : c;
    const attrs = `${o.gridSpan > 1 ? ` gridSpan="${o.gridSpan}"` : ''}${o.hMerge ? ' hMerge="1"' : ''}`;
    const pr = o.fill ? `<a:tcPr><a:solidFill><a:srgbClr val="${o.fill}"/></a:solidFill></a:tcPr>` : '<a:tcPr/>';
    return `<a:tc${attrs}><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="it-IT"${o.bold ? ' b="1"' : ''}/><a:t>${esc(o.text || '')}</a:t></a:r></a:p></a:txBody>${pr}</a:tc>`;
  };
  const grid = Array.from({ length: ncol }, () => `<a:gridCol w="${colW}"/>`).join('');
  const trs = rows.map((r) => `<a:tr h="${rowH}">${r.map(cell).join('')}</a:tr>`).join('');
  return { id, xml: `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${ox}" y="${oy}"/><a:ext cx="${cx}" cy="${cy}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr${firstRow ? ' firstRow="1"' : ''}${bandRow ? ' bandRow="1"' : ''}/><a:tblGrid>${grid}</a:tblGrid>${trs}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>` };
}
function cxn(from, to, { x = 0, y = 0, w = 1, h = 1 } = {}) {
  const id = nextId++;
  const [ox, oy] = emu(x, y); const [cx, cy] = emu(w, h);
  return { id, xml: `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Freccia ${id}"/><p:cNvCxnSpPr><a:stCxn id="${from.id}" idx="2"/><a:endCxn id="${to.id}" idx="0"/></p:cNvCxnSpPr><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="${ox}" y="${oy}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:tailEnd type="triangle"/></a:ln></p:spPr></p:cxnSp>` };
}
const title = (t) => sp({ name: 'Titolo', x: 9, y: 4, w: 80, h: 5, text: t, size: 20, bold: true, txBox: true });

const resetIds = () => { nextId = 10; mediaSeq = 1; };

// Opzioni: sections = [{ name, slides: [n] }] (sezioni native di PowerPoint); layoutShapes = forme fisse del layout
// (loghi, barre); theme = { colors: { accent1: ... }, fonts: { major, minor } }; company = azienda nei metadati
// layoutName = nome del layout unico (es. "Diapositiva titolo", cosi' la prima slide e' una copertina)
function packDeck(list, { title = 'Presentazione', author = 'HSPI', sections = null, layoutShapes = [], theme = {}, company = '', layoutName = 'Pagina vuota' } = {}) {
  const files = [];
  const COLORS = { dk1: '000000', lt1: 'FFFFFF', dk2: '44546A', lt2: 'E7E6E6', accent1: '307FE2', accent2: '00CFB4', accent3: '56B093', accent4: 'FFC000', accent5: 'E2665C', accent6: 'D95030', hlink: '002394', folHlink: 'E400BE', ...(theme.colors || {}) };
  const FONTS = { major: 'Poppins', minor: 'Poppins', ...(theme.fonts || {}) };
  const MEDIA_TYPES = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
  const exts = new Set(list.flat().filter((s) => s.media).map((s) => s.media.file.split('.').pop().toLowerCase()));
  const ct = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>',
    ...[...exts].map((e) => `<Default Extension="${e}" ContentType="${MEDIA_TYPES[e] || 'application/octet-stream'}"/>`),
    ...(company ? ['<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'] : []),
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'];
  const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
  const tree = (inner) => `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${inner}</p:spTree></p:cSld>`;
  files.push({ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>${company ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' : ''}</Relationships>` });
  if (company) files.push({ name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office PowerPoint</Application><Slides>${list.length}</Slides><Notes>0</Notes><Company>${esc(company)}</Company></Properties>` });
  files.push({ name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>${esc(title)}</dc:title><dc:creator>${esc(author)}</dc:creator></cp:coreProperties>` });
  files.push({ name: 'ppt/theme/theme1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Prova"><a:themeElements><a:clrScheme name="Prova">${['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].map((k) => `<a:${k}><a:srgbClr val="${COLORS[k]}"/></a:${k}>`).join('')}</a:clrScheme><a:fontScheme name="Prova"><a:majorFont><a:latin typeface="${esc(FONTS.major)}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${esc(FONTS.minor)}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Prova"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>` });
  files.push({ name: 'ppt/slideMasters/slideMaster1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS}>${tree('')}<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>` });
  files.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>' });
  files.push({ name: 'ppt/slideLayouts/slideLayout1.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS}><p:cSld name="${esc(layoutName)}">${tree(layoutShapes.map((s) => s.xml).join('')).replace('<p:cSld>', '').replace('</p:cSld>', '')}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>` });
  files.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' });
  const presRels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>', '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'];
  const ids = [];
  list.forEach((shapes, i) => {
    const n = i + 1;
    files.push({ name: `ppt/slides/slide${n}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS}>${tree(shapes.map((s) => s.xml).join(''))}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>` });
    const media = shapes.filter((s) => s.media).map((s) => s.media);
    for (const m of media) files.push({ name: `ppt/media/${m.file}`, data: Buffer.isBuffer(m.data) ? m.data : Buffer.from(String(m.data), 'utf8') });
    files.push({ name: `ppt/slides/_rels/slide${n}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>${media.map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${m.file}"/>`).join('')}</Relationships>` });
    ct.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
    presRels.push(`<Relationship Id="rId${n + 10}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n}.xml"/>`);
    ids.push(`<p:sldId id="${255 + n}" r:id="rId${n + 10}"/>`);
  });
  // sezioni native di PowerPoint (riquadro "Sezioni"): le slide si citano con il loro id (255 + n)
  const sectionsXml = sections && sections.length
    ? `<p:extLst><p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}"><p14:sectionLst xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">${sections.map((s, i) => `<p14:section name="${esc(s.name)}" id="{00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}}"><p14:sldIdLst>${s.slides.map((n) => `<p14:sldId id="${255 + n}"/>`).join('')}</p14:sldIdLst></p14:section>`).join('')}</p14:sectionLst></p:ext></p:extLst>` : '';
  files.push({ name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${ids.join('')}</p:sldIdLst><p:sldSz cx="${W}" cy="${H}"/><p:notesSz cx="6858000" cy="9144000"/>${sectionsXml}</p:presentation>` });
  files.push({ name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels.join('')}</Relationships>` });
  files.unshift({ name: '[Content_Types].xml', data: `${ct.join('')}</Types>` });
  return writeZip(files);
}

// Presentazione base: titolo, indice, sezione, testo con elenco, legenda dei colori, flusso a corsie d'esempio, chiusura.
// Ogni slide e' un esempio da riscrivere: in Cippi si modifica nella modalita' Revisione → Modifica.
function baseDeck(name = 'Nuova presentazione') {
  resetIds();
  const flow = () => {
    const laneA = sp({ name: 'Corsia', x: 1, y: 15, w: 8, h: 35, fill: '44546A', text: 'Attore 1' });
    const laneB = sp({ name: 'Corsia', x: 1, y: 52, w: 8, h: 40, fill: '44546A', text: 'Attore 2' });
    const start = sp({ x: 11, y: 25, w: 2, h: 6, geom: 'homePlate', fill: '005EA8', text: 'START' });
    const s1 = sp({ x: 15, y: 25, w: 10, h: 7, fill: '92D050', line: '000000', text: '1. Primo step' });
    const d2 = sp({ x: 15, y: 58, w: 11, h: 10, geom: 'flowChartDecision', fill: 'FFFFFF', line: '000000', text: '2. Decisione?' });
    const s3 = sp({ x: 35, y: 58, w: 10, h: 7, fill: 'FFFF00', line: '000000', text: '3. Step modificato' });
    const s4 = sp({ x: 35, y: 78, w: 10, h: 7, fill: 'FFFFFF', line: '000000', text: '4. Step alternativo' });
    const end = sp({ x: 60, y: 60, w: 6, h: 4, geom: 'flowChartTerminator', fill: 'D9D9D9', text: 'END' });
    const si = sp({ x: 28, y: 58, w: 2, h: 3, text: 'Si', txBox: true });
    const no = sp({ x: 18, y: 70, w: 2, h: 3, text: 'No', txBox: true });
    return [title('Processo: 1.1.1 Nome del processo'), laneA, laneB, start, s1, d2, s3, s4, end, si, no,
      cxn(start, s1, { x: 13, y: 28, w: 2, h: 0 }), cxn(s1, d2, { x: 20, y: 32, w: 0, h: 26 }), cxn(d2, s3, { x: 26, y: 63, w: 9, h: 0 }),
      cxn(d2, s4, { x: 20, y: 68, w: 0, h: 10 }), cxn(s3, end, { x: 45, y: 61, w: 15, h: 0 })];
  };
  return packDeck([
    [sp({ x: 10, y: 38, w: 70, h: 10, text: name, size: 32, bold: true, txBox: true }), sp({ x: 10, y: 50, w: 50, h: 5, text: 'Sottotitolo', size: 16, txBox: true }),
      sp({ x: 10, y: 57, w: 40, h: 5, text: new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase()), size: 12, txBox: true })],
    [sp({ x: 5, y: 10, w: 30, h: 15, text: 'Indice', size: 54, txBox: true }), sp({ x: 45, y: 20, w: 50, h: 40, paras: [{ text: 'Obiettivi' }, { text: 'Processi' }], size: 16, txBox: true })],
    [title('Obiettivi'), sp({ x: 4, y: 14, w: 90, h: 10, paras: [{ text: 'Frase principale: cosa si vuole ottenere.', bold: true }], txBox: true }),
      sp({ x: 6, y: 30, w: 30, h: 4, text: 'Attività', bold: true, txBox: true }),
      sp({ x: 6, y: 36, w: 80, h: 20, paras: [{ text: 'Primo punto', lvl: 1 }, { text: 'Secondo punto', lvl: 1 }], txBox: true })],
    [sp({ x: 10, y: 40, w: 70, h: 12, text: 'Processi', size: 40, txBox: true })],
    [title('Legenda Flow Chart'), sp({ x: 4, y: 45, w: 10, h: 3, text: 'Legenda', txBox: true }),
      sp({ x: 5, y: 58, w: 6, h: 3, fill: '92D050', line: '000000' }), sp({ x: 12.5, y: 58.2, w: 34, h: 2.7, text: 'Nuovo step di processo introdotto nel To Be', txBox: true }),
      sp({ x: 5, y: 64, w: 6, h: 3, fill: 'FFFF00', line: '000000' }), sp({ x: 12.5, y: 64.2, w: 34, h: 2.7, text: 'Modifica dello step di processo previsto da As-Is', txBox: true })],
    flow(),
    [sp({ x: 30, y: 40, w: 40, h: 12, text: 'Grazie', size: 40, txBox: true })],
  ], { title: name });
}

module.exports = { sp, cxn, pic, tbl, title, packDeck, baseDeck, resetIds };
