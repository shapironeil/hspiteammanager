'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startPortal, setupHacker, client } = require('./helpers');

let portal; let hacker; let G; const people = {};
const gradeId = (name) => G.find((g) => g.name === name).id;

async function login(username, password) {
  const c = client(portal.base);
  const r = await c.post('/api/login', { username, password });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  await c.post('/api/me/password', { current: password, next: 'definitiva-456' });
  return c;
}

before(async () => {
  portal = await startPortal();
  hacker = await setupHacker(portal.base);
  G = (await hacker.get('/api/grades')).data.grades;
  const r = await hacker.post('/api/users/bulk', { text: 'Francesco Sanso; Senior manager\nMarco Cariello; Manager\nLucrezia Manco; PM manager\nGiovanna Lisi; Dipendente\nSofia Ghegai; Stage\nSara Della Vecchia' });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.created.length, 6, JSON.stringify(r.data.errors));
  for (const u of r.data.created) people[u.name.split(' ')[0].toLowerCase()] = { ...u, c: await login(u.username, u.password) };
});
after(() => portal && portal.stop());

test('i gradi predefiniti e la creazione del team in blocco', () => {
  assert.deepEqual(G.map((g) => g.name), ['Stage', 'Dipendente', 'PM manager', 'Manager', 'Senior manager']);
  assert.equal(people.sara.grade, 'Dipendente');
  assert.equal(people.sara.username, 'sara.dellavecchia');
});

test('i permessi seguono il livello del grado', async () => {
  // PM manager ha livello manager: puo' creare progetti; Stage no
  assert.equal((await people.lucrezia.c.post('/api/projects', { name: 'Progetto PM' })).status, 201);
  assert.equal((await people.sofia.c.post('/api/projects', { name: 'Progetto Stage' })).status, 403);
});

test('l\'Hacker e\' nascosto: gli altri vedono solo il suo grado', async () => {
  const list = (await people.marco.c.get('/api/users')).data;
  const anna = list.find((u) => u.username === 'anna.hacker');
  assert.equal(anna.role, 'dipendente');
  assert.equal(anna.grade.name, 'Dipendente');
  assert.equal(anna.isHacker, undefined);
  assert.ok(!JSON.stringify(list).includes('"role":"hacker"') && !JSON.stringify(list).includes('isHacker'), 'nessun ruolo hacker visibile');
  const mine = (await hacker.get('/api/users')).data.find((u) => u.username === 'anna.hacker');
  assert.equal(mine.isHacker, true);
  assert.equal(mine.badge, '#2dd4bf');
  // i Manager non vedono la gestione dei ruoli
  assert.equal((await people.marco.c.get('/api/grades')).status, 403);
});

test('statistiche: ognuno vede solo chi sta sotto (mai l\'Hacker)', async () => {
  const fr = (await people.francesco.c.get('/api/team/stats')).data.people.map((u) => u.name).sort();
  assert.deepEqual(fr, ['Giovanna Lisi', 'Lucrezia Manco', 'Marco Cariello', 'Sara Della Vecchia', 'Sofia Ghegai']);
  const lu = (await people.lucrezia.c.get('/api/team/stats')).data.people.map((u) => u.name).sort();
  assert.deepEqual(lu, ['Giovanna Lisi', 'Sara Della Vecchia', 'Sofia Ghegai']);
  assert.equal((await people.sofia.c.get('/api/team/stats')).data.people.length, 0);
  const st = await people.giovanna.c.get('/api/state');
  assert.equal(st.data.user.teamCount, 1); // sotto Dipendente c'e' solo Stage
});

