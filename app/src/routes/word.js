'use strict';
// Motore Word (dentro Verbale Studio): lettura strutturata dei .docx, riconoscimento del modello, controlli,
// modelli Word del progetto e compilazione del verbale SAL (o di un modello qualunque) per funzioni.
//
//   PUT  /api/word/leggi?name=                     corpo = .docx  -> struttura, modello riconosciuto, controlli
//   POST /api/word/controlla                        corpo = .docx  -> controlli
//   GET  /api/word/modelli?projectId=               i modelli Word del progetto (Verbali/Modelli/*.docx e i .docx "template")
//   PUT  /api/word/modelli?projectId=&name=         corpo = .docx  -> salva un modello nella cartella del progetto
//   POST /api/word/sal { projectId, modello, dati, nome, checkpointId, scarica }   -> verbale SAL compilato
//   POST /api/word/compila { projectId, modello, sostituzioni, tabelle, nome, scarica } -> modello compilato
//   POST /api/word/nuovo { projectId, nome, blocchi }                               -> documento da zero
// I file compilati vanno nella cartella del progetto (Esplora file, con le versioni): Verbali/<checkpoint>/ se c'e'
// un checkpoint, altrimenti Verbali/SAL/. Con "scarica" il file torna direttamente al browser.
const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');
const ex = require('../explorer');
const A = require('../verbali/archivio');
const modelli = require('../modelli');
const SAL = require('../sal');
const { readDocx } = require('../word/docx-read');
const { controllaDocx } = require('../word/controlli');
const { compilaVerbaleSAL, compilaGenerico } = require('../word/sal-verbale');
const { newDocx, salTemplate } = require('../word/docx-new');
const { route, HttpError } = require('../http');

const MODELLI = 'Verbali/Modelli';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function readRaw(req, limit = 60 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'File troppo grande (massimo 60 MB).')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const safeName = (s) => clean(s, 90).replace(/[<>:"/\\|?*]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '') || 'Documento';
const wrap = (fn) => async (ctx) => { try { await fn(ctx); } catch (err) { if (err instanceof HttpError || !err.status) throw err; throw new HttpError(err.status, err.message); } };

function analyse(buf, fileName) {
  let st;
  try { st = readDocx(buf, { fileName }); } catch (err) { throw new HttpError(400, err.status ? err.message : 'Non riesco a leggere il file Word (.docx).'); }
  let modello = null;
  try { modello = modelli.riconosci('docx', { buf, fileName, struttura: st }); } catch { /* senza memoria */ }
  const { blocchi, ...senzaBlocchi } = st;
  return { struttura: { ...senzaBlocchi, blocchi: blocchi.map((b) => (b.tipo === 'tabella' ? { ...b, celle: undefined, anteprima: b.celle.slice(0, 3).map((r) => r.map((c) => c.testo)) } : b)) }, modello, controlli: controllaDocx(st) };
}

route('PUT', '/api/word/leggi', {}, wrap(async (ctx) => {
  const buf = await readRaw(ctx.req);
  ctx.json(200, analyse(buf, clean(ctx.query.get('name'), 200)));
}));
route('POST', '/api/word/controlla', {}, wrap(async (ctx) => {
  const buf = await readRaw(ctx.req);
  let st;
  try { st = readDocx(buf); } catch (err) { throw new HttpError(400, 'Non riesco a leggere il file Word (.docx).'); }
  ctx.json(200, { controlli: controllaDocx(st), segnaposto: st.segnaposto.length });
}));

// ---- Modelli Word del progetto ----------------------------------------------------------------------
function modelFile(P, rel) {
  const at = ex.resolve(P.root, String(rel || ''));
  if (!/\.docx$/i.test(at.full) || !fs.existsSync(at.full)) throw new HttpError(404, 'Modello Word non trovato nella cartella del progetto.');
  return fs.readFileSync(at.full);
}
route('GET', '/api/word/modelli', {}, wrap(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.query.get('projectId'));
  const rows = db.all("SELECT path, name, size, updated_at FROM fs_index WHERE space = ? AND is_dir = 0 AND lower(name) LIKE '%.docx' AND path NOT LIKE '.%' ORDER BY updated_at DESC LIMIT 300", P.space)
    .filter((r) => !/(^|\/)\.(cestino|storico)\//.test(r.path) && (r.path.startsWith(`${MODELLI}/`) || /template|modello/i.test(r.name)));
  const out = rows.map((r) => {
    let modello = null;
    try { const buf = fs.readFileSync(ex.resolve(P.root, r.path).full); modello = modelli.riconosci('docx', { buf, fileName: r.name, struttura: readDocx(buf, { fileName: r.name }) }); } catch { /* file illeggibile */ }
    return { path: r.path, name: r.name, size: r.size, updatedAt: r.updated_at, modello: modello && modello.corrisponde ? { template: modello.template, tipoDocumento: modello.tipoDocumento, punteggio: modello.punteggio } : null };
  });
  ctx.json(200, { modelli: out, cartella: MODELLI, esempio: 'Modello di prova (verbale SAL inventato)' });
}));
route('PUT', '/api/word/modelli', {}, wrap(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.query.get('projectId'));
  if (!P.canEdit && ctx.user.role !== 'hacker') { /* chi vede il progetto puo' caricare un modello: e' un file del progetto */ }
  const name = safeName(clean(ctx.query.get('name'), 200).replace(/\.docx$/i, '')) + '.docx';
  const buf = await readRaw(ctx.req);
  if (buf.length < 100) throw new HttpError(400, 'File vuoto.');
  let st;
  try { st = readDocx(buf, { fileName: name }); } catch { throw new HttpError(400, 'Non è un file Word (.docx) valido.'); }
  const rel = `${MODELLI}/${name}`;
  ex.writeBuffer(P.space, P.root, rel, buf, ctx.user.id, { keepHistory: true });
  const modello = modelli.riconosci('docx', { buf, fileName: name, struttura: st });
  db.log(ctx, 'word.modello', `${P.p.name}: ${name}`);
  ctx.json(201, { path: rel, name, modello: modello && modello.corrisponde ? modello : null, controlli: controllaDocx(st) });
}));

