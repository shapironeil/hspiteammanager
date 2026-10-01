// Schermate riservate: Team/Account (manager e hacker), Log, Errori e bug, Sistema (hacker).
import { get, post, patch, del } from './api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtBytes, fmtDate, pageHead, meter, avatarEl, usernamePreview, gradeChip } from './ui.js';
import { app, refresh, boot } from './app.js';

const roleChip = (role) => h('span', { class: `chip ${role}` }, app.state.roles[role] || role);
const gradeSelect = (value) => h('select', { name: 'gradeId' },
  [...app.state.grades].reverse().map((g) => h('option', { value: String(g.id), selected: g.id === value }, g.name)));
const INFO_GRADE = 'Il grado nella gerarchia del team (Stage, Dipendente, PM manager, Manager, Senior manager…). Decide i permessi e chi vede le statistiche di chi. I gradi si gestiscono in Ruoli.';
const INFO_HACKER = 'Vede e gestisce tutto. È nascosto: gli altri vedono solo il grado.';
const titleSelect = (value) => h('select', { name: 'title' },
  h('option', { value: '' }, 'Nessuna'),
  Object.entries(app.state.titles).map(([k, label]) => h('option', { value: k, selected: k === value }, label)));

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
    field('Grado', gradeSelect((app.state.grades.find((g) => g.name === 'Dipendente') || {}).id), INFO_GRADE),
    field('Qualifica', titleSelect(''), INFO_TITLE),
    field('Password provvisoria', h('input', { type: 'text', name: 'password', autocomplete: 'off' }), 'Almeno 8 caratteri. La comunichi tu alla persona: al primo accesso dovrà sceglierne una nuova.'),
    h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea account')),
  ], async (v) => { const r = await post('/api/users', { ...v, gradeId: Number(v.gradeId) }); m.close(); toast(`Account creato: ${r.username}`); refresh(); }));
}

// Più persone insieme: una per riga, "Nome Cognome; Grado".
function bulkCreator() {
  const names = app.state.grades.map((g) => g.name).join(', ');
  const m = modal('Aggiungi il team', form([
    field('Persone (una per riga)', h('textarea', { name: 'text', class: 'tall', placeholder: 'Mario Rossi; Manager\nGiulia Bianchi; Dipendente\nLuca Verdi; Stage' }),
      `Scrivi nome e cognome, poi un punto e virgola e il grado. Senza grado diventa Dipendente. Gradi disponibili: ${names}.`),
    h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea gli account')),
  ], async (v) => {
    const r = await post('/api/users/bulk', v);
    m.close();
    const rows = r.created.map((u) => `${u.name}\t${u.username}\t${u.password}\t${u.grade}`).join('\n');
    modal('Account creati', h('div', {},
      h('p', { class: 'muted', style: 'margin-bottom:10px' }, `${r.created.length} account creati. Comunica a ciascuno nome utente e password provvisoria: al primo accesso la cambieranno. Questa finestra non si potrà riaprire.`),
      r.created.length ? h('pre', { class: 'ex-text' }, 'Nome\tNome utente\tPassword provvisoria\tGrado\n' + rows) : null,
      r.created.length ? h('button', { class: 'btn', type: 'button', onclick: () => navigator.clipboard.writeText(rows).then(() => toast('Copiato.')) }, icon('copy'), 'Copia elenco') : null,
      r.errors.length ? h('div', { class: 'form-error', style: 'margin-top:10px' }, r.errors.join(' · ')) : null), { wide: true });
    refresh();
  }), { wide: true });
}

