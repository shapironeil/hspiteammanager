'use strict';
// Verbale Studio dentro il portale: le stesse funzioni dell'app locale, con i permessi dei progetti.
// Tutte le rotte stanno sotto /api/vs/ e rispecchiano quelle dell'app originale, cosi' l'interfaccia resta la stessa.
//
// Permessi: un checkpoint lo vede e lo modifica chi vede il progetto (membri e Hacker).
// Le azioni sul PC che ospita il portale (installare Ollama, scaricare modelli) solo l'Hacker.
// Niente si cancella: checkpoint e video eliminati vanno nel cestino del progetto.
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');
const config = require('../config');
const db = require('../db');
const ex = require('../explorer');
const A = require('../verbali/archivio');
const ollama = require('../verbali/ollama');
const { docxToText } = require('../verbali/docx');
const { route, HttpError } = require('../http');
const { openSpace, visibleSpaces } = require('./explorer');

const VERSION = '2.0.0';

// Gli errori dei moduli di Verbale Studio hanno "status": diventano errori leggibili per l'utente.
const h = (fn) => async (ctx) => {
  try { await fn(ctx); } catch (err) {
    if (err instanceof HttpError || !err.status) throw err;
    throw new HttpError(err.status, err.message);
  }
};
function readRaw(req, limit = 60 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'File troppo grande.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
// Corpo JSON fino a 30 MB: un checkpoint con transcript lungo e analisi pesa diversi MB.
async function body(ctx) {
  const buf = await readRaw(ctx.req, 30 * 1024 * 1024);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf8')); } catch { throw new HttpError(400, 'Dati non validi.'); }
}
const isHacker = (u) => u.role === 'hacker';
function needHacker(ctx) { if (!isHacker(ctx.user)) throw new HttpError(403, 'Solo l\'Hacker puo\' fare questa operazione.'); }

// ---- Impostazioni (per persona) e dati comuni ------------------------------------------
const userFile = (id) => path.join(config.VERBALI_DIR, 'utenti', `${id}.json`);
const commonFile = (name) => path.join(config.VERBALI_DIR, name);
function settingsOf(user) {
  const s = A.readJson(userFile(user.id), {});
  return {
    model: '', author: s.author != null ? s.author : user.name.split(' ')[0], ollamaModel: s.ollamaModel || '', mirrorDir: '',
    copyLinkedVideos: s.copyLinkedVideos !== false, hasApiKey: false, apiKeySource: null, apiKeyHint: '',
  };
}

route('GET', '/api/vs/state', {}, h(async (ctx) => {
  ctx.json(200, {
    projects: A.visibleProjects(ctx.user).map(A.projectView),
    settings: settingsOf(ctx.user),
    workDir: 'Portale', dataDir: '', packaged: false, runningFromTemp: false, version: VERSION,
    portal: {
      name: db.getSetting('portalName'), version: config.VERSION,
      user: { id: ctx.user.id, name: ctx.user.name, role: ctx.user.role },
      isHacker: isHacker(ctx.user), isHost: ctx.isLocal,
      canCreateProject: config.roleRank(ctx.user.role) >= config.roleRank('manager'),
    },
  });
}));

route('PUT', '/api/vs/settings', {}, h(async (ctx) => {
  const b = await body(ctx);
  const file = userFile(ctx.user.id);
  const s = A.readJson(file, {});
  if (typeof b.author === 'string') s.author = b.author.slice(0, 80);
  if (typeof b.ollamaModel === 'string') s.ollamaModel = b.ollamaModel.trim().slice(0, 80);
  if (typeof b.copyLinkedVideos === 'boolean') s.copyLinkedVideos = b.copyLinkedVideos;
  if (typeof b.apiKey === 'string' && b.apiKey.trim()) throw new HttpError(400, 'Nel portale l\'AI in cloud non e\' attiva: si usa solo l\'AI locale (Ollama), cosi\' i dati non escono dall\'azienda.');
  if (typeof b.mirrorDir === 'string' && b.mirrorDir.trim()) throw new HttpError(400, 'Nel portale la copia aggiuntiva non serve: i file stanno nelle cartelle dei progetti, con versioni e cestino.');
  await A.writeJson(file, s);
  ctx.json(200, settingsOf(ctx.user));
}));

// I progetti si creano e si tolgono dal portale (schermata Progetti), non da Verbale Studio.
route('POST', '/api/vs/projects', {}, () => { throw new HttpError(400, 'I progetti si creano dal portale: menu Progetti → Nuovo progetto.'); });
route('DELETE', '/api/vs/projects/:pid', {}, () => { throw new HttpError(400, 'I progetti si gestiscono dal portale: menu Progetti.'); });

route('PUT', '/api/vs/projects/:pid', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  ctx.json(200, await A.saveProject(P, await body(ctx), ctx.user));
}));

