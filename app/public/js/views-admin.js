// Schermate riservate: Team/Account (manager e hacker), Log, Errori e bug, Sistema (hacker).
import { get, post, patch } from './api.js';
import { h, icon, modal, form, field, toast, toastError, fmtBytes, fmtDate, pageHead, meter, avatarEl, usernamePreview } from './ui.js';
import { app, refresh, boot } from './app.js';

const roleChip = (role) => h('span', { class: `chip ${role}` }, app.state.roles[role] || role);
const roleSelect = (value) => h('select', { name: 'role' },
  Object.entries(app.state.roles).map(([k, label]) => h('option', { value: k, selected: k === value }, label)));

const titleSelect = (value) => h('select', { name: 'title' },
  h('option', { value: '' }, 'Nessuna'),
  Object.entries(app.state.titles).map(([k, label]) => h('option', { value: k, selected: k === value }, label)));

const INFO_ROLE = 'Decide cosa può fare nel portale. Dipendente: programmi, file e profilo. Manager: anche team, annunci e pubblicazione programmi. Hacker: tutto, compresi account, log ed errori.';
const INFO_TITLE = 'Descrive il lavoro della persona e sblocca gli avatar riservati a quella qualifica. Non cambia i permessi.';

// ---- Team / Account --------------------------------------------------------
function accountCreator() {
  const first = h('input', { type: 'text', name: 'firstName', maxlength: '40' });
  const last = h('input', { type: 'text', name: 'lastName', maxlength: '40' });
  const preview = h('strong', {}, 'nome.cognome');
  const update = () => { preview.textContent = usernamePreview(first.value, last.value) || 'nome.cognome'; };
  first.addEventListener('input', update);
  last.addEventListener('input', update);
  const m = modal('Nuovo account', form([
    field('Nome', first, 'Nome di battesimo della persona. Esempio: Mario'),
    field('Cognome', last, 'Cognome della persona. Con il nome forma il nome utente.'),
    h('div', { class: 'username-preview' }, 'Nome utente: ', preview, h('br'), 'Se esiste già, viene aggiunto un numero alla fine.'),
    field('Ruolo', roleSelect('dipendente'), INFO_ROLE),
    field('Qualifica', titleSelect(''), INFO_TITLE),
    field('Password provvisoria', h('input', { type: 'text', name: 'password', autocomplete: 'off' }), 'Almeno 8 caratteri. La comunichi tu alla persona: al primo accesso dovrà sceglierne una nuova.'),
    h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea account')),
  ], async (v) => { const r = await post('/api/users', v); m.close(); toast(`Account creato: ${r.username}`); refresh(); }));
}

function accountEditor(u) {
  const m = modal(`Account · ${u.username}`, h('div', {},
    form([
      field('Nome e cognome', h('input', { type: 'text', name: 'name', maxlength: '80', value: u.name }), 'Come compare nel portale. Il nome utente non cambia.'),
      field('Ruolo', roleSelect(u.role), INFO_ROLE),
      field('Qualifica', titleSelect(u.title), INFO_TITLE),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'active', checked: u.active }), 'Account attivo (può accedere al portale)'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Salva')),
    ], async (v) => {
      await patch(`/api/users/${u.id}`, v); m.close(); toast('Account aggiornato.');
      if (u.id === app.user.id) await boot(); else refresh();
    }),
    h('h3', { style: 'margin:18px 0 12px' }, 'Reimposta password'),
    form([
      field('Nuova password provvisoria', h('input', { type: 'text', name: 'password', autocomplete: 'off' }), 'Almeno 8 caratteri. La persona dovrà cambiarla al prossimo accesso.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'submit' }, 'Reimposta')),
    ], async (v) => { await post(`/api/users/${u.id}/reset-password`, v); m.close(); toast('Password reimpostata.'); refresh(); })));
}

