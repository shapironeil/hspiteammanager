// Service worker del portale: rende l'app installabile sul telefono e mostra una pagina chiara quando la rete manca.
// Regola: prima sempre la rete (cosi' gli aggiornamenti arrivano subito); la copia salvata serve solo senza rete.
// Le richieste ai dati (/api/), alle web app (/apps/) e alle immagini personali (/media/) non si salvano MAI.
// __VERSION__ viene sostituito dal server con la versione di version.json: a ogni aggiornamento la cache si rinnova.
const CACHE = 'hspi-__VERSION__';
const SHELL = ['/', '/index.html', '/css/app.css', '/js/app.js', '/js/api.js', '/js/ui.js', '/js/views-main.js', '/js/views-projects.js',
  '/js/views-admin.js', '/js/tour.js', '/js/explorer.js', '/img/logo.svg', '/img/icon-192.png', '/offline.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/^\/(api|apps|media)\//.test(url.pathname)) return; // dati: solo rete
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      // senza rete: una pagina che spiega cosa fare (l'interfaccia senza dati non servirebbe a nulla)
      .catch(async () => (e.request.mode === 'navigate' ? caches.match('/offline.html') : (await caches.match(e.request)) || Response.error())),
  );
});
