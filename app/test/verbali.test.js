'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startPortal, setupHacker, addUser } = require('./helpers');

let portal; let hacker; let mario; let luca; let pid; let cid;
const projDir = () => path.join(portal.root, 'progetti', 'ATAC');

before(async () => {
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  mario = await addUser(portal.base, hacker, 'Mario', 'dipendente');
  luca = await addUser(portal.base, hacker, 'Luca', 'dipendente');
  pid = (await hacker.post('/api/projects', { name: 'ATAC', members: [mario.id] })).data.id;
});
after(() => portal && portal.stop());

test('lo stato mostra solo i progetti visibili, con le impostazioni di Verbale Studio', async () => {
  const m = await mario.get('/api/vs/state');
  assert.equal(m.status, 200);
  assert.deepEqual(m.data.projects.map((p) => p.name), ['ATAC']);
  assert.match(m.data.projects[0].glossary, /Databricks/);
  assert.equal(m.data.settings.hasApiKey, false);
  assert.equal(m.data.settings.author, 'Mario');
  assert.deepEqual((await luca.get('/api/vs/state')).data.projects, []);
  assert.equal((await luca.get(`/api/vs/projects/${pid}/checkpoints`)).status, 404);
});

test('nuovo checkpoint: cartella vera nel progetto, dati nascosti e indice', async () => {
  const r = await mario.post(`/api/vs/projects/${pid}/checkpoints`, { date: '2026-09-28', title: 'Checkpoint settimanale' });
  assert.equal(r.status, 201);
  cid = r.data.id;
  assert.equal(r.data.folder, 'Verbali/2026-09-28 Checkpoint settimanale');
  assert.ok(fs.existsSync(path.join(projDir(), 'Verbali', '2026-09-28 Checkpoint settimanale', '.verbale', 'checkpoint.json')));
  const list = await mario.get(`/api/vs/projects/${pid}/checkpoints`);
  assert.equal(list.data.length, 1);
  // in Esplora file la cartella si vede, i dati del programma no
  const ex = await mario.get(`/api/explorer/p${pid}/list?path=${encodeURIComponent('Verbali/2026-09-28 Checkpoint settimanale')}`);
  assert.equal(ex.status, 200);
  assert.equal(ex.data.folders.length, 0);
});

test('il salvataggio scrive i testi leggibili, conserva le versioni e rinomina la cartella', async () => {
  const cues = [{ id: 'c1', start: 1, end: 4, speaker: 'Anna', text: 'Ingestion completata' }];
  const s1 = await mario.put(`/api/vs/projects/${pid}/checkpoints/${cid}`, { transcript: { sourceName: 'x.vtt', importedAt: 'a', cues }, email: { subject: 'Ogg', body: 'Ciao a tutti' }, notes: 'nota' });
  assert.equal(s1.status, 200);
  const dir = path.join(projDir(), 'Verbali', '2026-09-28 Checkpoint settimanale');
  assert.match(fs.readFileSync(path.join(dir, 'Transcript revisionato.txt'), 'utf8'), /Anna: Ingestion completata/);
  assert.match(fs.readFileSync(path.join(dir, 'Email di riepilogo.txt'), 'utf8'), /Ciao a tutti/);
  // un'altra persona modifica: la versione precedente si conserva sempre
  await hacker.put(`/api/vs/projects/${pid}/checkpoints/${cid}`, { notes: 'nota di Anna' });
  const v = await mario.get(`/api/vs/projects/${pid}/checkpoints/${cid}/versions`);
  assert.ok(v.data.length >= 2, 'versioni: ' + v.data.length);
  // cambio titolo -> cartella rinominata, il checkpoint si ritrova
  const s2 = await mario.put(`/api/vs/projects/${pid}/checkpoints/${cid}`, { title: 'Checkpoint ATAC' });
  assert.equal(s2.data.folder, 'Verbali/2026-09-28 Checkpoint ATAC');
  assert.equal(s2.data.conflict.name, 'Anna Hacker');
  const c = await mario.get(`/api/vs/projects/${pid}/checkpoints/${cid}`);
  assert.equal(c.data.notes, 'nota di Anna');
  // ripristino di una versione
  const r = await mario.post(`/api/vs/projects/${pid}/checkpoints/${cid}/versions/restore`, { file: v.data[v.data.length - 1].file });
  assert.equal(r.status, 200);
  // la versione ripristinata riporta anche il suo titolo (e il nome della cartella); poi si rimette quello nuovo
  assert.equal(r.data.folder, 'Verbali/2026-09-28 Checkpoint settimanale');
  await mario.put(`/api/vs/projects/${pid}/checkpoints/${cid}`, { title: 'Checkpoint ATAC' });
});

