'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startPortal } = require('./helpers');

let portal;
before(async () => { portal = await startPortal(); });
after(() => portal && portal.stop());

const http = require('node:http');
// http.request (non fetch): fetch non permette di cambiare l'intestazione Host
const register = (headers) => new Promise((resolve, reject) => {
  const body = JSON.stringify({ firstName: 'Anna', lastName: 'Hacker', password: 'password-sicura-1' });
  const req = http.request({ host: '127.0.0.1', port: portal.port, path: '/api/register', method: 'POST',
    headers: { 'x-hspi': '1', 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), ...headers } }, (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); });
  req.on('error', reject);
  req.end(body);
});

test('dietro "tailscale serve" (proxy su 127.0.0.1) le richieste non contano come "dal PC del portale"', async () => {
  assert.equal((await register({ 'x-forwarded-for': '100.64.0.7' })).status, 403);
  assert.equal((await register({ 'tailscale-user-login': 'collega@gmail.com' })).status, 403);
  assert.equal((await register({ host: 'pc-ufficio.tail1234.ts.net' })).status, 403);
  const state = await (await fetch(`${portal.base}/api/state`, { headers: { 'x-forwarded-for': '100.64.0.7' } })).json();
  assert.equal(state.canSetup, false);
  // dal PC stesso invece si'
  assert.equal((await register({})).status, 201);
});

test('GitHub: versione su main e pull request con l\'esito delle prove (GitHub finto)', async () => {
  const http2 = require('node:http');
  const { startPortal: start, setupHacker } = require('./helpers');
  const fake = http2.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url.endsWith('/main/version.json')) return res.end('{"version":"9.9.9"}');
    if (req.url.includes('/pulls')) return res.end(JSON.stringify([{ number: 7, title: 'Prova', html_url: 'https://github.com/x/y/pull/7', head: { ref: 'claude/prova', sha: 'abc' }, user: { login: 'claude' }, draft: false, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T11:00:00Z' }]));
    if (req.url.includes('/check-runs')) return res.end(JSON.stringify({ check_runs: [{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'failure' }] }));
    res.statusCode = 404; res.end('{}');
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${fake.address().port}`;
  process.env.HSPI_GITHUB_API = url;
  process.env.HSPI_GITHUB_RAW = url;
  const p = await start();
  delete process.env.HSPI_GITHUB_API;
  delete process.env.HSPI_GITHUB_RAW;
  try {
    const h = await setupHacker(p.base);
    const g = (await h.get('/api/github')).data;
    assert.equal(g.mainVersion, '9.9.9');
    assert.equal(g.prs[0].number, 7);
    assert.equal(g.prs[0].checks.state, 'fallite');
    assert.equal((await h.patch('/api/github', { repo: 'non valido' })).status, 400);
  } finally { p.stop(); fake.close(); }
});
