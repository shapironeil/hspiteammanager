'use strict';
// Lettura del testo di un PDF senza librerie: pagine nell'ordine del documento, righe di testo con posizione e
// dimensione del carattere, titolo di ogni pagina. Serve a Cippi per gli appunti in PDF e per il controllo
// "il PDF esportato corrisponde al PowerPoint?".
//
// Copre i PDF che escono da PowerPoint, Word e dalle stampanti virtuali: oggetti diretti e negli object stream
// (PDF 1.5+), flussi compressi FlateDecode (anche con predittore PNG), caratteri semplici (WinAnsi, con le
// Differences) e composti (Type0/Identity-H con la mappa ToUnicode), testi nei Form XObject. Le immagini non si
// leggono. Un PDF cifrato viene rifiutato con un messaggio chiaro.
// E' codice puro, senza accesso al portale: puo' girare anche nel motore di HSPI Client.
const zlib = require('node:zlib');

// ---- Oggetti --------------------------------------------------------------------------------------
const WS = /[\s\0]/;
const DELIM = /[()<>[\]{}/%]/;
class Ref { constructor(num, gen) { this.num = num; this.gen = gen; } }
class Name { constructor(name) { this.name = name; } }
const isName = (v, n) => v instanceof Name && (n === undefined || v.name === n);

