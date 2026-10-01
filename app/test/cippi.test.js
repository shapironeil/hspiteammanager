'use strict';
// Cippi: importazione e lettura della struttura, revisione (punti chiave, glossario), modifica ed esportazione,
// modelli e nuovi documenti da modello, archivio nella cartella del progetto, collegamento con GestioneCelle, permessi.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { startPortal, setupHacker, addUser } = require('./helpers');
const { pptx, kickoff } = require('./pptx-prova');
const { pdfProva } = require('./pdf-prova');
const { readPptx } = require('../src/cippi/pptx-read');
const { analyze } = require('../src/cippi/analyze');
const { readPdf } = require('../src/cippi/pdf-read');
const { confrontoPdf } = require('../src/cippi/appunti');
const memoria = require('../src/cippi/memoria');

let portal; let hacker; let mario; let luca; let ospite; let pid; let docId; let modelId;
let memDir; // memoria dei modelli di prova (docs/MEMORIA finta)

before(async () => {
  // la memoria di prova conosce il kick-off: il portale la legge da HSPI_MEMORIA_DIR
  memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-memoria-'));
  fs.mkdirSync(path.join(memDir, 'pptx'));
  const pres = readPptx(kickoff());
  const fp = memoria.fingerprintOf(pres, analyze(pres), 'Kickoff_di_prova_v1.0.pptx');
  fs.writeFileSync(path.join(memDir, 'pptx', 'kickoff-prova.impronta.json'), JSON.stringify({ ...fp, template: 'kickoff-prova', app: 'cippi', tipoDocumento: 'kick-off di prova', nomeFile: { regex: '^[A-Za-z]+_di_prova_v\\d+\\.\\d+\\.pptx$' } }));
  fs.writeFileSync(path.join(memDir, 'pptx', 'kickoff-prova.md'), '# Template kickoff-prova\n');
  process.env.HSPI_MEMORIA_DIR = memDir;
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  mario = await addUser(portal.base, hacker, 'Mario', 'manager');
  luca = await addUser(portal.base, hacker, 'Luca', 'dipendente');
  ospite = await addUser(portal.base, hacker, 'Ospite', 'dipendente');
  pid = (await hacker.post('/api/projects', { name: 'Acquisti', members: [mario.id, luca.id] })).data.id;
});
after(() => { if (portal) portal.stop(); if (memDir) fs.rmSync(memDir, { recursive: true, force: true }); });

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

test('kick-off: copertina, indice numerato con refuso, sezioni native o dall\'indice, piano, organigramma, numeri, tabella disegnata, controlli', () => {
  const a = analyze(readPptx(kickoff()));
  assert.deepEqual(a.slides.map((s) => s.kind), ['copertina', 'indice', 'testo', 'piano', 'organigramma', 'testo', 'numeri', 'tabella']);
  assert.equal(a.sectionsSource, 'native');
  assert.deepEqual(a.sections.map((s) => s.title), ['Intro', 'Contenuti']);
  assert.deepEqual(a.nativeSections, ['Intro', 'Contenuti']);
  // l'indice: ogni voce abbinata alla slide; "Quick Win KPI" contro "QUICK WIN KIP" e' un refuso
  assert.deepEqual(a.index.matches.map((m) => m.slide), [3, 4, 5, 6]);
  assert.ok(a.index.matches[3].typo);
  const texts = a.checks.map((c) => c.text).join('\n');
  assert.match(texts, /"Quick Win KPI": il titolo più vicino è "QUICK WIN KIP" \(slide 6\), forse un refuso/);
  assert.match(texts, /Testo segnaposto da compilare: "xxxxxx"/);
  assert.match(texts, /"CATALOGO KPI": trovate 1 parti su 2 \(manca la 2\/2\)/);
  assert.match(texts, /Caratteri fuori tema \(Poppins\): Comic Sans MS \(slide 6\)/);
  assert.ok(!/Slide senza titolo/.test(texts), 'copertina e indice non sono "senza titolo"');
  // la tabella disegnata con le forme diventa una tabella vera
  assert.deepEqual(a.slides[7].table.header, ['ID', 'Nome KPI', 'Formula', 'Fonte dato']);
  assert.equal(a.slides[7].table.rows.length, 3);
  assert.equal(a.slides[7].table.rows[1][0], 'KPI-0002');
  assert.deepEqual(a.slides[3].months, ['APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET']);
  // punti chiave: numeri con l'etichetta, piano con i periodi, team con i soli ruoli (niente nomi)
  const kp = a.keyPoints.map((k) => k.text).join('\n');
  assert.match(kp, /59 KPI totali nel CdS · 26 KPI esclusi dal Quick Win/);
  assert.match(kp, /da APR a SET \(6 periodi\)/);
  assert.match(kp, /TEAM DI PROGETTO: Direzione Progetto · Project Management · Project Team/);
  assert.ok(!/Persona Uno/.test(kp));
  assert.ok(a.reading.some((r) => r.title === 'Piano e milestone') && a.reading.some((r) => r.title === 'Team e ruoli'));
  // senza sezioni native i capitoli vengono dall'indice
  const b = analyze(readPptx(kickoff({ native: false })));
  assert.equal(b.sectionsSource, 'indice');
  assert.deepEqual(b.sections.map((s) => s.title), ['Apertura', 'Introduzione e Contesto', 'Piano di progetto', 'Team di progetto', 'Quick Win KPI']);
  assert.deepEqual(b.sections[4].slides, [6, 7, 8], 'le slide dopo un capitolo restano nel capitolo');
  // il lettore: caratteri per slide, note con il solo numero = vuote, tema del master usato
  const pres = readPptx(kickoff());
  assert.deepEqual(pres.slides[5].fonts, ['Comic Sans MS']);
  assert.equal(pres.fonts.major, 'Poppins');
  assert.equal(pres.masters.length, 1);
});

