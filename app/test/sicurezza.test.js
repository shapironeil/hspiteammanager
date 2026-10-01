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
