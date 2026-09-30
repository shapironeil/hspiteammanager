'use strict';
// Home, annunci, segnalazioni, log e pannello Sistema.
const os = require('node:os');
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
    programs: count('SELECT COUNT(*) AS n FROM programs'),
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

module.exports = { accessUrls };
