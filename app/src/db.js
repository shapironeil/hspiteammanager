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
  // 4 - programmi con un proprio motore: indirizzo a cui aprirli
  `
  ALTER TABLE programs ADD COLUMN url TEXT;
  `,
  // 5 - Esplora file (indice delle cartelle vere) e Verbale Studio integrato
  `
  CREATE TABLE fs_index (
    space TEXT NOT NULL,
    path TEXT NOT NULL,
    parent TEXT NOT NULL,
    name TEXT NOT NULL,
    is_dir INTEGER NOT NULL DEFAULT 0,
    size INTEGER NOT NULL DEFAULT 0,
    mtime TEXT,
    updated_by INTEGER,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (space, path)
  );
  CREATE INDEX idx_fs_parent ON fs_index(space, parent);
  CREATE INDEX idx_fs_name ON fs_index(name);
  CREATE INDEX idx_fs_updated ON fs_index(updated_at);
  CREATE TABLE verbali (
    id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL,
    folder TEXT NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'bozza',
    template_id TEXT,
    cue_count INTEGER NOT NULL DEFAULT 0,
    reviewed_count INTEGER NOT NULL DEFAULT 0,
    pin_count INTEGER NOT NULL DEFAULT 0,
    item_count INTEGER NOT NULL DEFAULT 0,
    updated_by INTEGER,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_verbali_project ON verbali(project_id, date);
  `,
  // 6 - gradi personalizzabili (gerarchia), Hacker nascosto con badge, persone eliminate, ospiti temporanei nei progetti
  `
  CREATE TABLE grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#9a8f86',
    level TEXT NOT NULL DEFAULT 'dipendente',
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  INSERT INTO grades(name, color, level, position, created_at) VALUES
    ('Stage', '#8fb3c9', 'dipendente', 10, datetime('now')),
    ('Dipendente', '#a89a8c', 'dipendente', 20, datetime('now')),
    ('PM manager', '#7f9cf5', 'manager', 30, datetime('now')),
    ('Manager', '#b388eb', 'manager', 40, datetime('now')),
    ('Senior manager', '#e0a24f', 'manager', 50, datetime('now'));
  ALTER TABLE users ADD COLUMN grade_id INTEGER REFERENCES grades(id);
  ALTER TABLE users ADD COLUMN badge TEXT;
  ALTER TABLE users ADD COLUMN deleted_at TEXT;
  UPDATE users SET grade_id = (SELECT id FROM grades WHERE name = 'Manager') WHERE role = 'manager';
  UPDATE users SET grade_id = (SELECT id FROM grades WHERE name = 'Dipendente') WHERE grade_id IS NULL;
  UPDATE users SET badge = '#2dd4bf' WHERE role = 'hacker';
  ALTER TABLE project_members ADD COLUMN expires_at TEXT;
  ALTER TABLE project_members ADD COLUMN added_by INTEGER;
  ALTER TABLE project_members ADD COLUMN added_at TEXT;
  CREATE TABLE project_access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    added_by INTEGER,
    days INTEGER,
    note TEXT,
    starts_at TEXT NOT NULL,
    expires_at TEXT,
    ended_at TEXT
  );
  CREATE INDEX idx_access_user ON project_access_log(user_id);
  `,
  // 7 - Trama: mappe di processi (macro N, processo N.N, micro N.N.N) per progetto
  `
  CREATE TABLE trama_maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE TABLE trama_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id INTEGER NOT NULL,
    parent_id INTEGER,
    level INTEGER NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    macro_code INTEGER,
    ambito TEXT NOT NULL DEFAULT '',
    dipartimenti TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    responsible_id INTEGER,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT '',
    protected INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    updated_by INTEGER,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    deleted_batch TEXT
  );
  CREATE INDEX idx_trama_nodes_map ON trama_nodes(map_id, parent_id, position);
  CREATE INDEX idx_trama_nodes_due ON trama_nodes(responsible_id, due_date);
  CREATE TABLE trama_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    user_id INTEGER,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_trama_comments_node ON trama_comments(node_id);
  CREATE TABLE trama_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id INTEGER NOT NULL,
    node_id INTEGER,
    user_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT,
    at TEXT NOT NULL
  );
  CREATE INDEX idx_trama_history_node ON trama_history(node_id);
  CREATE TABLE trama_delete_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    map_id INTEGER NOT NULL,
    requested_by INTEGER,
    reason TEXT,
    created_at TEXT NOT NULL,
    decided_by INTEGER,
    decided_at TEXT,
    decision TEXT
  );
  `,
  // 8 - Trama diventa GestioneCelle: stesse tabelle, nome nuovo (i riferimenti tra tabelle si aggiornano da soli)
  `
  ALTER TABLE trama_maps RENAME TO celle_maps;
  ALTER TABLE trama_nodes RENAME TO celle_nodes;
  ALTER TABLE trama_comments RENAME TO celle_comments;
  ALTER TABLE trama_history RENAME TO celle_history;
  ALTER TABLE trama_delete_requests RENAME TO celle_delete_requests;
  DROP INDEX idx_trama_nodes_map;
  DROP INDEX idx_trama_nodes_due;
  DROP INDEX idx_trama_comments_node;
  DROP INDEX idx_trama_history_node;
  CREATE INDEX idx_celle_nodes_map ON celle_nodes(map_id, parent_id, position);
  CREATE INDEX idx_celle_nodes_due ON celle_nodes(responsible_id, due_date);
  CREATE INDEX idx_celle_comments_node ON celle_comments(node_id);
  CREATE INDEX idx_celle_history_node ON celle_history(node_id);
  UPDATE logs SET action = 'celle.' || substr(action, 7) WHERE action LIKE 'trama.%';
  -- Verbale Studio e' ora un'app del catalogo: via la scheda segnaposto creata al primo avvio, se mai usata
  DELETE FROM programs WHERE name = 'Verbale Studio' AND description = 'App per la redazione dei verbali.'
    AND file_id IS NULL AND folder IS NULL AND (url IS NULL OR url = '');
  `,
  // 9 - MPoint (allora Cippi): presentazioni (documenti e modelli), punti chiave della revisione, glossario del progetto
  `
  CREATE TABLE cippi_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'documento',
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    source_sha TEXT NOT NULL,
    source_name TEXT NOT NULL,
    folder TEXT NOT NULL,
    slides TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'bozza',
    version INTEGER NOT NULL DEFAULT 1,
    template_id INTEGER,
    template TEXT,
    shared INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX idx_cippi_docs_project ON cippi_docs(project_id, kind);
  CREATE TABLE cippi_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL,
    slide INTEGER,
    kind TEXT NOT NULL DEFAULT 'chiave',
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'aperto',
    auto INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
  CREATE INDEX idx_cippi_points_doc ON cippi_points(doc_id, slide);
  CREATE TABLE cippi_glossary (
    project_id INTEGER NOT NULL,
    term TEXT NOT NULL,
    meaning TEXT NOT NULL DEFAULT '',
    updated_by INTEGER,
    updated_at TEXT,
    PRIMARY KEY (project_id, term)
  );
  `,
  // 10 - MPoint (allora Cippi): contesto generale del documento e caratteristiche degli elementi (step, attori, processi, blocchi)
  `
  ALTER TABLE cippi_docs ADD COLUMN background TEXT NOT NULL DEFAULT '';
  CREATE TABLE cippi_items (
    doc_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_by INTEGER,
    updated_at TEXT,
    PRIMARY KEY (doc_id, key)
  );
  `,
  // 11 - MPoint (allora Cippi): modifiche a livello di documento (trova e sostituisci anche nei layout: piè di pagina, scritte fisse)
  `
  ALTER TABLE cippi_docs ADD COLUMN edits TEXT NOT NULL DEFAULT '{}';
  `,
  // 12 - MPoint: file recenti per persona (ultima apertura di ogni documento), per la schermata iniziale
  `
  CREATE TABLE mpoint_recenti (
    user_id INTEGER NOT NULL,
    doc_id INTEGER NOT NULL,
    opened_at TEXT NOT NULL,
    PRIMARY KEY (user_id, doc_id)
  );
  CREATE INDEX idx_mpoint_recenti_user ON mpoint_recenti(user_id, opened_at);
  `,
  // 13 - MPoint: le tabelle prendono il nome dell'app (prima si chiamava Cippi); i dati restano, gli indici si rifanno
  `
  ALTER TABLE cippi_docs RENAME TO mpoint_docs;
  ALTER TABLE cippi_points RENAME TO mpoint_points;
  ALTER TABLE cippi_glossary RENAME TO mpoint_glossary;
  ALTER TABLE cippi_items RENAME TO mpoint_items;
  DROP INDEX IF EXISTS idx_cippi_docs_project;
  CREATE INDEX idx_mpoint_docs_project ON mpoint_docs(project_id, kind);
  DROP INDEX IF EXISTS idx_cippi_points_doc;
  CREATE INDEX idx_mpoint_points_doc ON mpoint_points(doc_id, slide);
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
