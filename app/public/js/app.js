// Avvio dell'interfaccia: accesso e registrazione, sfondi dinamici, menu laterale per ruolo, navigazione.
import { get, post } from './api.js';
import { h, icon, form, field, toast, toastError, avatarEl, usernamePreview } from './ui.js';
import { viewHome, viewPrograms, viewFiles, viewProfile } from './views-main.js';
import { viewProjects, resetProjects } from './views-projects.js';
import { viewExplorer } from './explorer.js';
import { viewPercorso } from './percorso.js';
import { viewCelle } from './celle.js';
import { maybeShowTour, showTour } from './tour.js';
import { viewAccounts, viewLogs, viewIssues, viewSystem, viewRoles, viewTeamStats } from './views-admin.js';

const root = document.getElementById('app');
const RANK = { dipendente: 0, manager: 1, hacker: 2 };
export const app = { state: null, user: null, can: (role) => RANK[app.user.role] >= RANK[role] };

// Testo sotto il nome: la qualifica se c'e', altrimenti il ruolo.
// Testo sotto il nome: il grado (Stage, Dipendente, Manager, ...); se manca, la qualifica o il ruolo.
export const roleText = (u) => (u.grade && u.grade.name) || (u.title && app.state.titles[u.title]) || app.state.roles[u.role] || u.role;

// Voci del menu. "min" e' il ruolo minimo che vede la voce; "dynamic" = sfondo dinamico in quella schermata.
// Per aggiungere una schermata: una voce qui + una funzione view in views-*.js.
const NAV = [
  { id: 'home', label: 'Home', icon: 'home', min: 'dipendente', view: viewHome, dynamic: true },
  { id: 'progetti', label: 'Progetti', icon: 'briefcase', min: 'dipendente', view: viewProjects, reset: resetProjects },
  { id: 'esplora', label: 'Esplora file', icon: 'folder', min: 'dipendente', view: viewExplorer },
  { id: 'celle', label: 'GestioneCelle', icon: 'tree', min: 'dipendente', view: viewCelle },
  // Verbale Studio e' un'app a se' (pagina /verbali/), con gli stessi account e gli stessi progetti.
  { id: 'verbali', label: 'Verbale Studio', icon: 'note', min: 'dipendente', href: '/verbali/' },
  { id: 'programmi', label: 'App e programmi', icon: 'apps', min: 'dipendente', view: viewPrograms },
  { id: 'file', label: 'File inviati', icon: 'upload', min: 'dipendente', view: viewFiles },
  { id: 'team', label: (u) => (u.role === 'hacker' ? 'Account' : 'Team'), icon: 'users', min: 'manager', view: viewAccounts, group: 'Organizzazione' },
  // Statistiche di chi sta sotto nella gerarchia: compare solo a chi ha qualcuno sotto di se'.
  { id: 'mio-team', label: 'Il mio team', icon: 'chart', min: 'dipendente', view: viewTeamStats, show: (u) => u.teamCount > 0 },
  { id: 'ruoli', label: 'Ruoli', icon: 'shield', min: 'hacker', view: viewRoles, group: 'Controllo' },
  { id: 'percorso', label: 'Percorso', icon: 'trophy', min: 'hacker', view: viewPercorso },
  { id: 'log', label: 'Log attività', icon: 'log', min: 'hacker', view: viewLogs },
  { id: 'problemi', label: 'Errori e bug', icon: 'bug', min: 'hacker', view: viewIssues },
  { id: 'sistema', label: 'Sistema', icon: 'system', min: 'hacker', view: viewSystem },
];
const PROFILE = { id: 'profilo', label: 'Profilo', icon: 'user', min: 'dipendente', view: viewProfile };

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* archivio locale non disponibile */ }
  return null;
}

// ---- Tema chiaro / scuro -------------------------------------------------------
const theme = () => document.documentElement.dataset.theme || 'dark';
function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  document.querySelector('meta[name="color-scheme"]').content = name;
}
applyTheme(store('hspi.tema') === 'light' ? 'light' : 'dark');

