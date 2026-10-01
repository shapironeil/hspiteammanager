/* Cippi · Funzioni di alto livello (slide dai layout, agenda, immagini, tabelle, data, pulizia, presentazione SAL).
   Modulo a se': non dipende dall'interfaccia principale. Si apre con CippiFunzioni.open(docId) oppure
   aggiungendo "&funzioni=1" all'indirizzo del documento (#/doc/12?funzioni=1). Dopo ogni azione la pagina si ricarica:
   il documento ha una versione nuova e l'analisi si rifa'. */
(function () {
  'use strict';
  const HSPI = { 'x-hspi': '1' };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  async function api(method, url, body, raw) {
    const opts = { method, headers: { ...HSPI }, credentials: 'same-origin' };
    if (raw) opts.body = raw; else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
    return data;
  }
  const lines = (t) => String(t || '').split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).map((l) => { const m = /^(\s*)(.*)$/.exec(l); return { text: m[2], lvl: Math.floor(m[1].replace(/\t/g, '  ').length / 2) }; });
  const tableOf = (t) => { const rows = String(t || '').split('\n').filter((l) => l.trim()).map((l) => l.split('|').map((c) => c.trim())); return rows.length ? { rows } : undefined; };

  const CSS = `
  .cf-back{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px}
  .cf-win{background:var(--bg-2,#232221);color:var(--fg,#eee);border:1px solid rgba(255,255,255,.12);border-radius:14px;max-width:760px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.5);font:14px/1.45 system-ui,sans-serif}
  .cf-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.1)}
  .cf-head h2{margin:0;font-size:17px;flex:1}
  .cf-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:10px 18px 0}
  .cf-tabs button{background:transparent;border:1px solid rgba(255,255,255,.18);color:inherit;border-radius:999px;padding:5px 12px;cursor:pointer}
  .cf-tabs button.on{background:#5b4fd6;border-color:#5b4fd6;color:#fff}
  .cf-body{padding:14px 18px 18px}
  .cf-body label{display:block;margin:8px 0 4px;font-size:12px;opacity:.8}
  .cf-body input,.cf-body select,.cf-body textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);color:inherit;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:7px 9px;font:inherit}
  .cf-body textarea{min-height:90px;font-family:ui-monospace,monospace;font-size:12.5px}
  .cf-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cf-foot{display:flex;gap:8px;justify-content:flex-end;padding:0 18px 18px}
  .cf-btn{background:#5b4fd6;color:#fff;border:0;border-radius:9px;padding:8px 14px;cursor:pointer;font:inherit}
  .cf-btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.2);color:inherit}
  .cf-hint{font-size:12px;opacity:.7;margin:4px 0 0}
  .cf-msg{margin:8px 0 0;font-size:13px;color:#ffb4a2}
  @media (max-width:600px){.cf-row{grid-template-columns:1fr}}`;

  const TABS = [
    ['slide', 'Nuova slide'], ['agenda', 'Agenda'], ['immagine', 'Immagine'], ['data', 'Data'], ['sal', 'Presentazione SAL'], ['pulisci', 'Pulizia'], ['rimuovi', 'Togli slide'],
  ];
  function form(tab, ctx) {
    const lay = `<label>Layout del modello</label><select name="layout">${ctx.layouts.map((l) => `<option value="${esc(l.name)}">${esc(l.name)}${l.hasPicture ? ' · immagine' : ''}${l.bodies > 1 ? ' · 2 contenuti' : ''}</option>`).join('')}</select>`;
    const at = `<label>Posizione (vuoto = in coda)</label><input name="at" type="number" min="1" placeholder="${ctx.count + 1}" />`;
    if (tab === 'slide') return `${lay}<div class="cf-row"><div><label>Titolo</label><input name="title" /></div><div>${at}</div></div>
      <label>Testo (una riga per paragrafo; due spazi all'inizio per il livello sotto)</label><textarea name="body"></textarea>
      <label>Tabella (facoltativa: una riga per riga, celle separate da |; la prima riga e' l'intestazione)</label><textarea name="table" placeholder="Voce | Valore&#10;A | € 1.000,00"></textarea>
      <label>Note del relatore</label><input name="notes" />`;
    if (tab === 'agenda') return `<label>Voci dell'agenda (una per riga)</label><textarea name="items"></textarea>
      <div class="cf-row"><div><label>Voce corrente da evidenziare (1.., vuoto = nessuna)</label><input name="current" type="number" min="1" /></div><div><label>Copia l'agenda della slide n. (vuoto = dal layout)</label><input name="from" type="number" min="1" placeholder="${ctx.agendaSlide || ''}" value="${ctx.agendaSlide || ''}" /></div></div>
      <div class="cf-row"><div>${at}</div><div><label>Divisori</label><select name="dividers"><option value="">No</option><option value="1">Una slide "Intestazione sezione" per ogni voce</option></select></div></div>`;
    if (tab === 'immagine') return `${lay}<div class="cf-row"><div><label>Titolo</label><input name="title" /></div><div>${at}</div></div>
      <label>Immagine (PNG, JPEG, GIF)</label><input name="file" type="file" accept="image/png,image/jpeg,image/gif" />
      <label>Testo accanto (facoltativo)</label><textarea name="body"></textarea>`;
    if (tab === 'data') return `<label>Data da scrivere nei segnaposto data (copertina)</label><input name="testo" value="${esc(new Date().toLocaleDateString('it-IT'))}" />`;
    if (tab === 'sal') return `<p class="cf-hint">Crea una presentazione nuova dentro questo file usato come modello: copertina, agenda ripetuta, piano di lavoro, attività per servizio, consuntivazione, fatturazione, rischi. I dati sono gli stessi del verbale Word (Verbale Studio → Verbale SAL in Word).</p>
      <div class="cf-row"><div><label>Nome del documento</label><input name="name" value="SAL" /></div><div><label>Progetto</label><input name="projectId" type="hidden" value="${ctx.projectId}" /><input value="${esc(ctx.project || '')}" disabled /></div></div>
      <label>Dati del SAL (JSON)</label><textarea name="dati" rows="14">${esc(JSON.stringify(ctx.esempio || {}, null, 2))}</textarea>
      <label><input type="checkbox" name="divisori" style="width:auto"/> Slide divisorie tra le sezioni</label>`;
    if (tab === 'pulisci') return `<p class="cf-hint">Toglie dal file i layout, i master, i temi e le immagini che nessuna slide usa. Il file diventa piu' leggero; i layout usati restano.</p>`;
    if (tab === 'rimuovi') return `<label>Numeri delle slide da togliere (es. 2, 5-7)</label><input name="slides" placeholder="2, 5-7" />`;
    return '';
  }
  const range = (s) => String(s || '').split(',').flatMap((x) => { const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(x); if (m) return Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => Number(m[1]) + i); const n = Number(x); return n ? [n] : []; });

  async function run(tab, docId, v, ctx) {
    const num = (x) => (x ? Number(x) : undefined);
    if (tab === 'slide') return api('POST', `/api/cippi/docs/${docId}/funzioni`, { azioni: [{ tipo: 'slide', layout: v.layout, title: v.title, body: v.body ? lines(v.body) : undefined, table: tableOf(v.table), notes: v.notes || undefined, at: num(v.at) }] });
    if (tab === 'agenda') return api('POST', `/api/cippi/docs/${docId}/funzioni`, { azioni: [{ tipo: 'agenda', items: String(v.items).split('\n').map((x) => x.trim()).filter(Boolean), current: v.current ? Number(v.current) - 1 : undefined, from: num(v.from), at: num(v.at), dividers: !!v.dividers }] });
    if (tab === 'immagine') {
      const f = v.file;
      if (!f) throw new Error('Scegli un\'immagine.');
      const q = new URLSearchParams({ layout: v.layout, title: v.title || '', body: v.body || '', name: f.name, at: v.at || '' });
      return api('PUT', `/api/cippi/docs/${docId}/slide-immagine?${q}`, undefined, f);
    }
    if (tab === 'data') return api('POST', `/api/cippi/docs/${docId}/funzioni`, { azioni: [{ tipo: 'data', testo: v.testo }] });
    if (tab === 'pulisci') return api('POST', `/api/cippi/docs/${docId}/funzioni`, { azioni: [{ tipo: 'pulisci' }] });
    if (tab === 'rimuovi') return api('POST', `/api/cippi/docs/${docId}/funzioni`, { azioni: [{ tipo: 'rimuovi', slides: range(v.slides) }] });
    if (tab === 'sal') {
      let dati;
      try { dati = JSON.parse(v.dati); } catch (e) { throw new Error('I dati del SAL non sono un JSON valido: ' + e.message); }
      const r = await api('POST', `/api/cippi/docs/${docId}/sal`, { projectId: Number(v.projectId) || ctx.projectId, dati, name: v.name, divisori: !!v.divisori });
      return { ...r, nuovoDoc: r.id };
    }
  }

  async function open(docId) {
    if (!docId) return;
    if (!$('#cf-style')) { const st = document.createElement('style'); st.id = 'cf-style'; st.textContent = CSS; document.head.appendChild(st); }
    const back = document.createElement('div'); back.className = 'cf-back';
    back.innerHTML = `<div class="cf-win" role="dialog" aria-label="Funzioni"><div class="cf-head"><h2>Funzioni</h2><button class="cf-btn ghost" data-close>Chiudi</button></div><div class="cf-tabs"></div><div class="cf-body">Carico…</div><div class="cf-foot"><button class="cf-btn" data-run>Esegui</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', (e) => { if (e.target === back || e.target.hasAttribute('data-close')) close(); });
    let ctx;
    try {
      const [doc, lay, ex] = await Promise.all([api('GET', `/api/cippi/docs/${docId}`), api('GET', `/api/cippi/docs/${docId}/layouts`), api('GET', '/api/sal/esempio').catch(() => ({ dati: {} }))]);
      const agenda = doc.analysis.slides.find((s) => s.kind === 'indice');
      ctx = { layouts: lay.layouts, count: doc.list.length, agendaSlide: agenda ? agenda.n : null, projectId: doc.projectId, project: doc.project, esempio: ex.dati, name: doc.name };
      $('.cf-head h2', back).textContent = `Funzioni · ${doc.name}`;
    } catch (e) { $('.cf-body', back).innerHTML = `<p class="cf-msg">${esc(e.message)}</p>`; return; }
    const tabs = $('.cf-tabs', back); const body = $('.cf-body', back);
    let cur = 'slide';
    const draw = () => { tabs.innerHTML = TABS.map(([k, t]) => `<button class="${k === cur ? 'on' : ''}" data-tab="${k}">${esc(t)}</button>`).join(''); body.innerHTML = form(cur, ctx); };
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { cur = b.dataset.tab; draw(); } });
    draw();
    $('[data-run]', back).onclick = async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true; btn.textContent = 'Lavoro…';
      const v = {};
      body.querySelectorAll('[name]').forEach((i) => { v[i.name] = i.type === 'checkbox' ? i.checked : i.type === 'file' ? i.files[0] : i.value; });
      try {
        const r = await run(cur, docId, v, ctx);
        if (r && r.nuovoDoc) { location.hash = `#/doc/${r.nuovoDoc}`; location.reload(); return; }
        location.reload();
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Esegui';
        let m = $('.cf-msg', body); if (!m) { m = document.createElement('p'); m.className = 'cf-msg'; body.appendChild(m); }
        m.textContent = e.message;
      }
    };
  }

  window.CippiFunzioni = { open };
  // apertura dall'indirizzo: #/doc/12?funzioni=1
  const auto = () => { const m = /#\/doc\/(\d+)\?(?:.*&)?funzioni=1/.exec(location.hash); if (m && !$('.cf-back')) open(m[1]); };
  window.addEventListener('hashchange', auto);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
