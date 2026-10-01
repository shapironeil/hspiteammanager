'use strict';
// Riconoscimento dei modelli di file noti: confronta un .pptx o un .docx con le impronte salvate nella memoria
// del repository (docs/MEMORIA/<formato>/<template>.impronta.json). Nessun dato aziendale: solo struttura e stili.
//
//   riconosci('pptx', { buf, fileName, pres })   -> { template, app, punteggio, corrisponde, dettagli, scheda } | null
//   riconosci('docx', { buf, fileName, struttura })
//
// Il punteggio e' in centesimi: ogni impronta dice il suo "punteggioMinimo" (60 se manca).
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { readZip } = require('./celle/zip');

const DIR = path.join(config.CODE_ROOT, 'docs', 'MEMORIA');
let cache = null; // { at, list }

function list() {
  if (cache && Date.now() - cache.at < 60000) return cache.list;
  const out = [];
  try {
    for (const fmt of fs.readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const f of fs.readdirSync(path.join(DIR, fmt.name)).filter((x) => x.endsWith('.impronta.json'))) {
        try {
          const imp = JSON.parse(fs.readFileSync(path.join(DIR, fmt.name, f), 'utf8'));
          imp.formato = imp.formato || fmt.name;
          imp.scheda = `docs/MEMORIA/${fmt.name}/${f.replace(/\.impronta\.json$/, '.md')}`;
          out.push(imp);
        } catch { /* impronta non valida: si salta */ }
      }
    }
  } catch { /* nessuna memoria */ }
  cache = { at: Date.now(), list: out };
  return out;
}

