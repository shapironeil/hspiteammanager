'use strict';
// Motore Word: il verbale SAL compilato dai dati (app/src/sal.js) dentro il modello .docx del team.
//
//   compilaVerbaleSAL(modelloBuf, dati, { autore }) -> { buf, rimasti: [segnaposto non compilati], economics }
//
// Il modello si riconosce dai suoi "ancoraggi" (titoli dei capitoli, intestazioni delle tabelle, segnaposto tra
// parentesi quadre), non dalla posizione: piccole modifiche al modello non rompono la compilazione. Quello che non
// si trova viene saltato e segnalato tra i "rimasti".
const { openDocx, textOf } = require('./docx-write');
const { readDocx } = require('./docx-read');
const SAL = require('../sal');

const BLU = '305496'; const CHIARO = 'DAE9F7';
const E = (n) => SAL.euro(n);
const dash = (v) => (v ? E(v) : '-');

function compilaVerbaleSAL(modelBuf, input, opts = {}) {
  const d = SAL.calcola(input);
  const doc = openDocx(modelBuf);
  const note = [];
  const data = SAL.dataIt(d.data);
  const n = d.mesi.length;

  // ---- 1. Informazioni di verbalizzazione --------------------------------------------------------
  doc.replaceAll(/^(.*?) – gg\.mm\.aaaa$/m, (m, luogo) => `${d.luogo || luogo} – ${data || 'gg.mm.aaaa'}`);
  doc.replaceAll(/\[Inserire Facilitator[ei]\]/, d.facilitatore || '[Inserire Facilitatori]', { keepHighlight: !d.facilitatore });
  doc.replaceAll('[Inserire Scrivente]', d.scrivente || opts.autore || '[Inserire Scrivente]', { keepHighlight: !(d.scrivente || opts.autore) });

  // ---- 2. e 3. Rappresentanti ------------------------------------------------------------------------
  const pa = doc.findTable(/Ente di appartenenza/);
  if (pa && d.rappresentantiPA.length) doc.fillTable(pa, { modelRow: 1, rows: d.rappresentantiPA.map((r) => [r.nome || '', r.ente || d.committente || '', r.ruolo || '']) });
  const rti = doc.findTable(/Nome e Cognome \| Società/);
  if (rti && d.rappresentantiRTI.length) doc.fillTable(rti, { modelRow: 1, rows: d.rappresentantiRTI.map((r) => [r.nome || '', r.societa || '']) });

  // ---- 4. Riferimenti ------------------------------------------------------------------------------------
  const rif = doc.findTable(/Identificativo \| Titolo/);
  if (rif) {
    const R = d.riferimenti;
    const rows = doc.rowsOf(rif);
    let xml = rif.xml;
    const rowFor = (re) => rows.find((r) => re.test(textOf(r)));
    const fix = (re, fn) => { const r = rowFor(re); if (r) { const neu = fn(r); xml = xml.replace(r, neu); } };
    fix(/Accordo Quadro/, (r) => {
      let x = r;
      if (R.accordoQuadro.id) x = doc.replaceIn(x, /\[inserire identificativo documento[^\]]*\]/i, R.accordoQuadro.id);
      if (R.accordoQuadro.data) x = doc.replaceIn(x, '__/__/____', SAL.dataIt(R.accordoQuadro.data));
      if (R.accordoQuadro.descrizione) x = doc.replaceIn(x, '[Inserire descrizione]', R.accordoQuadro.descrizione);
      if (R.accordoQuadro.cigLotto) x = doc.replaceIn(x, /\[Inserire CIG[^\]]*\]/, R.accordoQuadro.cigLotto);
      x = doc.replaceIn(x, '[Inserire numero lotto]', d.lotto);
      return x;
    });
    fix(/Piano dei Fabbisogni/, (r) => (R.pianoFabbisogni.id ? doc.replaceIn(r, /\[inserire identificativo documento[^\]]*\]/i, R.pianoFabbisogni.id) : r));
    fix(/Piano Operativo/, (r) => (R.pianoOperativo.id ? doc.replaceIn(r, /\[inserire identificativo documento[^\]]*\]/i, R.pianoOperativo.id) : r));
    fix(/Contratto Esecutivo/, (r) => {
      let x = r;
      if (R.contrattoEsecutivo.id) x = doc.replaceIn(x, /\[inserire identificativo documento[^\]]*\]/i, R.contrattoEsecutivo.id);
      if (R.contrattoEsecutivo.data) x = doc.replaceIn(x, '__/__/____', SAL.dataIt(R.contrattoEsecutivo.data));
      if (R.contrattoEsecutivo.cig) x = doc.replaceIn(x, '[Inserire CIG derivato]', R.contrattoEsecutivo.cig);
      if (R.contrattoEsecutivo.cup) x = doc.replaceIn(x, '[Inserire CUP]', R.contrattoEsecutivo.cup);
      return x;
    });
    doc.setTable(rif, xml);
  } else note.push('Tabella dei riferimenti non trovata.');

  // ---- 5. Premessa ------------------------------------------------------------------------------------------
  if (d.periodo.etichetta) doc.replaceAll(/durante il periodo (.+?), rendicontata/, `durante il periodo ${d.periodo.etichetta}, rendicontata`);
  doc.replaceAll(/\bLotto \d+\b/, `Lotto ${d.lotto}`);

  // ---- 6. Avanzamento Piano di Lavoro (Gantt a celle) ------------------------------------------------------
  const gantt = doc.findTable(/# \| Nome Attività \| Mese_1/);
  if (gantt && d.servizi.length) {
    const rows = doc.rowsOf(gantt);
    const grid = doc.gridOf(gantt);
    const total = grid.reduce((a, b) => a + b, 0);
    const monthW = Math.floor((total - grid[0] - grid[1]) / Math.max(1, n));
    const isGroup = (r) => /w:fill="305496"/i.test(doc.cellsOf(r)[0] || '');
    const header = doc.rowWithMonths(rows[0], 2, n, d.mesi.map((m) => m.split(' ')[0]), monthW);
    const all = rows.find((r, i) => i > 0 && /Attività di progetto/.test(textOf(r)));
    const groupModel = rows.find((r, i) => i > 0 && r !== all && isGroup(r));
    const actModel = rows.find((r, i) => i > 0 && !isGroup(r) && /<w:t/.test(doc.cellsOf(r)[0] || ''));
    if (groupModel && actModel) {
      const out = [header];
      if (all) out.push(doc.rowWithMonths(all, 2, n, d.mesi.map(() => ''), monthW));
      for (const s of d.servizi) {
        out.push(doc.rowWithMonths(doc.rowWithTexts(groupModel, [s.sigla || s.lettera, `${s.nome} (${s.codice})`]), 2, n, d.mesi.map(() => ''), monthW));
        for (const a of s.attivita) out.push(doc.rowWithMonths(doc.rowWithTexts(actModel, [a.breve, `${a.nome} (${a.codice})`]), 2, n, d.mesi.map((m, j) => ({ text: '', fill: a.mesiAttivi.includes(j) ? CHIARO : 'FFFFFF' })), monthW));
      }
      const head = gantt.xml.slice(0, gantt.xml.indexOf(rows[0]));
      doc.setTable(gantt, `${head}${out.join('')}</w:tbl>`);
      doc.setGrid(gantt, [grid[0], grid[1], ...d.mesi.map(() => monthW)]);
    } else note.push('Tabella del piano di lavoro: righe modello non riconosciute.');
  }

  // ---- 7. Avanzamento delle attivita' (paragrafi per servizio e attivita') ----------------------------------
  const h7 = doc.heading(/^Avanzamento delle attivit/i);
  const h7b = h7 && (doc.heading(/^Tabella di raccordo/i, h7.at) || doc.heading(/^Consuntivazione/i, h7.at));
  if (h7 && h7b && d.servizi.length) {
    const ps = doc.paragraphsBetween(h7.at, h7b.at);
    const PS = /^[A-Z] – \[Inserire nome Servizio\]/; const PA = /^[A-Z]\d+ – \[Inserire nome Attivit/; const PD = /^\[Inserire descrizione\]/; const PL = /^Deliverable:/; const PI = /^\[Inserire Deliverable\]/;
    const m = { s: ps.find((p) => PS.test(p.text)), a: ps.find((p) => PA.test(p.text)), d: ps.find((p) => PD.test(p.text)), l: ps.find((p) => PL.test(p.text)), i: ps.find((p) => PI.test(p.text)) };
    if (m.s && m.a) {
      const neu = [];
      for (const s of d.servizi) {
        neu.push(doc.clonePara(m.s, `${s.lettera} – ${s.nome} (${s.codice})`));
        for (const a of s.attivita) {
          neu.push(doc.clonePara(m.a, `${s.lettera}${a.breve.replace(/^[A-Z]_/, '')} – ${a.nome} (${a.codice})`));
          if (m.d) neu.push(doc.clonePara(m.d, a.descrizione || '[Inserire descrizione]', { highlight: !a.descrizione }));
          if (m.l) neu.push(m.l.xml);
          if (m.i) { if (a.deliverable.length) for (const x of a.deliverable) neu.push(doc.clonePara(m.i, x)); else neu.push(doc.clonePara(m.i, 'Nessun deliverable nel periodo.')); }
        }
      }
      doc.insertBefore(m.s, neu);
      for (const p of ps.filter((x) => PS.test(x.text) || PA.test(x.text) || PD.test(x.text) || PL.test(x.text) || PI.test(x.text))) doc.remove(p);
    } else note.push('Capitolo "Avanzamento delle attività": paragrafi modello non riconosciuti.');
  }
  // tabella di raccordo dei deliverable
  const del = doc.findTable(/Denominazione del Deliverable/);
  if (del && d.deliverableCodifica.length) doc.fillTable(del, { modelRow: 1, rows: d.deliverableCodifica.map((x) => [String(x.n), x.nome, x.codice]) });

  // ---- 8. Consuntivazione ---------------------------------------------------------------------------------------
  const e = d.economics;
  const comp = doc.findTable(/Componente RTI \| Totale/);
  if (comp && d.componentiRTI.length) {
    const rows = doc.rowsOf(comp);
    const totRow = rows.findIndex((r) => /TOTALE/.test(textOf(r)));
    doc.fillTable(comp, { modelRow: 1, until: totRow > 1 ? totRow : rows.length, rows: d.componentiRTI.map((c) => [c.nome, E(c.totale), E(c.attuale), c.precedenti ? E(c.precedenti) : '-', SAL.pct(c.progress)]) });
    const rows2 = doc.rowsOf(comp);
    const t = rows2.findIndex((r) => /TOTALE/.test(textOf(r)));
    if (t >= 0) [E(e.componenti.totale), E(e.componenti.attuale), e.componenti.precedenti ? E(e.componenti.precedenti) : '-', SAL.pct(e.componenti.progress)].forEach((v, i) => doc.setCell(comp, t, i + 1, v));
  }
  const eco = doc.findTable(/Servizio \| L\[Inserire numero lotto\]|Q\.ta \| Tariffa/);
  if (eco && d.servizi.length) {
    const rows = doc.rowsOf(eco);
    const grid = doc.gridOf(eco);
    const m = Math.max(1, grid.length - 6); // mesi del modello
    const firstW = grid.slice(0, 6).reduce((a, b) => a + b, 0);
    const monthW = Math.min(grid[6] || 1559, Math.floor((14287 - firstW) / Math.max(1, n)));
    const years = [...new Set(d.mesi.map((x) => x.split(' ')[1]).filter(Boolean))].join(' – ');
    // le righe di intestazione sono quelle prima della prima riga di gruppo ("Attività di progetto" o riga blu)
    const isGroup = (r) => /w:fill="305496"/i.test(doc.cellsOf(r)[0] || '');
    const firstBody = rows.findIndex((r, i) => i > 0 && (isGroup(r) || /Attività di progetto/.test(textOf(r))));
    const header = rows.slice(0, firstBody > 0 ? firstBody : 1);
    const out = [];
    for (const r of header) {
      const cells = doc.cellsOf(r);
      const last = cells[cells.length - 1];
      if (/<w:gridSpan/.test(last) && cells.length <= grid.length - m + 1) {
        // riga con la cella dell'anno unita sopra i mesi
        let c = doc.cellWithText(last, years || '[Inserire Anno]').replace(/<w:gridSpan w:val="\d+"\/>/, `<w:gridSpan w:val="${n}"/>`);
        out.push(r.replace(last, c));
      } else out.push(doc.rowWithMonths(r, cells.length - m, n, d.mesi, monthW));
    }
    const body = rows.filter((r) => !header.includes(r));
    const all = body.find((r) => /Attività di progetto/.test(textOf(r)));
    const sModel = body.find((r) => r !== all && isGroup(r));
    const aModel = body.find((r) => !isGroup(r));
    if (sModel && aModel) {
      const keep = (r) => doc.cellsOf(r).length - m;
      if (all) out.push(doc.rowWithMonths(all, keep(all), n, d.mesi.map(() => '-'), monthW));
      for (const s of d.servizi) {
        const q = s.quantita != null ? String(s.quantita) : ''; const tar = s.tariffa != null ? E(s.tariffa) : '';
        out.push(doc.rowWithMonths(doc.rowWithTexts(sModel, [s.codice, q, tar, s.lettera, `${s.nome} (${s.codice})`, E(s.valore)]), keep(sModel), n, s.importiMese.map(dash), monthW));
        for (const a of s.attivita) out.push(doc.rowWithMonths(doc.rowWithTexts(aModel, [a.codice, '', '', a.breve, a.nome, E(a.valore)]), keep(aModel), n, a.importiMese.map(dash), monthW));
      }
      out.push(doc.rowWithMonths(doc.rowWithTexts(sModel, ['TOTALE', '', '', '', '', E(e.totale)]), keep(sModel), n, d.mesi.map((x, j) => E(d.servizi.reduce((acc, s) => acc + s.importiMese[j], 0))), monthW));
      const head = eco.xml.slice(0, eco.xml.indexOf(rows[0]));
      doc.setTable(eco, `${head}${out.join('')}</w:tbl>`);
      doc.setGrid(eco, [...grid.slice(0, 6), ...d.mesi.map(() => monthW)]);
      const w = grid.slice(0, 6).reduce((a, b) => a + b, 0) + monthW * n;
      doc.setTable(eco, eco.xml.replace(/<w:tblW w:w="\d+" w:type="dxa"\/>/, `<w:tblW w:w="${w}" w:type="dxa"/>`));
    } else note.push('Tabella economica: righe modello non riconosciute.');
  }
  doc.replaceAll('L[Inserire numero lotto]', `L${d.lotto}`);

  // ---- 9. Fatturazione attiva -------------------------------------------------------------------------------------
  const fat = doc.findTable(/Importo al SAL Economico/i);
  if (fat && d.servizi.length) {
    const rows = [];
    for (const s of d.servizi) for (const a of s.attivita) rows.push([s.codice, `${a.breve} – ${a.nome}`, E(a.valore), E(a.importoAttuale), SAL.pct(a.percentualeSal), a.gg != null ? String(a.gg) : '']);
    doc.fillTable(fat, { modelRow: 1, rows });
  }
  const pro = doc.findTable(/Ritenuta 0,5%/);
  if (pro) {
    const rows = doc.rowsOf(pro);
    const val = { Importo: e.importoAttuale, Ritenuta: e.ritenuta, Credito: e.credito, IVA: e.iva, TOTALE: e.totaleFattura };
    rows.forEach((r, i) => { const k = Object.keys(val).find((x) => new RegExp(`^${x}`, 'i').test(doc.cellsOf(r)[0] ? textOf(doc.cellsOf(r)[0]).trim() : '')); if (k) doc.setCell(pro, i, 1, E(val[k])); });
  }
  const p1 = doc.findParagraph(/avanzamento economico complessivo/i);
  if (p1) {
    let k = 0;
    let x = doc.replaceIn(p1.xml, /__\/__\/____/, () => SAL.dataIt(k++ === 0 ? d.periodo.da : d.periodo.a) || '__/__/____');
    x = doc.replaceIn(x, /€\s*\[Inserire importo\]/, E(e.importoAttuale));
    doc.swap(p1.xml, x);
  }
  const p2 = doc.findParagraph(/credito relativo/i);
  if (p2) doc.swap(p2.xml, doc.replaceIn(p2.xml, /€\s*\[Inserire importo\]/, E(e.credito)));
  // ---- 10. Accettazione --------------------------------------------------------------------------------------------
  if (d.periodo.etichetta) doc.replaceAll('[inserire periodo di riferimento]', d.periodo.etichetta);
  doc.replaceAll(/\[inserire importo\] €/, `${SAL.euro(e.credito, { simbolo: false })} €`);
  if (data) doc.replaceAll(/\[[Ii]nserire data\]/, data);

  // ---- Chiusura: commenti del modello via, indice da aggiornare, proprieta' ------------------------------------------
  doc.removeComments();
  doc.updateFieldsOnOpen();
  doc.unprotect();
  doc.setCoreProps({ title: `Verbale SAL${d.numero ? ` ${d.numero}` : ''} ${d.periodo.etichetta || ''}`.trim(), creator: opts.autore });
  const buf = doc.save();
  const after = readDocx(buf);
  return { buf, rimasti: after.segnaposto, note, economics: d.economics, dati: d };
}

// Compilazione generica di un modello: sostituzioni (testo -> testo) e tabelle (righe copiate da una riga modello)
//   { sostituzioni: { '[Inserire X]': 'valore' }, tabelle: [{ cerca: 'testo dell\'intestazione', rigaModello: 1, righe: [[...]] }],
//     commenti: false, aggiornaCampi: true }
function compilaGenerico(modelBuf, spec = {}) {
  const doc = openDocx(modelBuf);
  const esiti = { sostituzioni: {}, tabelle: [] };
  for (const [k, v] of Object.entries(spec.sostituzioni || {})) esiti.sostituzioni[k] = doc.replaceAll(k, String(v == null ? '' : v));
  for (const t of spec.tabelle || []) {
    const tab = doc.findTable(t.cerca instanceof RegExp ? t.cerca : String(t.cerca || ''));
    if (!tab || !Array.isArray(t.righe)) { esiti.tabelle.push({ cerca: t.cerca, ok: false }); continue; }
    doc.fillTable(tab, { modelRow: Number(t.rigaModello) || 1, until: t.fino, keepModel: !!t.tieniModello, rows: t.righe.map((r) => (Array.isArray(r) ? r : [r]).map((c) => (c == null ? '' : c))) });
    esiti.tabelle.push({ cerca: t.cerca, ok: true, righe: t.righe.length });
  }
  if (spec.commenti === false) doc.removeComments();
  if (spec.aggiornaCampi !== false) doc.updateFieldsOnOpen();
  if (spec.evidenziazioni === false) doc.removeHighlight();
  const buf = doc.save();
  return { buf, esiti, rimasti: readDocx(buf).segnaposto };
}

module.exports = { compilaVerbaleSAL, compilaGenerico };
