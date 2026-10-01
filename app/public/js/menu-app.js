// Menu del portale richiamabile dalle app a se' (MPoint, GestioneCelle, Verbale Studio): un bottone in alto a
// sinistra apre il menu laterale del portale sopra l'app, per tornare al portale o andare in un'altra schermata.
// Le app non stanno nel menu: ognuna vive nel suo ambiente e si apre da "App e programmi".
// Lo stile e' incluso qui, cosi' il menu e' uguale anche nelle pagine che non usano app.css (Verbale Studio).
import { get, post } from './api.js';
import { h, icon } from './ui.js';
import { NAV_PORTALE, PROFILE, can, labelOf } from './nav.js';

const CSS = `
.am-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border, rgba(127,127,127,.3)); background: var(--glass, rgba(127,127,127,.12)); color: inherit; display: inline-grid; place-items: center; cursor: pointer; flex: none; padding: 0; }
.am-btn svg { width: 20px; height: 20px; }
.am-btn:hover, .am-btn[aria-expanded="true"] { border-color: var(--accent, #d97757); color: var(--link, inherit); }
.am-scrim { position: fixed; inset: 0; z-index: 190; background: var(--scrim, rgba(0, 0, 0, .45)); display: none; }
.am-scrim.open { display: block; }
.am-drawer { position: fixed; top: 0; left: 0; bottom: 0; width: min(290px, calc(100vw - 48px)); z-index: 191; display: flex; flex-direction: column; gap: 4px; padding: 14px 12px; box-sizing: border-box; overflow-y: auto; transform: translateX(calc(-100% - 20px)); transition: transform .22s ease; background: var(--panel-solid, var(--bg, #1f1e1d)); color: var(--text, #ececea); border-right: 1px solid var(--border, rgba(127,127,127,.3)); box-shadow: 0 18px 50px rgba(0, 0, 0, .35); font-family: var(--sans, system-ui, sans-serif); font-size: 14px; }
.am-drawer.open { transform: none; }
.am-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.am-brand { flex: 1; display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; min-width: 0; font-weight: 600; }
.am-brand img { width: 32px; height: 32px; object-fit: contain; }
.am-brand strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.am-here { display: flex; align-items: center; gap: 6px; padding: 2px 10px 8px; font-size: 12px; opacity: .75; }
.am-here img { width: 18px; height: 18px; border-radius: 5px; }
.am-nav { display: flex; flex-direction: column; gap: 3px; }
.am-item { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 10px; border-radius: 10px; color: inherit; text-decoration: none; background: none; border: 1px solid transparent; font: inherit; cursor: pointer; width: 100%; text-align: left; box-sizing: border-box; }
.am-item svg { width: 20px; height: 20px; flex: none; }
.am-item:hover, .am-item:focus-visible { background: var(--glass, rgba(127,127,127,.12)); outline: none; }
.am-item.am-back { border-color: var(--border, rgba(127,127,127,.3)); margin-bottom: 4px; font-weight: 600; }
.am-sep { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; opacity: .6; padding: 10px 10px 2px; }
.am-foot { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border, rgba(127,127,127,.3)); display: flex; flex-direction: column; gap: 3px; }
@media (prefers-reduced-motion: reduce) { .am-drawer { transition: none; } }
`;

function ensureStyle() {
  if (document.getElementById('am-style')) return;
  const st = document.createElement('style');
  st.id = 'am-style';
  st.textContent = CSS;
  document.head.append(st);
}

// Restituisce il bottone da mettere in alto a sinistra; il menu (e la sua tenda) viene aggiunto al body una volta sola.
// state = risposta di /api/state; opts = { appName, appIcon }
export function portalMenu(state, { appName = '', appIcon = '' } = {}) {
  ensureStyle();
  const u = state.user;
  const b = state.branding || {};
  const dark = (document.documentElement.dataset.theme || 'dark') !== 'light';
  const logo = (dark ? b.logoLight : b.logoDark) || b.logo || '/img/logo.svg';
  const items = NAV_PORTALE.filter((n) => can(u, n.min) && (!n.show || n.show(u)));
  const link = (n) => h('a', { class: 'am-item', href: `/#/${n.id}`, 'data-id': n.id }, icon(n.icon), h('span', {}, labelOf(n, u)));
  const nav = h('nav', { class: 'am-nav', 'aria-label': 'Menu del portale' });
  for (const n of items) {
    if (n.group) nav.append(h('div', { class: 'am-sep' }, n.group));
    nav.append(link(n));
  }
  let old = document.getElementById('am-drawer');
  if (old) { old.remove(); const s = document.getElementById('am-scrim'); if (s) s.remove(); }
  const close = () => { drawer.classList.remove('open'); scrim.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  const open = () => { drawer.classList.add('open'); scrim.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); const first = drawer.querySelector('a.am-item'); if (first) first.focus(); };
  const scrim = h('div', { id: 'am-scrim', class: 'am-scrim', onclick: close });
  const drawer = h('aside', { id: 'am-drawer', class: 'am-drawer', 'aria-label': 'Menu del portale' },
    h('div', { class: 'am-head' },
      h('a', { class: 'am-brand', href: '/#/home', title: 'Torna al portale' }, h('img', { src: logo, alt: '' }), h('strong', {}, state.portalName || 'Portale')),
      h('button', { class: 'am-btn', type: 'button', 'aria-label': 'Chiudi il menu', title: 'Chiudi', onclick: close }, icon('close'))),
    appName ? h('div', { class: 'am-here' }, appIcon ? h('img', { src: appIcon, alt: '' }) : null, `Sei in ${appName}`) : null,
    h('a', { class: 'am-item am-back', href: '/#/home' }, icon('back'), h('span', {}, 'Torna al portale')),
    nav,
    h('div', { class: 'am-foot' },
      link(PROFILE),
      h('button', { class: 'am-item', type: 'button', onclick: async () => { try { await post('/api/logout'); } catch { /* sessione gia' scaduta */ } location.href = '/'; } }, icon('logout'), h('span', {}, 'Esci'))));
  const btn = h('button', { class: 'am-btn', type: 'button', title: 'Menu del portale', 'aria-label': 'Apri il menu del portale', 'aria-expanded': 'false', onclick: () => (drawer.classList.contains('open') ? close() : open()) }, icon('menu'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });
  document.body.append(scrim, drawer);
  return btn;
}

// Per le pagine senza moduli (Verbale Studio): legge lo stato del portale e monta il bottone nel contenitore.
export async function mountPortalMenu(container, opts) {
  const state = await get('/api/state');
  if (!state.user) return;
  container.replaceChildren(portalMenu(state, opts));
}
