'use strict';
// Home, annunci, segnalazioni, log e pannello Sistema.
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../config');
const db = require('../db');
const storage = require('../storage');
const { route, HttpError } = require('../http');
const { cleanText } = require('./auth');

const count = (sql, ...p) => Number(db.get(sql, ...p).n);

// --- Home -------------------------------------------------------------------
route('GET', '/api/dashboard', {}, (ctx) => {
  const u = ctx.user;
  const rank = config.roleRank(u.role);
  const out = {
    projects: u.role === 'hacker' ? count('SELECT COUNT(*) AS n FROM projects') : count('SELECT COUNT(*) AS n FROM project_members WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)', u.id, db.now()),
    programs: count('SELECT COUNT(*) AS n FROM programs WHERE folder IS NOT NULL OR file_id IS NOT NULL'),
    myFiles: count('SELECT COUNT(*) AS n FROM files WHERE owner_id = ?', u.id),
    received: count('SELECT COUNT(*) AS n FROM files WHERE owner_id != ? AND (to_user = ? OR to_all = 1)', u.id, u.id),
    announcements: db.all(
      `SELECT a.id, a.title, a.body, a.created_at AS createdAt, a.author_id AS authorId, u.name AS author
       FROM announcements a LEFT JOIN users u ON u.id = a.author_id ORDER BY a.id DESC LIMIT 10`),
  };
  if (rank >= config.roleRank('manager')) {
    out.team = {
      active: count('SELECT COUNT(*) AS n FROM users WHERE active = 1'),
      neverLogged: count('SELECT COUNT(*) AS n FROM users WHERE active = 1 AND last_login IS NULL'),
      pending: count('SELECT COUNT(*) AS n FROM users WHERE pending = 1'),
    };
  }
  if (u.role === 'hacker') {
    out.system = {
      openIssues: count('SELECT COUNT(*) AS n FROM issues WHERE resolved = 0'),
      usedBytes: storage.usedBytes(),
      quotaBytes: storage.quotaBytes(),
    };
  }
  ctx.json(200, out);
});

// --- Annunci (manager e hacker) ----------------------------------------------
route('POST', '/api/announcements', { role: 'manager' }, async (ctx) => {
  const b = await ctx.body();
  const title = cleanText(b.title, 120, 'Titolo');
  const body = String(b.body || '').trim().slice(0, 2000);
  db.run('INSERT INTO announcements(title, body, author_id, created_at) VALUES(?,?,?,?)', title, body, ctx.user.id, db.now());
  db.log(ctx, 'annuncio.pubblicato', title);
  ctx.json(201, { ok: true });
});

route('DELETE', '/api/announcements/:id', { role: 'manager' }, (ctx) => {
  const a = db.get('SELECT * FROM announcements WHERE id = ?', Number(ctx.params.id));
  if (!a) throw new HttpError(404, 'Annuncio non trovato.');
  if (a.author_id !== ctx.user.id && ctx.user.role !== 'hacker') throw new HttpError(403, 'Puoi eliminare solo i tuoi annunci.');
  db.run('DELETE FROM announcements WHERE id = ?', a.id);
  db.log(ctx, 'annuncio.eliminato', a.title);
  ctx.json(200, { ok: true });
});

// --- Segnalazioni ed errori ---------------------------------------------------
route('POST', '/api/issues', {}, async (ctx) => {
  const b = await ctx.body();
  db.issue('segnalazione', cleanText(b.message, 500, 'Descrizione'), b.detail, ctx.user);
  ctx.json(201, { ok: true });
});

// Errori JavaScript raccolti automaticamente dal browser.
const clientErrorTimes = new Map();
route('POST', '/api/client-error', { allowMustChange: true }, async (ctx) => {
  const last = clientErrorTimes.get(ctx.user.id) || 0;
  if (Date.now() - last > 5000) {
    clientErrorTimes.set(ctx.user.id, Date.now());
    const b = await ctx.body();
    db.issue('client', String(b.message || 'Errore nel browser'), b.detail, ctx.user);
  }
  ctx.json(200, { ok: true });
});

