'use strict';
// Genera gli avatar del portale (SVG) in images/avatar.
// - 24 avatar base: persone in giacca e cravatta, uomini e donne.
// - 12 avatar riservati: si sbloccano con una qualifica. Il nome del file inizia con la
//   qualifica (dirigente-, manager-, project-manager-, sviluppatore-) ed e' quello che
//   il portale usa per decidere chi puo' sceglierli.
// Uso:  node scripts/genera-avatar.js
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'images', 'avatar');

const SKIN = { a: '#f6d3b8', b: '#eebf98', c: '#d9a278', d: '#b9794f', e: '#8c5a3c', f: '#6b4330' };
const HAIR = { nero: '#2b2220', castano: '#5a3a26', scuro: '#3d2a1f', biondo: '#d8a94e', rosso: '#b5522b', grigio: '#a9a6a1', bianco: '#eeeae4' };

// ---- Pettinature: "back" sta dietro la testa, "front" sopra la fronte ---------
const top = (c) => `<path d="M35.5 50 C34 27 86 27 84.5 50 C79 40 71 37 60 37 C49 37 41 40 35.5 50Z" fill="${c}"/>`;
const riga = (c) => `<path d="M35.5 52 C33 26 87 24 84.5 52 C82 42 74 36 52 40 C44 42 38 46 35.5 52Z" fill="${c}"/>`;
const ciuffo = (c) => `<path d="M35.5 50 C34 28 60 22 70 30 C80 24 88 38 84.5 50 C80 42 72 38 60 38 C49 38 41 41 35.5 50Z" fill="${c}"/>`;
const frangia = (c) => `<path d="M35.5 54 C33 26 87 26 84.5 54 C83 46 80 42 76 41 Q60 47 44 41 C40 42 37 46 35.5 54Z" fill="${c}"/>`;
const HAIRS = {
  corto: (c) => ({ front: top(c) }),
  riga: (c) => ({ front: riga(c) }),
  ciuffo: (c) => ({ front: ciuffo(c) }),
  rasato: (c) => ({ front: `<path d="M36.5 46 C38 28 82 28 83.5 46 C76 38 68 36 60 36 C52 36 44 38 36.5 46Z" fill="${c}" opacity=".75"/>` }),
  stempiato: (c) => ({ front: `<path d="M35 56 C33 46 36 38 42 36 C40 42 39 48 39 56Z" fill="${c}"/><path d="M85 56 C87 46 84 38 78 36 C80 42 81 48 81 56Z" fill="${c}"/>` }),
  afroCorto: (c) => ({ back: `<circle cx="60" cy="46" r="28" fill="${c}"/>`, front: top(c) }),
  lungo: (c) => ({ back: `<path d="M33 52 C30 22 90 22 87 52 L91 94 Q77 98 73 84 L47 84 Q43 98 29 94Z" fill="${c}"/>`, front: riga(c) }),
  lungoFrangia: (c) => ({ back: `<path d="M33 52 C30 22 90 22 87 52 L91 94 Q77 98 73 84 L47 84 Q43 98 29 94Z" fill="${c}"/>`, front: frangia(c) }),
  caschetto: (c) => ({ back: `<path d="M32 50 C30 22 90 22 88 50 L89 72 Q81 80 74 72 L46 72 Q39 80 31 72Z" fill="${c}"/>`, front: frangia(c) }),
  caschettoRiga: (c) => ({ back: `<path d="M32 50 C30 22 90 22 88 50 L89 72 Q81 80 74 72 L46 72 Q39 80 31 72Z" fill="${c}"/>`, front: riga(c) }),
  chignon: (c) => ({ back: `<circle cx="60" cy="22" r="11" fill="${c}"/>`, front: top(c) }),
  coda: (c) => ({ back: `<path d="M78 34 Q102 40 97 82 Q88 74 84 54Z" fill="${c}"/>`, front: ciuffo(c) }),
  ricci: (c) => ({ back: `<g fill="${c}"><circle cx="38" cy="40" r="11"/><circle cx="50" cy="29" r="12"/><circle cx="66" cy="27" r="12"/><circle cx="80" cy="37" r="11"/><circle cx="33" cy="55" r="9"/><circle cx="87" cy="53" r="9"/><circle cx="34" cy="69" r="8"/><circle cx="86" cy="68" r="8"/></g>`, front: top(c) }),
  afro: (c) => ({ back: `<circle cx="60" cy="44" r="33" fill="${c}"/>`, front: top(c) }),
};

