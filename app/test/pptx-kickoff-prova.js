'use strict';
// Presentazione di prova "kick-off di progetto", costruita da zero (nessun file vero di un cliente nei test).
// Ha le caratteristiche dei kick-off dei fornitori per la pubblica amministrazione: sezioni native di PowerPoint
// (niente slide divisorie), copertina con segnaposto, indice numerato a due livelli, piè di pagina e numero in ogni
// slide, schede con "pillole" colorate (testo trasparente sopra una forma colorata), una tabella disegnata con le
// forme (funzionalità · piattaforma · finalità), un masterplan a Gantt incollato come immagine SVG, la tabella
// del contratto con la riga del totale a celle unite, un logo fisso nel layout, un carattere di prova e un testo
// ridotto dall'adattamento automatico.
const { sp, pic, tbl, title, packDeck, resetIds } = require('../src/cippi/pptx-new');

const THEME = { colors: { accent1: '225546', accent2: 'A9D7B6', accent3: '318B71', accent4: '42BA97', accent5: '1482AB', accent6: '264457', dk2: '335B74', lt2: 'DFE3E5' }, fonts: { major: 'Poppins', minor: 'Poppins' } };

// Gantt come lo esporta PowerPoint: anni e mesi in alto, righe a sinistra, barre colorate
function ganttSvg() {
  const months = 'ONDGFMAMGLASOND'.split(''); // da ottobre 2026 a dicembre 2027
  const x0 = 300; const step = 30;
  const t = (x, y, text, bold) => `<text transform="translate(${x} ${y})" font-size="11"${bold ? ' font-weight="700"' : ''}>${text}</text>`;
  const bar = (row, from, to, fill = '#225546') => `<rect x="${x0 + from * step}" y="${60 + row * 22 - 14}" width="${(to - from + 1) * step}" height="16" fill="${fill}"/>`;
  return `<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">${t(x0 + step, 14, '2026', true)}${t(x0 + 6 * step, 14, '2027', true)}${months.map((m, i) => t(x0 + i * step + 10, 37, m, true)).join('')}
    ${t(10, 60, 'COMPONENTE UNO', true)}<rect x="8" y="48" width="280" height="18" fill="#225546" fill-opacity="0.6"/>
    ${t(10, 82, 'Design e analisi funzionale')}${bar(1, 0, 2)}
    ${t(10, 104, 'Sviluppo applicativi, Test e')}${bar(2, 2, 7)}
    ${t(10, 115, 'Implementazione')}
    ${t(10, 148, 'COMPONENTE DUE', true)}
    ${t(10, 170, 'Rilascio e manutenzione')}${bar(5, 8, 14, '#C7E9DF')}
  </svg>`;
}

function footer(n) {
  return [sp({ name: 'Footer Placeholder', x: 35, y: 94, w: 30, h: 4, text: 'Kick-off Progetto Prova', size: 9, ph: 'ftr', txBox: true }), sp({ name: 'Slide Number Placeholder', x: 92, y: 3, w: 5, h: 4, text: String(n), size: 9, ph: 'sldNum', txBox: true })];
}
// scheda ambito: pillole (forma colorata + testo trasparente sopra) con descrizione, e tabella disegnata con le forme
function ambito(n, name, pills, rows) {
  const parts = [title(`Ambito - ${name}`), ...footer(n), sp({ x: 4, y: 12, w: 92, h: 10, text: `Il progetto prevede ${name.toLowerCase()} con queste componenti:`, txBox: true, autofit: n === 4 ? 0.9 : undefined })];
  pills.forEach(([label, desc], i) => {
    const x = 6 + (i % 2) * 48; const y = 26 + Math.floor(i / 2) * 18;
    parts.push(sp({ name: 'Rounded Rectangle', x, y, w: 40, h: 5, geom: 'roundRect', fill: ['00B095', '1482AB', '225546', '264457'][i % 4] }));
    parts.push(sp({ name: 'Web Design', x: x + 1, y: y + 0.5, w: 38, h: 4, text: label, size: 12, color: 'FFFFFF', txBox: true }));
    parts.push(sp({ x, y: y + 6, w: 44, h: 8, text: desc, size: 11, txBox: true }));
  });
  parts.push(sp({ x: 4, y: 64, w: 70, h: 4, text: 'Le funzionalità previste prevedono l\'integrazione con le piattaforme abilitanti nazionali.', size: 11, txBox: true }));
  const cols = [8, 30, 54];
  ['FUNZIONALITÀ', 'PIATTAFORMA ABILITANTE', 'FINALITÀ'].forEach((h, c) => parts.push(sp({ name: 'Text 85', x: cols[c], y: 70, w: 20, h: 3.5, text: h, size: 11, bold: true, txBox: true })));
  rows.forEach((r, i) => {
    const y = 76 + i * 6;
    parts.push(sp({ name: 'Rectangle: Rounded Corners', x: 6, y: y - 1, w: 88, h: 5, geom: 'roundRect', fill: '225546' }));
    r.forEach((cell, c) => parts.push(sp({ name: 'Text 90', x: cols[c] + 1, y, w: c === 2 ? 38 : 18, h: 3, text: cell, size: 10, bold: c === 0, color: 'FFFFFF', txBox: true, font: c === 1 ? 'FT Habit Trial' : undefined })));
  });
  return parts;
}

