'use strict';
// Motore locale di Verbale Studio: gira dentro HSPI Client, sul PC di chi usa l'app, non sull'host.
// Fa il lavoro pesante: l'AI locale con Ollama (installazione, modelli, compiti, addestramento, chat).
// Il portale prepara solo i testi (lavoro leggero) con /api/vs/ollama/prepare.
//
// Contratto dei motori delle app (vedi docs/APP.md):
//   module.exports = { routes: { 'METODO /percorso': async (ctx) => risposta } }
//   HSPI Client li espone su http://127.0.0.1:4320/app/<id>/<percorso>, solo alle pagine del portale.
//   ctx = { body: oggetto JSON ricevuto, res: risposta HTTP, cors: intestazioni da aggiungere, host: indirizzo del portale }
//   Se la funzione restituisce un valore, il client lo invia come JSON; se scrive da se' su ctx.res (streaming), restituisce undefined.
const ollama = require('./ollama');

const MODEL = /^[\w.:/-]{2,80}$/;
const fail = (status, message) => Object.assign(new Error(message), { status });

module.exports = {
  routes: {
    'GET /ollama/status': async () => ({ ...(await ollama.status()), recommended: ollama.RECOMMENDED, jobs: ollama.jobs, platform: process.platform, canManage: true, onClient: true }),
    'POST /ollama/install': async () => ollama.install(),
    'POST /ollama/start': async () => { ollama.startApp(); return { ok: true }; },
    'POST /ollama/pull': async ({ body }) => {
      if (!MODEL.test(body.model || '')) throw fail(400, 'Nome modello non valido');
      return ollama.pull(body.model);
    },
    'POST /ollama/delete': async ({ body }) => { await ollama.removeModel(body.model); return { ok: true }; },
    'POST /ollama/task': async ({ body }) => ({ text: await ollama.task(body) }),
    'POST /ollama/train': async ({ body }) => ollama.train(body),
    'POST /ollama/chat': async ({ body, res, cors }) => {
      const upstream = await ollama.chatStream(body);
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
      try { for await (const chunk of upstream.body) res.write(chunk); } catch { /* interrotto */ }
      res.end();
      return undefined;
    },
  },
};
