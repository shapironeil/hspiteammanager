// Pagine di presentazione (benvenuto, guida, scarica): stesso logo, stesso nome e stesso tema del portale.
// Logo e nome arrivano da /api/state (cartella "logo" del portale), il tema dalla scelta fatta nel portale.

// Tema: quello scelto nel portale (pulsante sole/luna), altrimenti quello del sistema.
let chosen = null;
try { chosen = JSON.parse(localStorage.getItem('hspi.tema')); } catch { /* archivio locale non disponibile */ }
if (chosen === 'light' || chosen === 'dark') document.documentElement.dataset.theme = chosen;
const isDark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'dark';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const showLogo = () => document.querySelectorAll('img[data-logo]').forEach((img) => img.classList.add('ready'));

// Come nel portale: logo chiaro sul tema scuro e viceversa, altrimenti il logo, altrimenti quello di serie.
fetch('/api/state').then((r) => r.json()).then((s) => {
  const b = s.branding || {};
  const logo = (isDark() ? b.logoLight : b.logoDark) || b.logo || '/img/logo.svg';
  document.querySelectorAll('img[data-logo]').forEach((img) => { img.src = logo; img.alt = s.portalName || ''; });
  if (b.favicon || b.logo) document.getElementById('favicon').href = b.favicon || b.logo;
  if (s.portalName) {
    document.querySelectorAll('[data-portal-name]').forEach((el) => { el.textContent = s.portalName; });
    document.title = document.title.replace(/HSPI Team Manager$/, s.portalName);
  }
}).catch(() => {}).finally(showLogo);
setTimeout(showLogo, 1500); // in ogni caso non resta senza logo

// Versione del portale e dimensione del pacchetto client (dalla stessa fonte: version.json dell'host)
fetch('/api/version').then((r) => r.json()).then((v) => {
  const f = document.getElementById('versione');
  if (f) f.textContent = `Versione ${v.version}`;
  const cv = document.getElementById('cv');
  if (cv && v.client) cv.textContent = `v${v.client.version}`;
  const cs = document.getElementById('cs');
  if (cs && v.client) cs.textContent = 'Pacchetto ZIP con installa.bat · per Windows · si aggiorna da solo';
}).catch(() => {});

// Catalogo delle app: versioni (benvenuto) ed elenco con le novita' (scarica)
fetch('/api/catalogo').then((r) => r.json()).then(({ apps }) => {
  for (const a of apps) document.querySelectorAll(`[data-app-version="${a.id}"]`).forEach((el) => { el.textContent = `v${a.version}`; });
  const box = document.getElementById('apps');
  if (!box) return;
  box.innerHTML = apps.map((a) => {
    const last = a.novita[0];
    return `<div class="card app">
      <div class="app-head"><img src="${esc(a.icon)}" alt=""><div><h3>${esc(a.name)}</h3><span class="muted">v${esc(a.version)}${a.engine ? ' · con motore sul PC' : ''}</span></div></div>
      <p>${esc(a.summary)}</p>
      ${last ? `<details><summary>Novità della v${esc(last.version)}</summary><ul>${(last.items || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
      <div class="row"><a class="btn primary" href="${esc(a.web)}">Apri</a><a class="btn" href="${esc(a.web)}?installa=1">Installa nel browser</a></div>
    </div>`;
  }).join('') || '<div class="card muted">Nessuna app nel catalogo.</div>';
}).catch(() => {});
