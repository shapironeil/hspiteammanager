'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startPortal, setupHacker, addUser } = require('./helpers');
const { buildBpbWorkbook } = require('../src/celle/xlsx-write');
const { writeZip } = require('../src/celle/zip');
const { readXlsx, tableRows } = require('../src/celle/xlsx-read');

let portal; let hacker; let mario; let luca; let ospite; let pid; let mapId;
const T = (macros) => buildBpbWorkbook({ name: 'prova', macros });

// file BPB finto (stessa struttura del file reale, dati inventati), con un duplicato e spazi in piu'
const BPB = T([
  { code: 1, name: 'Sanità', processes: [
    { name: 'Pianificazione  regionale', code: '1.1', micros: [{ name: 'Flusso A', ambito: 'In scope', note: 'pag. 3', responsabile: 'Mario Prova', scadenza: '2026-10-05' }, { name: ' Flusso B', ambito: 'Out of scope' }, { name: 'Flusso B' }] },
    { name: 'Controllo', code: '1.2', micros: [{ name: 'Verifica', stato: 'in corso' }] }] },
  { code: 2, name: 'Decreti', processes: [{ name: 'Predisposizione decreto', code: '2.1', micros: [{ name: 'Impegno' }] }] },
]);

before(async () => {
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  mario = await addUser(portal.base, hacker, 'Mario', 'manager');
  luca = await addUser(portal.base, hacker, 'Luca', 'dipendente');
  ospite = await addUser(portal.base, hacker, 'Ospite', 'dipendente');
  pid = (await hacker.post('/api/projects', { name: 'Regione', members: [mario.id, luca.id] })).data.id;
});
after(() => portal && portal.stop());

test('importazione del formato BPB: ordine, codici, controlli, responsabili', async () => {
  mapId = (await luca.post('/api/celle/maps', { projectId: pid, name: 'BPB Regione' })).data.id;
  const up = await luca.put('/api/celle/import?name=bpb.xlsx', BPB);
  assert.equal(up.status, 200, JSON.stringify(up.data));
  assert.equal(up.data.format, 'bpb');
  assert.deepEqual(up.data.summary, { macros: 2, processes: 3, micros: 5 });
  const r = await luca.post(`/api/celle/maps/${mapId}/import`, { token: up.data.token });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.deepEqual([r.data.macros, r.data.processes, r.data.micros], [2, 3, 5]);
  const m = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  assert.equal(m.macros[0].children[0].name, 'Pianificazione regionale');
  assert.deepEqual(m.macros[0].children[0].children.map((u) => u.code), ['1.1.1', '1.1.2', '1.1.3']);
  assert.equal(m.macros[0].children[0].children[0].responsible, 'Mario Prova');
  assert.equal(m.macros[0].children[0].children[0].dueDate, '2026-10-05');
  assert.equal(m.macros[0].children[1].children[0].status, 'in corso');
  // il duplicato (spazi ignorati come in Excel) viene segnalato
  assert.deepEqual(m.issues.map((i) => i.code).sort(), ['1.1.2', '1.1.3']);
  assert.equal(m.issues[0].checks[0], 'Sotto processo duplicato');
  // chi non vede il progetto non vede la mappa
  assert.equal((await ospite.get(`/api/celle/maps/${mapId}`)).status, 404);
});

test('aggiungi, rinomina, sposta: i codici si ricalcolano come in Excel', async () => {
  const m0 = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  const proc = m0.macros[0].children[0];
  // nuovo micro in testa al processo
  const n = await luca.post(`/api/celle/maps/${mapId}/nodes`, { level: 3, parentId: proc.id, name: 'Nuovo flusso', afterId: 0 });
  assert.equal(n.data.code, '1.1.1');
  // nuovo macro: prende il primo ID libero
  const mac = await luca.post(`/api/celle/maps/${mapId}/nodes`, { level: 1, name: 'Ambiente' });
  assert.equal(mac.data.code, '3');
  // il processo "Controllo" (1.2) passa sotto "Decreti" in prima posizione: diventa 2.1
  const ctrl = m0.macros[0].children[1];
  const mv = await luca.post(`/api/celle/nodes/${ctrl.id}/move`, { parentId: m0.macros[1].id, index: 0 });
  assert.deepEqual(mv.data, { before: '1.2', after: '2.1' });
  const m1 = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  assert.equal(m1.macros[1].children[1].code, '2.2');
  assert.equal(m1.macros[1].children[0].children[0].code, '2.1.1');
  // modifica dei campi e storico
  await luca.patch(`/api/celle/nodes/${n.data.id}`, { name: 'Flusso nuovo', dueDate: '2026-12-01', status: 'da fare', ambito: 'In scope' });
  await luca.post(`/api/celle/nodes/${n.data.id}/comments`, { text: 'Da verificare con il cliente' });
  const d = (await luca.get(`/api/celle/nodes/${n.data.id}`)).data;
  assert.equal(d.comments[0].text, 'Da verificare con il cliente');
  assert.ok(d.history.some((h) => h.action === 'modificato' && h.detail.after.name === 'Flusso nuovo'));
  assert.equal((await luca.patch(`/api/celle/nodes/${n.data.id}`, { dueDate: '31/12' })).status, 400);
  assert.equal((await luca.patch(`/api/celle/nodes/${n.data.id}`, { protected: true })).status, 403, 'proteggere spetta al manager');
});

