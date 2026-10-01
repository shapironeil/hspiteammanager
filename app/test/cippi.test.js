'use strict';
// Cippi: importazione e lettura della struttura, revisione (punti chiave, glossario), modifica ed esportazione,
// modelli e nuovi documenti da modello, archivio nella cartella del progetto, collegamento con GestioneCelle, permessi.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { startPortal, setupHacker, addUser } = require('./helpers');
const { pptx } = require('./pptx-prova');
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
