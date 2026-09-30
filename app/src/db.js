'use strict';
// Database SQLite (modulo integrato in Node: nessuna installazione).
// Lo schema evolve tramite "migrazioni" numerate: per cambiare le tabelle
// si AGGIUNGE una voce in fondo a MIGRATIONS, non si modifica una esistente.
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(config.DATA_DIR, { recursive: true });
const db = new DatabaseSync(config.DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const MIGRATIONS = [
  // 1 - schema iniziale
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    pass_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    must_change INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_login TEXT
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '',
    guide TEXT NOT NULL DEFAULT '',
    file_id TEXT,
    file_name TEXT,
    file_size INTEGER,
    created_by INTEGER REFERENCES users(id),
    updated_at TEXT NOT NULL
  );
  CREATE TABLE files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    to_user INTEGER REFERENCES users(id),
    to_all INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    author_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL
  );
  CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    detail TEXT,
    ip TEXT
  );
  CREATE TABLE issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    detail TEXT,
    user_id INTEGER,
    username TEXT,
    resolved INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE INDEX idx_logs_ts ON logs(ts);
  CREATE INDEX idx_files_owner ON files(owner_id);
  `,
  // 2 - registrazione con approvazione e avatar
  `
  ALTER TABLE users ADD COLUMN pending INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN avatar TEXT;
  ALTER TABLE users ADD COLUMN title TEXT;
  `,
  // 3 - programmi come web app in apptools, progetti con membri
  `
  ALTER TABLE programs ADD COLUMN folder TEXT;
  CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'attivo',
    onedrive_url TEXT NOT NULL DEFAULT '',
    folder TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
  );
  `,
];

function migrate() {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
migrate();

const now = () => new Date().toISOString();
const get = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);

function getSetting(key) {
  const row = get('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : config.DEFAULT_SETTINGS[key];
}
function setSetting(key, value) {
  run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
}

// Registro attivita': chi ha fatto cosa.
function log(ctx, action, detail) {
  const u = ctx && ctx.user;
  run('INSERT INTO logs(ts, user_id, username, action, detail, ip) VALUES(?,?,?,?,?,?)',
    now(), u ? u.id : null, u ? u.username : (ctx && ctx.actor) || null, action, detail || null, (ctx && ctx.ip) || null);
}

// Errori e segnalazioni: kind = 'server' | 'client' | 'segnalazione'.
function issue(kind, message, detail, user) {
  run('INSERT INTO issues(ts, kind, message, detail, user_id, username) VALUES(?,?,?,?,?,?)',
    now(), kind, String(message).slice(0, 500), detail ? String(detail).slice(0, 4000) : null,
    user ? user.id : null, user ? user.username : null);
}

module.exports = { db, now, get, all, run, getSetting, setSetting, log, issue };