test('eliminazione: conferma con impatto, richiesta se ci sono voci di altri, cestino e ripristino', async () => {
  const m = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  const proc = m.macros[0].children[0]; // contiene un micro di cui e' responsabile Mario
  const first = await luca.del(`/api/celle/nodes/${proc.id}`);
  assert.equal(first.status, 409);
  assert.equal(first.data.impact.micros, 4);
  assert.deepEqual(first.data.impact.otherResponsibles, ['Mario Prova']);
  assert.equal(first.data.needsApproval, true);
  const req = await luca.del(`/api/celle/nodes/${proc.id}?conferma=1&motivo=processo%20superato`);
  assert.equal(req.status, 202);
  assert.equal((await luca.get(`/api/celle/maps/${mapId}`)).data.macros[0].children.length, 1, 'non ancora eliminato');
  const pending = (await mario.get(`/api/celle/maps/${mapId}`)).data.requests;
  assert.equal(pending[0].reason, 'processo superato');
  assert.equal((await luca.post(`/api/celle/requests/${pending[0].id}`, { approve: true })).status, 403);
  assert.equal((await mario.post(`/api/celle/requests/${pending[0].id}`, { approve: true })).status, 200);
  const after = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  assert.equal(after.macros[0].children.length, 0);
  const trash = (await mario.get(`/api/celle/maps/${mapId}/trash`)).data.items;
  assert.equal(trash[0].items, 5);
  assert.equal((await mario.post(`/api/celle/nodes/${trash[0].id}/restore`)).status, 200);
  const back = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  assert.equal(back.macros[0].children[0].children.length, 4);
  // una voce senza dipendenze si elimina direttamente (dopo conferma)
  const lone = back.macros[2]; // "Ambiente", vuoto
  assert.equal((await luca.del(`/api/celle/nodes/${lone.id}?conferma=1`)).status, 200);
});

test('esportazione Excel: stesso formato, si rilegge e si reimporta', async () => {
  const res = await luca.get(`/api/celle/maps/${mapId}/export`);
  assert.equal(res.status, 200);
  const book = readXlsx(res.data);
  assert.deepEqual(book.sheets.map((s) => s.name), ['Istruzioni', 'BPB', 'Anagrafica Processi BPB']);
  const bpb = book.sheets[1];
  const rows = tableRows(book, bpb, bpb.tables[0]);
  assert.equal(rows.length, 6);
  assert.equal(rows[0]['ID Micro Processi'], '1.1.1');
  assert.equal(rows[0]['Sotto processi'], 'Flusso nuovo');
  // si salva anche nella cartella del progetto, con le versioni
  const s = await luca.post(`/api/celle/maps/${mapId}/export`);
  assert.equal(s.data.path, 'GestioneCelle/BPB Regione.xlsx');
  assert.ok(fs.existsSync(path.join(portal.root, 'progetti', 'Regione', 'GestioneCelle', 'BPB Regione.xlsx')));
  // reimportazione in una mappa nuova: stessa struttura
  const copy = (await luca.post('/api/celle/maps', { projectId: pid, name: 'Copia' })).data.id;
  const up = await luca.put('/api/celle/import?name=x.xlsx', res.data);
  await luca.post(`/api/celle/maps/${copy}/import`, { token: up.data.token });
  const a = (await luca.get(`/api/celle/maps/${mapId}`)).data.macros;
  const b = (await luca.get(`/api/celle/maps/${copy}`)).data.macros;
  const shape = (ms) => ms.map((m) => [m.code, m.name, m.children.map((p) => [p.code, p.name, p.children.map((u) => [u.code, u.name, u.dueDate || null])])]);
  assert.deepEqual(shape(b), shape(a));
});

test('importazione di un foglio qualsiasi con mappatura delle colonne', async () => {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rows = [['Area', 'Attività', 'Passo', 'Owner'], ['Vendite', 'Offerte', 'Preparazione', 'Luca Prova'], ['', 'Offerte', 'Invio', ''], ['Acquisti', 'Ordini', 'Emissione', '']];
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => (v ? `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>` : '')).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const xlsx = writeZip([
    { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Attività" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', data: sheet },
  ]);
  const up = await luca.put('/api/celle/import?name=attivita.xlsx', xlsx);
  assert.equal(up.data.format, 'generico');
  assert.deepEqual(up.data.sheets[0].headers, ['Area', 'Attività', 'Passo', 'Owner']);
  assert.equal(up.data.sheets[0].guess.responsabile, 3);
  const m = (await luca.post('/api/celle/maps', { projectId: pid, name: 'Generica' })).data.id;
  const r = await luca.post(`/api/celle/maps/${m}/import`, { token: up.data.token, mapping: { macro: 0, processo: 1, micro: 2, responsabile: 3 } });
  assert.deepEqual([r.data.macros, r.data.processes, r.data.micros], [2, 2, 3]);
  const t = (await luca.get(`/api/celle/maps/${m}`)).data.macros;
  assert.deepEqual(t.map((x) => [x.code, x.name, x.children.map((p) => [p.code, p.children.map((u) => u.code)])]), [['1', 'Vendite', [['1.1', ['1.1.1', '1.1.2']]]], ['2', 'Acquisti', [['2.1', ['2.1.1']]]]]);
  assert.equal(t[0].children[0].children[0].responsible, 'Luca Prova');
});

test('scadenze personali per la Home', async () => {
  const m = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  const node = m.macros[0].children[0].children[0];
  const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await luca.patch(`/api/celle/nodes/${node.id}`, { responsibleId: luca.id, dueDate: soon });
  const mine = (await luca.get('/api/celle/mine')).data;
  assert.equal(mine[0].dueDate, soon);
  assert.equal(mine[0].code, node.code);
});
