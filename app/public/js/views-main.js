// Schermate visibili a tutti: Home, App e programmi, File, Profilo.
import { get, post, patch, del, upload } from './api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtBytes, fmtDate, pageHead, meter, markdown, avatarEl } from './ui.js';
import { app, refresh, boot, roleText } from './app.js';
import { myDeadlinesCard } from './celle.js';

// ---- Home ------------------------------------------------------------------
export async function viewHome(el) {
  const d = await get('/api/dashboard');
  const tile = (label, value, sub, href) => h(href ? 'a' : 'div', { class: 'tile glass', href },
    h('div', { class: 'label' }, label), h('div', { class: 'value' }, String(value)), sub ? h('div', { class: 'sub' }, sub) : null);

  const tiles = [
    tile('I tuoi progetti', d.projects, app.can('hacker') ? 'tutti quelli del portale' : 'a cui partecipi', '#/progetti'),
    tile('Programmi disponibili', d.programs, 'da aprire dal portale', '#/programmi'),
    tile('I miei file', d.myFiles, 'caricati da te', '#/file'),
    tile('File ricevuti', d.received, 'dai colleghi', '#/file'),
  ];
  if (d.team) tiles.push(tile('Persone attive', d.team.active, d.team.pending ? `${d.team.pending} in attesa di approvazione` : d.team.neverLogged ? `${d.team.neverLogged} non ancora entrate` : 'tutte hanno fatto accesso', '#/team'));
  if (d.system) {
    tiles.push(tile('Problemi aperti', d.system.openIssues, 'errori e segnalazioni', '#/problemi'));
    const t = tile('Spazio usato', fmtBytes(d.system.usedBytes), `su ${fmtBytes(d.system.quotaBytes)}`, '#/sistema');
    t.append(meter(d.system.usedBytes / d.system.quotaBytes));
    tiles.push(t);
  }

  const newAnnouncement = () => {
    const m = modal('Nuovo annuncio', form([
      field('Titolo', h('input', { type: 'text', name: 'title', maxlength: '120' }), 'Una riga che riassume l\'annuncio. Lo vedono tutti nella Home.'),
      field('Testo', h('textarea', { name: 'body', maxlength: '2000' }), 'Il messaggio completo, facoltativo. Puoi andare a capo.'),
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

  const deadlines = await myDeadlinesCard();
  el.replaceChildren(
    pageHead(`Ciao, ${app.user.name.split(' ')[0]}`, 'Ecco cosa c\'è nel portale oggi.'),
    h('div', { class: 'tiles' }, tiles),
    deadlines,
    h('section', { class: 'card glass' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Annunci'),
        app.can('manager') ? h('button', { class: 'btn sm', type: 'button', onclick: newAnnouncement }, icon('plus'), 'Nuovo annuncio') : null),
      announcements));
}

// ---- Programmi -------------------------------------------------------------
function programEditor(p) {
  const isNew = !p;
  const m = modal(isNew ? 'Nuovo programma' : `Modifica ${p.name}`, form([
    field('Nome', h('input', { type: 'text', name: 'name', maxlength: '80', value: p ? p.name : '' }), 'Il nome del programma come lo vedranno gli utenti. Esempio: Verbale Studio'),
    field('Versione', h('input', { type: 'text', name: 'version', maxlength: '30', placeholder: 'es. 1.0', value: p ? p.version : '' }), 'Il numero della versione che stai pubblicando, per capire chi ha quella aggiornata. Esempio: 1.2'),
    field('Descrizione breve', h('input', { type: 'text', name: 'description', maxlength: '300', value: p ? p.description : '' }), 'Una frase su cosa fa il programma. Compare nella scheda.'),
    field('Indirizzo dell\'app (solo se ha un proprio motore)', h('input', { type: 'text', name: 'url', placeholder: 'es. http://localhost:3000', value: p ? p.url : '' }), 'Lascia vuoto per le web app fatte di soli file. Se il programma va avviato con un suo file .bat e poi si apre nel browser, copia qui l\'indirizzo che compare nella barra del browser: il pulsante Apri porterà lì.'),
    field('Guida all\'uso', h('textarea', { class: 'tall', name: 'guide', value: p ? p.guide : '' }), 'La documentazione che gli utenti leggono con il pulsante Guida. Testo semplice: # per i titoli, - per gli elenchi, **grassetto** tra doppi asterischi.'),
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

// ---- App del catalogo -------------------------------------------------------------
// Le app dedicate (Verbale Studio, GestioneCelle, ...) hanno una versione propria e si aprono in tre modi:
//   nel browser (sempre), installate come app del browser (finestra a se', nessun setup),
//   oppure scaricate sul PC con HSPI Client (collegamento sul desktop, motore locale, aggiornamenti automatici).
const CLIENT = 'http://127.0.0.1:4320';
async function clientState() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1200);
  try { const r = await fetch(`${CLIENT}/stato`, { signal: ctrl.signal }); const d = r.ok ? await r.json() : null; return d && d.app === 'hspi-client' ? d : null; } catch { return null; } finally { clearTimeout(t); }
}
async function clientCall(pathname, body) {
  const r = await fetch(CLIENT + pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `HSPI Client: errore ${r.status}`);
  return d;
}

function novitaDialog(a) {
  modal(`Novità · ${a.name}`, h('div', {},
    a.novita.length ? a.novita.map((n) => h('div', { style: 'margin-bottom:12px' },
      h('h3', {}, `v${n.version}`, n.date ? h('span', { class: 'small muted' }, ` · ${n.date.split('-').reverse().join('/')}`) : null),
      h('ul', { style: 'margin:6px 0 0;padding-left:20px' }, (n.items || []).map((x) => h('li', {}, x)))))
      : h('p', { class: 'muted' }, 'Nessuna nota per questa versione.'),
    a.engine ? h('p', { class: 'note' }, `Sul PC, con HSPI Client: ${a.engine.does}.`) : null));
}

async function catalogSection() {
  const [{ apps }, client] = await Promise.all([get('/api/catalogo'), clientState()]);
  const box = h('div', { class: 'grid' });
  const draw = (cl) => box.replaceChildren(...apps.map((a) => appCard(a, cl, async () => draw(await clientState()))));
  draw(client);
  return h('section', { class: 'catalog' },
    h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline;margin:4px 0 10px' },
      h('h2', {}, 'App del portale'),
      h('span', { class: 'small muted' }, client ? `HSPI Client aperto su questo PC (v${client.version})` : h('span', {}, 'HSPI Client non aperto su questo PC · ', h('a', { href: '/scarica', target: '_blank', rel: 'noopener' }, 'scaricalo')))),
    box);
}

function appCard(a, client, redraw) {
  const local = client && client.apps ? client.apps[a.id] : null;
  const run = (fn) => async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try { await fn(); } catch (err) { toastError(err); } finally { b.disabled = false; }
  };
  const install = run(async () => {
    const r = await clientCall('/app/installa', { id: a.id });
    toast(r.updated ? `${a.name} aggiornata alla versione ${r.version}.` : `${a.name} è sul tuo PC: trovi il collegamento sul desktop.`);
    await redraw();
  });
  const openLocal = run(async () => { await clientCall('/app/apri', { id: a.id }); toast(`Apro ${a.name}…`); });
  const actions = [h('a', { class: 'btn primary sm', href: a.web, target: '_blank', rel: 'noopener' }, icon('play'), 'Apri')];
  if (client) {
    if (local) {
      actions.push(h('button', { class: 'btn sm', type: 'button', onclick: openLocal, title: 'Apre l\'app nella sua finestra, dal tuo PC' }, icon('apps'), 'Apri sul PC'));
      if (local !== a.version) actions.push(h('button', { class: 'btn sm', type: 'button', onclick: install }, icon('download'), `Aggiorna a v${a.version}`));
    } else actions.push(h('button', { class: 'btn sm', type: 'button', onclick: install, title: 'HSPI Client scarica il pacchetto e crea il collegamento sul desktop' }, icon('download'), 'Scarica sul PC'));
  } else {
    actions.push(h('a', { class: 'btn sm', href: `${a.web}?installa=1`, target: '_blank', rel: 'noopener', title: 'Installa l\'app nel browser: una finestra a sé, senza setup' }, icon('download'), 'Installa nel browser'));
  }
  actions.push(h('button', { class: 'btn sm', type: 'button', onclick: () => novitaDialog(a) }, icon('book'), 'Novità'));
  const status = local
    ? (local === a.version ? h('span', { class: 'chip ok' }, 'Sul tuo PC') : h('span', { class: 'chip warn' }, `Sul PC: v${local}`))
    : null;
  return h('article', { class: 'program glass app-card', 'data-app': a.id },
    h('div', { class: 'program-top' },
      h('img', { class: 'app-icon', src: a.icon, alt: '' }),
      h('div', {}, h('h3', {}, a.name),
        h('div', { class: 'row', style: 'gap:6px;margin-top:4px' }, h('span', { class: 'chip' }, `v${a.version}`), status,
          a.compatible ? null : h('span', { class: 'chip danger', title: `Richiede il portale ${a.minPortal}` }, 'Da aggiornare il portale')))),
    h('p', {}, a.summary),
    h('div', { class: 'row' }, actions));
}

export async function viewPrograms(el) {
  const [programs, catalog] = await Promise.all([get('/api/programs'), catalogSection()]);
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
    // Web app in apptools: si apre in una nuova scheda. File caricato: si scarica.
    const state = p.url ? h('span', { class: 'chip warn', title: 'Va avviato a parte prima di aprirlo' }, 'Motore proprio')
      : p.openUrl ? h('span', { class: 'chip ok' }, 'Web app')
      : p.hasFile ? h('span', { class: 'chip ok' }, fmtBytes(p.fileSize))
        : h('span', { class: 'chip warn' }, p.folder ? 'Pagina iniziale non trovata' : 'Non ancora disponibile');
    return h('article', { class: 'program glass' },
      h('div', { class: 'program-top' },
        h('div', { class: 'program-icon', 'aria-hidden': 'true' }, p.name[0].toUpperCase()),
        h('div', {}, h('h3', {}, p.name),
          h('div', { class: 'row', style: 'gap:6px;margin-top:4px' }, p.version ? h('span', { class: 'chip' }, `v${p.version}`) : null, state))),
      h('p', {}, p.description || 'Nessuna descrizione.'),
      h('div', { class: 'row' },
        p.openUrl ? h('a', { class: 'btn primary sm', href: p.openUrl, target: '_blank', rel: 'noopener' }, icon('play'), 'Apri') : null,
        p.hasFile ? h('a', { class: 'btn sm' + (p.openUrl ? '' : ' primary'), href: `/api/programs/${p.id}/download` }, icon('download'), 'Scarica') : null,
        h('button', { class: 'btn sm', type: 'button', onclick: () => modal(`Guida · ${p.name}`, markdown(p.guide), { wide: true }) }, icon('book'), 'Guida')),
      canEdit ? h('div', { class: 'row' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => programEditor(p) }, icon('edit'), 'Modifica'),
        p.folder ? null : h('button', { class: 'btn sm', type: 'button', onclick: uploadFile }, icon('upload'), p.hasFile ? 'Sostituisci file' : 'Carica file'),
        status) : null,
      canEdit && p.folder ? h('div', { class: 'small muted mono' }, `apptools/${p.folder}`) : null);
  };

  el.replaceChildren(
    pageHead('App e programmi', 'Le app del portale si aprono nel browser oppure si scaricano sul PC con HSPI Client, senza installazioni. Sotto, gli altri strumenti del team.'),
    catalog,
    h('h2', { style: 'margin:26px 0 10px' }, 'Programmi del team'),
    programs.length ? h('div', { class: 'grid' }, programs.map(card)) : h('div', { class: 'card glass empty' }, 'Nessun programma disponibile.'),
    canEdit ? h('p', { class: 'note', style: 'margin-top:16px' }, 'I programmi arrivano dalla cartella "apptools": ogni sottocartella con una web app compare qui da sola. Descrizione, versione e guida si scrivono con Modifica.') : null);
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
      h('div', { class: 'upload-grid' }, drop, field('Destinatario', to, 'Solo per me: il file resta nel tuo archivio. Tutti: lo vede ogni persona del portale. Un nome: lo riceve solo quella persona.'), send),
      progress),
    h('div', { class: 'two-col', style: 'margin-top:18px' },
      section('Ricevuti', files.received, false, 'Nessun file ricevuto.'),
      section('I miei file', files.mine, true, 'Non hai ancora caricato file.')));
}

