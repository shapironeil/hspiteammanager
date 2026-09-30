'use strict';
// Risorse grafiche personalizzabili: logo, sfondi dinamici, sfondi statici del portale, avatar.
// Le cartelle vengono riconosciute dal NOME, senza badare a maiuscole, spazi o trattini,
// sia dentro la cartella del progetto sia dentro "images". Esempi validi:
//   logo, Logo, images/logo            -> logo
//   background, images/background      -> sfondi dinamici
//   background portal, BackgroundPortal -> sfondi statici (uno chiaro e uno scuro)
//   avatar, images/avatar              -> avatar
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const EXT = ['.svg', '.png', '.jpg', '.jpeg', '.jfif', '.webp', '.gif', '.ico', '.avif', '.bmp'];
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const MATCH = {
  logo: (n) => n === 'logo' || n === 'loghi' || n === 'logos',
  background: (n) => ['background', 'backgrounds', 'sfondi', 'sfondo', 'sfondidinamici', 'backgrounddinamico'].includes(n),
  portal: (n) => n.includes('portal') && (n.includes('background') || n.includes('sfond')),
  avatar: (n) => n === 'avatar' || n === 'avatars',
};

function subdirs(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name)); } catch { return []; }
}

// Cartelle di un tipo, in ordine di priorita'.
function dirsOf(kind) {
  if (!MATCH[kind]) return [];
  const images = path.join(config.ROOT, 'images');
  const found = [...subdirs(images), ...subdirs(config.ROOT)].filter((d) => MATCH[kind](norm(path.basename(d))));
  // Vecchie posizioni del logo: immagini sciolte in "images" e "branding".
  if (kind === 'logo') found.push(images, path.join(config.ROOT, 'branding'));
  return found;
}

function imagesIn(dir, deep) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.isFile() && EXT.includes(path.extname(e.name).toLowerCase())) out.push(path.join(dir, e.name));
    else if (deep && e.isDirectory()) out.push(...imagesIn(path.join(dir, e.name), false));
  }
  return out;
}

// Elenco dei file immagine di un tipo: [{ name, url, file }], senza doppioni di nome.
function list(kind) {
  const seen = new Set();
  const out = [];
  for (const dir of dirsOf(kind)) {
    const legacy = kind === 'logo' && ['images', 'branding'].includes(path.basename(dir));
    for (const file of imagesIn(dir, !legacy)) {
      const name = path.basename(file);
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push({ name, url: `/media/${kind}/${encodeURIComponent(name)}`, file });
    }
  }
  return out;
}

// Percorso su disco di un file, oppure null. Si cerca solo tra i file elencati: niente percorsi liberi.
function resolve(kind, name) {
  if (!name || name !== path.basename(name)) return null;
  const hit = list(kind).find((f) => f.name === name);
  return hit ? hit.file : null;
}

const base = (f) => norm(path.basename(f.name, path.extname(f.name)));
const pub = (f) => (f ? f.url : null);

// Logo e icona della scheda. Il logo e': il file "logo", oppure uno con "logo" nel nome,
// oppure la prima immagine trovata (esclusi favicon e sfondi rimasti nelle vecchie cartelle).
function branding() {
  const files = list('logo');
  const favicon = files.find((f) => base(f).includes('favicon'));
  const usable = files.filter((f) => !base(f).includes('favicon') && !base(f).includes('sfondo') && !base(f).includes('background'));
  const logo = usable.find((f) => base(f) === 'logo') || usable.find((f) => base(f).includes('logo')) || usable[0];
  // Se ci sono due versioni del logo (chiara e scura) si usa quella giusta per il tema.
  const tone = (words) => usable.find((f) => words.some((w) => base(f).includes(w)));
  return {
    logo: pub(logo),
    logoLight: pub(tone(['white', 'bianc', 'light', 'chiar'])),
    logoDark: pub(tone(['black', 'nero', 'nera', 'dark', 'scur'])),
    favicon: pub(favicon),
  };
}

// Sfondi statici del portale: uno per il tema chiaro e uno per il tema scuro.
// Si riconoscono dal nome (white/bianco/light/chiaro e black/nero/dark/scuro);
// se i nomi non aiutano, decide il browser misurando quale immagine e' piu' luminosa.
function portalBackgrounds() {
  const files = list('portal');
  const has = (f, words) => words.some((w) => base(f).includes(w));
  const light = files.find((f) => has(f, ['white', 'bianc', 'light', 'chiar']));
  const dark = files.find((f) => has(f, ['black', 'nero', 'nera', 'dark', 'scur']));
  return { light: pub(light), dark: pub(dark), all: files.map(pub) };
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

// Riepilogo per la schermata Sistema: cosa e' stato trovato e dove.
function summary() {
  const rel = (p) => path.relative(config.ROOT, p) || '.';
  const row = (kind, label) => {
    const files = list(kind);
    return { label, folders: [...new Set(files.map((f) => rel(path.dirname(f.file))))], count: files.length };
  };
  return [row('logo', 'Logo'), row('background', 'Sfondi dinamici'), row('portal', 'Sfondi statici del portale'), row('avatar', 'Avatar')];
}

module.exports = { list, resolve, branding, portalBackgrounds, avatarUrl, avatarRequires, avatarAllowed, summary };
