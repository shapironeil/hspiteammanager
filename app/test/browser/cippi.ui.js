'use strict';
// Prova nel browser di Cippi (desktop e telefono): importazione, modalita' Revisione con i tre pannelli, ordine di
// lettura, confronto To-Be/As-Is, punti chiave, modifica di un testo, salvataggio della versione, modello e nuovo
// documento da modello, crea da zero.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { startPortal, setupHacker } = require('../helpers');
const { pptx } = require('../pptx-prova');
const { kickoff } = require('../pptx-kickoff-prova');
const { kickoffHspi } = require('../pptx-prova');
const { pdfProva } = require('../pdf-prova');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const OUT = process.env.SHOTS || path.join(__dirname, 'screenshots');
const ok = (cond, msg) => { if (!cond) throw new Error('FALLITO: ' + msg); console.log('  ok -', msg); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const portal = await startPortal();
  const errors = [];
  let browser;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hspi-cippi-'));
  try {
    const hacker = await setupHacker(portal.base);
    await hacker.post('/api/projects', { name: 'Acquisti' });
    const file = path.join(tmp, 'Flusso acquisti.pptx');
    fs.writeFileSync(file, pptx());
    browser = await playwright.chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(portal.base + '/');
    await page.fill('input[name=username]', 'anna.hacker');
    await page.fill('input[name=password]', 'password-sicura-1');
    await page.click('button[type=submit]');
    await page.waitForSelector('.shell');
    ok(await page.locator('.nav-item[data-id="cippi"]').count() === 1, 'Cippi nel menu del portale');

    // importazione
    await page.goto(portal.base + '/cippi/');
    await page.waitForSelector('button:has-text("Importa PowerPoint")');
    await page.click('button:has-text("Importa PowerPoint")');
    await page.setInputFiles('.modal input[type=file]', file);
    await page.click('.modal button:has-text("Importa e analizza")');
    await page.waitForSelector('.cp-review .cp-view .cp-slide');
    ok(/Flusso acquisti/.test(await page.textContent('.cp-docname')), 'importata e aperta in Revisione');
    ok(await page.locator('.cp-tools').count() === 1 && await page.locator('.cp-points').count() === 1, 'tre pannelli: strumenti, visione, punti chiave');
    ok(await page.locator('.cp-struct-sec').count() === 3, 'struttura per sezioni (Apertura, Flusso Acquisti To Be, Back Up)');

    // slide di testo: ordine di lettura e gerarchia
    await page.click('.cp-struct-item:has-text("Obiettivi del progetto")');
    await page.waitForSelector('.cp-view .cp-block .cp-badge');
    ok(await page.locator('.cp-view .cp-block').count() >= 3, 'blocchi numerati nell\'ordine di lettura');
    ok(await page.locator('.cp-blocks .cp-blk').count() >= 3, 'struttura della slide con i livelli');
    await page.screenshot({ path: path.join(OUT, 'cippi-revisione.png') });

    // flusso: stati, dettaglio, confronto con l'As-Is
    await page.click('.cp-struct-item:has-text("Processi To Be")');
    await page.waitForSelector('.cp-view .cp-st-nuovo');
    ok(await page.locator('.cp-view .cp-st-modificato').count() === 1, 'step nuovi e modificati evidenziati come nella legenda');
    ok(await page.locator('.cp-actor').count() === 2, 'descrizione della slide: prima i protagonisti (corsie)');
    ok(await page.locator('.cp-step').count() === 6, 'poi la struttura: inizio, step, decisione, fine');
    ok(await page.locator('.cp-view .cp-keypoints').count() === 1, 'punti chiave sotto l\'anteprima');
    // finestra delle caratteristiche: il quadrato diventa un rombo, il contesto del documento
    await page.click('.cp-step:has-text("4. Revisione del budget")');
    await page.waitForSelector('.cs-sheet');
    await page.click('.cs-choice:has-text("Decisione")');
    await page.waitForSelector('.cs-choice.on:has-text("Decisione")');
    await page.click('.cs-nav-item:has-text("Descrizione")');
    await page.fill('.cs-field:has-text("Input") input', 'Richiesta di acquisto');
    await page.click('.cs-btn.primary:has-text("Salva")');
    await page.waitForSelector('.toast:has-text("Caratteristiche salvate")');
    await page.click('.cs-nav-item:has-text("Contesto")');
    await page.click('.cs-btn:has-text("Usa il testo proposto")');
    await page.click('.cs-btn.primary:has-text("Salva")');
    await page.waitForSelector('.toast:has-text("Contesto salvato")');
    await page.screenshot({ path: path.join(OUT, 'cippi-caratteristiche.png') });
    await page.keyboard.press('Escape');
    await page.waitForSelector('text=Modifiche salvate');
    ok(await page.locator('.cp-step:has-text("4. Revisione del budget") .cp-shape-ico:has-text("◇")').count() === 1, 'finestra delle caratteristiche: forma cambiata (rettangolo → rombo), descrizione e contesto salvati');
    await page.click('button:has-text("Confronta con l\'As-Is")');
    await page.waitForSelector('.cp-stage.two .cp-frame:nth-child(2) .cp-slide');
    ok(/Approvazione del responsabile/.test(await page.textContent('.cp-diff')), 'confronto To-Be / As-Is affiancato con le differenze');
    await page.screenshot({ path: path.join(OUT, 'cippi-confronto.png'), fullPage: true });

    // punti chiave: una domanda
    await page.fill('.cp-add input[name=text]', 'Chi approva sopra soglia?');
    await page.selectOption('.cp-add select', 'domanda');
    await page.click('.cp-add button[type=submit]');
    await page.waitForSelector('.cp-pt.k-domanda');
    ok(true, 'domanda aggiunta ai punti chiave della slide');

    // modifica di un testo -> si vede subito e finisce nella versione salvata
    await page.click('.cp-seg button:has-text("Modifica")');
    await page.click('.cp-struct-item:has-text("Obiettivi del progetto")');
    const area = page.locator('.cp-blocks textarea').first();
    await area.fill('Obiettivi rivisti');
    await page.waitForSelector('.cp-view .cp-p:has-text("Obiettivi rivisti")');
    await page.waitForSelector('text=Modifiche salvate');
    ok(true, 'testo modificato: anteprima aggiornata e salvataggio automatico');
    await page.screenshot({ path: path.join(OUT, 'cippi-modifica.png') });
    await page.click('button:has-text("Salva versione")');
    await page.waitForSelector('.cp-docname:has-text("v2")');
    ok(await page.locator('.cp-struct-item:has-text("Obiettivi rivisti")').count() === 1, 'versione 2 salvata e rianalizzata');

    // modello e nuovo documento da modello
    await page.click('button:has-text("Salva come modello")');
    await page.fill('.modal input[name=name]', 'Chiusura progetto');
    await page.click('.modal button:has-text("Salva modello")');
    await page.waitForSelector('.cp-actions .chip:has-text("Modello")');
    await page.goto(portal.base + '/cippi/#/');
    await page.reload();
    await page.waitForSelector('button:has-text("Nuovo da modello")');
    await page.click('button:has-text("Nuovo da modello")');
    await page.waitForSelector('.modal .cp-part');
    ok(await page.locator('.modal .cp-part').count() === 9, 'il modello elenca le parti nell\'ordine in cui si presentano');
    await page.fill('.modal input[name=name]', 'Nuovo flusso');
    await page.click('.modal button:has-text("Crea")');
    await page.waitForSelector('.cp-docname:has-text("Nuovo flusso")');
    ok(true, 'documento nuovo creato dal modello');

    // crea da zero
    await page.goto(portal.base + '/cippi/#/');
    await page.reload();
    await page.click('button:has-text("Crea da zero")');
    await page.fill('.modal input[name=name]', 'Da zero');
    await page.click('.modal button:has-text("Crea")');
    await page.waitForSelector('.cp-docname:has-text("Da zero")');
    ok(await page.locator('.cp-struct-item').count() === 7, 'presentazione base con la struttura tipica');
    await page.goto(portal.base + '/cippi/#/');
    await page.reload();
    await page.waitForSelector('.cp-card .cp-thumb .cp-slide');
    await page.screenshot({ path: path.join(OUT, 'cippi-libreria.png') });

    // kick-off: sezioni native, scheda Documento con il modello noto, trova e sostituisci, celle della tabella in Modifica
    const kfile = path.join(tmp, 'Kick-off prova.pptx');
    fs.writeFileSync(kfile, kickoff());
    await page.goto(portal.base + '/cippi/#/');
    await page.reload();
    await page.waitForSelector('button:has-text("Importa PowerPoint")');
    await page.click('button:has-text("Importa PowerPoint")');
    await page.setInputFiles('.modal input[type=file]', kfile);
    await page.click('.modal button:has-text("Importa e analizza")');
    await page.waitForSelector('.cp-review .cp-view .cp-slide');
    ok(await page.locator('.cp-struct-sec').count() === 6, 'kick-off: le sei sezioni native di PowerPoint');
    ok(await page.locator('.cp-struct-item .cp-kind.k-masterplan').count() === 1, 'kick-off: la slide del masterplan ha il suo tipo');
    const docSec = page.locator('.cp-sec:has(summary:has-text("Documento"))');
    await docSec.locator('summary').click();
    ok(/Somiglia a: kick-off di progetto/.test(await docSec.textContent()), 'kick-off: il modello noto della memoria viene riconosciuto');
    ok(/Fornitore di prova/.test(await docSec.textContent()), 'kick-off: azienda nei metadati');
    await page.click('.cp-struct-item:has-text("MASTERPLAN")');
    await page.waitForSelector('.cp-gantt li.componente');
    ok(await page.locator('.cp-gantt li').count() === 5, 'kick-off: piano di progetto letto dal Gantt');
    await page.click('.cp-struct-item:has-text("INTRODUZIONE")');
    await page.waitForSelector('.cp-view .cp-shape.cp-bg');
    ok(await page.locator('.cp-view .cp-shape.cp-bg').count() >= 1, 'kick-off: le forme fisse del layout nell\'anteprima');
    await page.click('.cp-struct-item:has-text("SINTESI CONTRATTO")');
    await page.waitForSelector('.cp-stage .cp-table td.cp-th');
    ok(await page.locator('.cp-stage .cp-table td[colspan="2"]').count() === 1, 'kick-off: tabella con la riga del totale unita');
    await page.click('.cp-seg button:has-text("Modifica")');
    await page.waitForSelector('.cp-cellgrid input');
    const cell = page.locator('.cp-cellgrid input[aria-label="Cella 1,1"]');
    await cell.fill('Sviluppo rivisto');
    await page.waitForSelector('.cp-stage .cp-table td:has-text("Sviluppo rivisto")');
    await page.waitForSelector('text=Modifiche salvate');
    ok(true, 'kick-off: cella della tabella modificata e vista subito');
    await page.click('button:has-text("Trova e sostituisci")');
    await page.fill('.modal input[name=find]', 'Kick-off Progetto Prova');
    await page.fill('.modal input[name=replace]', 'SAL 1 Progetto Prova');
    await page.click('.modal button:has-text("Sostituisci")');
    await page.waitForSelector('.cp-stage .cp-p:has-text("SAL 1 Progetto Prova")');
    ok(true, 'kick-off: trova e sostituisci in tutte le slide');
    await page.screenshot({ path: path.join(OUT, 'cippi-kickoff.png') });

    // kick-off HSPI (indice numerato, organigramma, numeri, tabella disegnata) e il confronto con il PDF esportato
    const projects = (await hacker.get('/api/projects')).data;
    const pid = (Array.isArray(projects) ? projects : projects.projects || projects.list || [])[0].id;
    const kid = (await hacker.put(`/api/cippi/import?projectId=${pid}&name=Kickoff_di_prova_v1.0.pptx`, kickoffHspi())).data.id;
    await hacker.put(`/api/cippi/docs/${kid}/appunti?name=esportazione.pdf`, pdfProva([{ title: 'Kick-Off', lines: ['Data Platform', '4 Maggio, 2026'] }, { title: 'INDICE', lines: ['Introduzione e Contesto', 'Piano di progetto'] }]));
    await page.goto(portal.base + `/cippi/#/doc/${kid}`);
    await page.reload();
    await page.waitForSelector('.cp-review .cp-view .cp-slide');
    ok(await page.locator('.cp-struct-item .cp-kind.k-organigramma').count() === 1 && await page.locator('.cp-struct-item .cp-kind.k-numeri').count() === 1, 'kick-off HSPI: organigramma e numeri riconosciuti');
    ok(/forse un refuso/.test(await page.textContent('.cp-checks')), 'controlli: il refuso tra indice e titolo');
    const docSec2 = page.locator('.cp-sec:has(summary:has-text("Documento"))');
    await docSec2.locator('summary').click();
    ok(await docSec2.locator('a:has-text("Scarica impronta")').count() === 1, 'documento: impronta da scaricare per la memoria');
    await page.click('.cp-sec summary:has-text("Appunti")');
    await page.click('.cp-files button:has-text("Confronta")');
    await page.waitForSelector('.modal .cp-pdf');
    ok(/non è aggiornato/.test(await page.textContent('.modal')) && await page.locator('.modal .cp-pdf tbody tr').count() === 2, 'PDF confrontato pagina per slide');
    await page.screenshot({ path: path.join(OUT, 'cippi-pdf.png') });
    await page.keyboard.press('Escape');

    // telefono: un pannello alla volta
    const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    m.on('pageerror', (e) => errors.push(e.message));
    await m.goto(portal.base + '/');
    await m.fill('input[name=username]', 'anna.hacker');
    await m.fill('input[name=password]', 'password-sicura-1');
    await m.click('button[type=submit]');
    await m.waitForSelector('.shell');
    await m.goto(portal.base + '/cippi/#/doc/1?s=6');
    await m.waitForSelector('.cp-view .cp-slide');
    ok(!(await m.locator('.cp-tools').isVisible()), 'telefono: si vede solo il pannello di visione');
    await m.click('.cp-tabs button:has-text("Descrizione")');
    ok(await m.locator('.cp-points').isVisible(), 'telefono: si passa alla descrizione della slide');
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(overflow <= 1, 'telefono: niente scorrimento orizzontale');
    await m.screenshot({ path: path.join(OUT, 'cippi-telefono.png') });
    ok(errors.length === 0, 'nessun errore JavaScript ' + errors.join(' | '));
    console.log('\nTutto ok.');
  } catch (err) { console.error(err.message); console.error(errors.join('\n')); process.exitCode = 1; } finally {
    if (browser) await browser.close();
    portal.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();