// ---- Accessori ------------------------------------------------------------------
const ACC = {
  occhiali: `<g fill="none" stroke="#2b2220" stroke-width="2.2"><circle cx="50" cy="53" r="7"/><circle cx="70" cy="53" r="7"/><path d="M57 53h6"/></g>`,
  occhialiOro: `<g fill="none" stroke="#c9a23a" stroke-width="2"><circle cx="50" cy="53" r="7"/><circle cx="70" cy="53" r="7"/><path d="M57 53h6"/></g>`,
  occhialiQuadri: `<g fill="rgba(255,255,255,.12)" stroke="#2b2220" stroke-width="2.2"><rect x="42" y="47" width="15" height="11" rx="3"/><rect x="63" y="47" width="15" height="11" rx="3"/><path d="M57 52h6" fill="none"/></g>`,
  baffi: (c) => `<path d="M60 62 Q53 58 46 63 Q52 69 60 64 Q68 69 74 63 Q67 58 60 62Z" fill="${c}"/>`,
  barba: (c) => `<path d="M37 56 Q38 82 60 84 Q82 82 83 56 Q76 66 60 66 Q44 66 37 56Z" fill="${c}"/><path d="M53 69 Q60 73 67 69" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.8" stroke-linecap="round"/>`,
  pizzetto: (c) => `<path d="M52 66 Q60 62 68 66 Q67 78 60 80 Q53 78 52 66Z" fill="${c}"/>`,
  orecchini: `<circle cx="36" cy="62" r="2.4" fill="#e2b341"/><circle cx="84" cy="62" r="2.4" fill="#e2b341"/>`,
  perle: `<circle cx="36" cy="62" r="2.4" fill="#f4f1ec"/><circle cx="84" cy="62" r="2.4" fill="#f4f1ec"/>`,
  cuffie: (c = '#d97757') => `<path d="M34 52 A26 26 0 0 1 86 52" fill="none" stroke="#2b2220" stroke-width="5"/><rect x="28" y="46" width="10" height="18" rx="5" fill="${c}"/><rect x="82" y="46" width="10" height="18" rx="5" fill="${c}"/>`,
  microfono: `<path d="M33 62 Q33 76 48 74" fill="none" stroke="#2b2220" stroke-width="2.4" stroke-linecap="round"/><rect x="46" y="71" width="8" height="6" rx="3" fill="#2b2220"/>`,
  fazzoletto: (c = '#f4eee5') => `<path d="M30 102 l9 -4 l5 7 l-12 3Z" fill="${c}"/>`,
  spilla: (c = '#e2b341') => `<path d="M82 98 l1.8 4.2 4.6 .4 -3.5 3 1.1 4.5 -4 -2.4 -4 2.4 1.1 -4.5 -3.5 -3 4.6 -.4Z" fill="${c}"/>`,
  badge: (c = '#4fd1c5') => `<path d="M48 86 L72 86" stroke="${c}" stroke-width="0"/><path d="M47 86 Q44 100 80 104" fill="none" stroke="${c}" stroke-width="2"/><rect x="74" y="100" width="14" height="16" rx="2" fill="#f4eee5"/><rect x="77" y="103" width="8" height="5" rx="1" fill="${c}"/><rect x="77" y="110" width="8" height="1.6" fill="#9aa3ab"/>`,
  codice: (c = '#7bd88f') => `<g fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 100 l-6 6 6 6"/><path d="M41 98 l-4 16"/><path d="M46 100 l6 6 -6 6" transform="translate(0 0)"/></g>`,
  cappuccio: (c) => `<path d="M28 96 Q24 58 60 56 Q96 58 92 96 Q76 84 60 84 Q44 84 28 96Z" fill="${c}"/>`,
};

