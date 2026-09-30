'use strict';
// Risorse grafiche personalizzabili: logo, sfondi, avatar.
// Ogni tipo viene cercato in piu' cartelle, in ordine; vale la prima che contiene il file.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const EXT = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.avif'];

// Percorsi relativi alla cartella del progetto.
const DIRS = {
  logo: ['images/logo', 'logo', 'images', 'branding'],
  background: ['images/background', 'background'],
  avatar: ['images/avatar', 'avatar'],
};

const dirsOf = (kind) => (DIRS[kind] || []).map((d) => path.join(config.ROOT, d));

// Elenco dei file immagine di un tipo: [{ name, url }], senza doppioni.
function list(kind) {
  const seen = new Set();
  const out = [];
  for (const dir of dirsOf(kind)) {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort(); } catch { continue; }
    for (const name of names) {
      if (!EXT.includes(path.extname(name).toLowerCase()) || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push({ name, url: `/media/${kind}/${encodeURIComponent(name)}` });
    }
  }
  return out;
}

// Percorso su disco di un file, oppure null. Il nome non puo' contenere cartelle.
function resolve(kind, name) {
  if (!DIRS[kind] || !name || name !== path.basename(name) || /[\\/\0]/.test(name)) return null;
  if (!EXT.includes(path.extname(name).toLowerCase())) return null;
  for (const dir of dirsOf(kind)) {
    const file = path.join(dir, name);
    try { if (fs.statSync(file).isFile()) return file; } catch { /* prossima cartella */ }
  }
  return null;
}

const base = (f) => path.basename(f.name, path.extname(f.name)).toLowerCase();

// Logo e icona della scheda. Il logo e': il file "logo", oppure uno con "logo" nel nome,
// oppure la prima immagine trovata (esclusi favicon e sfondi rimasti nelle vecchie cartelle).
function branding() {
  const files = list('logo');
  const favicon = files.find((f) => base(f).includes('favicon')) || null;
  const usable = files.filter((f) => !base(f).includes('favicon') && !base(f).includes('sfondo'));
  const logo = usable.find((f) => base(f) === 'logo') || usable.find((f) => base(f).includes('logo')) || usable[0] || null;
  return { logo: logo ? logo.url : null, favicon: favicon ? favicon.url : null };
}

// Un avatar riservato ha il nome che inizia con la qualifica: "dirigente-1.svg" richiede "dirigente".
function avatarRequires(name) {
  const lower = String(name).toLowerCase();
  return Object.keys(config.TITLES).find((t) => lower.startsWith(t + '-')) || null;
}
// L'Hacker sblocca tutto; il ruolo Manager sblocca anche gli avatar della qualifica Manager.
function avatarAllowed(user, name) {
  const need = avatarRequires(name);
  return !need || user.role === 'hacker' || user.title === need || (need === 'manager' && user.role === 'manager');
}

const avatarUrl = (name) => (name && resolve('avatar', name) ? `/media/avatar/${encodeURIComponent(name)}` : null);

module.exports = { list, resolve, branding, avatarUrl, avatarRequires, avatarAllowed };
