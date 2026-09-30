'use strict';
// Password, sessioni e limite ai tentativi di login.
const crypto = require('node:crypto');
const config = require('./config');
const { get, run, now } = require('./db');

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD = 8;

// Nome utente = nome.cognome, senza accenti, spazi o simboli.
// Se esiste gia' si aggiunge un numero: mario.rossi, mario.rossi2, mario.rossi3...
const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function makeUsername(firstName, lastName) {
  const a = slug(firstName);
  const b = slug(lastName);
  if (!a || !b) return null;
  const base = `${a}.${b}`.slice(0, 28);
  let candidate = base;
  for (let n = 2; get('SELECT 1 AS x FROM users WHERE username = ?', candidate); n++) candidate = base + n;
  return candidate;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(parts[1], 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `La password deve avere almeno ${MIN_PASSWORD} caratteri.`;
  }
  if (password.length > 200) return 'Password troppo lunga.';
  return null;
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + config.SESSION_DAYS * 86400000).toISOString();
  run('INSERT INTO sessions(token_hash, user_id, created_at, expires_at) VALUES(?,?,?,?)', sha(token), userId, now(), expires);
  return token;
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function userFromRequest(req) {
  const token = parseCookies(req)[config.COOKIE];
  if (!token) return null;
  const row = get(
    `SELECT u.id, u.username, u.name, u.role, u.must_change, u.active, u.avatar, u.title, s.token_hash
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`, sha(token), now());
  if (!row || !row.active) return null;
  return row;
}

function sessionCookie(token) {
  const maxAge = config.SESSION_DAYS * 86400;
  return `${config.COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}
const clearCookie = () => `${config.COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

function destroySession(tokenHash) {
  run('DELETE FROM sessions WHERE token_hash = ?', tokenHash);
}
function destroyUserSessions(userId, exceptHash) {
  run('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', userId, exceptHash || '');
}
function cleanupSessions() {
  run('DELETE FROM sessions WHERE expires_at <= ?', now());
}

// Blocco temporaneo dopo troppi tentativi falliti (in memoria: si azzera al riavvio).
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60000;

function loginBlocked(key) {
  const a = attempts.get(key);
  return !!(a && a.until > Date.now());
}
function loginFailed(key) {
  const a = attempts.get(key) || { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) { a.until = Date.now() + LOCK_MS; a.count = 0; }
  attempts.set(key, a);
}
const loginOk = (key) => attempts.delete(key);

module.exports = {
  USERNAME_RE, makeUsername, hashPassword, verifyPassword, checkPassword,
  createSession, userFromRequest, sessionCookie, clearCookie,
  destroySession, destroyUserSessions, cleanupSessions,
  loginBlocked, loginFailed, loginOk,
};
