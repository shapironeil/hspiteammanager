// Cippi: presentazioni del team. Libreria (documenti e modelli) e modalita' Revisione:
//   pannello STRUMENTI  (modalita', cosa mostrare, struttura per sezioni, percorso di lettura, controlli, glossario,
//                        appunti, confronto con un modello)
//   pannello VISIONE    (la slide disegnata, ordine di lettura e gerarchia dei blocchi, stato degli step, confronto
//                        To-Be / As-Is affiancato, striscia delle miniature)
//   pannello PUNTI CHIAVE (punti e domande della revisione, struttura della slide, dettaglio del flusso; in Modifica
//                        i testi dei blocchi si correggono qui)
// Creazione da zero, da un modello, importazione da PC o dalla cartella del progetto; esportazione in .pptx.
import { get, post, patch, del, upload, api } from '/js/api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtDate } from '/js/ui.js';
import { renderSlide } from '/cippi/render.js';

const root = document.getElementById('app');
const enc = encodeURIComponent;
const KIND = {
  copertina: 'Copertina', titolo: 'Titolo', indice: 'Indice', divisore: 'Divisore di sezione', testo: 'Testo', legenda: 'Legenda',
  flusso: 'Flusso', mappa: 'Mappa dei processi', scheda: 'Scheda', tabella: 'Tabella', schema: 'Schema', chiusura: 'Chiusura', immagine: 'Immagine',
  piano: 'Piano', organigramma: 'Organigramma', numeri: 'Numeri',
};
const ROLE = { titolo: 'Titolo', sottotitolo: 'Sottotitolo', intestazione: 'Intestazione', paragrafo: 'Paragrafo', elenco: 'Elenco', tabella: 'Tabella', immagine: 'Immagine', nota: 'Nota', etichetta: 'Etichetta', schema: 'Schema', navigazione: 'Navigazione' };
const POINT = { chiave: 'Punto chiave', nota: 'Nota', domanda: 'Domanda', 'da-fare': 'Da fare' };
const STATUS = ['bozza', 'in revisione', 'approvato'];
let state = null; // /api/state
let me = null; // scheda Cippi nel catalogo

// ---- Tema (lo stesso del portale) ---------------------------------------------------------------
let saved = 'dark';
try { saved = JSON.parse(localStorage.getItem('hspi.tema')) === 'light' ? 'light' : 'dark'; } catch { /* archivio locale non disponibile */ }
function applyTheme(name) { document.documentElement.dataset.theme = name; document.querySelector('meta[name="color-scheme"]').content = name; }
applyTheme(saved);
const dark = () => document.documentElement.dataset.theme !== 'light';
function themeBtn() {
  const b = h('button', { class: 'icon-btn', type: 'button', title: 'Tema chiaro o scuro', 'aria-label': 'Tema chiaro o scuro',
    onclick: () => { const next = dark() ? 'light' : 'dark'; try { localStorage.setItem('hspi.tema', JSON.stringify(next)); } catch { /* niente */ } applyTheme(next); b.replaceChildren(icon(dark() ? 'sun' : 'moon')); } },
  icon(dark() ? 'sun' : 'moon'));
  return b;
}
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch { /* niente */ } return null; };

function topbar(...middle) {
  return h('header', { class: 'cp-top' },
    h('a', { href: '#/', class: 'app-brand', title: 'Tutti i documenti' },
      h('img', { src: '/catalogo/cippi/icon.svg', alt: '' }), h('strong', {}, 'Cippi'), me ? h('span', { class: 'chip' }, `v${me.version}`) : null),
    ...middle,
    h('div', { class: 'spacer' }),
    h('a', { class: 'btn sm', href: '/#/home', title: `Torna al portale ${state.portalName}` }, '← Portale'),
    themeBtn());
}

