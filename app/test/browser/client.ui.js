'use strict';
// Prova nel browser: sito pubblico (desktop e telefono) con il logo del portale, pagina App e programmi,
// Verbale Studio con il motore locale di HSPI Client, GestioneCelle nella sua finestra.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { startPortal, setupHacker } = require('../helpers');
const { readZip } = require('../../src/celle/zip');
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
    // logo personalizzato del portale: le pagine informative devono usare lo stesso
    fs.mkdirSync(path.join(portal.root, 'logo'), { recursive: true });
    fs.writeFileSync(path.join(portal.root, 'logo', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40" rx="8" fill="#1d4ed8"/></svg>');
    await hacker.patch('/api/settings', { portalName: 'Portale Prova', quotaGb: 100, maxFileMb: 2048 });
    browser = await playwright.chromium.launch();
    // sito pubblico
    for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['telefono', { width: 390, height: 844 }]]) {
      const page = await (await browser.newContext({ viewport })).newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      for (const p of ['benvenuto', 'guida', 'scarica']) {
        await page.goto(`${portal.base}/${p}`);
        await page.waitForSelector('footer #versione:not(:empty)');
        await page.waitForSelector('header.top img[data-logo].ready');
        ok(/\/media\/logo\/logo\.svg$/.test(await page.getAttribute('header.top img[data-logo]', 'src')), `${p} (${label}): stesso logo del portale`);
        ok((await page.textContent('header.top [data-portal-name]')) === 'Portale Prova', `${p} (${label}): stesso nome del portale`);
        if (p === 'scarica') {
          await page.waitForSelector('#apps .card.app');
          ok(await page.locator('#apps .card.app').count() === 2, 'scarica: le due app del catalogo con versione e novità');
        }
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
    await page.evaluate(() => document.querySelector('.nav-item[data-view="localai"]').click());
    // client aperto ma Verbale Studio non ancora sul PC: si scarica da qui, senza setup
    await page.waitForSelector('#olGetApp');
    await page.click('#olGetApp');
    await page.waitForFunction(() => document.body.classList.contains('engine-on'), null, { timeout: 8000 });
    await page.waitForSelector('#localAiBody .note-box:has-text("sul tuo PC")');
    ok(await page.locator('#localAiBody:has-text("In esecuzione")').count() === 1, 'con il client: Ollama del PC in esecuzione, gestito dal portale');
    await page.screenshot({ path: path.join(OUT, 'verbali-ai-client.png') });
    // pagina App e programmi: Verbale Studio gia' sul PC, GestioneCelle da scaricare
    await page.goto(portal.base + '/#/programmi');
    await page.waitForSelector('.app-card[data-app="verbale-studio"] .chip.ok');
    await page.evaluate(() => { try { localStorage.setItem('hspi.guida', '"vista"'); } catch {} document.querySelectorAll('.modal-back').forEach((m) => m.remove()); });
    ok(await page.locator('.app-card[data-app="verbale-studio"] button:has-text("Apri sul PC")').count() === 1, 'app già sul PC: si apre');
    await page.click('.app-card[data-app="gestione-celle"] button:has-text("Scarica sul PC")');
    await page.waitForSelector('.app-card[data-app="gestione-celle"] .chip.ok');
    ok(fs.existsSync(path.join(base, 'apps', 'gestione-celle', 'app.json')), 'GestioneCelle scaricata nella cartella del client');
    await page.screenshot({ path: path.join(OUT, 'app-catalogo.png'), fullPage: true });
    // GestioneCelle nella sua finestra
    await page.goto(portal.base + '/celle/');
    await page.waitForSelector('.app-brand:has-text("GestioneCelle")');
    await page.waitForSelector('button:has-text("Nuova mappa")');
    ok(true, 'GestioneCelle si apre come app a sé (/celle/)');
    await page.screenshot({ path: path.join(OUT, 'celle-finestra.png') });
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