route('GET', '/api/issues', { role: 'hacker' }, (ctx) => {
  ctx.json(200, db.all('SELECT id, ts, kind, message, detail, username, resolved FROM issues ORDER BY resolved ASC, id DESC LIMIT 300')
    .map((i) => ({ ...i, resolved: !!i.resolved })));
});

route('PATCH', '/api/issues/:id', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const r = db.run('UPDATE issues SET resolved = ? WHERE id = ?', b.resolved ? 1 : 0, Number(ctx.params.id));
  if (!r.changes) throw new HttpError(404, 'Voce non trovata.');
  ctx.json(200, { ok: true });
});

// --- Log attivita' ------------------------------------------------------------
route('GET', '/api/logs', { role: 'hacker' }, (ctx) => {
  const q = String(ctx.query.get('q') || '').trim();
  const rows = q
    ? db.all(`SELECT id, ts, username, action, detail, ip FROM logs
              WHERE username LIKE ? OR action LIKE ? OR detail LIKE ? ORDER BY id DESC LIMIT 300`, `%${q}%`, `%${q}%`, `%${q}%`)
    : db.all('SELECT id, ts, username, action, detail, ip FROM logs ORDER BY id DESC LIMIT 300');
  ctx.json(200, rows);
});

// --- Sistema ------------------------------------------------------------------
function accessUrls() {
  const urls = [{ label: 'Questo PC', url: `http://localhost:${config.PORT}` }];
  if (!config.networkOpen) return urls;
  urls.push({ label: 'Rete locale (nome del PC)', url: `http://${os.hostname()}:${config.PORT}` });
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      const p = a.address.split('.').map(Number);
      const tailscale = p[0] === 100 && p[1] >= 64 && p[1] <= 127;
      urls.push({ label: tailscale ? 'Tailscale' : `Rete locale (${name})`, url: `http://${a.address}:${config.PORT}` });
    }
  }
  return urls;
}

route('GET', '/api/system', { role: 'hacker' }, (ctx) => {
  ctx.json(200, {
    version: config.VERSION,
    node: process.version,
    platform: `${os.type()} ${os.release()}`,
    uptimeSeconds: Math.round(process.uptime()),
    dataDir: config.DATA_DIR,
    urls: accessUrls(),
    networkOpen: config.networkOpen,
    resources: require('../media').summary(),
    apps: require('../apps').folders(),
    storage: {
      usedBytes: storage.usedBytes(),
      quotaBytes: storage.quotaBytes(),
      diskFreeBytes: storage.diskFreeBytes(),
      files: count('SELECT COUNT(*) AS n FROM files'),
    },
    settings: {
      portalName: db.getSetting('portalName'),
      quotaGb: Number(db.getSetting('quotaGb')),
      maxFileMb: Number(db.getSetting('maxFileMb')),
    },
    counts: {
      users: count('SELECT COUNT(*) AS n FROM users'),
      sessions: count('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?', db.now()),
      logs: count('SELECT COUNT(*) AS n FROM logs'),
    },
  });
});

route('PATCH', '/api/settings', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  const portalName = cleanText(b.portalName, 60, 'Nome del portale');
  const quotaGb = Number(b.quotaGb);
  const maxFileMb = Number(b.maxFileMb);
  if (!Number.isFinite(quotaGb) || quotaGb < 1 || quotaGb > 10000) throw new HttpError(400, 'Spazio totale: tra 1 e 10000 GB.');
  if (!Number.isFinite(maxFileMb) || maxFileMb < 1 || maxFileMb > 102400) throw new HttpError(400, 'Dimensione massima file: tra 1 e 102400 MB.');
  db.setSetting('portalName', portalName);
  db.setSetting('quotaGb', Math.round(quotaGb));
  db.setSetting('maxFileMb', Math.round(maxFileMb));
  db.log(ctx, 'impostazioni.modificate', `spazio ${Math.round(quotaGb)} GB, file max ${Math.round(maxFileMb)} MB`);
  ctx.json(200, { ok: true });
});