// ---- Checkpoint ---------------------------------------------------------------------
route('GET', '/api/vs/projects/:pid/checkpoints', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  ctx.json(200, (await A.list(P)).map(A.summaryOf));
}));

route('GET', '/api/vs/projects/:pid/history', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  ctx.json(200, {
    checkpoints: (await A.list(P)).map((c) => ({ ...A.summaryOf(c), templateId: c.templateId || '', summary: c.summary || null })),
    forecast: A.readJson(A.forecastFile(P), null),
  });
}));

route('POST', '/api/vs/projects/:pid/checkpoints', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const c = await A.create(P, await body(ctx), ctx.user);
  db.log(ctx, 'verbale.creato', `${P.p.name}: ${c.date} ${c.title}`);
  ctx.json(201, c);
}));

route('GET', '/api/vs/projects/:pid/checkpoints/:cid', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const c = A.load(P, ctx.params.cid);
  c.editing = A.othersEditing(c.id, ctx.user);
  ctx.json(200, c);
}));

async function saveHandler(ctx, beacon) {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const c = await A.save(P, ctx.params.cid, await body(ctx), ctx.user);
  if (beacon) return ctx.json(200, { ok: true });
  ctx.json(200, { ok: true, updatedAt: c.updatedAt, folder: c.folder, video: c.video || null, transcriptFile: c.transcriptFile || '', conflict: c.conflict || null });
}
route('PUT', '/api/vs/projects/:pid/checkpoints/:cid', {}, h((ctx) => saveHandler(ctx, false)));
// Salvataggio alla chiusura della pagina (fetch con keepalive)
route('POST', '/api/vs/projects/:pid/checkpoints/:cid/save', {}, h((ctx) => saveHandler(ctx, true)));

route('GET', '/api/vs/projects/:pid/checkpoints/:cid/versions', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  ctx.json(200, await A.listVersions(P, ctx.params.cid));
}));

route('POST', '/api/vs/projects/:pid/checkpoints/:cid/versions/restore', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const b = await body(ctx);
  const c = await A.restoreVersion(P, ctx.params.cid, b.file, ctx.user);
  db.log(ctx, 'verbale.versione-ripristinata', `${P.p.name}: ${c.date} ${c.title} (${b.file})`);
  ctx.json(200, c);
}));

route('DELETE', '/api/vs/projects/:pid/checkpoints/:cid', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const c = A.load(P, ctx.params.cid);
  await A.trash(P, ctx.params.cid, ctx.user);
  db.log(ctx, 'verbale.nel-cestino', `${P.p.name}: ${c.date} ${c.title}`);
  ctx.json(200, { ok: true });
}));

// ---- Video e transcript -------------------------------------------------------------
route('PUT', '/api/vs/projects/:pid/checkpoints/:cid/video', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const video = await A.uploadVideo(P, ctx.params.cid, ctx.req, ctx.query.get('name'), ctx.user);
  db.log(ctx, 'verbale.video-caricato', `${P.p.name}: ${video.external}`);
  ctx.json(200, video);
}));