export async function viewAccounts(el) {
  const users = await get('/api/users');
  const admin = app.can('hacker');
  const approve = async (u) => {
    try { await patch(`/api/users/${u.id}`, { active: true }); toast(`${u.name} può entrare nel portale.`); refresh(); } catch (err) { toastError(err); }
  };
  const rows = users.map((u) => h('tr', {},
    h('td', {}, h('div', { class: 'person' }, avatarEl(u, 'sm'), h('div', {}, u.name, h('div', { class: 'small muted' }, u.username)))),
    h('td', {}, h('div', { class: 'row', style: 'gap:6px' }, roleChip(u.role), u.title ? h('span', { class: 'chip' }, app.state.titles[u.title]) : null)),
    h('td', {}, u.pending ? h('span', { class: 'chip warn' }, 'In attesa di approvazione')
      : !u.active ? h('span', { class: 'chip danger' }, 'Disabilitato')
        : u.mustChange ? h('span', { class: 'chip warn' }, 'Password provvisoria') : h('span', { class: 'chip ok' }, 'Attivo')),
    h('td', { class: 'nowrap' }, fmtDate(u.lastLogin)),
    admin ? h('td', { class: 'num' }, h('div', { class: 'row end', style: 'flex-wrap:nowrap' },
      u.pending ? h('button', { class: 'btn primary sm', type: 'button', onclick: () => approve(u) }, 'Approva') : null,
      h('button', { class: 'btn sm', type: 'button', onclick: () => accountEditor(u) }, icon('edit'), 'Modifica'))) : null));

  const waiting = users.filter((u) => u.pending).length;
  el.replaceChildren(
    pageHead(admin ? 'Account' : 'Team',
      admin ? 'Approva le registrazioni, assegna ruoli e qualifiche, disabilita chi non deve più entrare.' : 'Le persone abilitate al portale e il loro ultimo accesso.',
      admin ? h('button', { class: 'btn primary', type: 'button', onclick: accountCreator }, icon('plus'), 'Nuovo account') : null),
    h('section', { class: 'card glass' },
      waiting ? h('div', { class: 'card-head' }, h('h2', {}, 'Persone'), h('span', { class: 'chip warn' }, `${waiting} in attesa di approvazione`)) : null,
      h('div', { class: 'table-wrap' },
        h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Persona'), h('th', {}, 'Ruolo e qualifica'), h('th', {}, 'Stato'), h('th', {}, 'Ultimo accesso'), admin ? h('th', {}) : null)),
          h('tbody', {}, rows)))));
}

// ---- Log attivita' ---------------------------------------------------------
export async function viewLogs(el) {
  const tbody = h('tbody', {});
  const load = async (q) => {
    const logs = await get('/api/logs' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    tbody.replaceChildren(...(logs.length ? logs.map((l) => h('tr', {},
      h('td', { class: 'nowrap' }, fmtDate(l.ts)),
      h('td', {}, l.username || '-'),
      h('td', { class: 'mono' }, l.action),
      h('td', {}, l.detail || ''),
      h('td', { class: 'mono' }, l.ip || ''))) : [h('tr', {}, h('td', { colspan: '5', class: 'muted' }, 'Nessuna attività trovata.'))]));
  };
  let timer;
  const search = h('input', {
    type: 'search', placeholder: 'Cerca per persona, azione o dettaglio', 'aria-label': 'Cerca nel log',
    oninput: () => { clearTimeout(timer); timer = setTimeout(() => load(search.value.trim()).catch(toastError), 250); },
  });
  el.replaceChildren(
    pageHead('Log attività', 'Chi ha fatto cosa: accessi, caricamenti, download, modifiche. Ultime 300 voci.',
      h('button', { class: 'btn', type: 'button', onclick: () => load(search.value.trim()).then(() => toast('Log aggiornato.'), toastError) }, icon('refresh'), 'Aggiorna')),
    h('section', { class: 'card glass' },
      h('div', { style: 'max-width:420px;margin-bottom:12px' }, search),
      h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Quando'), h('th', {}, 'Chi'), h('th', {}, 'Azione'), h('th', {}, 'Dettaglio'), h('th', {}, 'IP'))),
        tbody))));
  await load('');
}

// ---- Errori e bug ----------------------------------------------------------
const KIND = { server: ['Errore server', 'danger'], client: ['Errore browser', 'warn'], segnalazione: ['Segnalazione', 'manager'] };

