// Esplora file: cartelle vere sul disco del portale (spazio personale e cartelle dei progetti).
// Lo stesso pannello si usa nella schermata "Esplora file" e nella scheda di ogni progetto.
// Niente si cancella davvero: "Elimina" sposta nel cestino; sostituire un file conserva la versione precedente.
import { get, post, upload } from './api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtBytes, fmtDate, pageHead, meter, markdown } from './ui.js';
import { app } from './app.js';

const TEXT_RE = /\.(txt|md|csv|json|log|vtt|srt)$/i;
const enc = encodeURIComponent;
const joinPath = (a, b) => (a ? `${a}/${b}` : b);
const api = (space, what) => `/api/explorer/${space}/${what}`;

function fileIcon(f) {
  if (!f.type) return icon('file');
  if (f.type.startsWith('image/')) return icon('image');
  if (f.type.startsWith('video/') || f.type.startsWith('audio/')) return icon('video');
  if (TEXT_RE.test(f.name)) return icon('note');
  return icon('file');
}

// ---- Anteprima e modifica -------------------------------------------------------
async function openFile(space, rel, f, onSaved) {
  const url = `${api(space, 'view')}?path=${enc(rel)}`;
  const type = f.type || '';
  if (!type) { location.href = `${api(space, 'download')}?path=${enc(rel)}`; return; }
  if (type === 'application/pdf' || /html/.test(type)) { window.open(url, '_blank', 'noopener'); return; }
  if (type.startsWith('image/')) return modal(f.name, h('img', { class: 'ex-media', src: url, alt: f.name }), { wide: true });
  if (type.startsWith('video/')) return modal(f.name, h('video', { class: 'ex-media', src: url, controls: true, playsinline: true, preload: 'metadata' }), { wide: true });
  if (type.startsWith('audio/')) return modal(f.name, h('audio', { src: url, controls: true, style: 'width:100%' }), { wide: true });
  // Testi: si leggono e, se serve, si modificano qui (anche da telefono).
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Non riesco ad aprire il file.');
  const text = await res.text();
  const tooBig = text.length > 400000;
  const body = h('div', {});
  const showRead = () => body.replaceChildren(
    /\.md$/i.test(f.name) ? markdown(text) : h('pre', { class: 'ex-text' }, tooBig ? text.slice(0, 400000) + '\n\n[file lungo: scaricalo per vederlo tutto]' : text),
    tooBig ? null : h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'button', onclick: showEdit }, icon('edit'), 'Modifica')));
  const showEdit = () => {
    const area = h('textarea', { class: 'ex-editor', spellcheck: 'true' });
    area.value = text;
    body.replaceChildren(area,
      h('p', { class: 'small muted' }, 'Salvando, la versione attuale resta nelle versioni precedenti del file.'),
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn', type: 'button', onclick: showRead }, 'Annulla'),
        h('button', { class: 'btn primary', type: 'button', onclick: async (e) => {
          e.currentTarget.disabled = true;
          try {
            const dir = rel.split('/').slice(0, -1).join('/');
            await upload(`${api(space, 'file')}?path=${enc(dir)}&name=${enc(f.name)}&overwrite=1`, new Blob([area.value], { type: 'text/plain' }));
            toast('File salvato.');
            m.close();
            onSaved && onSaved();
          } catch (err) { toastError(err); e.currentTarget.disabled = false; }
        } }, 'Salva')));
    area.focus();
  };
  showRead();
  const m = modal(f.name, body, { wide: true });
  return m;
}

