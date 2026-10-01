'use strict';
// Memoria dei modelli di file: riconoscere, all'importazione, una presentazione "gia' vista".
//
// Le impronte dei template noti stanno in docs/MEMORIA/<formato>/<template>.impronta.json (una cartella per formato,
// scritta a mano o scaricata da Cippi con "Scarica impronta"). Per ogni presentazione importata Cippi calcola la sua
// impronta (tema, caratteri, layout usati, testi fissi dei layout, sezioni native, tipi di slide, metadati) e la
// confronta con quelle note: il risultato dice quale template somiglia di piu' e con quali segnali.
//
// I segnali, dal piu' forte: colori del tema; caratteri del tema; layout usati; pie' di pagina dei layout; sezioni
// native; schema del nome del file; azienda nei metadati; ordine dei tipi di slide; nome del tema. Un file "corrisponde"
// sopra 55/100; tra 35 e 55 e' "simile" (stessa famiglia grafica, documento diverso).
// E' codice puro, senza accesso al portale: puo' girare anche nel motore di HSPI Client.
const fs = require('node:fs');
const path = require('node:path');

const COLOR_KEYS = ['dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// ---- Impronta di una presentazione ---------------------------------------------------------------
function fingerprintOf(pres, analysis, fileName = '') {
  const used = {};
  for (const s of pres.slides) (used[s.layout || ''] = used[s.layout || ''] || []).push(s.n);
  const mainLayout = Object.entries(used).sort((a, b) => b[1].length - a[1].length)[0];
  const fixed = [...new Set(Object.values(pres.layoutTexts || {}).flat())];
  // pie' di pagina: un testo fisso del layout piu' usato che non sia un numero
  const footer = ((pres.layoutTexts || {})[mainLayout ? mainLayout[0] : ''] || []).find((t) => t.length >= 4 && t.length <= 80 && !/^\d+$/.test(t)) || '';
  const fontsInSlides = [...new Set(pres.slides.flatMap((s) => s.fonts || []))].sort();
  return {
    formato: 'pptx',
    nomeFile: fileName || null,
    slide: { cx: pres.width, cy: pres.height, formato: Math.abs(pres.ratio - 16 / 9) < 0.02 ? 'Widescreen 16:9' : Math.abs(pres.ratio - 4 / 3) < 0.02 ? '4:3' : `${pres.ratio}` , numero: pres.slides.length },
    tema: {
      nome: pres.themeName || '',
      colori: Object.fromEntries(Object.entries(pres.theme || {}).map(([k, v]) => [k, String(v).toUpperCase()])),
      caratteri: { maggiore: (pres.fonts || {}).major || null, minore: (pres.fonts || {}).minor || null },
      caratteriNelleSlide: fontsInSlides,
    },
    master: (pres.masters || []).map((m) => ({ nome: m.name, tema: m.themeName, slide: m.slides })),
    layout: { usati: used, pieDiPagina: footer, testiFissi: fixed.slice(0, 20) },
    sezioniNative: (pres.sections || []).map((s) => s.name),
    tipi: analysis.slides.map((s) => s.kind),
    sezioni: analysis.sections.map((s) => s.title),
    sigle: analysis.glossary.slice(0, 15).map((g) => g.term),
    metadati: { company: pres.meta.company || '', applicazione: pres.meta.application || '', titolo: pres.meta.title || '', soggetto: pres.meta.subject || '', paroleChiave: pres.meta.keywords || '' },
  };
}

// ---- Impronte note -------------------------------------------------------------------------------
function walk(dir, depth, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && depth > 0 && !e.name.startsWith('.')) walk(full, depth - 1, out);
    else if (e.isFile() && /\.impronta\.json$/i.test(e.name)) out.push(full);
  }
  return out;
}
let cache = { key: '', at: 0, list: [] };
function loadKnown(dirs) {
  const key = dirs.join('|');
  if (cache.key === key && Date.now() - cache.at < 30000) return cache.list;
  const files = [];
  const seen = new Set();
  for (const d of dirs) {
    let real = d;
    try { real = fs.realpathSync(d); } catch { continue; }
    if (seen.has(real)) continue; // su Windows docs/MEMORIA e docs/memoria sono la stessa cartella
    seen.add(real);
    walk(real, 3, files);
  }
  const list = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!data || typeof data !== 'object') continue;
      const template = data.template || path.basename(f).replace(/\.impronta\.json$/i, '');
      if (list.some((x) => x.template === template)) continue;
      const md = f.replace(/\.impronta\.json$/i, '.md');
      list.push({ template, file: f, scheda: fs.existsSync(md) ? md : null, formato: data.formato || path.basename(path.dirname(f)), app: data.app || null, tipoDocumento: data.tipoDocumento || '', data });
    } catch { /* impronta non leggibile: si salta */ }
  }
  cache = { key, at: Date.now(), list };
  return list;
}

// ---- Confronto ------------------------------------------------------------------------------------
const colorsOf = (t) => (t && t.tema && t.tema.colori) || {};
const fontsOf = (t) => ((t && t.tema && t.tema.caratteri) || {});
const regexOf = (s) => { try { return s ? new RegExp(s, 'i') : null; } catch { return null; } };
// somiglianza tra due sequenze (sottosequenza comune piu' lunga / lunghezza della piu' corta)
function seqSim(a, b) {
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length] / Math.min(a.length, b.length);
}