test('gestione dei gradi: rinomina, ordine, livello, eliminazione con spostamento', async () => {
  assert.equal((await hacker.patch(`/api/grades/${gradeId('Stage')}`, { name: 'Stagista' })).status, 200);
  const r = await hacker.post('/api/grades', { name: 'Veterano', color: '#336699', level: 'dipendente' });
  assert.equal(r.status, 201);
  // Veterano finisce in cima; lo si porta sotto Dipendente
  const order = [gradeId('Stage'), r.data.id, gradeId('Dipendente'), gradeId('PM manager'), gradeId('Manager'), gradeId('Senior manager')];
  assert.equal((await hacker.post('/api/grades/order', { ids: order })).status, 200);
  await hacker.patch(`/api/users/${people.giovanna.id}`, { gradeId: r.data.id });
  assert.equal((await hacker.del(`/api/grades/${r.data.id}`)).status, 400, 'servono istruzioni per le persone');
  assert.equal((await hacker.del(`/api/grades/${r.data.id}?spostaIn=${gradeId('Dipendente')}`)).status, 200);
  const g = (await hacker.get('/api/grades')).data;
  assert.ok(!g.grades.some((x) => x.name === 'Veterano'));
  assert.equal(g.people.find((u) => u.name === 'Giovanna Lisi').gradeId, gradeId('Dipendente'));
  // cambiare il livello del grado cambia i permessi di chi lo ha
  await hacker.patch(`/api/grades/${gradeId('Stage')}`, { level: 'manager' });
  assert.equal((await people.sofia.c.post('/api/projects', { name: 'Ora posso' })).status, 201);
  await hacker.patch(`/api/grades/${gradeId('Stage')}`, { level: 'dipendente', name: 'Stage' });
});

test('ospiti a tempo: accesso che scade, storico, solo chi gestisce il progetto', async () => {
  const p = (await hacker.post('/api/projects', { name: 'ATAC', members: [people.marco.id] })).data.id;
  assert.equal((await people.giovanna.c.get(`/api/explorer/p${p}/list`)).status, 404);
  assert.equal((await people.sofia.c.post(`/api/projects/${p}/guests`, { userId: people.giovanna.id, days: 3 })).status, 404);
  const add = await people.marco.c.post(`/api/projects/${p}/guests`, { userId: people.giovanna.id, days: 3, note: 'revisione verbale' });
  assert.equal(add.status, 201, JSON.stringify(add.data));
  assert.equal((await people.giovanna.c.get(`/api/explorer/p${p}/list`)).status, 200);
  const proj = (await people.marco.c.get('/api/projects')).data.projects.find((x) => x.id === p);
  assert.equal(proj.guests[0].name, 'Giovanna Lisi');
  // salvare la scheda del progetto non toglie gli ospiti
  await people.marco.c.patch(`/api/projects/${p}`, { name: 'ATAC', members: [people.marco.id, people.lucrezia.id] });
  assert.equal((await people.giovanna.c.get(`/api/explorer/p${p}/list`)).status, 200);
  // scadenza: si simula portando la data nel passato
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(portal.root, 'data', 'portale.db'));
  db.prepare('UPDATE project_members SET expires_at = ? WHERE user_id = ?').run('2000-01-01T00:00:00.000Z', people.giovanna.id);
  db.close();
  assert.equal((await people.giovanna.c.get(`/api/explorer/p${p}/list`)).status, 404, 'accesso scaduto');
  const stats = (await people.francesco.c.get('/api/team/stats')).data;
  assert.ok(stats.accessLog.some((a) => a.person === 'Giovanna Lisi' && a.note === 'revisione verbale'));
});

test('eliminare una persona non cancella i suoi dati', async () => {
  await people.sofia.c.put('/api/explorer/me/file?path=&name=appunti.txt', 'appunti');
  assert.equal((await people.marco.c.del(`/api/users/${people.sofia.id}`)).status, 403);
  assert.equal((await hacker.del(`/api/users/${people.sofia.id}`)).status, 200);
  assert.equal((await people.sofia.c.get('/api/state')).data.user, null, 'sessione chiusa');
  assert.ok(!(await hacker.get('/api/users')).data.some((u) => u.name === 'Sofia Ghegai'));
  const dir = fs.readdirSync(path.join(portal.root, 'data', 'personale')).find((n) => n.startsWith(`eliminato-${people.sofia.id}`));
  assert.ok(dir, 'cartella personale conservata');
  assert.equal(fs.readFileSync(path.join(portal.root, 'data', 'personale', dir, 'appunti.txt'), 'utf8'), 'appunti');
  // il nome utente torna libero
  const again = await hacker.post('/api/users', { firstName: 'Sofia', lastName: 'Ghegai', gradeId: gradeId('Stage'), password: 'iniziale-123' });
  assert.equal(again.data.username, 'sofia.ghegai');
});
