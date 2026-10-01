// Registra il service worker (app installabile). Funziona solo in HTTPS o su localhost:
// in rete locale senza HTTPS il portale funziona lo stesso, solo non si "installa".
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

// Installazione come app del browser (Edge/Chrome: una finestra a se', un'icona nel menu Start, nessun setup).
// La pagina App del portale apre le app con ?installa=1: qui compare il pulsante per installarle.
(function () {
  let prompt = null;
  const wanted = new URLSearchParams(location.search).has('installa');
  const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  function banner() {
    if (!wanted || standalone || document.getElementById('hspi-installa')) return;
    const name = (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content || document.title;
    const box = document.createElement('div');
    box.id = 'hspi-installa';
    box.setAttribute('role', 'dialog');
    box.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;max-width:min(520px,calc(100vw - 32px));'
      + 'background:#2a2826;color:#f3ede6;border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.35);'
      + 'font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
    const text = document.createElement('span');
    text.style.flex = '1 1 220px';
    text.textContent = prompt
      ? `Installa ${name} come app: si apre nella sua finestra, con l'icona nel menu Start. Nessun setup.`
      : `Per installare ${name} come app: menu del browser (⋯) → App → Installa questo sito come app.`;
    const btn = (label, primary, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = `border-radius:999px;padding:7px 14px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.2);${primary ? 'background:#d97757;color:#1f1e1d;border-color:transparent' : 'background:transparent;color:inherit'}`;
      b.onclick = fn;
      return b;
    };
    box.append(text);
    if (prompt) box.append(btn('Installa', true, async () => { prompt.prompt(); await prompt.userChoice.catch(() => null); prompt = null; box.remove(); }));
    box.append(btn('Chiudi', false, () => box.remove()));
    document.body.append(box);
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); prompt = e; document.getElementById('hspi-installa')?.remove(); banner(); });
  window.addEventListener('load', () => setTimeout(banner, 1500));
})();