// ---- Libreria ---------------------------------------------------------------------------------------
async function viewLibrary() {
  const d = await get('/api/cippi');
  const tab = store('cippi.tab') || 'documenti';
  const projectSelect = (name = 'projectId') => h('select', { name }, d.projects.map((p) => h('option', { value: String(p.id) }, p.name)));
  const needProject = () => { if (!d.projects.length) { toastError(new Error('Non fai parte di nessun progetto: un documento appartiene sempre a un progetto.')); return true; } return false; };

  const importDialog = () => {
    if (needProject()) return;
    const file = h('input', { type: 'file', name: 'file', accept: '.pptx' });
    const fromProject = h('select', { name: 'path' }, h('option', { value: '' }, '— oppure scegli un file già nella cartella del progetto —'));
    const proj = projectSelect();
    const loadFiles = async () => {
      fromProject.replaceChildren(h('option', { value: '' }, '— oppure scegli un file già nella cartella del progetto —'));
      try { for (const f of await get(`/api/cippi/file-progetto?projectId=${proj.value}`)) fromProject.append(h('option', { value: f.path }, f.path)); } catch { /* niente */ }
    };
    proj.addEventListener('change', loadFiles);
    loadFiles();
    const bar = h('div', { class: 'small muted' });
    const m = modal('Importa una presentazione', form([
      field('Progetto', proj, 'Il documento lo vedono le persone del progetto. Il file viene copiato nella cartella del progetto, in Cippi/.'),
      field('File PowerPoint (.pptx)', file),
      field('Dalla cartella del progetto', fromProject),
      field('Nome (facoltativo)', h('input', { type: 'text', name: 'nome', maxlength: '120', placeholder: 'il nome del file' })),
      bar,
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, icon('upload'), 'Importa e analizza')),
    ], async (v) => {
      let r;
      if (v.path) r = await post('/api/cippi/import-progetto', { projectId: Number(v.projectId), path: v.path, name: v.nome || null });
      else {
        const f = file.files[0];
        if (!f) throw new Error('Scegli un file .pptx.');
        r = await upload(`/api/cippi/import?projectId=${v.projectId}&name=${enc(f.name)}${v.nome ? `&nome=${enc(v.nome)}` : ''}`, f, (x) => { bar.textContent = x < 1 ? `Caricamento ${Math.round(x * 100)}%` : 'Analisi della presentazione…'; });
      }
      m.close();
      location.hash = `#/doc/${r.id}`;
    }));
  };
  const newBlank = () => {
    if (needProject()) return;
    const m = modal('Crea da zero', form([
      h('p', { class: 'muted' }, 'Parte da una presentazione base con la struttura tipica: titolo, indice, sezione, testo, legenda dei colori, flusso a corsie, chiusura. Poi la riscrivi nella modalità Modifica.'),
      field('Progetto', projectSelect()),
      field('Nome', h('input', { type: 'text', name: 'name', maxlength: '120', required: true })),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea')),
    ], async (v) => { const r = await post('/api/cippi/nuovo', { projectId: Number(v.projectId), name: v.name }); m.close(); location.hash = `#/doc/${r.id}`; }));
  };
  const fromModel = async (preset) => {
    if (needProject()) return;
    if (!d.models.length) return toastError(new Error('Non ci sono ancora modelli: apri un documento ben fatto e usa "Salva come modello".'));
    const sel = h('select', { name: 'model' }, d.models.map((x) => h('option', { value: String(x.id), selected: preset && preset.id === x.id }, x.name)));
    const partsBox = h('div', { class: 'cp-parts' });
    const loadParts = async () => {
      const md = await get(`/api/cippi/docs/${sel.value}`);
      partsBox.replaceChildren(...md.template.parts.map((p, i) => h('label', { class: 'cp-part' },
        h('input', { type: 'checkbox', name: `part-${i}`, checked: true }),
        h('span', { class: 'chip' }, KIND[p.kind] || p.kind),
        h('span', { class: 'grow' }, p.title || '(senza titolo)', h('small', { class: 'muted' }, ` · ${p.section}`)),
        h('input', { type: 'number', name: `count-${i}`, min: '1', max: '50', value: '1', title: 'Quante volte', 'aria-label': 'Quante volte' }))));
    };
    sel.addEventListener('change', () => loadParts().catch(toastError));
    await loadParts();
    const m = modal('Nuovo da modello', form([
      field('Modello', sel),
      field('Progetto', projectSelect()),
      field('Nome', h('input', { type: 'text', name: 'name', maxlength: '120', required: true })),
      h('div', { class: 'field-label' }, 'Parti da includere (nell\'ordine del modello) e quante volte'),
      partsBox,
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'vuoto', checked: true }), ' Testi come segnaposto da compilare (flussi e schemi restano come esempio)'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea')),
    ], async (v) => {
      const parts = [];
      partsBox.querySelectorAll('.cp-part').forEach((row, i) => { if (row.querySelector('input[type=checkbox]').checked) parts.push({ part: i, count: Number(row.querySelector('input[type=number]').value) || 1 }); });
      const r = await post(`/api/cippi/models/${v.model}/nuovo`, { projectId: Number(v.projectId), name: v.name, parts, vuoto: !!v.vuoto });
      m.close();
      location.hash = `#/doc/${r.id}`;
    }), { wide: true });
  };

  const card = (x) => h('a', { class: 'cp-card glass', href: `#/doc/${x.id}`, 'data-doc': x.id },
    h('div', { class: 'cp-thumb', 'data-thumb': x.id }, h('span', { class: 'muted small' }, x.slides + ' slide')),
    h('div', { class: 'cp-card-body' },
      h('h3', {}, x.name),
      h('div', { class: 'small muted' }, `${x.project} · ${x.author || ''}`),
      h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        x.kind === 'modello' ? h('span', { class: 'chip' }, `${x.parts} parti`) : h('span', { class: 'chip' + (x.status === 'approvato' ? ' ok' : x.status === 'in revisione' ? ' warn' : '') }, x.status),
        h('span', { class: 'chip' }, `${x.slides} slide`),
        x.counts.flusso ? h('span', { class: 'chip' }, `${x.counts.flusso} flussi`) : null,
        x.score !== null ? h('span', { class: 'chip' + (x.score >= 85 ? ' ok' : x.score >= 60 ? ' warn' : ' danger'), title: 'Completezza e coerenza (controlli di Cippi)' }, `${x.score}%`) : null,
        x.points ? h('span', { class: 'chip warn', title: 'Domande e cose da fare aperte' }, `${x.points} aperti`) : null,
        x.shared ? h('span', { class: 'chip ok' }, 'condiviso') : null),
      h('div', { class: 'small muted' }, `v${x.version} · aggiornato ${fmtDate(x.updatedAt)}`),
      x.kind === 'modello' ? h('div', { class: 'row' }, h('button', { class: 'btn sm primary', type: 'button', onclick: (e) => { e.preventDefault(); fromModel(x).catch(toastError); } }, icon('plus'), 'Usa il modello')) : null));

  const tabs = h('div', { class: 'cp-tabs-lib', role: 'tablist' });
  const body = h('div', {});
  const show = (t) => {
    store('cippi.tab', t);
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    const list = t === 'modelli' ? d.models : d.docs;
    body.replaceChildren(list.length ? h('div', { class: 'cp-grid' }, list.map(card))
      : h('div', { class: 'card glass empty' }, t === 'modelli'
        ? 'Nessun modello. Un modello è la "ricetta" di una presentazione ben fatta: apri un documento e usa "Salva come modello".'
        : 'Nessun documento. Importa una presentazione PowerPoint o creane una da zero.'));
    thumbs(body);
  };
  tabs.append(
    h('button', { type: 'button', 'data-t': 'documenti', onclick: () => show('documenti') }, `Documenti (${d.docs.length})`),
    h('button', { type: 'button', 'data-t': 'modelli', onclick: () => show('modelli') }, `Modelli (${d.models.length})`));
  root.replaceChildren(h('div', { class: 'main app-window cp-lib' },
    topbar(),
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Cippi'), h('p', { class: 'muted' }, 'Le presentazioni del team: Cippi le legge (sezioni, blocchi in ordine, gerarchia, flussi, legenda, sigle), propone i punti chiave e i controlli, e le rifà da un modello.')),
      h('div', { class: 'row', style: 'flex-wrap:wrap' },
        h('button', { class: 'btn primary', type: 'button', onclick: importDialog }, icon('upload'), 'Importa PowerPoint'),
        h('button', { class: 'btn', type: 'button', onclick: newBlank }, icon('plus'), 'Crea da zero'),
        h('button', { class: 'btn', type: 'button', onclick: () => fromModel().catch(toastError) }, icon('copy'), 'Nuovo da modello'))),
    tabs, body));
  show(tab);
}

// Miniature: la prima slide di ogni documento, disegnata quando la scheda entra nello schermo
function thumbs(scope) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const id = e.target.dataset.thumb;
      get(`/api/cippi/docs/${id}/slide/1`).then((s) => {
        e.target.replaceChildren(renderSlide(s, { media: (n) => `/api/cippi/docs/${id}/media?name=${enc(n)}` }));
      }).catch(() => {});
    }
  }, { rootMargin: '200px' });
  scope.querySelectorAll('[data-thumb]').forEach((t) => io.observe(t));
}