route('DELETE', '/api/vs/projects/:pid/checkpoints/:cid/video', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  await A.removeVideo(P, ctx.params.cid, ctx.user);
  ctx.json(200, { ok: true });
}));

// "rel" dell'app = "<spazio>/<percorso>" in uno spazio del portale (es. "p3/Registrazioni/riunione.mp4")
function spaceFile(user, rel) {
  const s = String(rel || '');
  const i = s.indexOf('/');
  if (i < 1) throw new HttpError(400, 'Percorso non valido.');
  const space = openSpace(user, s.slice(0, i));
  const at = ex.resolve(space.root, s.slice(i + 1));
  let st;
  try { st = fs.statSync(at.full); } catch { st = null; }
  if (!st || !st.isFile()) throw new HttpError(404, 'File non trovato.');
  return { id: s, space: space.id, label: space.label, rel: at.rel, abs: at.full, size: st.size };
}

route('POST', '/api/vs/projects/:pid/checkpoints/:cid/video-link', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const b = await body(ctx);
  const src = spaceFile(ctx.user, b.rel);
  if (!A.VIDEO_EXT.test(src.abs)) throw new HttpError(400, 'Non e\' un video o un audio.');
  ctx.json(200, await A.linkVideo(P, ctx.params.cid, src, settingsOf(ctx.user).copyLinkedVideos, ctx.user));
}));

route('PUT', '/api/vs/projects/:pid/checkpoints/:cid/transcript-file', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const fromRel = ctx.query.get('rel');
  let buf;
  let name;
  if (fromRel) { const src = spaceFile(ctx.user, fromRel); buf = fs.readFileSync(src.abs); name = path.basename(src.abs); } else { buf = await readRaw(ctx.req); name = ctx.query.get('name') || 'transcript.txt'; }
  if (!buf.length) throw new HttpError(400, 'Il file e\' vuoto.');
  ctx.json(200, { transcriptFile: await A.saveTranscriptFile(P, ctx.params.cid, buf, name, ctx.user) });
}));

// Video del checkpoint (con Range per scorrere avanti e indietro)
route('GET', '/api/vs/media/:pid/:cid', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const c = A.load(P, ctx.params.cid);
  if (!c.video) throw new HttpError(404, 'Nessun video.');
  let file;
  if (c.video.file) file = path.join(P.root, ...c.folder.split('/'), c.video.file);
  else if (c.video.link) file = ex.resolve(openSpace(ctx.user, c.video.link.space).root, c.video.link.path).full;
  else throw new HttpError(404, 'Nessun video.');
  ex.send(ctx.req, ctx.res, file, path.basename(file), { inline: true });
}));

