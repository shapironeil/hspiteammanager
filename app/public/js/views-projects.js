// Progetti: elenco, scheda con persone e collegamento alla cartella aziendale, file locali.
import { get, post, patch, del, upload } from './api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtBytes, fmtDate, pageHead, avatarEl, meter, markdown } from './ui.js';
import { app, refresh } from './app.js';

const STATUS_CHIP = { attivo: 'ok', 'in-pausa': 'warn', chiuso: '' };
let openId = null; // progetto aperto in questo momento

async function editor(data, project) {
  const people = await get(app.can('manager') ? '/api/users' : '/api/recipients');
  const chosen = new Set(project ? project.members.map((m) => m.id) : [app.user.id]);
  const isNew = !project;
  const m = modal(isNew ? 'Nuovo progetto' : `Modifica ${project.name}`, form([
    field('Nome del progetto', h('input', { type: 'text', name: 'name', maxlength: '80', value: project ? project.name : '' }), 'Il nome con cui il team chiama il progetto.'),
    field('Cliente', h('input', { type: 'text', name: 'client', maxlength: '80', value: project ? project.client : '' }), 'Facoltativo. Il cliente o l\'ente per cui si lavora.'),
    field('Descrizione', h('textarea', { name: 'description', maxlength: '500', style: 'min-height:70px', value: project ? project.description : '' }), 'Due righe su obiettivo e perimetro del progetto.'),
    field('Stato', h('select', { name: 'status' }, Object.entries(data.statuses).map(([k, label]) => h('option', { value: k, selected: project && project.status === k }, label))), 'Attivo: in corso. In pausa: fermo per ora. Chiuso: concluso, resta consultabile.'),
    field('Link alla cartella OneDrive / SharePoint', h('input', { type: 'text', name: 'onedriveUrl', placeholder: 'https://…', value: project ? project.onedriveUrl : '' }),
      'Apri la cartella del progetto su OneDrive nel browser e copia qui l\'indirizzo. I file restano lì: chi clicca li vede solo se l\'azienda gli ha dato il permesso.'),
    h('div', { class: 'field' }, h('span', { class: 'field-label small muted', style: 'display:block;margin-bottom:6px' }, 'Chi può vedere il progetto'),
      h('div', { class: 'member-list' }, people.filter((u) => u.active !== false).map((u) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: chosen.has(u.id), onchange: (e) => { if (e.target.checked) chosen.add(u.id); else chosen.delete(u.id); } }),
        avatarEl(u, 'sm'), u.name)))),
    h('div', { class: 'modal-actions' },
      !isNew && app.can('hacker') ? h('button', {
        class: 'btn danger left', type: 'button',
        onclick: () => { m.close(); confirmDialog('Togliere il progetto dal portale?', `"${project.name}" sparisce dal portale. La cartella con i file resta sul disco.`, 'Togli', async () => { await del(`/api/projects/${project.id}`).catch(toastError); openId = null; refresh(); }); },
      }, 'Togli dal portale') : null,
      h('button', { class: 'btn primary', type: 'submit' }, 'Salva')),
  ], async (v) => {
    const body = { ...v, members: [...chosen] };
    if (isNew) await post('/api/projects', body); else await patch(`/api/projects/${project.id}`, body);
    m.close(); toast('Progetto salvato.'); refresh();
  }), { wide: true });
}

function faces(members) {
  const shown = members.slice(0, 5);
  return h('div', { class: 'row', style: 'gap:8px' },
    h('div', { class: 'faces' }, shown.map((u) => avatarEl(u, 'sm'))),
    h('span', { class: 'small muted' }, members.length === 0 ? 'Nessuna persona assegnata' : members.length === 1 ? '1 persona' : `${members.length} persone`));
}

