'use strict';
// Prova nel browser di GestioneCelle: nuova mappa, import Excel, albero, scheda, aggiunta, scadenza, eliminazione, tabella, export.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { startPortal, setupHacker, addUser } = require('../helpers');
const { buildBpbWorkbook } = require('../../src/celle/xlsx-write');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const OUT = process.env.SHOTS || path.join(__dirname, 'screenshots');
const ok = (cond, msg) => { if (!cond) throw new Error('FALLITO: ' + msg); console.log('  ok -', msg); };

const XLSX = buildBpbWorkbook({ name: 'prova', macros: [
  { code: 1, name: 'Sanità', processes: [
    { name: 'Pianificazione regionale', micros: [{ name: 'Flusso fabbisogni', ambito: 'In scope', responsabile: 'Mario Prova' }, { name: 'Flusso qualità', ambito: 'Out of scope' }, { name: 'Flusso qualità' }] },
    { name: 'Controllo', micros: [{ name: 'Verifica trimestrale', stato: 'in corso' }] }] },
  { code: 2, name: 'Decreti', processes: [{ name: 'Predisposizione decreto', micros: [{ name: 'Impegno' }, { name: 'Liquidazione' }] }] },
] });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(os.tmpdir(), 'bpb-prova.xlsx');
  fs.writeFileSync(file, XLSX);
  const portal = await startPortal();
  const errors = [];
  let browser;
  try {
    const hacker = await setupHacker(portal.base);
    const mario = await addUser(portal.base, hacker, 'Mario', 'manager');
    const luca = await addUser(portal.base, hacker, 'Luca', 'dipendente');
    await hacker.post('/api/projects', { name: 'Regione', members: [mario.id, luca.id] });
    browser = await playwright.chromium.launch();
    for (const [label, viewport, mobile] of [['desktop', { width: 1366, height: 900 }, false], ['telefono', { width: 390, height: 844 }, true]]) {
      console.log(label);
      const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' && !/409|404/.test(m.text())) errors.push(`${label} console: ${m.text()}`); });
      await page.goto(portal.base + '/');
      await page.fill('input[name=username]', 'luca.prova');
      await page.fill('input[name=password]', 'definitiva-456');
      await page.click('button[type=submit]');
      await page.waitForSelector('.shell');
      await page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));
      await page.goto(portal.base + '/#/celle');
      await page.click('button:has-text("Nuova mappa")');
      await page.fill('.modal input[name=name]', `BPB ${label}`);
      await page.click('.modal button:has-text("Crea")');
      await page.waitForSelector(`h1:has-text("BPB ${label}")`);
      ok(true, 'mappa creata');
      // import
      const chooser = page.waitForEvent('filechooser');
      await page.click('button:has-text("Importa Excel")');
      await (await chooser).setFiles(file);
      await page.waitForSelector('.modal:has-text("formato BPB")');
      await page.click('.modal button:has-text("Importa")');
      await page.waitForSelector('.tr-row .tr-code:text-is("1")');
      ok(await page.locator('.tabs .tab:has-text("Controlli (2)")').count() === 1, 'importato, 2 problemi trovati (duplicato)');
      // apri tutto, seleziona un micro e metti la scadenza
      await page.click('button:has-text("Apri tutto")');
      await page.click('.tr-label:has-text("Flusso fabbisogni")');
      await page.waitForSelector('.tr-bigcode:text-is("1.1.1")');
      await page.fill('input[type=date]', '2026-10-03');
      await page.locator('input[type=date]').dispatchEvent('change');
      await page.waitForSelector('.tr-row.active .chip:has-text("03/10/2026")');
      ok(true, 'scadenza impostata');
      // nota del team
      await page.fill('textarea[name=text]', 'Da verificare con Mario');
      await page.click('button:has-text("Aggiungi nota")');
      await page.waitForSelector('text=Da verificare con Mario');
      ok(true, 'nota aggiunta');
      // aggiungi micro dopo questo: i codici scalano
      await page.click('button:has-text("Aggiungi micro processo dopo questa")');
      await page.fill('.modal textarea[name=name]', 'Flusso nuovo');
      await page.click('.modal button:has-text("Aggiungi")');
      await page.waitForSelector('.tr-bigcode:text-is("1.1.2")');
      ok(await page.locator('.tr-row:has-text("Flusso qualità") .tr-code').first().textContent() === '1.1.3', 'codici ricalcolati');
      if (!mobile) await page.screenshot({ path: path.join(OUT, `celle-albero-${label}.png`) });
      // elimina il processo 1.1: contiene una voce di Mario -> richiesta
      await page.click('.tr-label:has-text("Pianificazione regionale")');
      await page.click('.tr-detail button[aria-label="Elimina"]');
      await page.waitForSelector('.modal:has-text("Richiedi l\'eliminazione")');
      ok(await page.locator('.modal li:has-text("Mario Prova")').count() === 1, 'mostra le voci di altri responsabili');
      await page.click('.modal button:has-text("Invia richiesta")');
      await page.waitForSelector('.tabs .tab:has-text("Richieste (1)")');
      ok(true, 'richiesta di eliminazione inviata');
      // tabella con filtro
      await page.click('.tabs .tab:has-text("Tabella")');
      await page.fill('.tr-filters input[type=search]', 'liquid');
      await page.waitForSelector('.tr-table tbody tr >> nth=0');
      ok(await page.locator('.tr-table tbody tr').count() === 1, 'filtro della tabella');
      if (mobile) {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(overflow <= 1, 'nessuno scorrimento orizzontale su telefono (' + overflow + ')');
      }
      await page.screenshot({ path: path.join(OUT, `celle-tabella-${label}.png`) });
      // Modifica: tabella di riferimento a sinistra, caratteristiche a destra, predecessore con codici a cascata
      await page.click('.tabs .tab:has-text("Modifica")');
      await page.waitForSelector('.cg-grid');
      ok(await page.locator('.tabs .tab:has-text("Processi")').count() === 1, 'la vista Albero si chiama Processi');
      await page.click('.cg-seg button:has-text("Processi")');
      const first = page.locator('.cg-grid tbody tr').first();
      const firstCode = (await first.locator('.cg-code').textContent()).trim();
      await first.click();
      await page.waitForSelector('.cg-right .tr-bigcode');
      await page.click('.cg-tool:has-text("Predecessore")');
      await page.fill('.modal textarea[name=name]', 'Analisi preliminare');
      await page.click('.modal button:has-text("Aggiungi")');
      await page.waitForSelector('.cg-cascade');
      ok(await page.locator(`.cg-grid tr.sel .cg-code:text-is("${firstCode}")`).count() === 1, 'il predecessore prende il codice della voce scelta');
      ok(await page.locator('.cg-grid tr.changed').count() >= 1, 'le voci dopo cambiano codice a cascata e sono evidenziate');
      ok(/a cascata/.test(await page.textContent('.cg-cascade')), 'riepilogo dei codici aggiornati');
      await page.screenshot({ path: path.join(OUT, `celle-modifica-${label}.png`), fullPage: !mobile });
      // export
      const dl = page.waitForEvent('download');
      await page.click('a:has-text("Scarica Excel")');
      const d = await dl;
      ok(/\.xlsx$/.test(d.suggestedFilename()), 'Excel scaricato: ' + d.suggestedFilename());
      await page.goto(portal.base + '/#/home');
      await page.waitForSelector('h2:has-text("Le mie scadenze in GestioneCelle")').catch(() => {});
      await ctx.close();
    }
    ok(errors.length === 0, 'nessun errore JavaScript ' + errors.join(' | '));
    console.log('\nTutto ok.');
  } catch (err) { console.error(err.message); console.error(errors.join('\n')); process.exitCode = 1; } finally { if (browser) await browser.close(); portal.stop(); }
})();
