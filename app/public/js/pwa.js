// Registra il service worker (app installabile). Funziona solo in HTTPS o su localhost:
// in rete locale senza HTTPS il portale funziona lo stesso, solo non si "installa".
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
