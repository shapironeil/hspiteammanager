'use strict';
// Configurazione centrale: percorsi, porta, ruoli. Nessun altro file calcola percorsi da solo.
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = process.env.HSPI_DATA_DIR || path.join(ROOT, 'data');

// Ruoli in ordine di potere crescente.
const ROLES = ['dipendente', 'manager', 'hacker'];
const ROLE_LABELS = { dipendente: 'Dipendente', manager: 'Manager', hacker: 'Hacker' };

module.exports = {
  VERSION: '0.1.1',
  ROOT,
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, 'portale.db'),
  STORAGE_DIR: path.join(DATA_DIR, 'storage'),
  PUBLIC_DIR: path.join(ROOT, 'app', 'public'),
  BRANDING_DIR: path.join(ROOT, 'branding'),
  PORT: Number(process.env.PORT) || 8080,
  HOST: process.env.HOST || '0.0.0.0',
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
