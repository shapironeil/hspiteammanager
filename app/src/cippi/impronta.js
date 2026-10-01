'use strict';
// Cippi: l'IMPRONTA di una presentazione, per riconoscere un modello gia' noto quando arriva un file nuovo.
// L'impronta tiene: colori e caratteri del tema, layout usati (e quello principale), piè di pagina, sezioni native,
// nomi di forme non di serie, azienda nei metadati, tipi di slide nell'ordine.
// I modelli noti stanno in docs/MEMORIA/**/*.impronta.json (la memoria dei file analizzati) e tra i modelli salvati
// in Cippi. Il confronto da' un punteggio 0..100 e il motivo.
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_NAMES = /^(rectangle|rounded rectangle|rectangle: rounded corners|oval|ellipse|textbox|text box|text|picture|immagine|graphic|group|freeform|straight connector|straight arrow connector|elbow connector|arrow|title|subtitle|content placeholder|footer placeholder|slide number placeholder|date placeholder|table|chart|diagram|line|connector|flowchart|casella di testo|rettangolo|gruppo|forma|titolo|segnaposto)/i;

function improntaOf(pres, analysis) {
  const layouts = {};
  for (const s of pres.slides) layouts[s.layout || ''] = (layouts[s.layout || ''] || 0) + 1;
  const main = Object.entries(layouts).sort((a, b) => b[1] - a[1])[0];
  const footers = new Set();
  const names = {};
  for (const s of pres.slides) {
    for (const sh of s.shapes) {
      if (sh.ph && sh.ph.type === 'ftr') { const t = (sh.paragraphs || []).map((p) => p.text).join(' ').trim(); if (t) footers.add(t); }
      const nm = String(sh.name || '').trim();
      if (nm && !DEFAULT_NAMES.test(nm) && !/^\w+ \d+$/.test(nm)) names[nm] = (names[nm] || 0) + 1;
    }
  }
  const t = pres.theme || {};
  return {
    tema: { colori: { accent1: t.accent1, accent2: t.accent2, accent3: t.accent3, accent4: t.accent4, accent5: t.accent5, accent6: t.accent6, dk2: t.dk2, lt2: t.lt2 }, caratteri: { maggiore: pres.fonts && pres.fonts.major, minore: pres.fonts && pres.fonts.minor } },
    layout: { usati: layouts, principale: main ? main[0] : '', pieDiPagina: [...footers] },
    sezioniNative: (pres.sections || []).map((s) => s.name).filter(Boolean),
    nomiForme: Object.keys(names).slice(0, 40),
    azienda: (pres.meta && pres.meta.company) || '',
    tipi: analysis ? analysis.slides.map((s) => s.kind) : [],
    slide: pres.slides.length,
  };
}

// Impronta salvata nella memoria (docs/MEMORIA/.../*.impronta.json) -> forma comune
function fromMemory(j) {
  const tema = j.tema || {};
  const colori = tema.colori || {};
  const usati = (j.layout && j.layout.usati) || {};
  const principale = Object.entries(usati).map(([k, v]) => [k, Array.isArray(v) ? v.length : Number(v) || 0]).sort((a, b) => b[1] - a[1])[0];
  return {
    tema: { colori: { accent1: colori.accent1, accent2: colori.accent2, accent3: colori.accent3, accent4: colori.accent4, accent5: colori.accent5, accent6: colori.accent6, dk2: colori.dk2, lt2: colori.lt2 }, caratteri: tema.caratteri || {} },
    layout: { principale: principale ? principale[0] : '', pieDiPaginaRegex: j.layout && j.layout.pieDiPaginaRegex, pieDiPagina: j.layout && j.layout.pieDiPagina ? [j.layout.pieDiPagina] : [] },
    sezioniNative: j.sezioniNative || [],
    nomiForme: (j.partiNellOrdine || []).flatMap((p) => p.segnali || []).flatMap((s) => (/pillole ([\w/ ]+)/.exec(s) || [null, ''])[1].split('/')).map((x) => x.trim()).filter(Boolean),
    azienda: (j.metadati && j.metadati.company) || '',
    tipi: [],
  };
}

// Impronta di un modello salvato in Cippi (template JSON di analyze.templateOf) -> forma comune
function fromTemplate(tpl) {
  const t = tpl.theme || {};
  return {
    tema: { colori: { accent1: t.accent1, accent2: t.accent2, accent3: t.accent3, accent4: t.accent4, accent5: t.accent5, accent6: t.accent6, dk2: t.dk2, lt2: t.lt2 }, caratteri: { maggiore: tpl.fonts && tpl.fonts.major, minore: tpl.fonts && tpl.fonts.minor } },
    layout: { principale: (() => { const c = {}; for (const p of tpl.parts || []) c[p.layout || ''] = (c[p.layout || ''] || 0) + (p.max || 1); return (Object.entries(c).sort((a, b) => b[1] - a[1])[0] || [''])[0]; })(), pieDiPagina: [] },
    sezioniNative: tpl.sections || [],
    nomiForme: [],
    azienda: '',
    tipi: (tpl.parts || []).map((p) => p.kind),
  };
}