function busto(p) {
  const suit = p.giacca || '#2f3b52';
  const shirt = p.camicia || '#ffffff';
  const tie = p.cravatta || '#d97757';
  return `
    ${p.dietroBusto || ''}
    <path d="M14 122 C14 96 36 84 60 84 C84 84 106 96 106 122Z" fill="${suit}"/>
    <path d="M47 85 L60 108 L73 85 Q60 80 47 85Z" fill="${shirt}"/>
    <path d="M47 85 L60 108 L50 110 L40 90Z" fill="rgba(255,255,255,.1)"/><path d="M73 85 L60 108 L70 110 L80 90Z" fill="rgba(0,0,0,.14)"/>
    <path d="M56 88 h8 l3 8 l-7 22 l-7 -22Z" fill="${tie}"/><path d="M56 88 h8 l-1.5 6 h-5Z" fill="rgba(0,0,0,.18)"/>
    ${(p.busto || []).join('')}`;
}

function testa(p) {
  const skin = SKIN[p.pelle];
  const hair = HAIR[p.capelli];
  const hs = HAIRS[p.taglio || 'corto'](hair);
  const ciglia = p.donna ? `<path d="M46.5 50 l-2.4 -2 M73.5 50 l2.4 -2" stroke="#2b2220" stroke-width="1.6" stroke-linecap="round"/>` : '';
  const bocca = p.donna
    ? `<path d="M53 63 Q60 69 67 63" fill="none" stroke="#c0566a" stroke-width="2.6" stroke-linecap="round"/>`
    : `<path d="M52 63 Q60 69.5 68 63" fill="none" stroke="rgba(60,30,20,.7)" stroke-width="2.2" stroke-linecap="round"/>`;
  return `
    ${hs.back || ''}
    <rect x="53" y="70" width="14" height="17" rx="5" fill="${skin}"/><rect x="53" y="76" width="14" height="6" fill="rgba(0,0,0,.12)"/>
    <circle cx="36.5" cy="55" r="4.5" fill="${skin}"/><circle cx="83.5" cy="55" r="4.5" fill="${skin}"/><circle cx="60" cy="52" r="24" fill="${skin}"/>
    ${hs.front || ''}
    <circle cx="50.5" cy="53" r="2.6" fill="#2b2220"/><circle cx="69.5" cy="53" r="2.6" fill="#2b2220"/>${ciglia}${bocca}
    ${(p.viso || []).join('')}`;
}

