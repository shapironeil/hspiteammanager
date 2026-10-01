'use strict';
// Motore Word: lettura strutturata di un .docx, compilazione del verbale SAL da dati (modello inventato con gli stessi
// ancoraggi di quello vero), compilazione generica, controlli, calcoli del SAL, rotte /api/word e /api/sal.
// Nessun file di un cliente: il modello di prova lo costruisce docx-new.js.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startPortal, setupHacker, addUser } = require('./helpers');
const { readZip } = require('../src/celle/zip');
const { newDocx, salTemplate } = require('../src/word/docx-new');
const { readDocx } = require('../src/word/docx-read');
const { openDocx, mergeRuns, replaceInParagraph, paraText } = require('../src/word/docx-write');
const { compilaVerbaleSAL, compilaGenerico } = require('../src/word/sal-verbale');
const { controllaDocx } = require('../src/word/controlli');
const SAL = require('../src/sal');

let portal; let hacker; let luca; let ospite; let pid;

before(async () => {
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  luca = await addUser(portal.base, hacker, 'Luca', 'dipendente');
  ospite = await addUser(portal.base, hacker, 'Ospite', 'dipendente');
  pid = (await hacker.post('/api/projects', { name: 'Regione', members: [luca.id] })).data.id;
});
after(() => portal && portal.stop());

test('calcoli del SAL: mesi dal periodo, codici automatici, totali, ritenuta 0,5%, IVA 22%, controlli di coerenza', () => {
  const d = SAL.esempio();
  assert.deepEqual(d.mesi, ['Aprile 2026', 'Maggio 2026', 'Giugno 2026']);
  assert.equal(d.periodo.etichetta, 'Aprile – Giugno 2026');
  assert.deepEqual(d.servizi.map((s) => s.codice), ['S_1', 'S_2']);
  assert.deepEqual(d.servizi[0].attivita.map((a) => [a.codice, a.breve]), [['S_1.1', 'A_1'], ['S_1.2', 'A_2']]);
  assert.equal(d.servizi[0].importoAttuale, 22000);
  assert.deepEqual(d.economics, { ...d.economics, totale: 40000, importoAttuale: 25000, ritenuta: 125, credito: 24875, iva: 5472.5, totaleFattura: 30347.5 });
  assert.equal(SAL.euro(1234.5), '€ 1.234,50');
  assert.equal(SAL.pct(0.735), '73,5%');
  assert.deepEqual(SAL.controlla(d), []);
  const bad = SAL.calcola({ periodo: { da: '2026-04-01', a: '2026-04-30' }, servizi: [{ nome: 'X', attivita: [{ nome: 'a', valore: 100, importiMese: [80], importoPrecedente: 50 }, { codice: 'S_1.1', nome: 'b' }] }], componentiRTI: [{ nome: 'C', totale: 100, attuale: 10 }] });
  const c = SAL.controlla(bad);
  assert.ok(c.some((x) => x.level === 'errore' && /supera il valore/.test(x.text)), 'avanzamento oltre il valore');
  assert.ok(c.some((x) => x.level === 'errore' && /ripetuti/.test(x.text)), 'codici ripetuti');
  assert.ok(c.some((x) => x.level === 'errore' && /componente RTI/.test(x.text)), 'componenti RTI contro attivita\'');
});

