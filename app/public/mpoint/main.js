// MPoint: presentazioni del team. Schermata iniziale (file recenti, cartelle dei progetti, modelli), cartella di un
// progetto (documenti e PowerPoint nella cartella, da importare con un clic) e modalita' Revisione:
//   pannello STRUMENTI  (modalita', cosa mostrare, struttura per sezioni, percorso di lettura, controlli, glossario,
//                        appunti, confronto con un modello)
//   pannello VISIONE    (la slide disegnata, ordine di lettura e gerarchia dei blocchi, stato degli step, confronto
//                        To-Be / As-Is affiancato, striscia delle miniature)
//   pannello PUNTI CHIAVE (punti e domande della revisione, struttura della slide, dettaglio del flusso; in Modifica
//                        i testi dei blocchi si correggono qui)
// Creazione da zero, da un modello, importazione da PC o dalla cartella del progetto; esportazione in .pptx.
import { get, post, patch, del, upload, api } from '/js/api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtDate, fmtBytes } from '/js/ui.js';
import { renderSlide } from '/mpoint/render.js';
import { portalMenu } from '/js/menu-app.js';

const root = document.getElementById('app');
const enc = encodeURIComponent;
const nkey = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const KIND = {
  copertina: 'Copertina', titolo: 'Titolo', indice: 'Indice', divisore: 'Divisore di sezione', testo: 'Testo', legenda: 'Legenda',
  flusso: 'Flusso', mappa: 'Mappa dei processi', scheda: 'Scheda', tabella: 'Tabella', schema: 'Schema', chiusura: 'Chiusura', immagine: 'Immagine',
  masterplan: 'Masterplan',
};
const ROLE = { titolo: 'Titolo', sottotitolo: 'Sottotitolo', intestazione: 'Intestazione', paragrafo: 'Paragrafo', elenco: 'Elenco', tabella: 'Tabella', immagine: 'Immagine', nota: 'Nota', etichetta: 'Etichetta', schema: 'Schema', navigazione: 'Navigazione' };
const POINT = { chiave: 'Punto chiave', nota: 'Nota', domanda: 'Domanda', 'da-fare': 'Da fare' };
const STATUS = ['bozza', 'in revisione', 'approvato'];
let state = null; // /api/state
let me = null; // scheda MPoint nel catalogo

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

// Il bottone in alto a sinistra richiama il menu del portale (per tornarci o cambiare schermata): uno solo per pagina
let menuBtn = null;
const menuButton = () => { if (!menuBtn) menuBtn = portalMenu(state, { appName: 'MPoint', appIcon: '/catalogo/mpoint/icon.svg' }); return menuBtn; };
function topbar(...middle) {
  return h('header', { class: 'cp-top' },
    menuButton(),
    h('a', { href: '#/', class: 'app-brand', title: 'Inizio: file recenti e cartelle dei progetti' },
      h('img', { src: '/catalogo/mpoint/icon.svg', alt: '' }), h('strong', {}, 'MPoint'), me ? h('span', { class: 'chip' }, `v${me.version}`) : null),
    ...middle,
    h('div', { class: 'spacer' }),
    themeBtn());
}

// ---- Finestre comuni: importa, crea da zero, nuovo da modello -----------------------------------------
// Servono alla schermata iniziale e alla cartella di un progetto (dove il progetto e' gia' scelto).
function dialogs(d, presetProject = null) {
  const projectSelect = (name = 'projectId') => h('select', { name }, d.projects.map((p) => h('option', { value: String(p.id), selected: presetProject === p.id }, p.name)));
  const needProject = () => { if (!d.projects.length) { toastError(new Error('Non fai parte di nessun progetto: un documento appartiene sempre a un progetto.')); return true; } return false; };

  const importDialog = () => {
    if (needProject()) return;
    const file = h('input', { type: 'file', name: 'file', accept: '.pptx' });
    const fromProject = h('select', { name: 'path' }, h('option', { value: '' }, '— oppure scegli un file già nella cartella del progetto —'));
    const proj = projectSelect();
    const loadFiles = async () => {
      fromProject.replaceChildren(h('option', { value: '' }, '— oppure scegli un file già nella cartella del progetto —'));
      try { for (const f of await get(`/api/cippi/file-progetto?projectId=${proj.value}`)) if (!f.docId) fromProject.append(h('option', { value: f.path }, f.path)); } catch { /* niente */ }
    };
    proj.addEventListener('change', loadFiles);
    loadFiles();
    const bar = h('div', { class: 'small muted' });
    const m = modal('Importa una presentazione', form([
      field('Progetto', proj, 'Il documento lo vedono le persone del progetto. Il file viene copiato nella cartella del progetto (sottocartella Cippi/).'),
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
  // i tre pulsanti in alto a destra
  const buttons = () => h('div', { class: 'row', style: 'flex-wrap:wrap' },
    h('button', { class: 'btn primary', type: 'button', onclick: importDialog }, icon('upload'), 'Importa PowerPoint'),
    h('button', { class: 'btn', type: 'button', onclick: newBlank }, icon('plus'), 'Crea da zero'),
    h('button', { class: 'btn', type: 'button', onclick: () => fromModel().catch(toastError) }, icon('copy'), 'Nuovo da modello'));
  return { importDialog, newBlank, fromModel, buttons };
}

// Scheda di un documento o di un modello (anteprima della prima slide, stato, numeri). "when" e' la riga in basso.
function docCard(x, D, when) {
  return h('a', { class: 'cp-card glass', href: `#/doc/${x.id}`, 'data-doc': x.id },
    h('div', { class: 'cp-thumb', 'data-thumb': x.id }, h('span', { class: 'muted small' }, x.slides + ' slide')),
    h('div', { class: 'cp-card-body' },
      h('h3', {}, x.name),
      h('div', { class: 'small muted' }, `${x.project} · ${x.author || ''}`),
      h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        x.kind === 'modello' ? h('span', { class: 'chip' }, `${x.parts} parti`) : h('span', { class: 'chip' + (x.status === 'approvato' ? ' ok' : x.status === 'in revisione' ? ' warn' : '') }, x.status),
        h('span', { class: 'chip' }, `${x.slides} slide`),
        x.counts.flusso ? h('span', { class: 'chip' }, `${x.counts.flusso} flussi`) : null,
        x.score !== null ? h('span', { class: 'chip' + (x.score >= 85 ? ' ok' : x.score >= 60 ? ' warn' : ' danger'), title: 'Completezza e coerenza (controlli di MPoint)' }, `${x.score}%`) : null,
        x.points ? h('span', { class: 'chip warn', title: 'Domande e cose da fare aperte' }, `${x.points} aperti`) : null,
        x.shared ? h('span', { class: 'chip ok' }, 'condiviso') : null),
      h('div', { class: 'small muted' }, when || `v${x.version} · aggiornato ${fmtDate(x.updatedAt)}`),
      x.kind === 'modello' ? h('div', { class: 'row' }, h('button', { class: 'btn sm primary', type: 'button', onclick: (e) => { e.preventDefault(); D.fromModel(x).catch(toastError); } }, icon('plus'), 'Usa il modello')) : null));
}
const grid = (list, D, when) => h('div', { class: 'cp-grid' }, list.map((x) => docCard(x, D, when && when(x))));
const empty = (text) => h('div', { class: 'card glass empty' }, text);
// Una sezione della schermata iniziale: icona, titolo, quanti, eventuale azione a destra
const section = (id, title, ic, count, body, extra) => h('section', { class: 'cp-home-sec', 'data-sec': id },
  h('div', { class: 'cp-home-head' }, icon(ic), h('h2', {}, title), count != null ? h('span', { class: 'chip' }, String(count)) : null, h('span', { class: 'spacer' }), extra || null),
  body);
const STATUS_LABEL = { attivo: 'attivo', 'in-pausa': 'in pausa', chiuso: 'chiuso' };

// ---- Schermata iniziale: prima i file recenti, poi le cartelle dei progetti, poi i modelli -----------------------
async function viewLibrary() {
  const d = await get('/api/cippi');
  const D = dialogs(d);
  const all = [...d.docs, ...d.models];
  const byId = new Map(all.map((x) => [x.id, x]));
  // Recenti: quelli aperti dalla persona (ultimi per primi); se sono pochi, gli ultimi documenti aggiornati nel team
  const recent = d.recent.filter((r) => byId.has(r.id)).map((r) => ({ ...byId.get(r.id), openedAt: r.openedAt }));
  const ids = new Set(recent.map((x) => x.id));
  for (const x of d.docs) { if (recent.length >= 8) break; if (!ids.has(x.id)) { recent.push(x); ids.add(x.id); } }
  const whenRecent = (x) => (x.openedAt ? `aperto da te ${fmtDate(x.openedAt)}` : `aggiornato ${fmtDate(x.updatedAt)}`);

  const folderCard = (p) => h('a', { class: 'cp-folder', href: `#/progetto/${p.id}`, 'data-project': p.id },
    h('div', { class: 'cp-folder-icon', 'aria-hidden': 'true' }, icon('folder')),
    h('div', { class: 'cp-folder-body' },
      h('h3', {}, p.name),
      h('div', { class: 'small muted ellipsis' }, p.client || 'Cartella del progetto'),
      h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        h('span', { class: 'chip' }, `${p.docs} ${p.docs === 1 ? 'documento' : 'documenti'}`),
        p.models ? h('span', { class: 'chip' }, `${p.models} ${p.models === 1 ? 'modello' : 'modelli'}`) : null,
        p.daImportare ? h('span', { class: 'chip warn', title: 'PowerPoint nella cartella del progetto non ancora aperti in MPoint' }, `${p.daImportare} da importare`) : null,
        p.status !== 'attivo' ? h('span', { class: 'chip' }, STATUS_LABEL[p.status] || p.status) : null),
      h('div', { class: 'small muted' }, `aggiornato ${fmtDate(p.updatedAt)}`)));

  const body = h('div', {});
  const draw = (q) => {
    const k = nkey(q);
    if (k) {
      const hit = all.filter((x) => nkey(`${x.name} ${x.project} ${x.author}`).includes(k));
      body.replaceChildren(section('risultati', 'Risultati', 'search', hit.length, hit.length ? grid(hit, D) : empty(`Nessun documento o modello per "${q}".`)));
    } else {
      body.replaceChildren(
        section('recenti', 'Recenti', 'clock', recent.length, recent.length ? grid(recent.slice(0, 8), D, whenRecent)
          : empty('Nessun file ancora. Importa una presentazione PowerPoint, creane una da zero oppure apri una cartella di progetto qui sotto.')),
        section('progetti', 'Cartelle dei progetti', 'folder', d.projects.length, d.projects.length ? h('div', { class: 'cp-folders' }, d.projects.map(folderCard))
          : empty('Non fai parte di nessun progetto: chiedi a un Manager di aggiungerti.')),
        d.models.length ? section('modelli', 'Modelli', 'copy', d.models.length, grid(d.models, D)) : null);
    }
    thumbs(body);
  };
  const search = h('input', { type: 'search', class: 'cp-search', placeholder: 'Cerca un documento o un modello…', 'aria-label': 'Cerca', oninput: () => draw(search.value) });
  root.replaceChildren(h('div', { class: 'main app-window cp-lib' },
    topbar(),
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'MPoint'), h('p', { class: 'muted' }, 'Le presentazioni del team: MPoint le legge (sezioni, blocchi in ordine, gerarchia, flussi, legenda, sigle), propone i punti chiave e i controlli, e le rifà da un modello.')),
      h('div', { class: 'cp-head-actions' }, search, D.buttons())),
    body));
  draw('');
}

