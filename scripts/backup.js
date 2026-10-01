'use strict';
// Backup manuale da riga di comando (lo lancia backup.bat). Funziona con il portale acceso o spento.
// Con il portale acceso il database si copia comunque in modo coerente; per il backup "da manuale" dei dati
// in uso e' comunque meglio il pulsante Sistema → Backup → Esegui adesso.
const fs = require('node:fs');
const config = require('../app/src/config');
const backup = require('../app/src/backup');

const getSetting = (key) => {
  try {
    if (!fs.existsSync(config.DB_FILE)) return null;
    const { DatabaseSync } = require('node:sqlite');
    const c = new DatabaseSync(config.DB_FILE, { readOnly: true });
    const r = c.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    c.close();
    return r ? r.value : null;
  } catch { return null; }
};

console.log('\n  HSPI Team Manager - backup\n');
backup.run({ reason: process.argv[2] || 'manuale', getSetting })
  .then((r) => {
    console.log(`  Backup pronto: ${r.path}`);
    console.log(`  ${r.files} file: ${r.copied} copiati, ${r.linked} uguali al backup precedente (non occupano spazio in piu').`);
    if (r.errors.length) console.log(`  Attenzione: ${r.errors.length} file non copiati (vedi backup.json).`);
    if (r.extra) console.log(`  Copia aggiuntiva: ${r.extra.error ? 'NON riuscita: ' + r.extra.error : r.extra.dir}`);
    process.exit(0);
  })
  .catch((err) => { console.error('  ERRORE: ' + err.message); process.exit(1); });
