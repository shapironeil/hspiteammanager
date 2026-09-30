// Guida a popup: una breve presentazione del portale, un passo alla volta.
// Compare da sola al primo accesso di ogni persona su quel browser; si riapre dal pulsante "?" in alto.
// Per cambiare i testi o aggiungere un passo basta modificare l'elenco STEPS.
import { h, icon } from './ui.js';
import { app } from './app.js';

// "min" = ruolo minimo che vede quel passo.
const STEPS = [
  { icon: 'home', title: (u) => `Benvenuto, ${u.name.split(' ')[0]}`, text: 'Questo è il portale del team: un posto unico per progetti, programmi e file. Ti mostro in pochi passi dove trovare le cose.' },
  { icon: 'menu', title: 'Il menu a sinistra', text: 'Passa il mouse sulla barra a sinistra per aprire il menu. Con il pulsante in alto lo puoi tenere sempre aperto. Le voci che vedi dipendono dal tuo ruolo.' },
  { icon: 'briefcase', title: 'Progetti', text: 'Qui trovi solo i progetti di cui fai parte. Ogni scheda mostra le persone coinvolte e il collegamento alla cartella aziendale su OneDrive, che si apre con il tuo account.' },
  { icon: 'apps', title: 'Programmi', text: 'Gli strumenti del team si aprono direttamente dal portale con il pulsante Apri. Ogni programma ha la sua Guida, da leggere prima di usarlo.' },
  { icon: 'folder', title: 'File', text: 'Carica un file per te, oppure invialo a un collega o a tutto il team. I file che ricevi compaiono nella colonna Ricevuti.' },
  { icon: 'user', title: 'Il tuo profilo', text: 'Il cerchio in alto a destra sei tu: da lì scegli l\'avatar, cambi la password e segnali un problema se qualcosa non funziona.' },
  { icon: 'users', min: 'manager', title: 'Team e annunci', text: 'Come manager vedi chi fa parte del team, crei progetti, scegli chi può vederli e pubblichi annunci nella Home.' },
  { icon: 'system', min: 'hacker', title: 'Il pannello di controllo', text: 'Come Hacker approvi le registrazioni, assegni ruoli e qualifiche, e tieni d\'occhio log, errori e spazio di archiviazione.' },
  { icon: 'help', title: 'Tutto qui', text: 'Puoi rivedere questa guida quando vuoi con il pulsante "?" in alto. Accanto trovi anche il cambio tra tema chiaro e scuro.' },
];

const key = () => `hspi.guida.${app.user.username}`;
function seen(value) {
  try {
    if (value === undefined) return localStorage.getItem(key()) === 'vista';
    localStorage.setItem(key(), 'vista');
  } catch { /* archivio locale non disponibile */ }
  return false;
}

export function showTour() {
  if (document.querySelector('.tour')) return;
  const steps = STEPS.filter((s) => !s.min || app.can(s.min));
  let i = 0;

  const iconBox = h('div', { class: 'tour-icon' });
  const title = h('h2', {});
  const text = h('p', { 'aria-live': 'polite' });
  const dots = h('div', { class: 'tour-dots', 'aria-hidden': 'true' }, steps.map(() => h('i', {})));
  const skip = h('button', { class: 'btn sm', type: 'button', onclick: close }, 'Salta');
  const prev = h('button', { class: 'btn sm', type: 'button', onclick: () => go(i - 1) }, 'Indietro');
  const next = h('button', { class: 'btn primary', type: 'button', onclick: () => (i === steps.length - 1 ? close() : go(i + 1)) });

  const back = h('div', { class: 'modal-back' },
    h('div', { class: 'tour glass', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Guida al portale' },
      iconBox, title, text, dots,
      h('div', { class: 'tour-actions' }, skip, h('div', { class: 'row' }, prev, next))));

  function go(n) {
    i = Math.max(0, Math.min(steps.length - 1, n));
    const s = steps[i];
    iconBox.replaceChildren(icon(s.icon));
    title.textContent = typeof s.title === 'function' ? s.title(app.user) : s.title;
    text.textContent = s.text;
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    prev.hidden = i === 0;
    skip.hidden = i === steps.length - 1;
    next.textContent = i === steps.length - 1 ? 'Inizia' : 'Avanti';
    next.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
  }
  function close() {
    seen(true);
    document.removeEventListener('keydown', onKey);
    back.remove();
  }

  document.addEventListener('keydown', onKey);
  document.body.append(back);
  go(0);
}

export function maybeShowTour() {
  if (!seen()) showTour();
}
