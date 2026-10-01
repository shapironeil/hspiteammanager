'use strict';
// PDF di prova costruito da zero (nessun file vero nei test). Ha quello che hanno i PDF esportati da PowerPoint:
// pagine 16:9 (960 x 540 pt), un carattere semplice WinAnsi e uno composto Identity-H con la mappa ToUnicode,
// flussi compressi (FlateDecode), oggetti dentro un object stream, un numerino di pagina piccolo a destra del titolo,
// un array TJ con le spaziature.
const zlib = require('node:zlib');

// WinAnsi (cp1252): le virgolette tipografiche, i trattini e i puntini stanno tra 0x80 e 0x9F
const CP1252 = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
const esc1 = (s) => [...String(s)].map((c) => CP1252[c] || c.charCodeAt(0)).map((b) => (b === 0x5c || b === 0x28 || b === 0x29 ? `\\${String.fromCharCode(b)}` : b < 0x20 || b > 0x7e ? `\\${(b & 255).toString(8).padStart(3, '0')}` : String.fromCharCode(b))).join('');
const hex2 = (s) => `<${[...String(s)].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('')}>`;

// pages: [{ title, lines: ['riga', ...] }]
function pdfProva(pages) {
  const objs = new Map(); // num -> stringa o Buffer (gia' con "n 0 obj ... endobj")
  const put = (n, body) => objs.set(n, Buffer.concat([Buffer.from(`${n} 0 obj\n`, 'latin1'), Buffer.isBuffer(body) ? body : Buffer.from(body, 'latin1'), Buffer.from('\nendobj\n', 'latin1')]));
  const stream = (dict, data, compress) => {
    const d = compress ? zlib.deflateSync(data) : data;
    return Buffer.concat([Buffer.from(`<<${dict} /Length ${d.length}${compress ? ' /Filter /FlateDecode' : ''}>>\nstream\n`, 'latin1'), d, Buffer.from('\nendstream', 'latin1')]);
  };
  const kids = pages.map((_, i) => `${100 + i} 0 R`).join(' ');
  put(1, '<< /Type /Catalog /Pages 2 0 R >>');
  put(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  put(3, '<< /Producer (Prova HSPI) /Title (Presentazione di prova) >>');
  // caratteri: F1 e F2 stanno dentro un object stream (come fa PowerPoint)
  const widths = `[${new Array(224).fill(500).join(' ')}]`;
  const f1 = `<< /Type /Font /Subtype /TrueType /BaseFont /ABCDEF+Poppins-Bold /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 /Widths ${widths} >>`;
  const f2 = '<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Poppins /Encoding /Identity-H /DescendantFonts [12 0 R] /ToUnicode 13 0 R >>';
  const head = `10 0 11 ${f1.length + 1} `;
  const objstm = `${head}${f1} ${f2}`;
  put(20, stream(`/Type /ObjStm /N 2 /First ${head.length}`, Buffer.from(objstm, 'latin1'), true));
  put(12, '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ABCDEF+Poppins /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 600 /W [32 [300] 65 90 650] >>');
  const cmap = '/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CMapName /Adobe-Identity-UCS def 1 begincodespacerange <0000> <FFFF> endcodespacerange 1 beginbfrange <0020> <007E> <0020> endbfrange 3 beginbfchar <00E0> <00E0> <00E8> <00E8> <2019> <2019> endbfchar endcmap CMapName currentdict /CMap defineresource pop end end';
  put(13, stream('', Buffer.from(cmap, 'latin1'), false));
  pages.forEach((pg, i) => {
    const ops = [`BT /F1 18 Tf 1 0 0 1 34 500 Tm (${esc1(pg.title)}) Tj ET`, `BT /F1 8 Tf 1 0 0 1 920 500 Tm (${i + 1}) Tj ET`];
    (pg.lines || []).forEach((line, k) => {
      const y = 460 - k * 22;
      if (k === 0) ops.push(`BT /F2 11 Tf 1 0 0 1 34 ${y} Tm ${hex2(line)} Tj ET`);
      else if (k === 1) { const w = line.split(' '); ops.push(`BT /F1 11 Tf 1 0 0 1 34 ${y} Tm [(${esc1(w[0])}) -600 (${esc1(w.slice(1).join(' '))})] TJ ET`); }
      else ops.push(`BT /F1 11 Tf 34 ${y} Td (${esc1(line)}) Tj ET`);
    });
    put(200 + i, stream('', Buffer.from(ops.join('\n'), 'latin1'), true));
    put(100 + i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Resources << /Font << /F1 10 0 R /F2 11 0 R >> >> /Contents ${200 + i} 0 R >>`);
  });
  // pacchetto con la tabella xref dei soli oggetti diretti
  const parts = [Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const offsets = new Map();
  let pos = parts[0].length;
  for (const [n, b] of [...objs.entries()].sort((a, b) => a[0] - b[0])) { offsets.set(n, pos); parts.push(b); pos += b.length; }
  const max = Math.max(...objs.keys()) + 1;
  let xref = `xref\n0 ${max}\n0000000000 65535 f \n`;
  for (let n = 1; n < max; n++) xref += offsets.has(n) ? `${String(offsets.get(n)).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n';
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${max} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(parts);
}

module.exports = { pdfProva };
