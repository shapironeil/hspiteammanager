'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startPortal, client, setupHacker, addUser } = require('./helpers');

let portal; let hacker; let mario; let luca; let projectId;

before(async () => {
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  mario = await addUser(portal.base, hacker, 'Mario', 'manager');
  luca = await addUser(portal.base, hacker, 'Luca', 'dipendente');
  const p = await hacker.post('/api/projects', { name: 'ATAC Prova', members: [mario.id] });
  assert.equal(p.status, 201);
  projectId = p.data.id;
});
after(() => portal && portal.stop());

test('gli spazi visibili rispettano i membri del progetto', async () => {
  const m = await mario.get('/api/explorer/spaces');
  assert.deepEqual(m.data.spaces.map((s) => s.id), ['me', `p${projectId}`]);
  const l = await luca.get('/api/explorer/spaces');
  assert.deepEqual(l.data.spaces.map((s) => s.id), ['me']);
  assert.equal((await luca.get(`/api/explorer/p${projectId}/list`)).status, 404);
});

test('cartelle e file personali stanno su disco e nell\'indice', async () => {
  assert.equal((await mario.post('/api/explorer/me/folder', { path: '', name: 'Documenti' })).status, 201);
  const up = await mario.put('/api/explorer/me/file?path=Documenti&name=nota.txt', 'prima versione');
  assert.equal(up.status, 201);
  const onDisk = path.join(portal.root, 'data', 'personale', String(mario.id), 'Documenti', 'nota.txt');
  assert.equal(fs.readFileSync(onDisk, 'utf8'), 'prima versione');
  const list = await mario.get('/api/explorer/me/list?path=Documenti');
  assert.equal(list.data.files[0].name, 'nota.txt');
  assert.equal(list.data.files[0].by, 'Mario Prova');
  // lo spazio personale di Mario non e' di Luca
  assert.equal((await luca.get('/api/explorer/me/list?path=Documenti')).status, 404);
  const s = await mario.get('/api/explorer/search?q=nota');
  assert.equal(s.data.results.length, 1);
  assert.equal(s.data.results[0].space, 'me');
  assert.equal((await luca.get('/api/explorer/search?q=nota')).data.results.length, 0);
});

test('sostituire un file conserva la versione precedente e si puo\' ripristinare', async () => {
  assert.equal((await mario.put('/api/explorer/me/file?path=Documenti&name=nota.txt', 'seconda')).status, 409);
  const r = await mario.put('/api/explorer/me/file?path=Documenti&name=nota.txt&overwrite=1', 'seconda');
  assert.equal(r.data.replaced, true);
  const v = await mario.get('/api/explorer/me/versions?path=Documenti/nota.txt');
  assert.equal(v.data.versions.length, 1);
  const old = await mario.get(`/api/explorer/me/download?path=Documenti/nota.txt&version=${encodeURIComponent(v.data.versions[0].id)}`);
  assert.equal(old.data.toString(), 'prima versione');
  await mario.post('/api/explorer/me/versions/restore', { path: 'Documenti/nota.txt', id: v.data.versions[0].id });
  assert.equal((await mario.get('/api/explorer/me/download?path=Documenti/nota.txt')).data.toString(), 'prima versione');
  // anche "seconda" e' stata conservata
  assert.equal((await mario.get('/api/explorer/me/versions?path=Documenti/nota.txt')).data.versions.length, 2);
});

test('rinomina e sposta portano con se\' le versioni', async () => {
  await mario.post('/api/explorer/me/folder', { path: '', name: 'Archivio' });
  const rn = await mario.post('/api/explorer/me/rename', { path: 'Documenti/nota.txt', name: 'appunti.txt' });
  assert.equal(rn.data.path, 'Documenti/appunti.txt');
  assert.equal((await mario.get('/api/explorer/me/versions?path=Documenti/appunti.txt')).data.versions.length, 2);
  const mv = await mario.post('/api/explorer/me/move', { path: 'Documenti', to: 'Archivio' });
  assert.equal(mv.data.path, 'Archivio/Documenti');
  assert.equal((await mario.post('/api/explorer/me/move', { path: 'Archivio', to: 'Archivio/Documenti' })).status, 400);
  const s = await mario.get('/api/explorer/search?q=appunti');
  assert.equal(s.data.results[0].path, 'Archivio/Documenti/appunti.txt');
  assert.equal((await mario.get('/api/explorer/me/versions?path=Archivio/Documenti/appunti.txt')).data.versions.length, 2);
  // rinominare la cartella porta con se' le versioni dei file che contiene
  await mario.post('/api/explorer/me/rename', { path: 'Archivio/Documenti', name: 'Doc' });
  assert.equal((await mario.get('/api/explorer/me/versions?path=Archivio/Doc/appunti.txt')).data.versions.length, 2);
  await mario.post('/api/explorer/me/rename', { path: 'Archivio/Doc', name: 'Documenti' });
});

