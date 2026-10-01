'use strict';
// Cippi: importazione e lettura della struttura, revisione (punti chiave, glossario), modifica ed esportazione,
// modelli e nuovi documenti da modello, archivio nella cartella del progetto, collegamento con GestioneCelle, permessi.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { startPortal, setupHacker, addUser } = require('./helpers');
const { pptx } = require('./pptx-prova');
const { kickoff } = require('./pptx-kickoff-prova');
const { readZip } = require('../src/celle/zip');
const { readPptx } = require('../src/cippi/pptx-read');
const { analyze } = require('../src/cippi/analyze');

let portal; let hacker; let mario; let luca; let ospite; let pid; let docId; let modelId;

before(async () => {
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  mario = await addUser(portal.base, hacker, 'Mario', 'manager');
  luca = await addUser(portal.base, hacker, 'Luca', 'dipendente');
  ospite = await addUser(portal.base, hacker, 'Ospite', 'dipendente');
  pid = (await hacker.post('/api/projects', { name: 'Acquisti', members: [mario.id, luca.id] })).data.id;
});
after(() => portal && portal.stop());

test('lettura: tipi di slide, sezioni dall\'indice, legenda, flussi, confronto To-Be/As-Is, sigle', () => {
  const a = analyze(readPptx(pptx()));
  assert.deepEqual(a.slides.map((s) => s.kind), ['titolo', 'indice', 'testo', 'divisore', 'legenda', 'flusso', 'divisore', 'flusso', 'chiusura']);
  assert.deepEqual(a.sections.map((s) => s.title), ['Apertura', 'Flusso Acquisti To Be', 'Back Up']);
  assert.deepEqual(a.legend.map((l) => l.meaning), ['nuovo', 'modificato']);
  const f = a.slides[5].flow;
  assert.deepEqual(f.lanes.map((l) => l.name), ['Ufficio Richiedente', 'Ufficio Acquisti']);
  const step = (t) => f.nodes.find((n) => n.text.startsWith(t));
  assert.equal(step('1.').status, 'nuovo', 'verde = nuovo, come dice la legenda');
  assert.equal(step('3.').status, 'modificato', 'giallo = modificato');
  assert.deepEqual(step('1.').systems, ['SAP']);
  assert.equal(step('2.').type, 'decisione');
  assert.deepEqual(f.edges.filter((e) => e.from === step('2.').id).map((e) => e.label).sort(), ['No', 'Si']);
  assert.equal(f.nodes.find((n) => n.type === 'rimando').code, '4.1.2.2');
  assert.equal(a.processes.length, 2);
  assert.deepEqual(a.comparisons[0].added, ['3. Approvazione del responsabile']);
  assert.deepEqual(a.comparisons[0].removed, ['3. Approvazione del direttore']);
  assert.equal(a.glossary.find((g) => g.term === 'CDR').meaning, 'Centro di Responsabilità');
  assert.ok(a.reading.some((r) => r.compare), 'il percorso di lettura propone il confronto con l\'As-Is');
});

