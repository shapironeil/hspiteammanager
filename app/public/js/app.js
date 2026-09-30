// Avvio dell'interfaccia: schermate di accesso, menu laterale per ruolo, navigazione.
import { get, post } from './api.js';
import { h, icon, form, field, toastError, initials } from './ui.js';
import { viewHome, viewPrograms, viewFiles, viewProfile } from './views-main.js';
import { viewAccounts, viewLogs, viewIssues, viewSystem } from './views-admin.js';

const root = document.getElementById('app');
const RANK = { dipendente: 0, manager: 1, hacker: 2 };
export const app = { state: null, user: null, can: (role) => RANK[app.user.role] >= RANK[role] };

// Voci del menu. "min" e' il ruolo minimo che vede la voce.
// Per aggiungere una schermata: una voce qui + una funzione view in views-*.js.
const NAV = [
  { id: 'home', label: 'Home', icon: 'home', min: 'dipendente', view: viewHome },
  { id: 'programmi', label: 'Programmi', icon: 'apps', min: 'dipendente', view: viewPrograms },
  { id: 'file', label: 'File', icon: 'folder', min: 'dipendente', view: viewFiles },
  { id: 'team', label: (u) => (u.role === 'hacker' ? 'Account' : 'Team'), icon: 'users', min: 'manager', view: viewAccounts, group: 'Organizzazione' },
  { id: 'log', label: 'Log attività', icon: 'log', min: 'hacker', view: viewLogs, group: 'Controllo' },
  { id: 'problemi', label: 'Errori e bug', icon: 'bug', min: 'hacker', view: viewIssues },
  { id: 'sistema', label: 'Sistema', icon: 'system', min: 'hacker', view: viewSystem },
];
const PROFILE = { id: 'profilo', label: 'Profilo', icon: 'user', min: 'dipendente', view: viewProfile };

const logoUrl = () => app.state.branding.logo || '/img/logo.svg';

function applyBranding() {
  const { branding, portalName } = app.state;
  document.title = portalName;
  if (branding.favicon || branding.logo) document.getElementById('favicon').href = branding.favicon || branding.logo;
  const backdrop = document.querySelector('.backdrop');
  if (branding.sfondo) {
    backdrop.classList.add('has-image');
    backdrop.style.backgroundImage = `url("${branding.sfondo}")`;
  }
}

export async function boot() {
  app.state = await get('/api/state');
  app.user = app.state.user;
  applyBranding();
  if (!app.user) return app.state.setupNeeded ? renderSetup() : renderLogin();
  if (app.user.mustChange) return renderMustChange();
  renderShell();
}

// ---- Schermate di accesso --------------------------------------------------
function authCard(title, subtitle, content) {
  root.replaceChildren(h('div', { class: 'auth' },
    h('div', { class: 'auth-card glass' },
      h('div', { class: 'auth-brand' },
        h('img', { src: logoUrl(), alt: '' }),
        h('h1', {}, title),
        subtitle ? h('p', { class: 'muted' }, subtitle) : null),
      content,
      h('div', { class: 'auth-foot' }, `${app.state.portalName} · v${app.state.version} beta`))));
  const first = root.querySelector('input');
  if (first) first.focus();
}

