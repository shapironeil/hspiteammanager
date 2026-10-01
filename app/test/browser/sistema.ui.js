'use strict';
// Prova nel browser del pannello Sistema → Backup.
const path = require('node:path');
const fs = require('node:fs');
const { startPortal, setupHacker } = require('../helpers');
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
    await setupHacker(portal.base);
    browser = await playwright.chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(portal.base + '/');
    await page.fill('input[name=username]', 'anna.hacker');
    await page.fill('input[name=password]', 'password-sicura-1');
    await page.click('button[type=submit]');
    await page.waitForSelector('.shell');
    await page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
    await page.goto(portal.base + '/#/sistema');
    await page.waitForSelector('button:has-text("Esegui adesso")');
    await page.click('button:has-text("Esegui adesso")');
    await page.waitForSelector('summary:has-text("1 backup disponibili")', { timeout: 20000 });
    ok(fs.readdirSync(path.join(portal.root, 'Backup')).length === 1, 'backup creato dal pannello');
    await page.locator('section:has(h2:has-text("Backup"))').screenshot({ path: path.join(OUT, 'sistema-backup.png') });
    ok(errors.length === 0, 'nessun errore JavaScript ' + errors.join(' | '));
    console.log('\nTutto ok.');
  } catch (err) { console.error(err.message); process.exitCode = 1; } finally { if (browser) await browser.close(); portal.stop(); }
})();
