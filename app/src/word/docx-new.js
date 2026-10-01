'use strict';
// Motore Word: un documento .docx costruito da zero, senza librerie. Serve a "Crea da zero" e alle prove automatiche
// (un modello di verbale inventato con la stessa struttura di quelli veri: nessun file di un cliente nel repository).
//
//   newDocx([{ h1: 'Titolo' }, { p: 'testo', highlight: true, bold: true }, { h3: '...' },
//            { table: { rows: [[{ text, fill, span, bold }]], widths: [..], style: 'TableGrid' } },
//            { section: 'landscape' | 'portrait' }, { pageBreak: true }], { title, author, font }) -> Buffer
const { writeZip } = require('../celle/zip');
const { esc, runXml } = require('./docx-write');

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const A4 = { portrait: '<w:pgSz w:w="11906" w:h="16838"/>', landscape: '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' };
const sectPr = (orient, last) => `<w:sectPr>${A4[orient] || A4.portrait}<w:pgMar w:top="1417" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/>${last ? '' : ''}</w:sectPr>`;

function para(block, font) {
  const rPr = (b) => `<w:rPr>${font ? `<w:rFonts w:ascii="${esc(font)}" w:hAnsi="${esc(font)}" w:cs="${esc(font)}"/>` : ''}${b.bold ? '<w:b/>' : ''}${b.color ? `<w:color w:val="${b.color}"/>` : ''}${b.sz ? `<w:sz w:val="${b.sz}"/>` : ''}${b.highlight ? '<w:highlight w:val="yellow"/>' : ''}</w:rPr>`;
  const text = block.h1 !== undefined ? block.h1 : block.h2 !== undefined ? block.h2 : block.h3 !== undefined ? block.h3 : block.p;
  const style = block.h1 !== undefined ? 'Heading1' : block.h2 !== undefined ? 'Heading2' : block.h3 !== undefined ? 'Heading3' : block.style || '';
  const pPr = `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${block.numbered ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ''}${block.align ? `<w:jc w:val="${block.align}"/>` : ''}${block.pageBreak ? '' : ''}</w:pPr>`;
  // "a {x} b": i pezzi tra graffe prendono l'evidenziazione (segnaposto), come nei modelli veri
  const runs = String(text == null ? '' : text).split(/(\{[^}]*\})/).filter(Boolean).map((x) => (/^\{.*\}$/.test(x) ? runXml(rPr({ ...block, highlight: true }), x.slice(1, -1)) : runXml(rPr(block), x))).join('');
  return `<w:p>${pPr}${block.pageBreak ? '<w:r><w:br w:type="page"/></w:r>' : ''}${runs}</w:p>`;
}
function table(t, font) {
  const rows = t.rows.map((r) => (Array.isArray(r) ? r : [r]));
  const cols = Math.max(...rows.map((r) => r.reduce((a, c) => a + ((c && c.span) || 1), 0)));
  const total = t.width || 9638;
  const widths = Array.isArray(t.widths) && t.widths.length === cols ? t.widths : Array.from({ length: cols }, () => Math.floor(total / cols));
  const cell = (c, ci) => {
    const v = c && typeof c === 'object' ? c : { text: c };
    const span = v.span || 1;
    const w = widths.slice(ci, ci + span).reduce((a, b) => a + b, 0);
    const tcPr = `<w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${v.vMerge ? `<w:vMerge${v.vMerge === 'restart' ? ' w:val="restart"' : ''}/>` : ''}${v.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${v.fill}"/>` : ''}</w:tcPr>`;
    const lines = String(v.text == null ? '' : v.text).split('\n');
    return `<w:tc>${tcPr}${lines.map((l) => para({ p: l, bold: v.bold, color: v.color, sz: v.sz, highlight: v.highlight, align: v.align }, font)).join('')}</w:tc>`;
  };
  const trs = rows.map((r) => { let ci = 0; return `<w:tr>${r.map((c) => { const x = cell(c, ci); ci += (c && c.span) || 1; return x; }).join('')}</w:tr>`; }).join('');
  const borders = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>';
  return `<w:tbl><w:tblPr>${t.style ? `<w:tblStyle w:val="${t.style}"/>` : ''}<w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${t.style ? '' : borders}<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${trs}</w:tbl>`;
}

function newDocx(blocks, { title = 'Documento', author = 'HSPI', font = 'Calibri' } = {}) {
  let orient = 'portrait';
  const body = [];
  for (const b of blocks) {
    if (b.section) { body.push(`<w:p><w:pPr>${sectPr(orient)}</w:pPr></w:p>`); orient = b.section; continue; }
    if (b.table) { body.push(table(b.table, font)); body.push('<w:p/>'); continue; }
    body.push(para(b, font));
  }
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${body.join('')}${sectPr(orient, true)}</w:body></w:document>`;
  const heading = (id, name, sz, color) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="${Number(id.slice(-1)) - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${sz}"/></w:rPr></w:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${esc(font)}" w:hAnsi="${esc(font)}" w:cs="${esc(font)}"/><w:sz w:val="22"/><w:lang w:val="it-IT"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${heading('Heading1', 'heading 1', '32', '0F4761')}${heading('Heading2', 'heading 2', '28', '0F4761')}${heading('Heading3', 'heading 3', '24', '0F4761')}<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering ${NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
  const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:settings ${NS}><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const files = [
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>' },
    { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>' },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles },
    { name: 'word/settings.xml', data: settings },
    { name: 'word/numbering.xml', data: numbering },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>${esc(author)}</dc:creator><cp:lastModifiedBy>${esc(author)}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>` },
    { name: 'docProps/app.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>HSPI Team Manager</Application><DocSecurity>0</DocSecurity></Properties>' },
  ];
  return writeZip(files);
}

// Un modello di verbale SAL inventato con gli stessi ancoraggi di quello vero (titoli, intestazioni delle tabelle,
// segnaposto): lo usano le prove automatiche e serve da esempio di come e' fatto un modello compilabile.
function salTemplate() {
  const H = (t) => ({ text: t, fill: '002060', color: 'FFFFFF', bold: true });
  const G = (t) => ({ text: t, fill: '305496', color: 'FFFFFF', bold: true });
  const M = (t) => ({ text: t, fill: 'DAE9F7' });
  return newDocx([
    { p: 'INDICE', bold: true },
    { h1: 'Informazioni di verbalizzazione', numbered: true },
    { table: { rows: [[{ text: 'Informazioni generali', fill: '1F497D', color: 'FFFFFF', bold: true, span: 2 }, { text: 'Oggetto della sessione: SAL', fill: '1F497D', color: 'FFFFFF', bold: true, span: 2 }],
      [{ text: 'Luogo e data:', bold: true, fill: 'DEEAF6' }, { text: 'Palermo – {gg.mm.aaaa}', fill: 'DEEAF6' }, { text: 'Facilitatore:', bold: true, fill: 'DEEAF6' }, { text: '{[Inserire Facilitatori]}', fill: 'DEEAF6' }],
      [{ text: 'Luogo e data:', bold: true, fill: 'DEEAF6' }, { text: 'Palermo – {gg.mm.aaaa}', fill: 'DEEAF6' }, { text: 'Scrivente:', bold: true, fill: 'DEEAF6' }, { text: '{[Inserire Scrivente]}', fill: 'DEEAF6' }]], widths: [1129, 2817, 1999, 3670] } },
    { h1: 'Rappresentanti Amministrazione', numbered: true },
    { table: { rows: [[H('Nome e Cognome'), H('Ente di appartenenza'), H('Ruolo')], ['', 'Ente', 'RUP'], ['', 'Ente', 'DEC']] } },
    { h1: 'Rappresentanti RTI', numbered: true },
    { table: { rows: [[H('Nome e Cognome'), H('Società')], ['', ''], ['', ''], ['', '']] } },
    { h1: 'Riferimenti', numbered: true },
    { table: { rows: [[H('Identificativo'), H('Titolo/Descrizione')],
      ['{[inserire identificativo documento – Accordo Quadro]}', 'Accordo Quadro stipulato in data __/__/____ relativo a {[Inserire descrizione]} – CIG Lotto {[Inserire numero lotto]} – {[Inserire CIG]}'],
      ['{[inserire identificativo documento – Piano dei Fabbisogni]}', 'Piano dei Fabbisogni'],
      ['{[inserire identificativo documento – Piano Operativo]}', 'Piano Operativo'],
      ['{[inserire identificativo documento – Contratto Esecutivo]}', 'Contratto Esecutivo stipulato in data __/__/____ – CIG CE: {[Inserire CIG derivato]} – CUP: {[Inserire CUP]}']], widths: [5379, 4236] } },
    { h1: 'Premessa', numbered: true },
    { p: 'Il presente documento contiene una descrizione sintetica delle attività svolte dal gruppo di lavoro del RTI durante il periodo Aprile – Giugno 2026, rendicontata sulle attività del Lotto 1 in corrispondenza del piano di progetto.' },
    { h1: 'Avanzamento Piano di Lavoro', numbered: true },
    { table: { rows: [[H('#'), H('Nome Attività'), H('Mese_1'), H('Mese_2'), H('Mese_3'), H('Mese_4'), H('Mese_n')],
      [G(''), G('Attività di progetto'), G(''), G(''), G(''), G(''), G('')],
      [G('SVI'), G('Servizio di Sviluppo'), G(''), G(''), G(''), G(''), G('')],
      ['A_1', '', M(''), M(''), M(''), M(''), M('')],
      ['A_n', '', M(''), M(''), M(''), M(''), M('')],
      [G('SS'), G('Servizi di Supporto'), G(''), G(''), G(''), G(''), G('')],
      ['B_1', '', '', '', M(''), M(''), M('')]], widths: [1196, 3052, 1191, 1191, 1191, 1191, 1191] } },
    { h1: 'Avanzamento delle attività', numbered: true },
    { p: 'Si elencano di seguito, sotto forma di resoconto, le attività svolte durante il periodo di SAL suddivise per Servizi attivati.' },
    { p: 'A – {[Inserire nome Servizio]} (S_1)', bold: true }, { p: 'A1 – {[Inserire nome Attività]} (S_1.1)', bold: true }, { p: '{[Inserire descrizione]}' }, { p: 'Deliverable:' }, { p: '{[Inserire Deliverable]}', numbered: true },
    { p: 'B – {[Inserire nome Servizio]} (S_2)', bold: true }, { p: 'B1 – {[Inserire nome Attività]} (S_2.1)', bold: true }, { p: '{[Inserire descrizione]}' }, { p: 'Deliverable:' }, { p: '{[Inserire Deliverable]}', numbered: true },
    { h3: 'Tabella di raccordo – Codifica deliverable' },
    { p: 'Si riporta di seguito una tabella di corrispondenza tra la denominazione dei deliverable e i documenti archiviati.' },
    { table: { rows: [[{ text: '#', fill: '156082', color: 'FFFFFF', bold: true }, { text: 'Denominazione del Deliverable', fill: '156082', color: 'FFFFFF', bold: true }, { text: 'Denominazione secondo codifica condivisa', fill: '156082', color: 'FFFFFF', bold: true }], ['1', '', ''], ['2', '', '']], widths: [709, 4253, 4676] } },
    { h1: 'Consuntivazione', numbered: true },
    { table: { rows: [[H('Componente RTI'), H('Totale'), H('Avanzamento del SAL Economico attuale'), H('Avanzamento SAL economici precedenti'), H('% Progress totale attività al SAL Economico attuale')], [G(''), '€', '€', '-', '%'], [G(''), '€', '€', '-', '%'], [G('TOTALE'), '€', '€', '-', '%']] } },
    { section: 'landscape' },
    { table: { rows: [
      [{ ...H('Servizio'), span: 3 }, H('#'), H('Nome Attività'), H('Valore attività'), { ...H('{[Inserire Anno]}'), span: 5 }],
      [{ ...H('Servizio'), span: 3 }, H('#'), H('Nome Attività'), H('Valore attività'), H('{[Inserire Mese_1-Anno]}'), H('{[Inserire Mese_2-Anno]}'), H('{[Inserire Mese_3-Anno]}'), H('{[Inserire Mese_4-Anno]}'), H('{[Inserire Mese_n-Anno]}')],
      [H('Servizio'), H('Q.ta'), H('Tariffa'), H('#'), H('Nome Attività'), H('Valore attività'), H('{[Inserire Mese_1-Anno]}'), H('{[Inserire Mese_2-Anno]}'), H('{[Inserire Mese_3-Anno]}'), H('{[Inserire Mese_4-Anno]}'), H('{[Inserire Mese_n-Anno]}')],
      [G(''), G(''), G(''), G('A'), G('Attività di progetto'), G('€'), G('-'), G('-'), G('-'), G('-'), G('-')],
      [G('S_1'), G(''), G('€'), G('A'), G('{[Inserire nome Servizio]} (S_1)'), G('€'), G('€'), G('€'), G('€'), G('€'), G('€')],
      ['S_1.1', '', '€', 'A_1', '{[Inserire nome Attività]}', '€', '€', '€', '€', '€', '€'],
      [G('S_n'), G(''), G('€'), G('C'), G('{[Inserire nome Servizio]} (S_n)'), G('€'), G('-'), G('-'), G('€'), G('€'), G('€')],
      ['S_n.1', '', '€', 'C_1', '{[Inserire nome Attività]}', '€', '-', '-', '€', '€', '€']], widths: [837, 905, 1022, 426, 2523, 1556, 1559, 1559, 1559, 1560, 1417], width: 14923 } },
    { section: 'portrait' },
    { h1: 'Fatturazione attiva', numbered: true },
    { table: { rows: [[H('Servizio'), H('Attività'), H('Totale'), H('Importo al SAL Economico Attuale (IVA esclusa)'), H('% consuntivazione servizio del SAL Economico attuale'), H('gg/pp')], ['S_1', 'A_1 – {[inserire nome Attività]}', '€', '€', '%', ''], ['S_n', 'C_1 – {[inserire nome Attività]}', '€', '€', '%', '']] } },
    { p: 'Prospetto di ripartizione Economics:' },
    { table: { rows: [['', ''], [{ text: 'Importo', fill: 'A9D08E', bold: true }, '€'], [{ text: 'Ritenuta 0,5%', fill: 'A9D08E', bold: true }, '€'], [{ text: 'Credito', fill: 'A9D08E', bold: true }, '€'], [{ text: 'IVA al 22%', fill: 'A9D08E', bold: true }, '€'], [{ text: 'TOTALE FATTURA', fill: '70AD47', bold: true }, { text: '€', fill: '70AD47', bold: true }]], widths: [3264, 1701] } },
    { p: 'Sulla scorta di tale tabella condivisa dalle parti, si dichiara che l’avanzamento economico complessivo delle attività contrattuali rese dal __/__/____ al __/__/____ risulta pari ad € {[Inserire importo]}.' },
    { p: 'Al netto della ritenuta applicata dello 0,50% del suddetto importo, si dichiara, un credito relativo pari a € {[Inserire importo]} oltre IVA.' },
    { p: 'In sede di liquidazione delle singole fatture, ai sensi dell’art. 11, comma 6, del D.Lgs. 36/2023, si applica la ritenuta dello 0,5%.' },
    { table: { rows: [['Data: {[Inserire data]}', 'Per il RTI\nDott.\n______________________________']] } },
    { h1: 'Accettazione', numbered: true },
    { p: 'Per quanto sopra, si autorizza il fornitore all’emissione della fattura relativa ai mesi di {[inserire periodo di riferimento]}, per l’importo pari rispettivamente a {[inserire importo]} €, oltre IVA.' },
    { table: { rows: [['Data: {[inserire data]}', 'Il Responsabile Unico del Progetto\nDott.\n______________________________'], ['', 'Il Direttore dell’Esecuzione del Contratto\nDott.\n______________________________']] } },
  ], { title: 'Verbale SAL (modello di prova)', author: 'HSPI', font: 'Calibri' });
}

module.exports = { newDocx, salTemplate };
