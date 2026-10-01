'use strict';
// Prova nel browser: sito pubblico (desktop e telefono) e Verbale Studio con il motore locale di HSPI Client.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { startPortal, setupHacker } = require('../helpers');
const { readZip } = require('../../src/trama/zip');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const OUT = process.env.SHOTS || path.join(__dirname, 'screenshots');
const ok = (cond, msg) => { if (!cond) throw new Error('FALLITO: ' + msg); console.log('  ok -', msg); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const portal = await startPortal();
  const errors = [];
  let browser; let engine; let fake;
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-cui-'));
  try {
    const hacker = await setupHacker(portal.base);
    await hacker.post('/api/projects', { name: 'ATAC' });
    browser = await playwright.chromium.launch();
    // sito pubblico
    for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['telefono', { width: 390, height: 844 }]]) {
      const page = await (await browser.newContext({ viewport })).newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      for (const p of ['benvenuto', 'guida', 'scarica']) {
        await page.goto(`${portal.base}/${p}`);
        await page.waitForSelector('footer #versione:not(:empty)');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(overflow <= 1, `${p} (${label}) senza scorrimento orizzontale`);
        await page.screenshot({ path: path.join(OUT, `sito-${p}-${label}.png`), fullPage: p === 'benvenuto' });
      }
    }
    // client installato + Ollama finto
    fake = http.createServer((req, res) => {
      if (req.url === '/api/version') return res.end('{"version":"prova"}');
      if (req.url === '/api/tags') return res.end('{"models":[{"name":"qwen2.5:3b","size":1}]}');
      res.writeHead(404); res.end();
    });
    await new Promise((r) => fake.listen(0, '127.0.0.1', r));
    const zip = readZip(Buffer.from(await (await fetch(`${portal.base}/scarica/HSPI-Client.zip`)).arrayBuffer()));
    for (const [name, read] of zip) { const d = path.join(base, ...name.split('/')); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, read()); }
    // Verbale Studio senza client: AI non disponibile, con link a Scarica
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(portal.base + '/');
    await page.fill('input[name=username]', 'anna.hacker');
    await page.fill('input[name=password]', 'password-sicura-1');
    await page.click('button[type=submit]');
    await page.waitForSelector('.shell');
    await page.goto(portal.base + '/verbali/');
    await page.waitForFunction(() => document.querySelector('#projectSelect'));
    await page.evaluate(() => document.querySelector('.nav-item[data-view="localai"]').click());
    await page.waitForSelector('#localAiBody .note-box', { timeout: 8000 }).catch(async (e) => { await page.screenshot({ path: path.join(OUT, 'ai-errore.png') }); throw e; });
    ok(/HSPI Client/.test(await page.locator('#localAiBody').textContent()), 'senza client: spiega di installare HSPI Client');
    // con il client acceso
    engine = spawn(process.execPath, [path.join(base, 'app', 'hspi-client.js'), '--senza-browser'], { env: { ...process.env, OLLAMA_HOST: `http://127.0.0.1:${fake.address().port}` }, stdio: 'ignore' });
    for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 150)); try { if ((await fetch('http://127.0.0.1:4320/stato')).ok) break; } catch { /* non ancora */ } }
    await page.reload();
    await page.waitForFunction(() => document.body.classList.contains('engine-on'), null, { timeout: 8000 });
    await page.evaluate(() => document.querySelector('.nav-item[data-view="localai"]').click());
    await page.waitForSelector('#localAiBody .note-box:has-text("sul tuo PC")');
    ok(await page.locator('#localAiBody:has-text("In esecuzione")').count() === 1, 'con il client: Ollama del PC in esecuzione, gestito dal portale');
    await page.screenshot({ path: path.join(OUT, 'verbali-ai-client.png') });
    ok(errors.length === 0, 'nessun errore JavaScript ' + errors.join(' | '));
    console.log('\nTutto ok.');
  } catch (err) { console.error(err.message); console.error(errors.join('\n')); process.exitCode = 1; } finally {
    if (engine) engine.kill();
    if (fake) fake.close();
    if (browser) await browser.close();
    portal.stop();
    fs.rmSync(base, { recursive: true, force: true });
  }
})();
