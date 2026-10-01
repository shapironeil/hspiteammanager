'use strict';
// SAL (stato avanzamento lavori): i dati comuni al verbale Word (motore Word) e alla presentazione PowerPoint (Cippi).
//   GET  /api/sal/esempio                      dati d'esempio, gia' calcolati: la traccia da compilare
//   POST /api/sal/calcola { dati }             dati completati con i calcoli + controlli di coerenza
//   POST /api/sal/da-checkpoint { projectId, checkpointId, template } dati dal checkpoint di Verbale Studio
const db = require('../db');
const A = require('../verbali/archivio');
const SAL = require('../sal');
const { route, HttpError } = require('../http');

route('GET', '/api/sal/esempio', {}, (ctx) => ctx.json(200, { dati: SAL.esempio() }));

route('POST', '/api/sal/calcola', {}, async (ctx) => {
  const b = await ctx.body();
  const dati = SAL.calcola(b.dati || b);
  ctx.json(200, { dati, controlli: SAL.controlla(dati) });
});

// Le sezioni del riepilogo le conosce l'interfaccia di Verbale Studio (templates.js): se la richiesta non le manda,
// i ruoli si ricavano dai nomi delle chiavi del riepilogo.
const ROLE_BY_KEY = [
  [/completed|done|milestone|fixed|raggiunt/i, 'done'], [/progress|doing|plan|inProgress|corso/i, 'doing'], [/next|action|request|prossim/i, 'next'],
  [/attention|risk|issue|open|prerequis|attenzion|rischi/i, 'risk'], [/decision|solution|decis/i, 'decision'], [/.*/, 'info'],
];
route('POST', '/api/sal/da-checkpoint', {}, async (ctx) => {
  const b = await ctx.body();
  const P = A.openProject(ctx.user, b.projectId);
  const cp = A.load(P, String(b.checkpointId || ''));
  let template = b.template && Array.isArray(b.template.sections) ? b.template : null;
  if (!template) {
    template = { sections: Object.keys(cp.summary || {}).map((key) => ({ key, title: key, role: (ROLE_BY_KEY.find(([re]) => re.test(key)) || [0, 'info'])[1] })) };
  }
  const dati = SAL.daCheckpoint(cp, template, P.p);
  const users = db.get('SELECT name FROM users WHERE id = ?', ctx.user.id);
  if (users && !dati.scrivente) dati.scrivente = users.name;
  ctx.json(200, { dati, checkpoint: { id: cp.id, date: cp.date, title: cp.title } });
});

module.exports = {};