test('se la cartella viene spostata da Esplora file il checkpoint si ritrova', async () => {
  await mario.post(`/api/explorer/p${pid}/folder`, { path: 'Verbali', name: '2026' });
  const mv = await mario.post(`/api/explorer/p${pid}/move`, { path: 'Verbali/2026-09-28 Checkpoint ATAC', to: 'Verbali/2026' });
  assert.equal(mv.status, 200);
  const c = await mario.get(`/api/vs/projects/${pid}/checkpoints/${cid}`);
  assert.equal(c.status, 200);
  assert.equal(c.data.folder, 'Verbali/2026/2026-09-28 Checkpoint ATAC');
});

test('video: caricamento, riproduzione con Range, sostituzione senza perdere il vecchio', async () => {
  const up = await mario.put(`/api/vs/projects/${pid}/checkpoints/${cid}/video?name=riunione.mp4`, Buffer.alloc(5000, 1));
  assert.equal(up.status, 200);
  assert.equal(up.data.file, 'Registrazione.mp4');
  const part = await mario.get(`/api/vs/media/${pid}/${cid}`, { range: 'bytes=0-99' });
  assert.equal(part.status, 206);
  assert.equal(part.data.length, 100);
  await mario.put(`/api/vs/projects/${pid}/checkpoints/${cid}/video?name=riunione2.mp4`, Buffer.alloc(3000, 2));
  const trash = await mario.get(`/api/explorer/p${pid}/trash`);
  assert.ok(trash.data.items.some((t) => t.name === 'Registrazione.mp4'), 'il video precedente e\' nel cestino');
  assert.equal((await luca.get(`/api/vs/media/${pid}/${cid}`)).status, 404);
});

test('cartella di lavoro: trova i video negli spazi e collega un video del progetto', async () => {
  await mario.post(`/api/explorer/p${pid}/folder`, { path: '', name: 'Registrazioni' });
  await mario.put(`/api/explorer/p${pid}/file?path=Registrazioni&name=teams.mp4`, Buffer.alloc(2000, 3));
  await mario.put(`/api/explorer/me/file?path=&name=mio.vtt`, 'WEBVTT\n\n00:00.000 --> 00:01.000\nciao\n');
  const f = await mario.get('/api/vs/folder');
  const rels = f.data.files.map((x) => x.rel);
  assert.ok(rels.includes(`p${pid}/Registrazioni/teams.mp4`));
  assert.ok(rels.includes('me/mio.vtt'));
  assert.equal(f.data.checkpoints.length, 1);
  const read = await mario.post('/api/vs/folder/read', { rel: 'me/mio.vtt' });
  assert.match(read.data.text, /WEBVTT/);
  const tf = await mario.put(`/api/vs/projects/${pid}/checkpoints/${cid}/transcript-file?rel=me%2Fmio.vtt`);
  assert.equal(tf.status, 200);
  assert.match(tf.data.transcriptFile, /Transcript originale\.vtt$/);
  // con "copia" disattivata un video del progetto si collega senza duplicarlo
  await mario.put('/api/vs/settings', { copyLinkedVideos: false });
  const link = await mario.post(`/api/vs/projects/${pid}/checkpoints/${cid}/video-link`, { rel: `p${pid}/Registrazioni/teams.mp4` });
  assert.equal(link.status, 200);
  assert.equal(link.data.link.path, 'Registrazioni/teams.mp4');
  assert.equal((await mario.get(`/api/vs/media/${pid}/${cid}`, { range: 'bytes=0-9' })).status, 206);
  // aprire file "sul computer" non e' consentito a chi non e' l'Hacker
  assert.equal((await mario.post('/api/vs/folder/open-file', { rel: `p${pid}/Registrazioni/teams.mp4` })).status, 400);
});

test('elimina checkpoint -> cestino del progetto -> recupero', async () => {
  const d = await mario.del(`/api/vs/projects/${pid}/checkpoints/${cid}`);
  assert.equal(d.status, 200);
  assert.equal((await mario.get(`/api/vs/projects/${pid}/checkpoints`)).data.length, 0);
  const t = await mario.get('/api/vs/trash');
  assert.equal(t.data.length, 1);
  assert.equal(t.data[0].title, 'Checkpoint ATAC');
  assert.equal((await mario.del(`/api/vs/trash/${encodeURIComponent(t.data[0].id)}`)).status, 400);
  const r = await mario.post('/api/vs/trash/restore', { id: t.data[0].id });
  assert.equal(r.status, 200);
  const list = await mario.get(`/api/vs/projects/${pid}/checkpoints`);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].id, cid);
});

