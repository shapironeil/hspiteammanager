'use strict';
// SAL (stato avanzamento lavori): l'unico oggetto dei dati da cui nascono il verbale Word (motore Word) e la
// presentazione PowerPoint (Cippi). Qui stanno la forma dei dati, i calcoli economici e i dati d'esempio.
//
// Forma dei dati (tutto facoltativo, i calcoli riempiono quello che manca):
// {
//   progetto: 'Nome del progetto', committente: 'Ente', lotto: '1', numero: 2,
//   periodo: { da: '2026-04-01', a: '2026-06-30', etichetta: 'Aprile – Giugno 2026' },
//   luogo: 'Palermo', data: '2026-07-10', facilitatore: '', scrivente: '',
//   rappresentantiPA: [{ nome, ente, ruolo }], rappresentantiRTI: [{ nome, societa }],
//   riferimenti: { accordoQuadro: { id, data, descrizione, cigLotto }, pianoFabbisogni: { id }, pianoOperativo: { id },
//                  contrattoEsecutivo: { id, data, cig, cup } },
//   mesi: ['Aprile 2026', 'Maggio 2026', 'Giugno 2026'],
//   servizi: [{ codice: 'S_1', lettera: 'A', sigla: 'SVI', nome, quantita, tariffa, valore,
//               attivita: [{ codice: 'S_1.1', breve: 'A_1', nome, descrizione, deliverable: [], mesiAttivi: [0, 1], valore, importiMese: [], importoAttuale, importoPrecedente, gg }] }],
//   componentiRTI: [{ nome, totale, attuale, precedenti }],
//   deliverableCodifica: [{ nome, codice }],
//   precedenti: { importo: 0 },         // avanzamento dei SAL precedenti (complessivo)
//   rischi: [{ text, owner, deadline }], prossimiPassi: [], decisioni: [], sintesi: '',
// }
const RITENUTA = 0.005;
const IVA = 0.22;

const num = (v) => { const n = typeof v === 'string' ? Number(v.replace(/[€\s.]/g, '').replace(',', '.')) : Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(n * 100) / 100;
// 12345.6 -> "12.345,60"
const euro = (n, { simbolo = true } = {}) => {
  const v = round2(num(n));
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  const s = `${v < 0 ? '-' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${d}`;
  return simbolo ? `€ ${s}` : s;
};
const pct = (n) => `${(round2(num(n) * 100)).toFixed(1).replace('.', ',')}%`;
const dataIt = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? iso.split('-').reverse().join('/') : String(iso || ''));
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const cap = (s) => String(s).replace(/^./, (c) => c.toUpperCase());

