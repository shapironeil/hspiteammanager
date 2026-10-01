'use strict';
// Prova dell'app installabile (PWA): manifest, icone, service worker, pagina senza rete, dati mai in cache.
const path = require('node:path');
const { startPortal, setupHacker } = require('../helpers');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const ok = (cond, msg) => { if (!cond) throw new Error('FALLITO: ' + msg); console.log('  ok -', msg); };

(async () => {
  const portal = await startPortal();
  let browser;
  try {
    await setupHacker(portal.base);
    const m = await (await fetch(portal.base + '/manifest.webmanifest')).json();
    ok(m.display === 'standalone' && m.icons.some((i) => i.sizes === '512x512'), 'manifest valido');
    for (const i of m.icons) ok((await fetch(portal.base + i.src)).headers.get('content-type') === 'image/png', `icona ${i.src}`);
    browser = await playwright.chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(portal.base + '/');
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated', null, { timeout: 15000 });
    ok(true, 'service worker attivo');
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    // le risposte dei dati non finiscono nella cache
    await page.evaluate(() => fetch('/api/state'));
    const cached = await page.evaluate(async () => (await caches.keys()).length && (await (await caches.open((await caches.keys())[0])).keys()).map((r) => new URL(r.url).pathname));
    ok(cached.includes('/js/app.js') && !cached.some((p) => p.startsWith('/api/')), 'in cache solo l\'interfaccia, mai i dati');
    // PC del portale spento: l'interfaccia mostra la pagina di cortesia
    portal.proc.kill();
    await new Promise((r) => setTimeout(r, 500));
    await page.goto(portal.base + '/verbali/').catch(() => {});
    const html = await page.content();
    ok(/non è raggiungibile/.test(html), 'pagina chiara quando la rete manca: ' + html.slice(0, 300));
    console.log('\nTutto ok.');
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    portal.stop();
  }
})();