test('impostazioni del progetto, template comuni, apprendimento', async () => {
  const p = await mario.put(`/api/vs/projects/${pid}`, { recipients: 'team@atac.it', glossary: 'ATAC, GdL' });
  assert.equal(p.data.recipients, 'team@atac.it');
  assert.ok(fs.existsSync(path.join(projDir(), 'Verbali', '.verbale-progetto.json')));
  await mario.put('/api/vs/templates', [{ id: 'mio', name: 'Mio' }]);
  assert.deepEqual((await hacker.get('/api/vs/templates')).data, [{ id: 'mio', name: 'Mio' }]);
  await mario.put(`/api/vs/projects/${pid}/learning`, { counts: { a: 1 } });
  assert.deepEqual((await mario.get(`/api/vs/projects/${pid}/learning`)).data, { counts: { a: 1 } });
  // le azioni sul PC del portale sono dell'Hacker
  assert.equal((await mario.post('/api/vs/ollama/pull', { model: 'qwen2.5:3b' })).status, 400, 'AI spenta sull\'host: si usa HSPI Client');
  assert.equal((await mario.post('/api/vs/ai/summary', {})).status, 400);
});

test('importazione dal vecchio Verbale Studio: copia senza toccare l\'originale', async () => {
  const old = path.join(portal.root, 'vecchio');
  const cpDir = path.join(old, 'data', 'projects', 'atac', 'checkpoints', '2026-05-04-ab12');
  fs.mkdirSync(path.join(cpDir, 'versioni'), { recursive: true });
  fs.mkdirSync(path.join(old, 'Archivio', 'ATAC', '2026-05-04 Kickoff'), { recursive: true });
  fs.mkdirSync(path.join(old, 'Registrazioni'), { recursive: true });
  fs.writeFileSync(path.join(old, 'Registrazioni', 'kickoff.mp4'), Buffer.alloc(1234, 9));
  fs.writeFileSync(path.join(old, 'Archivio', 'ATAC', '2026-05-04 Kickoff', 'Transcript originale.vtt'), 'WEBVTT');
  fs.writeFileSync(path.join(old, 'data', 'projects', 'atac', 'project.json'), JSON.stringify({ id: 'atac', name: 'ATAC', recipients: 'vecchi@atac.it' }));
  fs.writeFileSync(path.join(old, 'data', 'projects', 'atac', 'learning.json'), '{"x":1}');
  fs.writeFileSync(path.join(cpDir, 'checkpoint.json'), JSON.stringify({
    id: '2026-05-04-ab12', projectId: 'atac', date: '2026-05-04', title: 'Kickoff', status: 'inviato',
    folder: 'Archivio/ATAC/2026-05-04 Kickoff', video: { external: 'Registrazioni/kickoff.mp4', name: 'kickoff.mp4' },
    transcript: { cues: [{ start: 0, end: 1, text: 'ciao' }] }, email: { subject: 'S', body: 'B' },
  }));
  fs.writeFileSync(path.join(cpDir, 'versioni', '2026-05-04_10-00-00_auto.json'), '{}');
  fs.mkdirSync(path.join(old, 'data', 'projects', 'altro', 'checkpoints'), { recursive: true });
  fs.writeFileSync(path.join(old, 'data', 'projects', 'altro', 'project.json'), JSON.stringify({ id: 'altro', name: 'Altro cliente' }));
  fs.writeFileSync(path.join(old, 'data', 'templates.json'), JSON.stringify([{ id: 'vecchio', name: 'Vecchio' }]));

  const dry = await hacker.post('/api/vs/import', { dir: old, dryRun: true });
  assert.equal(dry.status, 200);
  assert.equal(dry.data.checkpoints, 1);
  assert.equal((await mario.post('/api/vs/import', { dir: old })).status, 403);
  const r = await hacker.post('/api/vs/import', { dir: old });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.checkpoints, 1);
  assert.ok(r.data.projects.find((p) => p.old === 'Altro cliente').created);
  const list = (await hacker.get(`/api/vs/projects/${pid}/checkpoints`)).data;
  const k = list.find((c) => c.title === 'Kickoff');
  assert.ok(k, 'checkpoint importato');
  const full = (await hacker.get(`/api/vs/projects/${pid}/checkpoints/${k.id}`)).data;
  assert.equal(full.video.file, 'Registrazione.mp4');
  assert.equal(full.status, 'inviato');
  const dir = path.join(projDir(), 'Verbali', '2026-05-04 Kickoff');
  assert.ok(fs.existsSync(path.join(dir, 'Registrazione.mp4')));
  assert.ok(fs.existsSync(path.join(dir, 'Transcript originale.vtt')));
  assert.ok(fs.existsSync(path.join(dir, '.verbale', 'versioni', '2026-05-04_10-00-00_auto.json')));
  assert.ok(fs.existsSync(path.join(old, 'Registrazioni', 'kickoff.mp4')), 'originale intatto');
  assert.deepEqual((await hacker.get('/api/vs/templates')).data.map((t) => t.id), ['mio', 'vecchio']);
  // la seconda volta non duplica
  const again = await hacker.post('/api/vs/import', { dir: old });
  assert.equal(again.data.checkpoints, 0);
  assert.equal(again.data.skipped, 1);
});