function accountEditor(u) {
  const m = modal(`Account · ${u.username}`, h('div', {},
    form([
      field('Nome e cognome', h('input', { type: 'text', name: 'name', maxlength: '80', value: u.name }), 'Come compare nel portale. Il nome utente non cambia.'),
      field('Grado', gradeSelect(u.grade && u.grade.id), INFO_GRADE),
      field('Qualifica', titleSelect(u.title), INFO_TITLE),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'hacker', checked: !!u.isHacker }), 'Hacker (nascosto)'),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Badge (anello attorno all\'avatar)'),
        h('div', { class: 'row' }, h('input', { type: 'color', name: 'badge', value: u.badge || '#2dd4bf' }),
          h('label', { class: 'check', style: 'margin:0' }, h('input', { type: 'checkbox', name: 'noBadge', checked: !u.badge }), 'Nessun badge'))),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'active', checked: u.active }), 'Account attivo (può accedere al portale)'),
      h('div', { class: 'modal-actions' },
        u.id !== app.user.id ? h('button', { class: 'btn danger left', type: 'button', onclick: () => deletePerson(u, m) }, icon('trash'), 'Elimina persona') : null,
        h('button', { class: 'btn primary', type: 'submit' }, 'Salva')),
    ], async (v) => {
      const body = { name: v.name, gradeId: Number(v.gradeId), title: v.title, hacker: v.hacker, active: v.active, badge: v.noBadge ? null : v.badge };
      await patch(`/api/users/${u.id}`, body); m.close(); toast('Account aggiornato.');
      if (u.id === app.user.id) await boot(); else refresh();
    }),
    h('h3', { style: 'margin:18px 0 12px' }, 'Reimposta password'),
    form([
      field('Nuova password provvisoria', h('input', { type: 'text', name: 'password', autocomplete: 'off' }), 'Almeno 8 caratteri. La persona dovrà cambiarla al prossimo accesso.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn', type: 'submit' }, 'Reimposta')),
    ], async (v) => { await post(`/api/users/${u.id}/reset-password`, v); m.close(); toast('Password reimpostata.'); refresh(); })));
}

function deletePerson(u, m) {
  confirmDialog(`Eliminare ${u.name}?`, `${u.name} non potrà più entrare e sparirà da elenchi e progetti. I suoi file non vengono cancellati: la cartella personale resta sul disco (rinominata) e i file inviati restano visibili all'Hacker.`, 'Elimina persona', async () => {
    try { await del(`/api/users/${u.id}`); m.close(); toast(`${u.name} eliminato.`); refresh(); } catch (err) { toastError(err); }
  });
}

export async function viewAccounts(el) {
  const users = await get('/api/users');
  const admin = app.can('hacker');
  const approve = async (u) => {
    try { await patch(`/api/users/${u.id}`, { active: true }); toast(`${u.name} può entrare nel portale.`); refresh(); } catch (err) { toastError(err); }
  };
  const rows = users.map((u) => h('tr', {},
    h('td', {}, h('div', { class: 'person' }, avatarEl(u, 'sm'), h('div', {}, u.name, h('div', { class: 'small muted' }, u.username)))),
    h('td', {}, h('div', { class: 'row', style: 'gap:6px' }, gradeChip(u.grade) || roleChip(u.role), u.isHacker ? h('span', { class: 'chip hacker', title: 'Hacker (lo vedi solo tu)' }, 'H') : null, u.title ? h('span', { class: 'chip' }, app.state.titles[u.title]) : null)),
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
      admin ? 'Approva le registrazioni, assegna gradi e qualifiche, disabilita o elimina chi non deve più entrare.' : 'Le persone abilitate al portale e il loro ultimo accesso.',
      admin ? h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: bulkCreator }, icon('users'), 'Aggiungi il team'),
        h('button', { class: 'btn primary', type: 'button', onclick: accountCreator }, icon('plus'), 'Nuovo account')) : null),
    h('section', { class: 'card glass' },
      waiting ? h('div', { class: 'card-head' }, h('h2', {}, 'Persone'), h('span', { class: 'chip warn' }, `${waiting} in attesa di approvazione`)) : null,
      h('div', { class: 'table-wrap' },
        h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Persona'), h('th', {}, 'Grado e qualifica'), h('th', {}, 'Stato'), h('th', {}, 'Ultimo accesso'), admin ? h('th', {}) : null)),
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
          h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'hostAi', checked: s.settings.hostAi }), 'AI locale (Ollama) anche sul PC del portale'),
          h('p', { class: 'hint' }, 'Spenta = consigliato: l\'AI gira sul PC di ognuno con HSPI Client e il PC del portale resta leggero.'),
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
          h('dt', {}, 'Voci nel log'), h('dd', {}, String(s.counts.logs)))),
      hostCard(s),
      backupCard()));
}