function themeButton() {
  const dark = theme() === 'dark';
  return h('button', {
    class: 'icon-btn', type: 'button', title: dark ? 'Passa al tema chiaro' : 'Passa al tema scuro', 'aria-label': dark ? 'Passa al tema chiaro' : 'Passa al tema scuro',
    onclick: async () => { const next = dark ? 'light' : 'dark'; store('hspi.tema', next); applyTheme(next); await boot(); },
  }, icon(dark ? 'sun' : 'moon'));
}

// Se esistono due versioni del logo si usa quella adatta al tema: logo chiaro su tema scuro e viceversa.
function logoUrl() {
  const b = app.state.branding;
  const themed = theme() === 'dark' ? b.logoLight : b.logoDark;
  return themed || b.logo || '/img/logo.svg';
}

function applyBranding() {
  const { branding, portalName } = app.state;
  document.title = portalName;
  if (branding.favicon || branding.logo) document.getElementById('favicon').href = branding.favicon || branding.logo;
}

// ---- Sfondi ------------------------------------------------------------------
// Due sfondi: quello DINAMICO (cartella "background", immagini che si alternano) si vede solo
// nell'accesso e nella Home; nelle altre schermate c'e' quello STATICO (cartella "background portal"),
// con una versione per il tema chiaro e una per il tema scuro.
const BG_KEY = 'hspi.sfondi';
const BG_SECONDS = 40;
const backdrop = document.querySelector('.backdrop');
let dynamicStarted = false;
let staticLayer = null;
let staticPick = null; // { light, dark } una volta deciso quale immagine va con quale tema

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ogni browser ha il suo ordine: il primo sfondo lo assegna il server a rotazione, cosi' due persone
// che aprono il portale per la prima volta non partono dalla stessa immagine.
function startDynamic() {
  const urls = app.state.backgrounds || [];
  if (dynamicStarted || !urls.length) return;
  dynamicStarted = true;

  let saved = store(BG_KEY);
  const same = saved && Array.isArray(saved.order) && saved.order.length === urls.length && saved.order.every((u) => urls.includes(u));
  if (!same) {
    const first = urls[app.state.backgroundStart % urls.length];
    saved = { order: [first, ...shuffle(urls.filter((u) => u !== first))], pos: 0 };
  }
  let pos = saved.pos % saved.order.length;
  store(BG_KEY, { order: saved.order, pos: (pos + 1) % saved.order.length });

  const layers = [h('div', { class: 'bg-layer' }), h('div', { class: 'bg-layer' })];
  backdrop.prepend(...layers);
  let active = 0;
  const show = (url) => {
    const img = new Image();
    img.onload = () => {
      const next = layers[1 - active];
      next.style.backgroundImage = `url("${url}")`;
      next.classList.add('show');
      layers[active].classList.remove('show');
      active = 1 - active;
      backdrop.classList.add('has-dynamic');
    };
    img.src = url;
  };
  show(saved.order[pos]);
  if (saved.order.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => {
      if (document.hidden || !backdrop.classList.contains('show-dynamic')) return;
      pos = (pos + 1) % saved.order.length;
      show(saved.order[pos]);
    }, BG_SECONDS * 1000);
  }
}

// Luminosita' media di un'immagine (0 = nera, 255 = bianca): serve quando i nomi dei file non dicono quale e' chiara.
function brightness(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0, 16, 16);
        const d = g.getImageData(0, 0, 16, 16).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        resolve(sum / (d.length / 4));
      } catch { resolve(128); }
    };
    img.onerror = () => resolve(128);
    img.src = url;
  });
}

async function applyStatic() {
  const p = app.state.portalBackgrounds || { all: [] };
  if (!p.all.length) return;
  if (!staticPick) {
    let { light, dark } = p;
    if ((!light || !dark) && p.all.length > 1) {
      const scored = await Promise.all(p.all.map(async (url) => ({ url, b: await brightness(url) })));
      scored.sort((a, b) => a.b - b.b);
      dark = dark || scored[0].url;
      light = light || scored[scored.length - 1].url;
    }
    staticPick = { light: light || dark || p.all[0], dark: dark || light || p.all[0] };
  }
  if (!staticLayer) { staticLayer = h('div', { class: 'bg-static' }); backdrop.prepend(staticLayer); }
  const url = staticPick[theme()];
  const img = new Image();
  img.onload = () => { staticLayer.style.backgroundImage = `url("${url}")`; staticLayer.classList.add('ready'); backdrop.classList.add('has-static'); };
  img.src = url;
}