// ---- Cartella di un progetto: i suoi documenti, i PowerPoint nella cartella (da importare con un clic), i modelli ----
async function viewProject(pid) {
  const d = await get('/api/cippi');
  const p = d.projects.find((x) => x.id === pid);
  if (!p) throw new Error('Progetto non trovato, oppure non ne fai parte.');
  const files = await get(`/api/cippi/file-progetto?projectId=${pid}`);
  const D = dialogs(d, pid);
  const docs = d.docs.filter((x) => x.projectId === pid);
  const models = d.models.filter((x) => x.projectId === pid);
  const toImport = files.filter((f) => !f.docId);
  const importFile = async (f, btn) => {
    btn.disabled = true; btn.textContent = 'Analisi…';
    try { const r = await post('/api/cippi/import-progetto', { projectId: pid, path: f.path }); location.hash = `#/doc/${r.id}`; } catch (e) { btn.disabled = false; btn.textContent = 'Importa e analizza'; toastError(e); }
  };
  const fileRow = (f) => {
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
    const btn = h('button', { class: 'btn sm primary', type: 'button' }, icon('upload'), 'Importa e analizza');
    btn.onclick = () => importFile(f, btn);
    return h('div', { class: 'cp-file', 'data-file': f.path },
      icon('file'),
      h('div', { class: 'grow' },
        h('div', { class: 'ellipsis' }, f.name),
        h('div', { class: 'small muted ellipsis' }, `${dir ? dir + ' · ' : ''}${fmtBytes(f.size)} · ${fmtDate(f.updatedAt)}`)),
      f.docId ? h('a', { class: 'btn sm', href: `#/doc/${f.docId}` }, icon('play'), 'Apri in MPoint') : btn,
      h('a', { class: 'icon-btn', title: 'Scarica il file', 'aria-label': `Scarica ${f.name}`, href: `/api/explorer/p${pid}/download?path=${enc(f.path)}` }, icon('download')));
  };
  const explorerHref = `/#/esplora?${new URLSearchParams({ spazio: `p${pid}`, ...(docs.length ? { percorso: 'Cippi' } : {}) })}`;
  const sub = [p.client, p.status !== 'attivo' ? `progetto ${STATUS_LABEL[p.status] || p.status}` : ''].filter(Boolean).join(' · ') || 'Cartella del progetto';
  root.replaceChildren(h('div', { class: 'main app-window cp-lib' },
    topbar(h('nav', { class: 'cp-crumb', 'aria-label': 'Percorso' }, h('a', { href: '#/' }, 'Inizio'), h('span', { class: 'muted' }, '›'), h('strong', {}, p.name))),
    h('div', { class: 'page-head' },
      h('div', {}, h('h1', { class: 'cp-h1' }, h('span', { class: 'cp-folder-icon sm', 'aria-hidden': 'true' }, icon('folder')), p.name), h('p', { class: 'muted' }, sub)),
      h('div', { class: 'cp-head-actions' }, D.buttons(),
        h('a', { class: 'btn', href: explorerHref, title: 'La cartella del progetto nel portale' }, icon('external'), 'Apri in Esplora file'))),
    section('documenti', 'Documenti', 'note', docs.length, docs.length ? grid(docs, D) : empty('Nessun documento in questo progetto. Importa un PowerPoint, creane uno da zero oppure scegli un file qui sotto.')),
    section('file', 'PowerPoint nella cartella del progetto', 'file', files.length,
      files.length ? h('div', { class: 'cp-files' }, files.map(fileRow)) : empty('Nessun file .pptx nella cartella del progetto. Chi carica un PowerPoint in Esplora file lo trova qui, pronto da importare.'),
      toImport.length ? h('span', { class: 'chip warn' }, `${toImport.length} da importare`) : null),
    models.length ? section('modelli', 'Modelli del progetto', 'copy', models.length, grid(models, D)) : null));
  thumbs(root);
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
    list: doc.list.map((x) => ({ ...x, texts: { ...(x.texts || {}) }, geom: { ...(x.geom || {}) }, fill: { ...(x.fill || {}) }, cells: { ...(x.cells || {}) }, tableRows: { ...(x.tableRows || {}) } })), cur: Math.min(Math.max(0, (startAt || 1) - 1), doc.list.length - 1),
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
        const has = (o) => o && Object.keys(o).length;
        const r = await patch(`/api/cippi/docs/${id}`, { slides: R.list.map(({ src, texts, note, geom, fill, cells, tableRows }) => ({ src, ...(has(texts) ? { texts } : {}), ...(has(geom) ? { geom } : {}), ...(has(fill) ? { fill } : {}), ...(has(cells) ? { cells } : {}), ...(has(tableRows) ? { tableRows } : {}), ...(note ? { note } : {}) })), updatedAt: R.updatedAt });
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
    savedMark,
    h('a', { class: 'btn sm', href: `/api/cippi/docs/${id}/download`, title: 'Scarica il .pptx con le modifiche' }, icon('download'), 'Scarica'),
    doc.kind === 'documento' && doc.canEdit ? h('button', { class: 'btn sm', type: 'button', title: 'Salva il .pptx nella cartella del progetto e rianalizza', onclick: saveVersion }, icon('history'), 'Salva versione') : null,
    doc.canEdit ? h('button', { class: 'btn sm', type: 'button', title: 'Cerca un testo in tutte le slide (anche nelle tabelle e nel piè di pagina) e sostituiscilo', onclick: findReplace }, 'Trova e sostituisci') : null,
    doc.kind === 'documento' ? h('button', { class: 'btn sm', type: 'button', onclick: saveAsModel }, icon('copy'), 'Salva come modello') : null,
    doc.kind === 'modello' && doc.canManage ? h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: doc.shared, onchange: async (e) => { try { await patch(`/api/cippi/docs/${id}`, { shared: e.target.checked }); toast(e.target.checked ? 'Modello condiviso con tutto il team.' : 'Modello visibile solo nel progetto.'); } catch (err) { toastError(err); } } }), ' Condiviso con tutti') : null,
    doc.canManage ? h('button', { class: 'icon-btn', type: 'button', title: 'Elimina', 'aria-label': 'Elimina', onclick: () => confirmDialog(`Eliminare "${doc.name}"?`, 'Il documento sparisce da MPoint. I file nella cartella del progetto restano.', 'Elimina', async () => { await del(`/api/cippi/docs/${id}`); location.hash = '#/'; }) }, icon('trash')) : null);

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

  // trova e sostituisci in tutto il documento: nelle slide diventa una modifica dei testi, nel layout una regola
  function findReplace() {
    const m = modal('Trova e sostituisci', form([
      h('p', { class: 'muted' }, 'Cerca in tutte le slide, testi e tabelle comprese. Con "anche piè di pagina e layout" cambia pure le scritte fisse del modello, per esempio "Kick-off Progetto X" in fondo a ogni slide.'),
      field('Trova', h('input', { type: 'text', name: 'find', required: true, maxlength: '200' })),
      field('Sostituisci con', h('input', { type: 'text', name: 'replace', maxlength: '500' })),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'matchCase' }), ' Maiuscole e minuscole uguali'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'whole' }), ' Solo parola intera'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'layouts', checked: true }), ' Anche piè di pagina e layout'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Sostituisci')),
    ], async (v) => {
      clearTimeout(R.saving);
      const r = await post(`/api/cippi/docs/${id}/sostituisci`, { find: v.find, replace: v.replace || '', matchCase: !!v.matchCase, whole: !!v.whole, layouts: !!v.layouts });
      m.close();
      toast(r.count || r.layoutCount ? `${r.count} sostituzioni nelle slide${r.layoutCount ? `, ${r.layoutCount} nel layout` : ''}.` : 'Testo non trovato.');
      if (r.count || r.layoutCount) await viewDoc(id, R.cur + 1);
    }));
  }

  // ---- tre pannelli
  const tools = h('aside', { class: 'cp-panel cp-tools', 'aria-label': 'Pannello strumenti' });
  const view = h('main', { class: 'cp-panel cp-view', 'aria-label': 'Pannello visione' });
  const desc = h('aside', { class: 'cp-panel cp-points', 'aria-label': 'Descrizione della slide' });
  const tabs = h('div', { class: 'cp-tabs' }, ['strumenti', 'visione', 'punti'].map((t) => h('button', { type: 'button', 'data-p': t, onclick: () => { R.panel = t; layout(); } }, { strumenti: 'Strumenti', visione: 'Visione', punti: 'Descrizione' }[t])));
  const shell = h('div', { class: 'cp-review' }, tools, view, desc);
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
      const edited = (x.texts && Object.keys(x.texts).length) || (x.cells && Object.keys(x.cells).length) || (x.tableRows && Object.keys(x.tableRows).length) || (x.geom && Object.keys(x.geom).length) || (x.fill && Object.keys(x.fill).length);
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
    const appunti = h('div', {},
      h('p', { class: 'small muted' }, 'Gli appunti di studio (PDF, Word, immagini) stanno accanto al documento, nella cartella del progetto.'),
      h('ul', { class: 'cp-files' }, doc.appunti.map((a) => h('li', {}, h('a', { href: a.url, target: '_blank', rel: 'noopener' }, icon('file'), a.name)))),
      doc.canEdit ? h('button', { class: 'btn sm', type: 'button', onclick: () => notesInput.click() }, icon('upload'), 'Aggiungi appunti') : null, notesInput);
    // modello
    const modelSel = h('select', { 'aria-label': 'Confronta con un modello', onchange: async () => { if (!modelSel.value) return; try { const r = await get(`/api/cippi/docs/${id}?modello=${modelSel.value}`); doc.confronto = r.confronto; drawTools(); } catch (err) { toastError(err); } } },
      h('option', { value: '' }, '— scegli un modello —'));
    get('/api/cippi').then((d) => { for (const m of d.models.filter((x) => x.id !== doc.id)) modelSel.append(h('option', { value: String(m.id), selected: doc.confronto && doc.confronto.modello.id === m.id }, m.name)); }).catch(() => {});
    const conf = doc.confronto ? h('div', { class: 'cp-conf' },
      h('div', {}, h('b', {}, `${doc.confronto.percent}%`), ` completo rispetto a "${doc.confronto.modello.name}"`),
      doc.confronto.missingParts.length ? h('ul', {}, doc.confronto.missingParts.map((p) => h('li', {}, `Manca: ${KIND[p.kind] || p.kind}${p.title ? ` (${p.title})` : ''} · ${p.section}`))) : h('p', { class: 'small muted' }, 'Ci sono tutte le parti del modello.'),
      doc.confronto.missingSections.length ? h('p', { class: 'small' }, `Sezioni mancanti: ${doc.confronto.missingSections.join(', ')}`) : null) : null;

    // il documento: autori, azienda, revisioni, caratteri, modelli noti che gli somigliano
    const M = A.meta || {};
    const others = (A.fontsUsed || []).filter((f) => A.fonts && f.name !== A.fonts.major && f.name !== A.fonts.minor);
    const sim = (doc.impronta && doc.impronta.somiglianze) || [];
    const docInfo = h('div', { class: 'cp-doc small' },
      h('div', {}, h('b', {}, 'Autore: '), M.author || '—', M.modifiedBy && M.modifiedBy !== M.author ? ` · ultima modifica di ${M.modifiedBy}` : ''),
      M.authors && M.authors.length ? h('div', {}, h('b', {}, 'Co-autori: '), M.authors.join(', ')) : null,
      M.company ? h('div', {}, h('b', {}, 'Azienda: '), M.company) : null,
      M.modified ? h('div', {}, h('b', {}, 'Modificato: '), fmtDate(M.modified), M.words ? ` · ${M.words} parole` : '') : null,
      M.lastChanges && M.lastChanges.length ? h('div', {}, h('b', {}, 'Ultime modifiche: '), M.lastChanges.slice(-6).map((c) => `slide ${posOfSrc(c.slide) + 1 || c.slide} (${c.by}, ${fmtDate(c.at)})`).join(' · ')) : null,
      A.fonts && (A.fonts.major || A.fonts.minor) ? h('div', {}, h('b', {}, 'Caratteri: '), [A.fonts.major, A.fonts.minor].filter((f, i, arr) => f && arr.indexOf(f) === i).join(' / '), others.length ? ` · altri: ${others.map((f) => f.name).join(', ')}` : '') : null,
      A.nativeSections ? h('div', { class: 'muted' }, 'Le sezioni sono quelle di PowerPoint.') : null,
      sim.length ? h('div', { class: 'cp-sim' }, h('b', {}, 'Somiglia a: '), h('ul', {}, sim.map((x) => h('li', {}, `${x.nome} (${x.punteggio}%)`, h('span', { class: 'muted' }, ` · ${x.motivi.join(', ')}`), x.scheda ? h('span', { class: 'muted' }, ` · ${x.scheda}`) : null))))
        : h('div', { class: 'muted' }, 'Nessun modello noto somiglia a questa presentazione.'));
    tools.replaceChildren(
      h('div', { class: 'cp-seg', role: 'group', 'aria-label': 'Modalità' }, modeBtn('revisione', 'Revisione'), modeBtn('modifica', 'Modifica')),
      sec('Mostra', true, chk('blocks', 'Ordine di lettura e gerarchia', 'cippi.blocchi'), chk('flow', 'Step nuovi e modificati', 'cippi.stati'), chk('notes', 'Note dello speaker', 'cippi.note')),
      sec(`Struttura (${R.list.length} slide)`, true, struct),
      sec('Documento', false, docInfo),
      A.reading.length ? sec('Percorso di lettura', false, h('p', { class: 'small muted' }, 'Come si studia: contesto, legenda e sigle, mappa, poi ogni processo passo per passo confrontando To-Be e As-Is.'), reading) : null,
      sec(`Controlli (${A.checks.length})`, false, checks),
      sec(`Glossario (${A.glossary.length})`, false, gloss),
      sec(`Appunti (${doc.appunti.length})`, false, appunti),
      sec('Confronta con un modello', false, modelSel, conf));
    const on = struct.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  }

  // ---- VISIONE
  const overridesOf = (x) => ({ texts: x.texts, geom: x.geom, fill: x.fill, cells: x.cells });
  async function drawSlideInto(box, src, over, { overlay = true } = {}) {
    const data = await slideData(src);
    const sInfo = A.slides[src - 1];
    const blocks = new Map((sInfo.blocks || []).map((b) => [String(b.id), b]));
    const nodes = new Map();
    for (const n of (sInfo.flow && sInfo.flow.nodes) || []) for (const k of n.ids || [n.id]) nodes.set(String(k), n);
    const slide = renderSlide(data, {
      media, ...(over || {}),
      onShape: (s, node) => {
        if (!overlay) return;
        const b = blocks.get(String(s.id));
        if (R.show.blocks && b && sInfo.kind !== 'flusso') {
          node.classList.add('cp-block', `lv${Math.min(3, b.level)}`);
          node.append(h('span', { class: 'cp-badge', title: `${ROLE[b.role] || b.role} · livello ${b.level}` }, `${b.order}`));
        }
        const n = nodes.get(String(s.id));
        const st = n ? statusOf(n) : null;
        if (R.show.flow && st && st !== 'invariato') node.classList.add(`cp-st-${st}`);
        if (b || (n && n.type !== 'annotazione')) {
          node.classList.add('cp-clickable');
          node.title = 'Apri le caratteristiche';
          node.addEventListener('click', () => (n ? openSheet({ kind: 'nodo', node: n }) : openSheet({ kind: 'blocco', block: b })));
        }
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
    const kp = h('section', { class: 'cp-keypoints', 'aria-label': 'Punti chiave' });
    view.replaceChildren(head, main, diff, notes, strip, kp);
    drawKeyPoints(kp);
    await drawSlideInto(a, x.src, overridesOf(x));
    if (b) await drawSlideInto(b, R.compare, null);
    // miniature disegnate solo quando si vedono
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const i = Number(e.target.dataset.i);
        slideData(R.list[i].src).then((d) => { e.target.prepend(renderSlide(d, { media, ...overridesOf(R.list[i]) })); }).catch(() => {});
      }
    }, { root: strip, rootMargin: '300px' });
    strip.querySelectorAll('.cp-mini').forEach((m) => io.observe(m));
    const on = strip.querySelector('.on');
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  // ---- PUNTI CHIAVE (sotto l'anteprima)
  function drawKeyPoints(box) {
    const x = R.list[R.cur];
    const here = doc.points.filter((p) => (R.scope === 'tutti' ? true : p.slide === x.src));
    const redraw = () => drawKeyPoints(box);
    const addKind = h('select', { name: 'kind', 'aria-label': 'Tipo' }, Object.entries(POINT).map(([k, v]) => h('option', { value: k }, v)));
    const addText = h('input', { type: 'text', name: 'text', maxlength: '2000', placeholder: 'Aggiungi un punto, una nota, una domanda…', 'aria-label': 'Testo del punto' });
    const addForm = doc.canEdit ? h('form', { class: 'cp-add', onsubmit: async (e) => {
      e.preventDefault();
      if (!addText.value.trim()) return;
      try {
        const r = await post(`/api/cippi/docs/${id}/points`, { slide: x.src, kind: addKind.value, text: addText.value });
        doc.points.push({ id: r.id, slide: x.src, kind: addKind.value, text: addText.value, status: 'aperto', auto: false, author: state.user.name });
        redraw();
      } catch (err) { toastError(err); }
    } }, addKind, addText, h('button', { class: 'btn sm primary', type: 'submit', 'aria-label': 'Aggiungi' }, icon('plus'))) : null;
    const pointRow = (p) => h('li', { class: `cp-pt k-${p.kind}` + (p.status === 'fatto' ? ' done' : '') },
      h('input', { type: 'checkbox', checked: p.status === 'fatto', disabled: !doc.canEdit, title: 'Fatto', 'aria-label': 'Fatto',
        onchange: async (e) => { try { await patch(`/api/cippi/points/${p.id}`, { status: e.target.checked ? 'fatto' : 'aperto' }); p.status = e.target.checked ? 'fatto' : 'aperto'; redraw(); } catch (err) { toastError(err); } } }),
      h('div', { class: 'grow' },
        h('div', { class: 'cp-pt-meta' }, h('span', { class: 'chip' + (p.kind === 'domanda' || p.kind === 'da-fare' ? ' warn' : '') }, POINT[p.kind] || p.kind),
          R.scope === 'tutti' && p.slide ? h('button', { type: 'button', class: 'linklike small', onclick: () => { const i = posOfSrc(p.slide); if (i >= 0) go(i); } }, `slide ${posOfSrc(p.slide) + 1 || '–'}`) : null,
          h('span', { class: 'small muted' }, p.auto ? 'proposto da MPoint' : p.author)),
        h('div', { class: 'cp-pt-text' }, p.text)),
      doc.canEdit ? h('button', { class: 'icon-btn', type: 'button', title: 'Elimina', 'aria-label': 'Elimina', onclick: async () => { try { await del(`/api/cippi/points/${p.id}`); doc.points = doc.points.filter((y) => y !== p); redraw(); } catch (err) { toastError(err); } } }, icon('close')) : null);
    box.replaceChildren(
      h('div', { class: 'cp-pts-head' }, h('h2', {}, 'Punti chiave'),
        h('div', { class: 'cp-seg small' },
          h('button', { type: 'button', class: R.scope === 'slide' ? 'on' : '', onclick: () => { R.scope = 'slide'; redraw(); } }, `Questa slide (${doc.points.filter((p) => p.slide === x.src).length})`),
          h('button', { type: 'button', class: R.scope === 'tutti' ? 'on' : '', onclick: () => { R.scope = 'tutti'; redraw(); } }, `Tutti (${doc.points.length})`))),
      addForm,
      h('ul', { class: 'cp-pts' }, here.length ? here.map(pointRow) : h('li', { class: 'muted small' }, R.scope === 'slide' ? 'Nessun punto su questa slide.' : 'Nessun punto.')));
  }

  // ---- DESCRIZIONE DELLA SLIDE (pannello a destra)
  const toLines = (txt) => txt.split('\n').map((l) => { const m = /^(\s*)(.*)$/.exec(l); return { text: m[2], lvl: Math.floor(m[1].replace(/\t/g, '  ').length / 2) }; });
  const fromParas = (ps) => (ps || []).map((p) => `${'  '.repeat(p.lvl || 0)}${p.text}`).join('\n');
  const legendFill = (meaning) => ((A.legend || []).find((l) => l.meaning === meaning) || {}).fill || { nuovo: '92D050', modificato: 'FFFF00' }[meaning];
  // stato di uno step: quello scelto in MPoint (colore cambiato) oppure quello letto dalla legenda
  function statusOf(n) {
    const x = R.list[R.cur];
    const f = x.fill && x.fill[n.id];
    if (!f) return n.status || null;
    if (f === legendFill('nuovo')) return 'nuovo';
    if (f === legendFill('modificato')) return 'modificato';
    return 'invariato';
  }
  const geomOf = (n) => { const x = R.list[R.cur]; return (x.geom && x.geom[n.id]) || null; };
  const typeOf = (n) => { const g = geomOf(n); return g ? (/Decision|diamond/.test(g) ? 'decisione' : /Terminator/.test(g) ? 'fine' : 'step') : n.type; };
  const nodeText = (n) => { const x = R.list[R.cur]; const t = x.texts && x.texts[n.id]; return t ? t.map((l) => (typeof l === 'string' ? l : l.text)).join(' ') : n.text; };
  const SHAPES = [['rect', '▭', 'Attività'], ['flowChartDecision', '◇', 'Decisione'], ['flowChartTerminator', '⬭', 'Inizio / fine'], ['flowChartPredefinedProcess', '▤', 'Sottoprocesso'], ['flowChartDocument', '🗎', 'Documento'], ['roundRect', '▢', 'Attività (arrotondata)']];
  const shapeIcon = (n) => (typeOf(n) === 'decisione' ? '◇' : typeOf(n) === 'fine' || n.type === 'inizio' ? '⬭' : '▭');
  // modifiche a una forma della slide corrente (su tutti i suoi doppioni)
  function setShape(n, kind, value) {
    const x = R.list[R.cur];
    x[kind] = x[kind] || {};
    for (const k of n.ids || [n.id]) { if (value) x[kind][k] = value; else delete x[kind][k]; }
    save(); drawView(); drawDesc();
  }

  function drawDesc() {
    const x = R.list[R.cur];
    const s = info(R.cur);
    const pr = procOf(x.src);
    const head = h('div', { class: 'cp-desc-head' }, h('h2', {}, 'Descrizione della slide'),
      h('div', { class: 'small muted' }, h('span', { class: `cp-kind k-${s.kind}` }, KIND[s.kind] || s.kind), ` ${s.title || ''}`));
    const parts = [head];
    if (s.flow) {
      const f = s.flow;
      const steps = f.nodes.filter((n) => ['step', 'decisione', 'inizio', 'fine'].includes(n.type));
      // 1. protagonisti
      parts.push(h('h3', { class: 'cp-h3' }, `Protagonisti (${f.lanes.length})`),
        f.lanes.length ? h('ul', { class: 'cp-actors' }, f.lanes.map((l) => {
          const mine = steps.filter((n) => n.lane === l.name && n.type !== 'inizio' && n.type !== 'fine');
          const sys = [...new Set(mine.flatMap((n) => n.systems || []))];
          return h('li', { class: 'cp-actor', onclick: () => openSheet({ kind: 'attore', lane: l, steps: mine }) },
            h('span', { class: 'cp-avatar' }, l.name.split(/[\s/]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()),
            h('div', { class: 'grow' }, h('b', {}, l.name), h('div', { class: 'small muted' }, `${mine.length} attività${mine.filter((n) => typeOf(n) === 'decisione').length ? ` · ${mine.filter((n) => typeOf(n) === 'decisione').length} decisioni` : ''}${sys.length ? ` · ${sys.join(', ')}` : ''}`)),
            doc.items[`attore|${nkey(l.name)}`] ? h('span', { class: 'dot', title: 'Ha una descrizione' }) : null);
        })) : h('p', { class: 'small muted' }, 'Nessuna corsia: il flusso non dice chi fa cosa.'));
      // 2. struttura
      const byId = new Map(f.nodes.map((n) => [n.id, n]));
      parts.push(h('h3', { class: 'cp-h3' }, `Struttura della slide (${steps.length})`),
        h('ol', { class: 'cp-steps' }, steps.map((n) => {
          const st = statusOf(n);
          return h('li', { class: `st-${st || 'invariato'}`, 'data-block': String(n.id) },
            h('button', { type: 'button', class: 'cp-step', onclick: () => openSheet({ kind: 'nodo', node: n }) },
              h('span', { class: 'cp-shape-ico', title: typeOf(n) }, shapeIcon(n)),
              h('span', { class: 'grow' }, h('b', {}, nodeText(n)),
                h('span', { class: 'small muted' }, ` ${[n.lane, (n.systems || []).join(', ')].filter(Boolean).join(' · ')}`)),
              st && st !== 'invariato' ? h('span', { class: 'chip ' + (st === 'nuovo' ? 'ok' : 'warn') }, st) : null),
            typeOf(n) === 'decisione' ? h('div', { class: 'small cp-exits' }, f.edges.filter((e) => e.from === n.id).map((e) => h('div', {}, h('b', {}, e.label || '→'), ` ${(byId.get(e.to) || {}).text || ''}`))) : null,
            R.mode === 'modifica' && doc.canEdit && (n.type === 'step' || n.type === 'decisione') ? h('div', { class: 'cp-quick' },
              h('button', { type: 'button', class: 'btn xs', title: 'Cambia la forma', onclick: () => setShape(n, 'geom', typeOf(n) === 'decisione' ? 'rect' : 'flowChartDecision') }, typeOf(n) === 'decisione' ? '◇ → ▭' : '▭ → ◇'),
              ['nuovo', 'modificato', 'invariato'].map((k) => h('button', { type: 'button', class: 'btn xs' + ((st || 'invariato') === k ? ' on' : ''), onclick: () => setShape(n, 'fill', k === 'invariato' ? 'FFFFFF' : legendFill(k)) }, k))) : null);
        })));
      const refs = f.nodes.filter((n) => n.type === 'rimando');
      if (refs.length) {
        parts.push(h('h3', { class: 'cp-h3' }, 'Rimanda a'), h('div', { class: 'cp-refs' }, refs.map((n) => {
          const target = A.processes.find((p) => p.code === n.code && p.variant === (pr && pr.variant));
          const i = target ? posOfSrc(target.slides[0]) : -1;
          return i >= 0 ? h('button', { type: 'button', class: 'btn xs', onclick: () => go(i) }, n.text) : h('span', { class: 'chip', title: 'Non è in questa presentazione' }, n.text);
        })));
      }
      const notes = f.nodes.filter((n) => n.type === 'nota');
      if (notes.length) parts.push(h('h3', { class: 'cp-h3' }, 'Note del flusso'), notes.map((n) => h('div', { class: 'cp-note' }, n.text)));
      if (pr) {
        const links = doc.celle.filter((c) => c.code === pr.code && c.name === pr.name);
        parts.push(h('div', { class: 'cp-proc' },
          h('div', {}, h('b', {}, `${pr.variant || ''} ${pr.code || ''} ${pr.name}`), pr.parts > 1 ? h('span', { class: 'small muted' }, ` · ${pr.slides.length} parti`) : null),
          h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
            h('button', { type: 'button', class: 'btn xs primary', onclick: () => openSheet({ kind: 'processo', proc: pr }) }, 'Caratteristiche del processo'),
            links.map((l) => h('a', { class: 'btn xs', href: `/celle/#/celle?mappa=${l.mapId}&voce=${l.nodeId}`, target: '_blank', rel: 'noopener' }, icon('tree'), `GestioneCelle: ${l.map}`)))));
      }
    } else {
      // tabelle in Modifica: una casella per cella (tabelle vere e tabelle disegnate con le forme), righe nuove
      const tableEditor = (b) => {
        const native = !b.drawn;
        const rows = native ? (b.cells || (b.rows || []).map((r) => r.map((text) => ({ text })))) : (b.rows || []).map((r, ri) => r.map((text, ci) => ({ text, id: b.ids[ri][ci] })));
        const t = h('table', { class: 'cp-cellgrid' });
        rows.forEach((r, ri) => {
          const tr = h('tr', {});
          r.forEach((c, ci) => {
            if (c.hMerge || c.vMerge) return;
            const key = `${ri},${ci}`;
            const cur = native
              ? (x.cells && x.cells[b.id] && x.cells[b.id][key] ? x.cells[b.id][key].join('\n') : (c.text || ''))
              : (x.texts && x.texts[c.id] ? x.texts[c.id].map((l) => (typeof l === 'string' ? l : l.text)).join('\n') : (c.text || ''));
            const attrs = { class: ri === 0 && (native || b.header) ? 'head' : '' };
            if (c.gridSpan > 1) attrs.colspan = String(c.gridSpan);
            tr.append(h('td', attrs, h('input', { type: 'text', value: cur, 'aria-label': `Cella ${key}`, oninput: (e) => {
              if (native) { x.cells = x.cells || {}; x.cells[b.id] = x.cells[b.id] || {}; x.cells[b.id][key] = [e.target.value]; } else x.texts[c.id] = [e.target.value];
              save(); drawView();
            } })));
          });
          t.append(tr);
        });
        const addRow = native && rows.length ? h('button', { class: 'btn xs', type: 'button', onclick: () => {
          const cols = rows[0].length;
          const last = rows.length - 1;
          const after = /^(tot|total|totale|somma)/i.test(String((rows[last][0] || {}).text || '')) ? Math.max(1, last - 1) : last;
          const inputs = rows[0].map((c, ci) => h('input', { type: 'text', name: `c${ci}`, maxlength: '500' }));
          const m = modal('Aggiungi una riga', form([
            h('p', { class: 'muted' }, `La riga nuova prende lo stile della riga ${after + 1} e va subito dopo. La vedi nel file esportato e dopo "Salva versione".`),
            ...inputs.map((inp, ci) => field(rows[0][ci].text || `Colonna ${ci + 1}`, inp)),
            h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Aggiungi')),
          ], async (v) => {
            x.tableRows = x.tableRows || {};
            x.tableRows[b.id] = (x.tableRows[b.id] || []).concat([{ after, cells: Array.from({ length: cols }, (_, ci) => v[`c${ci}`] || '') }]);
            save(); m.close(); toast('Riga aggiunta: sarà nel file esportato.'); drawDesc();
          }));
        } }, '+ Aggiungi riga') : null;
        const pending = native && x.tableRows && x.tableRows[b.id] && x.tableRows[b.id].length
          ? h('div', { class: 'small muted' }, `${x.tableRows[b.id].length} righe da aggiungere all'esportazione `, h('button', { type: 'button', class: 'linklike small', onclick: () => { delete x.tableRows[b.id]; save(); drawDesc(); } }, 'annulla')) : null;
        return h('div', {}, t, addRow, pending);
      };
      // piano di progetto letto dal Gantt (immagine SVG)
      if (s.gantt) {
        parts.push(h('h3', { class: 'cp-h3' }, 'Piano di progetto'), h('div', { class: 'cp-gantt' },
          h('div', { class: 'small' }, h('b', {}, `Da ${s.gantt.from} a ${s.gantt.to}`)),
          h('ul', {}, s.gantt.rows.map((r) => h('li', { class: r.kind }, r.kind === 'componente' ? h('b', {}, r.text) : r.text, r.from ? h('span', { class: 'muted small' }, ` · ${r.from} → ${r.to}`) : null)))));
      }
      const blocks = (s.blocks || []).filter((b) => b.role !== 'navigazione');
      parts.push(h('h3', { class: 'cp-h3' }, R.mode === 'modifica' ? 'Testi della slide (modifica)' : `Struttura della slide (${blocks.length})`),
        R.mode === 'modifica' ? h('p', { class: 'small muted' }, 'Una riga per paragrafo; due spazi all\'inizio = un livello di elenco più in basso. Le modifiche si salvano da sole.') : null,
        blocks.length ? h('ol', { class: 'cp-blocks' }, blocks.map((b) => {
          const editable = R.mode === 'modifica' && doc.canEdit && b.paragraphs && b.id;
          const current = x.texts && x.texts[b.id] ? fromParas(x.texts[b.id].map((l) => (typeof l === 'string' ? { text: l } : l))) : fromParas(b.paragraphs);
          return h('li', { class: `cp-blk lv${Math.min(3, b.level)}`, 'data-block': String(b.id) },
            h('div', { class: 'cp-blk-head' }, h('span', { class: 'cp-badge static' }, String(b.order)), h('span', { class: 'chip' }, ROLE[b.role] || b.role), h('span', { class: 'small muted' }, `livello ${b.level}`),
              h('span', { class: 'grow' }),
              x.texts && x.texts[b.id] ? h('button', { type: 'button', class: 'linklike small', onclick: () => { delete x.texts[b.id]; save(); drawView(); drawDesc(); } }, 'ripristina') : null,
              h('button', { type: 'button', class: 'icon-btn sm', title: 'Caratteristiche', 'aria-label': 'Caratteristiche', onclick: () => openSheet({ kind: 'blocco', block: b }) }, icon('more'))),
            editable ? h('textarea', { rows: String(Math.min(10, Math.max(1, current.split('\n').length))), 'aria-label': `Testo del blocco ${b.order}`, oninput: (e) => { x.texts[b.id] = toLines(e.target.value); save(); drawView(); } }, current)
              : b.role === 'tabella' ? (R.mode === 'modifica' && doc.canEdit ? tableEditor(b) : h('div', { class: 'small cp-blk-text' }, (b.rows || []).slice(0, 8).map((r) => h('div', {}, r.join(' · ')))))
                : h('div', { class: 'cp-blk-text' }, (b.paragraphs || [{ text: b.text }]).map((p) => h('div', { style: `padding-left:${(p.lvl || 0) * 12}px` + (p.bold ? ';font-weight:600' : '') }, (p.lvl ? '• ' : '') + p.text))));
        })) : h('p', { class: 'muted small' }, 'Nessun blocco di testo.'));
    }
    if (R.mode === 'modifica' && doc.canEdit) {
      parts.push(h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Nota sulla slide (resta in MPoint)'),
        h('textarea', { rows: '2', maxlength: '2000', oninput: (e) => { x.note = e.target.value; save(); } }, x.note || '')));
    } else if (x.note) parts.push(h('div', { class: 'cp-note' }, x.note));
    // contesto generale del documento
    parts.push(h('button', { type: 'button', class: 'cp-context', onclick: () => openSheet({ kind: 'contesto' }, 'contesto') },
      h('b', {}, 'Contesto del documento'),
      h('span', { class: 'small muted' }, doc.background ? `${doc.background.slice(0, 140)}${doc.background.length > 140 ? '…' : ''}` : 'Non ancora scritto: aggiungilo (MPoint propone un testo dalle prime slide).')));
    desc.replaceChildren(...parts);
  }

  // ---- FINESTRA DELLE CARATTERISTICHE (stile impostazioni, scura) ------------------------------
  // ref: { kind: 'nodo'|'attore'|'processo'|'blocco'|'contesto', ... }. Le caratteristiche si salvano in MPoint
  // (chiave stabile tra le versioni); forma, colore e testi finiscono anche nel .pptx.
  const FIELD_LABEL = { descrizione: 'Descrizione', tecnologia: 'Tecnologia e transazioni', input: 'Input', output: 'Output', responsabile: 'Responsabile', tempi: 'Tempi', criticita: 'Criticità', obiettivo: 'Obiettivo', note: 'Note' };
  function keyOf(ref) {
    const s = info(R.cur);
    const pr = procOf(R.list[R.cur].src);
    if (ref.kind === 'nodo') return `nodo|${pr ? `${pr.code || nkey(pr.name)}|${pr.variant || ''}` : `slide|${nkey(s.title)}`}|${nkey(ref.node.text.replace(/^\d+\s*\.\s*/, ''))}`;
    if (ref.kind === 'attore') return `attore|${nkey(ref.lane.name)}`;
    if (ref.kind === 'processo') return `processo|${ref.proc.code || nkey(ref.proc.name)}|${ref.proc.variant || ''}`;
    if (ref.kind === 'blocco') return `blocco|${nkey(s.title)}|${nkey(ref.block.text).slice(0, 80)}`;
    return 'documento';
  }
  function openSheet(ref, section) {
    const s = info(R.cur);
    const f = s.flow;
    const pr = procOf(R.list[R.cur].src);
    const SECTIONS = {
      nodo: [['generale', 'Generale'], ['tecnologia', 'Tecnologia'], ['collegamenti', 'Collegamenti'], ['descrizione', 'Descrizione'], ['processo', 'Processo'], ['contesto', 'Contesto']],
      attore: [['generale', 'Generale'], ['descrizione', 'Descrizione'], ['contesto', 'Contesto']],
      processo: [['generale', 'Generale'], ['descrizione', 'Descrizione'], ['contesto', 'Contesto']],
      blocco: [['generale', 'Generale'], ['descrizione', 'Descrizione'], ['contesto', 'Contesto']],
      contesto: [['contesto', 'Contesto del documento']],
    }[ref.kind];
    let cur = section && SECTIONS.some(([k]) => k === section) ? section : SECTIONS[0][0];
    const title = ref.kind === 'nodo' ? nodeText(ref.node) : ref.kind === 'attore' ? ref.lane.name : ref.kind === 'processo' ? `${ref.proc.code || ''} ${ref.proc.name}` : ref.kind === 'blocco' ? (ROLE[ref.block.role] || ref.block.role) : doc.name;
    const sub = { nodo: { step: 'Attività', decisione: 'Decisione', inizio: 'Inizio', fine: 'Fine', rimando: 'Rimando a un processo', nota: 'Nota', sistema: 'Sistema', connettore: 'Connettore' }[ref.node ? typeOf(ref.node) : ''] || 'Elemento', attore: 'Protagonista', processo: `Processo ${ref.proc ? ref.proc.variant || '' : ''}`, blocco: `Blocco di testo · livello ${ref.block ? ref.block.level : ''}`, contesto: 'Documento' }[ref.kind];
    const ro = !doc.canEdit;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const nav = h('nav', { class: 'cs-nav' });
    const main = h('section', { class: 'cs-main' });
    const back = h('div', { class: 'cs-back', onmousedown: (e) => { if (e.target === back) close(); } },
      h('div', { class: 'cs-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, nav, main));
    document.addEventListener('keydown', onKey);
    document.body.append(back);

    const fieldEl = (label, input, hint) => h('label', { class: 'cs-field' }, h('span', {}, label), input, hint ? h('small', {}, hint) : null);
    const metaForm = (key, fields) => {
      const data = { ...(doc.items[key] || {}) };
      const inputs = {};
      const box = h('div', { class: 'cs-group' }, fields.map((k) => fieldEl(FIELD_LABEL[k], inputs[k] = h(k === 'descrizione' || k === 'note' || k === 'tecnologia' || k === 'obiettivo' ? 'textarea' : 'input', { type: 'text', rows: '3', value: data[k] || '', disabled: ro, maxlength: '5000' }, k === 'descrizione' || k === 'note' || k === 'tecnologia' || k === 'obiettivo' ? data[k] || '' : null))));
      const saveBtn = ro ? null : h('button', { type: 'button', class: 'cs-btn primary', onclick: async () => {
        const next = { ...(doc.items[key] || {}) };
        for (const k of fields) next[k] = inputs[k].value;
        try { await api('PUT', `/api/cippi/docs/${id}/items`, { key, data: next }); doc.items[key] = Object.fromEntries(Object.entries(next).filter(([, v]) => String(v).trim())); toast('Caratteristiche salvate.'); drawDesc(); } catch (err) { toastError(err); }
      } }, 'Salva');
      return [box, h('div', { class: 'cs-actions' }, saveBtn)];
    };
    const row = (k, v) => h('div', { class: 'cs-row' }, h('span', {}, k), h('b', {}, v == null || v === '' ? '—' : v));

    function body() {
      const n = ref.node;
      if (cur === 'contesto') {
        const ta = h('textarea', { rows: '12', disabled: ro, placeholder: 'Il contesto del documento: cliente, progetto, obiettivi, perimetro, chi è coinvolto…' }, doc.background || '');
        return [h('p', { class: 'cs-help' }, 'Lo sfondo generale di tutto il documento: vale per ogni slide e ogni processo. Si scrive una volta e si vede da ovunque.'),
          !doc.background && doc.backgroundSuggestion && !ro ? h('div', { class: 'cs-suggest' }, h('b', {}, 'Proposta di MPoint (dalle prime slide)'), h('p', {}, doc.backgroundSuggestion.slice(0, 600) + (doc.backgroundSuggestion.length > 600 ? '…' : '')),
            h('button', { type: 'button', class: 'cs-btn', onclick: () => { ta.value = doc.backgroundSuggestion; } }, 'Usa il testo proposto')) : null,
          fieldEl('Contesto', ta),
          h('div', { class: 'cs-actions' }, ro ? null : h('button', { type: 'button', class: 'cs-btn primary', onclick: async () => {
            try { const r = await patch(`/api/cippi/docs/${id}`, { background: ta.value }); doc.background = ta.value; R.updatedAt = r.updatedAt || R.updatedAt; toast('Contesto salvato.'); drawDesc(); } catch (err) { toastError(err); }
          } }, 'Salva'))];
      }
      if (cur === 'descrizione') {
        const fields = ref.kind === 'processo' ? ['obiettivo', 'descrizione', 'responsabile', 'tempi', 'criticita', 'note'] : ref.kind === 'attore' ? ['descrizione', 'responsabile', 'note'] : ref.kind === 'blocco' ? ['descrizione', 'note'] : ['descrizione', 'input', 'output', 'responsabile', 'tempi', 'criticita', 'note'];
        return [h('p', { class: 'cs-help' }, 'Le caratteristiche restano in MPoint e valgono anche per le versioni successive del documento.'), ...metaForm(keyOf(ref), fields)];
      }
      if (ref.kind === 'nodo' && cur === 'generale') {
        const st = statusOf(n) || 'invariato';
        const editable = !ro && (n.type === 'step' || n.type === 'decisione' || n.type === 'rimando' || n.type === 'nota');
        const ta = h('textarea', { rows: '3', disabled: !editable, onchange: (e) => { const x = R.list[R.cur]; for (const k of n.ids || [n.id]) x.texts[k] = toLines(e.target.value); save(); drawView(); drawDesc(); } }, nodeText(n));
        return [
          h('div', { class: 'cs-group' }, fieldEl('Testo', ta, editable ? 'Cambia il testo nella slide (anche nel .pptx).' : null)),
          n.type === 'step' || n.type === 'decisione' ? h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, 'Forma'),
            h('div', { class: 'cs-choices' }, SHAPES.map(([g, ico, label]) => h('button', { type: 'button', class: 'cs-choice' + ((geomOf(n) || (n.type === 'decisione' ? 'flowChartDecision' : 'rect')) === g ? ' on' : ''), disabled: ro,
              onclick: () => { setShape(n, 'geom', g); render(); } }, h('span', { class: 'ico' }, ico), label))),
            h('small', { class: 'cs-hint' }, 'Per esempio un quadrato che diventa rombo: l\'attività diventa una decisione.')) : null,
          n.type === 'step' || n.type === 'decisione' ? h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, 'Stato rispetto all\'As-Is'),
            h('div', { class: 'cs-choices' }, [['nuovo', 'Nuovo nel To-Be'], ['modificato', 'Modificato'], ['invariato', 'Invariato']].map(([k, label]) => h('button', { type: 'button', class: `cs-choice st-${k}` + (st === k ? ' on' : ''), disabled: ro,
              onclick: () => { setShape(n, 'fill', k === 'invariato' ? 'FFFFFF' : legendFill(k)); render(); } }, h('span', { class: 'sw' }), label))),
            h('small', { class: 'cs-hint' }, 'Il colore segue la legenda della presentazione.')) : null,
          h('div', { class: 'cs-group' }, row('Protagonista', n.lane), row('Numero', n.num), row('Tipo', sub), row('Slide', `${R.cur + 1} · ${s.title}`)),
        ];
      }
      if (ref.kind === 'nodo' && cur === 'tecnologia') {
        const sys = f ? f.nodes.filter((x) => x.type === 'sistema' && x.attachedTo === n.id) : [];
        return [
          h('p', { class: 'cs-help' }, 'I sistemi disegnati accanto allo step (i cilindri) e le altre tecnologie, transazioni o strumenti usati.'),
          h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, 'Sistemi nella slide'),
            sys.length ? sys.map((y) => fieldEl('Sistema', h('input', { type: 'text', value: nodeText(y), disabled: ro, onchange: (e) => { const x = R.list[R.cur]; for (const k of y.ids || [y.id]) x.texts[k] = [e.target.value]; save(); drawView(); } }))) : h('p', { class: 'cs-muted' }, 'Nessun sistema disegnato accanto a questo step.')),
          ...metaForm(keyOf(ref), ['tecnologia']),
        ];
      }
      if (ref.kind === 'nodo' && cur === 'collegamenti') {
        const byId = new Map(f.nodes.map((y) => [y.id, y]));
        const link = (e, other) => h('button', { type: 'button', class: 'cs-link', onclick: () => { ref = { kind: 'nodo', node: other }; cur = 'generale'; render(); } },
          e.label ? h('span', { class: 'cs-pill' }, e.label) : null, h('span', {}, other.text), e.note ? h('small', {}, e.note) : null);
        const ins = f.edges.filter((e) => e.to === n.id && byId.get(e.from));
        const outs = f.edges.filter((e) => e.from === n.id && byId.get(e.to));
        return [
          h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, `Arriva da (${ins.length})`), ins.length ? ins.map((e) => link(e, byId.get(e.from))) : h('p', { class: 'cs-muted' }, 'Nessuna freccia in entrata.')),
          h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, `Va verso (${outs.length})`), outs.length ? outs.map((e) => link(e, byId.get(e.to))) : h('p', { class: 'cs-muted' }, 'Nessuna freccia in uscita.')),
        ];
      }
      if ((ref.kind === 'nodo' && cur === 'processo') || (ref.kind === 'processo' && cur === 'generale')) {
        const p = ref.kind === 'processo' ? ref.proc : pr;
        if (!p) return [h('p', { class: 'cs-muted' }, 'Questa slide non appartiene a un processo con codice.')];
        const cmp = A.comparisons.find((c) => c.code === p.code);
        return [
          h('div', { class: 'cs-group' }, row('Codice', p.code), row('Nome', p.name), row('Versione', p.variant), row('Parti', `${p.slides.length} (slide ${p.slides.map((k) => posOfSrc(k) + 1).join(', ')})`),
            row('Protagonisti', p.lanes.join(', ')), row('Step e decisioni', `${p.steps} · ${p.decisions} decisioni`), row('Sistemi', Object.entries(p.systems).map(([k, v]) => `${k} (${v})`).join(', '))),
          p.new.length || p.changed.length ? h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, 'Novità rispetto all\'As-Is'),
            p.new.map((t) => h('div', { class: 'cs-li add' }, `+ ${t}`)), p.changed.map((t) => h('div', { class: 'cs-li mod' }, `~ ${t}`))) : null,
          cmp ? h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, 'Confronto con l\'As-Is'), row('Step solo nel To-Be', cmp.added.length), row('Step solo nell\'As-Is', cmp.removed.length)) : null,
          ref.kind === 'nodo' ? h('div', { class: 'cs-actions' }, h('button', { type: 'button', class: 'cs-btn', onclick: () => { ref = { kind: 'processo', proc: p }; cur = 'generale'; render(); } }, 'Caratteristiche del processo')) : null,
        ];
      }
      if (ref.kind === 'attore' && cur === 'generale') {
        return [h('div', { class: 'cs-group' }, row('Nome', ref.lane.name), row('Attività in questa slide', ref.steps.length)),
          h('div', { class: 'cs-group' }, h('div', { class: 'cs-label' }, 'Che cosa fa'), ref.steps.map((y) => h('button', { type: 'button', class: 'cs-link', onclick: () => { ref = { kind: 'nodo', node: y }; cur = 'generale'; render(); } }, h('span', {}, nodeText(y)), (y.systems || []).length ? h('small', {}, y.systems.join(', ')) : null)))];
      }
      if (ref.kind === 'blocco' && cur === 'generale') {
        const b = ref.block;
        const x = R.list[R.cur];
        const current = x.texts && x.texts[b.id] ? fromParas(x.texts[b.id].map((l) => (typeof l === 'string' ? { text: l } : l))) : fromParas(b.paragraphs || [{ text: b.text }]);
        return [h('div', { class: 'cs-group' }, row('Ruolo', ROLE[b.role] || b.role), row('Livello', b.level), row('Ordine di lettura', b.order)),
          h('div', { class: 'cs-group' }, fieldEl('Testo', h('textarea', { rows: '6', disabled: ro || !b.paragraphs, onchange: (e) => { x.texts[b.id] = toLines(e.target.value); save(); drawView(); drawDesc(); } }, current), 'Una riga per paragrafo; due spazi all\'inizio = un livello di elenco più in basso.'))];
      }
      return [];
    }
    function render() {
      const t = ref.kind === 'nodo' ? nodeText(ref.node) : title;
      nav.replaceChildren(h('div', { class: 'cs-nav-title' }, h('small', {}, sub), h('b', {}, t)),
        ...SECTIONS.map(([k, label]) => h('button', { type: 'button', class: 'cs-nav-item' + (cur === k ? ' on' : ''), onclick: () => { cur = k; render(); } }, label)),
        doc.items[keyOf(ref)] ? h('div', { class: 'cs-nav-foot' }, '● con descrizione') : null);
      main.replaceChildren(h('header', { class: 'cs-head' }, h('h2', {}, (SECTIONS.find(([k]) => k === cur) || [])[1]),
        h('button', { type: 'button', class: 'cs-close', 'aria-label': 'Chiudi', onclick: close }, icon('close'))),
      h('div', { class: 'cs-body' }, body()));
    }
    render();
  }

  function drawAll() { drawTools(); drawView().catch(toastError); drawDesc(); }
  drawAll();
  // frecce della tastiera per scorrere le slide
  const onKey = (e) => {
    if (!document.body.contains(shell)) return document.removeEventListener('keydown', onKey);
    if (/input|textarea|select/i.test(document.activeElement.tagName) || document.querySelector('.modal-back, .cs-back')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(R.cur + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(R.cur - 1); }
  };
  document.addEventListener('keydown', onKey);
}

