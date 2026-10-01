'use strict';
// Appunti accanto a una presentazione: il PDF esportato dal PowerPoint (quello che si manda al cliente) e gli
// appunti di studio. Qui si confronta un PDF con la presentazione, pagina per slide:
//   - ogni pagina viene abbinata alla slide con il testo piu' simile (parole in comune, titolo uguale);
//   - si vede se il PDF e' ALLINEATO (stesse pagine, stesso ordine, stessi testi), se e' una versione vecchia
//     (pagine che non corrispondono piu', slide senza pagina) o se l'ordine e' cambiato;
//   - per ogni coppia non identica, le parole che stanno solo nel PDF o solo nella slide.
// Prima di mandare il PDF al cliente si controlla che sia l'esportazione dell'ultima versione.
const { norm, closeness } = require('./analyze');

const STOP = new Set(['del', 'della', 'delle', 'dei', 'degli', 'con', 'per', 'che', 'una', 'uno', 'gli', 'the', 'and', 'nel', 'nella', 'alla', 'alle', 'dal', 'dalla', 'sul', 'sulla', 'non', 'come', 'tra', 'fra', 'piu', 'anche', 'sono', 'the', 'for', 'with']);
const words = (text) => new Set(norm(text).split(' ').filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)));
const slideText = (s) => [s.title, ...(s.blocks || []).map((b) => (b.role === 'navigazione' || b.role === 'immagine' ? '' : b.text))].filter(Boolean).join('\n');
function dice(A, B) {
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return (2 * n) / (A.size + B.size);
}

// pdf: risultato di readPdf; slides: le slide dell'analisi NELL'ORDINE del documento (dopo spostamenti e tagli)
function confrontoPdf(pdf, slides) {
  const P = pdf.pages.map((p) => ({ n: p.n, title: p.title, words: words(p.text), text: p.text }));
  const S = slides.map((s, i) => ({ pos: i + 1, src: s.n, title: s.title, words: words(slideText(s)), kind: s.kind }));
  const score = (p, s) => {
    const base = dice(p.words, s.words);
    const t = p.title && s.title ? closeness(p.title, s.title).score : 0;
    return Math.min(1, base + (t >= 0.85 ? 0.25 : t >= 0.6 ? 0.1 : 0));
  };
  // abbinamento: per ogni pagina la slide migliore ancora libera (sopra la soglia), preferendo quelle dopo la precedente
  const used = new Set();
  const pairs = [];
  let last = 0;
  for (const p of P) {
    const cands = S.filter((s) => !used.has(s.pos)).map((s) => ({ s, sc: score(p, s) + (s.pos > last ? 0.02 : 0) })).sort((a, b) => b.sc - a.sc);
    const best = cands[0];
    if (best && best.sc >= 0.3) {
      used.add(best.s.pos); last = best.s.pos;
      const sc = Math.min(1, best.sc);
      const only = (A, B) => [...A].filter((w) => !B.has(w)).slice(0, 8);
      const same = sc >= 0.85;
      pairs.push({ page: p.n, slide: best.s.pos, src: best.s.src, score: +sc.toFixed(2), titlePdf: p.title, titleSlide: best.s.title, same,
        ...(same ? {} : { soloPdf: only(p.words, best.s.words), soloSlide: only(best.s.words, p.words) }) });
    } else pairs.push({ page: p.n, slide: null, src: null, score: best ? +Math.min(1, best.sc).toFixed(2) : 0, titlePdf: p.title, titleSlide: null, same: false });
  }
  const pagesWithoutSlide = pairs.filter((x) => !x.slide).map((x) => x.page);
  const slidesWithoutPage = S.filter((s) => !used.has(s.pos)).map((s) => ({ slide: s.pos, title: s.title, kind: s.kind }));
  const matched = pairs.filter((x) => x.slide);
  const orderChanged = matched.some((x, i) => i && x.slide < matched[i - 1].slide);
  const avg = matched.length ? matched.reduce((a, x) => a + x.score, 0) / matched.length : 0;
  const changed = matched.filter((x) => !x.same).length;
  const aligned = P.length === S.length && !pagesWithoutSlide.length && !slidesWithoutPage.length && !orderChanged && changed === 0;
  let verdict;
  if (aligned) verdict = 'Il PDF corrisponde alla presentazione: stesse pagine, stesso ordine, stessi testi.';
  else if (!matched.length) verdict = 'Il PDF non sembra l\'esportazione di questa presentazione.';
  else {
    const parts = [];
    const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
    if (pagesWithoutSlide.length) parts.push(`${n(pagesWithoutSlide.length, 'pagina', 'pagine')} del PDF senza una slide corrispondente`);
    if (slidesWithoutPage.length) parts.push(`${slidesWithoutPage.length} slide senza pagina nel PDF`);
    if (orderChanged) parts.push('ordine diverso');
    if (changed) parts.push(`${n(changed, 'pagina', 'pagine')} con testi diversi`);
    verdict = `Il PDF non è aggiornato: ${parts.join(', ')}. Riesporta il PDF dall'ultima versione.`;
  }
  return { pages: P.length, slides: S.length, aligned, verdict, avg: +avg.toFixed(2), pairs, pagesWithoutSlide, slidesWithoutPage, orderChanged, changed };
}

module.exports = { confrontoPdf, slideText };
