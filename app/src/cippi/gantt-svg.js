'use strict';
// Cippi: lettura di un piano di progetto (masterplan, Gantt) incollato nella slide come immagine SVG.
// PowerPoint, Excel e gli strumenti di planning esportano il Gantt come SVG con i testi ancora leggibili:
// anni e mesi in alto, a sinistra le righe (componenti in maiuscolo, attività sotto), le barre come rettangoli o
// frecce colorate. Da qui si ricava una struttura: righe con il periodo (da mese a mese), senza inventare nulla.
//
// gantt(svgText) -> { years: [{ year, x }], months: [{ label, x, year, month }], rows: [{ kind, text, from, to }] }
// oppure null se non sembra un Gantt.
const MONTHS_IT = 'GFMAMGLASOND';
const MONTHS_EN = 'JFMAMJJASOND';
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e] || m;
});

function texts(svg) {
  const out = [];
  for (const m of svg.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    const a = m[1];
    const tr = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(a);
    const x = tr ? Number(tr[1]) : Number((/\bx="(-?[\d.]+)"/.exec(a) || [])[1]);
    const y = tr ? Number(tr[2]) : Number((/\by="(-?[\d.]+)"/.exec(a) || [])[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const text = decode(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const size = Number((/font-size="([\d.]+)"/.exec(a) || [])[1]) || 0;
    const bold = /font-weight="(700|bold)"/.test(a);
    out.push({ x, y, text, size, bold });
  }
  return out;
}

// Riquadri delle barre: rettangoli e percorsi riempiti, escluso lo sfondo (bianco, grigi)
function bars(svg) {
  const gray = (c) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(c || '');
    if (!m) return true;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    return Math.max(r, g, b) - Math.min(r, g, b) < 18; // bianco, nero, grigi
  };
  const out = [];
  for (const m of svg.matchAll(/<(rect|path)([^>]*)\/?>/g)) {
    const a = m[2];
    const fill = (/\bfill="([^"]+)"/.exec(a) || [])[1];
    if (!fill || fill === 'none' || gray(fill)) continue;
    const opacity = Number((/\bfill-opacity="([\d.]+)"/.exec(a) || [1, 1])[1]);
    if (opacity < 0.95) continue; // fascia di sfondo di un'intestazione, non una barra
    let x0; let x1; let y0; let y1;
    if (m[1] === 'rect') {
      const x = Number((/\bx="(-?[\d.]+)"/.exec(a) || [0, 0])[1]); const y = Number((/\by="(-?[\d.]+)"/.exec(a) || [0, 0])[1]);
      const w = Number((/\bwidth="([\d.]+)"/.exec(a) || [0, 0])[1]); const h = Number((/\bheight="([\d.]+)"/.exec(a) || [0, 0])[1]);
      x0 = x; x1 = x + w; y0 = y; y1 = y + h;
    } else {
      const d = (/\bd="([^"]+)"/.exec(a) || [])[1];
      if (!d) continue;
      const nums = d.match(/-?\d+\.?\d*(?:e-?\d+)?/g);
      if (!nums || nums.length < 4) continue;
      const xs = nums.filter((_, i) => i % 2 === 0).map(Number); const ys = nums.filter((_, i) => i % 2 === 1).map(Number);
      x0 = Math.min(...xs); x1 = Math.max(...xs); y0 = Math.min(...ys); y1 = Math.max(...ys);
    }
    if (!(x1 - x0 > 6) || !(y1 - y0 > 3)) continue;
    out.push({ x0, x1, y0, y1, fill });
  }
  return out;
}