// ---- Compilazione -------------------------------------------------------------------------------------
function sendDocx(ctx, buf, name) {
  ctx.res.writeHead(200, { 'Content-Type': DOCX, 'Content-Length': buf.length, 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}` });
  ctx.res.end(buf);
}
function destination(P, b, name) {
  if (b.checkpointId) {
    const cp = A.load(P, String(b.checkpointId));
    return `${cp.folder}/${name}`;
  }
  return `Verbali/SAL/${name}`;
}
const templateBuf = (P, b) => (b.modello === 'esempio' || !b.modello ? salTemplate() : modelFile(P, b.modello));

route('POST', '/api/word/sal', {}, wrap(async (ctx) => {
  const b = await ctx.body();
  const P = A.openProject(ctx.user, b.projectId);
  const dati = SAL.calcola(b.dati || {});
  const controlliDati = SAL.controlla(dati);
  if (controlliDati.some((c) => c.level === 'errore') && !b.forza) throw new HttpError(400, `Dati del SAL da sistemare: ${controlliDati.filter((c) => c.level === 'errore').map((c) => c.text).join(' ')}`);
  const tpl = templateBuf(P, b);
  const r = compilaVerbaleSAL(tpl, dati, { autore: ctx.user.name });
  const name = `${safeName(b.nome || `Verbale SAL${dati.numero ? ` ${dati.numero}` : ''} ${dati.periodo.etichetta || ''}`)}.docx`;
  const st = readDocx(r.buf, { fileName: name });
  const controlli = [...controlliDati, ...controllaDocx(st)];
  if (b.scarica) { db.log(ctx, 'word.sal', `${P.p.name}: ${name} (scaricato)`); return sendDocx(ctx, r.buf, name); }
  const rel = destination(P, b, name);
  ex.writeBuffer(P.space, P.root, rel, r.buf, ctx.user.id, { keepHistory: true });
  db.log(ctx, 'word.sal', `${P.p.name}: ${rel}`);
  ctx.json(201, { space: P.space, path: rel, name, controlli, note: r.note, economics: r.economics, rimasti: r.rimasti });
}));

route('POST', '/api/word/compila', {}, wrap(async (ctx) => {
  const b = await ctx.body();
  const P = A.openProject(ctx.user, b.projectId);
  if (!b.modello) throw new HttpError(400, 'Indica il modello (percorso del .docx nella cartella del progetto).');
  const r = compilaGenerico(modelFile(P, b.modello), { sostituzioni: b.sostituzioni || {}, tabelle: Array.isArray(b.tabelle) ? b.tabelle.slice(0, 50) : [], commenti: b.commenti, aggiornaCampi: b.aggiornaCampi, evidenziazioni: b.evidenziazioni });
  const name = `${safeName(b.nome || path.basename(String(b.modello), '.docx') + ' compilato')}.docx`;
  if (b.scarica) return sendDocx(ctx, r.buf, name);
  const rel = destination(P, b, name);
  ex.writeBuffer(P.space, P.root, rel, r.buf, ctx.user.id, { keepHistory: true });
  db.log(ctx, 'word.compila', `${P.p.name}: ${rel}`);
  ctx.json(201, { space: P.space, path: rel, name, esiti: r.esiti, rimasti: r.rimasti });
}));

// Documento da zero: blocchi [{ h1 }, { p, bold, highlight }, { table: { rows } }, { section: 'landscape' }]
route('POST', '/api/word/nuovo', {}, wrap(async (ctx) => {
  const b = await ctx.body();
  const P = A.openProject(ctx.user, b.projectId);
  const blocchi = Array.isArray(b.blocchi) ? b.blocchi.slice(0, 500) : [];
  const buf = b.esempio ? salTemplate() : newDocx(blocchi.length ? blocchi : [{ h1: clean(b.nome, 200) || 'Documento' }, { p: '' }], { title: clean(b.nome, 200) || 'Documento', author: ctx.user.name });
  const name = `${safeName(b.nome || (b.esempio ? 'Modello verbale SAL di prova' : 'Documento'))}.docx`;
  if (b.scarica) return sendDocx(ctx, buf, name);
  const rel = b.esempio ? `${MODELLI}/${name}` : `Verbali/${name}`;
  ex.writeBuffer(P.space, P.root, rel, buf, ctx.user.id, { keepHistory: true });
  ctx.json(201, { space: P.space, path: rel, name });
}));

module.exports = {};