// ---- "Cartella di lavoro": video e transcript negli spazi del portale ---------------------
route('GET', '/api/vs/folder', {}, h(async (ctx) => {
  const spaces = visibleSpaces(ctx.user);
  const byKey = new Map(spaces.map((s) => [s.key, s]));
  const rows = db.all(
    `SELECT space, path, parent, name, size, mtime FROM fs_index WHERE is_dir = 0 AND space IN (${spaces.map(() => '?').join(',')})
     AND (${['mp4', 'm4v', 'mov', 'webm', 'mkv', 'm4a', 'mp3', 'wav', 'vtt', 'srt', 'txt', 'docx'].map(() => 'lower(name) LIKE ?').join(' OR ')})
     ORDER BY mtime DESC LIMIT 2000`,
    ...spaces.map((s) => s.key), ...['mp4', 'm4v', 'mov', 'webm', 'mkv', 'm4a', 'mp3', 'wav', 'vtt', 'srt', 'txt', 'docx'].map((e) => `%.${e}`));
  const projectsList = A.visibleProjects(ctx.user);
  const checkpoints = [];
  const used = new Map();
  for (const P of projectsList) {
    for (const c of await A.list(P)) {
      const mark = (rel, kind) => rel && used.set(rel, { projectId: String(P.p.id), projectName: P.p.name, checkpointId: c.id, date: c.date, title: c.title, kind });
      if (c.video && c.video.file) mark(`p${P.p.id}/${c.folder}/${c.video.file}`);
      if (c.video && c.video.sourceRel) mark(c.video.sourceRel);
      if (c.video && c.video.link) mark(`${c.video.link.space}/${c.video.link.path}`);
      if (c.transcript && c.transcript.sourcePath) mark(c.transcript.sourcePath);
      checkpoints.push(overview(P, c));
    }
  }
  const files = [];
  for (const r of rows) {
    const s = byKey.get(r.space);
    const type = A.VIDEO_EXT.test(r.name) ? 'video' : 'transcript';
    if (/^(readme|license|changelog|leggimi)/i.test(r.name)) continue;
    // i testi generati da Verbale Studio non sono transcript da importare
    if (/^(Transcript revisionato|Email di riepilogo|Punti chiave|Note)\.txt$/i.test(r.name)) continue;
    const rel = `${s.id}/${r.path}`;
    files.push({ rel, name: r.name, dir: `${s.label}${r.parent ? '/' + r.parent : ''}`, type, size: r.size, mtime: r.mtime, usedBy: used.get(rel) || null });
  }
  ctx.json(200, { workDir: 'Spazi del portale (i tuoi file e i progetti di cui fai parte)', dataDir: '', archiveDir: '', files, checkpoints: checkpoints.sort((a, b) => b.date.localeCompare(a.date)) });
}));

// Per ogni checkpoint: quali file ci sono nella sua cartella (e quali mancano)
function overview(P, c) {
  const abs = path.join(P.root, ...c.folder.split('/'));
  let names = [];
  try { names = fs.readdirSync(abs).filter((n) => !n.startsWith('.') && !n.endsWith('.part') && !n.endsWith('.nuovo')); } catch { /* cartella sparita */ }
  const info = (name) => {
    if (!name || !names.includes(name)) return null;
    const st = fs.statSync(path.join(abs, name));
    return { rel: `p${P.p.id}/${c.folder}/${name}`, size: st.size, mtime: st.mtime.toISOString() };
  };
  const known = /^(Registrazione\.|Transcript originale\.|Transcript revisionato\.txt|Email di riepilogo\.txt|Punti chiave\.txt|Note\.txt)/i;
  const original = names.find((n) => /^Transcript originale\./i.test(n));
  let video = null;
  if (c.video && c.video.file) video = { ...(info(c.video.file) || { rel: `p${P.p.id}/${c.folder}/${c.video.file}`, missing: true }), inArchive: true, source: c.video.source || '' };
  else if (c.video && c.video.link) video = { rel: `${c.video.link.space}/${c.video.link.path}`, size: c.video.size, inArchive: false, source: c.video.source || '' };
  return {
    projectId: String(P.p.id), projectName: P.p.name, id: c.id, date: c.date, title: c.title, status: c.status, folder: `p${P.p.id}/${c.folder}`,
    video, transcriptOriginal: info(original), transcriptRevised: info('Transcript revisionato.txt'), email: info('Email di riepilogo.txt'),
    pins: info('Punti chiave.txt'), notes: info('Note.txt'), data: { rel: `p${P.p.id}/${c.folder}`, size: 0 },
    other: names.filter((n) => !known.test(n) && fs.statSync(path.join(abs, n)).isFile()).map(info).filter(Boolean),
    cueCount: (c.transcript && c.transcript.cues ? c.transcript.cues.length : 0),
  };
}

route('POST', '/api/vs/folder/read', {}, h(async (ctx) => {
  const b = await body(ctx);
  const src = spaceFile(ctx.user, b.rel);
  if (src.size > 60 * 1024 * 1024) throw new HttpError(413, 'File troppo grande per essere letto come transcript.');
  const buf = fs.readFileSync(src.abs);
  let text;
  try { text = /\.docx$/i.test(src.abs) ? docxToText(buf) : buf.toString('utf8'); } catch (err) { throw new HttpError(400, err.message); }
  ctx.json(200, { text, name: path.basename(src.abs), rel: src.id });
}));

