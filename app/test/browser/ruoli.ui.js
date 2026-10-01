'use strict';
// Prova nel browser: Account con gradi, Ruoli (Hacker), ospiti a tempo nel progetto, Il mio team.
const path = require('node:path');
const fs = require('node:fs');
const { startPortal, setupHacker, client } = require('../helpers');
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
    browser = await playwright.chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const loginAs = async (p, user, pass) => {
      await p.goto(portal.base + '/');
      await p.fill('input[name=username]', user);
      await p.fill('input[name=password]', pass);
      await p.click('button[type=submit]');
    };
    await loginAs(page, 'anna.hacker', 'password-sicura-1');
    await page.waitForSelector('.shell');
    await page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
    // team in blocco
    await page.goto(portal.base + '/#/team');
    await page.click('button:has-text("Aggiungi il team")');
    await page.fill('.modal textarea[name=text]', 'Francesco Sanso; Senior manager\nMarco Cariello; Manager\nGiovanna Lisi; Dipendente\nAlessandro Franco; Stage');
    await page.click('.modal button:has-text("Crea gli account")');
    await page.waitForSelector('.modal h2:has-text("Account creati")');
    const creds = await page.locator('.modal pre').textContent();
    ok(/francesco\.sanso\tHspi-/.test(creds), 'account creati con password provvisorie');
    await page.keyboard.press('Escape');
    await page.waitForSelector('td:has-text("Marco Cariello")');
    ok(await page.locator('.chip.hacker:has-text("H")').count() === 1, 'l\'Hacker vede la sua H');
    await page.screenshot({ path: path.join(OUT, 'account-gradi.png') });
    // ruoli
    await page.goto(portal.base + '/#/ruoli');
    await page.waitForSelector('h1:has-text("Ruoli")');
    await page.click('button[aria-label="Modifica Stage"]');
    await page.fill('.modal input[name=name]', 'Stagista');
    await page.click('.modal button:has-text("Salva")');
    await page.waitForSelector('.chip.grade:has-text("Stagista")');
    ok(true, 'grado rinominato');
    await page.screenshot({ path: path.join(OUT, 'ruoli.png') });
    await page.goto(portal.base + '/#/percorso');
    await page.waitForSelector('.league .emblem');
    ok(await page.locator('.league').count() === 5, 'percorso con 5 leghe');
    await page.locator('.league-input').first().fill('Lega Esordienti');
    await page.locator('.league-input').first().press('Tab');
    await page.waitForSelector('.toast:has-text("Percorso salvato")');
    await page.screenshot({ path: path.join(OUT, 'percorso.png') });
    // progetto con ospite
    const p = (await hacker.post('/api/projects', { name: 'ATAC' })).data.id;
    await page.goto(portal.base + '/#/progetti');
    await page.click('.project:has-text("ATAC")');
    await page.click('button:has-text("Aggiungi ospite")');
    await page.fill('.modal input[type=search]', 'giov');
    await page.click('.modal label:has-text("Giovanna Lisi") input');
    await page.selectOption('.modal select[name=days]', '14');
    await page.fill('.modal input[name=note]', 'revisione');
    await page.click('.modal button:has-text("Aggiungi")');
    await page.waitForSelector('section:has(h2:has-text("Ospiti a tempo")) .title:has-text("Giovanna Lisi")', { timeout: 5000 }).catch(async (e) => { await page.screenshot({ path: path.join(OUT, 'ospiti-errore.png') }); throw e; });
    ok(true, 'ospite aggiunto per 14 giorni');
    await page.locator('section:has(h2:has-text("Ospiti a tempo"))').screenshot({ path: path.join(OUT, 'ospiti.png') });
    // il senior manager vede Il mio team, l'Hacker non c'e'
    const pwd = creds.split('\n').find((l) => l.startsWith('Francesco')).split('\t')[2];
    const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => errors.push(e.message));
    await loginAs(p2, 'francesco.sanso', pwd);
    await p2.fill('input[name=current]', pwd);
    await p2.fill('input[name=next]', 'definitiva-456');
    await p2.fill('input[name=repeat]', 'definitiva-456');
    await p2.click('button[type=submit]');
    await p2.waitForSelector('.shell');
    await p2.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
    ok(await p2.locator('a.nav-item[href="#/mio-team"]').count() === 1, 'voce "Il mio team"');
    ok(await p2.locator('a.nav-item[href="#/ruoli"]').count() === 0 && await p2.locator('a.nav-item[href="#/percorso"]').count() === 0, 'niente Ruoli e Percorso per chi non e\' Hacker');
    ok((await c2.request.get(portal.base + '/api/percorso')).status() === 403, 'percorso negato agli altri');
    await p2.goto(portal.base + '/#/mio-team');
    await p2.waitForSelector('td:has-text("Giovanna Lisi")');
    ok(!(await p2.locator('tbody').textContent()).includes('Anna Hacker'), 'l\'Hacker non compare tra le persone del team');
    ok(await p2.locator('td:has-text("ATAC · ancora")').count() === 1, 'si vede l\'accesso temporaneo');
    await p2.screenshot({ path: path.join(OUT, 'mio-team.png') });
    ok(errors.length === 0, 'nessun errore JavaScript ' + errors.join(' | '));
    console.log('\nTutto ok.');
  } catch (err) { console.error(err.message); console.error(errors.join('\n')); process.exitCode = 1; } finally { if (browser) await browser.close(); portal.stop(); }
})();
