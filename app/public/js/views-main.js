// Schermate visibili a tutti: Home, Programmi, File, Profilo.
import { get, post, patch, del, upload } from './api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtBytes, fmtDate, pageHead, meter, markdown } from './ui.js';
import { app, refresh, boot } from './app.js';

// ---- Home ------------------------------------------------------------------
export async function viewHome(el) {
  const d = await get('/api/dashboard');
  const tile = (label, value, sub, href) => h(href ? 'a' : 'div', { class: 'tile glass', href },
    h('div', { class: 'label' }, label), h('div', { class: 'value' }, String(value)), sub ? h('div', { class: 'sub' }, sub) : null);

  const tiles = [
    tile('Programmi disponibili', d.programs, 'da scaricare', '#/programmi'),
    tile('I miei file', d.myFiles, 'caricati da te', '#/file'),
    tile('File ricevuti', d.received, 'dai colleghi', '#/file'),
  ];
  if (d.team) tiles.push(tile('Persone attive', d.team.active, d.team.neverLogged ? `${d.team.neverLogged} non ancora entrate` : 'tutte hanno fatto accesso', '#/team'));
  if (d.system) {
    tiles.push(tile('Problemi aperti', d.system.openIssues, 'errori e segnalazioni', '#/problemi'));
    const t = tile('Spazio usato', fmtBytes(d.system.usedBytes), `su ${fmtBytes(d.system.quotaBytes)}`, '#/sistema');
    t.append(meter(d.system.usedBytes / d.system.quotaBytes));
    tiles.push(t);
  }

  const newAnnouncement = () => {
    const m = modal('Nuovo annuncio', form([
      field('Titolo', h('input', { type: 'text', name: 'title', maxlength: '120' })),
      field('Testo', h('textarea', { name: 'body', maxlength: '2000' })),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Pubblica')),
    ], async (v) => { await post('/api/announcements', v); m.close(); toast('Annuncio pubblicato.'); refresh(); }));
  };

  const announcements = d.announcements.length
    ? d.announcements.map((a) => h('div', { class: 'announcement' },
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('h3', {}, a.title),
        app.can('manager') && (a.authorId === app.user.id || app.can('hacker'))
          ? h('button', {
            class: 'icon-btn', type: 'button', 'aria-label': 'Elimina annuncio',
            onclick: () => confirmDialog('Eliminare l\'annuncio?', a.title, 'Elimina', async () => { await del(`/api/announcements/${a.id}`).catch(toastError); refresh(); }),
          }, icon('trash')) : null),
      a.body ? h('p', {}, a.body) : null,
      h('div', { class: 'small muted', style: 'margin-top:6px' }, `${a.author || 'Account rimosso'} · ${fmtDate(a.createdAt)}`)))
    : h('div', { class: 'empty' }, 'Nessun annuncio per ora.');

  el.replaceChildren(
    pageHead(`Ciao, ${app.user.name.split(' ')[0]}`, 'Ecco cosa c\'è nel portale oggi.'),
    h('div', { class: 'tiles' }, tiles),
    h('section', { class: 'card glass' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Annunci'),
        app.can('manager') ? h('button', { class: 'btn sm', type: 'button', onclick: newAnnouncement }, icon('plus'), 'Nuovo annuncio') : null),
      announcements));
}

// ---- Programmi -------------------------------------------------------------
function programEditor(p) {
  const isNew = !p;
  const m = modal(isNew ? 'Nuovo programma' : `Modifica ${p.name}`, form([
    field('Nome', h('input', { type: 'text', name: 'name', maxlength: '80', value: p ? p.name : '' })),
    field('Versione', h('input', { type: 'text', name: 'version', maxlength: '30', placeholder: 'es. 1.0', value: p ? p.version : '' })),
    field('Descrizione breve', h('input', { type: 'text', name: 'description', maxlength: '300', value: p ? p.description : '' })),
    field('Guida all\'uso (testo semplice; # per i titoli, - per gli elenchi, **grassetto**)', h('textarea', { class: 'tall', name: 'guide', value: p ? p.guide : '' })),
    h('div', { class: 'modal-actions' },
      !isNew ? h('button', {
        class: 'btn danger left', type: 'button',
        onclick: () => { m.close(); confirmDialog('Eliminare il programma?', `"${p.name}" e il suo file verranno rimossi dal portale.`, 'Elimina', async () => { await del(`/api/programs/${p.id}`).catch(toastError); refresh(); }); },
      }, 'Elimina') : null,
      h('button', { class: 'btn primary', type: 'submit' }, 'Salva')),
  ], async (v) => {
    if (isNew) await post('/api/programs', v); else await patch(`/api/programs/${p.id}`, v);
    m.close(); toast('Programma salvato.'); refresh();
  }), { wide: true });
}

