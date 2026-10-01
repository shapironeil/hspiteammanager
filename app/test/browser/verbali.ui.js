'use strict';
// Prova nel browser di Verbale Studio dentro il portale (desktop e telefono). Avvio: node test/browser/verbali.ui.js
const path = require('node:path');
const fs = require('node:fs');
const { startPortal, setupHacker, addUser } = require('../helpers');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright')); }

const OUT = process.env.SHOTS || path.join(__dirname, 'screenshots');
const ok = (cond, msg) => { if (!cond) throw new Error('FALLITO: ' + msg); console.log('  ok -', msg); };
const VTT = 'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n<v Anna Rossi>Abbiamo completato l\'ingestion dei dati nel livello silver.</v>\n\n00:00:05.000 --> 00:00:09.000\n<v Marco Bianchi>Il prossimo passo è ottenere gli accessi alle fonti dati entro venerdì.</v>\n';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const portal = await startPortal();
  const errors = [];
  let browser;
  try {
    const hacker = await setupHacker(portal.base);
    await addUser(portal.base, hacker, 'Mario', 'dipendente');
    const p = await hacker.post('/api/projects', { name: 'ATAC', members: [2] });
    browser = await playwright.chromium.launch();
    for (const [label, viewport, mobile] of [['desktop', { width: 1366, height: 860 }, false], ['telefono', { width: 390, height: 844 }, true]]) {
      console.log(label);
      const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' && !/401|404|ERR_CONNECTION_REFUSED/.test(m.text())) errors.push(`${label} console: ${m.text()}`); });
      // senza accesso si torna al portale
      await page.goto(portal.base + '/verbali/');
      await page.waitForURL(portal.base + '/', { timeout: 8000 });
      ok(true, 'senza accesso rimanda al portale');
      await page.fill('input[name=username]', 'mario.prova');
      await page.fill('input[name=password]', 'definitiva-456');
      await page.click('button[type=submit]');
      await page.waitForSelector('.shell');
      ok(await page.locator('a.nav-item[href="/verbali/"]').count() === 1, 'voce Verbale Studio nel menu');
      await page.goto(portal.base + '/verbali/');
      await page.waitForFunction(() => document.querySelector('#projectSelect option'));
      ok((await page.locator('#projectSelect option').allTextContents()).join() === 'ATAC', 'vede il progetto ATAC del portale');
      if (mobile) await page.click('#sbOpen').catch(() => {});
      await page.click('#newCheckpointBtn');
      await page.fill('#dlgBody [name=title]', `Checkpoint ${label}`);
      if (mobile) await page.screenshot({ path: path.join(OUT, 'dlg-' + label + '.png') });
      await page.click('#dlgOk', { timeout: 5000 });
      await page.waitForFunction((t) => document.querySelector('#cpTitle')?.value === t, `Checkpoint ${label}`);
      ok(true, 'checkpoint creato');
      await page.setInputFiles('#transcriptFile', { name: 'riunione.vtt', mimeType: 'text/vtt', buffer: Buffer.from(VTT) });
      await page.waitForSelector('.cue-text');
      ok(await page.locator('.cue-text').count() === 2, 'transcript importato');
      await page.waitForFunction(() => /Salvato/.test(document.querySelector('#saveState')?.textContent || ''), null, { timeout: 10000 });
      const dirs = fs.readdirSync(path.join(portal.root, 'progetti', 'ATAC', 'Verbali')).filter((n) => n.includes(label));
      ok(dirs.length === 1, 'cartella del checkpoint nel progetto');
      const folder = path.join(portal.root, 'progetti', 'ATAC', 'Verbali', dirs[0]);
      ok(fs.existsSync(path.join(folder, 'Transcript originale.vtt')), 'transcript originale copiato');
      ok(/ingestion/.test(fs.readFileSync(path.join(folder, 'Transcript revisionato.txt'), 'utf8')), 'transcript revisionato scritto');
      if (mobile) { await page.evaluate(() => document.querySelector('#sbClose').click()); await page.waitForTimeout(400); }
      await page.screenshot({ path: path.join(OUT, `verbali-revisione-${label}.png`) });
      // storico e dashboard
      await page.evaluate(() => document.querySelector('.nav-item[data-view="history"]').click());
      await page.waitForSelector('#view-history:not([hidden])');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, `verbali-storico-${label}.png`) });
      // cartella di lavoro
      await page.evaluate(() => document.querySelector('.nav-item[data-view="folder"]').click());
      await page.waitForSelector('#folderBody *');
      ok(true, 'cartella di lavoro');
      // impostazioni: niente chiave API, niente cartella di copia
      await page.evaluate(() => document.querySelector('.nav-item[data-view="settings"]').click());
      await page.waitForSelector('#view-settings:not([hidden])');
      ok(!(await page.locator('#sKey').isVisible()) && !(await page.locator('#sMirror').isVisible()) && !(await page.locator('#importOldBtn').isVisible()), 'impostazioni adattate al portale (niente import per chi non e\' Hacker)');
      await page.screenshot({ path: path.join(OUT, `verbali-impostazioni-${label}.png`) });
      if (mobile) {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(overflow <= 1, 'nessuno scorrimento orizzontale su telefono (' + overflow + ')');
      }
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