// Aprire file e cartelle "sul computer" ha senso solo sul PC che ospita il portale, e solo per l'Hacker.
// Da qualunque altro dispositivo l'interfaccia apre invece Esplora file del portale.
function hostOpen(ctx, abs, reveal) {
  if (!ctx.isLocal || !isHacker(ctx.user)) throw new HttpError(400, 'Disponibile solo sul PC che ospita il portale: usa Esplora file.');
  let cmd;
  if (process.platform === 'win32') cmd = reveal ? `explorer /select,"${abs}"` : `explorer "${abs}"`;
  else if (process.platform === 'darwin') cmd = `open ${reveal ? '-R ' : ''}"${abs}"`;
  else cmd = `xdg-open "${reveal ? path.dirname(abs) : abs}"`;
  exec(cmd, () => {});
}
route('POST', '/api/vs/folder/open-file', {}, h(async (ctx) => {
  const b = await body(ctx);
  hostOpen(ctx, spaceFile(ctx.user, b.rel).abs, b.reveal);
  ctx.json(200, { ok: true });
}));
route('POST', '/api/vs/folder/open', {}, h(async (ctx) => {
  const b = await body(ctx);
  const s = String(b.rel || '');
  const i = s.indexOf('/');
  const space = openSpace(ctx.user, i > 0 ? s.slice(0, i) : s || 'me');
  hostOpen(ctx, ex.resolve(space.root, i > 0 ? s.slice(i + 1) : '').full, false);
  ctx.json(200, { ok: true });
}));

// ---- Apprendimento e previsione (per progetto) -----------------------------------------
route('GET', '/api/vs/projects/:pid/learning', {}, h(async (ctx) => {
  ctx.json(200, A.readJson(A.learningFile(A.openProject(ctx.user, ctx.params.pid)), null));
}));
route('PUT', '/api/vs/projects/:pid/learning', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const b = await body(ctx);
  const file = A.learningFile(P);
  // azzerare l'apprendimento conserva comunque una copia di quello precedente
  if (!b || !Object.keys(b).length) await A.keepCopy(file);
  await A.writeJson(file, b && Object.keys(b).length ? b : null);
  ctx.json(200, { ok: true });
}));
route('PUT', '/api/vs/projects/:pid/forecast', {}, h(async (ctx) => {
  const P = A.openProject(ctx.user, ctx.params.pid);
  const b = await body(ctx);
  await A.keepCopy(A.forecastFile(P));
  await A.writeJson(A.forecastFile(P), { ...b, savedAt: db.now(), savedBy: ctx.user.name });
  ctx.json(200, { ok: true });
}));

// ---- AI locale (Ollama, sul PC che ospita il portale) -----------------------------------
function trainingExamples(list) {
  const out = [];
  for (const c of list) {
    for (const v of Object.values(c.summary || {})) {
      if (!Array.isArray(v)) continue;
      for (const it of v) if (it && it.ref && it.ref.source && it.text && it.ref.source.trim() !== it.text.trim()) out.push({ source: it.ref.source, text: it.text });
    }
  }
  return out;
}