function slides({ totaleSbagliato = false } = {}) {
  resetIds();
  const contratto = [
    ['ID SERVIZIO', 'NOME SERVIZIO', 'VALORE ECONOMICO'].map((t) => ({ text: t, bold: true })),
    ['SVI', 'Sviluppo e manutenzione evolutiva', { text: '€ 100,00', bold: true }],
    ['SS', 'Supporto specialistico', { text: '€ 50,00', bold: true }],
    [{ text: 'TOTALE', gridSpan: 2, fill: '225546', bold: true }, { text: '', hMerge: true }, { text: totaleSbagliato ? '160,00 €' : '150,00 €', fill: '225546', bold: true }],
  ];
  return [
    // 1 copertina
    [sp({ name: 'Title 1', x: 3, y: 16, w: 60, h: 30, text: 'PROGETTO PROVA\nKICK-OFF', size: 40, ph: 'ctrTitle' }), sp({ name: 'Subtitle 2', x: 3, y: 54, w: 60, h: 20, text: 'Basi informative per lo sviluppo (BIPS)\nAQ SAC 3 - Lotto 1', size: 10, ph: 'subTitle' }), sp({ name: 'Date Placeholder 3', x: 3, y: 94, w: 12, h: 4, text: '30/09/2026', size: 9, ph: 'dt' }), sp({ name: 'Rectangle 6', x: 65, y: 0, w: 35, h: 100, fill: '225546' })],
    // 2 indice a due livelli
    [sp({ x: 6, y: 10, w: 44, h: 10, text: 'INDICE', size: 24, bold: true, txBox: true }), sp({ x: 6, y: 20, w: 50, h: 60, paras: [{ text: 'Introduzione' }, { text: 'Ambito' }, { text: 'Gestione dei vivai', lvl: 1 }, { text: 'Vendita online (e-commerce)', lvl: 1 }, { text: 'Masterplan' }, { text: 'Sintesi contratto' }], size: 16, txBox: true })],
    // 3 introduzione
    [title('INTRODUZIONE'), ...footer(3), sp({ x: 4, y: 14, w: 92, h: 20, paras: [{ text: 'Il progetto Prova (PRV) è finanziato dal PR FESR 2021-2027 e usa SPID/CIE, PagoPA e AppIO.', bold: true }], txBox: true }), sp({ x: 4, y: 40, w: 60, h: 20, paras: [{ text: 'Priorità 1: innovazione', lvl: 1 }, { text: 'Priorità 2: inclusione', lvl: 1 }], txBox: true })],
    // 4-5 schede ambito
    ambito(4, 'Gestione dei vivai', [['Anagrafica dei vivai', 'Il gemello digitale della rete dei vivai.'], ['Tracciabilità genetica', 'La banca del germoplasma collegata al campo.']], [['Gestione vivai', 'PDND', 'Interoperabilità con altri enti'], ['Catalogo piante', 'AppIO', 'Notifiche ai cittadini']]),
    ambito(5, 'Vendita online (e-commerce)', [['Catalogo digitale', 'Inventario di legna e pacciame.'], ['Checkout e pagamenti', 'Acquisto sicuro con ritiro o consegna.'], ['Analytics', 'Dati di vendita per le strategie.']], [['Acquisto pacciame', 'PagoPA', 'Pagamento online tracciabile']]),
    // 6 masterplan: Gantt come immagine SVG
    [title('MASTERPLAN'), ...footer(6), sp({ x: 2, y: 14, w: 14, h: 10, text: 'Di seguito il piano di progetto.', size: 10, txBox: true }), pic({ name: 'Picture 103', x: 18, y: 12, w: 78, h: 80, media: { file: 'image1.svg', data: ganttSvg(), type: 'image/svg+xml' } })],
    // 7 sintesi contratto: tabella con totale a celle unite
    [title('SINTESI CONTRATTO ESECUTIVO'), ...footer(7), sp({ x: 4, y: 12, w: 92, h: 10, paras: [{ text: 'Consuntivazione a SAL trimestrale.', bold: true }], txBox: true }), tbl({ name: 'Table 6', x: 10, y: 30, w: 80, h: 50, rows: contratto })],
  ];
}

const SECTIONS = [{ name: 'Copertina', slides: [1] }, { name: 'Indice', slides: [2] }, { name: 'Introduzione', slides: [3] }, { name: 'Ambito', slides: [4, 5] }, { name: 'Masterplan', slides: [6] }, { name: 'Sintesi contratto', slides: [7] }];

const kickoff = (opts) => packDeck(slides(opts), {
  title: 'Kick-off di prova', sections: SECTIONS, theme: THEME, company: 'Fornitore di prova S.p.A.',
  layoutShapes: [sp({ name: 'Logo', x: 1, y: 94, w: 10, h: 4, fill: '225546', text: 'RISERVATO', size: 8, color: 'FFFFFF' }), sp({ name: 'Rectangle 3', x: 0, y: 9, w: 12, h: 0.6, fill: '225546' })],
});

module.exports = { kickoff, SECTIONS };