export async function viewIssues(el) {
  const issues = await get('/api/issues');
  const item = (i) => {
    const [label, cls] = KIND[i.kind] || [i.kind, ''];
    return h('li', { style: 'align-items:flex-start' },
      h('div', { class: 'grow' },
        h('div', { class: 'row', style: 'gap:8px;margin-bottom:4px' },
          h('span', { class: `chip ${cls}` }, label),
          i.resolved ? h('span', { class: 'chip ok' }, 'Risolto') : null,
          h('span', { class: 'meta' }, `${i.username || 'sistema'} · ${fmtDate(i.ts)}`)),
        h('div', { style: 'overflow-wrap:anywhere' }, i.message),
        i.detail ? h('details', { class: 'detail' }, h('summary', {}, 'Dettagli'), h('pre', {}, i.detail)) : null),
      h('button', {
        class: 'btn sm', type: 'button',
        onclick: async () => { await patch(`/api/issues/${i.id}`, { resolved: !i.resolved }).catch(toastError); refresh(); },
      }, i.resolved ? 'Riapri' : 'Segna risolto'));
  };
  const open = issues.filter((i) => !i.resolved).length;
  el.replaceChildren(
    pageHead('Errori e bug', 'Errori del server, errori nei browser degli utenti e segnalazioni inviate dal team.'),
    h('section', { class: 'card glass' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Da guardare'), h('span', { class: 'chip' + (open ? ' warn' : ' ok') }, `${open} aperti`)),
      issues.length ? h('ul', { class: 'list' }, issues.map(item)) : h('div', { class: 'empty' }, 'Nessun errore registrato.')));
}

// ---- Sistema ---------------------------------------------------------------
export async function viewSystem(el) {
  const s = await get('/api/system');
  const copy = (text) => navigator.clipboard.writeText(text).then(() => toast('Link copiato.'), () => toast('Copia non riuscita: seleziona il link a mano.', 'error'));
  const hours = Math.floor(s.uptimeSeconds / 3600);
  const minutes = Math.floor((s.uptimeSeconds % 3600) / 60);

  el.replaceChildren(
    pageHead('Sistema', 'Come raggiungere il portale, spazio di archiviazione e impostazioni.'),
    h('div', { class: 'two-col' },
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Link di accesso')),
        h('ul', { class: 'list' }, s.urls.map((u) => h('li', {},
          h('div', { class: 'grow' }, h('div', { class: 'title mono' }, u.url), h('div', { class: 'meta' }, u.label)),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Copia ${u.url}`, title: 'Copia', onclick: () => copy(u.url) }, icon('copy'))))),
        h('p', { class: 'small muted', style: 'margin-top:10px' }, s.networkOpen
          ? 'Modalità rete: i colleghi sulla stessa rete usano il link "Rete locale". Funziona solo se il firewall di Windows consente le connessioni in ingresso. Il PC deve restare acceso con il portale avviato.'
          : 'Modalità solo questo PC: il portale non è raggiungibile dagli altri computer. Per aprirlo alla rete locale si avvia con avvia-rete.bat, che richiede il permesso del firewall di Windows (account amministratore).')),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Archiviazione')),
        h('div', { class: 'tile', style: 'padding:0' },
          h('div', { class: 'value' }, fmtBytes(s.storage.usedBytes)),
          h('div', { class: 'sub' }, `usati su ${fmtBytes(s.storage.quotaBytes)} assegnati · ${s.storage.files} file`),
          meter(s.storage.usedBytes / s.storage.quotaBytes)),
        h('dl', { class: 'kv', style: 'margin-top:16px' },
          h('dt', {}, 'Libero sul disco'), h('dd', {}, fmtBytes(s.storage.diskFreeBytes)),
          h('dt', {}, 'Cartella dati'), h('dd', { class: 'mono' }, s.dataDir))),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Impostazioni')),
        form([
          field('Nome del portale', h('input', { type: 'text', name: 'portalName', maxlength: '60', value: s.settings.portalName }), 'Il nome mostrato nel login, nel menu e nella scheda del browser.'),
          field('Spazio totale assegnato (GB)', h('input', { type: 'number', name: 'quotaGb', min: '1', value: String(s.settings.quotaGb) }), 'Quanto spazio del disco può occupare in totale il portale con programmi e file caricati.'),
          field('Dimensione massima di un file (MB)', h('input', { type: 'number', name: 'maxFileMb', min: '1', value: String(s.settings.maxFileMb) }), 'Il limite per un singolo file caricato. 1024 MB = 1 GB.'),
          h('button', { class: 'btn primary', type: 'submit' }, 'Salva impostazioni'),
        ], async (v) => { await patch('/api/settings', v); toast('Impostazioni salvate.'); await boot(); })),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Risorse trovate')),
        h('ul', { class: 'list' },
          s.resources.map((r) => h('li', {}, h('div', { class: 'grow' }, h('div', { class: 'title' }, r.label),
            h('div', { class: 'meta mono' }, r.folders.length ? r.folders.join(', ') : 'nessuna cartella trovata')),
            h('span', { class: 'chip ' + (r.count ? 'ok' : 'warn') }, `${r.count} file`))),
          h('li', {}, h('div', { class: 'grow' }, h('div', { class: 'title' }, 'Web app in apptools'),
            h('div', { class: 'meta mono' }, s.apps.length ? s.apps.join(', ') : 'nessuna cartella trovata')),
            h('span', { class: 'chip ' + (s.apps.length ? 'ok' : 'warn') }, String(s.apps.length)))),
        h('p', { class: 'small muted', style: 'margin-top:10px' }, 'Se un logo o uno sfondo non compare, qui vedi se il portale ha trovato la cartella. I nomi riconosciuti sono in branding/README.md.')),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Stato')),
        h('dl', { class: 'kv' },
          h('dt', {}, 'Versione portale'), h('dd', {}, s.version),
          h('dt', {}, 'Node.js'), h('dd', {}, s.node),
          h('dt', {}, 'Sistema'), h('dd', {}, s.platform),
          h('dt', {}, 'Acceso da'), h('dd', {}, `${hours} h ${minutes} min`),
          h('dt', {}, 'Account'), h('dd', {}, String(s.counts.users)),
          h('dt', {}, 'Sessioni attive'), h('dd', {}, String(s.counts.sessions)),
          h('dt', {}, 'Voci nel log'), h('dd', {}, String(s.counts.logs))))));
}
