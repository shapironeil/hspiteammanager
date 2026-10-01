'use strict';
// Catalogo delle app dedicate del portale (Verbale Studio, GestioneCelle, ...).
//
// Ogni app e' una cartella in app/catalogo/<id>/ con:
//   app.json   scheda dell'app: nome, VERSIONE PROPRIA (unica fonte per quell'app), pagina web, novita', motore
//   icon.svg   icona (e icon-192.png / icon-512.png per l'installazione come app del browser)
//   engine.js  (facoltativo) il motore locale: gira dentro HSPI Client, sul PC di chi usa l'app
//
// L'host serve:
//   /api/catalogo                        elenco delle app (pubblico: lo legge anche HSPI Client)
//   /scarica/app/<id>.zip                pacchetto dell'app per HSPI Client (scheda, icone, motore), con impronta SHA-256
//   /catalogo/<id>/icon.svg|icon-*.png   icone
//   /catalogo/<id>/manifest.webmanifest  per installare l'app nel browser come finestra a se' (senza setup)
// Per aggiungere un'app: una cartella nuova qui, la sua pagina in public/, le sue API in src/routes/. Vedi docs/APP.md.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const { writeZip } = require('./celle/zip');

const DIR = path.join(config.CODE_ROOT, 'app', 'catalogo');
const APP_ROOT = path.join(config.CODE_ROOT, 'app');
const ID = /^[a-z0-9][a-z0-9-]{1,40}$/;
const ICONS = ['icon.svg', 'icon-192.png', 'icon-512.png'];

// "0.10.2" >= "0.9" ?
function versionAtLeast(have, need) {
  const a = String(have || '0').split('.').map(Number);
  const b = String(need || '0').split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
}

function read(id) {
  if (!ID.test(id)) return null;
  try {
    const m = JSON.parse(fs.readFileSync(path.join(DIR, id, 'app.json'), 'utf8'));
    if (m.id !== id || !m.name || !m.version || !m.web) return null;
    return m;
  } catch { return null; }
}

function ids() {
  try { return fs.readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory() && read(e.name)).map((e) => e.name).sort(); } catch { return []; }
}

// File del pacchetto: scheda, icone e motore (i file del motore possono stare altrove nel codice: una sola copia)
function packageFiles(m) {
  const files = [{ name: 'app.json', data: fs.readFileSync(path.join(DIR, m.id, 'app.json')) }];
  for (const n of ICONS) {
    const p = path.join(DIR, m.id, n);
    if (fs.existsSync(p)) files.push({ name: n, data: fs.readFileSync(p) });
  }
  if (m.engine) {
    for (const [name, src] of Object.entries(m.engine.files || {})) {
      const full = path.resolve(APP_ROOT, src);
      if (!full.startsWith(APP_ROOT + path.sep) || !/^[\w.-]+$/.test(name)) throw new Error(`Pacchetto ${m.id}: file non valido ${name}`);
      files.push({ name, data: fs.readFileSync(full) });
    }
  }
  return files;
}

const cache = new Map(); // id -> { key, buf, sha256 }
function pack(id) {
  const m = read(id);
  if (!m) return null;
  const key = `${m.version}|${config.VERSION}`;
  const hit = cache.get(id);
  if (hit && hit.key === key) return hit;
  const buf = writeZip(packageFiles(m));
  const p = { key, buf, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
  cache.set(id, p);
  return p;
}

function info(id) {
  const m = read(id);
  if (!m) return null;
  const p = pack(id);
  return {
    id: m.id, name: m.name, version: m.version, released: m.released || null,
    summary: m.summary || '', description: m.description || '', web: m.web, color: m.color || null,
    icon: `/catalogo/${m.id}/icon.svg`,
    manifest: `/catalogo/${m.id}/manifest.webmanifest`,
    engine: m.engine ? { does: m.engine.does || '' } : null,
    minPortal: m.minPortal || null,
    compatible: versionAtLeast(config.VERSION, m.minPortal),
    novita: Array.isArray(m.novita) ? m.novita.slice(0, 10) : [],
    package: { url: `/scarica/app/${m.id}.zip`, sha256: p.sha256, size: p.buf.length },
  };
}

const list = () => ids().map(info).filter(Boolean);

// Manifest per installare l'app nel browser (Edge/Chrome: "Installa questa app"): si apre nella sua finestra.
function manifest(id) {
  const m = read(id);
  if (!m) return null;
  const has = (n) => fs.existsSync(path.join(DIR, id, n));
  const icons = [];
  if (has('icon-192.png')) icons.push({ src: `/catalogo/${id}/icon-192.png`, sizes: '192x192', type: 'image/png' });
  if (has('icon-512.png')) icons.push({ src: `/catalogo/${id}/icon-512.png`, sizes: '512x512', type: 'image/png' });
  icons.push({ src: `/catalogo/${id}/icon.svg`, sizes: 'any', type: 'image/svg+xml' });
  return {
    id: m.web, name: m.name, short_name: m.name, description: m.summary || '', lang: 'it',
    start_url: m.web, scope: m.web, display: 'standalone', background_color: '#1f1e1d', theme_color: '#1f1e1d', icons,
  };
}

// Icone: solo i nomi previsti, nessun altro file della cartella
function iconFile(id, name) {
  if (!read(id) || !ICONS.includes(name)) return null;
  const p = path.join(DIR, id, name);
  return fs.existsSync(p) ? p : null;
}

module.exports = { DIR, ids, read, info, list, pack, manifest, iconFile, versionAtLeast };