route('GET', '/api/vs/ollama/status', {}, h(async (ctx) => {
  const pid = ctx.query.get('projectId');
  const st = await ollama.status();
  let examples = 0;
  if (pid) { try { examples = trainingExamples(await A.list(A.openProject(ctx.user, pid))).length; } catch { /* progetto non visibile */ } }
  ctx.json(200, {
    ...st, recommended: ollama.RECOMMENDED, jobs: ollama.jobs, platform: process.platform,
    trainedModel: pid ? ollama.trainedName(pid) : null, trainingExamples: examples, canManage: isHacker(ctx.user),
  });
}));
route('POST', '/api/vs/ollama/install', {}, h(async (ctx) => { needHacker(ctx); ctx.json(200, ollama.install()); }));
route('POST', '/api/vs/ollama/start', {}, h(async (ctx) => { needHacker(ctx); ollama.startApp(); ctx.json(200, { ok: true }); }));
route('POST', '/api/vs/ollama/pull', {}, h(async (ctx) => {
  needHacker(ctx);
  const { model } = await body(ctx);
  if (!/^[\w.:/-]{2,80}$/.test(model || '')) throw new HttpError(400, 'Nome modello non valido.');
  ctx.json(200, ollama.pull(model));
}));
route('POST', '/api/vs/ollama/delete', {}, h(async (ctx) => {
  needHacker(ctx);
  const { model } = await body(ctx);
  await ollama.removeModel(model);
  ctx.json(200, { ok: true });
}));
route('POST', '/api/vs/ollama/train', {}, h(async (ctx) => {
  const b = await body(ctx);
  const P = A.openProject(ctx.user, b.projectId);
  if (!P.canEdit) throw new HttpError(403, 'Addestrare il modello del progetto spetta a un Manager del progetto o all\'Hacker.');
  const s = settingsOf(ctx.user);
  const project = A.projectView(P);
  ctx.json(200, await ollama.train({ project, author: s.author, base: b.base || s.ollamaModel || 'qwen2.5:3b', examples: trainingExamples(await A.list(P)) }));
}));
route('POST', '/api/vs/ollama/task', {}, h(async (ctx) => {
  const b = await body(ctx);
  const P = A.openProject(ctx.user, b.projectId);
  const s = settingsOf(ctx.user);
  const model = b.model || s.ollamaModel;
  if (!model) throw new HttpError(400, 'Scegli un modello nella finestra “AI locale”.');
  const text = await ollama.task({ model, project: A.projectView(P), author: s.author, task: b.task, text: String(b.text || '').slice(0, 4000) });
  ctx.json(200, { text });
}));

// Chat sul checkpoint: risposta in streaming (una riga JSON per pezzo di testo).
route('POST', '/api/vs/ollama/chat', {}, h(async (ctx) => {
  const b = await body(ctx);
  const P = A.openProject(ctx.user, b.projectId);
  const c = A.load(P, b.checkpointId);
  const s = settingsOf(ctx.user);
  if (!s.ollamaModel) throw new HttpError(400, 'Scegli un modello nella finestra “AI locale”.');
  const system = ollama.checkpointSystemPrompt({ project: A.projectView(P), author: s.author, checkpoint: c, context: b.context || {}, template: b.template });
  const history = (Array.isArray(b.messages) ? b.messages : []).slice(-12)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 12000) }));
  const upstream = await ollama.chatStream({ model: s.ollamaModel, messages: [{ role: 'system', content: system }, ...history], format: b.format, numCtx: b.context && b.context.transcript ? 16384 : 8192 });
  ctx.res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  try { for await (const chunk of upstream.body) ctx.res.write(chunk); } catch { /* connessione interrotta */ }
  ctx.res.end();
}));

// L'AI in cloud (Claude API) non e' attiva nel portale: i dati delle riunioni restano in azienda.
for (const what of ['summary', 'proofread', 'forecast']) {
  route('POST', `/api/vs/ai/${what}`, {}, () => { throw new HttpError(400, 'Nel portale l\'AI in cloud non e\' attiva: usa l\'AI locale (Ollama) o compila a mano.'); });
}