// ---- Profilo ---------------------------------------------------------------
export async function viewProfile(el) {
  const avatars = await get('/api/avatars');
  const current = app.user.avatar;

  const pick = (a) => h('button', {
    class: 'avatar-pick' + (a.url === current ? ' selected' : ''), type: 'button',
    title: a.requires ? `Riservato: ${app.state.titles[a.requires]}` : 'Scegli questo avatar',
    'aria-label': a.requires ? `Avatar riservato a ${app.state.titles[a.requires]}` : 'Scegli questo avatar',
    'aria-pressed': String(a.url === current),
    onclick: async () => {
      try { await patch('/api/me', { avatar: a.name }); toast('Avatar aggiornato.'); await boot(); } catch (err) { toastError(err); }
    },
  }, h('img', { src: a.url, alt: '', loading: 'lazy' }));

  const free = avatars.filter((a) => !a.requires);
  const groups = Object.entries(app.state.titles).map(([key, label]) => {
    const list = avatars.filter((a) => a.requires === key);
    if (!list.length) return null;
    const locked = list.every((a) => a.locked);
    return h('div', { style: 'margin-top:18px' },
      h('div', { class: 'row', style: 'margin-bottom:10px' }, h('h3', {}, label),
        h('span', { class: 'chip ' + (locked ? 'warn' : 'ok') }, locked ? 'Bloccati' : 'Sbloccati')),
      locked
        ? h('div', { class: 'avatar-grid locked' }, list.map((a) => h('span', { class: 'avatar-pick', title: `Si sblocca con la qualifica ${label}` }, h('img', { src: a.url, alt: '', loading: 'lazy' }))))
        : h('div', { class: 'avatar-grid' }, list.map(pick)));
  });

  el.replaceChildren(
    pageHead('Profilo', 'La tua immagine, i tuoi dati e la password.'),
    h('section', { class: 'card glass' },
      h('div', { class: 'profile-top' },
        avatarEl(app.user, 'xl'),
        h('div', {}, h('h2', {}, app.user.name),
          h('div', { class: 'muted mono', style: 'margin:4px 0 8px' }, app.user.username),
          h('span', { class: `chip ${app.user.role}` }, roleText(app.user)))),
      h('div', { class: 'card-head' }, h('h3', {}, 'Scegli il tuo avatar')),
      free.length ? h('div', { class: 'avatar-grid' }, free.map(pick)) : h('div', { class: 'empty' }, 'Nessun avatar disponibile nella cartella "avatar".'),
      groups,
      h('p', { class: 'small muted', style: 'margin-top:16px' }, 'Gli avatar con l\'anello colorato sono riservati: si sbloccano quando l\'Hacker ti assegna la qualifica corrispondente.')),
    h('div', { class: 'two-col', style: 'margin-top:18px' },
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'I tuoi dati')),
        form([
          field('Nome e cognome', h('input', { type: 'text', name: 'name', maxlength: '80', value: app.user.name }), 'Come compari ai colleghi nel portale. Il nome utente per accedere non cambia.'),
          h('button', { class: 'btn primary', type: 'submit' }, 'Salva'),
        ], async (v) => { await patch('/api/me', v); toast('Profilo aggiornato.'); await boot(); })),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Cambia password')),
        form([
          field('Password attuale', h('input', { type: 'password', name: 'current', autocomplete: 'current-password' }), 'La password con cui sei entrato adesso.'),
          field('Nuova password', h('input', { type: 'password', name: 'next', autocomplete: 'new-password' }), 'Almeno 8 caratteri, diversa da quella attuale.'),
          field('Ripeti la nuova password', h('input', { type: 'password', name: 'repeat', autocomplete: 'new-password' }), 'Riscrivi la nuova password per evitare errori di battitura.'),
          h('button', { class: 'btn primary', type: 'submit' }, 'Cambia password'),
        ], async (v, f) => {
          if (v.next !== v.repeat) throw new Error('Le due password non coincidono.');
          await post('/api/me/password', v); f.reset(); toast('Password cambiata.');
        })),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Segnala un problema')),
        form([
          field('Cosa non funziona?', h('input', { type: 'text', name: 'message', maxlength: '500' }), 'Una frase che descrive il problema. Esempio: il download di Verbale Studio non parte.'),
          field('Dettagli (facoltativo)', h('textarea', { name: 'detail', maxlength: '4000' }), 'Cosa stavi facendo, cosa ti aspettavi e cosa è successo invece. La segnalazione arriva all\'Hacker.'),
          h('button', { class: 'btn primary', type: 'submit' }, 'Invia segnalazione'),
        ], async (v, f) => { await post('/api/issues', v); f.reset(); toast('Segnalazione inviata. Grazie.'); }))));
}
