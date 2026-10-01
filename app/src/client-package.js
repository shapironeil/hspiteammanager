'use strict';
// Pacchetti del programma client (HSPI Client), preparati e serviti dall'host. Niente si scarica da internet.
//
//   /scarica/HSPI-Client.zip   installazione: installa.bat, HSPI.bat, programma e host.txt con l'indirizzo
//                              da cui e' stato scaricato (cosi' il client sa gia' dove collegarsi)
//   /scarica/client-app.zip    solo il programma: lo usa il client per aggiornarsi (impronta SHA-256 in /api/version)
//   /scarica/node.exe          il Node.js dell'host (Windows), per i PC che non ce l'hanno
//
// La versione del client e' sempre quella dell'host (version.json): un'unica fonte.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const { writeZip } = require('./trama/zip');

const CLIENT_DIR = path.join(config.CODE_ROOT, 'client');

// Il programma del client: hspi-client.js + i moduli condivisi con il portale (una sola copia nel repository).
function appFiles() {
  return [
    { name: 'app/hspi-client.js', data: fs.readFileSync(path.join(CLIENT_DIR, 'app', 'hspi-client.js')) },
    { name: 'app/ollama.js', data: fs.readFileSync(path.join(__dirname, 'verbali', 'ollama.js')) },
    { name: 'app/zip.js', data: fs.readFileSync(path.join(__dirname, 'trama', 'zip.js')) },
    { name: 'app/version.json', data: fs.readFileSync(path.join(config.CODE_ROOT, 'version.json')) },
  ];
}

let cache = null; // { version, buf, sha256 }
function payload() {
  if (cache && cache.version === config.VERSION) return cache;
  const buf = writeZip(appFiles());
  cache = { version: config.VERSION, buf, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
  return cache;
}

function installer(origin) {
  const extra = ['installa.bat', 'HSPI.bat', 'LEGGIMI.txt'].map((n) => ({ name: n, data: fs.readFileSync(path.join(CLIENT_DIR, n)) }));
  return writeZip([...extra, { name: 'host.txt', data: `${origin}\r\n` }, ...appFiles()]);
}

function info() {
  try {
    const p = payload();
    return { version: p.version, updateUrl: '/scarica/client-app.zip', sha256: p.sha256, size: p.buf.length, installer: '/scarica/HSPI-Client.zip' };
  } catch { return null; } // cartella client mancante
}

// Node.js dell'host, solo se e' un node.exe per Windows (il PC del portale)
function nodeExe() {
  const exe = process.execPath;
  return /node\.exe$/i.test(exe) && fs.existsSync(exe) ? exe : null;
}

module.exports = { CLIENT_DIR, info, payload, installer, nodeExe };
