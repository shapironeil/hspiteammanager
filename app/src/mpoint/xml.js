'use strict';
// Lettore XML minimo (niente librerie): basta per i file di PowerPoint (DrawingML).
// parse(text) -> { name, attrs, children: [nodi | testo] }
// Aiuti: child(n, 'a:t'), children(n, 'p:sp'), find(n, 'a:t') (ricerca in profondita'), text(n).
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return ENT[e] !== undefined ? ENT[e] : m;
});

function parse(xml) {
  const root = { name: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<![^>]*>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[6] !== undefined) { if (stack.length > 1) top.children.push(decode(m[6])); continue; }
    if (m[5] !== undefined) { top.children.push(m[5]); continue; }
    if (!m[2]) continue;
    if (m[1]) { // chiusura
      while (stack.length > 1 && stack.pop().name !== m[2]) { /* tag non bilanciato: chiude fino al suo */ }
      continue;
    }
    const attrs = {};
    m[3].replace(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (x, k, a, b) => { attrs[k] = decode(a !== undefined ? a : b); });
    const node = { name: m[2], attrs, children: [] };
    top.children.push(node);
    if (!m[4]) stack.push(node);
  }
  return root.children.find((c) => typeof c === 'object') || root;
}

const isEl = (c) => c && typeof c === 'object';
const child = (n, name) => (n ? n.children.find((c) => isEl(c) && c.name === name) || null : null);
const children = (n, name) => (n ? n.children.filter((c) => isEl(c) && (!name || c.name === name)) : []);
function find(n, name) {
  if (!n) return null;
  for (const c of n.children) {
    if (!isEl(c)) continue;
    if (c.name === name) return c;
    const f = find(c, name);
    if (f) return f;
  }
  return null;
}
function findAll(n, name, out = []) {
  if (!n) return out;
  for (const c of n.children) {
    if (!isEl(c)) continue;
    if (c.name === name) out.push(c);
    findAll(c, name, out);
  }
  return out;
}
// percorso: path(n, 'p:spPr', 'a:xfrm', 'a:off')
function path(n, ...names) { let x = n; for (const k of names) { x = child(x, k); if (!x) return null; } return x; }
const text = (n) => (!n ? '' : n.children.map((c) => (isEl(c) ? text(c) : c)).join(''));

module.exports = { parse, child, children, find, findAll, path, text, decode };