const up = (s) => String(s || '').toUpperCase();
const normS = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Confronto: punteggio 0..100 e i motivi
function confronta(a, b) {
  const motivi = [];
  let score = 0;
  const ca = a.tema.colori || {}; const cb = b.tema.colori || {};
  const keys = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'dk2', 'lt2'].filter((k) => ca[k] && cb[k]);
  const same = keys.filter((k) => up(ca[k]) === up(cb[k])).length;
  if (keys.length) {
    const pts = Math.round(40 * same / keys.length);
    score += pts;
    if (same === keys.length) motivi.push('stessi colori del tema'); else if (same) motivi.push(`${same} colori del tema su ${keys.length}`);
  }
  const fa = a.tema.caratteri || {}; const fb = b.tema.caratteri || {};
  if (fa.maggiore && fb.maggiore && normS(fa.maggiore) === normS(fb.maggiore)) { score += 8; motivi.push(`carattere dei titoli ${fa.maggiore}`); }
  if (fa.minore && fb.minore && normS(fa.minore) === normS(fb.minore)) score += 7;
  if (a.layout.principale && b.layout.principale && normS(a.layout.principale) === normS(b.layout.principale)) { score += 15; motivi.push(`layout principale "${a.layout.principale}"`); }
  const footA = a.layout.pieDiPagina || [];
  const rx = b.layout.pieDiPaginaRegex ? new RegExp(b.layout.pieDiPaginaRegex, 'i') : null;
  if (footA.length && (rx ? footA.some((f) => rx.test(f)) : (b.layout.pieDiPagina || []).some((f) => footA.some((g) => normS(g) === normS(f))))) { score += 15; motivi.push(`piè di pagina "${footA[0]}"`); }
  const sa = new Set((a.sezioniNative || []).map(normS)); const sb = (b.sezioniNative || []).map(normS).filter(Boolean);
  if (sb.length && sa.size) {
    const hit = sb.filter((s) => sa.has(s)).length;
    const pts = Math.round(10 * hit / sb.length);
    score += pts;
    if (hit) motivi.push(`${hit} sezioni su ${sb.length} con lo stesso nome`);
  }
  const na = new Set((a.nomiForme || []).map(normS)); const nb = (b.nomiForme || []).map(normS).filter(Boolean);
  if (nb.length && na.size) {
    const hit = nb.filter((s) => na.has(s)).length;
    if (hit) { score += Math.min(5, hit * 2); motivi.push(`forme chiamate ${nb.filter((s) => na.has(s)).slice(0, 3).join(', ')}`); }
  }
  if (a.azienda && b.azienda && normS(a.azienda) === normS(b.azienda)) { score += 5; motivi.push(`azienda ${a.azienda}`); }
  return { punteggio: Math.min(100, score), motivi };
}

// Modelli noti nella memoria del repository (docs/MEMORIA/**/*.impronta.json con formato pptx)
let cache = null;
function modelliNoti(dir) {
  const root = dir || path.join(__dirname, '..', '..', '..', 'docs', 'MEMORIA');
  if (cache && cache.root === root && Date.now() - cache.at < 60000) return cache.list;
  const list = [];
  const walk = (d) => {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      // le cartelle che iniziano con "_" (per esempio _archivio: le schede vecchie) non sono modelli vivi
      if (e.isDirectory()) { if (!e.name.startsWith('_')) walk(p); continue; }
      else if (/\.impronta\.json$/i.test(e.name)) {
        try {
          const j = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (j && (j.formato === 'pptx' || j.app === 'cippi')) list.push({ id: j.template || e.name.replace(/\.impronta\.json$/i, ''), nome: j.tipoDocumento || j.template, scheda: path.relative(root, p).replace(/\\/g, '/').replace(/\.impronta\.json$/i, '.md'), impronta: fromMemory(j) });
        } catch { /* file non leggibile: si salta */ }
      }
    }
  };
  walk(root);
  cache = { root, at: Date.now(), list };
  return list;
}

// I modelli che somigliano alla presentazione: dalla memoria e dai modelli salvati (models = [{ id, name, template }])
function riconosci(pres, analysis, models = [], dir) {
  const mine = improntaOf(pres, analysis);
  const out = [];
  for (const m of modelliNoti(dir)) {
    const r = confronta(mine, m.impronta);
    if (r.punteggio >= 40) out.push({ origine: 'memoria', id: m.id, nome: m.nome, scheda: `docs/MEMORIA/${m.scheda}`, ...r });
  }
  for (const m of models) {
    const r = confronta(mine, fromTemplate(m.template || {}));
    if (r.punteggio >= 40) out.push({ origine: 'modello', id: m.id, nome: m.name, ...r });
  }
  return { impronta: mine, somiglianze: out.sort((a, b) => b.punteggio - a.punteggio).slice(0, 5) };
}

module.exports = { improntaOf, confronta, fromMemory, fromTemplate, modelliNoti, riconosci };
