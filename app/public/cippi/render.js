// Cippi: disegno di una slide nel browser a partire dalle forme lette dal .pptx (posizioni in % della slide).
// Non e' PowerPoint: e' un'anteprima fedele nella disposizione, nei colori e nei testi, per rivedere senza aprire
// il file. Le forme diventano SVG (geometria) + testo HTML; i connettori sono linee con la freccia.
const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) e.setAttribute(k, v);
  e.append(...kids.flat().filter((k) => k != null && k !== false));
  return e;
};
const sv = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  return e;
};
const hex = (c) => (c ? `#${c}` : null);
const DASH = { dash: '6 4', sysDash: '4 3', sysDot: '1.5 2.5', dot: '1.5 3', lgDash: '10 5', dashDot: '6 3 1.5 3' };

// Geometria in un riquadro 0..100 x 0..100 (lo SVG si deforma con la forma, i bordi no)
function geometry(g) {
  switch (g) {
    case 'ellipse': case 'flowChartConnector': return ['ellipse', { cx: 50, cy: 50, rx: 50, ry: 50 }];
    case 'roundRect': case 'flowChartAlternateProcess': return ['rect', { x: 0, y: 0, width: 100, height: 100, rx: 12, ry: 20 }];
    case 'flowChartTerminator': return ['rect', { x: 0, y: 0, width: 100, height: 100, rx: 50, ry: 50 }];
    case 'flowChartDecision': case 'diamond': return ['polygon', { points: '50,0 100,50 50,100 0,50' }];
    case 'homePlate': return ['polygon', { points: '0,0 75,0 100,50 75,100 0,100' }];
    case 'chevron': return ['polygon', { points: '0,0 80,0 100,50 80,100 0,100 20,50' }];
    case 'triangle': return ['polygon', { points: '50,0 100,100 0,100' }];
    case 'rightArrow': return ['polygon', { points: '0,25 65,25 65,0 100,50 65,100 65,75 0,75' }];
    case 'leftArrow': return ['polygon', { points: '100,25 35,25 35,0 0,50 35,100 35,75 100,75' }];
    case 'hexagon': return ['polygon', { points: '20,0 80,0 100,50 80,100 20,100 0,50' }];
    case 'parallelogram': case 'flowChartInputOutput': return ['polygon', { points: '20,0 100,0 80,100 0,100' }];
    case 'flowChartDocument': return ['path', { d: 'M0 0H100V85C75 70 25 100 0 85Z' }];
    case 'flowChartMagneticDisk': case 'can': return ['path', { d: 'M0 15A50 15 0 0 1 100 15V85A50 15 0 0 1 0 85Z M0 15A50 15 0 0 0 100 15' }];
    case 'rightBrace': return ['path', { d: 'M0 0Q50 0 50 10V40Q50 50 100 50Q50 50 50 60V90Q50 100 0 100', fillNone: true }];
    case 'line': return ['line', { x1: 0, y1: 0, x2: 100, y2: 100 }];
    default: return ['rect', { x: 0, y: 0, width: 100, height: 100 }];
  }
}

function textBox(s, overrides) {
  const paras = overrides || s.paragraphs || [];
  if (!paras.some((p) => String(p.text || '').trim())) return null;
  const boxed = s.fill || (s.line && s.line.color) || (s.geom && s.geom !== 'rect');
  const box = el('div', { class: 'cp-text' + (boxed && !s.textbox ? ' center' : '') });
  for (const p of paras) {
    const size = p.size || (s.ph && /title/i.test(s.ph.type) ? 24 : 12);
    const d = el('div', { class: 'cp-p' + (p.lvl || p.bullet ? ' bullet' : '') });
    d.style.fontSize = `${(size / 540) * 100}cqh`;
    if (p.lvl) d.style.paddingLeft = `${p.lvl * 1.4}em`;
    if (p.bold) d.style.fontWeight = '700';
    if (p.italic) d.style.fontStyle = 'italic';
    if (p.color) d.style.color = `#${p.color}`;
    if (p.align === 'ctr') d.style.textAlign = 'center';
    if (p.align === 'r') d.style.textAlign = 'right';
    d.textContent = p.text || ' ';
    box.append(d);
  }
  return box;
}

// Applica i testi modificati (righe) a una forma, mantenendo lo stile del primo paragrafo
export function withTexts(shape, lines) {
  if (!lines) return null;
  const base = (shape.paragraphs || [])[0] || {};
  return lines.map((l, i) => {
    const line = typeof l === 'string' ? { text: l } : l;
    const ref = (shape.paragraphs || [])[i] || base;
    return { ...ref, text: line.text, lvl: line.lvl !== undefined ? line.lvl : ref.lvl };
  });
}