// ---- Elenco -------------------------------------------------------------------
function renderList(el, data) {
  const card = (p) => h('button', { class: 'project glass', type: 'button', onclick: () => { openId = p.id; refresh(); } },
    h('div', { class: 'row', style: 'justify-content:space-between;width:100%' }, h('h3', {}, p.name),
      h('span', { class: `chip ${STATUS_CHIP[p.status] || ''}` }, data.statuses[p.status] || p.status)),
    p.client ? h('div', { class: 'small muted' }, p.client) : null,
    h('p', {}, p.description || 'Nessuna descrizione.'),
    faces(p.members));

  el.replaceChildren(
    pageHead('Progetti', 'Ogni progetto ha la sua scheda, le persone che possono vederlo e il collegamento ai suoi file.',
      data.canCreate ? h('button', { class: 'btn primary', type: 'button', onclick: () => editor(data, null) }, icon('plus'), 'Nuovo progetto') : null),
    data.projects.length ? h('div', { class: 'grid' }, data.projects.map(card))
      : h('div', { class: 'card glass empty' }, data.canCreate ? 'Nessun progetto. Creane uno con "Nuovo progetto".' : 'Non fai ancora parte di nessun progetto.'));
}

// ---- Scheda progetto ------------------------------------------------------------
async function renderProject(el, data, p) {
  const filesBox = h('div', {});
  const progress = h('div', { hidden: true }, meter(0));
  let here = '';

  async function load(pathRel) {
    here = pathRel;
    const d = await get(`/api/projects/${p.id}/files?path=${encodeURIComponent(pathRel)}`);
    const parts = d.path ? d.path.split('/') : [];
    const crumbs = h('div', { class: 'crumbs' },
      h('button', { type: 'button', onclick: () => load('').catch(toastError) }, 'Cartella del progetto'),
      parts.map((name, i) => [h('span', { class: 'muted' }, '/'), h('button', { type: 'button', onclick: () => load(parts.slice(0, i + 1).join('/')).catch(toastError) }, name)]));
    const rows = [
      ...d.folders.map((name) => h('li', { class: 'file-row' }, icon('folder'),
        h('div', { class: 'grow' }, h('button', { class: 'link title', type: 'button', onclick: () => load(d.path ? `${d.path}/${name}` : name).catch(toastError) }, name)))),
      ...d.files.map((f) => {
        const rel = encodeURIComponent(d.path ? `${d.path}/${f.name}` : f.name);
        const viewUrl = `/api/projects/${p.id}/view?path=${rel}`;
        const isText = /\.(txt|md|json|csv|log)$/i.test(f.name);
        // I testi si leggono in una finestra del portale; PDF, immagini e pagine HTML in una nuova scheda.
        const name = !f.viewable ? h('div', { class: 'title' }, f.name)
          : isText ? h('button', { class: 'link title', type: 'button', title: 'Leggi', onclick: () => readText(f.name, viewUrl) }, f.name)
            : h('a', { class: 'title', href: viewUrl, target: '_blank', rel: 'noopener', title: 'Apri in una nuova scheda', style: 'color:inherit;text-decoration:none;display:block' }, f.name);
        return h('li', { class: 'file-row' }, icon('file'),
          h('div', { class: 'grow' }, name, h('div', { class: 'meta' }, `${fmtBytes(f.size)} · ${fmtDate(f.modifiedAt)}${f.viewable ? ' · clicca il nome per aprirlo' : ''}`)),
          h('a', { class: 'icon-btn', title: 'Scarica', 'aria-label': `Scarica ${f.name}`, href: `/api/projects/${p.id}/download?path=${rel}` }, icon('download')));
      }),
    ];
    filesBox.replaceChildren(crumbs, rows.length ? h('ul', { class: 'list' }, rows) : h('div', { class: 'empty' }, 'Cartella vuota.'));
  }

  async function readText(name, url) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Non riesco ad aprire il file.');
      const text = await res.text();
      const body = /\.md$/i.test(name) ? markdown(text)
        : h('pre', { style: 'white-space:pre-wrap;overflow-wrap:anywhere;font:12.5px/1.55 var(--mono);margin:0;max-height:65vh;overflow:auto' }, text.length > 400000 ? text.slice(0, 400000) + '\n\n[file lungo: scaricalo per vederlo tutto]' : text);
      modal(name, body, { wide: true });
    } catch (err) { toastError(err); }
  }

  const newFolder = () => {
    const m = modal('Nuova cartella', form([
      field('Nome della cartella', h('input', { type: 'text', name: 'name', maxlength: '100' }), 'Viene creata dentro la cartella che stai guardando. Esempio: Verbali, oppure 2026-09-28 Checkpoint.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea')),
    ], async (v) => { await post(`/api/projects/${p.id}/folders`, { path: here, name: v.name }); m.close(); await load(here); }));
  };

  const pickAndUpload = () => {
    const input = h('input', { type: 'file', onchange: async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        if (file.size > app.state.maxFileMb * 1024 * 1024) throw new Error(`File troppo grande: il massimo è ${app.state.maxFileMb} MB.`);
        progress.hidden = false;
        const bar = progress.querySelector('i');
        const url = `/api/projects/${p.id}/files?path=${encodeURIComponent(here)}&name=${encodeURIComponent(file.name)}`;
        const send = (extra) => upload(url + extra, file, (f) => { bar.style.width = `${f * 100}%`; });
        try {
          await send('');
        } catch (err) {
          if (!/Esiste già un file/.test(err.message)) throw err;
          progress.hidden = true;
          // Stesso nome: si chiede conferma. La versione precedente finisce nello storico del progetto.
          confirmDialog('Sostituire il file?', `"${file.name}" esiste già in questa cartella. La versione attuale viene conservata nello storico del progetto.`, 'Sostituisci', async () => {
            try { progress.hidden = false; await send('&overwrite=1'); toast('File sostituito.'); await load(here); } catch (e2) { toastError(e2); }
            progress.hidden = true;
          });
          return;
        }
        toast('File caricato.');
        await load(here);
      } catch (err) { toastError(err); }
      progress.hidden = true;
    } });
    input.click();
  };

  el.replaceChildren(
    h('div', { style: 'margin-bottom:10px' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { openId = null; refresh(); } }, icon('back'), 'Tutti i progetti')),
    pageHead(p.name, [p.client, p.description].filter(Boolean).join(' · ') || null,
      h('span', { class: `chip ${STATUS_CHIP[p.status] || ''}` }, data.statuses[p.status] || p.status),
      p.canEdit ? h('button', { class: 'btn', type: 'button', onclick: () => editor(data, p) }, icon('edit'), 'Modifica') : null),
    h('div', { class: 'two-col' },
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Cartella aziendale')),
        p.onedriveUrl
          ? h('div', {},
            h('p', { class: 'muted', style: 'margin-bottom:12px' }, 'I documenti ufficiali del progetto stanno su OneDrive / SharePoint. Si aprono con il tuo account aziendale: vedi solo ciò che l\'azienda ti ha autorizzato a vedere.'),
            h('a', { class: 'btn primary', href: p.onedriveUrl, target: '_blank', rel: 'noopener noreferrer' }, icon('cloud'), 'Apri su OneDrive', icon('external')))
          : h('p', { class: 'muted' }, p.canEdit ? 'Nessuna cartella collegata. Con Modifica puoi incollare il link alla cartella OneDrive / SharePoint del progetto.' : 'Nessuna cartella collegata.')),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Persone'), h('span', { class: 'chip' }, String(p.members.length))),
        p.members.length ? h('ul', { class: 'list' }, p.members.map((u) => h('li', {}, avatarEl(u, 'sm'), h('div', { class: 'grow' }, h('div', { class: 'title' }, u.name), h('div', { class: 'meta' }, u.username)))))
          : h('div', { class: 'empty' }, 'Nessuna persona assegnata: per ora lo vede solo l\'Hacker.'))),
    h('section', { class: 'card glass', style: 'margin-top:16px' },
      h('div', { class: 'card-head' }, h('h2', {}, 'File nel portale'),
        h('div', { class: 'row' },
          h('button', { class: 'btn sm', type: 'button', onclick: newFolder }, icon('plus'), 'Nuova cartella'),
          h('button', { class: 'btn sm', type: 'button', onclick: pickAndUpload }, icon('upload'), 'Carica qui'))),
      progress, filesBox,
      h('p', { class: 'small muted mono', style: 'margin-top:10px' }, `progetti/${p.folder}`)));
  await load('');
}

// Tornando su "Progetti" dal menu si riparte dall'elenco.
export const resetProjects = () => { openId = null; };

export async function viewProjects(el) {
  const data = await get('/api/projects');
  const current = data.projects.find((p) => p.id === openId);
  if (current) return renderProject(el, data, current);
  openId = null;
  renderList(el, data);
}
