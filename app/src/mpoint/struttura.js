'use strict';
// MPoint: riconoscimenti aggiuntivi della STRUTTURA, usati da analyze.js.
//   - segnaposto del layout (piè di pagina, data, numero) che non sono contenuto;
//   - "pillole": una casella di testo trasparente appoggiata sopra una forma colorata = un'intestazione con quel colore;
//   - tabelle disegnate con le forme (righe di caselle allineate in colonne) = una tabella vera;
//   - sezioni native di PowerPoint al posto delle slide divisorie;
//   - abbinamento delle voci dell'indice (anche a due livelli) ai titoli delle slide per somiglianza;
//   - numeri nelle tabelle (importi, quantità) e controllo del totale;
//   - controlli su caratteri fuori tema e testi ridotti per entrare nella forma.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const oneLine = (s) => (s.paragraphs || []).map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim();
const hasText = (s) => s.kind === 'sp' && s.paragraphs && s.paragraphs.some((p) => p.text.trim());
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// ---- Segnaposto del layout -----------------------------------------------------------------------
// Piè di pagina, data e numero di slide ripetono il layout: non sono contenuto della slide.
const skipShape = (s) => !!(s.ph && /^(ftr|dt|sldNum)$/.test(s.ph.type));

// ---- Pillole: testo trasparente sopra una forma colorata ------------------------------------------
// Restituisce { idTesto: { fill, shape } } per le caselle di testo senza sfondo che stanno sopra una forma
// riempita senza testo (la "pillola" o il riquadro dell'intestazione).
function pillsOf(slide) {
  const shapes = slide.shapes.filter((s) => !s.hidden && s.x !== undefined);
  const filled = shapes.filter((s) => s.kind === 'sp' && s.fill && !hasText(s) && s.w > 3 && s.h > 1.5);
  const out = {};
  for (const t of shapes.filter((s) => hasText(s) && !s.fill && !skipShape(s))) {
    const area = t.w * t.h;
    if (!area) continue;
    const host = filled.map((f) => ({ f, o: overlap(t, f) / area })).filter((x) => x.o >= 0.6 && x.f.w * x.f.h <= area * 4 + 40).sort((a, b) => b.o - a.o)[0];
    if (host) out[t.id] = { fill: host.f.fill, shape: host.f.id };
  }
  return out;
}

// ---- Tabelle disegnate con le forme --------------------------------------------------------------
// items: blocchi di testo (con x, y, w, h). Righe = blocchi bassi alla stessa altezza; colonne = stesse x su più
// righe. Serve almeno una griglia 3 colonne × 2 righe o 2 colonne × 3 righe. La riga appena sopra, se ha lo stesso
// numero di celle, è l'intestazione.
function drawnTables(items) {
  const cand = items.filter((b) => b.role !== 'titolo' && b.role !== 'immagine' && b.role !== 'tabella' && b.h < 6 && String(b.text || '').length < 160);
  const rows = [];
  for (const b of [...cand].sort((a, c) => a.y - c.y || a.x - c.x)) {
    const row = rows.find((r) => Math.abs(r.y - b.y) < 2);
    if (row) row.items.push(b); else rows.push({ y: b.y, items: [b] });
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  const multi = rows.filter((r) => r.items.length >= 2);
  const sameCols = (a, b) => a.items.length === b.items.length && a.items.every((it, i) => Math.abs(it.x - b.items[i].x) < 4.5);
  const tables = []; const used = new Set();
  for (let i = 0; i < multi.length; i++) {
    if (used.has(multi[i])) continue;
    const group = [multi[i]];
    for (let j = i + 1; j < multi.length; j++) {
      if (used.has(multi[j]) || !sameCols(multi[i], multi[j])) continue;
      if (multi[j].y - group[group.length - 1].y > 14) break;
      group.push(multi[j]);
    }
    const cols = multi[i].items.length;
    if (!((cols >= 3 && group.length >= 2) || (cols >= 2 && group.length >= 3))) continue;
    // intestazione: la riga di testi appena sopra con lo stesso numero di celle (anche con x un po' diverse)
    const above = rows.filter((r) => !group.includes(r) && r.items.length === cols && r.y < group[0].y && group[0].y - r.y < 9).sort((a, b) => b.y - a.y)[0];
    const all = (above ? [above] : []).concat(group);
    // intestazione: la riga sopra, oppure la prima riga se e' tutta in grassetto o in maiuscolo
    const headerLike = (r) => r.items.every((b) => (b.paragraphs || []).some((p) => p.bold) || (String(b.text || '') === String(b.text || '').toUpperCase() && /[A-Z]/.test(String(b.text || ''))));
    const header = !!above || (group.length >= 2 && headerLike(group[0]));
    for (const r of all) used.add(r);
    const ids = all.flatMap((r) => r.items.map((b) => b.id));
    const x = Math.min(...all.flatMap((r) => r.items.map((b) => b.x))); const y = all[0].y;
    const x1 = Math.max(...all.flatMap((r) => r.items.map((b) => b.x + b.w))); const y1 = Math.max(...all.flatMap((r) => r.items.map((b) => b.y + b.h)));
    tables.push({ ids, header, rows: all.map((r) => r.items.map((b) => String(b.text || '').replace(/\s*\n\s*/g, ' ').trim())), x, y, w: x1 - x, h: y1 - y });
  }
  return { tables, used: new Set(tables.flatMap((t) => t.ids)) };
}

// ---- Sezioni native di PowerPoint -----------------------------------------------------------------
// pres.sections = [{ name, slides: [n] }] -> le sezioni di MPoint, con "section" scritto su ogni slide
function nativeSectionsOf(pres, slides) {
  const list = (pres.sections || []).filter((s) => s.slides.length);
  if (list.length < 2) return null;
  const out = list.map((s) => ({ title: s.name || `Sezione ${list.indexOf(s) + 1}`, subtitle: '', from: Math.min(...s.slides), slides: [...s.slides].sort((a, b) => a - b), native: true }));
  const bySlide = new Map();
  for (const sec of out) for (const n of sec.slides) bySlide.set(n, sec.title);
  for (const s of slides) s.section = bySlide.get(s.n) || (out[0] && out[0].title) || 'Apertura';
  return out;
}

// ---- Indice: una voce ha la sua slide? ------------------------------------------------------------
// Vale come trovata se c'è una sezione con quel nome, una slide con quel titolo, un titolo che la contiene
// ("Ambito - Gestione dei vivai" per la voce "Gestione dei vivai") o che le somiglia molto.
function similarity(a, b) {
  const A = new Set(norm(a).split(' ').filter((w) => w.length > 1)); const B = new Set(norm(b).split(' ').filter((w) => w.length > 1));
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size) - Math.abs(A.size - B.size) * 0.02;
}
function indexEntryFound(entry, slides, sections) {
  const e = norm(entry);
  if (!e) return true;
  if (sections.some((s) => norm(s.title) === e)) return true;
  for (const s of slides) {
    const t = norm(s.title);
    if (!t) continue;
    if (t === e || t.includes(e) || (e.length > 12 && e.includes(t) && t.length > 8)) return true;
    if (similarity(entry, s.title) >= 0.75 && Math.abs(t.length - e.length) < 25) return true;
  }
  return false;
}

