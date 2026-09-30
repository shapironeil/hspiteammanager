'use strict';
// Configurazione centrale: percorsi, porta, ruoli. Nessun altro file calcola percorsi da solo.
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.HSPI_DATA_DIR || path.join(ROOT, 'data');

// Ruoli in ordine di potere crescente.
const ROLES = ['dipendente', 'manager', 'hacker'];
const ROLE_LABELS = { dipendente: 'Dipendente', manager: 'Manager', hacker: 'Hacker' };

// Qualifiche: non cambiano i permessi, servono a descrivere la persona e sbloccano gli avatar riservati.
const TITLES = { dirigente: 'Dirigente', manager: 'Manager', 'project-manager': 'Project Manager', sviluppatore: 'Sviluppatore' };

module.exports = {
  TITLES,
  VERSION: '0.4.0',
  ROOT,
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, 'portale.db'),
  STORAGE_DIR: path.join(DATA_DIR, 'storage'),
  PUBLIC_DIR: path.join(ROOT, 'app', 'public'),
  PORT: Number(process.env.PORT) || 8080,
  // 127.0.0.1 = raggiungibile solo da questo PC (nessuna richiesta del firewall).
  // 0.0.0.0   = aperto alla rete locale (avvia-rete.bat; serve il permesso del firewall).
  HOST: process.env.HOST || '127.0.0.1',
  get networkOpen() { return !['127.0.0.1', 'localhost', '::1'].includes(this.HOST); },
  ROLES,
  ROLE_LABELS,
  roleRank: (role) => ROLES.indexOf(role),
  SESSION_DAYS: 7,
  COOKIE: 'hspi_sid',
  // Valori iniziali delle impostazioni modificabili dal pannello Sistema.
  DEFAULT_SETTINGS: {
    portalName: 'HSPI Team Manager',
    quotaGb: '100',
    maxFileMb: '2048',
  },
};