// Stato dell'host: memoria, carico, persone collegate, pacchetto client.
function hostCard(s) {
  const x = s.host;
  const used = x.memTotal - x.memFree;
  return h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Stato del PC del portale')),
    h('div', { class: 'tile', style: 'padding:0' }, h('div', { class: 'label' }, 'Memoria usata dal PC'), h('div', { class: 'value' }, `${fmtBytes(used)}`),
      h('div', { class: 'sub' }, `su ${fmtBytes(x.memTotal)} · il portale ne usa ${fmtBytes(x.rss)}`), meter(used / x.memTotal)),
    h('dl', { class: 'kv', style: 'margin-top:14px' },
      h('dt', {}, 'Processori'), h('dd', {}, String(x.cpus)),
      x.load && x.load[0] ? [h('dt', {}, 'Carico (1/5/15 min)'), h('dd', {}, x.load.map((v) => v.toFixed(2)).join(' · '))] : null,
      h('dt', {}, 'Persone collegate'), h('dd', {}, String(x.activeUsers)),
      h('dt', {}, 'HSPI Client'), h('dd', {}, x.clientPackage ? h('a', { href: '/scarica' }, `versione ${x.clientPackage.version} · pagina Scarica`) : 'pacchetto non disponibile')),
    h('p', { class: 'small muted', style: 'margin-top:10px' }, 'L\'host conserva i file e li invia (anche i video, a pezzi). I lavori pesanti, come l\'AI locale, girano sul PC di ognuno con HSPI Client.'));
}

// Backup: elenco, "esegui adesso", destinazione e copia aggiuntiva (es. un altro server).
function backupCard() {
  const box = h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Backup')), h('div', { class: 'empty' }, 'Carico…'));
  const load = async () => {
    const b = await get('/api/backups');
    const st = b.status || {};
    const last = st.last;
    const now = h('button', { class: 'btn sm primary', type: 'button', onclick: async (e) => {
      e.currentTarget.disabled = true;
      toast('Backup in corso: può richiedere qualche minuto la prima volta.');
      try { const r = await post('/api/backups'); toast(`Backup pronto: ${r.files} file (${r.copied} copiati, ${r.linked} già presenti).`); } catch (err) { toastError(err); }
      load();
    } }, 'Esegui adesso');
    box.replaceChildren(
      h('div', { class: 'card-head' }, h('h2', {}, 'Backup'), now),
      h('p', { class: 'small muted', style: 'margin-bottom:10px' }, 'Ogni giorno il portale salva una copia completa di dati, progetti, immagini e web app. I file non cambiati non occupano spazio in più. Si fa anche prima di ogni aggiornamento. Per ripristinare: ripristina.bat nella cartella del portale.'),
      h('dl', { class: 'kv' },
        h('dt', {}, 'Ultimo backup'), h('dd', {}, last ? `${fmtDate(last.at)} · ${last.files} file${last.errors ? ` · ${last.errors} non copiati` : ''}` : 'ancora nessuno'),
        st.running ? [h('dt', {}, 'In corso'), h('dd', {}, st.running.name)] : null,
        st.lastError ? [h('dt', {}, 'Ultimo errore'), h('dd', { style: 'color:var(--danger)' }, `${fmtDate(st.lastError.at)}: ${st.lastError.message}`)] : null,
        h('dt', {}, 'Cosa salva'), h('dd', { class: 'mono small' }, Object.values(b.areas).join(' · '))),
      b.backups.length ? h('details', { class: 'detail', style: 'margin-top:12px' }, h('summary', {}, `${b.backups.length} backup disponibili`),
        h('ul', { class: 'list' }, b.backups.map((x) => h('li', {}, h('div', { class: 'grow' }, h('div', { class: 'title mono small' }, x.name),
          h('div', { class: 'meta' }, `versione ${x.version || '?'} · ${x.files || '?'} file · ${fmtBytes(x.newBytes || 0)} nuovi${x.errors ? ` · ${x.errors} errori` : ''}`)))))) : null,
      form([
        field('Cartella dei backup', h('input', { type: 'text', name: 'dir', value: b.dir }), 'Dove si salvano i backup. Meglio un disco diverso da quello del portale. Lascia "Backup" per la cartella accanto al portale.'),
        field('Copia aggiuntiva (facoltativa)', h('input', { type: 'text', name: 'extraDir', value: b.extraDir || '', placeholder: 'es. \\\\server\\backup-hspi' }), 'Una seconda cartella, per esempio sull\'altro server: dopo ogni backup ci si copia anche lì.'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'auto', checked: b.auto }), 'Backup automatico ogni giorno'),
        h('button', { class: 'btn', type: 'submit' }, 'Salva impostazioni backup'),
      ], async (v) => { await patch('/api/backups/settings', v); toast('Impostazioni del backup salvate.'); load(); }));
  };
  load().catch((err) => box.replaceChildren(h('h2', {}, 'Backup'), h('p', { class: 'muted' }, err.message)));
  return box;
}