function avatar(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${p.nome}">
  <defs><clipPath id="c"><circle cx="60" cy="60" r="60"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="120" height="120" fill="${p.sfondo}"/>
    <circle cx="60" cy="130" r="70" fill="rgba(255,255,255,.12)"/>
    ${busto(p)}
    ${testa(p)}
    ${p.anello ? `<circle cx="60" cy="60" r="57" fill="none" stroke="${p.anello}" stroke-width="6"/>` : ''}
  </g>
</svg>
`.replace(/\n\s*\n/g, '\n');
}

const A = ACC;
const h = (k) => HAIR[k];

// ---- Avatar base: liberi per tutti ------------------------------------------------
const BASE = [
  { sfondo: '#c9d6e8', pelle: 'b', capelli: 'castano', taglio: 'riga' },
  { donna: true, sfondo: '#f3c9b6', pelle: 'a', capelli: 'castano', taglio: 'lungo', giacca: '#3d3550', cravatta: '#d97757', viso: [A.orecchini] },
  { sfondo: '#d8cbb0', pelle: 'd', capelli: 'nero', taglio: 'corto', giacca: '#26211e', cravatta: '#2e6f57' },
  { donna: true, sfondo: '#c4e6df', pelle: 'e', capelli: 'nero', taglio: 'afro', giacca: '#1f2c4d', cravatta: '#e2b341', viso: [A.orecchini] },
  { sfondo: '#e8d9c4', pelle: 'a', capelli: 'biondo', taglio: 'ciuffo', giacca: '#54583f', cravatta: '#b5522b', viso: [A.occhiali] },
  { donna: true, sfondo: '#d9c4ee', pelle: 'b', capelli: 'biondo', taglio: 'caschetto', giacca: '#2f3b52', cravatta: '#8e44ad' },
  { sfondo: '#bcd9c2', pelle: 'c', capelli: 'nero', taglio: 'riga', giacca: '#3a3f4a', cravatta: '#c0392b', viso: [A.barba(h('nero'))] },
  { donna: true, sfondo: '#f4e3c8', pelle: 'c', capelli: 'scuro', taglio: 'chignon', giacca: '#7b2d3a', cravatta: '#f4eee5', viso: [A.occhiali, A.perle] },
  { sfondo: '#bfe0f5', pelle: 'f', capelli: 'nero', taglio: 'rasato', giacca: '#2f3b52', cravatta: '#5b8def' },
  { donna: true, sfondo: '#ffd9a0', pelle: 'd', capelli: 'nero', taglio: 'ricci', giacca: '#2e6f57', cravatta: '#f2c230' },
  { sfondo: '#d6d0c6', pelle: 'a', capelli: 'grigio', taglio: 'stempiato', giacca: '#5b4636', cravatta: '#1f2c4d', viso: [A.occhiali, A.baffi(h('grigio'))] },
  { donna: true, sfondo: '#c7b8f0', pelle: 'a', capelli: 'rosso', taglio: 'lungoFrangia', giacca: '#26211e', cravatta: '#2e86c1' },
  { sfondo: '#f0d9a8', pelle: 'b', capelli: 'rosso', taglio: 'ciuffo', giacca: '#3d5a80', cravatta: '#e7b93c', viso: [A.barba(h('rosso'))] },
  { donna: true, sfondo: '#c9dbe6', pelle: 'f', capelli: 'nero', taglio: 'caschettoRiga', giacca: '#c0392b', cravatta: '#26211e', viso: [A.orecchini] },
  { sfondo: '#d2ecc4', pelle: 'e', capelli: 'nero', taglio: 'afroCorto', giacca: '#54583f', cravatta: '#d97757', viso: [A.occhialiQuadri] },
  { donna: true, sfondo: '#f2c1b8', pelle: 'b', capelli: 'castano', taglio: 'coda', giacca: '#3a3f4a', cravatta: '#d97757' },
  { sfondo: '#d0d4dc', pelle: 'c', capelli: 'scuro', taglio: 'corto', giacca: '#1f2c4d', cravatta: '#c0392b', viso: [A.baffi(h('scuro'))] },
  { donna: true, sfondo: '#e4edb4', pelle: 'a', capelli: 'grigio', taglio: 'caschetto', giacca: '#4a3290', cravatta: '#f4d35e', viso: [A.occhialiQuadri, A.perle] },
  { sfondo: '#e6d3ee', pelle: 'a', capelli: 'nero', taglio: 'riga', giacca: '#7a5c3e', cravatta: '#2e6f57', viso: [A.pizzetto(h('nero'))] },
  { donna: true, sfondo: '#bfe3ea', pelle: 'c', capelli: 'nero', taglio: 'lungo', giacca: '#f4eee5', camicia: '#dfe4e8', cravatta: '#1f2c4d' },
  { sfondo: '#ffd0b0', pelle: 'd', capelli: 'nero', taglio: 'ciuffo', giacca: '#2e6f57', cravatta: '#f4eee5', viso: [A.barba(h('nero')), A.occhiali] },
  { donna: true, sfondo: '#cfe0b0', pelle: 'e', capelli: 'scuro', taglio: 'chignon', giacca: '#b5522b', cravatta: '#f4eee5', viso: [A.orecchini] },
  { sfondo: '#b8d4e3', pelle: 'a', capelli: 'bianco', taglio: 'corto', giacca: '#3a3f4a', cravatta: '#8e44ad', viso: [A.barba(h('bianco'))] },
  { donna: true, sfondo: '#e6c3c0', pelle: 'b', capelli: 'biondo', taglio: 'ricci', giacca: '#1f2c4d', cravatta: '#c0392b', viso: [A.occhiali] },
];

// ---- Avatar riservati: un anello colorato distingue la qualifica -------------------
const ORO = '#e2b341';
const VIOLA = '#a897ff';
const VERDEACQUA = '#4fd1c5';
const VERDE = '#7bd88f';
const RISERVATI = {
  dirigente: [
    { sfondo: '#2a2216', anello: ORO, pelle: 'a', capelli: 'grigio', taglio: 'riga', giacca: '#15130f', cravatta: ORO, viso: [A.occhialiOro], busto: [A.fazzoletto(ORO)] },
    { donna: true, sfondo: '#2a2216', anello: ORO, pelle: 'c', capelli: 'scuro', taglio: 'chignon', giacca: '#15130f', cravatta: ORO, viso: [A.perle], busto: [A.fazzoletto(ORO)] },
    { sfondo: '#2a2216', anello: ORO, pelle: 'e', capelli: 'nero', taglio: 'rasato', giacca: '#f4eee5', camicia: '#15130f', cravatta: ORO, viso: [A.barba(h('nero'))], busto: [A.fazzoletto('#15130f')] },
  ],
  manager: [
    { sfondo: '#2b2248', anello: VIOLA, pelle: 'b', capelli: 'castano', taglio: 'ciuffo', giacca: '#3d3168', cravatta: VIOLA, busto: [A.spilla(VIOLA)] },
    { donna: true, sfondo: '#2b2248', anello: VIOLA, pelle: 'f', capelli: 'nero', taglio: 'afro', giacca: '#3d3168', cravatta: VIOLA, viso: [A.orecchini], busto: [A.spilla(VIOLA)] },
    { donna: true, sfondo: '#2b2248', anello: VIOLA, pelle: 'a', capelli: 'biondo', taglio: 'lungo', giacca: '#f4eee5', camicia: '#e2dcf7', cravatta: '#6a55d8', viso: [A.occhialiQuadri], busto: [A.spilla('#6a55d8')] },
  ],
  'project-manager': [
    { sfondo: '#123840', anello: VERDEACQUA, pelle: 'c', capelli: 'nero', taglio: 'riga', giacca: '#1d5560', cravatta: VERDEACQUA, viso: [A.cuffie(VERDEACQUA), A.microfono], busto: [A.badge(VERDEACQUA)] },
    { donna: true, sfondo: '#123840', anello: VERDEACQUA, pelle: 'b', capelli: 'rosso', taglio: 'coda', giacca: '#1d5560', cravatta: VERDEACQUA, viso: [A.cuffie(VERDEACQUA), A.microfono], busto: [A.badge(VERDEACQUA)] },
    { sfondo: '#123840', anello: VERDEACQUA, pelle: 'd', capelli: 'nero', taglio: 'afroCorto', giacca: '#f4eee5', camicia: '#d5f1ee', cravatta: '#1d5560', viso: [A.occhiali, A.pizzetto(h('nero'))], busto: [A.badge('#1d5560')] },
  ],
  sviluppatore: [
    { sfondo: '#12241a', anello: VERDE, pelle: 'a', capelli: 'castano', taglio: 'ciuffo', giacca: '#2f3a33', cravatta: VERDE, dietroBusto: A.cappuccio('#3f4d44'), viso: [A.occhialiQuadri, A.cuffie(VERDE)], busto: [A.codice(VERDE)] },
    { donna: true, sfondo: '#12241a', anello: VERDE, pelle: 'd', capelli: 'nero', taglio: 'caschetto', giacca: '#2f3a33', cravatta: VERDE, dietroBusto: A.cappuccio('#3f4d44'), viso: [A.occhiali, A.cuffie(VERDE)], busto: [A.codice(VERDE)] },
    { sfondo: '#12241a', anello: VERDE, pelle: 'f', capelli: 'nero', taglio: 'afroCorto', giacca: '#2f3a33', cravatta: VERDE, dietroBusto: A.cappuccio('#3f4d44'), viso: [A.barba(h('nero')), A.cuffie(VERDE)], busto: [A.codice(VERDE)] },
  ],
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
BASE.forEach((p, i) => {
  const n = String(i + 1).padStart(2, '0');
  fs.writeFileSync(path.join(OUT, `${n}-${p.donna ? 'donna' : 'uomo'}.svg`), avatar({ ...p, nome: `Avatar ${n}` }));
  total++;
});
for (const [qualifica, list] of Object.entries(RISERVATI)) {
  list.forEach((p, i) => {
    fs.writeFileSync(path.join(OUT, `${qualifica}-${i + 1}.svg`), avatar({ ...p, nome: `${qualifica} ${i + 1}` }));
    total++;
  });
}
console.log(`Creati ${total} avatar in ${OUT}`);
