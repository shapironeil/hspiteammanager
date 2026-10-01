'use strict';
// Stato del portale, registrazione, login/logout, profilo personale.
const config = require('../config');
const db = require('../db');
const security = require('../security');
const media = require('../media');
const { route, HttpError } = require('../http');

const grades = require('../grades');

// La persona collegata vede se stessa per intero (anche se e' Hacker); grado e badge vengono da grades.js.
const publicUser = (u) => ({
  id: u.id, username: u.username, name: u.name, role: u.role,
  mustChange: !!u.must_change, avatar: media.avatarUrl(u.avatar), title: u.title || null,
  ...grades.card(u, u), teamCount: grades.belowCount(u),
});
const userCount = () => db.get('SELECT COUNT(*) AS n FROM users').n;

function cleanText(value, max, label) {
  const s = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  if (!s) throw new HttpError(400, `${label}: campo obbligatorio.`);
  if (s.length > max) throw new HttpError(400, `${label}: massimo ${max} caratteri.`);
  return s;
}

// Dati comuni a registrazione e creazione account: nome, cognome -> nome completo e nome utente.
function identity(b) {
  const firstName = cleanText(b.firstName, 40, 'Nome');
  const lastName = cleanText(b.lastName, 40, 'Cognome');
  const username = security.makeUsername(firstName, lastName);
  if (!username) throw new HttpError(400, 'Nome e cognome devono contenere almeno una lettera o un numero.');
  return { name: `${firstName} ${lastName}`, username };
}

// Avatar casuale tra quelli liberi (non riservati a una qualifica).
function randomAvatar() {
  const all = media.list('avatar').filter((f) => !media.avatarRequires(f.name));
  return all.length ? all[Math.floor(Math.random() * all.length)].name : null;
}

// Ogni nuovo visitatore riceve un punto di partenza diverso per gli sfondi.
let backgroundTurn = Math.floor(Math.random() * 1000);

route('GET', '/api/state', { public: true }, (ctx) => {
  const setupNeeded = userCount() === 0;
  const backgrounds = media.list('background').map((f) => f.url);
  ctx.json(200, {
    version: config.VERSION,
    portalName: db.getSetting('portalName'),
    branding: media.branding(),
    backgrounds,
    portalBackgrounds: media.portalBackgrounds(),
    backgroundStart: backgrounds.length ? backgroundTurn++ % backgrounds.length : 0,
    roles: config.ROLE_LABELS,
    grades: ctx.user ? grades.all().map(({ level, ...g }) => (ctx.user.role === 'hacker' ? { ...g, level } : g)) : [],
    titles: config.TITLES,
    setupNeeded,
    canSetup: setupNeeded && ctx.isLocal,
    maxFileMb: Number(db.getSetting('maxFileMb')),
    user: ctx.user ? publicUser(ctx.user) : null,
  });
});

// Registrazione. Il primo account (solo dal PC che ospita il portale) diventa Hacker ed entra subito.
// Tutti gli altri nascono come Dipendente in attesa: entrano dopo l'approvazione dell'Hacker.
const registrations = new Map();
route('POST', '/api/register', { public: true }, async (ctx) => {
  const first = userCount() === 0;
  if (first && !ctx.isLocal) throw new HttpError(403, 'Il primo account si crea solo dal PC che ospita il portale.');
  const r = registrations.get(ctx.ip) || { count: 0, since: Date.now() };
  if (Date.now() - r.since > 3600000) { r.count = 0; r.since = Date.now(); }
  if (r.count >= 10) throw new HttpError(429, 'Troppe registrazioni da questo computer. Riprova tra un\'ora.');

  const b = await ctx.body();
  const { name, username } = identity(b);
  const pwErr = security.checkPassword(b.password);
  if (pwErr) throw new HttpError(400, pwErr);
  r.count += 1;
  registrations.set(ctx.ip, r);

  const res = db.run(
    'INSERT INTO users(username, name, role, pass_hash, active, pending, avatar, created_at, last_login, grade_id, badge) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    username, name, first ? 'hacker' : 'dipendente', security.hashPassword(b.password),
    first ? 1 : 0, first ? 0 : 1, randomAvatar(), db.now(), first ? db.now() : null, grades.defaultGrade().id, first ? '#2dd4bf' : null);
  const id = Number(res.lastInsertRowid);
  const user = db.get('SELECT * FROM users WHERE id = ?', id);

  if (!first) {
    db.log({ actor: username, ip: ctx.ip }, 'registrazione', `${name}: in attesa di approvazione`);
    return ctx.json(201, { pending: true, username });
  }
  db.log({ user, ip: ctx.ip }, 'setup', 'Portale configurato, creato account Hacker');
  ctx.json(201, { pending: false, username, user: publicUser(user) }, { 'Set-Cookie': security.sessionCookie(security.createSession(id)) });
});

