'use strict';
// Cippi: la presentazione SAL generata dai dati (app/src/sal.js) dentro il modello aziendale (.pptx).
//
//   salDeck(modelloBuf, dati, { sezioni, ripetiAgenda, divisori, pulisci, titolo }) -> Buffer .pptx
//
// Si parte dal file del modello: la copertina resta quella del modello (titolo e data compilati), l'agenda viene
// clonata dalla slide "Agenda" del modello se c'e' (numerazione automatica e rettangolo-indicatore compresi), le altre
// slide del modello vengono tolte e al loro posto entrano le slide generate dai layout del modello stesso.
const { openDeck } = require('./pptx-build');
const SAL = require('../sal');

const BLU = '305496'; const CHIARO = 'DAE9F7'; const VERDE = 'A9D08E'; const VERDE_SCURO = '70AD47'; const BIANCO = 'FFFFFF';
const head = (t) => ({ text: t, bold: true });
const group = (t) => ({ text: t, fill: BLU, color: BIANCO, bold: true });

const SEZIONI = {
  sintesi: 'Sintesi',
  piano: 'Avanzamento del Piano di Lavoro',
  attivita: 'Avanzamento delle attività',
  consuntivazione: 'Consuntivazione',
  fatturazione: 'Fatturazione',
  rischi: 'Rischi e prossimi passi',
};

function chunk(list, n) { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; }

