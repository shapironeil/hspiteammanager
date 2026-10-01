'use strict';
// Cippi: presentazioni PowerPoint del team. Importa, legge la struttura (sezioni, tipi di slide, blocchi in ordine,
// flussi, legenda, sigle), propone i punti chiave e i controlli, permette di modificare i testi, l'ordine e le slide,
// salva modelli riutilizzabili e crea documenti nuovi da un modello. Esporta un .pptx con la stessa grafica.
//
// Archivio (sinergia con il resto del portale):
//   - il file di partenza resta in data/cippi/sorgenti/<impronta>.pptx (non si perde anche se lo si sposta in Esplora file);
//   - una copia, gli appunti e le esportazioni stanno nella cartella del progetto: Cippi/<nome documento>/ (Esplora file,
//     con le versioni precedenti dei file);
//   - i processi dei flussi si collegano alle voci di GestioneCelle dello stesso progetto (stesso nome o stesso codice);
//   - il glossario delle sigle e' del progetto.
// Vede e modifica un documento chi vede il progetto; lo elimina chi l'ha creato o chi gestisce il progetto.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../config');
const db = require('../db');
const ex = require('../explorer');
const { readPptx, mediaOf } = require('../cippi/pptx-read');
const { analyze, templateOf, compareToTemplate, norm } = require('../cippi/analyze');
const { build } = require('../cippi/pptx-write');
const { baseDeck } = require('../cippi/pptx-new');
const { openDeck } = require('../cippi/pptx-build');
const { salDeck, SEZIONI } = require('../cippi/sal-deck');
const modelli = require('../modelli');
const SAL = require('../sal');
const { route, HttpError } = require('../http');
const projects = require('./projects');

const DIR = path.join(config.DATA_DIR, 'cippi');
const SRC = path.join(DIR, 'sorgenti');
const CACHE = path.join(DIR, 'analisi');
const ANALYZER = 4; // si alza quando cambia l'analisi: le analisi salvate si rifanno
const KINDS = ['chiave', 'nota', 'domanda', 'da-fare'];
const STATUSES = ['bozza', 'in revisione', 'approvato'];

function readBody(req, limit = 200 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'File troppo grande (massimo 200 MB).')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const clean = (v, max, label) => {
  const s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  if (label && !s) throw new HttpError(400, `${label} obbligatorio.`);
  return s;
};
const safeName = (s) => String(s).replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 90) || 'Presentazione';

// ---- Sorgenti e analisi (con cache in memoria e su disco) ---------------------------------------
const mem = new Map(); // sha -> { pres, analysis } (le ultime 3)
function storeSource(buf) {
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  fs.mkdirSync(SRC, { recursive: true });
  const file = path.join(SRC, `${sha}.pptx`);
  if (!fs.existsSync(file)) { fs.writeFileSync(`${file}.part`, buf); fs.renameSync(`${file}.part`, file); }
  return sha;
}
const sourceBuf = (sha) => {
  if (!/^[0-9a-f]{64}$/.test(sha)) throw new HttpError(400, 'Sorgente non valida.');
  try { return fs.readFileSync(path.join(SRC, `${sha}.pptx`)); } catch { throw new HttpError(410, 'Il file di partenza non c\'è più nell\'archivio di Cippi.'); }
};
function load(sha) {
  if (mem.has(sha)) { const v = mem.get(sha); mem.delete(sha); mem.set(sha, v); return v; }
  const cache = path.join(CACHE, `${sha}.v${ANALYZER}.json`);
  let v = null;
  try { v = JSON.parse(fs.readFileSync(cache, 'utf8')); } catch { /* da calcolare */ }
  if (!v) {
    let pres;
    try { pres = readPptx(sourceBuf(sha)); } catch (err) { throw err instanceof HttpError ? err : new HttpError(400, err.status ? err.message : 'Non riesco a leggere il file PowerPoint (.pptx).'); }
    v = { pres, analysis: analyze(pres) };
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(cache, JSON.stringify(v));
  }
  mem.set(sha, v);
  while (mem.size > 3) mem.delete(mem.keys().next().value);
  return v;
}

// ---- Permessi ------------------------------------------------------------------------------------
function project(user, id) {
  const p = db.get('SELECT * FROM projects WHERE id = ?', Number(id));
  if (!p || !projects.canSee(user, p)) throw new HttpError(404, 'Progetto non trovato.');
  return p;
}
function openDoc(user, id, { manage = false, kind } = {}) {
  const d = db.get('SELECT * FROM cippi_docs WHERE id = ? AND deleted_at IS NULL', Number(id));
  const p = d && db.get('SELECT * FROM projects WHERE id = ?', d.project_id);
  // un modello condiviso lo usano tutti; il resto solo chi vede il progetto
  const visible = p && (projects.canSee(user, p) || (d.kind === 'modello' && d.shared));
  if (!d || !visible || (kind && d.kind !== kind)) throw new HttpError(404, kind === 'modello' ? 'Modello non trovato.' : 'Documento non trovato.');
  const canManage = projects.canEdit(user, p) || d.created_by === user.id;
  const canEdit = projects.canSee(user, p);
  if (manage && !canManage) throw new HttpError(403, 'Serve chi ha creato il documento o un Manager del progetto.');
  return { doc: d, project: p, canManage, canEdit };
}
const space = (p) => `p${p.id}`;
const rootOf = (p) => path.join(projects.baseDir(), p.folder);