test('lettura: capitoli, tabelle, sezioni, segnaposto, campi, intestazioni; scrittura: run uniti, frasi spezzate', () => {
  const tpl = salTemplate();
  const st = readDocx(tpl, { fileName: 'modello.docx' });
  assert.deepEqual(st.capitoli.map((c) => c.titolo).slice(0, 6), ['Informazioni di verbalizzazione', 'Rappresentanti Amministrazione', 'Rappresentanti RTI', 'Riferimenti', 'Premessa', 'Avanzamento Piano di Lavoro']);
  assert.equal(st.capitoli.find((c) => /Tabella di raccordo/.test(c.titolo)).livello, 3);
  assert.deepEqual(st.sezioni.map((s) => s.orientamento), ['portrait', 'landscape', 'portrait']);
  assert.equal(st.tabelle.length, 12);
  assert.ok(st.segnaposto.length > 40);
  assert.ok(st.capitoli.find((c) => c.titolo === 'Consuntivazione').tabelle.length === 2, 'le tabelle appartengono al capitolo');
  // un paragrafo spezzato in tre run (grassetto, evidenziato, normale) si trova e si sostituisce lo stesso
  const p = '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Totale: </w:t></w:r><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>[Inserire</w:t></w:r><w:r><w:t xml:space="preserve"> importo] oltre IVA</w:t></w:r></w:p>';
  assert.equal(paraText(p), 'Totale: [Inserire importo] oltre IVA');
  const r = replaceInParagraph(p, '[Inserire importo]', '€ 10,00');
  assert.equal(r.n, 1);
  assert.equal(paraText(r.xml), 'Totale: € 10,00 oltre IVA');
  assert.ok(!/highlight/.test(r.xml), 'il run compilato perde l\'evidenziazione');
  assert.ok(/<w:b\/>/.test(r.xml), 'il grassetto del primo run resta');
  const two = '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>ab</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>cd</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ef</w:t></w:r></w:p>';
  assert.equal((mergeRuns(two).match(/<w:r>/g) || []).length, 2, 'run uguali uniti, proofErr tolti');
  // tabelle: righe copiate dalla riga modello, celle con riempimento
  const doc = openDocx(tpl);
  const t = doc.findTable(/Nome e Cognome \| Società/);
  doc.fillTable(t, { modelRow: 1, rows: [['Anna', 'Capofila'], [{ text: 'Gigi', fill: 'FFFF00' }, 'Mandante']] });
  assert.deepEqual(t.rows, [['Nome e Cognome', 'Società'], ['Anna', 'Capofila'], ['Gigi', 'Mandante']]);
  assert.ok(/w:fill="FFFF00"/.test(t.xml));
  assert.equal(doc.replaceAll('[Inserire Scrivente]', 'Maria'), 1);
  assert.equal(doc.replaceAll('[Inserire Facilitatori]', 'Luca'), 1, 'la seconda sostituzione parte dal documento gia\' modificato');
  const out = readDocx(doc.save());
  assert.ok(!out.segnaposto.some((s) => /Scrivente|Facilitatori/.test(s.testo)));
});

test('verbale SAL compilato dai dati: tabelle, paragrafi per servizio e attivita\', mesi, economics, niente segnaposto', () => {
  const dati = SAL.esempio();
  const r = compilaVerbaleSAL(salTemplate(), dati, { autore: 'Prova' });
  assert.deepEqual(r.rimasti, [], 'nessun segnaposto rimasto');
  assert.deepEqual(r.note, []);
  const st = readDocx(r.buf);
  const tab = (n) => st.blocchi.filter((b) => b.tipo === 'tabella')[n].celle.map((row) => row.map((c) => c.testo));
  assert.deepEqual(tab(0)[1].slice(1, 4), ['Roma – 10/07/2026', 'Facilitatore:', 'Nome Facilitatore']);
  assert.deepEqual(tab(2), [['Nome e Cognome', 'Società'], ['Nome Cognome', 'Società capofila'], ['Nome Cognome', 'Società mandante']]);
  assert.equal(tab(3)[1][0], 'AQ-2025-01');
  assert.match(tab(3)[1][1], /15\/01\/2025.*servizi applicativi.*CIG Lotto 1.*A0000000AA/);
  assert.match(tab(3)[4][1], /01\/07\/2025.*B0000000BB.*C00000000000000/);
  // piano di lavoro: intestazione con i mesi, righe di gruppo e di attivita', mese attivo colorato
  const gantt = st.blocchi.filter((b) => b.tipo === 'tabella')[4];
  assert.deepEqual(gantt.celle[0].map((c) => c.testo), ['#', 'Nome Attività', 'Aprile', 'Maggio', 'Giugno']);
  assert.deepEqual(gantt.celle.map((row) => row[0].testo), ['#', '', 'SVI', 'A_1', 'A_2', 'SS', 'B_1']);
  assert.deepEqual(gantt.celle[4].slice(2).map((c) => c.fill), ['FFFFFF', 'DAE9F7', 'DAE9F7'], 'A_2 lavora a maggio e giugno');
  // resoconto per servizio
  const ps = st.blocchi.filter((b) => b.tipo === 'paragrafo').map((b) => b.testo);
  assert.ok(ps.includes('A – Servizio di Sviluppo e Manutenzione Evolutiva del Software (S_1)'));
  assert.ok(ps.includes('A2 – Sviluppo del modulo anagrafiche (S_1.2)'));
  assert.ok(ps.includes('Piano di test'));
  assert.ok(!ps.some((t) => /Inserire nome/.test(t)));
  // economics (sezione orizzontale) e fatturazione
  const eco = tab(7);
  assert.deepEqual(eco[0].slice(-1), ['2026']);
  assert.deepEqual(eco[2].slice(-3), ['Aprile 2026', 'Maggio 2026', 'Giugno 2026']);
  assert.deepEqual(eco[4], ['S_1', '100', '€ 300,00', 'A', 'Servizio di Sviluppo e Manutenzione Evolutiva del Software (S_1)', '€ 30.000,00', '€ 4.000,00', '€ 10.000,00', '€ 8.000,00']);
  assert.deepEqual(eco[5].slice(0, 6), ['S_1.1', '', '', 'A_1', 'Analisi dei requisiti', '€ 12.000,00']);
  assert.deepEqual(eco[eco.length - 1].slice(-4), ['€ 40.000,00', '€ 5.000,00', '€ 11.000,00', '€ 9.000,00']);
  assert.deepEqual(tab(6)[3], ['TOTALE', '€ 40.000,00', '€ 25.000,00', '€ 2.000,00', '68,0%']);
  assert.deepEqual(tab(8)[1], ['S_1', 'A_1 – Analisi dei requisiti', '€ 12.000,00', '€ 10.000,00', '83,0%', '']);
  assert.deepEqual(tab(9).slice(1).map((r) => r[1]), ['€ 25.000,00', '€ 125,00', '€ 24.875,00', '€ 5.472,50', '€ 30.347,50']);
  assert.ok(ps.some((t) => /dal 01\/04\/2026 al 30\/06\/2026 risulta pari ad € 25\.000,00/.test(t)));
  assert.ok(ps.some((t) => /credito relativo pari a € 24\.875,00/.test(t)));
  assert.ok(ps.some((t) => /mesi di Aprile – Giugno 2026, per l’importo pari rispettivamente a 24\.875,00 €/.test(t)));
  assert.equal(st.commenti.length, 0);
  assert.ok(st.aggiornaCampiAllApertura, 'Word aggiorna l\'indice all\'apertura');
  assert.deepEqual(controllaDocx(st).filter((c) => c.level !== 'info'), [], 'nessun avviso sul documento compilato');
  // il pacchetto resta un docx valido: parti presenti, document.xml ben formato nelle parti toccate
  const zip = readZip(r.buf);
  assert.ok(zip.has('word/document.xml') && zip.has('word/settings.xml'));
  assert.ok(/<w:updateFields w:val="true"\/>/.test(zip.get('word/settings.xml')().toString()));
});

