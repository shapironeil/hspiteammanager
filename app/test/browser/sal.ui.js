'use strict';
// Prova nel browser del fascicolo SAL: il pannello Funzioni di Cippi (agenda con divisori da un documento importato)
// e il verbale SAL in Word creato da Verbale Studio con il modello di prova (file nella cartella del checkpoint).
const path = require('node:path');
const fs = require('node:fs');
const { startPortal, setupHacker } = require('../helpers');
const { pptx } = require('../pptx-prova');
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
    const pid = (await hacker.post('/api/projects', { name: 'Regione' })).data.id;
    const docId = (await hacker.put(`/api/cippi/import?projectId=${pid}&name=Base.pptx`, pptx())).data.id;
    const cp = (await hacker.post(`/api/vs/projects/${pid}/checkpoints`, { title: 'SAL 2', date: '2026-07-10', templateId: 'sal' })).data;
    browser = await playwright.chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(portal.base + '/');
    await page.fill('input[name=username]', 'anna.hacker');
    await page.fill('input[name=password]', 'password-sicura-1');
    await page.click('button[type=submit]');
    await page.waitForSelector('.shell');

    // Cippi: pannello Funzioni dall'indirizzo, agenda con divisori
    await page.goto(`${portal.base}/cippi/#/doc/${docId}?funzioni=1`);
    await page.waitForSelector('.cf-win .cf-tabs button');
    ok(/Funzioni · Base/.test(await page.textContent('.cf-head h2')), 'pannello Funzioni aperto sul documento');
    await page.click('.cf-tabs button[data-tab="agenda"]');
    await page.fill('.cf-body [name=items]', 'Obiettivi\nProcessi\nConclusioni');
    await page.fill('.cf-body [name=current]', '2');
    await page.fill('.cf-body [name=at]', '2');
    await page.selectOption('.cf-body [name=dividers]', '1');
    await page.screenshot({ path: path.join(OUT, 'cippi-funzioni.png') });
    const before = (await hacker.get(`/api/cippi/docs/${docId}`)).data;
    await page.click('.cf-win [data-run]');
    await page.waitForFunction((n) => !document.querySelector('.cf-back') && document.querySelectorAll('.cp-struct-item').length >= n, before.list.length + 4, { timeout: 20000 }).catch(() => {});
    const after = (await hacker.get(`/api/cippi/docs/${docId}`)).data;
    ok(after.version === before.version + 1 && after.list.length === before.list.length + 4, 'agenda e tre divisori: nuova versione con 4 slide in piu\'');
    ok(after.analysis.slides[1].kind === 'indice' && after.analysis.slides[1].entries.length === 3, 'la slide 2 e\' l\'agenda con le tre voci');

    // Verbale Studio: verbale SAL in Word con il modello di prova
    await page.goto(portal.base + '/verbali/');
    await page.waitForFunction(() => document.querySelector('#projectSelect option'));
    await page.waitForFunction((t) => document.querySelector('#cpTitle')?.value === t, 'SAL 2', { timeout: 10000 });
    await page.click('#moreBtn');
    await page.click('#moreMenu [data-act="export-sal-docx"]');
    await page.waitForSelector('#dialog[open] [name=dati]');
    ok(/"servizi"/.test(await page.inputValue('#dialog [name=dati]')), 'dialogo con i dati del SAL precompilati');
    await page.fill('#dialog [name=numero]', '2');
    await page.fill('#dialog [name=luogo]', 'Palermo');
    await page.fill('#dialog [name=da]', '2026-04-01');
    await page.fill('#dialog [name=a]', '2026-06-30');
    await page.screenshot({ path: path.join(OUT, 'verbali-sal-word.png') });
    await page.click('#dlgOk');
    await page.waitForFunction(() => /Verbale creato/.test(document.body.textContent), null, { timeout: 20000 });
    const files = (await hacker.get(`/api/explorer/p${pid}/list?path=${encodeURIComponent(cp.folder)}`)).data;
    ok(/Verbale SAL 2 2026-07-10\.docx/.test(JSON.stringify(files)), 'il verbale .docx e\' nella cartella del checkpoint');
    await page.screenshot({ path: path.join(OUT, 'verbali-sal-fatto.png') });

    ok(errors.length === 0, 'nessun errore JavaScript: ' + errors.join(' | '));
    console.log('Prova nel browser del fascicolo SAL: tutto ok. Screenshot in', OUT);
  } catch (err) {
    console.error(err.message);
    console.error(portal.output().split('\n').slice(-20).join('\n'));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    portal.stop();
  }
})();