// Scelta di una cartella di destinazione (per "Sposta").
function pickFolder(space, title, startPath, onPick) {
  const box = h('div', {});
  let here = '';
  const go = async (rel) => {
    here = rel;
    const d = await get(`${api(space, 'list')}?path=${enc(rel)}`);
    const parts = d.path ? d.path.split('/') : [];
    box.replaceChildren(
      h('div', { class: 'crumbs' }, h('button', { type: 'button', onclick: () => go('').catch(toastError) }, d.label),
        parts.map((n, i) => [h('span', { class: 'muted' }, '/'), h('button', { type: 'button', onclick: () => go(parts.slice(0, i + 1).join('/')).catch(toastError) }, n)])),
      d.folders.length ? h('ul', { class: 'list ex-pick' }, d.folders.map((f) => h('li', {}, icon('folder'),
        h('button', { class: 'link title grow', type: 'button', onclick: () => go(joinPath(d.path, f.name)).catch(toastError) }, f.name))))
        : h('div', { class: 'empty' }, 'Nessuna sottocartella.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: async () => { try { await onPick(here); m.close(); } catch (err) { toastError(err); } } }, 'Sposta qui')));
  };
  const m = modal(title, box, { wide: true });
  go(startPath).catch(toastError);
}

function versionsDialog(space, rel, name, onDone) {
  const box = h('div', {}, h('div', { class: 'empty' }, 'Carico…'));
  const m = modal(`Versioni di ${name}`, box, { wide: true });
  get(`${api(space, 'versions')}?path=${enc(rel)}`).then((d) => {
    box.replaceChildren(
      h('p', { class: 'small muted', style: 'margin-bottom:10px' }, 'Ogni volta che il file viene sostituito o modificato, la versione precedente si conserva qui. Ripristinare non cancella quella attuale: diventa a sua volta una versione.'),
      d.versions.length ? h('ul', { class: 'list' }, d.versions.map((v) => h('li', {}, icon('history'),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, fmtDate(v.savedAt)), h('div', { class: 'meta' }, fmtBytes(v.size))),
        h('a', { class: 'icon-btn', title: 'Scarica questa versione', href: `${api(space, 'download')}?path=${enc(rel)}&version=${enc(v.id)}` }, icon('download')),
        h('button', { class: 'btn sm', type: 'button', onclick: async () => {
          try { await post(api(space, 'versions/restore'), { path: rel, id: v.id }); toast('Versione ripristinata.'); m.close(); onDone(); } catch (err) { toastError(err); }
        } }, icon('restore'), 'Ripristina'))))
        : h('div', { class: 'empty' }, 'Nessuna versione precedente.'));
  }).catch(toastError);
}

function trashDialog(space, onDone) {
  const box = h('div', {}, h('div', { class: 'empty' }, 'Carico…'));
  const m = modal('Cestino', box, { wide: true });
  const load = () => get(api(space, 'trash')).then((d) => {
    box.replaceChildren(
      h('p', { class: 'small muted', style: 'margin-bottom:10px' }, 'Gli elementi eliminati restano qui e si possono rimettere al loro posto. Il cestino non si svuota da solo.'),
      d.items.length ? h('ul', { class: 'list' }, d.items.map((t) => h('li', {}, icon(t.isDir ? 'folder' : 'file'),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, t.name),
          h('div', { class: 'meta' }, `${t.path} · eliminato ${fmtDate(t.deletedAt)}${t.by ? ` da ${t.by}` : ''}${t.isDir ? '' : ` · ${fmtBytes(t.size)}`}`)),
        h('button', { class: 'btn sm', type: 'button', onclick: async () => {
          try { const r = await post(api(space, 'trash/restore'), { id: t.id }); toast(`Rimesso in ${r.path}`); await load(); onDone(); } catch (err) { toastError(err); }
        } }, icon('restore'), 'Ripristina'))))
        : h('div', { class: 'empty' }, 'Il cestino è vuoto.'));
  }).catch(toastError);
  load();
  return m;
}

