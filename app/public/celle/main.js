// GestioneCelle come app a se' (/celle/): stessa schermata del portale, nella sua finestra.
// Si installa come app del browser oppure si apre dal collegamento di HSPI Client. Stessi account del portale.
import { get } from '/js/api.js';
import { h, toastError } from '/js/ui.js';
import { viewCelle } from '/js/celle.js';

const root = document.getElementById('app');
// GestioneCelle ha il suo stile chiaro "Excel glass" (bianco e verde), indipendente dal tema del portale
function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  document.querySelector('meta[name="color-scheme"]').content = name;
}
applyTheme('light');
document.body.classList.add('cg-page');

async function start() {
  const [state, catalogo] = await Promise.all([get('/api/state'), get('/api/catalogo').catch(() => ({ apps: [] }))]);
  const me = (catalogo.apps || []).find((a) => a.id === 'gestione-celle');
  if (!state.user || state.user.mustChange) {
    root.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'card glass', style: 'max-width:420px;margin:12vh auto;text-align:center' },
      h('img', { src: '/catalogo/gestione-celle/icon.svg', alt: '', style: 'width:64px;height:64px' }),
      h('h1', { style: 'margin:12px 0 6px' }, 'GestioneCelle'),
      h('p', { class: 'muted' }, 'Accedi al portale con il tuo account, poi riapri questa finestra.'),
      h('a', { class: 'btn primary', href: '/' }, 'Accedi al portale'))));
    return;
  }
  const view = h('div', { id: 'view' });
  root.replaceChildren(h('div', { class: 'main app-window' },
    h('header', { class: 'topbar' },
      h('a', { href: '#/celle', class: 'app-brand', onclick: () => setTimeout(show) },
        h('img', { src: '/catalogo/gestione-celle/icon.svg', alt: '' }), h('strong', {}, 'GestioneCelle'),
        me ? h('span', { class: 'chip' }, `v${me.version}`) : null),
      h('div', { class: 'spacer' }),
      h('a', { class: 'btn sm', href: '/#/home', title: `Torna al portale ${state.portalName}` }, '← Portale'),
      h('span', { class: 'small muted only-desktop' }, state.user.name)),
    view));
  async function show() {
    try { await viewCelle(view); } catch (err) { if (err.status === 401) location.reload(); else toastError(err); }
  }
  window.addEventListener('hashchange', show);
  await show();
}
start().catch(toastError);