// ---- Creazione -------------------------------------------------------------------------------------
function autoPoints(docId, analysis, userId) {
  const now = db.now();
  for (const k of analysis.keyPoints.slice(0, 300)) {
    db.run('INSERT INTO cippi_points(doc_id, slide, kind, text, status, auto, created_by, created_at) VALUES(?,?,?,?,?,1,?,?)',
      docId, k.slide, k.kind === 'nota' ? 'nota' : 'chiave', k.text.slice(0, 2000), 'aperto', userId, now);
  }
}
function uniqueFolder(p, name) {
  let folder = `Cippi/${safeName(name)}`;
  for (let i = 2; db.get('SELECT 1 AS x FROM cippi_docs WHERE project_id = ? AND folder = ? AND deleted_at IS NULL', p.id, folder); i++) folder = `Cippi/${safeName(name)} (${i})`;
  return folder;
}
// riassunto per gli elenchi (senza rileggere l'analisi)
const summaryOf = (a, modello) => JSON.stringify({ score: a.score, counts: a.counts, ratio: a.size.ratio, processes: a.processes.length, sections: a.sections.length, modello: modello && modello.corrisponde ? { template: modello.template, punteggio: modello.punteggio, fascicolo: modello.fascicolo } : null });
// il modello noto a cui somiglia (impronte in docs/MEMORIA)
const riconosci = (buf, fileName, pres) => { try { return modelli.riconosci('pptx', { buf, fileName, pres }); } catch { return null; } };
// i layout del file, per i modelli (si creano slide nuove da qui)
const layoutsOf = (buf) => { try { return openDeck(buf).layouts().map((l) => ({ name: l.name, part: path.posix.basename(l.part), hasTitle: l.hasTitle, bodies: l.bodies, hasPicture: l.hasPicture, fixedTexts: l.fixedTexts.slice(0, 6) })); } catch { return []; } };
function createDoc(ctx, p, buf, fileName, { name, kind = 'documento', templateId = null, slides = null, copyToProject = true }) {
  const sha = storeSource(buf);
  const { pres, analysis } = load(sha);
  const modello = riconosci(buf, fileName, pres);
  const docName = clean(name || path.basename(fileName, path.extname(fileName)), 120, 'Nome');
  const folder = kind === 'modello' ? 'Cippi/Modelli' : uniqueFolder(p, docName);
  if (copyToProject) ex.writeBuffer(space(p), rootOf(p), `${folder}/${safeName(kind === 'modello' ? docName : path.basename(fileName, path.extname(fileName)))}.pptx`, buf, ctx.user.id, { keepHistory: true });
  const list = slides || analysis.slides.map((s) => ({ src: s.n }));
  const now = db.now();
  const r = db.run(`INSERT INTO cippi_docs(project_id, kind, name, source_sha, source_name, folder, slides, template_id, template, summary, created_by, created_at, updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, p.id, kind, docName, sha, clean(fileName, 200) || 'presentazione.pptx', folder, JSON.stringify(list), templateId,
  kind === 'modello' ? JSON.stringify({ ...templateOf(analysis), layouts: layoutsOf(buf), modello: modello && modello.corrisponde ? modello.template : null }) : null, summaryOf(analysis, modello), ctx.user.id, now, now);
  const id = Number(r.lastInsertRowid);
  if (kind === 'documento' && !slides) autoPoints(id, analysis, ctx.user.id);
  db.log(ctx, kind === 'modello' ? 'cippi.modello-creato' : 'cippi.importato', `${p.name}: ${docName} (${list.length} slide)`);
  return id;
}

// Importa un .pptx caricato dal PC
route('PUT', '/api/cippi/import', {}, async (ctx) => {
  const p = project(ctx.user, ctx.query.get('projectId'));
  const fileName = clean(ctx.query.get('name'), 200) || 'presentazione.pptx';
  if (!/\.pptx$/i.test(fileName)) throw new HttpError(400, 'Cippi legge i file PowerPoint .pptx (salva i .ppt come .pptx).');
  const buf = await readBody(ctx.req);
  if (buf.length < 100) throw new HttpError(400, 'File vuoto.');
  // ?modello=1: il file entra direttamente come modello aziendale (master, layout e slide d'esempio restano suoi)
  const id = createDoc(ctx, p, buf, fileName, { name: ctx.query.get('nome') || null, kind: ctx.query.get('modello') ? 'modello' : 'documento' });
  ctx.json(201, { id });
});

// Crea da zero: una presentazione base con la struttura tipica (titolo, indice, sezione, testo, legenda, flusso, chiusura)
route('POST', '/api/cippi/nuovo', {}, async (ctx) => {
  const b = await ctx.body();
  const p = project(ctx.user, b.projectId);
  const name = clean(b.name, 120, 'Nome');
  const id = createDoc(ctx, p, baseDeck(name), `${safeName(name)}.pptx`, { name });
  ctx.json(201, { id });
});

// Importa un .pptx gia' nella cartella del progetto (Esplora file)
route('POST', '/api/cippi/import-progetto', {}, async (ctx) => {
  const b = await ctx.body();
  const p = project(ctx.user, b.projectId);
  const at = ex.resolve(rootOf(p), String(b.path || ''));
  if (!/\.pptx$/i.test(at.full) || !fs.existsSync(at.full)) throw new HttpError(404, 'File .pptx non trovato nella cartella del progetto.');
  const id = createDoc(ctx, p, fs.readFileSync(at.full), path.basename(at.full), { name: b.name || null, copyToProject: false });
  ctx.json(201, { id });
});

// .pptx presenti nelle cartelle dei progetti visibili (per importarli senza scaricarli e ricaricarli)
route('GET', '/api/cippi/file-progetto', {}, (ctx) => {
  const p = project(ctx.user, ctx.query.get('projectId'));
  const rows = db.all("SELECT path, name, size, updated_at FROM fs_index WHERE space = ? AND is_dir = 0 AND lower(name) LIKE '%.pptx' AND path NOT LIKE '.%' ORDER BY updated_at DESC LIMIT 200", space(p));
  ctx.json(200, rows.filter((r) => !/(^|\/)\.(cestino|storico)\//.test(r.path)).map((r) => ({ path: r.path, name: r.name, size: r.size, updatedAt: r.updated_at })));
});

// ---- Elenco ----------------------------------------------------------------------------------------
const brief = (d, user, extra = {}) => {
  const slides = JSON.parse(d.slides);
  const a = JSON.parse(d.summary || '{}');
  return {
    id: d.id, kind: d.kind, name: d.name, description: d.description, projectId: d.project_id, status: d.status, version: d.version,
    slides: slides.length, sourceName: d.source_name, folder: d.folder, shared: !!d.shared, updatedAt: d.updated_at, createdBy: d.created_by,
    author: (db.get('SELECT name FROM users WHERE id = ?', d.created_by) || {}).name || '',
    score: a.score !== undefined ? a.score : null, counts: a.counts || {}, ratio: a.ratio || 16 / 9, processes: a.processes || 0, modello: a.modello || null,
    points: db.get("SELECT COUNT(*) AS n FROM cippi_points WHERE doc_id = ? AND status = 'aperto' AND kind IN ('domanda','da-fare')", d.id).n,
    ...extra,
  };
};
route('GET', '/api/cippi', {}, (ctx) => {
  projects.sync();
  const visible = db.all('SELECT * FROM projects ORDER BY name').filter((p) => projects.canSee(ctx.user, p));
  const ids = visible.map((p) => p.id);
  const inList = ids.length ? `project_id IN (${ids.map(() => '?').join(',')})` : '0';
  const docs = db.all(`SELECT * FROM cippi_docs WHERE deleted_at IS NULL AND kind = 'documento' AND ${inList} ORDER BY updated_at DESC`, ...ids);
  const models = db.all(`SELECT * FROM cippi_docs WHERE deleted_at IS NULL AND kind = 'modello' AND (${inList} OR shared = 1) ORDER BY name`, ...ids);
  ctx.json(200, {
    projects: visible.map((p) => ({ id: p.id, name: p.name, canManage: projects.canEdit(ctx.user, p) })),
    docs: docs.map((d) => brief(d, ctx.user, { project: visible.find((p) => p.id === d.project_id).name })),
    models: models.map((d) => {
      const t = JSON.parse(d.template || '{}');
      return brief(d, ctx.user, { project: (visible.find((p) => p.id === d.project_id) || {}).name || 'condiviso', parts: (t.parts || []).length, sections: t.sections || [] });
    }),
  });
});

// ---- Documento: tutto quello che serve alla revisione -------------------------------------------
function celleLinks(p, analysis) {
  const maps = db.all('SELECT id, name FROM celle_maps WHERE project_id = ? AND deleted_at IS NULL', p.id);
  if (!maps.length || !analysis.processes.length) return [];
  const nodes = db.all(`SELECT id, map_id, name, level FROM celle_nodes WHERE deleted_at IS NULL AND map_id IN (${maps.map(() => '?').join(',')})`, ...maps.map((m) => m.id));
  const byName = new Map();
  for (const n of nodes) { const k = norm(n.name); if (!byName.has(k)) byName.set(k, n); }
  const out = [];
  for (const pr of analysis.processes) {
    const n = byName.get(norm(pr.name));
    if (n) out.push({ code: pr.code, name: pr.name, slides: pr.slides, mapId: n.map_id, map: maps.find((m) => m.id === n.map_id).name, nodeId: n.id, nodeName: n.name, level: n.level });
  }
  return out;
}
function appunti(p, d) {
  return db.all('SELECT path, name, size, updated_at FROM fs_index WHERE space = ? AND parent = ? AND is_dir = 0 ORDER BY name', space(p), `${d.folder}/Appunti`)
    .map((r) => ({ name: r.name, size: r.size, updatedAt: r.updated_at, url: `/api/explorer/${space(p)}/view?path=${encodeURIComponent(r.path)}`, space: space(p), path: r.path }));
}
route('GET', '/api/cippi/docs/:id', {}, (ctx) => {
  const { doc, project: p, canManage, canEdit } = openDoc(ctx.user, ctx.params.id);
  const { analysis } = load(doc.source_sha);
  const tplId = Number(ctx.query.get('modello')) || doc.template_id;
  let confronto = null;
  if (tplId) {
    const t = db.get("SELECT * FROM cippi_docs WHERE id = ? AND kind = 'modello' AND deleted_at IS NULL", tplId);
    if (t) confronto = { modello: { id: t.id, name: t.name }, ...compareToTemplate(analysis, JSON.parse(t.template)) };
  }
  const users = new Map(db.all('SELECT id, name FROM users').map((u) => [u.id, u.name]));
  const glossary = new Map(db.all('SELECT term, meaning FROM cippi_glossary WHERE project_id = ?', p.id).map((g) => [g.term, g.meaning]));
  ctx.json(200, {
    ...brief(doc, ctx.user, { project: p.name }),
    canManage, canEdit,
    list: JSON.parse(doc.slides),
    template: doc.kind === 'modello' ? JSON.parse(doc.template) : null,
    analysis: { ...analysis, glossary: analysis.glossary.map((g) => ({ ...g, meaning: glossary.get(g.term) || g.meaning })) },
    points: db.all('SELECT * FROM cippi_points WHERE doc_id = ? ORDER BY slide, id', doc.id).map((x) => ({
      id: x.id, slide: x.slide, kind: x.kind, text: x.text, status: x.status, auto: !!x.auto, author: users.get(x.created_by) || '', createdAt: x.created_at,
    })),
    celle: celleLinks(p, analysis),
    appunti: appunti(p, doc),
    confronto,
    modello: riconosci(sourceBuf(doc.source_sha), doc.source_name, load(doc.source_sha).pres),
    layouts: layoutsOf(sourceBuf(doc.source_sha)),
    funzioni: Object.entries(SEZIONI).map(([k, v]) => ({ sezione: k, titolo: v })),
  });
});

// Forme di una slide di origine (per l'anteprima nel pannello di visione)
route('GET', '/api/cippi/docs/:id/slide/:n', {}, (ctx) => {
  const { doc } = openDoc(ctx.user, ctx.params.id);
  const { pres } = load(doc.source_sha);
  const s = pres.slides[Number(ctx.params.n) - 1];
  if (!s) throw new HttpError(404, 'Slide non trovata.');
  ctx.json(200, { n: s.n, layout: s.layout, shapes: s.shapes, notes: s.notes, theme: pres.theme, fonts: pres.fonts, ratio: pres.ratio });
});
route('GET', '/api/cippi/docs/:id/media', {}, (ctx) => {
  const { doc } = openDoc(ctx.user, ctx.params.id);
  const name = String(ctx.query.get('name') || '');
  const buf = mediaOf(sourceBuf(doc.source_sha), name);
  if (!buf) throw new HttpError(404, 'Immagine non trovata.');
  const ext = path.extname(name).toLowerCase();
  const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.webp': 'image/webp' }[ext];
  if (!type) throw new HttpError(415, 'Formato immagine non visualizzabile nel browser.');
  ctx.res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length, 'Cache-Control': 'private, max-age=86400', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'X-Content-Type-Options': 'nosniff' });
  ctx.res.end(buf);
});

// ---- Modifica ----------------------------------------------------------------------------------------
function cleanSlides(list, max) {
  if (!Array.isArray(list) || !list.length || list.length > 2000) throw new HttpError(400, 'Elenco delle slide non valido.');
  return list.map((s) => {
    const src = Number(s.src);
    if (!Number.isInteger(src) || src < 1 || src > max) throw new HttpError(400, 'Slide di origine non valida.');
    const out = { src };
    if (s.texts && typeof s.texts === 'object') {
      out.texts = {};
      for (const [id, lines] of Object.entries(s.texts)) {
        if (!/^\d{1,7}$/.test(id) || !Array.isArray(lines)) continue;
        out.texts[id] = lines.slice(0, 200).map((l) => (typeof l === 'string' ? clean(l, 4000) : { text: clean(l && l.text, 4000), lvl: Math.max(0, Math.min(8, Number(l && l.lvl) || 0)) }));
      }
    }
    if (s.note) out.note = clean(s.note, 2000);
    return out;
  });
}
route('PATCH', '/api/cippi/docs/:id', {}, async (ctx) => {
  const { doc, canManage, canEdit } = openDoc(ctx.user, ctx.params.id);
  if (!canEdit) throw new HttpError(403, 'Non puoi modificare questo documento.');
  const b = await ctx.body();
  const sets = []; const vals = [];
  if (b.name !== undefined) { sets.push('name = ?'); vals.push(clean(b.name, 120, 'Nome')); }
  if (b.description !== undefined) { sets.push('description = ?'); vals.push(clean(b.description, 1000)); }
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) throw new HttpError(400, 'Stato non valido.'); sets.push('status = ?'); vals.push(b.status); }
  if (b.shared !== undefined) { if (!canManage || doc.kind !== 'modello') throw new HttpError(403, 'Solo chi gestisce il modello può condividerlo.'); sets.push('shared = ?'); vals.push(b.shared ? 1 : 0); }
  if (b.slides !== undefined) {
    // conflitto: qualcun altro ha salvato nel frattempo
    if (b.updatedAt && b.updatedAt !== doc.updated_at) throw new HttpError(409, 'Il documento è stato modificato da un altro utente: ricarica per vedere le modifiche.');
    const { analysis } = load(doc.source_sha);
    sets.push('slides = ?'); vals.push(JSON.stringify(cleanSlides(b.slides, analysis.slides.length)));
  }
  if (!sets.length) return ctx.json(200, { ok: true });
  const now = db.now();
  db.run(`UPDATE cippi_docs SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, ...vals, now, doc.id);
  ctx.json(200, { ok: true, updatedAt: now });
});