function pickFile(onFile) {
  const input = h('input', { type: 'file', onchange: () => { if (input.files[0]) onFile(input.files[0]); } });
  input.click();
}

function checkSize(file) {
  if (file.size > app.state.maxFileMb * 1024 * 1024) throw new Error(`File troppo grande: il massimo è ${app.state.maxFileMb} MB.`);
  if (file.size === 0) throw new Error('Il file è vuoto.');
}

export async function viewPrograms(el) {
  const programs = await get('/api/programs');
  const canEdit = app.can('manager');

  const card = (p) => {
    const status = h('span', { class: 'small muted' });
    const uploadFile = () => pickFile(async (file) => {
      try {
        checkSize(file);
        await upload(`/api/programs/${p.id}/file?name=${encodeURIComponent(file.name)}`, file, (f) => { status.textContent = `Caricamento ${Math.round(f * 100)}%`; });
        toast('File caricato.'); refresh();
      } catch (err) { status.textContent = ''; toastError(err); }
    });
    return h('article', { class: 'program glass' },
      h('div', { class: 'program-top' },
        h('div', { class: 'program-icon', 'aria-hidden': 'true' }, p.name[0].toUpperCase()),
        h('div', {}, h('h3', {}, p.name),
          h('div', { class: 'row', style: 'gap:6px;margin-top:4px' },
            p.version ? h('span', { class: 'chip' }, `v${p.version}`) : null,
            p.hasFile ? h('span', { class: 'chip ok' }, fmtBytes(p.fileSize)) : h('span', { class: 'chip warn' }, 'File non ancora caricato')))),
      h('p', {}, p.description || 'Nessuna descrizione.'),
      h('div', { class: 'row' },
        h('a', { class: 'btn primary sm' + (p.hasFile ? '' : ' disabled'), href: p.hasFile ? `/api/programs/${p.id}/download` : null, 'aria-disabled': p.hasFile ? null : 'true' }, icon('download'), 'Scarica'),
        h('button', { class: 'btn sm', type: 'button', onclick: () => modal(`Guida · ${p.name}`, markdown(p.guide), { wide: true }) }, icon('book'), 'Guida')),
      canEdit ? h('div', { class: 'row' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => programEditor(p) }, icon('edit'), 'Modifica'),
        h('button', { class: 'btn sm', type: 'button', onclick: uploadFile }, icon('upload'), p.hasFile ? 'Sostituisci file' : 'Carica file'),
        status) : null);
  };

  el.replaceChildren(
    pageHead('Programmi', 'Gli strumenti del team: scarica il programma e leggi la guida per usarlo.',
      canEdit ? h('button', { class: 'btn primary', type: 'button', onclick: () => programEditor(null) }, icon('plus'), 'Nuovo programma') : null),
    programs.length ? h('div', { class: 'grid' }, programs.map(card)) : h('div', { class: 'card glass empty' }, 'Nessun programma pubblicato.'));
}