// ---- Numeri nelle tabelle ---------------------------------------------------------------------------
// "€ 3.353.000,00" -> 3353000; "23.950" -> 23950; "72" -> 72; "3.941.900,00 €" -> 3941900; altrimenti null
function parseNumber(text) {
  let s = String(text || '').replace(/[€$£]|eur|euro/gi, '').replace(/\s+/g, '').trim();
  if (!/^[-+]?[\d.,]+%?$/.test(s) || !/\d/.test(s)) return null;
  s = s.replace(/%$/, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // formato italiano
  else if (/\.\d{1,2}$/.test(s) && !/\.\d{3}(\.|$)/.test(s)) s = s.replace(/,/g, ''); // formato inglese
  else s = s.replace(/[.,]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
// Controllo del totale: la riga che inizia con "Totale" deve essere la somma delle altre righe, colonna per colonna
function tableTotalCheck(rows) {
  if (!rows || rows.length < 3) return null;
  const totalIdx = rows.findIndex((r, i) => i > 0 && /^(tot|total|totale|somma)/i.test(String(r[0] || '').trim()));
  if (totalIdx < 1) return null;
  const total = rows[totalIdx];
  const body = rows.slice(1, totalIdx);
  const out = [];
  for (let c = 1; c < total.length; c++) {
    const expected = parseNumber(total[c]);
    if (expected === null) continue;
    const values = body.map((r) => parseNumber(r[c]));
    if (values.filter((v) => v !== null).length < 2) continue;
    const sum = values.reduce((a, v) => a + (v || 0), 0);
    out.push({ column: c, header: rows[0][c] || `colonna ${c + 1}`, expected, sum: Math.round(sum * 100) / 100, ok: Math.abs(sum - expected) < 0.015 });
  }
  return out.length ? out : null;
}

// ---- Caratteri e testi ridotti ------------------------------------------------------------------
function fontChecks(pres) {
  const out = [];
  const theme = new Set([pres.fonts && pres.fonts.major, pres.fonts && pres.fonts.minor].filter(Boolean).map((f) => f.toLowerCase()));
  const extra = (pres.fontsUsed || []).filter((f) => !theme.has(f.name.toLowerCase()) && !/^(symbol|wingdings|webdings)/i.test(f.name));
  const trial = extra.filter((f) => /\b(trial|demo|beta)\b/i.test(f.name));
  for (const f of trial) out.push({ level: 'avviso', slide: null, text: `Carattere di prova "${f.name}": sui PC senza quel carattere il testo cambia aspetto.` });
  const others = extra.filter((f) => !trial.includes(f));
  if (others.length) out.push({ level: 'info', slide: null, text: `Caratteri diversi da quelli del tema (${[pres.fonts.major, pres.fonts.minor].filter(Boolean).join(', ')}): ${others.map((f) => `${f.name} (${f.count})`).join(', ')}.` });
  return out;
}
function overflowChecks(pres) {
  const out = [];
  for (const s of pres.slides) {
    const small = s.shapes.filter((x) => x.fontScale && x.fontScale < 1 && !skipShape(x));
    if (small.length) out.push({ level: small.some((x) => x.fontScale <= 0.8) ? 'avviso' : 'info', slide: s.n, text: `Testo ridotto da PowerPoint per entrare nella forma (${small.map((x) => `${Math.round(x.fontScale * 100)}%`).join(', ')}): forse c'è troppo testo.` });
  }
  return out;
}

module.exports = { skipShape, pillsOf, drawnTables, nativeSectionsOf, indexEntryFound, similarity, parseNumber, tableTotalCheck, fontChecks, overflowChecks, norm };