// Analizzatore di oggetti PDF su una stringa latin1 (ogni byte = un carattere)
class Parser {
  constructor(str, pos = 0) { this.s = str; this.p = pos; }
  skip() {
    for (;;) {
      while (this.p < this.s.length && WS.test(this.s[this.p])) this.p++;
      if (this.s[this.p] === '%') { while (this.p < this.s.length && this.s[this.p] !== '\n' && this.s[this.p] !== '\r') this.p++; } else return;
    }
  }
  token() {
    this.skip();
    if (this.p >= this.s.length) return null;
    const c = this.s[this.p];
    if (c === '<') { if (this.s[this.p + 1] === '<') { this.p += 2; return { t: '<<' }; } return this.hexString(); }
    if (c === '>') { if (this.s[this.p + 1] === '>') { this.p += 2; return { t: '>>' }; } this.p++; return { t: '>' }; }
    if (c === '[' || c === ']' || c === '{' || c === '}') { this.p++; return { t: c }; }
    if (c === '(') return this.literalString();
    if (c === '/') { this.p++; const st = this.p; while (this.p < this.s.length && !WS.test(this.s[this.p]) && !DELIM.test(this.s[this.p])) this.p++; return { t: 'name', v: this.s.slice(st, this.p).replace(/#([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))) }; }
    const st = this.p;
    while (this.p < this.s.length && !WS.test(this.s[this.p]) && !DELIM.test(this.s[this.p])) this.p++;
    if (this.p === st) { this.p++; return { t: 'kw', v: c }; }
    const w = this.s.slice(st, this.p);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) return { t: 'num', v: Number(w) };
    return { t: 'kw', v: w };
  }
  hexString() {
    this.p++;
    const st = this.p;
    const end = this.s.indexOf('>', st);
    const hex = this.s.slice(st, end < 0 ? this.s.length : end).replace(/[^0-9A-Fa-f]/g, '');
    this.p = end < 0 ? this.s.length : end + 1;
    return { t: 'str', v: Buffer.from(hex.length % 2 ? hex + '0' : hex, 'hex') };
  }
  literalString() {
    this.p++;
    let depth = 1; const out = [];
    while (this.p < this.s.length) {
      const c = this.s[this.p++];
      if (c === '\\') {
        const n = this.s[this.p++];
        if (n === 'n') out.push(10); else if (n === 'r') out.push(13); else if (n === 't') out.push(9); else if (n === 'b') out.push(8); else if (n === 'f') out.push(12);
        else if (n >= '0' && n <= '7') { let o = n; for (let k = 0; k < 2 && this.s[this.p] >= '0' && this.s[this.p] <= '7'; k++) o += this.s[this.p++]; out.push(parseInt(o, 8) & 255); }
        else if (n === '\r') { if (this.s[this.p] === '\n') this.p++; } else if (n === '\n') { /* continuazione */ } else out.push(n.charCodeAt(0));
      } else if (c === '(') { depth++; out.push(40); } else if (c === ')') { depth--; if (!depth) break; out.push(41); } else out.push(c.charCodeAt(0));
    }
    return { t: 'str', v: Buffer.from(out) };
  }
  // un oggetto completo (numero, nome, stringa, array, dizionario, riferimento, parola chiave)
  object(tok = this.token()) {
    if (!tok) return undefined;
    if (tok.t === 'num') {
      // "n g R" = riferimento
      const save = this.p;
      const t2 = this.token();
      if (t2 && t2.t === 'num' && Number.isInteger(tok.v) && Number.isInteger(t2.v)) {
        const save2 = this.p;
        const t3 = this.token();
        if (t3 && t3.t === 'kw' && t3.v === 'R') return new Ref(tok.v, t2.v);
        this.p = save2;
      }
      this.p = save;
      return tok.v;
    }
    if (tok.t === 'str') return tok.v;
    if (tok.t === 'name') return new Name(tok.v);
    if (tok.t === '[') { const arr = []; for (;;) { const t = this.token(); if (!t || t.t === ']') break; if (t.t === '>>' || t.t === '}') continue; arr.push(this.object(t)); } return arr; }
    if (tok.t === '<<') {
      const d = {};
      for (;;) {
        const t = this.token();
        if (!t || t.t === '>>') break;
        if (t.t !== 'name') { this.object(t); continue; }
        d[t.v] = this.object();
      }
      return d;
    }
    if (tok.t === 'kw') { if (tok.v === 'true') return true; if (tok.v === 'false') return false; if (tok.v === 'null') return null; return { kw: tok.v }; }
    return null;
  }
}

// ---- Filtri ----------------------------------------------------------------------------------------
function inflate(buf) {
  try { return zlib.inflateSync(buf); } catch { /* prova le alternative */ }
  try { return zlib.inflateRawSync(buf); } catch { /* flusso troncato */ }
  try { return zlib.inflateSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH }); } catch { return Buffer.alloc(0); }
}
function unpredict(buf, parms) {
  const pred = Number(parms.Predictor || 1);
  if (pred < 10) return buf;
  const colors = Number(parms.Colors || 1); const bpc = Number(parms.BitsPerComponent || 8); const columns = Number(parms.Columns || 1);
  const bpp = Math.ceil((colors * bpc) / 8); const rowLen = Math.ceil((colors * bpc * columns) / 8);
  const rows = Math.floor(buf.length / (rowLen + 1));
  const out = Buffer.alloc(rows * rowLen);
  let prev = Buffer.alloc(rowLen);
  for (let r = 0; r < rows; r++) {
    const ft = buf[r * (rowLen + 1)];
    const row = Buffer.from(buf.subarray(r * (rowLen + 1) + 1, (r + 1) * (rowLen + 1)));
    for (let i = 0; i < rowLen; i++) {
      const a = i >= bpp ? row[i - bpp] : 0; const b = prev[i]; const c = i >= bpp ? prev[i - bpp] : 0;
      if (ft === 1) row[i] = (row[i] + a) & 255;
      else if (ft === 2) row[i] = (row[i] + b) & 255;
      else if (ft === 3) row[i] = (row[i] + ((a + b) >> 1)) & 255;
      else if (ft === 4) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); row[i] = (row[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
    }
    row.copy(out, r * rowLen);
    prev = row;
  }
  return out;
}
function decodeStream(dict, raw, resolve) {
  let filters = resolve(dict.Filter);
  if (!filters) return raw;
  if (!Array.isArray(filters)) filters = [filters];
  let parms = resolve(dict.DecodeParms) || resolve(dict.DP) || {};
  if (!Array.isArray(parms)) parms = [parms];
  let data = raw;
  filters.forEach((f, i) => {
    const name = f instanceof Name ? f.name : '';
    const pr = resolve(parms[i]) || {};
    if (name === 'FlateDecode' || name === 'Fl') data = unpredict(inflate(data), pr);
    else if (name === 'ASCIIHexDecode' || name === 'AHx') data = Buffer.from(data.toString('latin1').replace(/>.*$/s, '').replace(/[^0-9A-Fa-f]/g, ''), 'hex');
    else if (name === 'ASCII85Decode' || name === 'A85') data = ascii85(data);
    else if (name === 'LZWDecode' || name === 'LZW') data = lzw(data, Number(pr.EarlyChange === undefined ? 1 : pr.EarlyChange));
    else data = null; // immagini (DCT, JPX, CCITT): non servono per il testo
  });
  return data;
}
function ascii85(buf) {
  const s = buf.toString('latin1').replace(/^<~/, '').replace(/~>.*$/s, '').replace(/\s/g, '');
  const out = [];
  for (let i = 0; i < s.length; i += 5) {
    let chunk = s.slice(i, i + 5);
    if (chunk === 'z') { out.push(0, 0, 0, 0); continue; }
    const pad = 5 - chunk.length; chunk += 'uuuu'.slice(0, pad);
    let v = 0;
    for (const c of chunk) v = v * 85 + (c.charCodeAt(0) - 33);
    const b = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    out.push(...b.slice(0, 4 - pad));
  }
  return Buffer.from(out);
}
function lzw(buf, early) {
  const out = []; let dict = []; let codeLen = 9; let prev = null; let bitBuf = 0; let bits = 0;
  const reset = () => { dict = Array.from({ length: 256 }, (_, i) => [i]); dict.push(null, null); codeLen = 9; prev = null; };
  reset();
  for (let i = 0; i < buf.length;) {
    while (bits < codeLen && i < buf.length) { bitBuf = (bitBuf << 8) | buf[i++]; bits += 8; }
    if (bits < codeLen) break;
    const code = (bitBuf >> (bits - codeLen)) & ((1 << codeLen) - 1); bits -= codeLen;
    if (code === 256) { reset(); continue; }
    if (code === 257) break;
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code]; else if (prev) entry = [...prev, prev[0]]; else break;
    out.push(...entry);
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length + (early ? 1 : 0) >= (1 << codeLen) && codeLen < 12) codeLen++;
  }
  return Buffer.from(out);
}