// ---- Avvio e navigazione ---------------------------------------------------------------------------
async function route() {
  const m = /^#\/doc\/(\d+)(?:\?s=(\d+))?/.exec(location.hash);
  const pm = /^#\/progetto\/(\d+)/.exec(location.hash);
  try {
    if (m) await viewDoc(Number(m[1]), Number(m[2]) || 1);
    else if (pm) await viewProject(Number(pm[1]));
    else await viewLibrary();
  } catch (err) {
    if (err.status === 401) return location.reload();
    root.replaceChildren(h('div', { class: 'main app-window' }, topbar(), h('div', { class: 'card glass' }, h('h2', {}, 'Qualcosa non ha funzionato'), h('p', { class: 'muted' }, err.message), h('a', { class: 'btn', href: '#/' }, 'Torna all\'inizio'))));
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
  me = (cat.apps || []).find((a) => a.id === 'mpoint') || null;
  if (!state.user || state.user.mustChange) {
    root.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'card glass', style: 'max-width:420px;margin:12vh auto;text-align:center' },
      h('img', { src: '/catalogo/mpoint/icon.svg', alt: '', style: 'width:64px;height:64px' }),
      h('h1', { style: 'margin:12px 0 6px' }, 'MPoint'),
      h('p', { class: 'muted' }, 'Accedi al portale con il tuo account, poi riapri questa finestra.'),
      h('a', { class: 'btn primary', href: '/' }, 'Accedi al portale'))));
    return;
  }
  lastRoute = location.hash.replace(/\?.*$/, '');
  await route();
}
start().catch(toastError);
