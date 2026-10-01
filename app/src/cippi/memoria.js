'use strict';
// Memoria dei modelli di file: l'IMPRONTA COMPLETA di una presentazione, quella che si scarica da Cippi
// ("Documento -> Scarica impronta") e si salva in docs/MEMORIA/pptx/<template>.impronta.json con la sua scheda.
//
// Ha gli stessi nomi dei campi che legge impronta.js per riconoscere i modelli noti (tema.colori, tema.caratteri,
// layout.usati, layout.pieDiPagina, sezioniNative, metadati.company) e in piu': nome del tema, caratteri usati nelle
// slide, master con quante slide usano ognuno, testi fissi dei layout, tipi di slide nell'ordine, sezioni, sigle,
// titolo e soggetto dei metadati. Il riconoscimento vero e proprio sta in impronta.js (riconosci).
// E' codice puro, senza accesso al portale: puo' girare anche nel motore di HSPI Client.
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

// Nome proposto per un'impronta nuova: <tipo>-<azienda>-<progetto>, in minuscolo con i trattini
function templateName(fp, docName) {
  const kind = fp.tipi.includes('flusso') ? 'processi' : /kick.?off/i.test(docName) ? 'kickoff' : /offert|proposal/i.test(docName + fp.metadati.titolo) ? 'offerta' : /sal\b/i.test(docName) ? 'sal' : 'presentazione';
  const who = norm(fp.metadati.company || '').split(' ')[0] || 'hspi';
  const what = norm(docName).split(' ').filter((w) => w && w !== who && !/^(kick|off|kickoff|offerta|offering|v\d.*|\d+)$/.test(w)).slice(0, 3).join('-');
  return [kind, who, what].filter(Boolean).join('-').replace(/-+/g, '-');
}

module.exports = { fingerprintOf, templateName };
