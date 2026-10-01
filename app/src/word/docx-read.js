'use strict';
// Motore Word, lettura: la STRUTTURA di un .docx (capitoli, paragrafi, tabelle, sezioni, intestazioni, campi,
// commenti, segnaposto), senza librerie. Il risultato e' JSON puro: lo usano i controlli, il riconoscimento del
// modello e l'interfaccia.
const { readZip } = require('../celle/zip');
const { textOf, paraText, P_RE, TBL_RE, TR_RE, TC_RE, decode } = require('./docx-write');

const PLACEHOLDER = /\[[Ii]nserire[^\]]*\]|\bgg\.mm\.aaaa\b|__\/__\/____|\bMese_[1-9n]\b/g;
const HEADING = /^(Heading|Titolo)\s?(\d)$/i;

function sectionsOf(xml) {
  return [...xml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].map((m) => {
    const s = m[0];
    const pg = /<w:pgSz\b([^>]*)\/>/.exec(s);
    const w = pg ? Number((/w:w="(\d+)"/.exec(pg[1]) || [0, 0])[1]) : 0;
    const h = pg ? Number((/w:h="(\d+)"/.exec(pg[1]) || [0, 0])[1]) : 0;
    const mar = /<w:pgMar\b([^>]*)\/>/.exec(s);
    const margin = (k) => (mar ? Number((new RegExp(`w:${k}="(-?\\d+)"`).exec(mar[1]) || [0, 0])[1]) : 0);
    return {
      at: m.index, orientamento: /w:orient="landscape"/.test(s) || w > h ? 'landscape' : 'portrait', larghezza: w, altezza: h,
      formato: Math.abs(w - 11906) < 30 && Math.abs(h - 16838) < 30 ? 'A4' : Math.abs(w - 16838) < 30 && Math.abs(h - 11906) < 30 ? 'A4 orizzontale' : Math.abs(w - 12240) < 30 ? 'Letter' : `${w}×${h}`,
      margini: { sup: margin('top'), dx: margin('right'), inf: margin('bottom'), sx: margin('left') }, primaPaginaDiversa: /<w:titlePg\b/.test(s),
      intestazioni: [...s.matchAll(/<w:headerReference w:type="(\w+)" r:id="([^"]+)"/g)].map((x) => ({ tipo: x[1], rid: x[2] })),
      piePagina: [...s.matchAll(/<w:footerReference w:type="(\w+)" r:id="([^"]+)"/g)].map((x) => ({ tipo: x[1], rid: x[2] })),
    };
  });
}