route('DELETE', '/api/cippi/docs/:id', {}, (ctx) => {
  const { doc, project: p } = openDoc(ctx.user, ctx.params.id, { manage: true });
  db.run('UPDATE cippi_docs SET deleted_at = ? WHERE id = ?', db.now(), doc.id);
  db.log(ctx, doc.kind === 'modello' ? 'cippi.modello-eliminato' : 'cippi.eliminato', `${p.name}: ${doc.name}`);
  ctx.json(200, { ok: true });
});

// ---- Esportazione ----------------------------------------------------------------------------------
const fileNameOf = (d) => `${safeName(d.name)}.pptx`;
function built(doc) {
  try { return build(sourceBuf(doc.source_sha), JSON.parse(doc.slides)); } catch (err) { throw err instanceof HttpError ? err : new HttpError(err.status || 500, err.message); }
}
route('GET', '/api/cippi/docs/:id/download', {}, (ctx) => {
  const { doc } = openDoc(ctx.user, ctx.params.id);
  const buf = built(doc);
  const name = fileNameOf(doc);
  db.log(ctx, 'cippi.scaricato', doc.name);
  ctx.res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'Content-Length': buf.length, 'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  ctx.res.end(buf);
});
// Salva la versione nella cartella del progetto e la rende la nuova base del documento (le modifiche entrano nel file,
// l'analisi si rifa' sul risultato). La versione precedente resta tra le versioni del file in Esplora file.
// Un nuovo file diventa la base del documento: scritto nella cartella del progetto (la versione precedente resta tra le
// versioni del file in Esplora file), archiviato tra le sorgenti, rianalizzato. Le note per slide restano alla stessa posizione.
function newVersion(ctx, doc, p, buf, logAction, logText) {
  const rel = `${doc.folder}/${fileNameOf(doc)}`;
  ex.writeBuffer(space(p), rootOf(p), rel, buf, ctx.user.id, { keepHistory: true });
  const sha = storeSource(buf);
  const { pres, analysis } = load(sha);
  const old = JSON.parse(doc.slides);
  const list = analysis.slides.map((s, i) => ({ src: s.n, ...(old[i] && old[i].note ? { note: old[i].note } : {}) }));
  const now = db.now();
  db.run('UPDATE cippi_docs SET source_sha = ?, source_name = ?, slides = ?, summary = ?, version = version + 1, updated_at = ? WHERE id = ?', sha, fileNameOf(doc), JSON.stringify(list), summaryOf(analysis, riconosci(buf, fileNameOf(doc), pres)), now, doc.id);
  db.log(ctx, logAction, `${p.name}: ${doc.name} v${doc.version + 1}${logText ? ` (${logText})` : ''}`);
  return { space: space(p), path: rel, version: doc.version + 1, updatedAt: now, slides: list.length };
}
route('POST', '/api/cippi/docs/:id/salva-versione', {}, async (ctx) => {
  const { doc, project: p, canEdit } = openDoc(ctx.user, ctx.params.id, { kind: 'documento' });
  if (!canEdit) throw new HttpError(403, 'Non puoi modificare questo documento.');
  ctx.json(200, newVersion(ctx, doc, p, built(doc), 'cippi.versione'));
});

