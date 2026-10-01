'use strict';
// Cippi: dalla presentazione letta (pptx-read.js) alla sua STRUTTURA.
//
// Il metodo segue il modo in cui il team legge questi documenti (gli appunti di studio di un flusso To-Be):
//   1. prima il contesto (obiettivi, risultati), poi LEGENDA e GLOSSARIO delle sigle;
//   2. la mappa dei processi (Business Process Breakdown);
//   3. ogni processo passo per passo: chi fa cosa (corsie), le decisioni (Si/No), i sistemi (SAP, Archiflow),
//      i rimandi ad altri processi, le note;
//   4. il confronto To-Be / As-Is dello stesso processo (il Back Up contiene gli As-Is con gli stessi codici).
//
// Per ogni slide: tipo (copertina, indice, divisore, testo, legenda, flusso, mappa, scheda, tabella, schema, piano,
// organigramma, numeri, chiusura), titolo, blocchi nell'ordine in cui si leggono con il loro livello gerarchico.
// Per il documento: sezioni (native di PowerPoint, dai capitoli dell'indice o dai divisori), legenda dei colori,
// flussi ricostruiti (grafo), glossario, punti chiave, controlli di completezza, modello.
//
// Il secondo modo di leggere viene dalle presentazioni di kick-off e dalle offerte (ATAC Data Platform, ERP
// Governance): copertina con data, indice numerato, contesto, obiettivi, approccio, piano (Gantt disegnato con le
// forme), team (organigramma), punti di attenzione, numeri in evidenza e tabelle disegnate con le forme.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const textOf = (s) => (s.paragraphs || []).map((p) => p.text).join('\n').trim();
const oneLine = (s) => textOf(s).replace(/\s*\n\s*/g, ' ').trim();
const cx = (s) => s.x + s.w / 2;
// distanza di un punto dal segmento di un collegamento (x0,y0)-(x1,y1)
function segDist(p, e) {
  const dx = e.x1 - e.x0; const dy = e.y1 - e.y0;
  const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - e.x0) * dx + (p.y - e.y0) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(e.x0 + t * dx - p.x, e.y0 + t * dy - p.y);
}
const cy = (s) => s.y + s.h / 2;
const inside = (p, s, pad = 0) => p.x >= s.x - pad && p.x <= s.x + s.w + pad && p.y >= s.y - pad && p.y <= s.y + s.h + pad;
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
// parole in comune tra due testi (0..1, rispetto al piu' corto)
function similarity(a, b) {
  const A = new Set(norm(a).split(' ').filter((w) => w.length > 1)); const B = new Set(norm(b).split(' ').filter((w) => w.length > 1));
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size) - Math.abs(A.size - B.size) * 0.02;
}
// distanza di modifica tra due testi (per i refusi: "KPI" / "KIP")
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
// quanto una voce dell'indice somiglia a un titolo: uguale (1), uno contiene l'altro (0.9), stesse parole, oppure
// un refuso di una o due lettere (typo = true)
function closeness(entry, title) {
  const a = norm(entry); const b = norm(title);
  if (!a || !b) return { score: 0, typo: false };
  if (a === b) return { score: 1, typo: false };
  if (a.length >= 6 && (b.startsWith(a) || a.startsWith(b))) return { score: 0.9, typo: false };
  const wa = a.split(' '); const wb = b.split(' ');
  const d = levenshtein(a, b);
  // stesso numero di parole e una o due lettere diverse: refuso. Una parola in piu' o in meno no.
  if (wa.length === wb.length && d <= Math.max(1, Math.round(Math.max(a.length, b.length) * 0.12))) return { score: 0.85, typo: true };
  const sim = similarity(a, b);
  if (sim >= 0.6) {
    const typo = wa.length === wb.length && wa.some((w, i) => w !== wb[i] && levenshtein(w, wb[i]) <= 2);
    return { score: Math.min(0.84, sim), typo };
  }
  if (wa.length !== wb.length && d <= 4 && Math.min(a.length, b.length) > 12) return { score: 0.8, typo: false };
  return { score: sim, typo: false };
}
const MONTH_LABEL = /^(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic|jan|jun|jul|aug|sep|oct|dec)[a-z]*\.?$|^q[1-4]$|^(19|20)\d\d$|^[mw]\d{1,2}$/i;
const BIG_NUMBER = /^[€$£]?\s*[+-]?\d[\d.,]*\s*(%|\+|k|m|mln|mld|€|gg|fte)?$/i;
const PLACEHOLDER = /^(x{3,}|tbd|tbc|to ?do|n\/?d|lorem ipsum.*|\[[^\]]*(inserire|insert|nome|cliente|data|titolo)[^\]]*\]|<[^>]+>|da (completare|definire|inserire|compilare)|nome (del )?cliente|0[+%k])$/i;
const PARTS = /^(.*?)\s*\((\d+)\s*\/\s*(\d+)\)\s*$/;
const INDEX_WORD = /^(indice|agenda|sommario|index|contents|indice dei contenuti|table of contents|argomenti)$/i;
const MONTHS = /(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|january|february|march|april|may|june|july|august|september|october|november|december)\s*,?\s*\d{4}/i;
const CODE = /(\d+(?:\.\d+)+)/;
const STEP_NUM = /^(\d+)\s*\.(?!\d)\s*/;

// ---- Colori: tinta e saturazione, per confrontare i riempimenti con la legenda --------------
function hsl(hex) {
  if (!hex || !/^[0-9A-F]{6}$/i.test(hex)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
const colorful = (hex) => { const c = hsl(hex); return !!c && c.s > 0.25 && c.l < 0.97; };
function sameTint(a, b) {
  const x = hsl(a); const y = hsl(b);
  if (!x || !y || x.s < 0.25 || y.s < 0.25) return false;
  const dh = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h));
  return dh < 22;
}

// ---- Testi e blocchi ------------------------------------------------------------------------
// numero di slide: il segnaposto, oppure un numerino piccolo in un angolo (un "59" grande al centro e' un dato)
function isSlideNumber(s) { return (s.ph && s.ph.type === 'sldNum') || (/^\d{1,3}$/.test(oneLine(s)) && maxSize(s) <= 16 && (s.y < 12 || s.y > 85 || s.x > 85) && s.w < 15); }
function isBack(s) { return /^(back|indietro|torna)$/i.test(oneLine(s)) && (/arrow/i.test(s.geom || '') || s.w < 8); }
const textShapes = (slide) => slide.shapes.filter((s) => !s.hidden && s.kind === 'sp' && s.paragraphs && s.paragraphs.some((p) => p.text.trim()) && s.x !== undefined);
const maxSize = (s) => Math.max(0, ...(s.paragraphs || []).map((p) => p.size || 0));

function findTitle(slide) {
  const cands = textShapes(slide).filter((s) => !isSlideNumber(s) && !isBack(s));
  const ph = cands.find((s) => s.ph && /title/i.test(s.ph.type));
  if (ph) return ph;
  // una forma chiamata "Title"/"Titolo" in alto: e' il titolo anche se non e' un segnaposto
  const named = cands.find((s) => /^(title|titolo)\b/i.test(s.name || '') && s.y < 20 && oneLine(s).length < 200);
  if (named) return named;
  // in alto (entro il 14% della slide), il testo piu' grande; a pari merito il piu' largo e il piu' in alto
  // (le etichette delle corsie, strette a sinistra, non sono titoli)
  const top = cands.filter((s) => s.y < 14 && s.h < 20 && oneLine(s).length < 200 && !(s.x < 10 && s.w < 14));
  top.sort((a, b) => ((b.w >= 20) - (a.w >= 20)) || (maxSize(b) - maxSize(a)) || (a.y - b.y) || (b.w - a.w));
  return top[0] || null;
}