// I mesi del periodo: ['Aprile 2026', 'Maggio 2026', ...]
function mesiDelPeriodo(periodo) {
  if (!periodo || !/^\d{4}-\d{2}/.test(periodo.da || '') || !/^\d{4}-\d{2}/.test(periodo.a || '')) return [];
  const out = [];
  let [y, m] = periodo.da.split('-').map(Number);
  const [y2, m2] = periodo.a.split('-').map(Number);
  for (let i = 0; i < 36 && (y < y2 || (y === y2 && m <= m2)); i++) { out.push(`${cap(MESI[m - 1])} ${y}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
function etichettaPeriodo(periodo, mesi) {
  if (periodo && periodo.etichetta) return periodo.etichetta;
  if (!mesi.length) return '';
  const a = mesi[0].split(' '); const b = mesi[mesi.length - 1].split(' ');
  if (mesi.length === 1) return mesi[0];
  return a[1] === b[1] ? `${a[0]} – ${b[0]} ${a[1]}` : `${mesi[0]} – ${mesi[mesi.length - 1]}`;
}

// Dati normalizzati e completati con i calcoli: codici, mesi, totali per attivita', servizio, componente, fattura.
function calcola(input = {}) {
  const d = JSON.parse(JSON.stringify(input || {}));
  d.periodo = d.periodo || {};
  d.mesi = Array.isArray(d.mesi) && d.mesi.length ? d.mesi.map(String) : mesiDelPeriodo(d.periodo);
  d.periodo.etichetta = etichettaPeriodo(d.periodo, d.mesi);
  d.lotto = String(d.lotto || '1');
  d.numero = d.numero != null ? Number(d.numero) : null;
  d.servizi = (Array.isArray(d.servizi) ? d.servizi : []).map((s, i) => {
    const lettera = s.lettera || String.fromCharCode(65 + i);
    const codice = s.codice || `S_${i + 1}`;
    const attivita = (Array.isArray(s.attivita) ? s.attivita : []).map((a, j) => {
      const importiMese = d.mesi.map((m, k) => num(Array.isArray(a.importiMese) ? a.importiMese[k] : 0));
      const mesiAttivi = Array.isArray(a.mesiAttivi) && a.mesiAttivi.length ? a.mesiAttivi.map(Number) : importiMese.map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
      const importoAttuale = a.importoAttuale != null ? num(a.importoAttuale) : round2(importiMese.reduce((x, y) => x + y, 0));
      const valore = num(a.valore);
      const precedente = num(a.importoPrecedente);
      return {
        codice: a.codice || `${codice}.${j + 1}`, breve: a.breve || `${lettera}_${j + 1}`, nome: String(a.nome || ''), descrizione: String(a.descrizione || ''),
        deliverable: (Array.isArray(a.deliverable) ? a.deliverable : String(a.deliverable || '').split('\n')).map((x) => String(x).trim()).filter(Boolean),
        mesiAttivi, importiMese, importoAttuale, importoPrecedente: precedente, valore, gg: a.gg != null ? num(a.gg) : null,
        progress: valore ? round2((importoAttuale + precedente) / valore) : 0,
        percentualeSal: valore ? round2(importoAttuale / valore) : 0,
      };
    });
    const valore = s.valore != null ? num(s.valore) : round2(attivita.reduce((x, a) => x + a.valore, 0));
    const importoAttuale = round2(attivita.reduce((x, a) => x + a.importoAttuale, 0));
    const importoPrecedente = round2(attivita.reduce((x, a) => x + a.importoPrecedente, 0));
    return {
      codice, lettera, sigla: s.sigla || '', nome: String(s.nome || ''), quantita: s.quantita != null ? num(s.quantita) : null, tariffa: s.tariffa != null ? num(s.tariffa) : null,
      valore, importoAttuale, importoPrecedente, importiMese: d.mesi.map((m, k) => round2(attivita.reduce((x, a) => x + a.importiMese[k], 0))),
      progress: valore ? round2((importoAttuale + importoPrecedente) / valore) : 0, attivita,
    };
  });
  const totale = round2(d.servizi.reduce((x, s) => x + s.valore, 0));
  const importoAttuale = d.importo != null ? num(d.importo) : round2(d.servizi.reduce((x, s) => x + s.importoAttuale, 0));
  const precedenti = d.precedenti && d.precedenti.importo != null ? num(d.precedenti.importo) : round2(d.servizi.reduce((x, s) => x + s.importoPrecedente, 0));
  d.componentiRTI = (Array.isArray(d.componentiRTI) ? d.componentiRTI : []).map((c) => {
    const t = num(c.totale); const att = num(c.attuale); const pre = num(c.precedenti);
    return { nome: String(c.nome || ''), totale: t, attuale: att, precedenti: pre, progress: t ? round2((att + pre) / t) : 0 };
  });
  const ritenuta = round2(importoAttuale * RITENUTA);
  const credito = round2(importoAttuale - ritenuta);
  const iva = round2(credito * IVA);
  d.economics = {
    totale, importoAttuale, precedenti, progress: totale ? round2((importoAttuale + precedenti) / totale) : 0,
    ritenuta, credito, iva, totaleFattura: round2(credito + iva),
    componenti: { totale: round2(d.componentiRTI.reduce((x, c) => x + c.totale, 0)), attuale: round2(d.componentiRTI.reduce((x, c) => x + c.attuale, 0)), precedenti: round2(d.componentiRTI.reduce((x, c) => x + c.precedenti, 0)) },
  };
  d.economics.componenti.progress = d.economics.componenti.totale ? round2((d.economics.componenti.attuale + d.economics.componenti.precedenti) / d.economics.componenti.totale) : 0;
  d.deliverableCodifica = (Array.isArray(d.deliverableCodifica) ? d.deliverableCodifica : []).map((x, i) => ({ n: i + 1, nome: String(x.nome || x.text || ''), codice: String(x.codice || '') }));
  for (const k of ['rappresentantiPA', 'rappresentantiRTI', 'rischi', 'prossimiPassi', 'decisioni', 'milestone', 'avanzamento']) d[k] = Array.isArray(d[k]) ? d[k] : [];
  d.riferimenti = { accordoQuadro: {}, pianoFabbisogni: {}, pianoOperativo: {}, contrattoEsecutivo: {}, ...(d.riferimenti || {}) };
  return d;
}

// Controlli sulla coerenza dei dati (prima di compilare)
function controlla(d) {
  const out = [];
  const add = (level, text) => out.push({ level, text });
  if (!d.mesi.length) add('avviso', 'Periodo del SAL senza mesi: indica "da" e "a" (AAAA-MM-GG).');
  if (!d.servizi.length) add('avviso', 'Nessun servizio: il verbale e la presentazione resterebbero vuoti.');
  for (const s of d.servizi) {
    if (!s.nome) add('avviso', `Servizio ${s.codice} senza nome.`);
    if (!s.attivita.length) add('info', `Servizio ${s.codice} senza attività.`);
    for (const a of s.attivita) {
      if (!a.nome) add('avviso', `Attività ${a.codice} senza nome.`);
      if (a.valore && a.importoAttuale + a.importoPrecedente > a.valore + 0.005) add('errore', `${a.codice} ${a.nome}: l'avanzamento (${euro(a.importoAttuale + a.importoPrecedente)}) supera il valore dell'attività (${euro(a.valore)}).`);
      if (!a.deliverable.length) add('info', `${a.codice} ${a.nome}: nessun deliverable indicato.`);
    }
    const somma = round2(s.attivita.reduce((x, a) => x + a.valore, 0));
    if (s.attivita.length && s.valore && Math.abs(somma - s.valore) > 0.01) add('avviso', `${s.codice} ${s.nome}: il valore del servizio (${euro(s.valore)}) non è la somma delle attività (${euro(somma)}).`);
  }
  const e = d.economics;
  if (d.componentiRTI.length && Math.abs(e.componenti.attuale - e.importoAttuale) > 0.01) add('errore', `La consuntivazione per componente RTI (${euro(e.componenti.attuale)}) non coincide con quella per attività (${euro(e.importoAttuale)}).`);
  if (d.componentiRTI.length && e.totale && Math.abs(e.componenti.totale - e.totale) > 0.01) add('avviso', `Il totale per componente RTI (${euro(e.componenti.totale)}) non coincide con il totale dei servizi (${euro(e.totale)}).`);
  const codici = d.servizi.flatMap((s) => s.attivita.map((a) => a.codice));
  const dup = codici.filter((c, i) => codici.indexOf(c) !== i);
  if (dup.length) add('errore', `Codici attività ripetuti: ${[...new Set(dup)].join(', ')}.`);
  if (!d.data) add('info', 'Manca la data del verbale.');
  return out;
}

// Dati dal checkpoint di Verbale Studio: i punti del riepilogo (ruoli done/doing/next/risk/decision/info) diventano
// avanzamento, prossimi passi, rischi e decisioni; le sezioni si riconoscono per ruolo, non per nome.
function daCheckpoint(cp, template, project) {
  const summary = (cp && cp.summary) || {};
  const sections = (template && template.sections) || [];
  const byRole = (role) => sections.filter((s) => s.role === role).flatMap((s) => {
    const v = summary[s.key];
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? { text: x } : { text: x.text || '', owner: x.owner || '', deadline: x.deadline || '', note: x.note || '' }));
    return typeof v === 'string' && v.trim() ? [{ text: v.trim() }] : [];
  });
  const out = {
    progetto: project ? project.name : '', data: cp ? cp.date : '', titolo: cp ? cp.title : '',
    sintesi: byRole('info').map((x) => x.text).join('\n'),
    milestone: byRole('done'), avanzamento: byRole('doing'), prossimiPassi: byRole('next'), rischi: byRole('risk'), decisioni: byRole('decision'),
  };
  // "Partecipanti" (se il template ha una sezione con quel nome) -> rappresentanti, una riga per persona
  const part = sections.find((s) => /partecipant/i.test(s.title || s.key || ''));
  if (part && typeof summary[part.key] === 'string') {
    out.rappresentantiRTI = summary[part.key].split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean).map((nome) => ({ nome, societa: '' }));
  }
  return out;
}

// Dati d'esempio (inventati) per provare le funzioni e come traccia da compilare
function esempio() {
  return calcola({
    progetto: 'Progetto di esempio', committente: 'Ente di esempio', lotto: '1', numero: 2,
    periodo: { da: '2026-04-01', a: '2026-06-30' }, luogo: 'Roma', data: '2026-07-10', facilitatore: 'Nome Facilitatore', scrivente: 'Nome Scrivente',
    rappresentantiPA: [{ nome: 'Nome Cognome', ente: 'Ente di esempio', ruolo: 'RUP' }, { nome: 'Nome Cognome', ente: 'Ente di esempio', ruolo: 'DEC' }],
    rappresentantiRTI: [{ nome: 'Nome Cognome', societa: 'Società capofila' }, { nome: 'Nome Cognome', societa: 'Società mandante' }],
    riferimenti: {
      accordoQuadro: { id: 'AQ-2025-01', data: '2025-01-15', descrizione: 'servizi applicativi', cigLotto: 'A0000000AA' },
      pianoFabbisogni: { id: 'PdF-01' }, pianoOperativo: { id: 'PO-01' },
      contrattoEsecutivo: { id: 'CE-2025-07', data: '2025-07-01', cig: 'B0000000BB', cup: 'C00000000000000' },
    },
    servizi: [
      { codice: 'S_1', lettera: 'A', sigla: 'SVI', nome: 'Servizio di Sviluppo e Manutenzione Evolutiva del Software', quantita: 100, tariffa: 300,
        attivita: [
          { nome: 'Analisi dei requisiti', descrizione: 'Raccolta e formalizzazione dei requisiti con gli uffici.', deliverable: ['Documento dei requisiti v1.0'], valore: 12000, importiMese: [4000, 4000, 2000], importoPrecedente: 0 },
          { nome: 'Sviluppo del modulo anagrafiche', descrizione: 'Realizzazione e test del modulo.', deliverable: ['Modulo anagrafiche (rilascio 1)', 'Piano di test'], valore: 18000, importiMese: [0, 6000, 6000], importoPrecedente: 0 },
        ] },
      { codice: 'S_2', lettera: 'B', sigla: 'SS', nome: 'Servizi di Supporto Tecnico-Specialistico ICT', quantita: 40, tariffa: 250,
        attivita: [{ nome: 'Supporto alla governance', descrizione: 'Affiancamento al gruppo di PM.', deliverable: ['Report mensile di supporto'], valore: 10000, importiMese: [1000, 1000, 1000], importoPrecedente: 2000 }] },
    ],
    componentiRTI: [{ nome: 'Società capofila', totale: 30000, attuale: 22000, precedenti: 0 }, { nome: 'Società mandante', totale: 10000, attuale: 3000, precedenti: 2000 }],
    deliverableCodifica: [{ nome: 'Documento dei requisiti v1.0', codice: 'L1_S1_A1_DOC_REQ_v1.0' }, { nome: 'Report mensile di supporto', codice: 'L1_S2_B1_REP_SUP_2026-06' }],
    sintesi: 'Attività in linea con il piano; nessuna criticità bloccante.',
    rischi: [{ text: 'Ritardo nella consegna degli accessi ai sistemi', owner: 'Ente', deadline: '2026-07-31' }],
    prossimiPassi: [{ text: 'Avvio dei test di integrazione' }, { text: 'Consegna del secondo rilascio' }],
    decisioni: [{ text: 'Approvato lo slittamento di due settimane della milestone M3' }],
  });
}

module.exports = { calcola, controlla, daCheckpoint, esempio, euro, pct, dataIt, num, round2, mesiDelPeriodo, RITENUTA, IVA };