// ---- Documento -------------------------------------------------------------------------------------
function readPdf(buf) {
  const s = buf.toString('latin1');
  if (!/^%PDF-/.test(s.slice(0, 1024))) throw Object.assign(new Error('Non è un file PDF.'), { status: 400 });
  // oggetti diretti: l'ultima definizione vince (aggiornamenti incrementali)
  const offsets = new Map();
  for (const m of s.matchAll(/(?:^|[\s>\]])(\d+)\s+(\d+)\s+obj\b/g)) offsets.set(Number(m[1]), m.index + m[0].length);
  const cache = new Map();
  const inStreams = new Map(); // oggetti negli object stream: num -> { text, pos }
  let streamsScanned = false;
  const resolve = (v, depth = 0) => (v instanceof Ref && depth < 32 ? resolve(getObj(v.num), depth + 1) : v);
  function parseAt(pos) {
    const p = new Parser(s, pos);
    const obj = p.object();
    p.skip();
    if (s.startsWith('stream', p.p) && obj && typeof obj === 'object' && !Array.isArray(obj)) {
      let st = p.p + 6;
      if (s[st] === '\r') st++;
      if (s[st] === '\n') st++;
      let len = resolve(obj.Length);
      if (typeof len !== 'number' || len < 0 || st + len > s.length || !/\s*endstream/.test(s.slice(st + len, st + len + 20))) {
        const e = s.indexOf('endstream', st);
        len = (e < 0 ? s.length : e) - st;
        while (len > 0 && (s[st + len - 1] === '\n' || s[st + len - 1] === '\r')) len--;
      }
      const raw = buf.subarray(st, st + len);
      return { dict: obj, raw, get data() { return decodeStream(obj, raw, resolve); } };
    }
    return obj;
  }
  function scanObjectStreams() {
    streamsScanned = true;
    for (const [num] of offsets) {
      const o = getObj(num);
      if (!o || !o.dict || !isName(o.dict.Type, 'ObjStm')) continue;
      const data = o.data;
      if (!data) continue;
      const text = data.toString('latin1');
      const n = Number(resolve(o.dict.N) || 0); const first = Number(resolve(o.dict.First) || 0);
      const head = text.slice(0, first).trim().split(/\s+/).map(Number);
      for (let i = 0; i < n * 2; i += 2) if (!offsets.has(head[i]) && !inStreams.has(head[i])) inStreams.set(head[i], { text, pos: first + head[i + 1] });
    }
  }
  function getObj(num) {
    if (cache.has(num)) return cache.get(num);
    cache.set(num, null); // contro i cicli
    let v = null;
    if (offsets.has(num)) { try { v = parseAt(offsets.get(num)); } catch { v = null; } }
    else {
      if (!streamsScanned) scanObjectStreams();
      const e = inStreams.get(num);
      if (e) { try { v = new Parser(e.text, e.pos).object(); } catch { v = null; } }
    }
    cache.set(num, v);
    return v;
  }
  // trailer: /Root (anche nei flussi xref), altrimenti il catalogo si cerca
  let root = null; let info = null;
  for (const m of s.matchAll(/trailer\s*<</g)) { try { const d = new Parser(s, m.index + 7).object(); if (d && d.Encrypt) throw Object.assign(new Error('Il PDF è protetto da password: Cippi non può leggerlo.'), { status: 415 }); if (d && d.Root) root = d.Root; if (d && d.Info) info = d.Info; } catch (err) { if (err.status) throw err; } }
  if (!root) {
    for (const [num] of offsets) { const o = getObj(num); if (o && o.dict && isName(o.dict.Type, 'XRef')) { if (o.dict.Encrypt) throw Object.assign(new Error('Il PDF è protetto da password: Cippi non può leggerlo.'), { status: 415 }); if (o.dict.Root) root = o.dict.Root; if (o.dict.Info) info = o.dict.Info; } }
  }
  let catalog = resolve(root);
  if (!catalog || !catalog.Pages) {
    scanObjectStreams();
    for (const num of [...offsets.keys(), ...inStreams.keys()]) { const o = getObj(num); if (o && !o.dict && isName(o.Type, 'Catalog')) { catalog = o; break; } }
  }
  if (!catalog || !catalog.Pages) throw Object.assign(new Error('Non trovo le pagine del PDF.'), { status: 400 });
  // pagine in ordine, con le proprieta' ereditate
  const pages = [];
  const seen = new Set();
  (function walk(ref, inherited, depth) {
    if (depth > 60) return;
    const key = ref instanceof Ref ? ref.num : null;
    if (key !== null) { if (seen.has(key)) return; seen.add(key); }
    const node = resolve(ref);
    if (!node || typeof node !== 'object') return;
    const inh = { Resources: node.Resources || inherited.Resources, MediaBox: node.MediaBox || inherited.MediaBox };
    if (isName(node.Type, 'Pages') || (node.Kids && !isName(node.Type, 'Page'))) for (const k of resolve(node.Kids) || []) walk(k, inh, depth + 1);
    else if (isName(node.Type, 'Page') || node.Contents) pages.push({ node, ...inh });
  })(catalog.Pages, {}, 0);

  const fontCache = new Map();
  const out = pages.map((pg, i) => extractPage(pg, i + 1, resolve, fontCache));
  const meta = resolve(info) || {};
  const str = (v) => { v = resolve(v); return Buffer.isBuffer(v) ? pdfString(v) : ''; };
  return { pages: out, info: { title: str(meta.Title), author: str(meta.Author), producer: str(meta.Producer), creator: str(meta.Creator), created: str(meta.CreationDate), modified: str(meta.ModDate) } };
}
// stringhe dei metadati: UTF-16 con BOM oppure PDFDoc (≈ latin1)
function pdfString(b) {
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) { let o = ''; for (let i = 2; i + 1 < b.length; i += 2) o += String.fromCharCode((b[i] << 8) | b[i + 1]); return o; }
  return b.toString('latin1');
}