function setBackdrop(mode) {
  backdrop.classList.toggle('show-dynamic', mode === 'dynamic');
  backdrop.classList.toggle('show-static', mode === 'static');
}

export async function boot() {
  app.state = await get('/api/state');
  app.user = app.state.user;
  applyBranding();
  startDynamic();
  applyStatic();
  if (!app.user) return renderAuth(app.state.setupNeeded ? 'registrati' : 'accedi');
  if (app.user.mustChange) return renderMustChange();
  renderShell();
}

// ---- Accesso e registrazione -------------------------------------------------
function authCard(title, subtitle, content) {
  setBackdrop('dynamic');
  root.replaceChildren(h('div', { class: 'auth' },
    h('div', { style: 'position:fixed;top:14px;right:14px' }, themeButton()),
    h('div', { class: 'auth-card glass' },
      h('div', { class: 'auth-brand' },
        h('img', { src: logoUrl(), alt: app.state.portalName }),
        h('h1', {}, title),
        subtitle ? h('p', { class: 'muted' }, subtitle) : null),
      content,
      h('div', { class: 'auth-foot' }, `${app.state.portalName} · v${app.state.version} beta · `, h('a', { href: '/benvenuto' }, 'Cos\'è e come si installa')))));
  const first = root.querySelector('input');
  if (first) first.focus();
}

const INFO = {
  username: 'È il nome utente che ti è stato assegnato alla registrazione: nome.cognome, tutto minuscolo e senza spazi. Esempio: mario.rossi',
  password: 'La password che hai scelto quando ti sei registrato. Se l\'hai dimenticata, chiedi all\'Hacker di reimpostarla.',
  firstName: 'Il tuo nome di battesimo, come vuoi che lo vedano i colleghi. Esempio: Mario',
  lastName: 'Il tuo cognome. Insieme al nome forma il tuo nome utente. Esempio: Rossi',
  newPassword: 'Almeno 8 caratteri. Scegline una che non usi altrove: una frase corta è più sicura e più facile da ricordare.',
  repeat: 'Riscrivi la stessa password, per essere sicuri che non ci siano errori di battitura.',
};