// ---- Ruoli (solo Hacker) ------------------------------------------------------
// Gerarchia dei gradi: crea, rinomina, colore, livello di permessi, ordine, elimina; sposta le persone tra i gradi.
export async function viewRoles(el) {
  const d = await get('/api/grades');
  const ordered = [...d.grades].sort((a, b) => b.position - a.position); // in alto il grado piu' alto
  const save = async (fn, msg) => { try { await fn(); if (msg) toast(msg); await boot(); } catch (err) { toastError(err); } };
  const move = (g, dir) => {
    const ids = [...d.grades].sort((a, b) => a.position - b.position).map((x) => x.id);
    const i = ids.indexOf(g.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    save(() => post('/api/grades/order', { ids }), 'Ordine aggiornato.');
  };
  const editGrade = (g) => {
    const m = modal(g ? `Grado · ${g.name}` : 'Nuovo grado', form([
      field('Nome', h('input', { type: 'text', name: 'name', maxlength: '40', value: g ? g.name : '' }), 'Come compare accanto al nome delle persone. Esempio: Senior manager.'),
      field('Colore', h('input', { type: 'color', name: 'color', value: g ? g.color : '#a89a8c' }), 'Il colore dell\'etichetta del grado.'),
      field('Permessi', h('select', { name: 'level' }, Object.entries(d.levels).map(([k, label]) => h('option', { value: k, selected: g ? g.level === k : k === 'dipendente' }, label))),
        'Base: progetti di cui è membro, file, verbali. Manager: in più crea progetti, sceglie le persone, aggiunge ospiti, pubblica annunci.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Salva')),
    ], async (v) => {
      if (g) await patch(`/api/grades/${g.id}`, v); else await post('/api/grades', v);
      m.close(); toast('Grado salvato.'); await boot();
    }));
  };
  const removeGrade = (g) => {
    const others = d.grades.filter((x) => x.id !== g.id);
    const target = h('select', {}, others.map((x) => h('option', { value: String(x.id) }, x.name)));
    const m = modal(`Eliminare il grado ${g.name}?`, h('div', {},
      g.people ? field(`Le ${g.people} persone con questo grado passano a`, target) : h('p', { class: 'muted' }, 'Nessuna persona ha questo grado.'),
      h('div', { class: 'modal-actions', style: 'margin-top:16px' },
        h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Annulla'),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => { m.close(); await save(() => del(`/api/grades/${g.id}?spostaIn=${target.value}`), 'Grado eliminato.'); } }, 'Elimina grado'))));
  };
  const personGrade = (u) => h('select', { 'aria-label': `Grado di ${u.name}`, onchange: (e) => save(() => patch(`/api/users/${u.id}`, { gradeId: Number(e.target.value) }), `${u.name}: grado aggiornato.`) },
    ordered.map((g) => h('option', { value: String(g.id), selected: g.id === u.gradeId }, g.name)));

  el.replaceChildren(
    pageHead('Ruoli', 'La gerarchia del team. In alto il grado più alto: chi sta sopra vede le statistiche di chi sta sotto. L\'Hacker è sopra a tutti ed è nascosto.',
      h('button', { class: 'btn primary', type: 'button', onclick: () => editGrade(null) }, icon('plus'), 'Nuovo grado')),
    h('div', { class: 'two-col' },
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Gradi')),
        h('ul', { class: 'list' }, ordered.map((g, i) => h('li', {},
          h('div', { class: 'grow' }, gradeChip(g), h('div', { class: 'meta', style: 'margin-top:4px' }, `${d.levels[g.level]} · ${g.people} persone`)),
          h('button', { class: 'icon-btn', type: 'button', title: 'Sposta su', 'aria-label': `Sposta su ${g.name}`, disabled: i === 0, onclick: () => move(g, 1) }, icon('up')),
          h('button', { class: 'icon-btn', type: 'button', title: 'Sposta giù', 'aria-label': `Sposta giù ${g.name}`, disabled: i === ordered.length - 1, onclick: () => move(g, -1) }, icon('down')),
          h('button', { class: 'icon-btn', type: 'button', title: 'Modifica', 'aria-label': `Modifica ${g.name}`, onclick: () => editGrade(g) }, icon('edit')),
          h('button', { class: 'icon-btn', type: 'button', title: 'Elimina', 'aria-label': `Elimina ${g.name}`, onclick: () => removeGrade(g) }, icon('trash')))))),
      h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Persone'), h('span', { class: 'chip' }, String(d.people.length))),
        h('ul', { class: 'list' }, d.people.map((u) => h('li', {}, avatarEl(u, 'sm'),
          h('div', { class: 'grow' }, h('div', { class: 'title' }, u.name, u.isHacker ? h('span', { class: 'chip hacker', style: 'margin-left:6px' }, 'H') : null),
            h('div', { class: 'meta' }, u.pending ? 'in attesa di approvazione' : u.active ? u.username : 'disabilitato')),
          personGrade(u)))))));
}

// ---- Il mio team: statistiche di chi sta sotto nella gerarchia -------------------------
export async function viewTeamStats(el) {
  const d = await get('/api/team/stats');
  const days = (iso) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86400000));
  el.replaceChildren(
    pageHead('Il mio team', 'Le persone sotto di te nella gerarchia: attività degli ultimi 30 giorni e accessi temporanei ai progetti.'),
    h('section', { class: 'card glass' },
      d.people.length ? h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Persona'), h('th', {}, 'Grado'), h('th', { class: 'num' }, 'Accessi'), h('th', { class: 'num' }, 'File'), h('th', { class: 'num' }, 'Verbali'), h('th', {}, 'Ospite ora in'), h('th', {}, 'Ultimo accesso'))),
        h('tbody', {}, d.people.map((u) => h('tr', {},
          h('td', {}, h('div', { class: 'person' }, avatarEl(u, 'sm'), h('div', {}, u.name, h('div', { class: 'small muted' }, u.username)))),
          h('td', {}, gradeChip(u.grade)),
          h('td', { class: 'num' }, String(u.logins30)),
          h('td', { class: 'num' }, String(u.files30)),
          h('td', { class: 'num' }, String(u.verbali30)),
          h('td', {}, u.guestNow.length ? u.guestNow.map((g) => h('div', { class: 'small' }, `${g.project} · ancora ${days(g.expiresAt)} gg`)) : h('span', { class: 'muted small' }, '—')),
          h('td', { class: 'nowrap' }, fmtDate(u.lastLogin))))))) : h('div', { class: 'empty' }, 'Nessuna persona sotto di te nella gerarchia.')),
    h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Storico accessi temporanei')),
      d.accessLog.length ? h('ul', { class: 'list' }, d.accessLog.map((a) => h('li', {}, icon('clock'),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, `${a.person} → ${a.project}`),
          h('div', { class: 'meta' }, `${a.days} giorni dal ${fmtDate(a.startsAt)}${a.addedBy ? ` · aggiunto da ${a.addedBy}` : ''}${a.note ? ` · ${a.note}` : ''}${a.endedAt ? ' · terminato' : Date.parse(a.expiresAt) < Date.now() ? ' · scaduto' : ' · in corso'}`)))))
        : h('div', { class: 'empty' }, 'Nessun accesso temporaneo registrato.')));
}