// ---- Caratteri ------------------------------------------------------------------------------------
const CP1252 = { 0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ' };
const GLYPHS = {
  space: ' ', quoteright: '’', quoteleft: '‘', quotedblleft: '“', quotedblright: '”', quotesingle: "'", quotedbl: '"', endash: '–', emdash: '—', bullet: '•', Euro: '€', ellipsis: '…', periodcentered: '·',
  hyphen: '-', minus: '−', fi: 'ﬁ', fl: 'ﬂ', ampersand: '&', percent: '%', degree: '°', registered: '®', copyright: '©', trademark: '™', section: '§', guillemotleft: '«', guillemotright: '»',
  agrave: 'à', egrave: 'è', eacute: 'é', igrave: 'ì', ograve: 'ò', ugrave: 'ù', Agrave: 'À', Egrave: 'È', Eacute: 'É', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù', ccedilla: 'ç', ntilde: 'ñ', udieresis: 'ü', odieresis: 'ö', adieresis: 'ä',
  comma: ',', period: '.', colon: ':', semicolon: ';', slash: '/', backslash: '\\', parenleft: '(', parenright: ')', bracketleft: '[', bracketright: ']', at: '@', numbersign: '#', plus: '+', equal: '=', asterisk: '*', question: '?', exclam: '!', underscore: '_', less: '<', greater: '>', dollar: '$', sterling: '£',
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};
function glyphChar(name) {
  if (GLYPHS[name] !== undefined) return GLYPHS[name];
  if (name.length === 1) return name;
  const m = /^uni([0-9A-Fa-f]{4})/.exec(name) || /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  if (m) return String.fromCodePoint(parseInt(m[1], 16));
  const g = /^(g|cid|c|G)(\d+)$/.exec(name);
  if (g) return '';
  return '';
}
// mappa ToUnicode: codici -> testo (bfchar e bfrange)
function parseCMap(text) {
  const map = new Map();
  let codeBytes = 0;
  for (const m of text.matchAll(/begincodespacerange([\s\S]*?)endcodespacerange/g)) for (const r of m[1].matchAll(/<([0-9A-Fa-f]+)>/g)) codeBytes = Math.max(codeBytes, r[1].length / 2);
  const utf16 = (hex) => { let o = ''; for (let i = 0; i + 3 < hex.length + 1; i += 4) { const cu = parseInt(hex.slice(i, i + 4), 16); if (!Number.isNaN(cu)) o += String.fromCharCode(cu); } return o; };
  for (const m of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const r of m[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) map.set(parseInt(r[1], 16), utf16(r[2]));
  }
  for (const m of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const body = m[1];
    const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]*)>|\[([^\]]*)\])/g;
    for (const r of body.matchAll(re)) {
      const lo = parseInt(r[1], 16); const hi = parseInt(r[2], 16);
      if (hi - lo > 65535) continue;
      if (r[4] !== undefined) { const items = [...r[4].matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => utf16(x[1])); for (let c = lo; c <= hi && c - lo < items.length; c++) map.set(c, items[c - lo]); }
      else { const dst = r[3]; if (!dst) continue; const base = utf16(dst); const last = base.charCodeAt(base.length - 1); for (let c = lo; c <= hi; c++) map.set(c, base.slice(0, -1) + String.fromCharCode(last + (c - lo))); }
    }
  }
  return { map, codeBytes };
}
function loadFont(dict, resolve) {
  const f = { type: (dict.Subtype && dict.Subtype.name) || '', bytes: 1, map: null, diff: null, widths: null, dw: 1000, cidW: null, first: 0 };
  const tu = resolve(dict.ToUnicode);
  if (tu && tu.data) { try { const cm = parseCMap(tu.data.toString('latin1')); f.map = cm.map; if (cm.codeBytes) f.bytes = cm.codeBytes; } catch { /* mappa illeggibile */ } }
  if (f.type === 'Type0') {
    f.bytes = Math.max(f.bytes, 2);
    const enc = resolve(dict.Encoding);
    if (isName(enc) && !/Identity/.test(enc.name) && !f.map) f.bytes = 2;
    const desc = resolve((resolve(dict.DescendantFonts) || [])[0]) || {};
    f.dw = Number(resolve(desc.DW) || 1000);
    const W = resolve(desc.W);
    if (Array.isArray(W)) {
      f.cidW = new Map();
      for (let i = 0; i < W.length;) {
        const a = Number(resolve(W[i]));
        const b = resolve(W[i + 1]);
        if (Array.isArray(b)) { b.forEach((w, k) => f.cidW.set(a + k, Number(resolve(w)))); i += 2; }
        else { const c = Number(b); const w = Number(resolve(W[i + 2])); if (c - a < 65536) for (let k = a; k <= c; k++) f.cidW.set(k, w); i += 3; }
      }
    }
  } else {
    const enc = resolve(dict.Encoding);
    if (enc && typeof enc === 'object' && !(enc instanceof Name) && Array.isArray(resolve(enc.Differences))) {
      f.diff = new Map();
      let code = 0;
      for (const it of resolve(enc.Differences)) { const v = resolve(it); if (typeof v === 'number') code = v; else if (v instanceof Name) f.diff.set(code++, v.name); }
    }
    f.first = Number(resolve(dict.FirstChar) || 0);
    const w = resolve(dict.Widths);
    if (Array.isArray(w)) f.widths = w.map((x) => Number(resolve(x)) || 0);
    if (f.type === 'Type3') { const fm = resolve(dict.FontMatrix); f.t3 = Array.isArray(fm) ? Number(fm[0]) * 1000 : 1; }
  }
  return f;
}
function decodeText(font, bytes) {
  const out = [];
  const step = font.bytes;
  for (let i = 0; i < bytes.length; i += step) {
    const code = step === 2 ? (bytes[i] << 8) | (bytes[i + 1] || 0) : bytes[i];
    let ch;
    if (font.map && font.map.has(code)) ch = font.map.get(code);
    else if (font.diff && font.diff.has(code)) ch = glyphChar(font.diff.get(code));
    else if (step === 1) ch = code < 128 ? String.fromCharCode(code) : (CP1252[code] || String.fromCharCode(code));
    else ch = font.map ? '' : '';
    let w;
    if (font.cidW) w = font.cidW.has(code) ? font.cidW.get(code) : font.dw;
    else if (font.widths) { w = font.widths[code - font.first]; if (w === undefined) w = 500; if (font.t3) w *= font.t3; }
    else w = step === 2 ? font.dw : 500;
    out.push({ ch, w, code });
  }
  return out;
}