// --- Backup (solo Hacker) -------------------------------------------------------
const backup = require('../backup');
route('GET', '/api/backups', { role: 'hacker' }, (ctx) => {
  const conf = backup.settings(db.getSetting);
  ctx.json(200, {
    dir: conf.dir, extraDir: conf.extraDir, auto: conf.auto, status: backup.readStatus(),
    areas: backup.sources(), backups: backup.list(conf.dir).slice(0, 60).map(({ path: p, errors, ...b }) => ({ ...b, errors: (errors || []).length })),
  });
});
route('POST', '/api/backups', { role: 'hacker' }, async (ctx) => {
  const r = await backup.run({ reason: 'manuale', sqlite: db.db, getSetting: db.getSetting });
  db.log(ctx, 'backup.eseguito', `${r.name}: ${r.files} file, ${r.copied} copiati`);
  ctx.json(201, { name: r.name, files: r.files, copied: r.copied, linked: r.linked, newBytes: r.newBytes, errors: r.errors.length, extra: r.extra });
});
route('PATCH', '/api/backups/settings', { role: 'hacker' }, async (ctx) => {
  const b = await ctx.body();
  for (const [key, field] of [['backupDir', 'dir'], ['backupExtraDir', 'extraDir']]) {
    if (typeof b[field] !== 'string') continue;
    const v = b[field].trim().replace(/^"|"$/g, '');
    if (v) {
      const abs = path.resolve(config.ROOT, v);
      const inside = (d) => abs === d || abs.startsWith(d + path.sep);
      if (inside(config.DATA_DIR) || inside(path.join(config.ROOT, 'progetti'))) throw new HttpError(400, 'Il backup non puo\' stare dentro le cartelle che salva.');
      try { fs.mkdirSync(abs, { recursive: true }); fs.writeFileSync(path.join(abs, '.prova-scrittura'), 'ok'); fs.rmSync(path.join(abs, '.prova-scrittura')); } catch { throw new HttpError(400, `Non riesco a scrivere in ${abs}.`); }
    }
    db.setSetting(key, v);
  }
  if (typeof b.auto === 'boolean') db.setSetting('backupAuto', b.auto ? '1' : '0');
  db.log(ctx, 'backup.impostazioni', JSON.stringify({ dir: b.dir, extraDir: b.extraDir, auto: b.auto }));
  ctx.json(200, { ok: true });
});

// --- Versione (unica fonte: version.json) --------------------------------------
// Pubblica (senza login): la leggono gli script di aggiornamento e il programma client.
// Il portale e' raggiungibile solo da questo PC o via Tailscale, quindi non e' visibile da internet.
route('GET', '/api/version', { public: true }, (ctx) => {
  ctx.json(200, { name: 'HSPI Team Manager', version: config.VERSION, channel: config.CHANNEL, released: config.RELEASED, client: require('../client-package').info() });
});

// --- Arresto ordinato richiesto dagli script dell'host (aggiornamento, ripristino) ---
// Solo da questo PC e solo con il codice segreto scritto in data/.host-token all'avvio.
const TOKEN_FILE = path.join(config.DATA_DIR, '.host-token');
const hostToken = crypto.randomBytes(24).toString('hex');
try { fs.writeFileSync(TOKEN_FILE, hostToken); } catch { /* cartella dati non scrivibile: arresto remoto non disponibile */ }
route('POST', '/api/host/shutdown', { public: true }, (ctx) => {
  const given = String(ctx.req.headers['x-host-token'] || '');
  if (!ctx.isLocal || given.length !== hostToken.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(hostToken))) throw new HttpError(403, 'Non consentito.');
  db.log({ actor: 'sistema', ip: ctx.ip }, 'portale.arresto', String(ctx.query.get('motivo') || 'richiesta locale').slice(0, 80));
  ctx.json(200, { ok: true });
  setTimeout(() => process.exit(0), 300);
});

module.exports = { accessUrls };
