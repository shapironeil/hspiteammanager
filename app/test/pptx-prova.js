'use strict';
// Presentazione PowerPoint di prova, costruita da zero (nessun file vero di un cliente nei test).
// Ha la struttura tipica dei documenti di processo del team: copertina con titolo e data, indice, sezioni con
// divisore, slide di testo con elenchi, legenda dei colori, flussi a corsie (To-Be e As-Is dello stesso processo,
// con step numerati, decisioni Si/No, sistemi SAP, rimandi ad altri processi, note) e chiusura.
const { sp, cxn, title, packDeck, resetIds } = require('../src/cippi/pptx-new');

function flowSlide(heading, { variant }) {
  const parts = [title(heading)];
  const laneA = sp({ name: 'Corsia', x: 1, y: 15, w: 8, h: 35, fill: '44546A', text: 'Ufficio Richiedente' });
  const laneB = sp({ name: 'Corsia', x: 1, y: 52, w: 8, h: 40, fill: '44546A', text: 'Ufficio Acquisti' });
  const start = sp({ x: 11, y: 25, w: 2, h: 6, geom: 'homePlate', fill: '005EA8', text: 'START' });
  const s1 = sp({ x: 15, y: 25, w: 10, h: 7, fill: variant === 'To-Be' ? '92D050' : 'FFFFFF', line: '000000', text: '1. Richiesta di acquisto' });
  const sap = sp({ x: 23, y: 30, w: 4, h: 4, geom: 'flowChartMagneticDisk', fill: '307FE2', text: 'SAP' });
  const d2 = sp({ x: 15, y: 58, w: 11, h: 10, geom: 'flowChartDecision', fill: 'FFFFFF', line: '000000', text: '2. Budget disponibile?' });
  const s3 = sp({ x: 35, y: 58, w: 10, h: 7, fill: variant === 'To-Be' ? 'FFFF00' : 'FFFFFF', line: '000000', text: variant === 'To-Be' ? '3. Approvazione del responsabile' : '3. Approvazione del direttore' });
  const s4 = sp({ x: 35, y: 78, w: 10, h: 7, fill: 'FFFFFF', line: '000000', text: '4. Revisione del budget' });
  const link = sp({ x: 60, y: 58, w: 12, h: 7, fill: 'FFFFFF', line: '000000', text: '4.1.2.2 Emissione Ordine' });
  const end = sp({ x: 80, y: 60, w: 6, h: 4, geom: 'flowChartTerminator', fill: 'D9D9D9', text: 'END' });
  const note = sp({ x: 50, y: 20, w: 20, h: 8, geom: 'borderCallout1', fill: 'FFFFFF', line: 'FFC000', text: 'Il controllo del budget avviene in SAP' });
  const si = sp({ x: 28, y: 58, w: 2, h: 3, text: 'Si', txBox: true });
  const no = sp({ x: 18, y: 70, w: 2, h: 3, text: 'No', txBox: true });
  parts.push(laneA, laneB, start, s1, sap, d2, s3, s4, link, end, note, si, no);
  parts.push(cxn(start, s1, { x: 13, y: 28, w: 2, h: 0 }), cxn(s1, d2, { x: 20, y: 32, w: 0, h: 26 }),
    cxn(d2, s3, { x: 26, y: 63, w: 9, h: 0 }), cxn(d2, s4, { x: 20, y: 68, w: 0, h: 10 }), cxn(s3, link, { x: 45, y: 61, w: 15, h: 0 }), cxn(link, end, { x: 72, y: 61, w: 8, h: 0 }));
  return parts;
}