// ---- Testo di una pagina -----------------------------------------------------------------------------
const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];
function extractPage(pg, n, resolve, fontCache) {
  const mb = (resolve(pg.MediaBox) || [0, 0, 612, 792]).map((v) => Number(resolve(v)) || 0);
  const width = Math.abs(mb[2] - mb[0]); const height = Math.abs(mb[3] - mb[1]);
  const chunks = [];
  const contents = resolve(pg.node.Contents);
  const parts = (Array.isArray(contents) ? contents : [contents]).map((c) => resolve(c)).filter((c) => c && c.data).map((c) => c.data).filter(Boolean);
  const run = (content, resources, ctm0, depth) => {
    const res = resolve(resources) || {};
    const fontsDict = resolve(res.Font) || {};
    const xobjs = resolve(res.XObject) || {};
    const fontOf = (name) => {
      const ref = fontsDict[name];
      const key = ref instanceof Ref ? `r${ref.num}` : `n${n}:${name}`;
      if (!fontCache.has(key)) { const d = resolve(ref); fontCache.set(key, d && typeof d === 'object' ? loadFont(d, resolve) : null); }
      return fontCache.get(key);
    };
    const p = new Parser(content.toString('latin1'));
    const stack = []; let ctm = ctm0; let tm = [1, 0, 0, 1, 0, 0]; let tlm = tm;
    let font = null; let size = 0; let lead = 0; let tc = 0; let tw = 0; let tz = 1; let rise = 0;
    const gs = [];
    const operands = [];
    const show = (bytes) => {
      if (!font || !bytes) return;
      const glyphs = decodeText(font, bytes);
      const m = mul(mul([size * tz, 0, 0, size, 0, rise], tm), ctm);
      const scale = Math.hypot(m[1], m[3]) || Math.abs(m[0]);
      let text = ''; let adv = 0;
      const x0 = m[4]; const y0 = m[5];
      for (const g of glyphs) { text += g.ch; adv += (g.w / 1000) * size + tc + (g.code === 32 && font.bytes === 1 ? tw : 0); }
      const tx = adv * tz;
      if (text.trim()) chunks.push({ x: x0, y: y0, size: scale, text, xEnd: x0 + tx * Math.hypot(ctm[0], ctm[1]) * (tm[0] === 0 && tm[1] !== 0 ? 0 : 1) });
      tm = mul([1, 0, 0, 1, tx, 0], tm);
    };
    for (;;) {
      const t = p.token();
      if (!t) break;
      if (t.t !== 'kw') { operands.push(p.object(t)); continue; }
      const op = t.v; const a = operands.splice(0);
      switch (op) {
        case 'q': stack.push(ctm); gs.push({ font, size, tc, tw, tz, lead, rise }); break;
        case 'Q': if (stack.length) ctm = stack.pop(); if (gs.length) ({ font, size, tc, tw, tz, lead, rise } = gs.pop()); break;
        case 'cm': if (a.length === 6) ctm = mul(a.map(Number), ctm); break;
        case 'BT': tm = [1, 0, 0, 1, 0, 0]; tlm = tm; break;
        case 'Tf': font = fontOf(a[0] instanceof Name ? a[0].name : ''); size = Number(a[1]) || 0; break;
        case 'Td': tlm = mul([1, 0, 0, 1, Number(a[0]) || 0, Number(a[1]) || 0], tlm); tm = tlm; break;
        case 'TD': lead = -(Number(a[1]) || 0); tlm = mul([1, 0, 0, 1, Number(a[0]) || 0, Number(a[1]) || 0], tlm); tm = tlm; break;
        case 'Tm': if (a.length === 6) { tlm = a.map(Number); tm = tlm; } break;
        case 'T*': tlm = mul([1, 0, 0, 1, 0, -lead], tlm); tm = tlm; break;
        case 'TL': lead = Number(a[0]) || 0; break;
        case 'Tc': tc = Number(a[0]) || 0; break;
        case 'Tw': tw = Number(a[0]) || 0; break;
        case 'Tz': tz = (Number(a[0]) || 100) / 100; break;
        case 'Ts': rise = Number(a[0]) || 0; break;
        case 'Tj': show(a[0]); break;
        case "'": tlm = mul([1, 0, 0, 1, 0, -lead], tlm); tm = tlm; show(a[0]); break;
        case '"': tw = Number(a[0]) || 0; tc = Number(a[1]) || 0; tlm = mul([1, 0, 0, 1, 0, -lead], tlm); tm = tlm; show(a[2]); break;
        case 'TJ': {
          for (const el of (Array.isArray(a[0]) ? a[0] : [])) {
            if (Buffer.isBuffer(el)) show(el);
            else if (typeof el === 'number') { const dx = (-el / 1000) * size * tz; if (el < -180 && chunks.length) chunks[chunks.length - 1].text += ' '; tm = mul([1, 0, 0, 1, dx, 0], tm); }
          }
          break;
        }
        case 'Do': {
          if (depth >= 4) break;
          const xo = resolve(xobjs[a[0] instanceof Name ? a[0].name : '']);
          if (xo && xo.dict && isName(xo.dict.Subtype, 'Form')) {
            const mtx = resolve(xo.dict.Matrix);
            const inner = Array.isArray(mtx) && mtx.length === 6 ? mul(mtx.map(Number), ctm) : ctm;
            const data = xo.data;
            if (data) run(data, xo.dict.Resources || resources, inner, depth + 1);
          }
          break;
        }
        default: break;
      }
    }
  };
  for (const part of parts) { try { run(part, pg.Resources, [1, 0, 0, 1, 0, 0], 0); } catch { /* contenuto malformato: si tiene quello letto */ } }
  // righe: pezzi alla stessa altezza, da sinistra a destra; uno spazio tra pezzi staccati
  const lines = [];
  for (const c of chunks.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const tol = Math.max(2, c.size * 0.45);
    const line = lines.find((l) => Math.abs(l.y - c.y) <= tol);
    if (line) line.chunks.push(c); else lines.push({ y: c.y, chunks: [c] });
  }
  const join = (cs) => {
    let text = ''; let prev = null;
    for (const c of cs) {
      if (prev) {
        const gap = c.x - prev.xEnd;
        if (!/\s$/.test(text) && !/^\s/.test(c.text) && (gap > Math.max(1.2, c.size * 0.18) || gap < -c.size * 2)) text += ' ';
      }
      text += c.text;
      prev = c;
    }
    return text.replace(/\s+/g, ' ').trim();
  };
  const out = lines.map((l) => {
    const cs = l.chunks.sort((a, b) => a.x - b.x);
    const size = Math.max(...cs.map((c) => c.size));
    // "big": solo i pezzi grandi della riga (il numero di pagina piccolo a destra non fa parte del titolo)
    return { x: +cs[0].x.toFixed(1), y: +l.y.toFixed(1), size: +size.toFixed(1), text: join(cs), big: join(cs.filter((c) => c.size >= size * 0.8)) };
  }).filter((l) => l.text);
  // titolo: la riga piu' grande nella parte alta della pagina (almeno 3 lettere), altrimenti la prima
  const top = out.filter((l) => l.y > height * 0.7 && l.big.replace(/[^A-Za-zÀ-ú]/g, '').length >= 3 && l.big.length < 160);
  const title = top.sort((a, b) => b.size - a.size || b.y - a.y)[0] || out.find((l) => l.text.length >= 3) || null;
  return { n, width: +width.toFixed(1), height: +height.toFixed(1), lines: out.map(({ big, ...l }) => l), text: out.map((l) => l.text).join('\n'), title: title ? title.big : '' };
}

module.exports = { readPdf, parseCMap };