function renderLogin() {
  authCard(app.state.portalName, 'Accedi con il tuo account', form([
    field('Nome utente', h('input', { type: 'text', name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' })),
    field('Password', h('input', { type: 'password', name: 'password', autocomplete: 'current-password' })),
    h('button', { class: 'btn primary', type: 'submit' }, 'Accedi'),
  ], async (v) => { await post('/api/login', v); location.hash = '#/home'; await boot(); }));
}

function renderSetup() {
  if (!app.state.canSetup) {
    return authCard('Portale da configurare', 'Il primo account va creato dal PC che ospita il portale, aprendo http://localhost:8080.', null);
  }
  authCard('Benvenuto', 'Primo avvio: crea il tuo account Hacker, quello che vede e gestisce tutto.', form([
    field('Nome e cognome', h('input', { type: 'text', name: 'name', autocomplete: 'name' })),
    field('Nome utente', h('input', { type: 'text', name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' })),
    field('Password (almeno 8 caratteri)', h('input', { type: 'password', name: 'password', autocomplete: 'new-password' })),
    field('Ripeti la password', h('input', { type: 'password', name: 'repeat', autocomplete: 'new-password' })),
    h('button', { class: 'btn primary', type: 'submit' }, 'Crea account e entra'),
  ], async (v) => {
    if (v.password !== v.repeat) throw new Error('Le due password non coincidono.');
    await post('/api/setup', v);
    location.hash = '#/home';
    await boot();
  }));
}

function renderMustChange() {
  authCard('Scegli la tua password', `Ciao ${app.user.name}: al primo accesso devi sostituire la password provvisoria.`, h('div', {},
    form([
      field('Password provvisoria', h('input', { type: 'password', name: 'current', autocomplete: 'current-password' })),
      field('Nuova password (almeno 8 caratteri)', h('input', { type: 'password', name: 'next', autocomplete: 'new-password' })),
      field('Ripeti la nuova password', h('input', { type: 'password', name: 'repeat', autocomplete: 'new-password' })),
      h('button', { class: 'btn primary', type: 'submit' }, 'Salva e continua'),
    ], async (v) => {
      if (v.next !== v.repeat) throw new Error('Le due password non coincidono.');
      await post('/api/me/password', v);
      await boot();
    }),
    h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' },
      h('button', { class: 'btn sm', type: 'button', onclick: logout }, 'Esci'))));
}

async function logout() {
  try { await post('/api/logout'); } catch { /* sessione gia' scaduta */ }
  location.hash = '';
  await boot();
}

// ---- Struttura con menu laterale -------------------------------------------
let shell = null;
let content = null;

function renderShell() {
  const items = NAV.filter((n) => app.can(n.min));
  const pinned = localStorage.getItem('hspi.menu') === 'fisso';
  const link = (n) => h('a', { class: 'nav-item', href: `#/${n.id}`, 'data-id': n.id, title: typeof n.label === 'function' ? n.label(app.user) : n.label },
    icon(n.icon), h('span', {}, typeof n.label === 'function' ? n.label(app.user) : n.label));

  const nav = h('nav', { class: 'nav', 'aria-label': 'Menu principale' });
  for (const n of items) {
    if (n.group) nav.append(h('div', { class: 'nav-sep' }, n.group));
    nav.append(link(n));
  }

  content = h('div', { id: 'view' });
  shell = h('div', { class: 'shell' + (pinned ? ' pinned' : '') },
    h('div', { class: 'scrim', onclick: () => shell.classList.remove('menu-open') }),
    h('aside', { class: 'sidebar glass' },
      h('div', { class: 'side-brand' }, h('img', { src: logoUrl(), alt: '' }), h('strong', {}, app.state.portalName)),
      nav,
      h('div', { class: 'side-foot' },
        link(PROFILE),
        h('button', { class: 'nav-item', type: 'button', title: 'Esci', onclick: logout }, icon('logout'), h('span', {}, 'Esci')))),
    h('div', { class: 'main' },
      h('header', { class: 'topbar' },
        h('button', { class: 'icon-btn only-mobile', type: 'button', 'aria-label': 'Apri il menu', onclick: () => shell.classList.add('menu-open') }, icon('menu')),
        h('button', {
          class: 'icon-btn only-desktop', type: 'button', 'aria-label': 'Blocca o sblocca il menu', title: 'Blocca o sblocca il menu',
          onclick: () => { const on = shell.classList.toggle('pinned'); localStorage.setItem('hspi.menu', on ? 'fisso' : 'comparsa'); },
        }, icon('menu')),
        h('div', { class: 'spacer' }),
        h('a', { class: 'user-chip glass', href: '#/profilo', title: 'Il tuo profilo' },
          h('span', { class: 'avatar' }, initials(app.user.name)),
          h('span', { class: 'who' }, app.user.name, h('small', {}, app.state.roles[app.user.role])))),
      content));
  root.replaceChildren(shell);
  navigate();
}

async function navigate() {
  if (!shell || !shell.isConnected) return;
  const id = (location.hash.replace(/^#\//, '') || 'home').split('?')[0];
  const entry = [...NAV, PROFILE].find((n) => n.id === id && app.can(n.min)) || NAV[0];
  shell.classList.remove('menu-open');
  shell.querySelectorAll('.nav-item[data-id]').forEach((a) => a.classList.toggle('active', a.dataset.id === entry.id));
  try {
    await entry.view(content);
    window.scrollTo(0, 0);
  } catch (err) {
    if (err.status === 401) return boot();
    content.replaceChildren(h('div', { class: 'card glass' }, h('h2', {}, 'Qualcosa non ha funzionato'), h('p', { class: 'muted' }, err.message)));
  }
}
export const refresh = () => navigate();
window.addEventListener('hashchange', navigate);

// Gli errori JavaScript finiscono nella schermata "Errori e bug" dell'Hacker.
function reportError(message, detail) {
  if (!app.user) return;
  post('/api/client-error', { message: String(message).slice(0, 400), detail: `${location.hash}\n${detail || ''}` }).catch(() => {});
}
window.addEventListener('error', (e) => reportError(e.message, e.error && e.error.stack));
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason || {};
  if (r.status) return; // errori del server gia' mostrati all'utente
  reportError(r.message || String(r), r.stack);
});

boot().catch(toastError);