function loginForm() {
  return form([
    field('Nome utente', h('input', { type: 'text', name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', placeholder: 'nome.cognome' }), INFO.username),
    field('Password', h('input', { type: 'password', name: 'password', autocomplete: 'current-password' }), INFO.password),
    h('button', { class: 'btn primary', type: 'submit' }, 'Accedi'),
  ], async (v) => { await post('/api/login', v); location.hash = '#/home'; await boot(); });
}

function registerForm() {
  const first = h('input', { type: 'text', name: 'firstName', autocomplete: 'given-name', maxlength: '40' });
  const last = h('input', { type: 'text', name: 'lastName', autocomplete: 'family-name', maxlength: '40' });
  const preview = h('strong', {}, 'nome.cognome');
  const update = () => { preview.textContent = usernamePreview(first.value, last.value) || 'nome.cognome'; };
  first.addEventListener('input', update);
  last.addEventListener('input', update);
  return form([
    field('Nome', first, INFO.firstName),
    field('Cognome', last, INFO.lastName),
    h('div', { class: 'username-preview' }, 'Il tuo nome utente sarà ', preview, h('br'), 'Se esiste già, viene aggiunto un numero alla fine.'),
    field('Password', h('input', { type: 'password', name: 'password', autocomplete: 'new-password' }), INFO.newPassword),
    field('Ripeti la password', h('input', { type: 'password', name: 'repeat', autocomplete: 'new-password' }), INFO.repeat),
    h('button', { class: 'btn primary', type: 'submit' }, app.state.setupNeeded ? 'Crea account Hacker ed entra' : 'Registrati'),
  ], async (v) => {
    if (v.password !== v.repeat) throw new Error('Le due password non coincidono.');
    const res = await post('/api/register', v);
    if (res.pending) return renderRegistered(res.username);
    location.hash = '#/home';
    await boot();
  });
}

function renderAuth(tab) {
  const setup = app.state.setupNeeded;
  if (setup && !app.state.canSetup) {
    return authCard('Portale da configurare', 'Il primo account va creato dal PC che ospita il portale, aprendo http://localhost:8080.', null);
  }
  const tabButton = (id, label) => h('button', {
    class: 'tab' + (tab === id ? ' active' : ''), type: 'button', role: 'tab', 'aria-selected': String(tab === id),
    onclick: () => renderAuth(id),
  }, label);
  const subtitle = setup
    ? 'Primo avvio: il primo account che si registra diventa l\'Hacker, quello che vede e gestisce tutto.'
    : tab === 'accedi' ? 'Accedi con il tuo account' : 'Crea il tuo account. Entrerai appena l\'Hacker lo approva.';
  authCard(setup ? 'Benvenuto' : app.state.portalName, subtitle, h('div', {},
    setup ? null : h('div', { class: 'tabs', role: 'tablist' }, tabButton('accedi', 'Accedi'), tabButton('registrati', 'Registrati')),
    tab === 'accedi' ? loginForm() : registerForm()));
}

function renderRegistered(username) {
  authCard('Registrazione inviata', 'Segnati il tuo nome utente: ti servirà per accedere.', h('div', {},
    h('div', { class: 'big-username' }, username),
    h('p', { class: 'muted', style: 'text-align:center;margin-bottom:18px' }, 'Il tuo account è in attesa di approvazione. Potrai entrare appena l\'Hacker lo approva.'),
    h('button', { class: 'btn primary', type: 'button', onclick: () => renderAuth('accedi') }, 'Vai all\'accesso')));
}

function renderMustChange() {
  authCard('Scegli la tua password', `Ciao ${app.user.name}: al primo accesso devi sostituire la password provvisoria.`, h('div', {},
    form([
      field('Password provvisoria', h('input', { type: 'password', name: 'current', autocomplete: 'current-password' }), 'La password che ti ha comunicato chi ha creato il tuo account.'),
      field('Nuova password', h('input', { type: 'password', name: 'next', autocomplete: 'new-password' }), INFO.newPassword),
      field('Ripeti la nuova password', h('input', { type: 'password', name: 'repeat', autocomplete: 'new-password' }), INFO.repeat),
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
  const items = NAV.filter((n) => app.can(n.min) && (!n.show || n.show(app.user)));
  const pinned = store('hspi.menu') === 'fisso';
  const link = (n) => h('a', {
    class: 'nav-item', href: n.href || `#/${n.id}`, 'data-id': n.id, title: typeof n.label === 'function' ? n.label(app.user) : n.label,
    // Cliccare la voce della schermata in cui si e' gia' la riporta al suo inizio.
    onclick: () => { if (n.reset) n.reset(); if (location.hash === `#/${n.id}`) navigate(); },
  },
    icon(n.icon), h('span', {}, typeof n.label === 'function' ? n.label(app.user) : n.label));

  const nav = h('nav', { class: 'nav', 'aria-label': 'Menu principale' });
  // I gruppi del menu (Organizzazione, Controllo...) si aprono e chiudono cliccando sul titolo.
  // La scelta resta memorizzata su questo browser.
  let box = nav;
  for (const n of items) {
    if (n.group) {
      const key = `hspi.gruppo.${n.group}`;
      const closed = store(key) === 'chiuso';
      const body = h('div', { class: 'nav-group' + (closed ? ' closed' : '') });
      const head = h('button', {
        class: 'nav-sep', type: 'button', 'aria-expanded': String(!closed), title: `Apri o chiudi ${n.group}`,
        onclick: () => {
          const nowClosed = body.classList.toggle('closed');
          head.setAttribute('aria-expanded', String(!nowClosed));
          store(key, nowClosed ? 'chiuso' : 'aperto');
        },
      }, h('span', {}, n.group), icon('pin'));
      nav.append(head, body);
      box = body;
    }
    box.append(link(n));
  }

  content = h('div', { id: 'view' });
  shell = h('div', { class: 'shell' + (pinned ? ' pinned' : '') },
    h('div', { class: 'scrim', onclick: () => shell.classList.remove('menu-open') }),
    h('aside', { class: 'sidebar glass' },
      h('a', { class: 'side-brand', href: '#/home', title: 'Home', style: 'text-decoration:none;color:inherit' },
        h('img', { src: logoUrl(), alt: '' }), h('strong', {}, app.state.portalName)),
      nav,
      h('div', { class: 'side-foot' },
        link(PROFILE),
        h('button', { class: 'nav-item', type: 'button', title: 'Esci', onclick: logout }, icon('logout'), h('span', {}, 'Esci')))),
    h('div', { class: 'main' },
      h('header', { class: 'topbar' },
        h('button', { class: 'icon-btn only-mobile', type: 'button', 'aria-label': 'Apri il menu', onclick: () => shell.classList.add('menu-open') }, icon('menu')),
        h('button', {
          class: 'icon-btn only-desktop', type: 'button', 'aria-label': 'Blocca o sblocca il menu', title: 'Blocca o sblocca il menu',
          onclick: () => { const on = shell.classList.toggle('pinned'); store('hspi.menu', on ? 'fisso' : 'comparsa'); },
        }, icon('menu')),
        h('a', { href: '#/home', title: 'Home', style: 'line-height:0' }, h('img', { class: 'topbar-logo', src: logoUrl(), alt: app.state.portalName })),
        h('div', { class: 'spacer' }),
        h('button', {
          class: 'icon-btn', type: 'button', title: 'Aggiorna i dati di questa schermata', 'aria-label': 'Aggiorna i dati di questa schermata',
          onclick: async (e) => {
            const btn = e.currentTarget;
            btn.classList.add('spin');
            await navigate(true);
            setTimeout(() => btn.classList.remove('spin'), 600);
          },
        }, icon('refresh')),
        h('button', { class: 'icon-btn', type: 'button', title: 'Guida al portale', 'aria-label': 'Guida al portale', onclick: () => showTour() }, icon('help')),
        themeButton(),
        // Cerchio dell'utente in alto a destra: porta alla schermata del profilo.
        h('a', { class: 'user-chip glass', href: '#/profilo', title: 'Il tuo profilo', 'aria-label': `Il tuo profilo: ${app.user.name}` },
          avatarEl(app.user),
          h('span', { class: 'who' }, app.user.name, h('small', {}, roleText(app.user))))),
      content));
  root.replaceChildren(shell);
  navigate();
  maybeShowTour();
}

async function navigate(manual) {
  if (!shell || !shell.isConnected) return;
  const id = (location.hash.replace(/^#\//, '') || 'home').split('?')[0];
  // Trama ora si chiama GestioneCelle: i vecchi collegamenti portano alla nuova schermata.
  if (id === 'trama') { history.replaceState(null, '', location.hash.replace('#/trama', '#/celle')); return navigate(manual); }
  const entry = [...NAV, PROFILE].find((n) => n.id === id && n.view && app.can(n.min)) || NAV[0];
  shell.classList.remove('menu-open');
  setBackdrop(entry.dynamic ? 'dynamic' : 'static');
  shell.querySelectorAll('.nav-item[data-id]').forEach((a) => a.classList.toggle('active', a.dataset.id === entry.id));
  // Se la schermata aperta sta in un gruppo chiuso, il gruppo si riapre per mostrare dove ci si trova.
  const group = shell.querySelector('.nav-item.active')?.closest('.nav-group.closed');
  if (group) { group.classList.remove('closed'); group.previousElementSibling.setAttribute('aria-expanded', 'true'); }
  try {
    await entry.view(content);
    if (manual === true) toast('Dati aggiornati.'); else window.scrollTo(0, 0);
  } catch (err) {
    if (err.status === 401) return boot();
    content.replaceChildren(h('div', { class: 'card glass' }, h('h2', {}, 'Qualcosa non ha funzionato'), h('p', { class: 'muted' }, err.message)));
  }
}
export const refresh = () => navigate();
window.addEventListener('hashchange', () => navigate());

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
