'use strict';
// Prova nel browser dell'Esplora file (desktop e telefono). Richiede Playwright, che NON e' una dipendenza
// del portale: si usa solo sul PC di sviluppo.  Avvio:  node test/browser/explorer.ui.js
const path = require('node:path');
const fs = require('node:fs');
const { startPortal, setupHacker, addUser } = require('../helpers');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright')); }

const OUT = process.env.SHOTS || path.join(__dirname, 'screenshots');
const ok = (cond, msg) => { if (!cond) throw new Error('FALLITO: ' + msg); console.log('  ok -', msg); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const portal = await startPortal();
  const errors = [];
  let browser;
  try {
    const hacker = await setupHacker(portal.base);
    await addUser(portal.base, hacker, 'Mario', 'manager');
    const p = await hacker.post('/api/projects', { name: 'ATAC Prova' });
    await hacker.post(`/api/explorer/p${p.data.id}/folder`, { path: '', name: 'Verbali' });
    await hacker.put(`/api/explorer/p${p.data.id}/file?path=Verbali&name=appunti.txt`, 'Prima riga\nSeconda riga');

    browser = await playwright.chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });
    for (const [label, viewport, mobile] of [['desktop', { width: 1280, height: 860 }, false], ['telefono', { width: 390, height: 844 }, true]]) {
      console.log(label);
      const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label} console: ${m.text()}`); });
      await page.goto(portal.base + '/');
      await page.fill('input[name=username]', 'anna.hacker');
      await page.fill('input[name=password]', 'password-sicura-1');
      await page.click('button[type=submit]');
      await page.waitForSelector('.shell');
      await page.evaluate(() => { try { localStorage.setItem('hspi.guida', '"vista"'); } catch {} document.querySelectorAll('.modal-back').forEach((m) => m.remove()); });
      await page.goto(portal.base + '/#/esplora');
      await page.waitForSelector('.ex-panel .crumbs');
      ok(await page.locator('.page-head h1').textContent() === 'Esplora file', 'schermata Esplora file');

      // nuova cartella nello spazio personale
      await page.click('.ex-panel button:has-text("Nuova cartella")');
      await page.fill('.modal input[name=name]', `Documenti ${label}`);
      await page.click('.modal button[type=submit]');
      await page.waitForSelector(`.ex-panel .file-row button.link:has-text("Documenti ${label}")`);
      ok(fs.existsSync(path.join(portal.root, 'data', 'personale', '1', `Documenti ${label}`)), 'cartella creata su disco');

      // carica un file nella cartella
      await page.click(`.ex-panel .file-row button.link:has-text("Documenti ${label}")`);
      await page.waitForSelector('.ex-panel .empty');
      await page.setInputFiles('.ex-panel input[type=file]', { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('ciao') });
      await page.waitForSelector('.ex-panel .file-row button.link:has-text("nota.txt")');
      ok(page.url().includes('percorso='), 'il percorso aperto resta nell\'indirizzo');

      // modifica del testo dal portale
      await page.click('.ex-panel .file-row button.link:has-text("nota.txt")');
      await page.click('.modal button:has-text("Modifica")');
      await page.fill('.modal textarea', 'ciao modificato');
      await page.click('.modal button:has-text("Salva")');
      await page.waitForSelector('.ex-panel .meta:has-text("1 versione precedente")');
      ok(fs.readFileSync(path.join(portal.root, 'data', 'personale', '1', `Documenti ${label}`, 'nota.txt'), 'utf8') === 'ciao modificato', 'testo salvato, versione precedente conservata');

      // elimina -> cestino -> ripristina
      await page.click('.ex-panel .file-row button[aria-label="Azioni per nota.txt"]');
      await page.click('.modal button:has-text("Elimina")');
      await page.click('.modal button:has-text("Sposta nel cestino")');
      await page.waitForSelector('.ex-panel .empty');
      await page.click('.ex-panel button[aria-label="Cestino"]');
      await page.click('.modal button:has-text("Ripristina")');
      await page.waitForSelector('.toast:has-text("Rimesso")');
      await page.keyboard.press('Escape');
      await page.waitForSelector('.ex-panel .file-row button.link:has-text("nota.txt")');
      ok(true, 'cestino e ripristino');
      await page.screenshot({ path: path.join(OUT, `esplora-${label}.png`), fullPage: true });

      // spazio del progetto
      if (mobile) await page.selectOption('.ex-space-select', `p${p.data.id}`);
      else await page.click(`.ex-spaces button[data-space="p${p.data.id}"]`);
      await page.click('.ex-panel .file-row button.link:has-text("Verbali")');
      await page.waitForSelector('.ex-panel .file-row button.link:has-text("appunti.txt")');
      ok(true, 'cartella del progetto');

      // ricerca
      await page.fill('.ex-search', 'appunti');
      await page.waitForSelector('.card h2:has-text("Risultati")');
      ok(await page.locator('.card:has(h2:has-text("Risultati")) .file-row').count() === 1, 'ricerca trova il file');

      // pagina del progetto usa lo stesso pannello
      await page.goto(portal.base + '/#/progetti');
      await page.click('.project:has-text("ATAC Prova")');
      await page.waitForSelector('.ex-panel .file-row button.link:has-text("Verbali")');
      ok(true, 'scheda progetto con esplora file');
      if (mobile) {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(overflow <= 1, 'nessuno scorrimento orizzontale su telefono');
      }
      await page.screenshot({ path: path.join(OUT, `progetto-${label}.png`), fullPage: true });
      await ctx.close();
    }
    ok(errors.length === 0, 'nessun errore JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
    console.log('\nTutto ok. Schermate in ' + OUT);
  } catch (err) {
    console.error(err.message);
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    portal.stop();
  }
})();