function salDeck(modelBuf, input, opts = {}) {
  const d = SAL.calcola(input);
  const deck = openDeck(modelBuf);
  const original = deck.slideParts().length;
  const L = deck.layouts();
  const pick = (...names) => { for (const n of names) { const l = deck.layoutOf(n); if (l) return l.part; } return undefined; };
  const contenuto = pick('Titolo e contenuto', 'Title and Content') || (L.find((l) => l.hasTitle && l.bodies === 1) || L[0]).part;
  const soloTitolo = pick('Solo titolo', 'Title Only') || contenuto;
  const titolo = opts.titolo || `Stato avanzamento lavori${d.numero ? ` n. ${d.numero}` : ''}${d.periodo.etichetta ? ` – ${d.periodo.etichetta}` : ''}`;

  // quali sezioni, nell'ordine
  const wanted = Array.isArray(opts.sezioni) && opts.sezioni.length ? opts.sezioni.filter((k) => SEZIONI[k]) : Object.keys(SEZIONI);
  const sezioni = wanted.filter((k) => {
    if (k === 'sintesi') return d.sintesi || d.milestone.length || d.avanzamento.length;
    if (k === 'rischi') return d.rischi.length || d.prossimiPassi.length || d.decisioni.length;
    if (k === 'consuntivazione' || k === 'fatturazione') return d.servizi.length || d.componentiRTI.length;
    return d.servizi.length;
  });
  const items = sezioni.map((k) => SEZIONI[k]);

  // copertina: la prima slide del modello (sottotitolo = titolo dell'incontro, data)
  const cover = original ? deck.fillSlide(1, { subtitle: titolo, title: titolo, date: SAL.dataIt(d.data) }) : null;
  if (!cover || !cover.filled) {
    const l = pick('Diapositiva titolo', 'Title Slide');
    deck.addSlide({ layout: l, title: d.progetto || titolo, subtitle: titolo, date: SAL.dataIt(d.data), at: 1 });
  }
  // l'agenda del modello, se c'e' (una slide con "Agenda" o "Indice")
  const agendaSrc = deck.findSlide(/^(agenda|indice|sommario)$/i);
  const agenda = (current) => (items.length ? deck.addAgenda({ items, current, from: agendaSrc || undefined, layout: contenuto, title: 'Agenda' }) : null);
  agenda(opts.ripetiAgenda === false ? -1 : 0);

  const ripeti = (i) => { if (i > 0 && opts.ripetiAgenda !== false) agenda(i); };
  const divisore = (t) => { if (opts.divisori) deck.addSlide({ layout: pick('Intestazione sezione', 'Section Header') || soloTitolo, title: t }); };
  const list = (arr) => arr.map((x) => ({ text: `${x.text || x}${x.owner ? ` (Owner: ${x.owner})` : ''}${x.deadline ? ` → ${SAL.dataIt(x.deadline)}` : ''}` }));

  sezioni.forEach((k, i) => {
    ripeti(i);
    divisore(SEZIONI[k]);
    if (k === 'sintesi') {
      const body = [];
      if (d.sintesi) body.push(...String(d.sintesi).split('\n').filter(Boolean).map((t) => ({ text: t })));
      if (d.milestone.length) { body.push(head('Milestone raggiunte')); body.push(...list(d.milestone).map((x) => ({ ...x, lvl: 1 }))); }
      if (d.avanzamento.length) { body.push(head('Avanzamento')); body.push(...list(d.avanzamento).map((x) => ({ ...x, lvl: 1 }))); }
      deck.addSlide({ layout: contenuto, title: 'Sintesi', body });
    }
    if (k === 'piano') {
      const rows = [['#', 'Nome attività', ...d.mesi.map((m) => m.split(' ')[0])]];
      for (const s of d.servizi) {
        rows.push([group(s.sigla || s.lettera), group(`${s.nome} (${s.codice})`), ...d.mesi.map(() => ({ text: '', fill: BLU }))]);
        for (const a of s.attivita) rows.push([a.breve, a.nome, ...d.mesi.map((m, j) => ({ text: '', fill: a.mesiAttivi.includes(j) ? CHIARO : null }))]);
      }
      deck.addSlide({ layout: soloTitolo, title: SEZIONI.piano, table: { rows, widths: [1, 5, ...d.mesi.map(() => 1)] } });
    }
    if (k === 'attivita') {
      for (const s of d.servizi) {
        const per = chunk(s.attivita, 3);
        (per.length ? per : [[]]).forEach((att, j) => {
          const body = [];
          for (const a of att) {
            body.push({ text: `${a.breve} – ${a.nome} (${a.codice})`, bold: true });
            if (a.descrizione) body.push({ text: a.descrizione, lvl: 1 });
            if (a.deliverable.length) body.push({ text: `Deliverable: ${a.deliverable.join('; ')}`, lvl: 1 });
          }
          deck.addSlide({ layout: contenuto, title: `${s.lettera} – ${s.nome} (${s.codice})${per.length > 1 ? ` (${j + 1}/${per.length})` : ''}`, body: body.length ? body : ['Nessuna attività nel periodo.'] });
        });
      }
      if (d.deliverableCodifica.length) {
        deck.addSlide({ layout: soloTitolo, title: 'Tabella di raccordo – Codifica deliverable', table: { rows: [['#', 'Denominazione del deliverable', 'Denominazione secondo codifica condivisa'], ...d.deliverableCodifica.map((x) => [String(x.n), x.nome, x.codice])], widths: [1, 5, 5] } });
      }
    }
    if (k === 'consuntivazione') {
      const e = d.economics;
      if (d.componentiRTI.length) {
        const rows = [['Componente RTI', 'Totale', 'Avanzamento SAL attuale', 'SAL precedenti', '% progress'],
          ...d.componentiRTI.map((c) => [c.nome, SAL.euro(c.totale), SAL.euro(c.attuale), SAL.euro(c.precedenti), SAL.pct(c.progress)]),
          [group('TOTALE'), group(SAL.euro(e.componenti.totale)), group(SAL.euro(e.componenti.attuale)), group(SAL.euro(e.componenti.precedenti)), group(SAL.pct(e.componenti.progress))]];
        deck.addSlide({ layout: soloTitolo, title: 'Consuntivazione per componente RTI', table: { rows, widths: [3, 2, 2, 2, 1.5] } });
      }
      if (d.servizi.length) {
        const rows = [['Servizio', '#', 'Nome attività', 'Valore', ...d.mesi.map((m) => m.split(' ')[0]), 'SAL attuale']];
        for (const s of d.servizi) {
          rows.push([group(s.codice), group(s.lettera), group(`${s.nome}`), group(SAL.euro(s.valore)), ...s.importiMese.map((v) => group(v ? SAL.euro(v) : '-')), group(SAL.euro(s.importoAttuale))]);
          for (const a of s.attivita) rows.push([a.codice, a.breve, a.nome, SAL.euro(a.valore), ...a.importiMese.map((v) => (v ? SAL.euro(v) : '-')), SAL.euro(a.importoAttuale)]);
        }
        rows.push([group('TOTALE'), group(''), group(''), group(SAL.euro(e.totale)), ...d.mesi.map((m, j) => group(SAL.euro(d.servizi.reduce((x, s) => x + s.importiMese[j], 0)))), group(SAL.euro(e.importoAttuale))]);
        deck.addSlide({ layout: soloTitolo, title: 'Consuntivazione per attività', table: { rows, widths: [1.2, 1, 4, 1.8, ...d.mesi.map(() => 1.6), 1.8], sz: rows.length > 8 ? 900 : 1100 } });
      }
    }
    if (k === 'fatturazione') {
      const e = d.economics;
      const rows = [['Servizio', 'Attività', 'Totale', 'Importo al SAL (IVA esclusa)', '% consuntivazione', 'gg/pp']];
      for (const s of d.servizi) for (const a of s.attivita) rows.push([s.codice, `${a.breve} – ${a.nome}`, SAL.euro(a.valore), SAL.euro(a.importoAttuale), SAL.pct(a.percentualeSal), a.gg != null ? String(a.gg) : '']);
      deck.addSlide({ layout: soloTitolo, title: 'Fatturazione attiva', table: { rows, widths: [1.2, 4, 1.8, 2.2, 1.8, 1] } });
      const prospetto = [[head('Prospetto di ripartizione'), head('')],
        [{ text: 'Importo', fill: VERDE, bold: true }, SAL.euro(e.importoAttuale)],
        [{ text: 'Ritenuta 0,5%', fill: VERDE, bold: true }, SAL.euro(e.ritenuta)],
        [{ text: 'Credito', fill: VERDE, bold: true }, SAL.euro(e.credito)],
        [{ text: 'IVA al 22%', fill: VERDE, bold: true }, SAL.euro(e.iva)],
        [{ text: 'TOTALE FATTURA', fill: VERDE_SCURO, bold: true }, { text: SAL.euro(e.totaleFattura), fill: VERDE_SCURO, bold: true }]];
      deck.addSlide({ layout: contenuto, title: 'Prospetto economico del SAL', body: [{ text: `Avanzamento economico del periodo ${d.periodo.etichetta || ''}: ${SAL.euro(e.importoAttuale)}`, bold: true }, { text: `Credito al netto della ritenuta dello 0,50%: ${SAL.euro(e.credito)} oltre IVA.`, lvl: 1 }, { text: `Avanzamento complessivo (SAL precedenti compresi): ${SAL.pct(e.progress)} di ${SAL.euro(e.totale)}.`, lvl: 1 }], table: { rows: prospetto, widths: [2, 1.5], header: false, box: { x: Math.round(deck.W * 0.55), y: Math.round(deck.H * 0.22), w: Math.round(deck.W * 0.38), h: Math.round(deck.H * 0.5) } } });
    }
    if (k === 'rischi') {
      const body = [];
      if (d.rischi.length) { body.push(head('Rischi e punti di attenzione')); body.push(...list(d.rischi).map((x) => ({ ...x, lvl: 1 }))); }
      if (d.prossimiPassi.length) { body.push(head('Prossimi passi')); body.push(...list(d.prossimiPassi).map((x) => ({ ...x, lvl: 1 }))); }
      if (d.decisioni.length) { body.push(head('Decisioni')); body.push(...list(d.decisioni).map((x) => ({ ...x, lvl: 1 }))); }
      deck.addSlide({ layout: contenuto, title: SEZIONI.rischi, body });
    }
  });

  // via le slide d'esempio del modello (tutte tranne la copertina)
  if (original > 1) deck.removeSlides(Array.from({ length: original - 1 }, (x, i) => i + 2));
  if (opts.pulisci) deck.clean();
  return deck.save();
}

module.exports = { salDeck, SEZIONI };
