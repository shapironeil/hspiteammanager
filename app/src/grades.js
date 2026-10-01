'use strict';
// Gradi (la gerarchia del team: Stage, Dipendente, PM manager, Manager, Senior manager, ...).
//
// Il GRADO e' cio' che si vede (nome e colore) e decide chi sta sopra a chi (statistiche del team).
// Il LIVELLO del grado ("dipendente" o "manager") decide i permessi nel portale.
// L'HACKER non e' un grado: e' una qualita' nascosta che si somma al grado (users.role = 'hacker').
// Chi non e' Hacker non vede mai chi lo e': vede solo il suo grado.
const db = require('./db');

const LEVELS = { dipendente: 'Base', manager: 'Manager' };

const all = () => db.all('SELECT id, name, color, level, position FROM grades ORDER BY position');
const byId = (id) => db.get('SELECT id, name, color, level, position FROM grades WHERE id = ?', Number(id));
const defaultGrade = () => db.get("SELECT id, name, color, level, position FROM grades WHERE level = 'dipendente' ORDER BY position DESC LIMIT 1") || all()[0];

// Grado di una persona (riga di users con grade_id).
const of = (u) => (u && u.grade_id ? byId(u.grade_id) : null) || defaultGrade();

// Posizione nella gerarchia: l'Hacker sta sopra a tutti.
const rankOf = (u) => (u.role === 'hacker' ? Infinity : (of(u) || { position: 0 }).position);

// Ruolo "visibile" di una persona agli occhi di chi guarda: l'Hacker appare con il livello del suo grado.
function visibleRole(u, viewer) {
  if (u.role !== 'hacker' || (viewer && viewer.role === 'hacker')) return u.role;
  return (of(u) || { level: 'dipendente' }).level;
}

// Dati da mostrare per una persona (grado, colore, badge); isHacker solo se chi guarda e' Hacker.
function card(u, viewer) {
  const g = of(u);
  const out = { grade: g ? { id: g.id, name: g.name, color: g.color, position: g.position } : null, badge: u.badge || null };
  if (viewer && viewer.role === 'hacker') out.isHacker = u.role === 'hacker';
  return out;
}

// Quante persone stanno sotto a chi guarda (serve a mostrare la voce "Il mio team").
function belowCount(viewer) {
  if (viewer.role === 'hacker') return db.get('SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL AND id != ?', viewer.id).n;
  const me = of(viewer);
  if (!me) return 0;
  return db.get(`SELECT COUNT(*) AS n FROM users u JOIN grades g ON g.id = u.grade_id
    WHERE u.deleted_at IS NULL AND u.role != 'hacker' AND g.position < ?`, me.position).n;
}

module.exports = { LEVELS, all, byId, of, defaultGrade, rankOf, visibleRole, card, belowCount };