// ---- Revisione -------------------------------------------------------------------------------------
async function viewDoc(id, startAt) {
  const doc = await get(`/api/cippi/docs/${id}`);
  const A = doc.analysis;
  const R = {
    list: doc.list.map((x) => ({ ...x, texts: { ...(x.texts || {}) } })), cur: Math.min(Math.max(0, (startAt || 1) - 1), doc.list.length - 1),
    mode: store('cippi.modo') === 'modifica' && doc.canEdit ? 'modifica' : 'revisione',
    show: { blocks: store('cippi.blocchi') !== false, flow: store('cippi.stati') !== false, notes: !!store('cippi.note') },
    scope: 'slide', compare: null, updatedAt: doc.updatedAt, saving: null, panel: 'visione',
  };
  const cache = new Map();
  const slideData = (src) => { if (!cache.has(src)) cache.set(src, get(`/api/cippi/docs/${id}/slide/${src}`)); return cache.get(src); };
  const media = (n) => `/api/cippi/docs/${id}/media?name=${enc(n)}&v=${doc.version}`;
  const info = (i) => A.slides[R.list[i].src - 1];
  const procOf = (src) => A.processes.find((p) => p.slides.includes(src));
  const cmpOf = (src) => A.comparisons.find((c) => c.toBe.includes(src) || c.asIs.includes(src));
  const posOfSrc = (src) => R.list.findIndex((x) => x.src === src);

  // ---- salvataggio delle modifiche (testi, ordine) con controllo dei conflitti
  const save = () => {
    clearTimeout(R.saving);
    R.saving = setTimeout(async () => {
      try {
        const r = await patch(`/api/cippi/docs/${id}`, { slides: R.list.map(({ src, texts, note }) => ({ src, ...(texts && Object.keys(texts).length ? { texts } : {}), ...(note ? { note } : {}) })), updatedAt: R.updatedAt });
        R.updatedAt = r.updatedAt;
        savedMark.textContent = 'Modifiche salvate';
        doc.edited = true;
      } catch (err) {
        if (err.status === 409) confirmDialog('Modificato da un altro utente', err.message, 'Ricarica', () => viewDoc(id, R.cur + 1));
        else toastError(err);
      }
    }, 700);
    savedMark.textContent = 'Salvataggio…';
  };
  const savedMark = h('span', { class: 'small muted' });

  // ---- barra in alto
  const statusSel = h('select', { class: 'cp-status', 'aria-label': 'Stato del documento', disabled: !doc.canEdit, onchange: async () => { try { const r = await patch(`/api/cippi/docs/${id}`, { status: statusSel.value }); R.updatedAt = r.updatedAt; toast(`Stato: ${statusSel.value}`); } catch (e) { toastError(e); } } },
    STATUS.map((s) => h('option', { value: s, selected: doc.status === s }, s)));
  const actions = h('div', { class: 'row cp-actions' },
    doc.kind === 'documento' ? statusSel : h('span', { class: 'chip' }, 'Modello'),
    h('span', { class: 'chip' + (A.score >= 85 ? ' ok' : A.score >= 60 ? ' warn' : ' danger'), title: 'Completezza e coerenza secondo i controlli' }, `${A.score}%`),
    doc.memoria && doc.memoria.riconosciuto ? h('span', { class: 'chip ok', title: `Modello noto della memoria (${doc.memoria.riconosciuto.score}/100): ${doc.memoria.riconosciuto.segnali.join(', ')}` }, icon('check'), ` ${doc.memoria.riconosciuto.template}`) : null,
    savedMark,
    h('a', { class: 'btn sm', href: `/api/cippi/docs/${id}/download`, title: 'Scarica il .pptx con le modifiche' }, icon('download'), 'Scarica'),
    doc.kind === 'documento' && doc.canEdit ? h('button', { class: 'btn sm', type: 'button', title: 'Salva il .pptx nella cartella del progetto e rianalizza', onclick: saveVersion }, icon('history'), 'Salva versione') : null,
    doc.kind === 'documento' ? h('button', { class: 'btn sm', type: 'button', onclick: saveAsModel }, icon('copy'), 'Salva come modello') : null,
    doc.kind === 'modello' && doc.canManage ? h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: doc.shared, onchange: async (e) => { try { await patch(`/api/cippi/docs/${id}`, { shared: e.target.checked }); toast(e.target.checked ? 'Modello condiviso con tutto il team.' : 'Modello visibile solo nel progetto.'); } catch (err) { toastError(err); } } }), ' Condiviso con tutti') : null,
    doc.canManage ? h('button', { class: 'icon-btn', type: 'button', title: 'Elimina', 'aria-label': 'Elimina', onclick: () => confirmDialog(`Eliminare "${doc.name}"?`, 'Il documento sparisce da Cippi. I file nella cartella del progetto restano.', 'Elimina', async () => { await del(`/api/cippi/docs/${id}`); location.hash = '#/'; }) }, icon('trash')) : null);

  async function saveVersion(e) {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      clearTimeout(R.saving);
      const r = await post(`/api/cippi/docs/${id}/salva-versione`);
      toast(`Versione ${r.version} salvata in ${r.path}`);
      await viewDoc(id, R.cur + 1);
    } catch (err) { toastError(err); } finally { b.disabled = false; }
  }
  function saveAsModel() {
    const m = modal('Salva come modello', form([
      h('p', { class: 'muted' }, 'Il modello conserva la "ricetta" di questa presentazione: le parti nell\'ordine in cui si presentano, i blocchi di ogni slide e dove stanno, le sezioni, la legenda, i colori e i caratteri. Da qui si creano documenti nuovi e si misura quanto un documento è completo.'),
      field('Nome del modello', h('input', { type: 'text', name: 'name', maxlength: '120', value: doc.name, required: true })),
      field('Descrizione', h('input', { type: 'text', name: 'description', maxlength: '300', placeholder: 'es. Chiusura progetto di processo (To-Be con Back Up As-Is)' })),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Salva modello')),
    ], async (v) => { const r = await post(`/api/cippi/docs/${id}/modello`, v); m.close(); toast('Modello salvato.'); location.hash = `#/doc/${r.id}`; }));
  }

  // ---- tre pannelli
  const tools = h('aside', { class: 'cp-panel cp-tools', 'aria-label': 'Pannello strumenti' });
  const view = h('main', { class: 'cp-panel cp-view', 'aria-label': 'Pannello visione' });
  const pts = h('aside', { class: 'cp-panel cp-points', 'aria-label': 'Punti chiave' });
  const tabs = h('div', { class: 'cp-tabs' }, ['strumenti', 'visione', 'punti'].map((t) => h('button', { type: 'button', 'data-p': t, onclick: () => { R.panel = t; layout(); } }, { strumenti: 'Strumenti', visione: 'Visione', punti: 'Punti chiave' }[t])));
  const shell = h('div', { class: 'cp-review' }, tools, view, pts);
  const layout = () => {
    shell.dataset.panel = R.panel;
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.p === R.panel));
  };
  root.replaceChildren(h('div', { class: 'cp-app' },
    topbar(h('div', { class: 'cp-docname' }, h('strong', {}, doc.name), h('span', { class: 'small muted' }, `${doc.project} · v${doc.version}`)), actions),
    tabs, shell));
  layout();

  const go = (i) => { R.cur = Math.max(0, Math.min(R.list.length - 1, i)); R.compare = null; history.replaceState(null, '', `#/doc/${id}?s=${R.cur + 1}`); drawAll(); };

  // ---- STRUMENTI
  function drawTools() {
    const sec = (title, open, ...kids) => {
      const key = `cippi.sez.${title}`;
      const d = h('details', { class: 'cp-sec', open: store(key) === null ? open : store(key) }, h('summary', {}, title), ...kids);
      d.addEventListener('toggle', () => store(key, d.open));
      return d;
    };
    const modeBtn = (m, label) => h('button', { type: 'button', class: R.mode === m ? 'on' : '', disabled: m === 'modifica' && !doc.canEdit, onclick: () => { R.mode = m; store('cippi.modo', m); drawAll(); } }, label);
    const chk = (k, label, storeKey) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: R.show[k], onchange: (e) => { R.show[k] = e.target.checked; store(storeKey, e.target.checked); drawView(); } }), ` ${label}`);

    // struttura: sezioni -> slide
    const struct = h('ol', { class: 'cp-struct' });
    let lastSection = null;
    R.list.forEach((x, i) => {
      const s = A.slides[x.src - 1];
      if (s.section !== lastSection) { lastSection = s.section; struct.append(h('li', { class: 'cp-struct-sec' }, s.section)); }
      const edited = x.texts && Object.keys(x.texts).length;
      const ops = R.mode === 'modifica' ? h('span', { class: 'cp-ops' },
        h('button', { type: 'button', title: 'Sposta su', 'aria-label': 'Sposta su', disabled: i === 0, onclick: (e) => { e.stopPropagation(); [R.list[i - 1], R.list[i]] = [R.list[i], R.list[i - 1]]; R.cur = i - 1; save(); drawAll(); } }, icon('up')),
        h('button', { type: 'button', title: 'Sposta giù', 'aria-label': 'Sposta giù', disabled: i === R.list.length - 1, onclick: (e) => { e.stopPropagation(); [R.list[i + 1], R.list[i]] = [R.list[i], R.list[i + 1]]; R.cur = i + 1; save(); drawAll(); } }, icon('down')),
        h('button', { type: 'button', title: 'Duplica', 'aria-label': 'Duplica', onclick: (e) => { e.stopPropagation(); R.list.splice(i + 1, 0, { src: x.src, texts: { ...(x.texts || {}) } }); R.cur = i + 1; save(); drawAll(); } }, icon('copy')),
        h('button', { type: 'button', title: 'Togli dalla presentazione', 'aria-label': 'Togli', disabled: R.list.length < 2, onclick: (e) => { e.stopPropagation(); confirmDialog('Togliere la slide?', `"${s.title || KIND[s.kind]}" non sarà nella presentazione esportata. Il file originale resta nell'archivio.`, 'Togli', () => { R.list.splice(i, 1); R.cur = Math.min(R.cur, R.list.length - 1); save(); drawAll(); }); } }, icon('trash'))) : null;
      struct.append(h('li', { class: 'cp-struct-item' + (i === R.cur ? ' on' : '') + (s.hidden ? ' hidden-slide' : ''), onclick: () => go(i), title: s.title || KIND[s.kind] },
        h('span', { class: 'n' }, String(i + 1)), h('span', { class: `cp-kind k-${s.kind}` }, KIND[s.kind] || s.kind),
        h('span', { class: 'grow ellipsis' }, s.title || h('i', { class: 'muted' }, '—')), edited ? h('span', { class: 'dot', title: 'Testi modificati' }) : null, ops));
    });
    // percorso di lettura
    const reading = h('ol', { class: 'cp-reading' }, A.reading.map((r) => h('li', {},
      h('button', { type: 'button', class: 'linklike', onclick: () => { const p = posOfSrc(r.slides[0]); if (p >= 0) go(p); } }, r.title),
      h('span', { class: 'small muted' }, ` · slide ${r.slides.map((n) => posOfSrc(n) + 1).filter((n) => n > 0).join(', ')}`),
      r.note ? h('div', { class: 'small muted' }, r.note) : null,
      r.compare ? h('button', { type: 'button', class: 'btn xs', onclick: () => { const p = posOfSrc(r.slides[0]); if (p >= 0) { go(p); R.compare = r.compare[0]; drawView(); } } }, 'Confronta To-Be / As-Is') : null)));
    // controlli
    const checks = h('ul', { class: 'cp-checks' }, A.checks.length ? A.checks.map((c) => h('li', { class: `lv-${c.level}` },
      h('span', { class: 'chip ' + (c.level === 'errore' ? 'danger' : c.level === 'avviso' ? 'warn' : '') }, c.level),
      c.slide ? h('button', { type: 'button', class: 'linklike', onclick: () => { const p = posOfSrc(c.slide); if (p >= 0) go(p); } }, `slide ${posOfSrc(c.slide) + 1 || c.slide}`) : null,
      h('span', {}, ` ${c.text}`))) : h('li', { class: 'muted' }, 'Nessun problema trovato.'));
    // glossario
    const gloss = h('div', { class: 'cp-gloss' }, A.glossary.length ? A.glossary.slice(0, 60).map((g) => h('div', { class: 'cp-gloss-row' },
      h('b', {}, g.term), h('small', { class: 'muted' }, `×${g.count}`),
      h('input', { type: 'text', value: g.meaning, placeholder: 'significato…', maxlength: '300', 'aria-label': `Significato di ${g.term}`, disabled: !doc.canEdit,
        onchange: async (e) => { try { await api('PUT', '/api/cippi/glossario', { projectId: doc.projectId, term: g.term, meaning: e.target.value }); g.meaning = e.target.value; toast(`${g.term}: salvato nel glossario del progetto.`); } catch (err) { toastError(err); } } }))) : h('p', { class: 'muted small' }, 'Nessuna sigla trovata.'));
    // appunti
    const notesInput = h('input', { type: 'file', hidden: true, onchange: async () => {
      const f = notesInput.files[0];
      if (!f) return;
      try { await upload(`/api/cippi/docs/${id}/appunti?name=${enc(f.name)}`, f); toast('Appunti salvati nella cartella del documento.'); doc.appunti = (await get(`/api/cippi/docs/${id}`)).appunti; drawTools(); } catch (err) { toastError(err); }
    } });
    // PDF: si legge e si confronta con la presentazione (e' l'esportazione dell'ultima versione?)
    const pdfBtn = (a) => h('button', { class: 'btn xs', type: 'button', title: 'Legge il PDF e lo confronta, pagina per slide, con la presentazione', onclick: () => comparePdf(a).catch(toastError) }, 'Confronta');
    const fileRow = (a) => h('li', {}, h('a', { href: a.url, target: '_blank', rel: 'noopener' }, icon('file'), a.name), a.pdf ? pdfBtn(a) : null);
    const appunti = h('div', {},
      h('p', { class: 'small muted' }, 'Gli appunti di studio (PDF, Word, immagini) stanno accanto al documento, nella cartella del progetto. Un PDF si confronta con la presentazione, pagina per slide.'),
      h('ul', { class: 'cp-files' }, doc.appunti.map(fileRow)),
      (doc.pdfCollegati || []).length ? h('div', { class: 'small muted' }, 'PDF con lo stesso nome nella cartella del progetto (l\'esportazione):') : null,
      (doc.pdfCollegati || []).length ? h('ul', { class: 'cp-files' }, doc.pdfCollegati.map(fileRow)) : null,
      doc.canEdit ? h('button', { class: 'btn sm', type: 'button', onclick: () => notesInput.click() }, icon('upload'), 'Aggiungi appunti') : null, notesInput);
    // memoria dei modelli: il template riconosciuto e l'impronta da conservare
    const M = doc.memoria || { candidati: [], noti: 0 };
    const memoria = h('div', { class: 'cp-memoria' },
      M.riconosciuto ? h('div', {}, h('b', {}, `Modello noto: ${M.riconosciuto.template}`), h('div', { class: 'small muted' }, `${M.riconosciuto.score}/100 · ${M.riconosciuto.segnali.join(' · ')}`), M.riconosciuto.scheda ? h('div', { class: 'small muted' }, `Scheda: docs/MEMORIA/${M.riconosciuto.formato}/${M.riconosciuto.scheda}`) : null)
        : h('p', { class: 'small muted' }, M.noti ? `Nessuno dei ${M.noti} modelli noti corrisponde a questa presentazione.` : 'La memoria dei modelli (docs/MEMORIA) è vuota.'),
      M.candidati.filter((c) => !M.riconosciuto || c.template !== M.riconosciuto.template).length ? h('ul', { class: 'small' }, M.candidati.filter((c) => !M.riconosciuto || c.template !== M.riconosciuto.template).map((c) => h('li', {}, `${c.template}: ${c.score}/100 (${c.esito === 'simile' ? 'stessa famiglia grafica' : 'poco simile'})`))) : null,
      h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;margin-top:6px' },
        h('a', { class: 'btn xs', href: `/api/cippi/docs/${id}/impronta`, title: 'Scarica l\'impronta: salvata in docs/MEMORIA/pptx/ fa riconoscere in futuro le presentazioni di questo tipo' }, icon('download'), `Scarica impronta (${M.nomeProposto || 'modello'})`)));
    async function comparePdf(a) {
      const r = await get(`/api/cippi/docs/${id}/appunti/pdf?${a.path && !a.path.startsWith(`${doc.folder}/Appunti/`) ? `path=${enc(a.path)}` : `name=${enc(a.name)}`}`);
      const c = r.confronto;
      const pageRow = (x) => h('tr', { class: x.slide ? (x.same ? 'ok' : 'warn') : 'danger' },
        h('td', {}, String(x.page)), h('td', {}, x.titlePdf || h('i', { class: 'muted' }, '—')),
        h('td', {}, x.slide ? h('button', { type: 'button', class: 'linklike', onclick: () => { m.close(); go(x.slide - 1); } }, `slide ${x.slide}`) : h('span', { class: 'chip danger' }, 'nessuna')),
        h('td', {}, x.slide ? `${Math.round(x.score * 100)}%` : ''),
        h('td', { class: 'small' }, x.slide && !x.same ? [x.soloPdf && x.soloPdf.length ? h('div', {}, h('b', {}, 'solo nel PDF: '), x.soloPdf.join(', ')) : null, x.soloSlide && x.soloSlide.length ? h('div', {}, h('b', {}, 'solo nella slide: '), x.soloSlide.join(', ')) : null] : (x.same ? 'uguale' : '')));
      const m = modal(`PDF e presentazione: ${r.name}`, h('div', {},
        h('p', { class: c.aligned ? 'ok' : 'warn' }, h('b', {}, c.verdict)),
        h('p', { class: 'small muted' }, `${c.pages} pagine nel PDF, ${c.slides} slide nella presentazione${r.info.producer ? ` · PDF creato con ${r.info.producer}` : ''}.`),
        c.slidesWithoutPage.length ? h('p', { class: 'small' }, h('b', {}, 'Slide senza pagina nel PDF: '), c.slidesWithoutPage.map((x) => `${x.slide}. ${x.title || KIND[x.kind] || x.kind}`).join(' · ')) : null,
        h('table', { class: 'cp-tbl cp-pdf' }, h('thead', {}, h('tr', {}, h('th', {}, 'Pagina'), h('th', {}, 'Titolo nel PDF'), h('th', {}, 'Slide'), h('th', {}, 'Uguale'), h('th', {}, 'Differenze'))), h('tbody', {}, c.pairs.map(pageRow))),
        h('details', { class: 'small' }, h('summary', {}, 'Testo del PDF, pagina per pagina'), r.pages.map((pg) => h('div', { class: 'cp-pdf-page' }, h('b', {}, `Pagina ${pg.n}`), h('pre', {}, pg.text))))), { wide: true });
    }
    // modello
    const modelSel = h('select', { 'aria-label': 'Confronta con un modello', onchange: async () => { if (!modelSel.value) return; try { const r = await get(`/api/cippi/docs/${id}?modello=${modelSel.value}`); doc.confronto = r.confronto; drawTools(); } catch (err) { toastError(err); } } },
      h('option', { value: '' }, '— scegli un modello —'));
    get('/api/cippi').then((d) => { for (const m of d.models.filter((x) => x.id !== doc.id)) modelSel.append(h('option', { value: String(m.id), selected: doc.confronto && doc.confronto.modello.id === m.id }, m.name)); }).catch(() => {});
    const conf = doc.confronto ? h('div', { class: 'cp-conf' },
      h('div', {}, h('b', {}, `${doc.confronto.percent}%`), ` completo rispetto a "${doc.confronto.modello.name}"`),
      doc.confronto.missingParts.length ? h('ul', {}, doc.confronto.missingParts.map((p) => h('li', {}, `Manca: ${KIND[p.kind] || p.kind}${p.title ? ` (${p.title})` : ''} · ${p.section}`))) : h('p', { class: 'small muted' }, 'Ci sono tutte le parti del modello.'),
      doc.confronto.missingSections.length ? h('p', { class: 'small' }, `Sezioni mancanti: ${doc.confronto.missingSections.join(', ')}`) : null) : null;

    tools.replaceChildren(
      h('div', { class: 'cp-seg', role: 'group', 'aria-label': 'Modalità' }, modeBtn('revisione', 'Revisione'), modeBtn('modifica', 'Modifica')),
      sec('Mostra', true, chk('blocks', 'Ordine di lettura e gerarchia', 'cippi.blocchi'), chk('flow', 'Step nuovi e modificati', 'cippi.stati'), chk('notes', 'Note dello speaker', 'cippi.note')),
      sec(`Struttura (${R.list.length} slide)`, true, struct),
      A.reading.length ? sec('Percorso di lettura', false, h('p', { class: 'small muted' }, 'Come si studia: contesto, legenda e sigle, mappa, poi ogni processo passo per passo confrontando To-Be e As-Is.'), reading) : null,
      sec(`Controlli (${A.checks.length})`, false, checks),
      sec(`Glossario (${A.glossary.length})`, false, gloss),
      sec(`Appunti (${doc.appunti.length + (doc.pdfCollegati || []).length})`, false, appunti),
      sec('Confronta con un modello', false, modelSel, conf),
      sec('Memoria dei modelli', false, memoria));
    const on = struct.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }

  // ---- VISIONE
  async function drawSlideInto(box, src, texts, { overlay = true } = {}) {
    const data = await slideData(src);
    const sInfo = A.slides[src - 1];
    const blocks = new Map((sInfo.blocks || []).map((b) => [String(b.id), b]));
    const nodes = new Map(((sInfo.flow && sInfo.flow.nodes) || []).map((n) => [String(n.id), n]));
    const slide = renderSlide(data, {
      media, texts,
      onShape: (s, node) => {
        if (!overlay) return;
        const b = blocks.get(String(s.id));
        if (R.show.blocks && b && sInfo.kind !== 'flusso') {
          node.classList.add('cp-block', `lv${Math.min(3, b.level)}`);
          node.append(h('span', { class: 'cp-badge', title: `${ROLE[b.role] || b.role} · livello ${b.level}` }, `${b.order}`));
        }
        const n = nodes.get(String(s.id));
        if (R.show.flow && n && n.status && n.status !== 'invariato') node.classList.add(`cp-st-${n.status}`);
        if (R.mode === 'modifica' && b) node.classList.add('cp-editable');
        if (b || n) node.addEventListener('click', () => focusBlock(String(s.id)));
      },
    });
    box.replaceChildren(slide);
  }
  async function drawView() {
    const x = R.list[R.cur];
    const s = info(R.cur);
    const cmp = cmpOf(x.src);
    const head = h('div', { class: 'cp-viewbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Slide precedente', title: 'Precedente (←)', disabled: R.cur === 0, onclick: () => go(R.cur - 1) }, icon('back')),
      h('div', { class: 'grow' },
        h('div', {}, h('b', {}, `Slide ${R.cur + 1} di ${R.list.length}`), ' · ', h('span', { class: `cp-kind k-${s.kind}` }, KIND[s.kind] || s.kind), s.hidden ? h('span', { class: 'chip warn' }, 'nascosta') : null),
        h('div', { class: 'small muted ellipsis' }, `${s.section}${s.layout ? ` · layout "${s.layout}"` : ''}`)),
      cmp && !R.compare ? h('button', { class: 'btn sm', type: 'button', onclick: () => { R.compare = cmp.toBe.includes(x.src) ? cmp.asIs[0] : cmp.toBe[0]; drawView(); } }, cmp.toBe.includes(x.src) ? 'Confronta con l\'As-Is' : 'Confronta con il To-Be') : null,
      R.compare ? h('button', { class: 'btn sm', type: 'button', onclick: () => { R.compare = null; drawView(); } }, 'Chiudi confronto') : null,
      h('button', { class: 'icon-btn flip', type: 'button', 'aria-label': 'Slide successiva', title: 'Successiva (→)', disabled: R.cur === R.list.length - 1, onclick: () => go(R.cur + 1) }, icon('back')));
    const main = h('div', { class: 'cp-stage' + (R.compare ? ' two' : '') });
    const a = h('div', { class: 'cp-frame' }, h('div', { class: 'cp-loading' }, 'Disegno la slide…'));
    main.append(a);
    let b = null;
    if (R.compare) {
      b = h('div', { class: 'cp-frame' });
      main.append(b);
    }
    const notes = R.show.notes && s.notes ? h('div', { class: 'cp-notes' }, h('b', {}, 'Note dello speaker: '), s.notes) : null;
    const diff = R.compare && cmp ? h('div', { class: 'cp-diff' },
      h('div', {}, h('b', {}, `${cmp.code} ${cmp.name}: To-Be contro As-Is`)),
      h('div', { class: 'cp-diff-cols' },
        h('div', {}, h('h4', {}, `Solo nel To-Be (${cmp.added.length})`), h('ul', {}, cmp.added.map((t) => h('li', { class: 'add' }, t)))),
        h('div', {}, h('h4', {}, `Solo nell'As-Is (${cmp.removed.length})`), h('ul', {}, cmp.removed.map((t) => h('li', { class: 'rem' }, t))))),
      cmp.lanesAdded.length || cmp.lanesRemoved.length ? h('p', { class: 'small' }, `Attori: ${cmp.lanesAdded.map((l) => `+ ${l}`).concat(cmp.lanesRemoved.map((l) => `− ${l}`)).join(' · ')}`) : null) : null;
    const strip = h('div', { class: 'cp-strip', 'aria-label': 'Miniature' }, R.list.map((y, i) => h('button', { type: 'button', class: 'cp-mini' + (i === R.cur ? ' on' : ''), 'data-i': i, 'data-src': y.src, title: `${i + 1}. ${A.slides[y.src - 1].title || KIND[A.slides[y.src - 1].kind]}`, onclick: () => go(i) }, h('span', {}, String(i + 1)))));
    view.replaceChildren(head, main, diff, notes, strip);
    await drawSlideInto(a, x.src, x.texts);
    if (b) await drawSlideInto(b, R.compare, null);
    // miniature disegnate solo quando si vedono
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const i = Number(e.target.dataset.i);
        slideData(R.list[i].src).then((d) => { e.target.prepend(renderSlide(d, { media, texts: R.list[i].texts })); }).catch(() => {});
      }
    }, { root: strip, rootMargin: '300px' });
    strip.querySelectorAll('.cp-mini').forEach((m) => io.observe(m));
    const on = strip.querySelector('.on');
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  // ---- PUNTI CHIAVE + struttura della slide
  function focusBlock(sid) {
    R.panel = R.panel === 'visione' && innerWidth < 900 ? 'punti' : R.panel;
    layout();
    const row = pts.querySelector(`[data-block="${sid}"]`);
    if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1200); const t = row.querySelector('textarea'); if (t) t.focus(); }
  }
  const toLines = (txt) => txt.split('\n').map((l) => { const m = /^(\s*)(.*)$/.exec(l); return { text: m[2], lvl: Math.floor(m[1].replace(/\t/g, '  ').length / 2) }; });
  const fromParas = (ps) => (ps || []).map((p) => `${'  '.repeat(p.lvl || 0)}${p.text}`).join('\n');
  function drawPoints() {
    const x = R.list[R.cur];
    const s = info(R.cur);
    const here = doc.points.filter((p) => (R.scope === 'tutti' ? true : p.slide === x.src));
    const addKind = h('select', { name: 'kind', 'aria-label': 'Tipo' }, Object.entries(POINT).map(([k, v]) => h('option', { value: k }, v)));
    const addText = h('input', { type: 'text', name: 'text', maxlength: '2000', placeholder: 'Aggiungi un punto, una nota, una domanda…', 'aria-label': 'Testo del punto' });
    const addForm = doc.canEdit ? h('form', { class: 'cp-add', onsubmit: async (e) => {
      e.preventDefault();
      if (!addText.value.trim()) return;
      try {
        const r = await post(`/api/cippi/docs/${id}/points`, { slide: x.src, kind: addKind.value, text: addText.value });
        doc.points.push({ id: r.id, slide: x.src, kind: addKind.value, text: addText.value, status: 'aperto', auto: false, author: state.user.name });
        drawPoints();
      } catch (err) { toastError(err); }
    } }, addKind, addText, h('button', { class: 'btn sm primary', type: 'submit' }, icon('plus'))) : null;
    const pointRow = (p) => h('li', { class: `cp-pt k-${p.kind}` + (p.status === 'fatto' ? ' done' : '') },
      h('input', { type: 'checkbox', checked: p.status === 'fatto', disabled: !doc.canEdit, title: 'Fatto', 'aria-label': 'Fatto',
        onchange: async (e) => { try { await patch(`/api/cippi/points/${p.id}`, { status: e.target.checked ? 'fatto' : 'aperto' }); p.status = e.target.checked ? 'fatto' : 'aperto'; drawPoints(); } catch (err) { toastError(err); } } }),
      h('div', { class: 'grow' },
        h('span', { class: 'chip' + (p.kind === 'domanda' || p.kind === 'da-fare' ? ' warn' : '') }, POINT[p.kind] || p.kind),
        R.scope === 'tutti' && p.slide ? h('button', { type: 'button', class: 'linklike small', onclick: () => { const i = posOfSrc(p.slide); if (i >= 0) go(i); } }, ` slide ${posOfSrc(p.slide) + 1 || '–'}`) : null,
        h('div', { class: 'cp-pt-text' }, p.text),
        h('div', { class: 'small muted' }, p.auto ? 'proposto da Cippi' : p.author)),
      doc.canEdit ? h('button', { class: 'icon-btn', type: 'button', title: 'Elimina', 'aria-label': 'Elimina', onclick: async () => { try { await del(`/api/cippi/points/${p.id}`); doc.points = doc.points.filter((y) => y !== p); drawPoints(); } catch (err) { toastError(err); } } }, icon('close')) : null);

    // struttura dei blocchi (in Modifica: testi correggibili)
    const blocks = (s.blocks || []).filter((b) => b.role !== 'navigazione');
    const blockRow = (b) => {
      const editable = R.mode === 'modifica' && doc.canEdit && b.paragraphs && b.id;
      const current = x.texts && x.texts[b.id] ? fromParas(x.texts[b.id].map((l) => (typeof l === 'string' ? { text: l } : l))) : fromParas(b.paragraphs);
      return h('li', { class: `cp-blk lv${Math.min(3, b.level)}`, 'data-block': String(b.id) },
        h('div', { class: 'row', style: 'gap:6px' }, h('span', { class: 'cp-badge static' }, String(b.order)), h('span', { class: 'chip' }, ROLE[b.role] || b.role), h('span', { class: 'small muted' }, `livello ${b.level}`),
          x.texts && x.texts[b.id] ? h('button', { type: 'button', class: 'linklike small', onclick: () => { delete x.texts[b.id]; save(); drawView(); drawPoints(); } }, 'ripristina') : null),
        editable ? h('textarea', { rows: String(Math.min(10, Math.max(1, current.split('\n').length))), 'aria-label': `Testo del blocco ${b.order}`, oninput: (e) => { x.texts[b.id] = toLines(e.target.value); save(); drawView(); } }, current)
          : b.role === 'tabella' ? h('div', { class: 'small cp-blk-text' }, (b.rows || []).slice(0, 8).map((r) => h('div', {}, r.join(' · '))))
            : h('div', { class: 'cp-blk-text' }, (b.paragraphs || [{ text: b.text }]).map((p) => h('div', { style: `padding-left:${(p.lvl || 0) * 14}px` + (p.bold ? ';font-weight:600' : '') }, (p.lvl ? '• ' : '') + p.text))));
    };
    const flow = s.flow ? (() => {
      const f = s.flow;
      const byId = new Map(f.nodes.map((n) => [n.id, n]));
      const steps = f.nodes.filter((n) => n.type === 'step' || n.type === 'decisione');
      const pr = procOf(x.src);
      const links = doc.celle.filter((c) => pr && c.code === pr.code && c.name === pr.name);
      return h('div', { class: 'cp-flow' },
        pr ? h('div', { class: 'small' }, h('b', {}, `${pr.variant || ''} ${pr.code || ''} ${pr.name}`), pr.parts > 1 ? ` · ${pr.slides.length} parti` : '') : null,
        links.map((l) => h('a', { class: 'btn xs', href: `/celle/#/celle?mappa=${l.mapId}&voce=${l.nodeId}`, target: '_blank', rel: 'noopener' }, icon('tree'), `In GestioneCelle: ${l.map}`)),
        f.lanes.length ? h('div', { class: 'small' }, h('b', {}, 'Attori: '), f.lanes.map((l) => l.name).join(' · ')) : null,
        h('ol', { class: 'cp-steps' }, steps.map((n) => h('li', { 'data-block': String(n.id), class: `st-${n.status || 'invariato'}` },
          h('div', {}, h('b', {}, n.text), n.status && n.status !== 'invariato' ? h('span', { class: 'chip ' + (n.status === 'nuovo' ? 'ok' : 'warn') }, n.status) : null),
          h('div', { class: 'small muted' }, [n.lane, (n.systems || []).join(', ')].filter(Boolean).join(' · ')),
          n.type === 'decisione' ? h('div', { class: 'small' }, f.edges.filter((e) => e.from === n.id).map((e) => h('div', {}, `${e.label || '→'} ${(byId.get(e.to) || {}).text || ''}`))) : null))),
        f.nodes.filter((n) => n.type === 'rimando').length ? h('div', { class: 'small' }, h('b', {}, 'Rimanda a: '), f.nodes.filter((n) => n.type === 'rimando').map((n) => {
          const target = A.processes.find((p) => p.code === n.code && p.variant === (pr && pr.variant));
          const i = target ? posOfSrc(target.slides[0]) : -1;
          return i >= 0 ? h('button', { type: 'button', class: 'linklike', onclick: () => go(i) }, `${n.text} `) : h('span', { class: 'muted' }, `${n.text} `);
        })) : null,
        f.nodes.filter((n) => n.type === 'nota').map((n) => h('div', { class: 'cp-note', 'data-block': String(n.id) }, n.text)));
    })() : null;

    const pointsPart = [
      h('div', { class: 'cp-pts-head' }, h('h2', {}, 'Punti chiave'),
        h('div', { class: 'cp-seg small' },
          h('button', { type: 'button', class: R.scope === 'slide' ? 'on' : '', onclick: () => { R.scope = 'slide'; drawPoints(); } }, 'Questa slide'),
          h('button', { type: 'button', class: R.scope === 'tutti' ? 'on' : '', onclick: () => { R.scope = 'tutti'; drawPoints(); } }, `Tutti (${doc.points.length})`))),
      addForm,
      h('ul', { class: 'cp-pts' }, here.length ? here.map(pointRow) : h('li', { class: 'muted small' }, R.scope === 'slide' ? 'Nessun punto su questa slide.' : 'Nessun punto.')),
    ];
    // tabella disegnata con le forme: letta come tabella vera (intestazione, righe, intestazioni di riga)
    const table = s.table ? h('div', { class: 'cp-tblwrap' }, h('table', { class: 'cp-tbl' },
      h('thead', {}, h('tr', {}, s.table.rowHeaders.some(Boolean) ? h('th', {}) : null, s.table.header.map((c) => h('th', {}, c)))),
      h('tbody', {}, s.table.rows.map((r, i) => h('tr', {}, s.table.rowHeaders.some(Boolean) ? h('th', {}, s.table.rowHeaders[i + 1] || '') : null, r.map((c) => h('td', {}, c))))))) : null;
    const structPart = [
      h('h3', { class: 'cp-h3' }, R.mode === 'modifica' ? 'Testi della slide (modifica)' : 'Struttura della slide'),
      R.mode === 'modifica' ? h('p', { class: 'small muted' }, 'Una riga per paragrafo; due spazi all\'inizio = un livello di elenco più in basso. Le modifiche si salvano da sole e finiscono nel .pptx.') : null,
      flow,
      table,
      blocks.length && !(s.kind === 'flusso' && R.mode !== 'modifica') ? h('ol', { class: 'cp-blocks' }, blocks.map(blockRow)) : (s.kind === 'flusso' ? null : h('p', { class: 'muted small' }, 'Nessun blocco di testo.')),
      R.mode === 'modifica' && doc.canEdit ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Nota sulla slide (resta in Cippi)'),
        h('textarea', { rows: '2', maxlength: '2000', oninput: (e) => { x.note = e.target.value; save(); } }, x.note || '')) : (x.note ? h('div', { class: 'cp-note' }, x.note) : null),
    ];
    // in Modifica prima i testi da correggere, in Revisione prima i punti chiave
    pts.replaceChildren(...(R.mode === 'modifica' ? [...structPart, ...pointsPart] : [...pointsPart, ...structPart]));
  }

  function drawAll() { drawTools(); drawView().catch(toastError); drawPoints(); }
  drawAll();
  // frecce della tastiera per scorrere le slide
  const onKey = (e) => {
    if (!document.body.contains(shell)) return document.removeEventListener('keydown', onKey);
    if (/input|textarea|select/i.test(document.activeElement.tagName) || document.querySelector('.modal-back')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(R.cur + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(R.cur - 1); }
  };
  document.addEventListener('keydown', onKey);
}