function slides() {
  resetIds();
  return [
    [sp({ x: 10, y: 40, w: 60, h: 10, text: 'Flusso Acquisti To-Be', size: 32, bold: true, txBox: true }), sp({ x: 10, y: 52, w: 40, h: 5, text: 'Project Closure', size: 16, txBox: true }), sp({ x: 10, y: 58, w: 40, h: 5, text: 'Luglio, 2023', size: 12, txBox: true })],
    [sp({ x: 5, y: 10, w: 30, h: 15, text: 'Indice', size: 54, txBox: true }), sp({ x: 45, y: 20, w: 50, h: 40, paras: [{ text: 'Obiettivi del progetto' }, { text: 'Flusso Acquisti To Be' }, { text: 'Back Up' }], size: 16, txBox: true })],
    [title('Obiettivi del progetto'), sp({ x: 4, y: 14, w: 90, h: 10, paras: [{ text: 'Il progetto definisce i processi To Be del flusso acquisti con il supporto del CDR (Centro di Responsabilità).', bold: true }], txBox: true }),
      sp({ x: 6, y: 30, w: 30, h: 4, text: 'Attività svolte', bold: true, txBox: true }),
      sp({ x: 6, y: 36, w: 80, h: 20, paras: [{ text: 'Analisi dei processi', lvl: 1 }, { text: 'Disegno To Be con i Key User del CDR', lvl: 1 }], txBox: true })],
    [sp({ x: 10, y: 40, w: 70, h: 12, text: 'Flusso Acquisti To Be', size: 40, txBox: true })],
    [title('Legenda Flow Chart To Be'), sp({ x: 4, y: 45, w: 10, h: 3, text: 'Legenda', txBox: true }),
      sp({ x: 5, y: 58, w: 6, h: 3, fill: '92D050', line: '000000' }), sp({ x: 12.5, y: 58.2, w: 34, h: 2.7, text: 'Nuovo step di processo introdotto nel To Be', txBox: true }),
      sp({ x: 5, y: 64, w: 6, h: 3, fill: 'FFFF00', line: '000000' }), sp({ x: 12.5, y: 64.2, w: 34, h: 2.7, text: 'Modifica dello step di processo previsto da As-Is', txBox: true })],
    flowSlide('Processi To Be: 4.1.2.1 Prenotazione di Spesa', { variant: 'To-Be' }),
    [sp({ x: 10, y: 40, w: 70, h: 12, text: 'Back Up', size: 40, txBox: true })],
    flowSlide('Processi As-Is: 4.1.2.1 Prenotazione di Spesa', { variant: 'As-Is' }),
    [sp({ x: 40, y: 40, w: 30, h: 20, paras: [{ text: 'Sede Operativa' }, { text: 'Tel: +39 06 0000000' }], txBox: true })],
  ];
}

const pptx = () => packDeck(slides(), { title: 'Prova' });