test('importazione: archivio nella cartella del progetto, punti chiave automatici, solo per chi vede il progetto', async () => {
  const r = await luca.put(`/api/cippi/import?projectId=${pid}&name=${encodeURIComponent('Flusso acquisti.pptx')}`, pptx());
  assert.equal(r.status, 201, JSON.stringify(r.data));
  docId = r.data.id;
  const d = (await luca.get(`/api/cippi/docs/${docId}`)).data;
  assert.equal(d.name, 'Flusso acquisti');
  assert.equal(d.list.length, 9);
  assert.equal(d.analysis.processes.length, 2);
  assert.ok(d.points.some((p) => p.auto && /Prenotazione di Spesa/.test(p.text)), 'punti chiave proposti dall\'analisi');
  const files = (await luca.get(`/api/explorer/p${pid}/list?path=${encodeURIComponent('Cippi/Flusso acquisti')}`)).data;
  assert.ok(JSON.stringify(files).includes('Flusso acquisti.pptx'), 'copia nella cartella del progetto, visibile in Esplora file');
  assert.equal((await ospite.get(`/api/cippi/docs/${docId}`)).status, 404, 'chi non e\' nel progetto non lo vede');
  assert.equal((await ospite.put(`/api/cippi/import?projectId=${pid}&name=x.pptx`, pptx())).status, 404);
  assert.equal((await luca.put(`/api/cippi/import?projectId=${pid}&name=x.ppt`, pptx())).status, 400, 'solo .pptx');
  assert.equal((await luca.put(`/api/cippi/import?projectId=${pid}&name=x.pptx`, Buffer.from('non sono un pptx, solo testo lungo abbastanza per passare il controllo della dimensione minima del file caricato'))).status, 400);
  const list = (await luca.get('/api/cippi')).data;
  assert.equal(list.docs.length, 1);
  assert.equal(list.docs[0].counts.flusso, 2);
  // anteprima: forme della slide e immagini
  const sl = (await luca.get(`/api/cippi/docs/${docId}/slide/6`)).data;
  assert.ok(sl.shapes.some((s) => s.kind === 'cxn'));
  assert.equal((await luca.get(`/api/cippi/docs/${docId}/media?name=../../etc/passwd`)).status, 404);
});

test('revisione: punti chiave, domande, glossario del progetto', async () => {
  const p = await luca.post(`/api/cippi/docs/${docId}/points`, { slide: 6, kind: 'domanda', text: 'Chi approva sopra soglia?' });
  assert.equal(p.status, 201);
  assert.equal((await mario.patch(`/api/cippi/points/${p.data.id}`, { status: 'fatto' })).status, 200);
  assert.equal((await ospite.patch(`/api/cippi/points/${p.data.id}`, { status: 'aperto' })).status, 404);
  await luca.put('/api/cippi/glossario', { projectId: pid, term: 'sap', meaning: 'Gestionale aziendale' });
  const d = (await luca.get(`/api/cippi/docs/${docId}`)).data;
  assert.equal(d.points.find((x) => x.id === p.data.id).status, 'fatto');
  assert.equal(d.analysis.glossary.find((g) => g.term === 'SAP').meaning, 'Gestionale aziendale');
});