// ---- Pannello -----------------------------------------------------------------
// explorerPanel({ space, path, title, onPath }) -> elemento. onPath(path) avvisa quando si cambia cartella.
export function explorerPanel({ space, path = '', title = null, onPath = null }) {
  const listBox = h('div', { class: 'ex-list' });
  const progress = h('div', { class: 'ex-progress', hidden: true }, h('div', { class: 'small muted' }), meter(0));
  let here = path;
  let label = '';

  const refresh = () => load(here).catch(toastError);

  async function load(rel) {
    const d = await get(`${api(space, 'list')}?path=${enc(rel)}`);
    here = d.path;
    label = d.label;
    if (onPath) onPath(here);
    const parts = here ? here.split('/') : [];
    const crumbs = h('div', { class: 'crumbs' },
      h('button', { type: 'button', onclick: () => load('').catch(toastError) }, d.label),
      parts.map((n, i) => [h('span', { class: 'muted' }, '/'), h('button', { type: 'button', onclick: () => load(parts.slice(0, i + 1).join('/')).catch(toastError) }, n)]));
    const rows = [
      ...d.folders.map((f) => row(f, true)),
      ...d.files.map((f) => row(f, false)),
    ];
    listBox.replaceChildren(crumbs, rows.length ? h('ul', { class: 'list' }, rows)
      : h('div', { class: 'empty' }, 'Cartella vuota. Trascina qui dei file oppure usa "Carica".'));
  }

  function row(f, isDir) {
    const rel = joinPath(here, f.name);
    const meta = isDir ? `${f.items} element${f.items === 1 ? 'o' : 'i'} · ${fmtDate(f.modifiedAt)}`
      : [fmtBytes(f.size), fmtDate(f.modifiedAt), f.by ? `da ${f.by}` : null, f.versions ? `${f.versions} version${f.versions === 1 ? 'e' : 'i'} precedent${f.versions === 1 ? 'e' : 'i'}` : null].filter(Boolean).join(' · ');
    const open = () => (isDir ? load(rel) : openFile(space, rel, f, refresh)).catch(toastError);
    return h('li', { class: 'file-row' }, isDir ? icon('folder') : fileIcon(f),
      h('div', { class: 'grow' },
        h('button', { class: 'link title', type: 'button', title: isDir ? 'Apri la cartella' : 'Apri', onclick: open }, f.name),
        h('div', { class: 'meta' }, meta)),
      isDir ? null : h('a', { class: 'icon-btn', title: 'Scarica', 'aria-label': `Scarica ${f.name}`, href: `${api(space, 'download')}?path=${enc(rel)}` }, icon('download')),
      h('button', { class: 'icon-btn', type: 'button', title: 'Altre azioni', 'aria-label': `Azioni per ${f.name}`, onclick: () => actions(f, isDir, rel) }, icon('more')));
  }

  function actions(f, isDir, rel) {
    const act = (ic, text, fn, cls) => h('button', { class: `btn ex-action ${cls || ''}`, type: 'button', onclick: () => { m.close(); fn(); } }, icon(ic), text);
    const m = modal(f.name, h('div', { class: 'ex-actions' },
      act(isDir ? 'folder' : 'external', isDir ? 'Apri' : 'Apri / anteprima', () => (isDir ? load(rel) : openFile(space, rel, f, refresh)).catch(toastError)),
      isDir ? null : act('download', 'Scarica', () => { location.href = `${api(space, 'download')}?path=${enc(rel)}`; }),
      !isDir && TEXT_RE.test(f.name) ? act('edit', 'Modifica testo', () => openFile(space, rel, f, refresh).catch(toastError)) : null,
      act('edit', 'Rinomina', () => renameDialog(f.name, rel)),
      act('move', 'Sposta', () => pickFolder(space, `Sposta ${f.name}`, here, async (to) => { await post(api(space, 'move'), { path: rel, to }); toast('Spostato.'); refresh(); })),
      isDir ? null : act('history', `Versioni precedenti${f.versions ? ` (${f.versions})` : ''}`, () => versionsDialog(space, rel, f.name, refresh)),
      act('trash', 'Elimina (va nel cestino)', () => confirmDialog('Spostare nel cestino?', `"${f.name}" va nel cestino di questo spazio: potrai rimetterlo a posto quando vuoi.`, 'Sposta nel cestino', async () => {
        try { await post(api(space, 'trash'), { path: rel }); toast('Spostato nel cestino.'); refresh(); } catch (err) { toastError(err); }
      }), 'danger')));
  }

  function renameDialog(name, rel) {
    const m = modal('Rinomina', form([
      field('Nuovo nome', h('input', { type: 'text', name: 'name', maxlength: '150', value: name }), 'Mantieni l\'estensione finale (per esempio .docx) se è un file.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Rinomina')),
    ], async (v) => { await post(api(space, 'rename'), { path: rel, name: v.name }); m.close(); toast('Rinominato.'); refresh(); }));
  }

  function newFolder() {
    const m = modal('Nuova cartella', form([
      field('Nome della cartella', h('input', { type: 'text', name: 'name', maxlength: '100' }), 'Viene creata dentro la cartella che stai guardando. Esempio: Verbali, oppure 2026-09-28 Checkpoint.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea')),
    ], async (v) => { await post(api(space, 'folder'), { path: here, name: v.name }); m.close(); refresh(); }));
  }

  // Carica uno o piu' file, uno alla volta. Se un nome esiste gia' si chiede se sostituirlo.
  async function sendFiles(files) {
    const max = (app.state.maxFileMb || 2048) * 1024 * 1024;
    const bar = progress.querySelector('i');
    const text = progress.querySelector('div');
    let done = 0;
    for (const file of files) {
      if (file.size > max) { toastError(new Error(`"${file.name}" è troppo grande: il massimo è ${app.state.maxFileMb} MB.`)); continue; }
      progress.hidden = false;
      text.textContent = `Carico ${file.name}${files.length > 1 ? ` (${done + 1} di ${files.length})` : ''}…`;
      const url = `${api(space, 'file')}?path=${enc(here)}&name=${enc(file.name)}`;
      const send = (extra) => upload(url + extra, file, (f) => { bar.style.width = `${f * 100}%`; });
      try {
        await send('');
        done++;
      } catch (err) {
        if (!/Esiste già un file/.test(err.message)) { toastError(err); continue; }
        const ok = await new Promise((resolve) => {
          const m = modal('Sostituire il file?', h('div', {},
            h('p', { class: 'muted' }, `"${file.name}" esiste già in questa cartella. La versione attuale resta tra le versioni precedenti del file.`),
            h('div', { class: 'modal-actions', style: 'margin-top:20px' },
              h('button', { class: 'btn', type: 'button', onclick: () => { m.close(); resolve(false); } }, 'Salta'),
              h('button', { class: 'btn primary', type: 'button', onclick: () => { m.close(); resolve(true); } }, 'Sostituisci'))));
        });
        if (ok) { try { await send('&overwrite=1'); done++; } catch (e2) { toastError(e2); } }
      }
    }
    progress.hidden = true;
    if (done) toast(done === 1 ? 'File caricato.' : `${done} file caricati.`);
    refresh();
  }

  const picker = h('input', { type: 'file', multiple: true, hidden: true, onchange: () => { const f = [...picker.files]; picker.value = ''; if (f.length) sendFiles(f); } });

  const panel = h('section', { class: 'card glass ex-panel' },
    h('div', { class: 'card-head' }, title ? h('h2', {}, title) : h('span'),
      h('div', { class: 'row' },
        h('button', { class: 'btn sm', type: 'button', onclick: newFolder }, icon('plus'), 'Nuova cartella'),
        h('button', { class: 'btn sm', type: 'button', onclick: () => picker.click() }, icon('upload'), 'Carica'),
        h('button', { class: 'icon-btn', type: 'button', title: 'Cestino', 'aria-label': 'Cestino', onclick: () => trashDialog(space, refresh) }, icon('trash')))),
    picker, progress, listBox,
    h('p', { class: 'small muted ex-drop-hint' }, 'Puoi trascinare file qui sopra per caricarli nella cartella aperta.'));

  // Trascina e rilascia sul pannello.
  panel.addEventListener('dragover', (e) => { if ([...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); panel.classList.add('over'); } });
  panel.addEventListener('dragleave', (e) => { if (!panel.contains(e.relatedTarget)) panel.classList.remove('over'); });
  panel.addEventListener('drop', (e) => {
    e.preventDefault();
    panel.classList.remove('over');
    const files = [...(e.dataTransfer.files || [])];
    if (files.length) sendFiles(files);
  });

  panel.ready = load(path).catch((err) => {
    // cartella non piu' esistente (es. spostata): si riparte dalla radice
    if (path && err.status === 404) return load('');
    throw err;
  });
  panel.reload = refresh;
  panel.label = () => label;
  return panel;
}

