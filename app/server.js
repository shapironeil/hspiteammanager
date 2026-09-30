'use strict';
// Punto di ingresso del portale HSPI Team Manager.
// Avvio: doppio clic su avvia.bat (oppure: node server.js dalla cartella app).

try {
  require('node:sqlite');
} catch {
  console.error('\n  Serve Node.js 22.13 o successivo (versione attuale: ' + process.version + ').');
  console.error('  Scarica la versione LTS da https://nodejs.org e riprova.\n');
  process.exit(1);
}

const http = require('node:http');
const config = require('./src/config');
const db = require('./src/db');
const security = require('./src/security');
const { handle, setAppHandler } = require('./src/http');
setAppHandler(require('./src/apps'));

// Le rotte si registrano da sole al caricamento del file.
require('./src/routes/auth');
require('./src/routes/users');
require('./src/routes/programs');
require('./src/routes/files');
require('./src/routes/projects');
const { accessUrls } = require('./src/routes/admin');

const server = http.createServer(handle);
server.requestTimeout = 0; // consente il caricamento di file grandi

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  La porta ${config.PORT} e' gia' in uso: il portale e' forse gia' avviato in un'altra finestra.\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(err);
  try { db.issue('server', 'Errore non gestito: ' + err.message, err.stack, null); } catch { /* niente */ }
});
process.on('unhandledRejection', (err) => {
  console.error(err);
  try { db.issue('server', 'Promessa non gestita: ' + (err && err.message), err && err.stack, null); } catch { /* niente */ }
});

security.cleanupSessions();
setInterval(security.cleanupSessions, 3600000).unref();

server.listen(config.PORT, config.HOST, () => {
  console.log('\n  HSPI Team Manager v' + config.VERSION + ' - portale avviato\n');
  for (const u of accessUrls()) console.log('  ' + (u.label + ':').padEnd(28) + u.url);
  if (config.networkOpen) {
    console.log('\n  Modalita\' RETE: i colleghi entrano solo se il firewall di Windows');
    console.log('  consente le connessioni in ingresso (serve un amministratore).');
  } else {
    console.log('\n  Modalita\' SOLO QUESTO PC: nessuna richiesta del firewall.');
    console.log('  Per aprirlo alla rete locale usa avvia-rete.bat.');
  }
  console.log('\n  Dati salvati in: ' + config.DATA_DIR);
  console.log('  Per fermare il portale: CTRL+C oppure chiudi questa finestra.\n');
});