route('POST', '/api/login', { public: true }, async (ctx) => {
  const b = await ctx.body();
  const username = String(b.username || '').trim().toLowerCase();
  const key = `${ctx.ip}|${username}`;
  if (security.loginBlocked(key)) throw new HttpError(429, 'Troppi tentativi. Riprova tra qualche minuto.');
  const user = db.get('SELECT * FROM users WHERE username = ?', username);
  const passOk = user && typeof b.password === 'string' && security.verifyPassword(b.password, user.pass_hash);
  if (!passOk) {
    security.loginFailed(key);
    db.log({ actor: username.slice(0, 32), ip: ctx.ip }, 'login.fallito', null);
    throw new HttpError(401, 'Nome utente o password non corretti.');
  }
  if (user.pending) throw new HttpError(403, 'Il tuo account è in attesa di approvazione. Potrai entrare appena viene approvato.');
  if (!user.active) throw new HttpError(403, 'Questo account è stato disabilitato.');
  security.loginOk(key);
  db.run('UPDATE users SET last_login = ? WHERE id = ?', db.now(), user.id);
  db.log({ user, ip: ctx.ip }, 'login', null);
  ctx.json(200, { user: publicUser(user) }, { 'Set-Cookie': security.sessionCookie(security.createSession(user.id)) });
});

route('POST', '/api/logout', { allowMustChange: true }, (ctx) => {
  security.destroySession(ctx.user.token_hash);
  db.log(ctx, 'logout', null);
  ctx.json(200, { ok: true }, { 'Set-Cookie': security.clearCookie() });
});

route('GET', '/api/avatars', {}, (ctx) => {
  ctx.json(200, media.list('avatar').map((f) => {
    const requires = media.avatarRequires(f.name);
    return { ...f, requires, locked: !media.avatarAllowed(ctx.user, f.name) };
  }));
});

route('PATCH', '/api/me', {}, async (ctx) => {
  const b = await ctx.body();
  if (b.name !== undefined) db.run('UPDATE users SET name = ? WHERE id = ?', cleanText(b.name, 80, 'Nome'), ctx.user.id);
  if (b.avatar !== undefined) {
    if (!media.resolve('avatar', String(b.avatar))) throw new HttpError(400, 'Avatar non valido.');
    if (!media.avatarAllowed(ctx.user, String(b.avatar))) throw new HttpError(403, 'Questo avatar è riservato a una qualifica che non hai.');
    db.run('UPDATE users SET avatar = ? WHERE id = ?', String(b.avatar), ctx.user.id);
  }
  db.log(ctx, 'profilo.modifica', null);
  ctx.json(200, { ok: true });
});

route('POST', '/api/me/password', { allowMustChange: true }, async (ctx) => {
  const b = await ctx.body();
  const row = db.get('SELECT pass_hash FROM users WHERE id = ?', ctx.user.id);
  if (typeof b.current !== 'string' || !security.verifyPassword(b.current, row.pass_hash)) {
    throw new HttpError(400, 'La password attuale non e\' corretta.');
  }
  const pwErr = security.checkPassword(b.next);
  if (pwErr) throw new HttpError(400, pwErr);
  if (b.next === b.current) throw new HttpError(400, 'La nuova password deve essere diversa da quella attuale.');
  db.run('UPDATE users SET pass_hash = ?, must_change = 0 WHERE id = ?', security.hashPassword(b.next), ctx.user.id);
  security.destroyUserSessions(ctx.user.id, ctx.user.token_hash);
  db.log(ctx, 'password.cambio', null);
  ctx.json(200, { ok: true });
});

module.exports = { publicUser, cleanText, identity, randomAvatar };
