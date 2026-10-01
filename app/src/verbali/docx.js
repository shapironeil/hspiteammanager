'use strict';
// Testo di un file Word (.docx) senza dipendenze: lettore ZIP minimale + pulizia dell'XML.
const zlib = require('node:zlib');

function unzipEntry(buf, wanted) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('File DOCX non valido');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    if (name === wanted) {
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      return method === 8 ? zlib.inflateRawSync(data) : data;
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} non trovato nel DOCX`);
}

function docxToText(buf) {
  const xml = unzipEntry(buf, 'word/document.xml').toString('utf8');
  const decode = (s) =>
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&amp;/g, '&');
  return xml
    .split(/<\/w:p>/)
    .map((p) =>
      decode(
        p
          .replace(/<w:tab\/>/g, '\t')
          .replace(/<w:br[^>]*\/>/g, '\n')
          .replace(/<[^>]+>/g, '')
      )
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { docxToText, unzipEntry };
