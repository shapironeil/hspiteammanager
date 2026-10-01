'use strict';
// Pacchetto del programma client (installer per i PC del team), servito dall'host.
// Lo prepara scripts/prepara-client.js in data/client/; qui si legge solo il suo manifesto.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const DIR = path.join(config.DATA_DIR, 'client');

function info() {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
    return { version: m.version, file: m.file, size: m.size, sha256: m.sha256, url: `/scarica/${encodeURIComponent(m.file)}`, builtAt: m.builtAt };
  } catch { return null; }
}

module.exports = { DIR, info };