// ---- Avvio e navigazione ---------------------------------------------------------------------------
async function route() {
  const m = /^#\/doc\/(\d+)(?:\?s=(\d+))?/.exec(location.hash);
  try {
    if (m) await viewDoc(Number(m[1]), Number(m[2]) || 1);
    else await viewLibrary();
  } catch (err) {
    if (err.status === 401) return location.reload();
    root.replaceChildren(h('div', { class: 'main app-window' }, topbar(), h('div', { class: 'card glass' }, h('h2', {}, 'Qualcosa non ha funzionato'), h('p', { class: 'muted' }, err.message), h('a', { class: 'btn', href: '#/' }, 'Torna ai documenti'))));
  }
}
let lastRoute = '';
window.addEventListener('hashchange', () => {
  // dentro un documento il numero della slide cambia senza ridisegnare tutto
  const key = location.hash.replace(/\?.*$/, '');
  if (key === lastRoute) return;
  lastRoute = key;
  route();
});

async function start() {
  const [st, cat] = await Promise.all([get('/api/state'), get('/api/catalogo').catch(() => ({ apps: [] }))]);
  state = st;
  me = (cat.apps || []).find((a) => a.id === 'cippi') || null;
  if (!state.user || state.user.mustChange) {
    root.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'card glass', style: 'max-width:420px;margin:12vh auto;text-align:center' },
      h('img', { src: '/catalogo/cippi/icon.svg', alt: '', style: 'width:64px;height:64px' }),
      h('h1', { style: 'margin:12px 0 6px' }, 'Cippi'),
      h('p', { class: 'muted' }, 'Accedi al portale con il tuo account, poi riapri questa finestra.'),
      h('a', { class: 'btn primary', href: '/' }, 'Accedi al portale'))));
    return;
  }
  lastRoute = location.hash.replace(/\?.*$/, '');
  await route();
}
start().catch(toastError);