// ---- Funzioni di alto livello: slide nuove dai layout, agenda, data, pulizia ---------------------------
// Il documento viene prima "cotto" con le modifiche in sospeso (build), poi si applicano le azioni in ordine e il
// risultato diventa la nuova versione. Si lavora per funzioni, non slide per slide.
const str = (v, max) => clean(v == null ? '' : v, max);
function cleanLines(v, max = 60) {
  if (v === undefined || v === null) return undefined;
  const list = Array.isArray(v) ? v : String(v).split('\n');
  return list.slice(0, max).map((l) => (typeof l === 'string' ? { text: str(l, 2000) } : {
    text: str(l && l.text, 2000), lvl: Math.max(0, Math.min(8, Number(l && l.lvl) || 0)), bold: !!(l && l.bold), italic: !!(l && l.italic), numbered: l && l.numbered !== undefined ? !!l.numbered : undefined,
    color: l && /^[0-9A-Fa-f]{6}$/.test(String(l.color || '')) ? String(l.color).toUpperCase() : undefined, sz: l && Number(l.sz) >= 600 && Number(l.sz) <= 9600 ? Number(l.sz) : undefined,
  }));
}
function cleanTable(t) {
  if (!t || !Array.isArray(t.rows)) return undefined;
  const rows = t.rows.slice(0, 80).map((r) => (Array.isArray(r) ? r : [r]).slice(0, 24).map((c) => (c && typeof c === 'object'
    ? { text: str(c.text, 500), bold: !!c.bold, span: Math.max(1, Math.min(24, Number(c.span) || 1)), fill: /^[0-9A-Fa-f]{6}$/.test(String(c.fill || '')) ? String(c.fill).toUpperCase() : null, color: /^[0-9A-Fa-f]{6}$/.test(String(c.color || '')) ? String(c.color).toUpperCase() : null, align: ['l', 'r', 'ctr'].includes(c.align) ? c.align : null }
    : str(c, 500))));
  return { rows, header: t.header !== false, widths: Array.isArray(t.widths) ? t.widths.map(Number) : undefined, sz: Number(t.sz) >= 600 && Number(t.sz) <= 4000 ? Number(t.sz) : undefined };
}
function slideOpts(az) {
  return {
    layout: str(az.layout, 120) || undefined, title: az.title !== undefined ? str(az.title, 500) : undefined, subtitle: az.subtitle !== undefined ? str(az.subtitle, 500) : undefined,
    body: cleanLines(az.body), body2: cleanLines(az.body2), table: cleanTable(az.table), date: az.date !== undefined ? str(az.date, 60) : undefined,
    notes: az.notes ? str(az.notes, 4000) : undefined, at: Number(az.at) >= 1 ? Number(az.at) : undefined,
  };
}
function applyActions(deck, azioni) {
  const esiti = [];
  for (const az of azioni) {
    const tipo = String(az && az.tipo || '');
    if (tipo === 'slide') esiti.push({ tipo, ...deck.addSlide(slideOpts(az)) });
    else if (tipo === 'agenda') esiti.push({ tipo, ...deck.addAgenda({ items: (Array.isArray(az.items) ? az.items : String(az.items || '').split('\n')).map((x) => str(x, 200)).filter(Boolean).slice(0, 30), current: az.current == null ? -1 : Number(az.current), from: Number(az.from) >= 1 ? Number(az.from) : undefined, layout: str(az.layout, 120) || undefined, title: str(az.title, 200) || undefined, at: Number(az.at) >= 1 ? Number(az.at) : undefined, dividers: !!az.dividers }) });
    else if (tipo === 'data') esiti.push({ tipo, slides: deck.setDate(str(az.testo || az.text, 60)) });
    else if (tipo === 'testi') { deck.setTexts(Number(az.slide), az.texts); esiti.push({ tipo, slide: Number(az.slide) }); }
    else if (tipo === 'compila') esiti.push({ tipo, slide: Number(az.slide), ...deck.fillSlide(Number(az.slide), { title: az.title, subtitle: az.subtitle, date: az.date, body: cleanLines(az.body) }) });
    else if (tipo === 'rimuovi') esiti.push({ tipo, rimosse: deck.removeSlides((Array.isArray(az.slides) ? az.slides : [az.slide]).map(Number)) });
    else if (tipo === 'pulisci') esiti.push({ tipo, ...deck.clean() });
    else throw new HttpError(400, `Azione sconosciuta: "${tipo}". Valide: slide, agenda, data, testi, compila, rimuovi, pulisci.`);
  }
  return esiti;
}
route('GET', '/api/cippi/docs/:id/layouts', {}, (ctx) => {
  const { doc } = openDoc(ctx.user, ctx.params.id);
  ctx.json(200, { layouts: layoutsOf(sourceBuf(doc.source_sha)), sezioni: Object.entries(SEZIONI).map(([k, v]) => ({ sezione: k, titolo: v })) });
});
route('POST', '/api/cippi/docs/:id/funzioni', {}, async (ctx) => {
  const { doc, project: p, canEdit } = openDoc(ctx.user, ctx.params.id);
  if (!canEdit) throw new HttpError(403, 'Non puoi modificare questo documento.');
  const b = await ctx.body();
  const azioni = Array.isArray(b.azioni) ? b.azioni : (b.tipo ? [b] : []);
  if (!azioni.length || azioni.length > 60) throw new HttpError(400, 'Indica da 1 a 60 azioni.');
  let deck;
  try { deck = openDeck(built(doc)); } catch (err) { throw new HttpError(err.status || 500, err.message); }
  let esiti;
  try { esiti = applyActions(deck, azioni); } catch (err) { throw err instanceof HttpError ? err : new HttpError(err.status || 400, err.message); }
  const v = newVersion(ctx, doc, p, deck.save(), 'cippi.funzioni', azioni.map((a) => a.tipo).join(', '));
  ctx.json(200, { ...v, esiti });
});
// Slide con un'immagine (il corpo della richiesta e' l'immagine): nel segnaposto immagine del layout, senza deformarla
route('PUT', '/api/cippi/docs/:id/slide-immagine', {}, async (ctx) => {
  const { doc, project: p, canEdit } = openDoc(ctx.user, ctx.params.id);
  if (!canEdit) throw new HttpError(403, 'Non puoi modificare questo documento.');
  const q = ctx.query;
  const data = await readBody(ctx.req, 25 * 1024 * 1024);
  if (data.length < 50) throw new HttpError(400, 'Immagine vuota.');
  const deck = openDeck(built(doc));
  let made;
  try {
    made = deck.addSlide({ ...slideOpts({ layout: q.get('layout'), title: q.get('title'), body: q.get('body') ? q.get('body').split('\n') : undefined, at: q.get('at'), notes: q.get('notes') }), picture: { data, name: str(q.get('name'), 200) || 'immagine.png', descr: str(q.get('descr'), 300) } });
  } catch (err) { throw new HttpError(err.status || 400, err.message); }
  const v = newVersion(ctx, doc, p, deck.save(), 'cippi.funzioni', 'immagine');
  ctx.json(200, { ...v, esiti: [{ tipo: 'immagine', ...made }] });
});
// Presentazione SAL dai dati (app/src/sal.js), costruita dentro il modello: un documento nuovo del progetto
route('POST', '/api/cippi/docs/:id/sal', {}, async (ctx) => {
  const { doc: m } = openDoc(ctx.user, ctx.params.id);
  const b = await ctx.body();
  const p = project(ctx.user, b.projectId || m.project_id);
  const dati = SAL.calcola(b.dati || {});
  const controlli = SAL.controlla(dati);
  if (controlli.some((c) => c.level === 'errore') && !b.forza) throw new HttpError(400, `Dati del SAL da sistemare: ${controlli.filter((c) => c.level === 'errore').map((c) => c.text).join(' ')}`);
  let buf;
  try { buf = salDeck(sourceBuf(m.source_sha), dati, { sezioni: Array.isArray(b.sezioni) ? b.sezioni.map(String) : undefined, ripetiAgenda: b.ripetiAgenda !== false, divisori: !!b.divisori, pulisci: b.pulisci !== false, titolo: b.titolo ? str(b.titolo, 300) : undefined }); } catch (err) { throw new HttpError(err.status || 500, err.message); }
  const name = clean(b.name, 120) || `SAL${dati.numero ? ` ${dati.numero}` : ''} ${dati.periodo.etichetta || ''}`.trim();
  const id = createDoc(ctx, p, buf, `${safeName(name)}.pptx`, { name, templateId: m.kind === 'modello' ? m.id : null });
  db.log(ctx, 'cippi.sal', `${p.name}: ${name} da ${m.name}`);
  ctx.json(201, { id, controlli, economics: dati.economics });
});

