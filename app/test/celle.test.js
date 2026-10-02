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

test('esportazione Excel: ordine degli elementi nei fogli come vuole Excel (altrimenti il file risulta danneggiato)', () => {
  const { readZip } = require('../src/celle/zip');
  const parts = readZip(BPB);
  for (const name of ['xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml']) {
    const xml = parts.get(name)().toString('utf8');
    const order = ['<sheetViews', '<cols', '<sheetData', '<conditionalFormatting', '<pageMargins', '<tableParts', '</worksheet>'];
    const pos = order.map((tag) => xml.indexOf(tag));
    assert.ok(pos.every((p) => p >= 0), `${name}: manca un elemento`);
    assert.deepEqual([...pos].sort((a, b) => a - b), pos, `${name}: elementi fuori ordine`);
  }
});

// Un file BPB "come lo salva Excel": stringhe condivise, stili propri (intestazioni rosse, colonna gialla del manager),
// formule condivise, catena di calcolo, colori condizionali e convalide su poche righe, un nome con intervallo fisso,
// un foglio Legenda che GestioneCelle non usa e NESSUNA colonna Responsabile, Scadenza, Stato.
function fileDelManager() {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SS = ['Ambito Analisi', 'ID Macroprocesso', 'Macro processo', 'ID Processo', 'Processo', 'ID Micro Processi', 'Sotto processi', 'Priorità', 'Chiave (tecnica)',
    'ID Macro', 'N. processi', 'Check', 'N. progressivo', 'N. micro processi', 'Legenda dei colori', 'Sanità', 'Pianificazione', 'Flusso A', 'Flusso B', 'In scope', 'alta', 'MACRO PROCESSI', 'PROCESSI'];
  const S = (ref, txt, st) => `<c r="${ref}" s="${st}" t="s"><v>${SS.indexOf(txt)}</v></c>`;
  const N = (ref, v, st) => `<c r="${ref}" s="${st}"><v>${v}</v></c>`;
  const F = (ref, formula, v, st, extra = '') => `<c r="${ref}" s="${st}" t="str"><f${extra}>${esc(formula)}</f><v>${esc(v)}</v></c>`;
  const FM = {
    macro: 'IFERROR(INDEX(tblMacro[Macro processo],MATCH(tblBPB[[#This Row],[ID Macroprocesso]],tblMacro[ID Macro],0)),"")',
    idProc: 'IFERROR(INDEX(tblProcessi[ID Processo],MATCH(tblBPB[[#This Row],[Chiave (tecnica)]],tblProcessi[Chiave (tecnica)],0)),"N/D")',
    idMicro: 'tblBPB[[#This Row],[ID Processo]]&"."&SUMPRODUCT(--(INDEX(tblBPB[ID Processo],1):tblBPB[[#This Row],[ID Processo]]=tblBPB[[#This Row],[ID Processo]]))',
    key: 'tblBPB[[#This Row],[ID Macroprocesso]]&"|"&TRIM(tblBPB[[#This Row],[Processo]])',
    mNProc: 'COUNTIF(tblProcessi[ID Macro],tblMacro[[#This Row],[ID Macro]])', mNMicro: 'COUNTIF(tblBPB[ID Macroprocesso],tblMacro[[#This Row],[ID Macro]])', mCheck: 'IF(tblMacro[[#This Row],[N. processi]]=0,"Nessun processo","OK")',
    pMacro: 'IFERROR(INDEX(tblMacro[Macro processo],MATCH(tblProcessi[[#This Row],[ID Macro]],tblMacro[ID Macro],0)),"")', pN: 'COUNTIF(INDEX(tblProcessi[ID Macro],1):tblProcessi[[#This Row],[ID Macro]],tblProcessi[[#This Row],[ID Macro]])',
    pId: 'tblProcessi[[#This Row],[ID Macro]]&"."&tblProcessi[[#This Row],[N. progressivo]]', pNMicro: 'SUMPRODUCT(--(tblBPB[Chiave (tecnica)]=tblProcessi[[#This Row],[Chiave (tecnica)]]))',
    pCheck: 'IF(tblProcessi[[#This Row],[N. micro processi]]=0,"Non usato","OK")', pKey: 'tblProcessi[[#This Row],[ID Macro]]&"|"&TRIM(tblProcessi[[#This Row],[Processo]])',
  };
  const col = (name, formula, array) => `<tableColumn id="${name.length}" name="${esc(name)}"${formula ? `><calculatedColumnFormula${array ? ' array="1"' : ''}>${esc(formula)}</calculatedColumnFormula></tableColumn>` : '/>'}`;
  const table = (id, name, ref, cols) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${name}" displayName="${name}" ref="${ref}" totalsRowShown="0"><autoFilter ref="${ref}"><filterColumn colId="0"><filters><filter val="In scope"/></filters></filterColumn></autoFilter><tableColumns count="${cols.length}">${cols.join('')}</tableColumns><tableStyleInfo name="TableStyleMedium9" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;
  const bpbRow = (r, amb, proc, micro, prio) => `<row r="${r}" spans="1:9" ht="30" customHeight="1">${S(`A${r}`, amb, 3)}${N(`B${r}`, 1, 4)}${F(`C${r}`, FM.macro, 'Sanità', 5, r === 2 ? ' t="shared" ref="C2:C3" si="0"' : ' t="shared" si="0"')}${F(`D${r}`, FM.idProc, '1.1', 5)}${S(`E${r}`, proc, 3)}${F(`F${r}`, FM.idMicro, `1.1.${r - 1}`, 5, ` t="array" ref="F${r}"`)}${S(`G${r}`, micro, 3)}${prio ? S(`H${r}`, prio, 6) : `<c r="H${r}" s="6"/>`}${F(`I${r}`, FM.key, '1|Pianificazione', 5)}</row>`;
  const dati = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:I3"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="22" customWidth="1"/><col min="7" max="7" width="48" customWidth="1"/><col min="8" max="8" width="10" customWidth="1"/></cols><sheetData><row r="1" spans="1:9" ht="40" customHeight="1">${['Ambito Analisi', 'ID Macroprocesso', 'Macro processo', 'ID Processo', 'Processo', 'ID Micro Processi', 'Sotto processi', 'Priorità', 'Chiave (tecnica)'].map((t, i) => S(`${String.fromCharCode(65 + i)}1`, t, 1)).join('')}</row>${bpbRow(2, 'In scope', 'Pianificazione', 'Flusso A', 'alta')}${bpbRow(3, 'In scope', 'Pianificazione', 'Flusso B', null)}</sheetData><conditionalFormatting sqref="A2:A3"><cfRule type="containsText" dxfId="0" priority="1" operator="containsText" text="Out"><formula>NOT(ISERROR(SEARCH("Out",A2)))</formula></cfRule></conditionalFormatting><dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="B2:B3"><formula1>ListaMacro</formula1></dataValidation></dataValidations><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`;
  const ana = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:N3"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData><row r="1" spans="1:14">${S('A1', 'MACRO PROCESSI', 2)}${S('G1', 'PROCESSI', 2)}</row><row r="2" spans="1:14">${['ID Macro', 'Macro processo', 'N. processi', 'N. micro processi', 'Check'].map((t, i) => S(`${String.fromCharCode(65 + i)}2`, t, 1)).join('')}${['ID Macro', 'Macro processo', 'N. progressivo', 'ID Processo', 'Processo', 'N. micro processi', 'Check', 'Chiave (tecnica)'].map((t, i) => S(`${String.fromCharCode(71 + i)}2`, t, 1)).join('')}</row><row r="3" spans="1:14">${N('A3', 1, 4)}${S('B3', 'Sanità', 3)}${F('C3', FM.mNProc, 1, 5)}${F('D3', FM.mNMicro, 2, 5)}${F('E3', FM.mCheck, 'OK', 5)}${N('G3', 1, 4)}${F('H3', FM.pMacro, 'Sanità', 5)}${F('I3', FM.pN, 1, 5)}${F('J3', FM.pId, '1.1', 5)}${S('K3', 'Pianificazione', 3)}${F('L3', FM.pNMicro, 2, 5, ' t="array" ref="L3"')}${F('M3', FM.pCheck, 'OK', 5, ' t="array" ref="M3"')}${F('N3', FM.pKey, '1|Pianificazione', 5)}</row></sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><tableParts count="2"><tablePart r:id="rId1"/><tablePart r:id="rId2"/></tableParts></worksheet>`;
  const legenda = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:B1"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData><row r="1" spans="1:2">${S('A1', 'Legenda dei colori', 2)}</row></sheetData><mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="12"/><color rgb="FF7030A0"/><name val="Arial"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC00000"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="1"><dxf><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf></dxfs></styleSheet>`;
  return writeZip([
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/><Override PartName="/xl/tables/table2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/><Override PartName="/xl/tables/table3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>` },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="Dati" sheetId="1" r:id="rId1"/><sheet name="Anagrafica" sheetId="2" r:id="rId2"/><sheet name="Legenda" sheetId="3" r:id="rId3"/></sheets><definedNames><definedName name="Ambiti">'Dati'!$A$2:$A$3</definedName><definedName name="ListaMacro">tblMacro[ID Macro]</definedName></definedNames><calcPr calcId="191029"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/></Relationships>' },
    { name: 'xl/sharedStrings.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${SS.length}" uniqueCount="${SS.length}">${SS.map((t) => `<si><t>${esc(t)}</t></si>`).join('')}</sst>` },
    { name: 'xl/styles.xml', data: styles },
    { name: 'xl/calcChain.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<calcChain xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><c r="C2" i="1"/><c r="C3" i="1"/><c r="C3" i="2"/></calcChain>' },
    { name: 'xl/worksheets/sheet1.xml', data: dati },
    { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet2.xml', data: ana },
    { name: 'xl/worksheets/_rels/sheet2.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table2.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table3.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet3.xml', data: legenda },
    { name: 'xl/tables/table1.xml', data: table(1, 'tblBPB', 'A1:I3', [col('Ambito Analisi'), col('ID Macroprocesso'), col('Macro processo', FM.macro), col('ID Processo', FM.idProc), col('Processo'), col('ID Micro Processi', FM.idMicro, true), col('Sotto processi'), col('Priorità'), col('Chiave (tecnica)', FM.key)]) },
    { name: 'xl/tables/table2.xml', data: table(2, 'tblMacro', 'A2:E3', [col('ID Macro'), col('Macro processo'), col('N. processi', FM.mNProc), col('N. micro processi', FM.mNMicro), col('Check', FM.mCheck)]) },
    { name: 'xl/tables/table3.xml', data: table(3, 'tblProcessi', 'G2:N3', [col('ID Macro'), col('Macro processo', FM.pMacro), col('N. progressivo', FM.pN), col('ID Processo', FM.pId), col('Processo'), col('N. micro processi', FM.pNMicro, true), col('Check', FM.pCheck, true), col('Chiave (tecnica)', FM.pKey)]) },
  ]);
}
const partsOf = (buf) => { const z = require('../src/celle/zip').readZip(buf); const out = new Map(); for (const [n, f] of z) out.set(n, f().toString('utf8')); return out; };