// Disegna una slide. opts: { media(name) -> url, texts: { id: righe }, geom: { id: forma }, fill: { id: colore }, onShape(shape, node) }
export function renderSlide(slide, opts = {}) {
  const root = el('div', { class: 'cp-slide' });
  root.style.aspectRatio = String(slide.ratio || 16 / 9);
  // linee in coordinate proporzionate alla slide (larghezza = 100 x rapporto), cosi' le frecce non si deformano
  const R = slide.ratio || 16 / 9;
  const lines = sv('svg', { class: 'cp-lines', viewBox: `0 0 ${100 * R} 100`, preserveAspectRatio: 'none' });
  const defs = sv('defs');
  lines.append(defs);
  const uid = Math.random().toString(36).slice(2, 8);
  const markers = new Map();
  const arrow = (color) => {
    if (!markers.has(color)) {
      const id = `cp-a-${uid}-${markers.size}`;
      const mk = sv('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 1.6, markerHeight: 1.6, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' });
      mk.append(sv('path', { d: 'M0 0L10 5L0 10z', fill: color }));
      defs.append(mk);
      markers.set(color, id);
    }
    return markers.get(color);
  };
  for (const s of slide.shapes) {
    if (s.hidden || s.x === undefined || s.kind === 'group') continue;
    if (s.kind === 'cxn' || (s.kind === 'sp' && s.geom === 'line')) {
      // percorso calcolato alla lettura (gomiti, ribaltamenti, rotazione); altrimenti diagonale del riquadro
      const pts = s.pts || [[s.flipH ? s.x + s.w : s.x, s.flipV ? s.y + s.h : s.y], [s.flipH ? s.x : s.x + s.w, s.flipV ? s.y : s.y + s.h]];
      const color = hex(s.line && s.line.color) || '#555';
      const path = sv('path', {
        d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * R).toFixed(2)} ${y.toFixed(2)}`).join(''),
        fill: 'none', stroke: color, 'stroke-width': Math.max(0.6, ((s.line && s.line.w) || 9525) / 12700),
        'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': s.line && DASH[s.line.dash],
      });
      if (s.line && s.line.tail && s.line.tail !== 'none') path.setAttribute('marker-end', `url(#${arrow(color)})`);
      if (s.line && s.line.head && s.line.head !== 'none') path.setAttribute('marker-start', `url(#${arrow(color)})`);
      lines.append(path);
      continue;
    }
    const node = el('div', { class: `cp-shape cp-${s.kind}`, 'data-id': s.id });
    Object.assign(node.style, { left: `${s.x}%`, top: `${s.y}%`, width: `${Math.max(s.w, 0.2)}%`, height: `${Math.max(s.h, 0.2)}%` });
    if (s.rot) node.style.transform = `rotate(${s.rot}deg)`;
    if (s.kind === 'sp') {
      const g = (opts.geom && opts.geom[s.id]) || s.geom;
      const [tag, attrs] = geometry(g);
      const fill = attrs.fillNone ? 'none' : hex((opts.fill && opts.fill[s.id]) || s.fill) || 'none';
      const stroke = s.line && s.line.color ? hex(s.line.color) : 'none';
      if (fill !== 'none' || stroke !== 'none') {
        const g = sv('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', class: 'cp-geom' });
        const { fillNone, ...a } = attrs;
        g.append(sv(tag, { ...a, fill, stroke, 'stroke-width': Math.max(0.8, ((s.line && s.line.w) || 9525) / 12700), 'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': s.line && DASH[s.line.dash] }));
        node.append(g);
      }
      const t = textBox({ ...s, geom: g }, opts.texts && opts.texts[s.id] ? withTexts(s, opts.texts[s.id]) : null);
      if (t) node.append(t);
    } else if (s.kind === 'pic') {
      const url = s.image && opts.media ? opts.media(s.image) : null;
      if (url && /\.(png|jpe?g|gif|svg|bmp|webp)$/i.test(s.image)) node.append(el('img', { src: url, alt: s.descr || '', loading: 'lazy', draggable: 'false' }));
      else node.append(el('div', { class: 'cp-noimg' }, 'immagine'));
    } else if (s.kind === 'table') {
      const t = el('table', { class: 'cp-table' });
      for (const r of s.rows || []) t.append(el('tr', {}, r.map((c) => el('td', {}, c))));
      node.append(t);
    } else if (s.kind === 'diagram' || s.kind === 'chart' || s.kind === 'object') {
      node.append(el('div', { class: 'cp-noimg' }, s.kind === 'diagram' ? (s.items || []).slice(0, 12).join(' · ') : s.kind === 'chart' ? 'grafico' : 'oggetto'));
    }
    if (opts.onShape) opts.onShape(s, node);
    root.append(node);
  }
  root.append(lines);
  return root;
}