// ---- File ------------------------------------------------------------------
export async function viewFiles(el) {
  const [files, recipients] = await Promise.all([get('/api/files'), get('/api/recipients')]);
  let chosen = null;

  const dropLabel = h('span', {}, 'Trascina qui un file oppure clicca per sceglierlo');
  const input = h('input', { type: 'file', onchange: () => choose(input.files[0]) });
  const drop = h('label', {
    class: 'drop',
    ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); },
    ondragleave: () => drop.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); drop.classList.remove('over'); choose(e.dataTransfer.files[0]); },
  }, input, dropLabel);
  const to = h('select', { name: 'to' },
    h('option', { value: '' }, 'Solo per me'),
    h('option', { value: 'all' }, 'Tutti'),
    recipients.map((r) => h('option', { value: String(r.id) }, r.name)));
  const progress = h('div', { hidden: true }, meter(0));
  const send = h('button', { class: 'btn primary', type: 'button', disabled: true, onclick: doUpload }, icon('upload'), 'Carica');

  function choose(file) {
    if (!file) return;
    chosen = file;
    dropLabel.textContent = `${file.name} · ${fmtBytes(file.size)}`;
    send.disabled = false;
  }
  async function doUpload() {
    try {
      checkSize(chosen);
      send.disabled = true;
      progress.hidden = false;
      const bar = progress.querySelector('i');
      await upload(`/api/files?name=${encodeURIComponent(chosen.name)}&to=${encodeURIComponent(to.value)}`, chosen, (f) => { bar.style.width = `${f * 100}%`; });
      toast(to.value ? 'File inviato.' : 'File caricato.');
      refresh();
    } catch (err) { progress.hidden = true; send.disabled = false; toastError(err); }
  }

  const row = (f, mine) => h('li', {},
    h('div', { class: 'grow' },
      h('div', { class: 'title' }, f.name),
      h('div', { class: 'meta' }, [fmtBytes(f.size), fmtDate(f.createdAt), mine ? (f.sentTo ? `inviato a ${f.sentTo}` : 'solo per me') : `da ${f.ownerName}`].join(' · '))),
    h('a', { class: 'icon-btn', href: `/api/files/${f.id}/download`, 'aria-label': `Scarica ${f.name}`, title: 'Scarica' }, icon('download')),
    mine || app.can('hacker') ? h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': `Elimina ${f.name}`, title: 'Elimina',
      onclick: () => confirmDialog('Eliminare il file?', f.name, 'Elimina', async () => { await del(`/api/files/${f.id}`).catch(toastError); refresh(); }),
    }, icon('trash')) : null);

  const section = (title, list, mine, emptyText) => h('section', { class: 'card glass' },
    h('div', { class: 'card-head' }, h('h2', {}, title), h('span', { class: 'chip' }, String(list.length))),
    list.length ? h('ul', { class: 'list' }, list.map((f) => row(f, mine))) : h('div', { class: 'empty' }, emptyText));

  el.replaceChildren(
    pageHead('File', 'Carica un file per te, oppure invialo a un collega o a tutto il team.'),
    h('section', { class: 'card glass' },
      h('div', { class: 'upload-grid' }, drop, field('Destinatario', to), send),
      progress),
    h('div', { class: 'two-col', style: 'margin-top:18px' },
      section('Ricevuti', files.received, false, 'Nessun file ricevuto.'),
      section('I miei file', files.mine, true, 'Non hai ancora caricato file.')));
}

// ---- Profilo ---------------------------------------------------------------
export async function viewProfile(el) {
  el.replaceChildren(
    pageHead('Profilo', `${app.user.username} · ${app.state.roles[app.user.role]}`),
    h('div', { class: 'two-col' },
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'I tuoi dati')),
        form([
          field('Nome e cognome', h('input', { type: 'text', name: 'name', maxlength: '80', value: app.user.name })),
          h('button', { class: 'btn primary', type: 'submit' }, 'Salva'),
        ], async (v) => { await patch('/api/me', v); toast('Profilo aggiornato.'); await boot(); })),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Cambia password')),
        form([
          field('Password attuale', h('input', { type: 'password', name: 'current', autocomplete: 'current-password' })),
          field('Nuova password (almeno 8 caratteri)', h('input', { type: 'password', name: 'next', autocomplete: 'new-password' })),
          field('Ripeti la nuova password', h('input', { type: 'password', name: 'repeat', autocomplete: 'new-password' })),
          h('button', { class: 'btn primary', type: 'submit' }, 'Cambia password'),
        ], async (v, f) => {
          if (v.next !== v.repeat) throw new Error('Le due password non coincidono.');
          await post('/api/me/password', v); f.reset(); toast('Password cambiata.');
        })),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Segnala un problema')),
        form([
          field('Cosa non funziona?', h('input', { type: 'text', name: 'message', maxlength: '500' })),
          field('Dettagli (facoltativo): cosa stavi facendo, cosa ti aspettavi', h('textarea', { name: 'detail', maxlength: '4000' })),
          h('button', { class: 'btn primary', type: 'submit' }, 'Invia segnalazione'),
        ], async (v, f) => { await post('/api/issues', v); f.reset(); toast('Segnalazione inviata. Grazie.'); }))));
}