test('modifica ed esportazione: ordine, testi, duplicati, slide tolte; nuova versione nella cartella del progetto', async () => {
  const d = (await luca.get(`/api/cippi/docs/${docId}`)).data;
  const titleId = d.analysis.slides[2].blocks.find((b) => b.role === 'titolo').id;
  const list = [{ src: 1 }, { src: 3, texts: { [titleId]: ['Obiettivi rivisti'] } }, { src: 6 }, { src: 6 }, { src: 9 }];
  const r = await luca.patch(`/api/cippi/docs/${docId}`, { slides: list, updatedAt: d.updatedAt, status: 'in revisione' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal((await mario.patch(`/api/cippi/docs/${docId}`, { slides: list, updatedAt: d.updatedAt })).status, 409, 'chi salva su una versione vecchia viene avvisato');
  const dl = await luca.get(`/api/cippi/docs/${docId}/download`);
  assert.equal(dl.status, 200);
  const out = readPptx(dl.data);
  assert.equal(out.slides.length, 5);
  assert.ok(out.slides[1].shapes.some((s) => (s.paragraphs || []).some((x) => x.text === 'Obiettivi rivisti')));
  const v = await luca.post(`/api/cippi/docs/${docId}/salva-versione`);
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.equal(v.data.version, 2);
  const after2 = (await luca.get(`/api/cippi/docs/${docId}`)).data;
  assert.equal(after2.list.length, 5);
  assert.equal(after2.analysis.slides[1].title, 'Obiettivi rivisti', 'la nuova versione e\' la base: l\'analisi si rifa\'');
  const files = (await luca.get(`/api/explorer/${v.data.space}/list?path=${encodeURIComponent(path.posix.dirname(v.data.path))}`)).data;
  assert.ok(JSON.stringify(files).includes('Flusso acquisti.pptx'));
});

test('caratteristiche: contesto del documento, descrizioni degli elementi, forma e colore nel .pptx', async () => {
  const full = (await luca.put(`/api/cippi/import?projectId=${pid}&name=caratteristiche.pptx`, pptx())).data.id;
  let d = (await luca.get(`/api/cippi/docs/${full}`)).data;
  assert.equal(d.background, '');
  assert.match(d.backgroundSuggestion, /Obiettivi del progetto/, 'contesto proposto dalle prime slide');
  assert.equal((await luca.patch(`/api/cippi/docs/${full}`, { background: 'Progetto acquisti per il cliente' })).status, 200);
  const key = 'nodo|4.1.2.1|To-Be|revisione del budget';
  assert.equal((await luca.put(`/api/cippi/docs/${full}/items`, { key, data: { input: 'Richiesta', tecnologia: 'SAP MM', ignoto: 'x' } })).status, 200);
  assert.equal((await ospite.put(`/api/cippi/docs/${full}/items`, { key, data: { input: 'x' } })).status, 404);
  d = (await luca.get(`/api/cippi/docs/${full}`)).data;
  assert.equal(d.background, 'Progetto acquisti per il cliente');
  assert.deepEqual(d.items[key], { input: 'Richiesta', tecnologia: 'SAP MM' });
  // lo step 4 diventa un rombo verde (nuovo)
  const n = d.analysis.slides[5].flow.nodes.find((x) => x.text.startsWith('4.'));
  const list = d.list.map((x) => (x.src === 6 ? { ...x, geom: { [n.id]: 'flowChartDecision', 99: 'nonEsiste' }, fill: { [n.id]: '92d050' } } : x));
  assert.equal((await luca.patch(`/api/cippi/docs/${full}`, { slides: list, updatedAt: d.updatedAt })).status, 200);
  const out = readPptx((await luca.get(`/api/cippi/docs/${full}/download`)).data);
  const shape = out.slides[5].shapes.find((x) => x.id === n.id);
  assert.equal(shape.geom, 'flowChartDecision');
  assert.equal(shape.fill, '92D050');
  // svuotare le caratteristiche le toglie
  await luca.put(`/api/cippi/docs/${full}/items`, { key, data: {} });
  assert.equal((await luca.get(`/api/cippi/docs/${full}`)).data.items[key], undefined);
});

test('modelli: si salva la struttura, si crea un documento nuovo con le parti scelte e si misura la completezza', async () => {
  // il modello nasce dalla presentazione completa (re-importata)
  const full = (await luca.put(`/api/cippi/import?projectId=${pid}&name=completa.pptx`, pptx())).data.id;
  const m = await luca.post(`/api/cippi/docs/${full}/modello`, { name: 'Project Closure', description: 'Chiusura progetto di processo' });
  assert.equal(m.status, 201, JSON.stringify(m.data));
  modelId = m.data.id;
  const md = (await luca.get(`/api/cippi/docs/${modelId}`)).data;
  assert.equal(md.kind, 'modello');
  assert.deepEqual(md.template.parts.map((p) => p.kind), ['titolo', 'indice', 'testo', 'divisore', 'legenda', 'flusso', 'divisore', 'flusso', 'chiusura']);
  assert.equal((await ospite.get(`/api/cippi/docs/${modelId}`)).status, 404, 'modello non condiviso: solo nel progetto');
  assert.equal((await luca.patch(`/api/cippi/docs/${modelId}`, { shared: true })).status, 200, 'chi l\'ha creato lo condivide');
  assert.equal((await ospite.get(`/api/cippi/docs/${modelId}`)).status, 200, 'condiviso: lo vedono tutti');
  // documento nuovo: titolo, testo (due volte, svuotato) e flusso
  const n = await luca.post(`/api/cippi/models/${modelId}/nuovo`, { projectId: pid, name: 'Nuovo flusso', vuoto: true, parts: [{ part: 0 }, { part: 2, count: 2 }, { part: 5 }] });
  assert.equal(n.status, 201, JSON.stringify(n.data));
  const nd = (await luca.get(`/api/cippi/docs/${n.data.id}`)).data;
  assert.equal(nd.list.length, 4);
  assert.equal(nd.analysis.slides[1].title, 'Titolo della slide', 'testi svuotati in segnaposto');
  assert.ok(nd.confronto && nd.confronto.percent < 100, 'mancano parti rispetto al modello');
  assert.ok(nd.confronto.missingParts.some((p) => p.kind === 'legenda'));
  assert.equal((await ospite.post(`/api/cippi/models/${modelId}/nuovo`, { projectId: pid, name: 'x' })).status, 404, 'nel progetto altrui no');
});

test('sinergia con GestioneCelle: i processi dei flussi si collegano alle voci con lo stesso nome', async () => {
  const mapId = (await luca.post('/api/celle/maps', { projectId: pid, name: 'Acquisti' })).data.id;
  const macro = (await luca.post(`/api/celle/maps/${mapId}/nodes`, { level: 1, name: 'Acquisti' })).data;
  const proc = await luca.post(`/api/celle/maps/${mapId}/nodes`, { level: 2, parentId: macro.id, name: 'Prenotazione di spesa' });
  assert.equal(proc.status, 201, JSON.stringify(proc.data));
  const d = (await luca.get(`/api/cippi/docs/${docId}`)).data;
  assert.ok(d.celle.some((c) => c.mapId === mapId && c.code === '4.1.2.1'), JSON.stringify(d.celle));
});

test('eliminazione: chi l\'ha creato o il Manager del progetto', async () => {
  const other = (await luca.put(`/api/cippi/import?projectId=${pid}&name=altro.pptx`, pptx())).data.id;
  assert.equal((await ospite.del(`/api/cippi/docs/${other}`)).status, 404);
  assert.equal((await mario.del(`/api/cippi/docs/${other}`)).status, 200);
  assert.equal((await luca.get(`/api/cippi/docs/${other}`)).status, 404);
});

// ---- Presentazioni di kick-off: sezioni native, schede, tabelle, masterplan, impronta, modifiche per funzione ----
test('kick-off: sezioni native, copertina, indice a due livelli senza falsi avvisi, pillole, tabella disegnata, Gantt, totale, caratteri', () => {
  const pres = readPptx(kickoff());
  const a = analyze(pres);
  assert.deepEqual(a.slides.map((s) => s.kind), ['copertina', 'indice', 'testo', 'scheda', 'scheda', 'masterplan', 'tabella']);
  assert.equal(a.nativeSections, true, 'le sezioni sono quelle di PowerPoint');
  assert.deepEqual(a.sections.map((s) => s.title), ['Copertina', 'Indice', 'Introduzione', 'Ambito', 'Masterplan', 'Sintesi contratto']);
  assert.deepEqual(a.sections[3].slides, [4, 5]);
  assert.ok(!a.checks.some((c) => /indice senza slide|Manca una slide di titolo/.test(c.text)), 'le sotto-voci dell\'indice trovano le slide "Ambito - ..."');
  const s4 = a.slides[3];
  assert.ok(!s4.blocks.some((b) => /Kick-off Progetto Prova/.test(b.text)), 'il piè di pagina non è un blocco');
  const pills = s4.blocks.filter((b) => b.role === 'intestazione');
  assert.deepEqual(pills.map((b) => b.fill), ['00B095', '1482AB'], 'pillole: testo sopra la forma colorata = intestazione con quel colore');
  const drawn = s4.blocks.find((b) => b.role === 'tabella');
  assert.ok(drawn && drawn.drawn && drawn.header, 'tabella disegnata con le forme riconosciuta');
  assert.deepEqual(drawn.rows[0], ['FUNZIONALITÀ', 'PIATTAFORMA ABILITANTE', 'FINALITÀ']);
  assert.equal(drawn.rows[1][1], 'PDND');
  assert.equal(drawn.ids.length, 3, 'ogni cella ha la sua forma, modificabile');
  const g = a.slides[5].gantt;
  assert.ok(g && g.from === '2026-10' && g.to === '2027-12', 'masterplan letto dall\'SVG: periodo');
  assert.deepEqual(g.rows.map((r) => [r.kind, r.text, r.from, r.to]), [
    ['componente', 'COMPONENTE UNO', '2026-10', '2027-05'], ['attivita', 'Design e analisi funzionale', '2026-10', '2026-12'],
    ['attivita', 'Sviluppo applicativi, Test e Implementazione', '2026-12', '2027-05'], ['componente', 'COMPONENTE DUE', '2027-06', '2027-12'], ['attivita', 'Rilascio e manutenzione', '2027-06', '2027-12']]);
  const t = a.slides[6].blocks.find((b) => b.role === 'tabella');
  assert.equal(t.cells[3][0].gridSpan, 2, 'celle unite');
  assert.equal(t.cells[3][2].fill, '225546');
  assert.ok(t.cells[1][2].bold);
  assert.ok(a.checks.some((c) => c.level === 'info' && /Totale verificato/.test(c.text)), 'il totale torna');
  const bad = analyze(readPptx(kickoff({ totaleSbagliato: true })));
  assert.ok(bad.checks.some((c) => c.level === 'errore' && /tabella dice 160, la somma delle righe fa 150/.test(c.text)), 'totale che non torna');
  assert.ok(a.checks.some((c) => /Carattere di prova "FT Habit Trial"/.test(c.text)));
  assert.ok(a.checks.some((c) => c.slide === 4 && /Testo ridotto/.test(c.text)));
  assert.equal(a.glossary.find((x) => x.term === 'PagoPA').known, true, 'glossario della PA');
  assert.equal(a.glossary.find((x) => x.term === 'BIPS').meaning, 'Basi informative per lo sviluppo');
  assert.ok(!a.glossary.some((x) => x.term === 'FINALIT'), 'FINALITÀ non è una sigla');
  assert.equal(pres.meta.company, 'Fornitore di prova S.p.A.');
  assert.ok(pres.slides[2].background.some((s) => (s.paragraphs || []).some((p) => p.text === 'RISERVATO')), 'forme fisse del layout per l\'anteprima');
  assert.ok(a.reading.some((r) => r.title === 'Piano di progetto') && a.keyPoints.some((k) => k.kind === 'piano'));
});

test('kick-off nel portale: modello noto riconosciuto, sfondo del layout, trova e sostituisci, celle e righe delle tabelle, esportazione pulita', async () => {
  const r = await luca.put(`/api/cippi/import?projectId=${pid}&name=${encodeURIComponent('Kick-off prova.pptx')}`, kickoff());
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const kid = r.data.id;
  const d = (await luca.get(`/api/cippi/docs/${kid}`)).data;
  assert.ok(d.impronta && d.impronta.somiglianze.some((x) => x.id === 'kickoff-txt-biosiris' && x.punteggio >= 60), 'somiglia al kick-off in memoria: ' + JSON.stringify(d.impronta && d.impronta.somiglianze));
  assert.ok(!d.impronta.somiglianze.some((x) => /_archivio/.test(x.scheda || '')), 'le schede archiviate (_archivio) non contano come modelli vivi');
  assert.equal(d.impronta.somiglianze.filter((x) => x.id === 'kickoff-txt-biosiris').length, 1, 'il modello compare una volta sola');
  assert.equal(d.analysis.meta.company, 'Fornitore di prova S.p.A.');
  const sl = (await luca.get(`/api/cippi/docs/${kid}/slide/3`)).data;
  assert.ok(sl.background.some((s) => (s.paragraphs || []).some((p) => p.text === 'RISERVATO')), 'la slide porta con sé le forme del layout');
  // trova e sostituisci: nelle slide (piè di pagina di ogni slide) e nel layout (scritta fissa)
  const s1 = await luca.post(`/api/cippi/docs/${kid}/sostituisci`, { find: 'Kick-off Progetto Prova', replace: 'SAL 1 Progetto Prova', layouts: true });
  assert.equal(s1.status, 200, JSON.stringify(s1.data));
  assert.deepEqual([s1.data.count, s1.data.slides], [5, [3, 4, 5, 6, 7]]);
  const s2 = (await luca.post(`/api/cippi/docs/${kid}/sostituisci`, { find: 'riservato', replace: 'PUBBLICO', layouts: true })).data;
  assert.deepEqual([s2.count, s2.layoutCount], [0, 1], 'la scritta del layout si conta nel file');
  assert.equal((await luca.post(`/api/cippi/docs/${kid}/sostituisci`, { find: 'xyz-non-esiste', replace: 'a', anteprima: true })).data.count, 0);
  const after = (await luca.get(`/api/cippi/docs/${kid}`)).data;
  assert.equal(after.edits.replace.length, 1);
  assert.ok(after.list[2].texts && Object.values(after.list[2].texts).some((l) => JSON.stringify(l).includes('SAL 1 Progetto Prova')), 'nelle slide è una modifica dei testi');
  // celle della tabella e una riga nuova; una cella della tabella disegnata (forma) tramite i testi
  const tbl = after.analysis.slides[6].blocks.find((b) => b.role === 'tabella');
  const drawn = after.analysis.slides[3].blocks.find((b) => b.role === 'tabella');
  const list = after.list.map((x) => ({ ...x }));
  list[6] = { ...list[6], cells: { [tbl.id]: { '1,1': ['Sviluppo e manutenzione evolutiva (rivista)'] } }, tableRows: { [tbl.id]: [{ after: 2, cells: ['EL', 'E-learning', '€ 10,00'] }] } };
  list[3] = { ...list[3], texts: { ...(list[3].texts || {}), [drawn.ids[1][1]]: ['SPID'] } };
  const p = await luca.patch(`/api/cippi/docs/${kid}`, { slides: list, updatedAt: after.updatedAt });
  assert.equal(p.status, 200, JSON.stringify(p.data));
  const dl = await luca.get(`/api/cippi/docs/${kid}/download`);
  assert.equal(dl.status, 200);
  const out = readPptx(dl.data);
  const t2 = out.slides[6].shapes.find((s) => s.kind === 'table');
  assert.equal(t2.rows.length, 5, 'riga aggiunta');
  assert.equal(t2.rows[1][1], 'Sviluppo e manutenzione evolutiva (rivista)');
  assert.deepEqual(t2.rows[3], ['EL', 'E-learning', '€ 10,00']);
  assert.equal(t2.cells[4][0].gridSpan, 2, 'la riga del totale resta unita');
  assert.ok(out.slides[3].shapes.some((s) => (s.paragraphs || []).some((x) => x.text === 'SPID')), 'cella della tabella disegnata cambiata');
  assert.ok(out.slides[2].shapes.some((s) => s.ph && s.ph.type === 'ftr' && s.paragraphs[0].text === 'SAL 1 Progetto Prova'), 'piè di pagina sostituito nelle slide');
  assert.ok(out.slides[2].background.some((s) => (s.paragraphs || []).some((x) => x.text === 'PUBBLICO')), 'scritta del layout sostituita nel file');
  // esportazione pulita: tolta la slide del masterplan, la sua immagine SVG non resta nel pacchetto
  const p2 = await luca.patch(`/api/cippi/docs/${kid}`, { slides: list.filter((x) => x.src !== 6), updatedAt: p.data.updatedAt });
  assert.equal(p2.status, 200);
  const names = [...readZip((await luca.get(`/api/cippi/docs/${kid}/download`)).data).keys()];
  assert.ok(!names.some((n) => /image1\.svg$/.test(n)), 'niente media orfani');
  assert.ok(names.some((n) => n === 'ppt/slides/slide1.xml'));
});