// ---- Pezzi dell'impronta letti dal pacchetto ---------------------------------------------------
function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}
function packageFacts(buf, kind) {
  const zip = readZip(buf);
  const fonts = new Set(); const media = []; let xmlAll = '';
  for (const [name, get] of zip) {
    if (/^(ppt|word)\/media\//.test(name)) { const s = imageSize(get()); if (s) media.push(s); continue; }
    if (!/\.xml$/.test(name)) continue;
    if (kind === 'pptx' && !/^ppt\/(slides|slideLayouts|slideMasters)\//.test(name)) continue;
    if (kind === 'docx' && !/^word\/(document|styles|header\d*|footer\d*)\.xml$/.test(name)) continue;
    const x = get().toString('utf8');
    xmlAll += x;
    for (const m of x.matchAll(/(?:typeface|w:ascii)="([^"+][^"]*)"/g)) fonts.add(m[1]);
  }
  return { fonts: [...fonts], media, xml: xmlAll };
}
const sameSize = (a, b) => Array.isArray(a) && Array.isArray(b) && Math.abs(a[0] - b[0]) <= 2 && Math.abs(a[1] - b[1]) <= 2;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// ---- Confronto ---------------------------------------------------------------------------------
// Le impronte possono avere i campi al primo livello oppure dentro "impronta" (forma unificata di docs/MEMORIA):
// qui si leggono entrambe le forme.
// (una regex scritta per Python, con "(?i)", si adatta: in JavaScript il flag e' "i")
function nomeFileRegex(imp) {
  const raw = (typeof imp.nomeFile === 'string' ? imp.nomeFile : imp.nomeFile && imp.nomeFile.regex) || null;
  if (!raw) return null;
  try { return new RegExp(String(raw).replace(/^\(\?i\)/, ''), 'i'); } catch { return null; }
}
const nested = (imp) => (imp.impronta && typeof imp.impronta === 'object' ? imp.impronta : {});
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const imagesOf = (imp) => asList(imp.immagini).concat(asList(nested(imp).immagini)).map((i) => (Array.isArray(i) ? i : i && i.px)).filter((px) => Array.isArray(px) && px.length === 2);
function scorePptx(imp, { buf, fileName, pres }) {
  const d = []; let score = 0;
  const add = (ok, pts, what) => { if (ok) score += pts; d.push({ ok: !!ok, pts, what }); };
  const facts = buf ? packageFacts(buf, 'pptx') : { fonts: [], media: [], xml: '' };
  const N = nested(imp);
  const rx = nomeFileRegex(imp);
  if (rx) add(rx.test(fileName || ''), 20, 'nome del file');
  const size = (imp.slide && imp.slide.cx) ? imp.slide : (N.formato && N.formato.cx ? N.formato : null);
  if (size) add(pres && pres.width === size.cx && pres.height === size.cy, 5, 'formato della slide');
  const accent1 = (imp.tema && imp.tema.colori && imp.tema.colori.accent1) || (asList(N.colori).find((c) => /^[0-9A-F]{6}$/i.test(c) && c.toUpperCase() === '156082') ? '156082' : null);
  if (accent1) add(pres && pres.theme && pres.theme.accent1 === accent1, 10, 'colori del tema');
  const want = asList(imp.tema && imp.tema.caratteriNelleSlide).concat(asList(N.carattere));
  if (want.length) add(want.some((f) => facts.fonts.includes(f)), 15, `carattere ${[...new Set(want)].join(', ')}`);
  const lay = asList(imp.layout && imp.layout.disponibili).concat(N.layoutConTesto ? Object.keys(N.layoutConTesto) : []);
  if (lay.length && pres) {
    const have = new Set(pres.layouts.map(norm));
    const hit = lay.filter((l) => have.has(norm(l))).length / lay.length;
    add(hit >= 0.6, 15, `layout del modello (${Math.round(hit * 100)}%)`);
  }
  const fixed = (imp.layout && imp.layout.testiFissi ? Object.values(imp.layout.testiFissi) : []).concat(N.layoutConTesto ? Object.values(N.layoutConTesto) : []).flat();
  if (fixed.length) add(fixed.some((t) => facts.xml.includes(String(t).replace(/&/g, '&amp;'))), 20, 'testi fissi dei layout');
  const imgs = imagesOf(imp);
  if (imgs.length) { const n = imgs.filter((px) => facts.media.some((m) => sameSize(m, px))).length; add(n >= Math.min(2, imgs.length), 15, `immagini del brand (${n} su ${imgs.length})`); }
  return { score, d };
}
function scoreDocx(imp, { buf, fileName, struttura }) {
  const d = []; let score = 0;
  const add = (ok, pts, what) => { if (ok) score += pts; d.push({ ok: !!ok, pts, what }); };
  const facts = buf ? packageFacts(buf, 'docx') : { fonts: [], media: [] };
  const N = nested(imp);
  const rx = nomeFileRegex(imp);
  if (rx) add(rx.test(fileName || ''), 15, 'nome del file');
  const caps = asList(imp.capitoli).length ? asList(imp.capitoli) : asList(N.capitoli);
  if (caps.length && struttura) {
    const have = (struttura.capitoli || []).map((c) => norm(c.titolo || c));
    const hit = caps.filter((c) => have.some((h) => h.includes(norm(c)))).length / caps.length;
    add(hit >= 0.7, 40, `capitoli del modello (${Math.round(hit * 100)}%)`);
  }
  const want = asList(imp.caratteriNelTesto).concat(asList(N.carattere));
  if (want.length) add(want.some((f) => facts.fonts.includes(f)), 15, `carattere ${[...new Set(want)].join(', ')}`);
  const imgs = imagesOf(imp);
  if (imgs.length) { const n = imgs.filter((px) => facts.media.some((m) => sameSize(m, px))).length; add(n >= Math.min(2, imgs.length), 15, `immagini di intestazione e piè di pagina (${n} su ${imgs.length})`); }
  const nTab = Number(imp.tabelle) || Number(N.tabelle) || 0;
  if (nTab && struttura) add(Math.abs((struttura.tabelle || []).length - nTab) <= 2, 10, 'numero di tabelle');
  const sez = Array.isArray(imp.pagina && imp.pagina.sezioni) ? imp.pagina.sezioni : (Array.isArray(N.sezioni) ? N.sezioni : null);
  if (sez && struttura && struttura.sezioni) add(JSON.stringify(struttura.sezioni.map((s) => s.orientamento)) === JSON.stringify(sez), 5, 'sezioni e orientamento');
  return { score, d };
}

function riconosci(formato, input) {
  const cands = list().filter((i) => i.formato === formato);
  if (!cands.length) return null;
  const scored = cands.map((imp) => {
    const r = formato === 'pptx' ? scorePptx(imp, input) : scoreDocx(imp, input);
    const min = Number(imp.punteggioMinimo) || 60;
    return { template: imp.template, app: imp.app, tipoDocumento: imp.tipoDocumento || '', fascicolo: imp.fascicolo || null, scheda: imp.scheda,
      punteggio: Math.min(100, r.score), corrisponde: r.score >= min, dettagli: r.d, funzioni: (imp[formato === 'pptx' ? 'cippi' : 'word'] || {}).funzioniDaUsare || [] };
  }).sort((a, b) => b.punteggio - a.punteggio);
  return scored[0].punteggio > 0 ? scored[0] : null;
}

module.exports = { list, riconosci, packageFacts, imageSize };