function gantt(svg) {
  if (!svg || !/<svg[\s>]/i.test(svg)) return null;
  const T = texts(svg);
  const years = T.filter((t) => /^(19|20)\d\d$/.test(t.text)).map((t) => ({ year: Number(t.text), x: t.x, y: t.y }));
  // la riga dei mesi: tante lettere singole alla stessa altezza
  const single = T.filter((t) => /^[A-Z]$/.test(t.text));
  const byY = new Map();
  for (const t of single) { const k = Math.round(t.y / 4); byY.set(k, (byY.get(k) || []).concat(t)); }
  const monthRow = [...byY.values()].sort((a, b) => b.length - a.length)[0];
  if (!years.length || !monthRow || monthRow.length < 6) return null;
  monthRow.sort((a, b) => a.x - b.x);
  const letters = monthRow.map((t) => t.text).join('');
  const lang = MONTHS_IT.includes(letters.slice(0, 6)) || letters.includes('GLA') ? MONTHS_IT : MONTHS_EN;
  // il primo mese: la sequenza delle lettere deve combaciare con il calendario a partire da un certo mese
  let start = 0;
  for (let s = 0; s < 12; s++) {
    let ok = true;
    for (let i = 0; i < monthRow.length; i++) if (lang[(s + i) % 12] !== monthRow[i].text) { ok = false; break; }
    if (ok) { start = s; break; }
  }
  years.sort((a, b) => a.x - b.x);
  const months = monthRow.map((t, i) => {
    const m = (start + i) % 12;
    const yearIdx = Math.floor((start + i) / 12);
    const year = (years[0] ? years[0].year : 0) + yearIdx;
    return { label: t.text, x: t.x, year, month: m + 1, key: `${year}-${String(m + 1).padStart(2, '0')}` };
  });
  const step = months.length > 1 ? (months[months.length - 1].x - months[0].x) / (months.length - 1) : 20;
  const monthAt = (x) => {
    let best = 0;
    for (let i = 1; i < months.length; i++) if (Math.abs(months[i].x - x) < Math.abs(months[best].x - x)) best = i;
    return months[best];
  };
  const headerY = monthRow[0].y;
  // righe: i testi a sinistra della griglia, sotto l'intestazione, raggruppati per altezza
  const left = months[0].x - step;
  const rowsMap = new Map();
  for (const t of T.filter((t) => t.y > headerY + 4 && t.x < left && !/^(attivit[àa]|activity|task|wbs)$/i.test(t.text))) {
    const k = Math.round(t.y / 5);
    rowsMap.set(k, (rowsMap.get(k) || []).concat(t));
  }
  const B = bars(svg).filter((b) => b.x0 >= left);
  let rows = [...rowsMap.values()].map((parts) => {
    parts.sort((a, b) => a.x - b.x);
    // "DELL" + "A" (parola spezzata dall'esportazione) -> "DELLA"
    const words = [];
    for (const p of parts) { if (/^[AEIOU]$/.test(p.text) && words.length && /LL$/.test(words[words.length - 1])) words[words.length - 1] += p.text; else words.push(p.text); }
    const text = words.join(' ').replace(/\s+-\s+/g, '-').replace(/\s+/g, ' ').trim();
    const y = parts[0].y;
    const upper = text === text.toUpperCase() && /[A-Z]/.test(text);
    const kind = upper || parts[0].bold ? 'componente' : 'attivita';
    return { kind, text, y, bars: [] };
  }).sort((a, b) => a.y - b.y);
  if (!rows.length) return null;
  // ogni barra sta sulla riga piu' vicina al suo centro (il testo sta poco sopra la base della barra)
  for (const b of B) {
    const yc = (b.y0 + b.y1) / 2;
    const row = rows.map((r) => ({ r, d: Math.abs(r.y - 3 - yc) })).sort((a, c) => a.d - c.d)[0];
    if (row && row.d < 14) row.r.bars.push(b);
  }
  // una riga senza barra dopo un'attività è la continuazione del suo testo (titolo spezzato su due righe)
  const merged = [];
  for (const r of rows) {
    const prev = merged[merged.length - 1];
    if (r.kind === 'attivita' && !r.bars.length && prev && prev.kind === 'attivita' && r.y - prev.y < 16) { prev.text = `${prev.text} ${r.text}`; continue; }
    merged.push(r);
  }
  rows = merged;
  for (const r of rows) {
    r.from = null; r.to = null;
    if (r.bars.length) {
      const x0 = Math.min(...r.bars.map((b) => b.x0)); const x1 = Math.max(...r.bars.map((b) => b.x1));
      r.from = monthAt(x0 + step / 2).key; r.to = monthAt(x1 - step / 2).key;
    }
    r.bars = r.bars.length;
  }
  // ogni attività appartiene alla componente che la precede; la componente copre il periodo delle sue attività
  let comp = null;
  for (const r of rows) { if (r.kind === 'componente') comp = r; else { r.component = comp ? comp.text : null; if (comp) { if (r.from && (!comp.from || r.from < comp.from)) comp.from = r.from; if (r.to && (!comp.to || r.to > comp.to)) comp.to = r.to; } } }
  const months2 = months.map(({ label, x, year, month, key }) => ({ label, x, year, month, key }));
  return { years: years.map(({ year, x }) => ({ year, x })), months: months2, from: months2[0].key, to: months2[months2.length - 1].key, rows: rows.map(({ y, ...r }) => r) };
}

module.exports = { gantt };