test('controlli: segnaposto rimasti, prospetto che non quadra, totale per componente sbagliato', () => {
  const st = readDocx(salTemplate());
  const c = controllaDocx(st);
  assert.ok(c.some((x) => x.level === 'avviso' && /Segnaposto da compilare: \[Inserire Scrivente\]/.test(x.text)));
  const wrong = newDocx([{ h1: 'Fatturazione attiva' }, { table: { rows: [['', ''], ['Importo', '€ 1.000,00'], ['Ritenuta 0,5%', '€ 5,00'], ['Credito', '€ 995,00'], ['IVA al 22%', '€ 200,00'], ['TOTALE FATTURA', '€ 1.195,00']] } },
    { h1: 'Consuntivazione' }, { table: { rows: [['Componente RTI', 'Totale', 'SAL'], ['A', '€ 10,00', '€ 5,00'], ['B', '€ 10,00', '€ 5,00'], ['TOTALE', '€ 20,00', '€ 11,00']] } }]);
  const c2 = controllaDocx(readDocx(wrong));
  assert.ok(c2.some((x) => x.level === 'errore' && /IVA/.test(x.text)), 'IVA non e\' il 22%');
  assert.ok(c2.some((x) => x.level === 'errore' && /TOTALE della colonna 3/.test(x.text)), 'totale per componente');
  assert.ok(!c2.some((x) => /ritenuta/.test(x.text) && x.level === 'errore'), 'la ritenuta e\' giusta');
});

test('compilazione generica di un modello: sostituzioni e tabelle a righe', () => {
  const r = compilaGenerico(salTemplate(), { sostituzioni: { '[Inserire Scrivente]': 'Gino', '[Inserire Facilitatori]': 'Pina' }, tabelle: [{ cerca: 'Società', rigaModello: 1, righe: [['A', 'B'], ['C', 'D']] }], commenti: false });
  assert.deepEqual(r.esiti.sostituzioni, { '[Inserire Scrivente]': 1, '[Inserire Facilitatori]': 1 });
  assert.deepEqual(r.esiti.tabelle, [{ cerca: 'Società', ok: true, righe: 2 }]);
  const st = readDocx(r.buf);
  assert.deepEqual(st.tabelle[2].righe, 3);
  assert.ok(!st.segnaposto.some((s) => /Scrivente/.test(s.testo)));
});

