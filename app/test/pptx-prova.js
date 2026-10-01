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

module.exports = { pptx };
