// Percorso: i gradi come leghe, con emblemi. Vista riservata all'Hacker.
import { get, api } from './api.js';
import { h, toast, toastError, pageHead, avatarEl } from './ui.js';

// Leghe in ordine crescente; oltre la quinta si riparte dal massimo.
const TIERS = [
  { name: 'Bronzo', a: '#e0a77a', b: '#8a5233' },
  { name: 'Argento', a: '#e9eef3', b: '#8a96a3' },
  { name: 'Oro', a: '#ffe08a', b: '#c98b17' },
  { name: 'Platino', a: '#c9f3f0', b: '#3d9c9a' },
  { name: 'Diamante', a: '#d9d0ff', b: '#6c4fd6' },
  { name: 'Leggenda', a: '#ffd1e0', b: '#c2386a' },
];

function emblem(tier, level) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 64 72');
  svg.setAttribute('class', 'emblem');
  const id = `g${Math.random().toString(36).slice(2)}`;
  svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tier.a}"/><stop offset="1" stop-color="${tier.b}"/></linearGradient></defs>
    <path d="M32 3 58 13v22c0 17-11 28-26 34C17 63 6 52 6 35V13z" fill="url(#${id})" stroke="rgba(0,0,0,.35)" stroke-width="2"/>
    <path d="M32 11 50 18v16c0 12-7 20-18 25-11-5-18-13-18-25V18z" fill="rgba(255,255,255,.18)"/>
    ${Array.from({ length: Math.min(level, 5) }, (_, i) => `<path d="M${32 + (i - (Math.min(level, 5) - 1) / 2) * 9} 26l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff8e1" stroke="rgba(0,0,0,.25)"/>`).join('')}`;
  return svg;
}

export async function viewPercorso(el) {
  const d = await get('/api/percorso');
  const notes = d.notes || {};
  const save = async () => { try { await api('PUT', '/api/percorso', { notes }); toast('Percorso salvato.'); } catch (err) { toastError(err); } };
  const steps = d.grades.map((g, i) => {
    const tier = TIERS[Math.min(i, TIERS.length - 1)];
    const n = notes[g.id] || (notes[g.id] = { league: `Lega ${tier.name}`, time: '' });
    const input = (key, placeholder) => h('input', { type: 'text', value: n[key], placeholder, class: 'league-input', onchange: (e) => { n[key] = e.target.value; save(); } });
    return h('div', { class: 'league' },
      emblem(tier, i + 1),
      input('league', 'Nome della lega'),
      h('div', { class: 'league-grade', style: `color:${g.color}` }, g.name),
      input('time', 'Tempo tipico (es. 12-18 mesi)'),
      h('div', { class: 'faces', style: 'justify-content:center;margin-top:8px' }, g.people.slice(0, 8).map((u) => avatarEl(u, 'sm'))),
      h('div', { class: 'small muted' }, g.people.length === 1 ? '1 persona' : `${g.people.length} persone`));
  });
  el.replaceChildren(
    pageHead('Percorso', 'I gradi come leghe, dal primo all\'ultimo. Nomi e tempi si scrivono direttamente qui. Vista riservata.'),
    h('section', { class: 'card glass league-path' }, steps.flatMap((s, i) => (i ? [h('div', { class: 'league-arrow', 'aria-hidden': 'true' }, '›'), s] : [s]))));
}