test('esportazione nel file di origine: stessi colori, stesse colonne, stessi fogli; nessuna colonna nuova', async () => {
  const file = fileDelManager();
  const id = (await luca.post('/api/celle/maps', { projectId: pid, name: 'Mappa del manager' })).data.id;
  const up = await luca.put('/api/celle/import?name=Processi%20BPB%20v3.xlsx', file);
  assert.equal(up.data.format, 'bpb', JSON.stringify(up.data));
  assert.deepEqual(up.data.summary, { macros: 1, processes: 1, micros: 2 });
  const imp = await luca.post(`/api/celle/maps/${id}/import`, { token: up.data.token });
  assert.equal(imp.status, 200, JSON.stringify(imp.data));
  assert.equal(imp.data.template, true, 'il file importato resta come origine');
  let m = (await luca.get(`/api/celle/maps/${id}`)).data;
  assert.equal(m.template.name, 'Processi BPB v3.xlsx');
  assert.equal(m.template.by, 'Luca Prova');
  // la mappa cresce: un micro in piu' nel processo e un macro nuovo con un processo e due micro (e una scadenza, che il file non ha)
  const proc = m.macros[0].children[0];
  const c = await luca.post(`/api/celle/maps/${id}/nodes`, { level: 3, parentId: proc.id, name: 'Flusso C' });
  await luca.patch(`/api/celle/nodes/${c.data.id}`, { dueDate: '2026-12-31', status: 'da fare' });
  const mac = (await luca.post(`/api/celle/maps/${id}/nodes`, { level: 1, name: 'Decreti' })).data;
  const dec = (await luca.post(`/api/celle/maps/${id}/nodes`, { level: 2, parentId: mac.id, name: 'Decreto' })).data;
  await luca.post(`/api/celle/maps/${id}/nodes`, { level: 3, parentId: dec.id, name: 'Impegno' });
  await luca.post(`/api/celle/maps/${id}/nodes`, { level: 3, parentId: dec.id, name: 'Liquidazione' });

  const res = await luca.get(`/api/celle/maps/${id}/export`);
  assert.equal(res.status, 200);
  const T = partsOf(file);
  const E = partsOf(res.data);
  // identici: stili (colori), stringhe condivise, foglio Legenda (con le celle unite), larghezze e intestazioni
  for (const name of ['xl/styles.xml', 'xl/sharedStrings.xml', 'xl/worksheets/sheet3.xml']) assert.equal(E.get(name), T.get(name), name);
  const row = (xml, n) => (xml.match(new RegExp(`<row r="${n}"[^>]*>[\\s\\S]*?</row>`)) || [])[0];
  assert.equal(row(E.get('xl/worksheets/sheet1.xml'), 1), row(T.get('xl/worksheets/sheet1.xml'), 1), 'intestazione del foglio Dati');
  assert.equal(row(E.get('xl/worksheets/sheet2.xml'), 1), row(T.get('xl/worksheets/sheet2.xml'), 1), 'titoli dell\'Anagrafica');
  assert.equal(row(E.get('xl/worksheets/sheet2.xml'), 2), row(T.get('xl/worksheets/sheet2.xml'), 2), 'intestazioni dell\'Anagrafica');
  assert.ok(E.get('xl/worksheets/sheet1.xml').includes('<cols><col min="1" max="1" width="22"'));
  // le righe nuove hanno gli stili di colonna e l'altezza del file; le formule del file, anche matriciali
  const dati = E.get('xl/worksheets/sheet1.xml');
  assert.match(dati, /<row r="6" ht="30" customHeight="1">/);
  assert.match(dati, /<c r="A6" s="3"\/>/, 'ambito vuoto con lo stile della colonna');
  assert.match(dati, /<c r="H6" s="6"\/>/, 'la colonna del manager (Priorità) resta, vuota, con il suo colore');
  assert.match(dati, /<c r="F6" s="5" t="str"><f t="array" ref="F6">tblBPB\[\[#This Row\],\[ID Processo\]\]/, 'formula matriciale della colonna');
  assert.match(dati, /<c r="G6" s="3" t="inlineStr"><is><t xml:space="preserve">Liquidazione<\/t><\/is><\/c>/);
  assert.match(dati, /<dimension ref="A1:I6"\/>/);
  // colori condizionali, menu a tendina e nome con intervallo fisso allargati alle righe nuove
  assert.match(dati, /<conditionalFormatting sqref="A2:A6">/);
  assert.match(dati, /sqref="B2:B6"><formula1>ListaMacro<\/formula1>/);
  assert.match(E.get('xl/workbook.xml'), /<definedName name="Ambiti">'Dati'!\$A\$2:\$A\$6<\/definedName>/);
  assert.match(E.get('xl/workbook.xml'), /<calcPr\b[^>]*fullCalcOnLoad="1"/, 'Excel ricalcola le formule all\'apertura');
  // via la catena di calcolo (si riferiva alle celle di prima), via i filtri attivi; intervalli delle tabelle aggiornati
  assert.equal(E.has('xl/calcChain.xml'), false);
  assert.doesNotMatch(E.get('[Content_Types].xml'), /calcChain/);
  assert.doesNotMatch(E.get('xl/_rels/workbook.xml.rels'), /calcChain/);
  assert.match(E.get('xl/tables/table1.xml'), /ref="A1:I6" totalsRowShown="0"><autoFilter ref="A1:I6"\/><tableColumns count="9">/);
  assert.match(E.get('xl/tables/table2.xml'), /ref="A2:E4"/);
  assert.match(E.get('xl/tables/table3.xml'), /ref="G2:N4"/);
  assert.doesNotMatch(E.get('xl/tables/table1.xml'), /Responsabile|Scadenza|Stato/, 'nessuna colonna nuova: il file resta quello che il team conosce');
  // si rilegge: i dati sono quelli della mappa, e il file si reimporta
  const book = readXlsx(res.data);
  assert.deepEqual(book.sheets.map((s) => s.name), ['Dati', 'Anagrafica', 'Legenda']);
  const rows = tableRows(book, book.sheets[0], book.sheets[0].tables[0]);
  assert.deepEqual(rows.map((r) => [r['ID Micro Processi'], r['Sotto processi'], r['Priorità']]), [['1.1.1', 'Flusso A', null], ['1.1.2', 'Flusso B', null], ['1.1.3', 'Flusso C', null], ['2.1.1', 'Impegno', null], ['2.1.2', 'Liquidazione', null]]);
  assert.deepEqual(tableRows(book, book.sheets[1], book.sheets[1].tables[0]).map((r) => [r['ID Macro'], r['Macro processo'], r['N. processi'], r['N. micro processi']]), [[1, 'Sanità', 1, 3], [2, 'Decreti', 1, 2]]);
  assert.deepEqual(tableRows(book, book.sheets[1], book.sheets[1].tables[1]).map((r) => [r['ID Processo'], r.Processo, r['Chiave (tecnica)']]), [['1.1', 'Pianificazione', '1|Pianificazione'], ['2.1', 'Decreto', '2|Decreto']]);
  const again = await luca.put('/api/celle/import?name=rientro.xlsx', res.data);
  assert.deepEqual(again.data.summary, { macros: 2, processes: 2, micros: 5 });
  // anche "Salva nel progetto" usa il file di origine
  await luca.post(`/api/celle/maps/${id}/export`);
  const saved = partsOf(fs.readFileSync(path.join(portal.root, 'progetti', 'Regione', 'GestioneCelle', 'Mappa del manager.xlsx')));
  assert.equal(saved.get('xl/styles.xml'), T.get('xl/styles.xml'));
  // la mappa nata dal BPB di GestioneCelle esporta nello stesso stile del file importato (identico al formato interno)
  m = (await luca.get(`/api/celle/maps/${mapId}`)).data;
  assert.equal(m.template.name, 'bpb.xlsx');
});

test('file di origine: senza, formato BPB interno; si sceglie, si scarica, si toglie (solo chi gestisce la mappa)', async () => {
  const gen = (await luca.get('/api/celle/maps')).data.maps.find((x) => x.name === 'Generica');
  assert.equal((await luca.get(`/api/celle/maps/${gen.id}`)).data.template, null, 'importata da un foglio qualsiasi: nessun file di origine');
  let E = partsOf((await luca.get(`/api/celle/maps/${gen.id}/export`)).data);
  assert.match(E.get('xl/styles.xml'), /FF1F4E79/, 'formato BPB interno di GestioneCelle');
  assert.equal((await luca.get(`/api/celle/maps/${gen.id}/template`)).status, 404);
  // un file che non e' BPB non fa da modello
  const no = await luca.put(`/api/celle/maps/${gen.id}/template?name=x.xlsx`, Buffer.from('non sono un file Excel'));
  assert.equal(no.status, 400);
  // l'ospite non vede la mappa; chi la gestisce sceglie il file
  const file = fileDelManager();
  assert.equal((await ospite.put(`/api/celle/maps/${gen.id}/template?name=bpb.xlsx`, file)).status, 404);
  const ok = await luca.put(`/api/celle/maps/${gen.id}/template?name=Stile%20del%20team.xlsx`, file);
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.template.name, 'Stile del team.xlsx');
  E = partsOf((await luca.get(`/api/celle/maps/${gen.id}/export`)).data);
  assert.equal(E.get('xl/styles.xml'), partsOf(file).get('xl/styles.xml'), 'l\'Excel ha i colori del file scelto');
  const book = readXlsx((await luca.get(`/api/celle/maps/${gen.id}/export`)).data);
  assert.deepEqual(book.sheets.map((s) => s.name), ['Dati', 'Anagrafica', 'Legenda']);
  assert.deepEqual(tableRows(book, book.sheets[0], book.sheets[0].tables[0]).map((r) => [r['ID Micro Processi'], r['Sotto processi']]), [['1.1.1', 'Preparazione'], ['1.1.2', 'Invio'], ['2.1.1', 'Emissione']]);
  // l'originale si riscarica com'era
  const orig = await luca.get(`/api/celle/maps/${gen.id}/template`);
  assert.equal(orig.status, 200);
  assert.ok(Buffer.from(orig.data).equals(file));
  assert.match(orig.headers.get('content-disposition'), /Stile del team\.xlsx/);
  // si toglie: si torna al formato interno
  assert.equal((await luca.del(`/api/celle/maps/${gen.id}/template`)).status, 200);
  assert.equal((await luca.get(`/api/celle/maps/${gen.id}`)).data.template, null);
  E = partsOf((await luca.get(`/api/celle/maps/${gen.id}/export`)).data);
  assert.match(E.get('xl/styles.xml'), /FF1F4E79/);
  const hist = (await luca.get(`/api/celle/maps/${gen.id}/history`)).data;
  assert.deepEqual(hist.slice(0, 2).map((x) => x.action), ['file di origine tolto', 'file di origine conservato']);
});