// ---- Cestino dei checkpoint (cestino dei progetti, solo le cartelle di checkpoint) -------------
route('GET', '/api/vs/trash', {}, h(async (ctx) => {
  const out = [];
  for (const P of A.visibleProjects(ctx.user)) {
    for (const t of ex.listTrash(P.root)) {
      if (!t.isDir) continue;
      const c = A.readJson(path.join(P.root, ex.TRASH, t.id, A.META, 'checkpoint.json'), null);
      if (!c) continue;
      out.push({ id: `p${P.p.id}:${t.id}`, kind: 'checkpoint', projectId: String(P.p.id), projectName: P.p.name, checkpointId: c.id, title: c.title, date: c.date, deletedAt: t.deletedAt, by: t.by });
    }
  }
  ctx.json(200, out.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt))));
}));
route('POST', '/api/vs/trash/restore', {}, h(async (ctx) => {
  const b = await body(ctx);
  const m = /^p(\d+):(.+)$/.exec(String(b.id || ''));
  if (!m) throw new HttpError(400, 'Elemento non valido.');
  const P = A.openProject(ctx.user, m[1]);
  const rel = ex.restore(P.space, P.root, m[2], ctx.user.id);
  A.sync(P);
  db.log(ctx, 'verbale.ripristinato', `${P.p.name}: ${rel}`);
  ctx.json(200, { ok: true, projectId: String(P.p.id), restoredTo: rel });
}));
route('DELETE', '/api/vs/trash/:id', {}, () => { throw new HttpError(400, 'Nel portale il cestino non si svuota: i checkpoint eliminati restano recuperabili.'); });

route('GET', '/api/vs/backup/status', {}, (ctx) => ctx.json(200, { portal: true, backupDir: '', archiveDir: '', mirrorDir: '', lastDaily: null, lastMirror: null, lastError: null, backups: [] }));
route('POST', '/api/vs/backup/now', {}, () => { throw new HttpError(400, 'Nel portale i salvataggi sono automatici (versioni e cestino nelle cartelle dei progetti).'); });

// ---- Template e preimpostazioni (comuni a tutto il team) -----------------------------------
for (const [name, file] of [['templates', 'templates.json'], ['presets', 'presets.json']]) {
  route('GET', `/api/vs/${name}`, {}, (ctx) => ctx.json(200, A.readJson(commonFile(file), [])));
  route('PUT', `/api/vs/${name}`, {}, h(async (ctx) => {
    const b = await body(ctx);
    if (!Array.isArray(b)) throw new HttpError(400, 'Formato non valido.');
    await A.keepCopy(commonFile(file));
    await A.writeJson(commonFile(file), b);
    db.log(ctx, `verbale.${name}-salvati`, `${b.length} elementi`);
    ctx.json(200, { ok: true });
  }));
}

route('POST', '/api/vs/docx-text', {}, h(async (ctx) => {
  const buf = await readRaw(ctx.req);
  try { ctx.json(200, { text: docxToText(buf) }); } catch (err) { throw new HttpError(400, err.message); }
}));

// Errori dell'interfaccia: finiscono in "Errori e bug" dell'Hacker.
route('POST', '/api/vs/log', {}, h(async (ctx) => {
  const b = await body(ctx).catch(() => ({}));
  db.issue('verbale-studio', `Verbale Studio ${VERSION}: ${String(b.message || '').slice(0, 400)}`, `${String(b.stack || '').slice(0, 2000)}\n${String(b.context || '').slice(0, 300)}`, ctx.user);
  ctx.json(200, { ok: true });
}));

// ---- Importazione dal vecchio Verbale Studio (solo Hacker, dal PC del portale) -------------------
route('POST', '/api/vs/import', { role: 'hacker' }, h(async (ctx) => {
  if (!ctx.isLocal) throw new HttpError(400, 'L\'importazione si fa dal PC che ospita il portale.');
  const b = await body(ctx);
  const report = await require('../verbali/importa').importa(String(b.dir || ''), ctx.user, { dryRun: Boolean(b.dryRun) });
  if (!b.dryRun) db.log(ctx, 'verbale.importazione', `${report.checkpoints} checkpoint da ${b.dir}`);
  ctx.json(200, report);
}));

module.exports = { VERSION };