function scoreAgainst(fp, known) {
  const k = known.data || {};
  if (k.formato && k.formato !== fp.formato) return null;
  const signals = [];
  let got = 0; let max = 0;
  const add = (label, points, weight) => { max += weight; if (points > 0) { got += points; signals.push(`${label}${points < weight ? ` (${Math.round(points)}/${weight})` : ''}`); } };
  // colori del tema
  const kc = colorsOf(k); const fc = colorsOf(fp);
  const keys = COLOR_KEYS.filter((c) => kc[c]);
  if (keys.length) {
    const same = keys.filter((c) => String(kc[c]).toUpperCase() === String(fc[c] || '').toUpperCase()).length;
    add(`colori del tema (${same}/${keys.length})`, same === keys.length ? 35 : same >= Math.max(3, keys.length - 2) ? 25 : same >= 1 && String(kc.accent1 || '').toUpperCase() === String(fc.accent1 || '').toUpperCase() ? 10 : 0, 35);
  }
  // caratteri del tema
  const kf = fontsOf(k); const ff = fontsOf(fp);
  if (kf.maggiore || kf.minore) {
    const n = (kf.maggiore && kf.maggiore === ff.maggiore ? 1 : 0) + (kf.minore && kf.minore === ff.minore ? 1 : 0);
    add(`caratteri del tema (${[kf.maggiore, kf.minore].filter(Boolean).join('/')})`, n === 2 ? 15 : n === 1 ? 8 : 0, 15);
  }
  // layout usati
  const kl = Object.keys((k.layout && k.layout.usati) || {});
  if (kl.length) {
    const fl = new Set(Object.keys(fp.layout.usati));
    const hit = kl.filter((l) => fl.has(l)).length;
    add(`layout (${hit}/${kl.length})`, Math.round((hit / kl.length) * 15), 15);
  }
  // pie' di pagina / testi fissi dei layout
  const re = regexOf(k.layout && k.layout.pieDiPaginaRegex);
  const footerText = (k.layout && k.layout.pieDiPagina) || '';
  if (re || footerText) {
    const texts = [fp.layout.pieDiPagina, ...fp.layout.testiFissi].filter(Boolean);
    const hit = texts.some((t) => (re && re.test(t)) || (footerText && !/[<>]/.test(footerText) && norm(t) === norm(footerText)));
    add('piè di pagina dei layout', hit ? 15 : 0, 15);
  }
  // sezioni native
  const ks = (k.sezioniNative || []).map(norm).filter(Boolean);
  if (ks.length) {
    const fs2 = new Set(fp.sezioniNative.map(norm));
    const hit = ks.filter((x) => fs2.has(x)).length;
    add(`sezioni native (${hit}/${ks.length})`, hit >= ks.length / 2 ? 10 : hit ? 4 : 0, 10);
  }
  // schema del nome del file
  const rn = regexOf(k.nomeFile && k.nomeFile.regex);
  if (rn) add('nome del file', fp.nomeFile && rn.test(fp.nomeFile) ? 10 : 0, 10);
  // azienda nei metadati
  const company = k.metadati && k.metadati.company;
  if (company) add('azienda nei metadati', norm(company) === norm(fp.metadati.company) ? 5 : 0, 5);
  // ordine dei tipi di slide
  const kt = k.tipi || (k.partiNellOrdine || []).flatMap((p) => (p.slide || []).map(() => p.parte));
  if (kt.length) add('ordine dei tipi di slide', Math.round(seqSim(kt, fp.tipi) * 10), 10);
  // nome del tema
  if (k.tema && k.tema.nome) add('nome del tema', norm(k.tema.nome) === norm(fp.tema.nome) ? 5 : 0, 5);
  if (!max) return null;
  const score = Math.round((got / max) * 100);
  return { template: known.template, formato: known.formato, app: known.app, tipoDocumento: known.tipoDocumento, scheda: known.scheda, score, segnali: signals, esito: score >= 55 ? 'riconosciuto' : score >= 35 ? 'simile' : 'no' };
}

function matchOf(fp, known) {
  const list = known.map((k) => scoreAgainst(fp, k)).filter(Boolean).sort((a, b) => b.score - a.score);
  return { riconosciuto: list[0] && list[0].esito === 'riconosciuto' ? list[0] : null, candidati: list.filter((x) => x.esito !== 'no').slice(0, 3) };
}

// Nome proposto per un'impronta nuova: <tipo>-<azienda>-<progetto>, in minuscolo con i trattini
function templateName(fp, docName) {
  const kind = fp.tipi.includes('flusso') ? 'processi' : /kick.?off/i.test(docName) ? 'kickoff' : /offert|proposal/i.test(docName + fp.metadati.titolo) ? 'offerta' : /sal\b/i.test(docName) ? 'sal' : 'presentazione';
  const who = norm(fp.metadati.company || '').split(' ')[0] || 'hspi';
  const what = norm(docName).split(' ').filter((w) => w && w !== who && !/^(kick|off|kickoff|offerta|offering|v\d.*|\d+)$/.test(w)).slice(0, 3).join('-');
  return [kind, who, what].filter(Boolean).join('-').replace(/-+/g, '-');
}

module.exports = { fingerprintOf, loadKnown, matchOf, scoreAgainst, templateName };