test('memoria dei modelli: impronta e riconoscimento del template noto', () => {
  const pres = readPptx(kickoff());
  const a = analyze(pres);
  const fp = memoria.fingerprintOf(pres, a, 'Kickoff_di_prova_v1.0.pptx');
  assert.equal(fp.formato, 'pptx');
  assert.deepEqual(fp.sezioniNative, ['Intro', 'Contenuti']);
  assert.equal(fp.tema.caratteri.maggiore, 'Poppins');
  assert.deepEqual(fp.layout.usati, { 'Diapositiva titolo': [1, 2, 3, 4, 5, 6, 7, 8] });
  assert.equal(memoria.templateName(fp, 'ATAC Kick Off Data Platform v1.0'), 'kickoff-hspi-atac-data-platform');
  const known = memoria.loadKnown([memDir, path.join(memDir, 'non-esiste')]);
  assert.equal(known.length, 1);
  assert.equal(known[0].template, 'kickoff-prova');
  assert.ok(known[0].scheda.endsWith('kickoff-prova.md'));
  const m = memoria.matchOf(fp, known);
  assert.ok(m.riconosciuto && m.riconosciuto.score >= 90, JSON.stringify(m));
  assert.ok(m.riconosciuto.segnali.some((x) => /sezioni native/.test(x)) && m.riconosciuto.segnali.some((x) => /nome del file/.test(x)));
  // la presentazione di processo ha lo stesso tema ma layout, sezioni e tipi diversi: somiglia meno
  const other = readPptx(pptx());
  const m2 = memoria.matchOf(memoria.fingerprintOf(other, analyze(other), 'Flusso.pptx'), known);
  assert.ok(!m2.riconosciuto || m2.riconosciuto.score < m.riconosciuto.score - 20, JSON.stringify(m2));
});