function readDocx(buf, { fileName = '' } = {}) {
  const zip = readZip(buf);
  const txt = (n) => { const f = zip.get(n); return f ? f().toString('utf8') : null; };
  const xml = txt('word/document.xml');
  if (!xml) throw Object.assign(new Error('Non è un file Word (.docx) valido.'), { status: 400 });
  const styles = txt('word/styles.xml') || '';
  const styleName = (id) => { const m = new RegExp(`<w:style\\b[^>]*w:styleId="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>\\s*<w:name w:val="([^"]+)"`).exec(styles); return m ? m[1] : id; };
  const sezioni = sectionsOf(xml);
  const rels = Object.fromEntries([...(txt('word/_rels/document.xml.rels') || '').matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const comments = txt('word/comments.xml');
  const commenti = comments ? [...comments.matchAll(/<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g)].map((m) => ({ autore: decode((/w:author="([^"]*)"/.exec(m[1]) || [0, ''])[1]), testo: textOf(m[2]).trim() })) : [];

  // Blocchi del corpo nell'ordine: paragrafi (fuori tabella), tabelle, interruzioni di sezione
  const blocchi = [];
  const capitoli = [];
  const segnaposto = [];
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p(?=[\s>])[^>]*?(?:\/>|>[\s\S]*?<\/w:p>)/g;
  let m; let i = 0; let tabIndex = 0;
  const body = xml.slice(xml.indexOf('<w:body>'), xml.lastIndexOf('</w:body>'));
  const bodyOffset = xml.indexOf('<w:body>');
  while ((m = re.exec(body))) {
    const at = bodyOffset + m.index;
    const x = m[0];
    if (x.startsWith('<w:tbl>')) {
      const righe = (x.match(TR_RE) || []).map((tr) => (tr.match(TC_RE) || []).map((tc) => ({
        testo: textOf(tc).trim(), fill: (/<w:shd\b[^>]*w:fill="([0-9A-Fa-f]{6})"/.exec(tc) || [0, null])[1], span: Number((/<w:gridSpan w:val="(\d+)"/.exec(tc) || [0, 1])[1]), unita: /<w:vMerge\b/.test(tc),
      })));
      const b = { tipo: 'tabella', i: i++, at, n: tabIndex++, righe: righe.length, colonne: Math.max(0, ...righe.map((r) => r.reduce((a, c) => a + c.span, 0))), stile: (/<w:tblStyle w:val="([^"]+)"/.exec(x) || [0, ''])[1],
        larghezze: [...x.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map((g) => Number(g[1])), celle: righe, intestazione: righe[0] ? righe[0].map((c) => c.testo) : [] };
      blocchi.push(b);
      righe.forEach((r, ri) => r.forEach((c, ci) => { for (const s of c.testo.match(PLACEHOLDER) || []) segnaposto.push({ testo: s, blocco: b.i, dove: `tabella ${b.n + 1}, riga ${ri + 1}, colonna ${ci + 1}` }); }));
      continue;
    }
    const pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(x) || [''])[0];
    const testo = paraText(x);
    const stile = (/<w:pStyle w:val="([^"]+)"/.exec(pPr) || [0, ''])[1];
    const outline = /<w:outlineLvl w:val="(\d)"/.exec(pPr);
    const hm = HEADING.exec(stile) || HEADING.exec(styleName(stile) || '');
    const numerato = /<w:numPr>/.test(pPr);
    const toc = /<w:bookmarkStart\b[^>]*w:name="_Toc/.test(x);
    const campi = [...x.matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)].map((f) => decode(f[1]).trim()).concat([...x.matchAll(/<w:fldSimple w:instr="([^"]*)"/g)].map((f) => decode(f[1]).trim()));
    let livello = hm ? Number(hm[2]) : outline ? Number(outline[1]) + 1 : (numerato && toc && !/^TOC/i.test(stile) ? 1 : null);
    if (/^TOC/i.test(stile) || campi.some((c) => /^PAGEREF/.test(c))) livello = null;
    const sectBreak = /<w:sectPr\b/.test(pPr);
    const b = { tipo: 'paragrafo', i: i++, at, testo, stile, stileNome: stile ? styleName(stile) : '', livello, numerato, evidenziato: /<w:highlight\b/.test(x), campi, immagini: (x.match(/<w:drawing>/g) || []).length, vuoto: !testo.trim(), interruzionePagina: /<w:br w:type="page"\/>/.test(x), fineSezione: sectBreak };
    blocchi.push(b);
    if (livello && testo.trim()) capitoli.push({ titolo: testo.trim(), livello, blocco: b.i, at });
    for (const s of testo.match(PLACEHOLDER) || []) segnaposto.push({ testo: s, blocco: b.i, dove: `paragrafo "${testo.trim().slice(0, 50)}"` });
    if (sectBreak) blocchi.push({ tipo: 'sezione', i: i++, at });
  }
  // ogni capitolo copre i blocchi fino al capitolo successivo di livello uguale o superiore
  capitoli.forEach((c, k) => {
    const next = capitoli.slice(k + 1).find((n) => n.livello <= c.livello);
    c.fino = next ? next.blocco : blocchi.length;
    c.tabelle = blocchi.filter((b) => b.tipo === 'tabella' && b.i > c.blocco && b.i < c.fino).map((b) => b.n);
  });
  // intestazioni e pie' di pagina
  const parts = (list) => list.map((h) => { const t = rels[h.rid]; const x = t ? txt(`word/${t}`) : null; return { tipo: h.tipo, testo: x ? textOf(x).trim() : '', immagini: x ? (x.match(/<a:blip\b/g) || []).length : 0, campi: x ? [...x.matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)].map((f) => decode(f[1]).trim()) : [] }; });
  const media = [...zip.keys()].filter((k) => /^word\/media\//.test(k));
  const core = txt('docProps/core.xml') || ''; const app = txt('docProps/app.xml') || '';
  const pick = (x, tag) => decode((new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(x) || [0, ''])[1]);
  const fonts = [...new Set([...xml.matchAll(/w:ascii="([^"]+)"/g)].map((f) => f[1]))];
  const tabelle = blocchi.filter((b) => b.tipo === 'tabella');
  return {
    nomeFile: fileName,
    meta: { titolo: pick(core, 'dc:title'), autore: pick(core, 'dc:creator'), ultimaModificaDi: pick(core, 'cp:lastModifiedBy'), modificato: pick(core, 'dcterms:modified'), creato: pick(core, 'dcterms:created'), pagine: Number(pick(app, 'Pages')) || null, parole: Number(pick(app, 'Words')) || null, revisione: Number(pick(core, 'cp:revision')) || null, solaLetturaConsigliata: pick(app, 'DocSecurity') === '4' },
    pagina: sezioni[0] ? { formato: sezioni[0].formato, margini: sezioni[0].margini, primaPaginaDiversa: sezioni[0].primaPaginaDiversa } : null,
    sezioni: sezioni.map((s) => ({ orientamento: s.orientamento, formato: s.formato, primaPaginaDiversa: s.primaPaginaDiversa })),
    intestazioni: sezioni.length ? parts(sezioni[0].intestazioni) : [], piePagina: sezioni.length ? parts(sezioni[0].piePagina) : [],
    caratteri: fonts, immagini: media.length, stili: [...new Set(blocchi.filter((b) => b.stile).map((b) => b.stile))],
    campi: [...new Set(blocchi.flatMap((b) => b.campi || []).map((c) => c.split(/\s+/)[0]))],
    indiceAutomatico: blocchi.some((b) => (b.campi || []).some((c) => /^TOC\b/.test(c))), aggiornaCampiAllApertura: /<w:updateFields w:val="(true|1|on)"/.test(txt('word/settings.xml') || ''),
    revisioni: /<w:(ins|del)\b/.test(xml), commenti,
    capitoli, tabelle: tabelle.map((t) => ({ n: t.n, righe: t.righe, colonne: t.colonne, stile: t.stile, intestazione: t.intestazione, larghezze: t.larghezze })),
    segnaposto, evidenziati: blocchi.filter((b) => b.evidenziato).length,
    blocchi,
  };
}

module.exports = { readDocx, PLACEHOLDER };