test('API: lettura e controlli di un .docx, modelli del progetto, verbale SAL nella cartella del checkpoint, scarico, permessi', async () => {
  const tpl = salTemplate();
  const read = await luca.put('/api/word/leggi?name=modello.docx', tpl);
  assert.equal(read.status, 200, JSON.stringify(read.data));
  assert.equal(read.data.struttura.capitoli.length, 11);
  assert.ok(read.data.controlli.some((c) => /Segnaposto/.test(c.text)));
  assert.equal((await luca.put('/api/word/leggi?name=x.docx', Buffer.from('non sono un docx ma un testo abbastanza lungo da passare il controllo della dimensione minima'))).status, 400);
  // modello nel progetto
  const up = await luca.put(`/api/word/modelli?projectId=${pid}&name=Verbale SAL template`, tpl);
  assert.equal(up.status, 201, JSON.stringify(up.data));
  assert.equal(up.data.path, 'Verbali/Modelli/Verbale SAL template.docx');
  const list = (await luca.get(`/api/word/modelli?projectId=${pid}`)).data;
  assert.ok(list.modelli.some((m) => m.path === up.data.path));
  assert.equal((await ospite.get(`/api/word/modelli?projectId=${pid}`)).status, 404, 'chi non e\' nel progetto non vede i modelli');
  // dati dal checkpoint di Verbale Studio
  const cp = await luca.post(`/api/vs/projects/${pid}/checkpoints`, { title: 'SAL 2', date: '2026-07-10', templateId: 'sal' });
  assert.equal(cp.status, 201, JSON.stringify(cp.data));
  await luca.put(`/api/vs/projects/${pid}/checkpoints/${cp.data.id}`, { summary: { synthesis: 'Tutto in linea.', milestones: [{ text: 'M1 raggiunta' }], risks: [{ text: 'Accessi in ritardo', owner: 'Ente', deadline: '2026-07-31' }], decisions: ['Slittamento M3'] } });
  const dc = await luca.post('/api/sal/da-checkpoint', { projectId: pid, checkpointId: cp.data.id, template: { sections: [{ key: 'synthesis', role: 'info' }, { key: 'milestones', role: 'done' }, { key: 'risks', role: 'risk' }, { key: 'decisions', role: 'decision' }] } });
  assert.equal(dc.status, 200, JSON.stringify(dc.data));
  assert.equal(dc.data.dati.sintesi, 'Tutto in linea.');
  assert.deepEqual(dc.data.dati.rischi, [{ text: 'Accessi in ritardo', owner: 'Ente', deadline: '2026-07-31', note: '' }]);
  assert.deepEqual(dc.data.dati.decisioni, [{ text: 'Slittamento M3' }]);
  assert.equal(dc.data.dati.data, '2026-07-10');
  // compilazione: nella cartella del checkpoint, con i controlli
  const dati = { ...SAL.esempio(), ...dc.data.dati, luogo: 'Palermo' };
  const made = await luca.post('/api/word/sal', { projectId: pid, modello: up.data.path, dati, checkpointId: cp.data.id, nome: 'Verbale SAL 2' });
  assert.equal(made.status, 201, JSON.stringify(made.data));
  assert.match(made.data.path, /^Verbali\/2026-07-10 SAL 2\/Verbale SAL 2\.docx$/);
  assert.deepEqual(made.data.rimasti, []);
  assert.equal(made.data.economics.totaleFattura, 30347.5);
  const files = (await luca.get(`/api/explorer/p${pid}/list?path=${encodeURIComponent('Verbali/2026-07-10 SAL 2')}`)).data;
  assert.ok(JSON.stringify(files).includes('Verbale SAL 2.docx'), 'il verbale e\' in Esplora file accanto al checkpoint');
  // dati incoerenti: rifiutati, salvo "forza"
  const bad = await luca.post('/api/word/sal', { projectId: pid, modello: 'esempio', dati: { periodo: { da: '2026-04-01', a: '2026-04-30' }, servizi: [{ nome: 'X', attivita: [{ nome: 'a', valore: 10, importiMese: [20] }] }] } });
  assert.equal(bad.status, 400);
  // scarico diretto con il modello di prova
  const dl = await luca.post('/api/word/sal', { projectId: pid, modello: 'esempio', dati: SAL.esempio(), scarica: true });
  assert.equal(dl.status, 200);
  assert.ok(dl.headers.get('content-type').includes('wordprocessingml'));
  assert.ok(Buffer.isBuffer(dl.data) && dl.data.length > 5000);
  // compilazione generica e documento da zero
  const gen = await luca.post('/api/word/compila', { projectId: pid, modello: up.data.path, sostituzioni: { '[Inserire Scrivente]': 'Gino' }, nome: 'Prova generica' });
  assert.equal(gen.status, 201, JSON.stringify(gen.data));
  assert.equal(gen.data.path, 'Verbali/SAL/Prova generica.docx');
  const nuovo = await luca.post('/api/word/nuovo', { projectId: pid, nome: 'Appunti', blocchi: [{ h1: 'Appunti' }, { p: 'Prima riga' }, { table: { rows: [['a', 'b']] } }] });
  assert.equal(nuovo.status, 201);
  assert.equal((await ospite.post('/api/word/sal', { projectId: pid, modello: 'esempio', dati: SAL.esempio() })).status, 404);
  const ex = await luca.get('/api/sal/esempio');
  assert.equal(ex.data.dati.servizi.length, 2);
});
