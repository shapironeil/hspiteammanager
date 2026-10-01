'use strict';
// Crea icon-192.png e icon-512.png di ogni app del catalogo a partire da icon.svg (serve Playwright, solo per chi sviluppa).
// Uso: node scripts/genera-icone-app.js
const fs = require('node:fs');
const path = require('node:path');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:child_process').execSync('npm root -g').toString().trim(), 'playwright')); }

const DIR = path.join(__dirname, '..', 'app', 'catalogo');
(async () => {
  const browser = await playwright.chromium.launch();
  for (const id of fs.readdirSync(DIR)) {
    const svg = path.join(DIR, id, 'icon.svg');
    if (!fs.existsSync(svg)) continue;
    for (const size of [192, 512]) {
      const page = await browser.newPage({ viewport: { width: size, height: size } });
      await page.setContent(`<style>html,body{margin:0;background:transparent}img{width:${size}px;height:${size}px;display:block}</style><img src="data:image/svg+xml;base64,${fs.readFileSync(svg).toString('base64')}">`);
      await page.screenshot({ path: path.join(DIR, id, `icon-${size}.png`), omitBackground: true });
      await page.close();
    }
    console.log(`  ${id}: icone create`);
  }
  await browser.close();
})();