// ---- Punti chiave e note della revisione ----------------------------------------------------------
route('POST', '/api/cippi/docs/:id/points', {}, async (ctx) => {
  const { doc, canEdit } = openDoc(ctx.user, ctx.params.id);
  if (!canEdit) throw new HttpError(403, 'Non puoi modificare questo documento.');
  const b = await ctx.body();
  const kind = KINDS.includes(b.kind) ? b.kind : 'chiave';
  const r = db.run('INSERT INTO cippi_points(doc_id, slide, kind, text, status, auto, created_by, created_at) VALUES(?,?,?,?,?,0,?,?)',
    doc.id, b.slide ? Number(b.slide) : null, kind, clean(b.text, 2000, 'Testo'), 'aperto', ctx.user.id, db.now());
  ctx.json(201, { id: Number(r.lastInsertRowid) });
});
function openPoint(user, id) {
  const pt = db.get('SELECT * FROM cippi_points WHERE id = ?', Number(id));
  if (!pt) throw new HttpError(404, 'Punto non trovato.');
  const o = openDoc(user, pt.doc_id);
  if (!o.canEdit) throw new HttpError(403, 'Non puoi modificare questo documento.');
  return { pt, ...o };
}
route('PATCH', '/api/cippi/points/:id', {}, async (ctx) => {
  const { pt } = openPoint(ctx.user, ctx.params.id);
  const b = await ctx.body();
  db.run('UPDATE cippi_points SET text = ?, kind = ?, status = ?, slide = ?, updated_at = ? WHERE id = ?',
    b.text !== undefined ? clean(b.text, 2000, 'Testo') : pt.text, KINDS.includes(b.kind) ? b.kind : pt.kind,
    ['aperto', 'fatto'].includes(b.status) ? b.status : pt.status, b.slide !== undefined ? (b.slide ? Number(b.slide) : null) : pt.slide, db.now(), pt.id);
  ctx.json(200, { ok: true });
});
route('DELETE', '/api/cippi/points/:id', {}, (ctx) => {
  const { pt } = openPoint(ctx.user, ctx.params.id);
  db.run('DELETE FROM cippi_points WHERE id = ?', pt.id);
  ctx.json(200, { ok: true });
});