// Ordine di lettura: a righe (dall'alto), dentro la riga da sinistra; un blocco che occupa una colonna intera
// viene letto prima di quello accanto se parte piu' in alto.
function readingOrder(items) {
  const rows = [];
  for (const it of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.find((r) => Math.abs(r.y - it.y) < 2.5);
    if (row) row.items.push(it); else rows.push({ y: it.y, items: [it] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

function roleOf(s, title, slide) {
  const t = oneLine(s);
  const ps = s.paragraphs.filter((p) => p.text.trim());
  if (s === title) return 'titolo';
  if (/borderCallout|wedge/i.test(s.geom || '') || (s.line && /dash|dot/i.test(s.line.dash || '') && sameTint(s.line.color, 'FFC000'))) return 'nota';
  if (ps.length > 1 && ps.some((p) => p.lvl > 0 || p.bullet)) return 'elenco';
  if (ps.length === 1 && t.length < 70 && (ps[0].bold || (s.fill && colorful(s.fill) && s.w > 12))) return 'intestazione';
  if (title && maxSize(s) && maxSize(title) && maxSize(s) >= maxSize(title) * 0.8 && s.y < 30 && t.length < 120) return 'sottotitolo';
  if (t.length < 40 && s.w < 15) return 'etichetta';
  return ps.length > 1 ? 'elenco' : 'paragrafo';
}
const LEVEL = { titolo: 0, sottotitolo: 1, intestazione: 1, paragrafo: 2, elenco: 2, tabella: 2, immagine: 3, nota: 3, etichetta: 3, schema: 2 };

function blocksOf(slide, title) {
  const items = [];
  for (const s of slide.shapes) {
    if (s.hidden || s.x === undefined) continue;
    if (s.kind === 'sp' && s.paragraphs && s.paragraphs.some((p) => p.text.trim())) {
      if (isSlideNumber(s)) continue;
      if (isBack(s)) { items.push({ id: s.id, role: 'navigazione', text: oneLine(s), x: s.x, y: s.y, w: s.w, h: s.h }); continue; }
      const role = roleOf(s, title, slide);
      items.push({ id: s.id, role, text: textOf(s), paragraphs: s.paragraphs.filter((p) => p.text.trim()).map((p) => ({ text: p.text, lvl: p.lvl, bold: p.bold })), x: s.x, y: s.y, w: s.w, h: s.h });
    } else if (s.kind === 'table') {
      items.push({ id: s.id, role: 'tabella', rows: s.rows, text: s.rows.map((r) => r.join(' · ')).join('\n'), x: s.x, y: s.y, w: s.w, h: s.h });
    } else if (s.kind === 'diagram') {
      items.push({ id: s.id, role: 'schema', text: (s.items || []).join('\n'), x: s.x, y: s.y, w: s.w, h: s.h });
    } else if (s.kind === 'pic' && s.w * s.h > 40) {
      items.push({ id: s.id, role: 'immagine', text: s.descr || '', image: s.image, x: s.x, y: s.y, w: s.w, h: s.h });
    }
  }
  return readingOrder(items).map((b, i) => ({ ...b, order: i + 1, level: LEVEL[b.role] !== undefined ? LEVEL[b.role] : 2 }));
}

// ---- Legenda dei flussi ---------------------------------------------------------------------
// Una voce = un simbolo (forma senza testo, colorata o tratteggiata) + l'etichetta accanto, sulla stessa riga.
function legendOf(slide) {
  const shapes = slide.shapes.filter((s) => !s.hidden && s.x !== undefined && s.kind === 'sp');
  const labels = shapes.filter((s) => oneLine(s) && !isSlideNumber(s) && s.w > 8 && oneLine(s).length < 90 && !/^legenda/i.test(oneLine(s)));
  const entries = [];
  for (const sym of shapes) {
    if (oneLine(sym) || sym.w > 12 || sym.h > 10) continue;
    const label = labels.filter((l) => l.x > sym.x + sym.w - 1 && l.x - (sym.x + sym.w) < 6 && Math.abs(cy(l) - cy(sym)) < 2.2).sort((a, b) => a.x - b.x)[0];
    if (!label) continue;
    const text = oneLine(label);
    const meaning = /nuov|introdott|aggiunt/i.test(text) ? 'nuovo' : /modific|variat/i.test(text) ? 'modificato' : /not[ae]|rilevant|commento/i.test(text) ? 'nota'
      : /critic|impatt|rischi/i.test(text) ? 'criticita' : /fuori|perimetro/i.test(text) ? 'fuori-perimetro' : /altro flusso|dettagliat/i.test(text) ? 'rimando' : 'altro';
    entries.push({ label: text, fill: sym.fill || null, line: sym.line ? sym.line.color : null, dash: sym.line ? sym.line.dash : null, geom: sym.geom, meaning });
  }
  return entries;
}

// ---- Flussi (swimlane) ----------------------------------------------------------------------
const FLOW_TITLE = /^(.*?)(to[\s-]?be|as[\s-]?is)?\s*:\s*(\d+(?:\.\d+)+)\s+(.*?)\s*(?:\((\d+)\s*\/\s*(\d+)\))?\s*$/i;
function parseFlowTitle(t) {
  const m = FLOW_TITLE.exec(String(t || '').replace(/\s+/g, ' '));
  if (!m) return null;
  const variant = /as[\s-]?is/i.test(m[2] || m[1] || '') ? 'As-Is' : /to[\s-]?be/i.test(m[2] || m[1] || '') ? 'To-Be' : null;
  return { prefix: (m[1] || '').trim(), variant, scenario: /evolutiv/i.test(m[1] || '') ? 'evolutivo' : null, code: m[3], name: m[4].trim(), part: m[5] ? Number(m[5]) : 1, parts: m[6] ? Number(m[6]) : 1 };
}

function nodeType(s, t) {
  const g = s.geom || '';
  if (/^start$/i.test(t) || g === 'homePlate') return 'inizio';
  if (/^(end|fine)$/i.test(t) || g === 'flowChartTerminator') return 'fine';
  if (/Decision|diamond/i.test(g)) return 'decisione';
  if (/MagneticDisk|can$/i.test(g)) return 'sistema';
  if (/^[A-Z]$/.test(t) && /ellipse|flowChartConnector|OffpageConnector/i.test(g)) return 'connettore';
  if (/borderCallout|wedge/i.test(g)) return 'nota';
  if (s.line && /dash|dot/i.test(s.line.dash || '') && !STEP_NUM.test(t)) return 'nota';
  // "4.1.2.2 Emissione ..." = rimando a un altro processo; "4. Avvio ..." = step
  if (/^\d+(\.\d+)+\s/.test(t) || (CODE.test(t) && !STEP_NUM.test(t) && t.length < 60 && s.line && s.line.w > 15000)) return 'rimando';
  // testo libero senza bordo e senza sfondo: commento appoggiato a una freccia
  if (!s.fill && !(s.line && s.line.color) && !STEP_NUM.test(t)) return 'annotazione';
  return 'step';
}

function flowOf(slide, legend, title) {
  const shapes = slide.shapes.filter((s) => !s.hidden && s.x !== undefined);
  const texts = shapes.filter((s) => s.kind === 'sp' && oneLine(s) && s !== title && !isSlideNumber(s) && !isBack(s));
  // corsie: rettangoli stretti a sinistra, alti, con il nome dell'attore
  const lanes = texts.filter((s) => s.x < 10 && s.w < 14 && s.h > 6 && oneLine(s).length < 80)
    .sort((a, b) => a.y - b.y).map((s) => ({ id: s.id, name: oneLine(s), y0: s.y, y1: s.y + s.h }));
  const laneIds = new Set(lanes.map((l) => l.id));
  const labels = texts.filter((s) => /^(si|sì|no|yes)$/i.test(oneLine(s)));
  const labelIds = new Set(labels.map((s) => s.id));
  const raw = texts.filter((s) => !laneIds.has(s.id) && !labelIds.has(s.id) && !(s.y < 12 && s.w > 40))
    .map((s) => ({ s, t: oneLine(s) }));
  // doppioni (stessa forma copiata sopra l'altra): si tiene quella in primo piano, i collegamenti valgono per entrambe
  const alias = {};
  const nodes = [];
  for (const { s, t } of raw.sort((a, b) => b.s.z - a.s.z)) {
    const twin = nodes.find((n) => n.text === t && Math.abs(n.cx - cx(s)) < 1.5 && Math.abs(n.cy - cy(s)) < 1.5);
    if (twin) { alias[s.id] = twin.id; continue; }
    const type = nodeType(s, t);
    const num = type === 'rimando' ? null : STEP_NUM.exec(t);
    nodes.push({ id: s.id, type, text: t, num: num ? Number(num[1]) : null, label: num ? t.slice(num[0].length) : t, fill: s.fill || null, cx: cx(s), cy: cy(s), x: s.x, y: s.y, w: s.w, h: s.h, z: s.z });
  }
  const real = (id) => alias[id] || id;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    const lane = lanes.find((l) => n.cy >= l.y0 && n.cy <= l.y1);
    n.lane = lane ? lane.name : null;
    // stato dal colore, come dice la legenda della presentazione
    if (n.type === 'step' || n.type === 'decisione') {
      const hit = legend.find((e) => e.fill && sameTint(e.fill, n.fill) && (e.meaning === 'nuovo' || e.meaning === 'modificato'));
      n.status = hit ? hit.meaning : 'invariato';
    }
    if (n.type === 'rimando') n.code = (CODE.exec(n.text) || [])[1] || null;
  }
  // sistemi (SAP, Archiflow, ...) appoggiati a uno step
  const steps = nodes.filter((n) => n.type === 'step' || n.type === 'decisione' || n.type === 'inizio');
  for (const sys of nodes.filter((n) => n.type === 'sistema')) {
    const host = steps.map((n) => ({ n, d: overlap(sys, n) > 0 ? 0 : Math.hypot(n.cx - sys.cx, n.cy - sys.cy) }))
      .filter((x) => x.d < 9).sort((a, b) => a.d - b.d)[0];
    if (host) { host.n.systems = host.n.systems || []; if (!host.n.systems.includes(sys.text)) host.n.systems.push(sys.text); sys.attachedTo = host.n.id; }
  }
  // collegamenti: dai connettori (forma di partenza e di arrivo); se mancano, dalle estremita' della linea
  const nearest = (p) => {
    const c = nodes.filter((n) => n.type !== 'sistema' && n.type !== 'nota').map((n) => ({ n, d: inside(p, n, 0.8) ? 0 : Math.hypot(Math.max(n.x - p.x, 0, p.x - n.x - n.w), Math.max(n.y - p.y, 0, p.y - n.y - n.h)) }))
      .filter((x) => x.d < 2).sort((a, b) => a.d - b.d)[0];
    return c ? c.n.id : null;
  };
  const edges = [];
  for (const c of shapes.filter((s) => s.kind === 'cxn')) {
    let from = c.from ? real(c.from) : null;
    let to = c.to ? real(c.to) : null;
    const p0 = { x: c.flipH ? c.x + c.w : c.x, y: c.flipV ? c.y + c.h : c.y };
    const p1 = { x: c.flipH ? c.x : c.x + c.w, y: c.flipV ? c.y : c.y + c.h };
    if (!from || !byId[from]) from = nearest(p0);
    if (!to || !byId[to]) to = nearest(p1);
    // freccia disegnata al contrario (punta all'inizio della linea)
    if (c.line && c.line.head !== 'none' && c.line.tail === 'none') [from, to] = [to, from];
    if (!from || !to || from === to) continue;
    if (!byId[from] || !byId[to] || byId[from].type === 'sistema' || byId[to].type === 'sistema') continue;
    edges.push({ from, to, x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y });
  }
  // etichette Si/No: vicino all'inizio del collegamento che esce da una decisione
  for (const l of labels) {
    const p = { x: cx(l), y: cy(l) };
    const e = edges.filter((x) => byId[x.from] && byId[x.from].type === 'decisione' && !x.label)
      .map((x) => ({ x, d: Math.min(segDist(p, x), Math.hypot(byId[x.from].cx - p.x, byId[x.from].cy - p.y) * 0.9) })).sort((a, b) => a.d - b.d)[0];
    if (e && e.d < 7) e.x.label = /^no$/i.test(oneLine(l)) ? 'No' : 'Si';
  }
  const uniq = new Map();
  for (const e of edges) { const k = `${e.from}>${e.to}`; if (!uniq.has(k) || (e.label && !uniq.get(k).label)) uniq.set(k, e); }
  const E = [...uniq.values()].map(({ from, to, label }) => ({ from, to, label: label || null }));
  return {
    lanes: lanes.map(({ name, y0, y1 }) => ({ name, y0, y1 })),
    nodes: nodes.sort((a, b) => (a.num || 999) - (b.num || 999) || a.y - b.y || a.x - b.x).map(({ z, ...n }) => n),
    edges: E,
  };
}

// ---- Tabelle disegnate con le forme ------------------------------------------------------------
// Una tabella "a mano": caselle di testo allineate in colonne (stessa x) e righe (stessa y), almeno 3 x 3.
// Restituisce intestazione, righe e intestazioni di riga (le etichette a sinistra della prima colonna).
function clusters(values, tol) {
  const out = [];
  for (const v of [...values].sort((a, b) => a.k - b.k)) {
    const c = out[out.length - 1];
    if (c && v.k - c.k0 < tol) c.items.push(v); else out.push({ k0: v.k, items: [v] });
  }
  return out;
}
function gridOf(slide, title) {
  const cells = textShapes(slide).filter((s) => s !== title && !isSlideNumber(s) && !isBack(s) && s.h < 30 && s.w < 55 && oneLine(s).length < 220);
  if (cells.length < 9) return null;
  const cols = clusters(cells.map((s) => ({ k: s.x, s })), 1.6).filter((c) => c.items.length >= 3);
  const rows = clusters(cells.map((s) => ({ k: s.y, s })), 1.6).filter((c) => c.items.length >= 3);
  if (cols.length < 3 || rows.length < 3) return null;
  const colOf = (s) => cols.findIndex((c) => c.items.some((x) => x.s === s));
  const rowOf = (s) => rows.findIndex((r) => r.items.some((x) => x.s === s));
  const matrix = rows.map(() => cols.map(() => ''));
  const ids = rows.map(() => cols.map(() => null));
  let filled = 0;
  for (const s of cells) {
    const c = colOf(s); const r = rowOf(s);
    if (c < 0 || r < 0 || matrix[r][c]) continue;
    matrix[r][c] = oneLine(s); ids[r][c] = s.id; filled++;
  }
  if (filled < rows.length * cols.length * 0.6) return null;
  // la tabella deve occupare una parte seria della slide, non essere un gruppo di etichette
  const x0 = Math.min(...cols.map((c) => c.k0)); const x1 = Math.max(...cols.flatMap((c) => c.items.map((x) => x.s.x + x.s.w)));
  if (x1 - x0 < 35) return null;
  const rowHeaders = rows.map((r) => {
    const y0 = Math.min(...r.items.map((x) => x.s.y)); const y1 = Math.max(...r.items.map((x) => x.s.y + x.s.h));
    const left = textShapes(slide).filter((s) => s !== title && colOf(s) < 0 && s.x + s.w <= x0 + 1 && cy(s) >= y0 - 1 && cy(s) <= y1 + 1 && oneLine(s).length < 80).sort((a, b) => b.x - a.x)[0];
    return left ? oneLine(left) : '';
  });
  return { header: matrix[0], rows: matrix.slice(1), rowHeaders, ids, cols: cols.length, filled };
}

// Organigramma: riquadri colorati con un ruolo, collegati da linee, con i nomi accanto (senza sfondo)
function isOrgChart(slide, info, texts, cxns) {
  const boxes = texts.filter((s) => s.fill && colorful(s.fill) && oneLine(s).length < 40 && s.w > 8 && !STEP_NUM.test(oneLine(s)));
  const names = texts.filter((s) => !s.fill && (s.paragraphs || []).filter((p) => p.text.trim()).length >= 2 && (s.paragraphs || []).every((p) => p.text.trim().length < 40));
  const keyword = /\b(team|organigramma|organizzazione|struttura (di|del) progetto|governance (di|del) progetto|comitat[oi]|steering|ruoli)\b/i.test(info.title);
  return (keyword && boxes.length >= 3 && (cxns >= 2 || names.length >= 2)) || (boxes.length >= 4 && cxns >= 3 && names.length >= 2 && !info.flowTitle);
}
// Piano (Gantt disegnato): una riga di etichette di mesi/trimestri/anni
function monthRow(texts) {
  const months = texts.filter((s) => MONTH_LABEL.test(oneLine(s)));
  const rows = clusters(months.map((s) => ({ k: s.y, s })), 3);
  const best = rows.sort((a, b) => b.items.length - a.items.length)[0];
  return best ? best.items.map((x) => oneLine(x.s)) : [];
}

// ---- Tipo di slide ---------------------------------------------------------------------------
function kindOf(slide, info, i, total) {
  const texts = textShapes(slide).filter((s) => !isSlideNumber(s));
  const words = texts.map(oneLine).join(' ');
  const pics = slide.shapes.filter((s) => s.kind === 'pic' && !s.hidden);
  const cxns = slide.shapes.filter((s) => s.kind === 'cxn').length;
  const title = info.title || '';
  const bigPic = pics.some((p) => p.w * p.h > 2500);
  const contacts = /(tel|fax)\s*[:.]|sede (legale|operativa)|www\.|@\w+\./i.test(words);
  if (/^legenda/i.test(title) || (/legenda/i.test(words) && info.legend.length >= 2)) return 'legenda';
  // indice: la parola "Indice" (titolo o scritta) e un elenco di voci
  const indexWord = INDEX_WORD.test(title) || texts.some((s) => INDEX_WORD.test(oneLine(s)));
  const listBlocks = info.blocks.filter((b) => (b.paragraphs || []).filter((p) => p.text.trim()).length >= 3).length;
  if (indexWord && (listBlocks || texts.length >= 4 || /index/i.test(slide.layout))) return 'indice';
  if (info.flowTitle && cxns >= 4) return 'flusso';
  if (cxns >= 8 && texts.filter((s) => /^\d+\s*\./.test(oneLine(s))).length >= 3) return 'flusso';
  if (/process breakdown|mappa dei processi|bpb/i.test(title)) return 'mappa';
  if ((i >= total - 3 || i >= total * 0.6) && contacts && texts.length <= 10) return 'chiusura';
  if (i >= total - 3 && !texts.length && pics.length) return 'chiusura';
  if (i === total - 1 && i > 2 && texts.length <= 2 && words.length < 40) return 'chiusura';
  // copertina: il layout lo dice, oppure la prima slide con una grande immagine e la data
  if (i === 0 && (/copertina|title slide|diapositiva titolo|cover|titolo$/i.test(slide.layout) || (bigPic && MONTHS.test(words)) || (!texts.length && pics.length))) return 'copertina';
  if (i <= 1 && !texts.length && pics.length) return 'copertina';
  if (i <= 2 && texts.length <= 6 && MONTHS.test(words)) return 'titolo';
  if (i <= 1 && texts.length <= 3 && words.length < 120 && texts.some((s) => maxSize(s) >= 28)) return 'titolo';
  // divisore: layout di sezione, o una grande immagine con poco testo (ma non una slide con il titolo "normale")
  if ((/section|divider|sezione/i.test(slide.layout) || (bigPic && !info.titleCommon)) && texts.length <= 4 && (words.length < 160 || texts.some((s) => maxSize(s) >= 28))) return 'divisore';
  // divisore senza immagine: una o due scritte grandi e poco altro
  if (i > 1 && texts.length <= 2 && words.length < 90 && texts.some((s) => maxSize(s) >= 28) && !info.flowTitle && !info.titleCommon) return 'divisore';
  if (!texts.length && pics.length) return i <= 1 ? 'copertina' : 'immagine';
  // piano (Gantt): una riga di mesi, o il titolo lo dice e c'e' un'immagine grande
  if (info.months.length >= 4 || (/piano|masterplan|gantt|roadmap|timeline|cronoprogramma|calendario/i.test(title) && (info.months.length >= 2 || bigPic))) return 'piano';
  if (isOrgChart(slide, info, texts, cxns)) return 'organigramma';
  // numeri in evidenza: almeno due numeri grandi
  if (texts.filter((s) => BIG_NUMBER.test(oneLine(s)) && maxSize(s) >= 30).length >= 2) return 'numeri';
  const table = slide.shapes.find((s) => s.kind === 'table');
  if (table && table.w * table.h > 2500) return 'tabella';
  if (info.grid) return 'tabella';
  if (bigPic && texts.length <= 3) return 'immagine';
  const heads = info.blocks.filter((b) => b.role === 'intestazione').length;
  if (cxns >= 6) return 'schema';
  if (heads >= 4) return 'scheda';
  if (slide.shapes.filter((s) => /chevron|homePlate/i.test(s.geom || '')).length >= 4) return 'schema';
  return 'testo';
}

// ---- Glossario ---------------------------------------------------------------------------------
const STOP = new Set(['SI', 'NO', 'OK', 'END', 'START', 'IT', 'TO', 'BE', 'AS', 'IS', 'DI', 'IL', 'LA', 'UN', 'PER', 'NON', 'BY',
  'GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC', 'JAN', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'DEC']);
// L'espansione e' buona se le iniziali delle sue parole contengono, in ordine, le lettere della sigla
// ("CDR - Centro di Responsabilita'", "DAC (Determina a contrarre)").
function fitsAcronym(acr, words) {
  const ini = String(words).split(/[\s'’-]+/).filter(Boolean).map((w) => w[0].toLowerCase());
  const letters = acr.replace(/[^A-Z]/g, '').toLowerCase().split('');
  if (!ini.length || ini[0] !== letters[0]) return false;
  let i = 0;
  for (const c of ini) if (c === letters[i]) i++;
  return i === letters.length;
}
function glossaryOf(slides) {
  const count = new Map(); const def = new Map(); const lower = new Set();
  const all = [];
  for (const s of slides) for (const sh of s.shapes) all.push(sh.kind === 'table' ? sh.rows.flat().join('\n') : textOf(sh));
  for (const t of all) for (const m of t.matchAll(/\b([A-Za-zÀ-ú]{2,7})\b/g)) if (/[a-zà-ú]/.test(m[1])) lower.add(m[1].toUpperCase());
  for (const t of all) {
    for (const m of t.matchAll(/\b([A-Z][A-Z0-9]{1,6}(?:\/[A-Z]{2,6})?)\b/g)) {
      const k = m[1];
      // una parola qualunque scritta in maiuscolo (APERTO, ROMA) non e' una sigla
      if (STOP.has(k) || /^\d/.test(k) || (!k.includes('/') && lower.has(k))) continue;
      count.set(k, (count.get(k) || 0) + 1);
    }
    // sigle con minuscole dentro: CdS, PagoPA, AppIO, S4HANA
    for (const m of t.matchAll(/\b([A-Z][a-z]{0,3}[A-Z][A-Za-z0-9]{0,4})\b/g)) {
      const k = m[1];
      if (k.length < 3 || !/[a-z]/.test(k) || lower.has(k.toUpperCase())) continue;
      count.set(k, (count.get(k) || 0) + 1);
    }
    for (const m of t.matchAll(/\b([A-Z]{2,6})\s*(?:[-–:=]|\()\s*([A-Za-zÀ-ú][^()\n.;:]{3,80})/g)) {
      const words = m[2].replace(/\)$/, '').trim();
      const cut = words.split(/\s+/);
      for (let n = cut.length; n >= 1; n--) { const w = cut.slice(0, n).join(' '); if (fitsAcronym(m[1], w)) { if (!def.has(m[1])) def.set(m[1], w); break; } }
    }
    for (const m of t.matchAll(/((?:[A-Za-zÀ-ú'’]+\s+){0,6}[A-Za-zÀ-ú'’]+)\s*\(([A-Z]{2,6})\)/g)) {
      const cut = m[1].trim().split(/\s+/);
      for (let n = 1; n <= cut.length; n++) { const w = cut.slice(cut.length - n).join(' '); if (fitsAcronym(m[2], w)) { if (!def.has(m[2])) def.set(m[2], w); break; } }
    }
  }
  return [...count.entries()].filter(([k, n]) => n >= 2 || def.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 80)
    .map(([term, n]) => ({ term, count: n, meaning: def.get(term) || '' }));
}

// ---- Analisi completa ------------------------------------------------------------------------
function analyze(pres) {
  const total = pres.slides.length;
  let legend = [];
  const legendSlide = pres.slides.find((s) => { const t = findTitle(s); return t && /^legenda/i.test(oneLine(t)); });
  if (legendSlide) legend = legendOf(legendSlide);

  // lo stile "normale" del titolo (posizione e dimensione piu' frequenti): una slide che ce l'ha e' una slide di
  // contenuto, anche se ha una grande immagine e poco testo (non e' un divisore)
  const titles = pres.slides.map(findTitle);
  const keyOf = (t) => (t ? `${Math.round(t.y / 3)}|${Math.round(maxSize(t) || 0)}` : null);
  const keyCount = new Map();
  for (const t of titles) if (t) keyCount.set(keyOf(t), (keyCount.get(keyOf(t)) || 0) + 1);
  const commonKey = [...keyCount.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([k]) => k)[0] || null;

  const slides = pres.slides.map((s, i) => {
    const t = titles[i];
    const title = t ? oneLine(t) : '';
    const blocks = blocksOf(s, t);
    const texts = textShapes(s).filter((x) => !isSlideNumber(x));
    const info = { title, blocks, legend: s === legendSlide ? legend : [], flowTitle: parseFlowTitle(title), titleCommon: !!t && keyOf(t) === commonKey, grid: gridOf(s, t), months: monthRow(texts) };
    const kind = kindOf(s, info, i, total);
    const out = { n: s.n, kind, title, layout: s.layout, hidden: s.hidden, notes: s.notes, fonts: s.fonts || [], blocks };
    if (kind === 'flusso') { out.flow = flowOf(s, legend, t); out.flowInfo = info.flowTitle; }
    if (kind === 'legenda') out.legend = legendOf(s);
    if (kind === 'tabella' && info.grid) out.table = { header: info.grid.header, rows: info.grid.rows, rowHeaders: info.grid.rowHeaders, ids: info.grid.ids };
    if (kind === 'piano') out.months = info.months;
    if (kind === 'indice') {
      out.entries = blocks.filter((b) => !['titolo', 'immagine', 'navigazione'].includes(b.role) && !INDEX_WORD.test(b.text)).flatMap((b) => (b.paragraphs || [{ text: b.text }]).map((p) => p.text.trim()))
        .filter((x) => x && x.length < 140 && !INDEX_WORD.test(x)).map((x) => x.replace(/^\d+[.)]\s*/, ''));
    }
    return out;
  });

  // Indice: ogni voce abbinata alla slide con il titolo piu' vicino (dopo l'indice, in ordine)
  const index = slides.find((s) => s.kind === 'indice' && (s.entries || []).length >= 2);
  const indexMatches = [];
  if (index) {
    let pos = index.n;
    for (const e of index.entries) {
      const cands = slides.filter((s) => s.n > pos && s.title).map((s) => ({ s, ...closeness(e, s.title) }));
      const best = cands.sort((a, b) => b.score - a.score || a.s.n - b.s.n)[0];
      if (best && best.score >= 0.6) { indexMatches.push({ entry: e, slide: best.s.n, title: best.s.title, score: best.score, typo: best.typo }); pos = best.s.n; }
      else {
        // forse e' prima (ordine diverso) o e' un refuso
        const any = slides.filter((s) => s.n > index.n && s.title).map((s) => ({ s, ...closeness(e, s.title) })).sort((a, b) => b.score - a.score)[0];
        indexMatches.push({ entry: e, slide: any && any.score >= 0.6 ? any.s.n : null, title: any && any.score >= 0.5 ? any.s.title : null, score: any ? any.score : 0, typo: !!(any && any.typo), outOfOrder: !!(any && any.score >= 0.6) });
      }
    }
  }

  // Sezioni: native di PowerPoint se ci sono; altrimenti i capitoli dell'indice (quando non ci sono divisori);
  // altrimenti i divisori, abbinati alle voci dell'indice
  const sections = [];
  let sectionsSource = 'divisori';
  const hasDividers = slides.some((s) => s.kind === 'divisore');
  if ((pres.sections || []).some((x) => x.slides.length)) {
    sectionsSource = 'native';
    const owner = new Map();
    for (const sec of pres.sections) for (const n of sec.slides) owner.set(n, sec.name || `Sezione ${sections.length + 1}`);
    let cur = null;
    for (const s of slides) {
      const name = owner.get(s.n) || (cur ? cur.title : 'Apertura');
      if (!cur || cur.title !== name) { cur = { title: name, from: s.n, slides: [] }; sections.push(cur); }
      s.section = cur.title;
      cur.slides.push(s.n);
    }
  } else if (index && !hasDividers && indexMatches.filter((m) => m.slide && !m.outOfOrder).length >= 2) {
    sectionsSource = 'indice';
    const starts = new Map(indexMatches.filter((m) => m.slide && !m.outOfOrder).map((m) => [m.slide, m.entry]));
    let cur = { title: 'Apertura', from: 1, slides: [] };
    for (const s of slides) {
      if (starts.has(s.n)) { if (cur.slides.length) sections.push(cur); cur = { title: starts.get(s.n), from: s.n, slides: [] }; }
      s.section = cur.title;
      cur.slides.push(s.n);
    }
    sections.push(cur);
  } else {
    let cur = { title: 'Apertura', from: 1, slides: [] };
    for (const s of slides) {
      if (s.kind === 'divisore') {
        if (cur.slides.length) sections.push(cur);
        const words = s.blocks.filter((b) => b.role !== 'immagine').map((b) => b.text.replace(/\s*\n\s*/g, ' ')).filter(Boolean);
        // la voce dell'indice piu' simile al testo del divisore (parole in comune), preferendo quelle non ancora usate
        const used = new Set(sections.map((x) => x.title).concat(cur.title));
        const best = index ? index.entries.map((e) => ({ e, sc: similarity(e, words.join(' ')) - (used.has(e) ? 0.2 : 0) })).sort((a, b) => b.sc - a.sc)[0] : null;
        const match = best && best.sc >= 0.5 ? best.e : null;
        cur = { title: match || words[0] || `Sezione ${sections.length + 1}`, subtitle: words.filter((w) => w !== (match || words[0])).join(' · '), from: s.n, slides: [] };
      }
      s.section = cur.title;
      cur.slides.push(s.n);
    }
    sections.push(cur);
  }

  // Processi: le parti (1/3, 2/3...) dello stesso codice e variante insieme
  const processes = new Map();
  for (const s of slides.filter((x) => x.kind === 'flusso')) {
    const fi = s.flowInfo || { code: null, name: s.title, variant: null, part: 1, parts: 1 };
    const key = `${fi.code || s.title}|${fi.variant || ''}|${fi.scenario || ''}`;
    if (!processes.has(key)) processes.set(key, { code: fi.code, name: fi.name, variant: fi.variant, scenario: fi.scenario, parts: fi.parts, slides: [], section: s.section });
    processes.get(key).slides.push(s.n);
  }
  const procList = [...processes.values()].map((p) => {
    const flows = p.slides.map((n) => slides[n - 1].flow);
    const nodes = flows.flatMap((f) => f.nodes);
    const steps = nodes.filter((x) => x.type === 'step' || x.type === 'decisione');
    const sys = {};
    for (const x of steps) for (const k of x.systems || []) sys[k] = (sys[k] || 0) + 1;
    return {
      ...p,
      lanes: [...new Set(flows.flatMap((f) => f.lanes.map((l) => l.name)))],
      steps: steps.length,
      decisions: nodes.filter((x) => x.type === 'decisione').length,
      systems: sys,
      new: steps.filter((x) => x.status === 'nuovo').map((x) => x.text),
      changed: steps.filter((x) => x.status === 'modificato').map((x) => x.text),
      links: [...new Set(nodes.filter((x) => x.type === 'rimando' && x.code).map((x) => x.code))],
      notes: nodes.filter((x) => x.type === 'nota').map((x) => x.text),
    };
  });

  // To-Be contro As-Is dello stesso codice (passi per testo, senza il numero)
  const comparisons = [];
  const stepKey = (t) => norm(String(t).replace(/^\d+\s*\.\s*/, ''));
  for (const tb of procList.filter((p) => p.variant === 'To-Be' && p.code)) {
    const ai = procList.find((p) => p.variant === 'As-Is' && p.code === tb.code);
    if (!ai) continue;
    const textsOf = (p) => p.slides.flatMap((n) => slides[n - 1].flow.nodes).filter((x) => x.type === 'step' || x.type === 'decisione').map((x) => x.text);
    const a = textsOf(ai); const b = textsOf(tb);
    const ka = new Set(a.map(stepKey)); const kb = new Set(b.map(stepKey));
    comparisons.push({
      code: tb.code, name: tb.name, toBe: tb.slides, asIs: ai.slides,
      added: b.filter((t) => !ka.has(stepKey(t))), removed: a.filter((t) => !kb.has(stepKey(t))),
      lanesAdded: tb.lanes.filter((l) => !ai.lanes.includes(l)), lanesRemoved: ai.lanes.filter((l) => !tb.lanes.includes(l)),
    });
  }

  const glossary = glossaryOf(pres.slides);
  // caratteri usati: per ogni carattere, le slide; "di base" = del tema o usato in almeno meta' delle slide
  const fontsUsed = {};
  for (const s of slides) for (const f of s.fonts) (fontsUsed[f] = fontsUsed[f] || []).push(s.n);
  const checks = checksOf(slides, sections, index, procList, { indexMatches, fontsUsed, themeFonts: pres.fonts || {} });
  const keyPoints = keyPointsOf(slides, procList, comparisons, sections);
  const counts = {};
  for (const s of slides) counts[s.kind] = (counts[s.kind] || 0) + 1;
  return {
    meta: pres.meta, size: { width: pres.width, height: pres.height, ratio: pres.ratio, widthCm: pres.widthCm, heightCm: pres.heightCm },
    theme: pres.theme, themeName: pres.themeName || '', fonts: pres.fonts, fontsUsed, layouts: pres.layouts, masters: pres.masters || [],
    slides, sections, sectionsSource, nativeSections: (pres.sections || []).map((x) => x.name),
    index: index ? { slide: index.n, entries: index.entries, matches: indexMatches } : null, legend, processes: procList, comparisons,
    glossary, checks, keyPoints, counts, score: scoreOf(checks, slides),
    reading: readingPath(slides, sections, procList, comparisons, legend, glossary),
  };
}

// ---- Controlli (completezza e coerenza) --------------------------------------------------------
function checksOf(slides, sections, index, procs, extra = {}) {
  const out = [];
  const add = (level, slide, text) => out.push({ level, slide, text });
  if (!slides.some((s) => s.kind === 'titolo' || s.kind === 'copertina')) add('avviso', null, 'Manca una slide di titolo (cliente, titolo, data).');
  if (!index && slides.length > 8) add('avviso', null, 'Manca l\'indice: con più di 8 slide aiuta a orientarsi.');
  if (index) {
    for (const m of extra.indexMatches || []) {
      const inSections = sections.some((s) => closeness(m.entry, s.title).score >= 0.85);
      if (m.slide && !m.typo) continue;
      if (m.typo && m.title) add('avviso', m.slide || index.slide, `Voce dell'indice "${m.entry}": il titolo più vicino è "${m.title}" (slide ${m.slide || '?'}), forse un refuso.`);
      else if (!m.slide && !inSections) add('avviso', index.slide, `Voce dell'indice senza slide: "${m.entry}".`);
    }
    for (const s of sections.slice(1)) if (!index.entries.some((e) => closeness(e, s.title).score >= 0.85)) add('info', s.from, `Sezione non presente nell'indice: "${s.title}" (va bene per le sottosezioni).`);
  }
  for (const s of slides) {
    if (!s.title && !['copertina', 'chiusura', 'divisore', 'immagine', 'titolo', 'indice'].includes(s.kind)) add('avviso', s.n, 'Slide senza titolo.');
    if (s.hidden) add('info', s.n, 'Slide nascosta: non compare in presentazione.');
    // testi segnaposto rimasti da compilare (xxxxxx, TBD, [inserire nome cliente], 0+)
    const left = new Set();
    for (const b of s.blocks) for (const p of b.paragraphs || [{ text: b.text }]) { const t = String(p.text || '').trim(); if (t && PLACEHOLDER.test(t)) left.add(t); }
    for (const t of left) add('avviso', s.n, `Testo segnaposto da compilare: "${t}".`);
  }
  // parti numerate nei titoli: "Catalogo (1/3)", "(2/3)", "(3/3)"
  const parts = new Map();
  for (const s of slides.filter((x) => x.kind !== 'flusso')) {
    const m = PARTS.exec(s.title || '');
    if (!m) continue;
    const k = norm(m[1]);
    if (!parts.has(k)) parts.set(k, { title: m[1].trim(), total: Number(m[3]), seen: [], first: s.n });
    parts.get(k).seen.push(Number(m[2]));
  }
  for (const p of parts.values()) {
    const missing = Array.from({ length: p.total }, (_, i) => i + 1).filter((n) => !p.seen.includes(n));
    const dup = p.seen.filter((n, i) => p.seen.indexOf(n) !== i);
    if (missing.length) add('errore', p.first, `"${p.title}": trovate ${p.seen.length} parti su ${p.total} (manca la ${missing.map((n) => `${n}/${p.total}`).join(', ')}).`);
    if (dup.length) add('avviso', p.first, `"${p.title}": la parte ${[...new Set(dup)].map((n) => `${n}/${p.total}`).join(', ')} compare più volte.`);
  }
  // caratteri fuori tema: non del tema e usati in poche slide (quelli usati quasi ovunque sono la base di fatto)
  const used = extra.fontsUsed || {};
  const base = new Set([extra.themeFonts.major, extra.themeFonts.minor].filter(Boolean));
  for (const [f, ns] of Object.entries(used)) if (ns.length >= Math.max(2, slides.length / 2)) base.add(f);
  // le varianti (Poppins SemiBold) contano come il carattere di base
  const isBase = (f) => base.has(f) || [...base].some((b) => f.startsWith(b + ' '));
  const odd = Object.entries(used).filter(([f]) => !isBase(f) && !/wingdings|webdings|symbol|emoji|mdl2|icons/i.test(f)).sort((a, b) => b[1].length - a[1].length);
  if (odd.length) add('info', null, `Caratteri fuori tema (${[...base].join(', ') || 'tema'}): ${odd.slice(0, 6).map(([f, ns]) => `${f} (slide ${[...new Set(ns)].slice(0, 6).join(', ')})`).join('; ')}${odd.length > 6 ? '; …' : ''}.`);
  if (slides.some((s) => s.kind === 'flusso') && !slides.some((s) => s.kind === 'legenda')) add('avviso', null, 'Ci sono flussi ma manca la legenda dei simboli e dei colori.');
  // parti numerate (1/3, 2/3, 3/3)
  for (const p of procs) {
    if (p.parts > 1 && p.slides.length !== p.parts) add('errore', p.slides[0], `${p.code || ''} ${p.name}: trovate ${p.slides.length} parti su ${p.parts}.`);
  }
  // flussi
  const codes = new Set(procs.map((p) => p.code).filter(Boolean));
  for (const s of slides.filter((x) => x.kind === 'flusso')) {
    const f = s.flow;
    const steps = f.nodes.filter((n) => n.num !== null);
    const nums = steps.map((n) => n.num).sort((a, b) => a - b);
    const dup = nums.filter((n, i) => nums[i - 1] === n);
    if (dup.length) add('errore', s.n, `Numeri di step ripetuti: ${[...new Set(dup)].join(', ')}.`);
    for (let i = 1; i < nums.length; i++) if (nums[i] - nums[i - 1] > 1) add('info', s.n, `Numerazione degli step salta da ${nums[i - 1]} a ${nums[i]}.`);
    const out1 = (id) => f.edges.filter((e) => e.from === id);
    const in1 = (id) => f.edges.filter((e) => e.to === id);
    for (const n of f.nodes.filter((x) => x.type === 'decisione')) {
      const o = out1(n.id);
      if (o.length < 2) add('avviso', s.n, `Decisione "${n.text}" con ${o.length} uscita: ne servono almeno due (Si / No).`);
      else if (o.some((e) => !e.label)) add('info', s.n, `Decisione "${n.text}": manca l'etichetta Si/No su un'uscita.`);
    }
    for (const n of f.nodes.filter((x) => x.type === 'step')) {
      if (!in1(n.id).length && !out1(n.id).length) add('avviso', s.n, `Step "${n.text}" non collegato a nulla.`);
    }
    if (!f.lanes.length) add('info', s.n, 'Flusso senza corsie (chi fa cosa).');
    for (const l of f.lanes) if (!f.nodes.some((n) => n.lane === l.name)) add('info', s.n, `Corsia "${l.name}" senza attività.`);
    for (const r of f.nodes.filter((x) => x.type === 'rimando' && x.code)) {
      if (!codes.has(r.code)) add('info', s.n, `Rimanda al processo ${r.code}, che non è in questa presentazione.`);
    }
  }
  return out;
}
function scoreOf(checks, slides) {
  const pen = checks.reduce((a, c) => a + (c.level === 'errore' ? 4 : c.level === 'avviso' ? 2 : 0.3), 0);
  return Math.max(0, Math.min(100, Math.round(100 - (pen / Math.max(4, slides.length)) * 25)));
}

// ---- Punti chiave ------------------------------------------------------------------------------
function keyPointsOf(slides, procs, comparisons, sections) {
  const pts = [];
  const add = (slide, text, kind = 'chiave') => pts.push({ slide, text, kind });
  for (const s of slides) {
    if (s.kind === 'testo' || s.kind === 'scheda') {
      // frasi con parti in grassetto: sono quelle che l'autore voleva far notare
      // (al massimo 4 per slide: i punti chiave devono restare pochi)
      let n = 0;
      for (const b of s.blocks) for (const p of b.paragraphs || []) if (p.bold && p.text.length > 25 && b.role !== 'titolo' && b.role !== 'intestazione' && n < 4) { add(s.n, p.text); n++; }
    }
    if (s.kind === 'flusso' && s.flow) for (const n of s.flow.nodes.filter((x) => x.type === 'nota')) add(s.n, n.text, 'nota');
    if (s.kind === 'numeri') {
      // ogni numero grande con l'etichetta sotto
      const big = s.blocks.filter((b) => BIG_NUMBER.test(b.text.trim()));
      const items = big.map((b) => {
        const label = s.blocks.filter((o) => o !== b && !BIG_NUMBER.test(o.text.trim()) && o.y >= b.y + b.h - 1 && o.y < b.y + b.h + 12 && Math.abs(o.x + o.w / 2 - (b.x + b.w / 2)) < Math.max(b.w, o.w) / 2)
          .sort((p, q) => p.y - q.y).slice(0, 2).map((o) => o.text.replace(/\s*\n\s*/g, ' ')).join(', ');
        return `${b.text.trim()}${label ? ` ${label}` : ''}`;
      });
      if (items.length) add(s.n, `${s.title ? s.title + ': ' : 'Numeri: '}${items.join(' · ')}.`);
    }
    if (s.kind === 'piano') {
      const phases = s.blocks.filter((b) => b.role !== 'titolo' && /^(fase|phase|sprint|wp|f\d|attivit|rilascio|milestone)/i.test(b.text.trim()) && b.text.length < 80).map((b) => b.text.replace(/\s*\n\s*/g, ' ').trim());
      const m = s.months || [];
      add(s.n, `${s.title || 'Piano'}: ${m.length ? `da ${m[0]} a ${m[m.length - 1]} (${m.length} periodi)` : 'calendario'}${phases.length ? `; ${[...new Set(phases)].slice(0, 6).join('; ')}` : ''}.`);
    }
    if (s.kind === 'organigramma') {
      // solo i ruoli (i riquadri colorati), non i nomi delle persone
      const roles = s.blocks.filter((b) => b.role === 'intestazione').map((b) => b.text.replace(/\s*\n\s*/g, ' ').trim());
      if (roles.length) add(s.n, `${s.title || 'Team'}: ${[...new Set(roles)].slice(0, 8).join(' · ')}.`);
    }
    if (s.kind === 'tabella' && s.table) {
      add(s.n, `${s.title || 'Tabella'}: ${s.table.header.filter(Boolean).length} colonne (${s.table.header.filter(Boolean).join(' · ')}), ${s.table.rows.length} righe.`);
    }
  }
  for (const p of procs) {
    const sys = Object.entries(p.systems).map(([k, n]) => `${k} (${n})`).join(', ');
    const what = [`${p.steps} step`, `${p.decisions} decisioni`, p.lanes.length ? `attori: ${p.lanes.join(', ')}` : null, sys ? `sistemi: ${sys}` : null].filter(Boolean).join(' · ');
    add(p.slides[0], `${p.variant ? p.variant + ' ' : ''}${p.code || ''} ${p.name}: ${what}.`, 'processo');
    if (p.new.length) add(p.slides[0], `${p.code || p.name}: ${p.new.length} step nuovi (${p.new.slice(0, 4).join('; ')}${p.new.length > 4 ? '; …' : ''}).`, 'novita');
    if (p.changed.length) add(p.slides[0], `${p.code || p.name}: ${p.changed.length} step modificati rispetto all'As-Is (${p.changed.slice(0, 4).join('; ')}${p.changed.length > 4 ? '; …' : ''}).`, 'novita');
  }
  for (const c of comparisons) {
    if (c.added.length || c.removed.length) add(c.toBe[0], `${c.code} ${c.name}, To-Be contro As-Is: ${c.added.length} step in più, ${c.removed.length} in meno${c.lanesAdded.length ? `; nuovi attori: ${c.lanesAdded.join(', ')}` : ''}.`, 'confronto');
  }
  return pts;
}

// ---- Percorso di lettura (come negli appunti di studio) ---------------------------------------
function readingPath(slides, sections, procs, comparisons, legend, glossary) {
  const steps = [];
  const ctx = slides.filter((s) => s.kind === 'testo' && sections[0] && (s.section === sections[0].title || s.section === (sections[1] || {}).title)).map((s) => s.n).slice(0, 4);
  if (ctx.length) steps.push({ title: 'Contesto: obiettivi e risultati', slides: ctx });
  const leg = slides.filter((s) => s.kind === 'legenda').map((s) => s.n);
  if (leg.length || glossary.length) steps.push({ title: 'Legenda e sigle', slides: leg, note: glossary.slice(0, 8).map((g) => g.term).join(', ') });
  const maps = slides.filter((s) => s.kind === 'mappa').map((s) => s.n);
  if (maps.length) steps.push({ title: 'Mappa dei processi', slides: maps });
  for (const p of procs.filter((x) => x.variant !== 'As-Is')) {
    const cmp = comparisons.find((c) => c.code === p.code && p.variant === 'To-Be');
    steps.push({ title: `${p.code ? p.code + ' ' : ''}${p.name}${p.scenario ? ' (scenario evolutivo)' : ''}`, slides: p.slides, compare: cmp ? cmp.asIs : null, note: cmp ? 'Confronta con l\'As-Is' : null });
  }
  const plan = slides.filter((s) => s.kind === 'piano').map((s) => s.n);
  if (plan.length) steps.push({ title: 'Piano e milestone', slides: plan });
  const team = slides.filter((s) => s.kind === 'organigramma').map((s) => s.n);
  if (team.length) steps.push({ title: 'Team e ruoli', slides: team });
  const nums = slides.filter((s) => s.kind === 'numeri' || s.kind === 'tabella').map((s) => s.n);
  if (nums.length) steps.push({ title: 'Numeri e tabelle', slides: nums });
  const rest = slides.filter((s) => s.kind === 'scheda').map((s) => s.n);
  if (rest.length) steps.push({ title: 'Schede di dettaglio', slides: rest });
  return steps;
}

// ---- Modello (template) ------------------------------------------------------------------------
// La "ricetta" della presentazione: in che ordine si presentano le parti, quali blocchi ha ogni tipo di slide
// e dove stanno, quante volte una parte si ripete. Serve per crearne una nuova e per misurare la completezza.
function templateOf(analysis) {
  const parts = [];
  for (const s of analysis.slides) {
    const last = parts[parts.length - 1];
    const sig = `${s.kind}|${s.section === (last && last.section) ? '' : s.section}`;
    if (last && last.kind === s.kind && last.section === s.section) { last.max += 1; last.examples.push(s.n); continue; }
    parts.push({
      kind: s.kind, section: s.section, layout: s.layout, min: 1, max: 1, examples: [s.n], sig,
      title: s.kind === 'flusso' && s.flowInfo ? `${s.flowInfo.prefix ? s.flowInfo.prefix + ' ' : ''}${s.flowInfo.variant || ''}: <codice> <nome processo>`.replace(/\s+:/, ':') : s.title,
      blocks: s.blocks.filter((b) => b.role !== 'navigazione').map((b) => ({ role: b.role, level: b.level, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), sample: String(b.text || '').slice(0, 80) })),
    });
  }
  return {
    size: analysis.size, theme: analysis.theme, fonts: analysis.fonts,
    sections: analysis.sections.map((s) => s.title),
    legend: analysis.legend,
    parts: parts.map(({ sig, ...p }) => p),
    expects: [...new Set(analysis.slides.map((s) => s.kind))],
  };
}

// Quanto e' completo un documento rispetto a un modello: parti presenti nell'ordine giusto, sezioni, legenda
function compareToTemplate(analysis, tpl) {
  const kinds = analysis.slides.map((s) => s.kind);
  const missing = []; const present = [];
  let pos = 0;
  for (const p of tpl.parts.filter((x) => !['immagine'].includes(x.kind))) {
    const at = kinds.indexOf(p.kind, pos);
    if (at === -1) missing.push(p); else { present.push(p); pos = at + 1; }
  }
  const secMissing = tpl.sections.slice(1).filter((t) => !analysis.sections.some((s) => norm(s.title) === norm(t)));
  const total = tpl.parts.length + tpl.sections.length;
  const ok = present.length + (tpl.sections.length - secMissing.length);
  return {
    percent: total ? Math.round((ok / total) * 100) : 100,
    missingParts: missing.map((p) => ({ kind: p.kind, section: p.section, title: p.title, example: p.examples[0] })),
    missingSections: secMissing,
    legend: tpl.legend.length ? !!analysis.legend.length : null,
  };
}

module.exports = { analyze, templateOf, compareToTemplate, parseFlowTitle, norm, closeness, similarity };