// ---- Schermata "Esplora file" ------------------------------------------------------
function hashParams() {
  const q = location.hash.split('?')[1] || '';
  return new URLSearchParams(q);
}
function setHash(space, path) {
  const q = new URLSearchParams({ spazio: space });
  if (path) q.set('percorso', path);
  history.replaceState(null, '', `#/esplora?${q}`);
}

export async function viewExplorer(el) {
  const { spaces } = await get('/api/explorer/spaces');
  const params = hashParams();
  let space = spaces.some((s) => s.id === params.get('spazio')) ? params.get('spazio') : 'me';
  const holder = h('div', { class: 'ex-main' });
  const side = h('nav', { class: 'card glass ex-spaces', 'aria-label': 'Spazi' });
  const select = h('select', { class: 'ex-space-select', 'aria-label': 'Spazio', onchange: () => show(select.value, '') },
    spaces.map((s) => h('option', { value: s.id }, s.kind === 'personale' ? `${s.label} (personale)` : s.label)));

  const show = async (id, path) => {
    space = id;
    select.value = id;
    side.querySelectorAll('button[data-space]').forEach((b) => b.classList.toggle('active', b.dataset.space === id));
    const panel = explorerPanel({ space: id, path, title: spaces.find((s) => s.id === id).label, onPath: (p) => setHash(id, p) });
    holder.replaceChildren(panel);
    await panel.ready;
  };

  side.append(...[
    h('div', { class: 'small muted ex-side-title' }, 'Personale'),
    ...spaces.filter((s) => s.kind === 'personale').map((s) => spaceButton(s)),
    spaces.length > 1 ? h('div', { class: 'small muted ex-side-title' }, 'Progetti') : null,
    ...spaces.filter((s) => s.kind === 'progetto').map((s) => spaceButton(s))].filter(Boolean)); // senza progetti niente scritta "null"
  function spaceButton(s) {
    return h('button', { class: 'nav-item ex-space', type: 'button', 'data-space': s.id, onclick: () => show(s.id, '').catch(toastError) },
      icon(s.kind === 'personale' ? 'user' : 'briefcase'), h('span', {}, s.label));
  }

  // Ricerca per nome in tutti gli spazi e ultime modifiche.
  const results = h('div', {});
  let timer = null;
  const search = h('input', { type: 'search', class: 'ex-search', placeholder: 'Cerca un file o una cartella in tutti i tuoi spazi…', 'aria-label': 'Cerca file',
    oninput: () => { clearTimeout(timer); timer = setTimeout(runSearch, 250); } });
  const resultRow = (r) => h('li', { class: 'file-row' }, icon(r.isDir ? 'folder' : 'file'),
    h('div', { class: 'grow' },
      h('button', { class: 'link title', type: 'button', onclick: () => {
        const dir = r.isDir ? r.path : r.path.split('/').slice(0, -1).join('/');
        search.value = ''; results.replaceChildren();
        show(r.space, dir).catch(toastError);
      } }, r.name),
      h('div', { class: 'meta' }, [r.spaceLabel, `/${r.path}`, r.by ? `da ${r.by}` : null, fmtDate(r.modifiedAt)].filter(Boolean).join(' · '))));
  async function runSearch() {
    const q = search.value.trim();
    if (q.length < 2) { results.replaceChildren(); return; }
    try {
      const d = await get(`/api/explorer/search?q=${enc(q)}`);
      results.replaceChildren(h('section', { class: 'card glass', style: 'margin-bottom:16px' },
        h('div', { class: 'card-head' }, h('h2', {}, 'Risultati'), h('span', { class: 'chip' }, String(d.results.length))),
        d.results.length ? h('ul', { class: 'list' }, d.results.map(resultRow)) : h('div', { class: 'empty' }, 'Nessun file o cartella con questo nome.')));
    } catch (err) { toastError(err); }
  }

  const recentBox = h('section', { class: 'card glass', style: 'margin-top:16px' }, h('div', { class: 'card-head' }, h('h2', {}, 'Modifiche recenti')), h('div', { class: 'empty' }, 'Carico…'));
  get('/api/explorer/recent').then((d) => {
    recentBox.replaceChildren(h('div', { class: 'card-head' }, h('h2', {}, 'Modifiche recenti')),
      d.results.length ? h('ul', { class: 'list' }, d.results.slice(0, 12).map(resultRow)) : h('div', { class: 'empty' }, 'Ancora nessun file.'));
  }).catch(() => recentBox.remove());

  el.replaceChildren(
    pageHead('Esplora file', 'Le tue cartelle personali e quelle dei progetti di cui fai parte. Sono cartelle vere sul PC del portale: niente si cancella davvero, tutto si ritrova.'),
    h('div', { class: 'ex-searchbar glass' }, icon('search'), search),
    results,
    h('div', { class: 'ex-layout' }, h('div', {}, select, side), holder),
    recentBox);
  await show(space, params.get('percorso') || '');
}