// ---- Appunti (PDF, Word, immagini...) nella cartella del documento ---------------------------------
route('PUT', '/api/cippi/docs/:id/appunti', {}, async (ctx) => {
  const { doc, project: p, canEdit } = openDoc(ctx.user, ctx.params.id);
  if (!canEdit) throw new HttpError(403, 'Non puoi modificare questo documento.');
  const name = safeName(String(ctx.query.get('name') || 'appunti')).replace(/ (\.\w+)$/, '$1');
  const buf = await readBody(ctx.req, Number(db.getSetting('maxFileMb')) * 1024 * 1024);
  ex.writeBuffer(space(p), rootOf(p), `${doc.folder}/Appunti/${name}`, buf, ctx.user.id, { keepHistory: true });
  db.log(ctx, 'cippi.appunti', `${doc.name}: ${name}`);
  ctx.json(201, { ok: true });
});

// ---- Glossario del progetto ----------------------------------------------------------------------
route('PUT', '/api/cippi/glossario', {}, async (ctx) => {
  const b = await ctx.body();
  const p = project(ctx.user, b.projectId);
  const term = clean(b.term, 30, 'Sigla').toUpperCase();
  db.run(`INSERT INTO cippi_glossary(project_id, term, meaning, updated_by, updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(project_id, term) DO UPDATE SET meaning = excluded.meaning, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  p.id, term, clean(b.meaning, 300), ctx.user.id, db.now());
  ctx.json(200, { ok: true });
});

// ---- Modelli ---------------------------------------------------------------------------------------
// Un documento diventa modello: si salva la sua "ricetta" (parti in ordine, blocchi, sezioni, legenda, stile)
route('POST', '/api/cippi/docs/:id/modello', {}, async (ctx) => {
  const { doc, project: p } = openDoc(ctx.user, ctx.params.id, { kind: 'documento' });
  const b = await ctx.body();
  const buf = built(doc);
  const id = createDoc(ctx, p, buf, `${safeName(b.name || doc.name)}.pptx`, { name: b.name || `Modello da ${doc.name}`, kind: 'modello' });
  if (b.description) db.run('UPDATE cippi_docs SET description = ? WHERE id = ?', clean(b.description, 1000), id);
  ctx.json(201, { id });
});

// Nuovo documento da un modello: le parti scelte, nell'ordine del modello, ripetute quante volte serve.
// Con "vuoto" i testi diventano segnaposto da compilare (i flussi e gli schemi restano come esempio).
const HINT = { titolo: 'Titolo della slide', sottotitolo: 'Sottotitolo', intestazione: 'Intestazione', paragrafo: 'Testo del paragrafo', elenco: 'Punto elenco', nota: 'Nota', etichetta: 'Etichetta' };
route('POST', '/api/cippi/models/:id/nuovo', {}, async (ctx) => {
  const { doc: m } = openDoc(ctx.user, ctx.params.id, { kind: 'modello' });
  const b = await ctx.body();
  const p = project(ctx.user, b.projectId);
  const tpl = JSON.parse(m.template);
  const { analysis } = load(m.source_sha);
  const picks = Array.isArray(b.parts) && b.parts.length ? b.parts : tpl.parts.map((x, i) => ({ part: i, count: 1 }));
  const slides = [];
  for (const pick of picks) {
    const part = tpl.parts[Number(pick.part)];
    if (!part) continue;
    const count = Math.max(1, Math.min(50, Number(pick.count) || 1));
    for (let i = 0; i < count; i++) {
      const src = part.examples[i % part.examples.length];
      const s = { src };
      if (b.vuoto && !['flusso', 'mappa', 'schema', 'copertina', 'chiusura', 'legenda', 'immagine'].includes(part.kind)) {
        const a = analysis.slides[src - 1];
        s.texts = {};
        for (const blk of a.blocks) if (HINT[blk.role] && blk.id) s.texts[blk.id] = blk.role === 'elenco' ? (blk.paragraphs || []).slice(0, 3).map((x) => ({ text: HINT.elenco, lvl: x.lvl })) : [HINT[blk.role]];
      }
      slides.push(s);
    }
  }
  if (!slides.length) throw new HttpError(400, 'Scegli almeno una parte del modello.');
  // il nuovo documento parte dal file del modello, ridotto alle slide scelte
  const buf = build(sourceBuf(m.source_sha), slides);
  const name = clean(b.name, 120, 'Nome');
  const id = createDoc(ctx, p, buf, `${safeName(name)}.pptx`, { name, templateId: m.id });
  ctx.json(201, { id });
});

module.exports = { load };