// Presentazione di kick-off di prova (come i kick-off e le offerte del team): copertina con data, indice numerato,
// contesto, piano (Gantt disegnato con i mesi), team (organigramma), numeri in evidenza, tabella disegnata con le forme.
// Con qualche difetto apposta: un refuso nel titolo citato dall'indice, un segnaposto "xxxxxx", una parte 2/2 che manca,
// un carattere fuori tema. native = false toglie le sezioni native di PowerPoint (i capitoli vengono dall'indice).
function kickoffSlides() {
  resetIds();
  const box = (x, y, w, text) => sp({ x, y, w, h: 7, geom: 'roundRect', fill: 'C0504D', text, size: 16, bold: true });
  const names = (x, y) => sp({ x, y, w: 14, h: 9, paras: [{ text: 'Persona Uno' }, { text: 'Persona Due' }], size: 12, txBox: true });
  const dir = box(38, 28, 22, 'Direzione Progetto'); const pm = box(38, 47, 22, 'Project Management'); const team = box(31, 79, 18, 'Project Team');
  const month = (i, m) => sp({ x: 23 + i * 5.6, y: 15, w: 5.6, h: 4.4, geom: 'homePlate', fill: '6F2927', text: m, size: 12 });
  const cell = (r, c, text, bold) => sp({ x: 5 + c * 22, y: 20 + r * 6, w: 20, h: 5, text, size: 10, bold, txBox: true });
  const grid = [['ID', 'Nome KPI', 'Formula', 'Fonte dato'], ['KPI-0001', 'Puntualità', 'Corse regolari / totali', 'Sistema A'], ['KPI-0002', 'Regolarità', 'Corse effettuate / programmate', 'Sistema B'], ['KPI-0003', 'Load factor', 'Passeggeri / posti', 'Sistema C']];
  return [
    [sp({ x: 4, y: 40, w: 24, h: 18, text: 'Kick-Off\nData Platform', size: 40, bold: true, txBox: true }), sp({ x: 4, y: 83, w: 15, h: 5, text: '4 Maggio, 2026', size: 14, txBox: true })],
    [sp({ x: 1, y: 40, w: 36, h: 18, text: 'INDICE', size: 48, bold: true, txBox: true }), sp({ x: 43, y: 25, w: 55, h: 55, paras: [{ text: 'Introduzione e Contesto', numbered: true }, { text: 'Piano di progetto', numbered: true }, { text: 'Team di progetto', numbered: true }, { text: 'Quick Win KPI', numbered: true }], size: 18, txBox: true })],
    [title('INTRODUZIONE E CONTESTO'), sp({ x: 4, y: 12, w: 92, h: 20, paras: [{ text: 'Il cliente gestisce una rete estesa e vuole una Data Platform di nuova generazione.', bold: true }, { text: 'Di seguito le fasi principali dell\'iniziativa.' }], size: 14, txBox: true })],
    [title('PIANO DI PROGETTO'), ...['APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET'].map((m, i) => month(i, m)),
      sp({ x: 6, y: 20, w: 16, h: 13, fill: 'FFFFFF', line: '7F7F7F', text: 'Fase 1 – Definizione delle Governance', size: 12 }), sp({ x: 6, y: 35, w: 16, h: 16, fill: 'FFFFFF', line: '7F7F7F', text: 'Fase 2 – Primo caso d\'uso', size: 12 }),
      sp({ x: 24, y: 24, w: 16, h: 2, fill: 'BFBFBF' }), sp({ x: 24, y: 40, w: 28, h: 2, fill: 'BFBFBF' })],
    [title('TEAM DI PROGETTO'), dir, pm, team, names(21, 28), names(63, 28), names(21, 47), cxn(dir, pm, { x: 49, y: 35, w: 0, h: 12 }), cxn(pm, team, { x: 49, y: 54, w: 0, h: 25 }), cxn(dir, team, { x: 36, y: 65, w: 26, h: 0 })],
    [title('QUICK WIN KIP'), sp({ x: 4, y: 12, w: 92, h: 5, text: 'Inquadramento dell\'esercizio di selezione KPI:', size: 14, txBox: true }), sp({ x: 4, y: 20, w: 44, h: 30, paras: [{ text: 'Azure Databricks è la piattaforma scelta per il Quick Win.', bold: true }, { text: 'Approccio portability-first.' }], size: 12, font: 'Comic Sans MS', txBox: true }), sp({ x: 4, y: 90, w: 10, h: 4, text: 'xxxxxx', size: 12, txBox: true })],
    [title('NUMERICHE KPI'), sp({ x: 6, y: 36, w: 27, h: 15, text: '59', size: 64, bold: true, txBox: true }), sp({ x: 7, y: 52, w: 25, h: 6, text: 'KPI totali nel CdS', size: 14, bold: true, txBox: true }),
      sp({ x: 36, y: 36, w: 27, h: 15, text: '26', size: 64, bold: true, txBox: true }), sp({ x: 37, y: 52, w: 25, h: 6, text: 'KPI esclusi dal Quick Win', size: 14, bold: true, txBox: true })],
    [title('CATALOGO KPI (1/2)'), ...grid.flatMap((row, r) => row.map((t, c) => cell(r, c, t, r === 0)))],
  ];
}
const kickoffHspi = ({ native = true } = {}) => packDeck(kickoffSlides(), { title: 'Kick-off di prova', layoutName: 'Diapositiva titolo', sections: native ? [{ name: 'Intro', slides: [1, 2] }, { name: 'Contenuti', slides: [3, 4, 5, 6, 7, 8] }] : null });

module.exports = { pptx, kickoffHspi };