test('elimina sposta nel cestino senza cancellare, e si ripristina', async () => {
  const t = await mario.post('/api/explorer/me/trash', { path: 'Archivio/Documenti/appunti.txt' });
  assert.equal(t.status, 200);
  const bin = path.join(portal.root, 'data', 'personale', String(mario.id), '.cestino');
  assert.ok(fs.readdirSync(bin).some((n) => n.endsWith('__appunti.txt')));
  assert.equal((await mario.get('/api/explorer/search?q=appunti')).data.results.length, 0);
  const items = (await mario.get('/api/explorer/me/trash')).data.items;
  assert.equal(items[0].path, 'Archivio/Documenti/appunti.txt');
  const r = await mario.post('/api/explorer/me/trash/restore', { id: items[0].id });
  assert.equal(r.data.path, 'Archivio/Documenti/appunti.txt');
  assert.equal((await mario.get('/api/explorer/me/trash')).data.items.length, 0);
});

test('i percorsi non escono dallo spazio e i nomi riservati sono rifiutati', async () => {
  for (const p of ['..', '../..', 'a/../../x', '.cestino', '.storico/x', 'C:/Windows']) {
    assert.equal((await mario.get(`/api/explorer/me/list?path=${encodeURIComponent(p)}`)).status, 400, p);
  }
  assert.equal((await mario.post('/api/explorer/me/folder', { path: '', name: '.nascosta' })).status, 400);
  assert.equal((await mario.post('/api/explorer/me/folder', { path: '', name: '../fuori' })).status, 400);
  assert.equal((await mario.post('/api/explorer/me/trash', { path: '' })).status, 400);
});

test('i file del progetto sono condivisi tra i membri, con anteprima e Range per i video', async () => {
  await mario.post(`/api/explorer/p${projectId}/folder`, { path: '', name: 'Verbali' });
  await mario.put(`/api/explorer/p${projectId}/file?path=Verbali&name=riunione.mp4`, Buffer.alloc(1000, 7));
  const h = await hacker.get(`/api/explorer/p${projectId}/list?path=Verbali`);
  assert.equal(h.data.files[0].type, 'video/mp4');
  const part = await hacker.get(`/api/explorer/p${projectId}/view?path=Verbali/riunione.mp4`, { range: 'bytes=10-19' });
  assert.equal(part.status, 206);
  assert.equal(part.data.length, 10);
  assert.equal(part.headers.get('content-range'), 'bytes 10-19/1000');
  const recent = await hacker.get('/api/explorer/recent');
  assert.equal(recent.data.results[0].name, 'riunione.mp4');
  assert.equal(recent.data.results[0].by, 'Mario Prova');
  // file messo a mano nella cartella del progetto: compare dopo l'elenco
  fs.writeFileSync(path.join(portal.root, 'progetti', 'ATAC-Prova', 'Verbali', 'manuale.txt'), 'x');
  const l = await mario.get(`/api/explorer/p${projectId}/list?path=Verbali`);
  assert.ok(l.data.files.some((f) => f.name === 'manuale.txt'));
});

test('le modifiche richiedono l\'intestazione del portale (CSRF)', async () => {
  const res = await fetch(`${portal.base}/api/explorer/me/folder`, { method: 'POST', body: '{}' });
  assert.equal(res.status, 403);
  const anon = client(portal.base);
  assert.equal((await anon.get('/api/explorer/spaces')).status, 401);
});