test('PDF: lettura del testo per pagina (WinAnsi, Identity-H, object stream) e confronto con la presentazione', () => {
  const a = analyze(readPptx(kickoff()));
  const pageOf = (s) => ({ title: s.title || s.blocks.map((b) => b.text).join(' ').split('\n')[0], lines: s.blocks.filter((b) => b.role !== 'titolo').flatMap((b) => (b.paragraphs || [{ text: b.text }]).map((p) => p.text)).filter(Boolean) });
  const pages = a.slides.map(pageOf);
  pages[0].lines.unshift('Kick-Off Data Platform');
  const pdf = readPdf(pdfProva(pages));
  assert.equal(pdf.pages.length, 8);
  assert.equal(pdf.info.producer, 'Prova HSPI');
  assert.equal(pdf.pages[2].title, 'INTRODUZIONE E CONTESTO', 'il numerino di pagina non entra nel titolo');
  assert.match(pdf.pages[2].text, /Il cliente gestisce una rete estesa e vuole una Data Platform di nuova generazione\./, 'carattere composto con ToUnicode');
  assert.match(pdf.pages[2].text, /Di seguito le fasi principali dell'iniziativa\./, 'carattere semplice WinAnsi, array TJ');
  assert.equal(pdf.pages[2].width, 960);
  // allineato
  let c = confrontoPdf(pdf, a.slides);
  assert.ok(c.aligned, c.verdict + ' ' + JSON.stringify(c.pairs));
  assert.deepEqual(c.pairs.map((x) => x.slide), [1, 2, 3, 4, 5, 6, 7, 8]);
  // il PDF e' di una versione vecchia: manca una slide, due sono invertite
  const old = [...pages.slice(0, 3), pages[4], pages[3], ...pages.slice(6)];
  c = confrontoPdf(readPdf(pdfProva(old)), a.slides);
  assert.ok(!c.aligned);
  assert.ok(c.orderChanged);
  assert.deepEqual(c.slidesWithoutPage.map((x) => x.slide), [6]);
  assert.match(c.verdict, /non è aggiornato/);
  // un PDF di tutt'altro
  c = confrontoPdf(readPdf(pdfProva([{ title: 'Ricetta', lines: ['Farina, uova, zucchero'] }])), a.slides);
  assert.equal(c.pairs[0].slide, null);
  assert.match(c.verdict, /non sembra l'esportazione/);
  // PDF non valido e PDF protetto
  assert.throws(() => readPdf(Buffer.from('ciao, non sono un pdf')), /Non è un file PDF/);
});

test('API: modello riconosciuto, impronta da scaricare, confronto del PDF accanto al documento', async () => {
  const r = await luca.put(`/api/cippi/import?projectId=${pid}&name=${encodeURIComponent('Kickoff_di_prova_v1.0.pptx')}`, kickoff());
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const d = (await luca.get(`/api/cippi/docs/${r.data.id}`)).data;
  assert.equal(d.analysis.sectionsSource, 'native');
  assert.equal(d.memoria.riconosciuto.template, 'kickoff-prova');
  assert.equal(d.memoria.riconosciuto.scheda, 'kickoff-prova.md');
  assert.equal(d.memoria.noti, 1);
  assert.equal(d.memoria.nomeProposto, 'kickoff-hspi-di-prova');
  const lista = (await luca.get('/api/cippi/memoria')).data;
  assert.deepEqual(lista.modelli.map((m) => m.template), ['kickoff-prova']);
  const imp = await luca.get(`/api/cippi/docs/${r.data.id}/impronta`);
  assert.equal(imp.status, 200);
  assert.match(imp.headers.get('content-disposition'), /kickoff-hspi-di-prova\.impronta\.json/);
  const fp = imp.data; // JSON gia' letto dal client di prova
  assert.equal(fp.template, 'kickoff-hspi-di-prova');
  assert.equal(fp.fileVisti[0].nome, 'Kickoff_di_prova_v1.0.pptx');
  assert.deepEqual(fp.sezioniNative, ['Intro', 'Contenuti']);
  // il PDF esportato (stesso nome) nella cartella del progetto e un PDF negli appunti
  const a = d.analysis;
  const pages = a.slides.map((s) => ({ title: s.title || 'Kick-Off', lines: s.blocks.filter((b) => b.role !== 'titolo').flatMap((b) => (b.paragraphs || [{ text: b.text }]).map((p) => p.text)) }));
  const up = await luca.put(`/api/cippi/docs/${r.data.id}/appunti?name=${encodeURIComponent('vecchia versione.pdf')}`, pdfProva(pages.slice(0, 6)));
  assert.equal(up.status, 201, JSON.stringify(up.data));
  const ex = await luca.put(`/api/explorer/p${pid}/file?path=${encodeURIComponent('Cippi/Kickoff_di_prova_v1.0')}&name=${encodeURIComponent('Kickoff_di_prova_v1.0.pdf')}`, pdfProva(pages));
  assert.equal(ex.status, 201, JSON.stringify(ex.data));
  const d2 = (await luca.get(`/api/cippi/docs/${r.data.id}`)).data;
  assert.ok(d2.appunti.some((x) => x.name === 'vecchia versione.pdf' && x.pdf));
  const linked = d2.pdfCollegati.find((x) => x.name === 'Kickoff_di_prova_v1.0.pdf');
  assert.ok(linked, JSON.stringify(d2.pdfCollegati));
  const c1 = (await luca.get(`/api/cippi/docs/${r.data.id}/appunti/pdf?name=${encodeURIComponent('vecchia versione.pdf')}`)).data;
  assert.equal(c1.pages.length, 6);
  assert.ok(!c1.confronto.aligned);
  assert.deepEqual(c1.confronto.slidesWithoutPage.map((x) => x.slide), [7, 8]);
  const c2 = (await luca.get(`/api/cippi/docs/${r.data.id}/appunti/pdf?path=${encodeURIComponent(linked.path)}`)).data;
  assert.ok(c2.confronto.aligned, c2.confronto.verdict);
  assert.equal((await luca.get(`/api/cippi/docs/${r.data.id}/appunti/pdf?path=${encodeURIComponent('../../etc/passwd.pdf')}`)).status, 400);
  assert.equal((await luca.get(`/api/cippi/docs/${r.data.id}/appunti/pdf?name=niente.pdf`)).status, 404);
  assert.equal((await ospite.get(`/api/cippi/docs/${r.data.id}/appunti/pdf?name=${encodeURIComponent('vecchia versione.pdf')}`)).status, 404);
});
