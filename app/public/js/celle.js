// GestioneCelle: mappe di processi macro → processo → micro, come il file BPB, ma nel portale.
// Albero navigabile con codici automatici (1, 1.2, 1.2.3), scheda di ogni voce (ambito, responsabile, scadenza,
// stato, note, storico), tabella filtrabile, controlli, eliminazione con conferme, import/export Excel.
import { get, post, patch, del, upload } from './api.js';
import { h, icon, modal, confirmDialog, form, field, toast, toastError, fmtDate, pageHead } from './ui.js';

const LEVEL = { 1: 'Macro processo', 2: 'Processo', 3: 'Micro processo' };
const CHILD = { 1: 'processo', 2: 'micro processo' };
const STATUS_CHIP = { 'da fare': '', 'in corso': 'warn', fatto: 'ok', bloccato: 'danger' };
const enc = encodeURIComponent;
const params = () => new URLSearchParams(location.hash.split('?')[1] || '');
const setHash = (q) => history.replaceState(null, '', `#/celle${q ? `?${q}` : ''}`);
const shortDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// ---- Elenco delle mappe ------------------------------------------------------------------
async function viewList(el) {
  const d = await get('/api/celle/maps');
  const byProject = new Map(d.projects.map((p) => [p.id, []]));
  for (const m of d.maps) byProject.get(m.projectId).push(m);
  const newMap = () => {
    if (!d.projects.length) return toastError(new Error('Non fai parte di nessun progetto: una mappa appartiene sempre a un progetto.'));
    const m = modal('Nuova mappa', form([
      field('Progetto', h('select', { name: 'projectId' }, d.projects.map((p) => h('option', { value: String(p.id) }, p.name))), 'La mappa la vedono le persone del progetto (e gli ospiti a tempo).'),
      field('Nome', h('input', { type: 'text', name: 'name', maxlength: '120', placeholder: 'es. BPB Regione' })),
      field('Descrizione (facoltativa)', h('input', { type: 'text', name: 'description', maxlength: '500' })),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Crea')),
    ], async (v) => {
      const r = await post('/api/celle/maps', { ...v, projectId: Number(v.projectId) });
      m.close();
      setHash(`mappa=${r.id}`);
      await viewCelle(el);
    }));
  };
  el.replaceChildren(h('div', { class: 'cg' },
    pageHead('GestioneCelle', 'Le mappe dei processi: macro (1), processi (1.2), micro processi (1.2.3). I codici si aggiornano da soli; il file Excel si importa e si esporta con le stesse formule.',
      h('button', { class: 'btn primary', type: 'button', onclick: newMap }, icon('plus'), 'Nuova mappa')),
    d.maps.length ? h('div', { class: 'grid' }, d.maps.map((m) => h('button', { class: 'project glass', type: 'button', onclick: () => { setHash(`mappa=${m.id}`); viewCelle(el).catch(toastError); } },
      h('div', { class: 'row', style: 'justify-content:space-between;width:100%' }, h('h3', {}, m.name), m.pendingRequests ? h('span', { class: 'chip warn' }, `${m.pendingRequests} richieste`) : null),
      h('div', { class: 'small muted' }, m.project),
      m.description ? h('p', {}, m.description) : null,
      h('div', { class: 'row', style: 'gap:6px' }, h('span', { class: 'chip' }, `${m.macros} macro`), h('span', { class: 'chip' }, `${m.processes} processi`), h('span', { class: 'chip' }, `${m.micros} micro`)),
      h('div', { class: 'small muted' }, `aggiornata ${fmtDate(m.updatedAt)}`))))
      : h('div', { class: 'card glass empty' }, 'Nessuna mappa. Creane una con "Nuova mappa": puoi partire da zero o importare un file Excel.')));
}

// ---- Importazione guidata ----------------------------------------------------------------
function importWizard(mapId, onDone) {
  const input = h('input', { type: 'file', accept: '.xlsx', onchange: async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const r = await upload(`/api/celle/import?name=${enc(file.name)}`, file);
      if (r.format === 'bpb') {
        const m = modal('Importa il file BPB', h('div', {},
          h('p', { class: 'muted' }, `Riconosciuto il formato BPB (tabelle Macro, Processi e BPB): ${r.summary.macros} macro, ${r.summary.processes} processi, ${r.summary.micros} micro processi. Ordine e codici restano quelli del file.`),
          h('div', { class: 'modal-actions', style: 'margin-top:16px' },
            h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Annulla'),
            h('button', { class: 'btn primary', type: 'button', onclick: async (e) => {
              e.currentTarget.disabled = true;
              try { const x = await post(`/api/celle/maps/${mapId}/import`, { token: r.token }); m.close(); report(x); onDone(); } catch (err) { toastError(err); e.currentTarget.disabled = false; }
            } }, 'Importa'))));
        return;
      }
      mappingDialog(mapId, r, onDone);
    } catch (err) { toastError(err); }
  } });
  input.click();
}
function report(x) {
  toast(`Importati ${x.macros} macro, ${x.processes} processi, ${x.micros} micro processi.${x.template ? ' Il file resta come origine: l\'Excel scaricato avrà il suo stesso aspetto.' : ''}`);
  if (x.warnings && x.warnings.length) modal('Da controllare dopo l\'importazione', h('ul', { class: 'small' }, x.warnings.map((w) => h('li', {}, w))));
}
// Foglio qualsiasi: si sceglie quali colonne sono macro, processo e micro.
function mappingDialog(mapId, r, onDone) {
  let sheet = r.sheets[0];
  const box = h('div', {});
  const selects = {};
  const draw = () => {
    const opts = (field) => h('select', { name: field }, h('option', { value: '' }, '— nessuna —'), sheet.headers.map((hd, i) => h('option', { value: String(i), selected: sheet.guess[field] === i }, hd)));
    for (const f of Object.keys(r.fields)) selects[f] = opts(f);
    box.replaceChildren(
      r.sheets.length > 1 ? field('Foglio', h('select', { onchange: (e) => { sheet = r.sheets.find((s) => s.name === e.target.value); draw(); } }, r.sheets.map((s) => h('option', { value: s.name, selected: s === sheet }, `${s.name} (${s.rows} righe)`)))) : null,
      h('p', { class: 'small muted', style: 'margin-bottom:10px' }, 'Indica in quale colonna sta ogni informazione. Le celle vuote di macro e processo prendono il valore della riga sopra (righe raggruppate).'),
      h('div', { class: 'grid2-form' }, Object.entries(r.fields).map(([f, label]) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), selects[f]))),
      h('details', { class: 'detail' }, h('summary', {}, 'Anteprima delle prime righe'), h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, sheet.headers.map((x) => h('th', {}, x)))),
        h('tbody', {}, sheet.sample.map((row) => h('tr', {}, row.map((v) => h('td', { class: 'small' }, v == null ? '' : String(v))))))))));
  };
  draw();
  const m = modal('Importa da un foglio Excel', h('div', {}, box,
    h('div', { class: 'modal-actions', style: 'margin-top:16px' }, h('button', { class: 'btn primary', type: 'button', onclick: async (e) => {
      const mapping = {};
      for (const [f, s] of Object.entries(selects)) if (s.value !== '') mapping[f] = Number(s.value);
      e.currentTarget.disabled = true;
      try { const x = await post(`/api/celle/maps/${mapId}/import`, { token: r.token, sheet: sheet.name, mapping }); m.close(); report(x); onDone(); } catch (err) { toastError(err); e.currentTarget.disabled = false; }
    } }, 'Importa'))), { wide: true });
}

// ---- Mappa --------------------------------------------------------------------------------
async function viewMap(el, mapId) {
  // "albero" e' il vecchio nome della vista Processi: i vecchi collegamenti funzionano ancora
  const state = { tab: ({ albero: 'processi' })[params().get('vista')] || params().get('vista') || 'processi', mod: { level: 0, q: '', changed: new Map(), last: '' }, selected: Number(params().get('voce')) || null, open: new Set(), filter: { q: '', ambito: '', stato: '', resp: '', late: false, issues: false } };
  let d;
  const byId = new Map();
  const load = async () => {
    d = await get(`/api/celle/maps/${mapId}`);
    byId.clear();
    const walk = (list, parent) => { for (const n of list) { n.parent = parent; byId.set(n.id, n); walk(n.children, n); } };
    walk(d.macros, null);
    if (state.selected && !byId.has(state.selected)) state.selected = null;
  };
  const remember = () => setHash(`mappa=${mapId}&vista=${state.tab}${state.selected ? `&voce=${state.selected}` : ''}`);
  const select = (id) => {
    state.selected = id;
    for (let n = byId.get(id); n; n = n.parent) state.open.add(n.id);
    remember();
    render();
  };
  const reload = async (sel) => { await load(); if (sel !== undefined) state.selected = sel; render(); };

  // --- intestazione e azioni
  // Con un file di origine l'Excel esportato e' quel file con i dati aggiornati: stessi colori, colonne, fogli e formule.
  const excelHint = () => (d.template
    ? `Il file ha lo stesso aspetto di «${d.template.name}», il file da cui è nata la mappa: stessi colori, colonne, fogli e formule.`
    : 'File Excel nel formato BPB di GestioneCelle (tre fogli: Istruzioni, BPB, Anagrafica). Da Impostazioni della mappa puoi scegliere un file Excel come origine.');
  const actions = () => h('div', { class: 'row' },
    !d.macros.length ? h('button', { class: 'btn', type: 'button', onclick: () => importWizard(mapId, () => reload()) }, icon('upload'), 'Importa Excel') : null,
    h('a', { class: 'btn', href: `/api/celle/maps/${mapId}/export`, title: excelHint() }, icon('download'), 'Scarica Excel'),
    h('button', { class: 'btn', type: 'button', title: `Salva il file Excel nella cartella del progetto (GestioneCelle/), con le versioni. ${excelHint()}`, onclick: async () => {
      try { const r = await post(`/api/celle/maps/${mapId}/export`); toast('Salvato nel progetto.'); window.open(`/#/esplora?spazio=${r.space}&percorso=GestioneCelle`, '_blank', 'noopener'); } catch (err) { toastError(err); }
    } }, icon('folder'), 'Salva nel progetto'),
    h('button', { class: 'icon-btn', type: 'button', title: 'Cestino', 'aria-label': 'Cestino', onclick: trashDialog }, icon('trash')),
    h('button', { class: 'icon-btn', type: 'button', title: 'Storico', 'aria-label': 'Storico', onclick: historyDialog }, icon('history')),
    d.canManage ? h('button', { class: 'icon-btn', type: 'button', title: 'Rinomina o elimina la mappa', 'aria-label': 'Impostazioni della mappa', onclick: mapSettings }, icon('edit')) : null);

  const tabs = () => h('div', { class: 'tabs tr-tabs', role: 'tablist' },
    [['processi', 'Processi'], ['tabella', 'Tabella'], ['modifica', 'Modifica'], ['controlli', `Controlli${d.issues.length ? ` (${d.issues.length})` : ''}`], ['richieste', `Richieste${d.requests.length ? ` (${d.requests.length})` : ''}`]]
      .map(([id, label]) => h('button', { class: 'tab' + (state.tab === id ? ' active' : ''), type: 'button', role: 'tab', onclick: () => { state.tab = id; remember(); render(); } }, label)));

  // --- albero
  const badges = (n) => [
    n.checks.length ? h('span', { class: 'tr-dot danger', title: n.checks.join(' · ') }) : null,
    n.overdue ? h('span', { class: 'chip danger tr-mini' }, 'scaduta') : n.dueDate ? h('span', { class: 'chip tr-mini' }, shortDate(n.dueDate)) : null,
    n.status ? h('span', { class: `chip tr-mini ${STATUS_CHIP[n.status] || ''}` }, n.status) : null,
  ];
  const treeRow = (n) => {
    const isOpen = state.open.has(n.id);
    const kids = n.children.length;
    return h('li', { class: 'tr-node' },
      h('div', { class: 'tr-row' + (state.selected === n.id ? ' active' : ''), 'data-level': n.level },
        n.level < 3 ? h('button', { class: 'tr-toggle', type: 'button', 'aria-label': isOpen ? 'Chiudi' : 'Apri', 'aria-expanded': String(isOpen), disabled: !kids,
          onclick: () => { if (isOpen) state.open.delete(n.id); else state.open.add(n.id); render(); } }, kids ? (isOpen ? '▾' : '▸') : '·') : h('span', { class: 'tr-toggle' }),
        h('button', { class: 'tr-label', type: 'button', onclick: () => select(n.id) },
          h('span', { class: 'tr-code' }, n.code), h('span', { class: 'tr-name' }, n.name || '(senza nome)'), kids ? h('span', { class: 'tr-count' }, String(kids)) : null),
        h('span', { class: 'tr-badges' }, badges(n))),
      isOpen && kids ? h('ul', { class: 'tr-list' }, n.children.map(treeRow)) : null);
  };

  // --- scheda della voce
  function detail(n) {
    if (!n) {
      return h('div', { class: 'empty' }, d.macros.length ? 'Scegli una voce dall\'elenco per vederla e modificarla.' : 'Mappa vuota: aggiungi il primo macro processo oppure importa un file Excel.',
        h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn primary', type: 'button', onclick: () => addChild(null) }, icon('plus'), 'Aggiungi macro processo')));
    }
    const save = async (body) => { try { await patch(`/api/celle/nodes/${n.id}`, body); await reload(n.id); } catch (err) { toastError(err); render(); } };
    const crumbs = [];
    for (let x = n; x; x = x.parent) crumbs.unshift(x);
    const input = (key, attrs = {}) => h('input', { type: 'text', value: n[key] ?? '', ...attrs, onchange: (e) => save({ [key]: e.target.value }) });
    const siblingsOf = n.parent ? n.parent.children : d.macros;
    const idx = siblingsOf.indexOf(n);
    const moveTo = (index, parentId) => post(`/api/celle/nodes/${n.id}/move`, { index, parentId }).then((r) => { toast(`${r.before} → ${r.after}`); return reload(n.id); }).catch(toastError);
    const parents = n.level === 1 ? [] : n.level === 2 ? d.macros : d.macros.flatMap((m) => m.children);
    const comments = h('div', {}, h('div', { class: 'empty' }, 'Carico…'));
    get(`/api/celle/nodes/${n.id}`).then((x) => comments.replaceChildren(
      h('h3', { class: 'tr-h3' }, 'Note del team'),
      x.comments.length ? h('ul', { class: 'list' }, x.comments.map((c) => h('li', { style: 'display:block' }, h('div', { class: 'meta' }, `${c.by || '?'} · ${fmtDate(c.at)}`), h('div', { style: 'white-space:pre-wrap' }, c.text)))) : h('div', { class: 'small muted' }, 'Nessuna nota.'),
      form([h('textarea', { name: 'text', placeholder: 'Scrivi una nota per il team…', style: 'min-height:60px' }), h('div', { class: 'row end' }, h('button', { class: 'btn sm', type: 'submit' }, 'Aggiungi nota'))],
        async (v) => { await post(`/api/celle/nodes/${n.id}/comments`, v); render(); }),
      h('details', { class: 'detail' }, h('summary', {}, 'Storico della voce'), h('ul', { class: 'list' }, x.history.map((hh) => h('li', { style: 'display:block' },
        h('div', { class: 'meta' }, `${fmtDate(hh.at)} · ${hh.by || 'sistema'} · ${hh.action}`), hh.detail ? h('div', { class: 'small mono', style: 'overflow-wrap:anywhere' }, describe(hh)) : null)))),
      h('div', { class: 'small muted', style: 'margin-top:8px' }, `Creata da ${x.createdBy || '?'} il ${fmtDate(x.createdAt)}${x.updatedBy ? ` · ultima modifica di ${x.updatedBy}` : ''}`))).catch(() => comments.replaceChildren());
    return h('div', { class: 'tr-detail' },
      h('div', { class: 'crumbs' }, h('button', { type: 'button', onclick: () => { state.selected = null; remember(); render(); } }, d.map.name),
        crumbs.map((c) => [h('span', { class: 'muted' }, '›'), h('button', { type: 'button', onclick: () => select(c.id) }, `${c.code} ${c.name}`.slice(0, 40))])),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:10px' },
        h('div', {}, h('span', { class: 'chip' }, LEVEL[n.level]), ' ', h('strong', { class: 'tr-bigcode' }, n.code)),
        h('div', { class: 'row', style: 'gap:4px' },
          h('button', { class: 'icon-btn', type: 'button', title: 'Sposta su', 'aria-label': 'Sposta su', disabled: idx <= 0, onclick: () => moveTo(idx - 1) }, icon('up')),
          h('button', { class: 'icon-btn', type: 'button', title: 'Sposta giù', 'aria-label': 'Sposta giù', disabled: idx >= siblingsOf.length - 1, onclick: () => moveTo(idx + 1) }, icon('down')),
          h('button', { class: 'icon-btn', type: 'button', title: 'Elimina', 'aria-label': 'Elimina', onclick: () => removeNode(n) }, icon('trash')))),
      n.checks.length ? h('div', { class: 'note', style: 'border-color:var(--danger);color:var(--danger);margin-bottom:12px' }, n.checks.join(' · ')) : null,
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Nome'), h('textarea', { class: 'tr-name-input', onchange: (e) => save({ name: e.target.value }) }, n.name)),
      h('div', { class: 'grid2-form' },
        n.level === 1 ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'ID Macro (N)'), input('macroCode', { type: 'number', min: '1', value: n.macroCode ?? '' })) : null,
        n.level === 3 ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Ambito'), h('input', { type: 'text', list: 'tr-ambiti', value: n.ambito, onchange: (e) => save({ ambito: e.target.value }) })) : null,
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Responsabile'), h('select', { onchange: (e) => save({ responsibleId: e.target.value || null }) },
          h('option', { value: '' }, '— nessuno —'), d.people.map((p) => h('option', { value: String(p.id), selected: p.id === n.responsibleId }, p.name)),
          n.responsibleId && !d.people.some((p) => p.id === n.responsibleId) ? h('option', { value: String(n.responsibleId), selected: true }, n.responsible || '?') : null)),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Scadenza'), h('input', { type: 'date', value: n.dueDate || '', onchange: (e) => save({ dueDate: e.target.value || null }) })),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Stato'), h('select', { onchange: (e) => save({ status: e.target.value }) }, d.statuses.map((s) => h('option', { value: s, selected: s === n.status }, s || '—'))))),
      n.level === 3 ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Dipartimenti coinvolti'), input('dipartimenti')) : null,
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Note (vanno anche nel file Excel)'), h('textarea', { style: 'min-height:70px', onchange: (e) => save({ note: e.target.value }) }, n.note)),
      d.canApprove ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: n.protected, onchange: (e) => save({ protected: e.target.checked }) }), 'Protetta: per eliminarla serve l\'ok di un Manager del progetto') : n.protected ? h('div', { class: 'small muted', style: 'margin-bottom:10px' }, '🔒 Voce protetta: per eliminarla serve l\'ok di un Manager del progetto.') : null,
      parents.length > 1 ? h('label', { class: 'field' }, h('span', { class: 'field-label' }, `Sposta in un altro ${n.level === 2 ? 'macro processo' : 'processo'}`),
        h('select', { onchange: (e) => e.target.value && moveTo(9999, Number(e.target.value)) }, h('option', { value: '' }, '— scegli —'),
          parents.filter((p) => p.id !== (n.parent && n.parent.id)).map((p) => h('option', { value: String(p.id) }, `${p.code} ${p.name}`.slice(0, 80))))) : null,
      n.level < 3 ? h('div', { class: 'tr-children' },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { class: 'tr-h3' }, `${n.level === 1 ? 'Processi' : 'Micro processi'} (${n.children.length})`),
          h('button', { class: 'btn sm', type: 'button', onclick: () => addChild(n) }, icon('plus'), `Aggiungi ${CHILD[n.level]}`)),
        n.children.length ? h('ul', { class: 'list' }, n.children.map((c) => h('li', {},
          h('button', { class: 'link title grow tr-link', type: 'button', onclick: () => select(c.id) }, h('span', { class: 'tr-code' }, c.code), ` ${c.name}`), h('span', { class: 'tr-badges' }, badges(c))))) : h('div', { class: 'small muted' }, 'Nessuna voce.')) : null,
      h('div', { class: 'row', style: 'margin:12px 0' }, h('button', { class: 'btn sm', type: 'button', onclick: () => addSibling(n) }, icon('plus'), `Aggiungi ${LEVEL[n.level].toLowerCase()} dopo questa`)),
      comments);
  }

  const describe = (hh) => {
    const x = hh.detail || {};
    if (hh.action === 'modificato') return Object.keys(x.after || {}).map((k) => `${k}: ${x.before[k] ?? '—'} → ${x.after[k] ?? '—'}`).join(' · ');
    if (hh.action === 'spostato') return `${x.before} → ${x.after}`;
    return [x.code, x.name, x.text, x.reason, x.file].filter(Boolean).join(' · ');
  };

  async function addChild(parent) {
    const level = parent ? parent.level + 1 : 1;
    const m = modal(`Nuovo ${LEVEL[level].toLowerCase()}`, form([
      field('Nome', h('textarea', { name: 'name', style: 'min-height:60px' }), parent ? `Dentro ${parent.code} ${parent.name}` : 'Il codice (ID Macro) è il primo numero libero: puoi cambiarlo dopo.'),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Aggiungi')),
    ], async (v) => {
      const r = await post(`/api/celle/maps/${mapId}/nodes`, { level, parentId: parent ? parent.id : null, name: v.name });
      m.close();
      toast(`Aggiunto ${r.code}.`);
      if (parent) state.open.add(parent.id);
      await reload(r.id);
    }));
  }
  async function addSibling(n) {
    const m = modal(`Nuovo ${LEVEL[n.level].toLowerCase()}`, form([
      field('Nome', h('textarea', { name: 'name', style: 'min-height:60px' }), `Va subito dopo ${n.code}: i codici successivi scalano di uno.`),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Aggiungi')),
    ], async (v) => {
      const r = await post(`/api/celle/maps/${mapId}/nodes`, { level: n.level, parentId: n.parent ? n.parent.id : null, name: v.name, afterId: n.id });
      m.close();
      toast(`Aggiunto ${r.code}.`);
      await reload(r.id);
    }));
  }

  // Eliminazione: si mostra cosa coinvolge; se servono altre persone parte una richiesta al Manager del progetto.
  async function removeNode(n) {
    let info;
    try {
      const res = await fetch(`/api/celle/nodes/${n.id}`, { method: 'DELETE', headers: { 'x-hspi': '1' }, credentials: 'same-origin' });
      info = await res.json();
      if (res.status !== 409) throw new Error(info.error || 'Operazione non riuscita.');
    } catch (err) { return toastError(err); }
    const i = info.impact;
    const lines = [
      i.processes ? `${i.processes} processi` : null, i.micros ? `${i.micros} micro processi` : null, i.comments ? `${i.comments} note del team` : null,
      i.withDue ? `${i.withDue} voci con scadenza aperta` : null, i.protected ? `${i.protected} voci protette` : null,
      i.otherResponsibles.length ? `voci di cui sono responsabili: ${i.otherResponsibles.join(', ')}` : null,
    ].filter(Boolean);
    const reason = h('input', { type: 'text', placeholder: 'Motivo (facoltativo, utile a chi approva)', maxlength: '300' });
    const m = modal(info.needsApproval ? 'Richiedi l\'eliminazione' : `Eliminare ${i.code}?`, h('div', {},
      h('p', {}, h('strong', {}, `${i.code} ${i.name}`)),
      lines.length ? h('div', {}, h('p', { class: 'muted' }, 'Insieme a questa voce vanno nel cestino:'), h('ul', {}, lines.map((l) => h('li', {}, l)))) : h('p', { class: 'muted' }, 'Non ci sono altre voci collegate.'),
      h('p', { class: 'small muted', style: 'margin:8px 0' }, info.needsApproval
        ? 'Ci sono voci protette o di altri responsabili: parte una richiesta ai Manager del progetto, che decidono se eliminarla.'
        : 'Va nel cestino della mappa: si può ripristinare. I codici delle voci successive scalano di uno.'),
      reason,
      h('div', { class: 'modal-actions', style: 'margin-top:16px' },
        h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Annulla'),
        h('button', { class: 'btn danger', type: 'button', onclick: async () => {
          try {
            const r = await fetch(`/api/celle/nodes/${n.id}?conferma=1&motivo=${enc(reason.value)}`, { method: 'DELETE', headers: { 'x-hspi': '1' }, credentials: 'same-origin' });
            const x = await r.json();
            if (!r.ok) throw new Error(x.error || 'Operazione non riuscita.');
            m.close();
            toast(x.requested ? 'Richiesta inviata ai Manager del progetto.' : `Eliminato (${x.deleted} voci nel cestino).`);
            await reload(x.requested ? n.id : (n.parent ? n.parent.id : null));
          } catch (err) { toastError(err); }
        } }, info.needsApproval ? 'Invia richiesta' : 'Elimina'))));
  }

  async function trashDialog() {
    const box = h('div', {}, h('div', { class: 'empty' }, 'Carico…'));
    const m = modal('Cestino della mappa', box, { wide: true });
    const x = await get(`/api/celle/maps/${mapId}/trash`).catch(toastError);
    if (!x) return;
    box.replaceChildren(x.items.length ? h('ul', { class: 'list' }, x.items.map((t) => h('li', {}, h('div', { class: 'grow' }, h('div', { class: 'title' }, `${LEVEL[t.level]}: ${t.name}`),
      h('div', { class: 'meta' }, `${t.items} voci · eliminato ${fmtDate(t.deletedAt)}${t.by ? ` da ${t.by}` : ''}`)),
      d.canManage ? h('button', { class: 'btn sm', type: 'button', onclick: async () => { try { await post(`/api/celle/nodes/${t.id}/restore`); m.close(); toast('Ripristinato.'); await reload(t.id); } catch (err) { toastError(err); } } }, icon('restore'), 'Ripristina') : null)))
      : h('div', { class: 'empty' }, 'Il cestino è vuoto.'));
  }
  async function historyDialog() {
    const x = await get(`/api/celle/maps/${mapId}/history`).catch(toastError);
    if (!x) return;
    modal('Storico della mappa', h('ul', { class: 'list' }, x.map((hh) => h('li', { style: 'display:block' }, h('div', { class: 'meta' }, `${fmtDate(hh.at)} · ${hh.by || 'sistema'} · ${hh.action}`),
      hh.detail ? h('div', { class: 'small' }, describe(hh)) : null))), { wide: true });
  }
  // Il file di origine della mappa: l'Excel esportato lo riproduce (colori, colonne, fogli). Si scarica, si sostituisce, si toglie.
  function templateBox(m) {
    const pick = () => {
      const input = h('input', { type: 'file', accept: '.xlsx', onchange: async () => {
        const file = input.files[0];
        if (!file) return;
        try { await upload(`/api/celle/maps/${mapId}/template?name=${enc(file.name)}`, file); toast('File di origine salvato: l\'Excel scaricato avrà il suo aspetto.'); m.close(); await reload(); } catch (err) { toastError(err); }
      } });
      input.click();
    };
    const t = d.template;
    // un div, non field(): dentro una <label> il clic sul testo attiverebbe il primo bottone (la scelta del file)
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'File di origine (aspetto dell\'Excel)'), h('div', {},
      h('p', { class: 'small muted', style: 'margin:0 0 8px' }, t
        ? `«${t.name}», importato ${fmtDate(t.importedAt)}${t.by ? ` da ${t.by}` : ''}. Scarica Excel e Salva nel progetto riproducono questo file con i dati aggiornati: stessi colori, intestazioni, colonne e fogli. Le colonne che il file non ha (per esempio Responsabile, Scadenza, Stato) restano solo in GestioneCelle.`
        : 'Nessun file di origine: l\'Excel usa il formato BPB di GestioneCelle. Scegli un file BPB (anche uno già esportato) perché l\'Excel scaricato abbia il suo stesso aspetto.'),
      h('div', { class: 'row' },
        t ? h('a', { class: 'btn sm', href: `/api/celle/maps/${mapId}/template` }, icon('download'), 'Scarica l\'originale') : null,
        h('button', { class: 'btn sm', type: 'button', onclick: pick }, icon('upload'), t ? 'Sostituisci…' : 'Scegli un file…'),
        t ? h('button', { class: 'btn sm', type: 'button', onclick: () => confirmDialog('Togliere il file di origine?', 'L\'Excel tornerà al formato BPB di GestioneCelle (colori e colonne standard). I dati della mappa non cambiano.', 'Togli', async () => {
          try { await del(`/api/celle/maps/${mapId}/template`); m.close(); await reload(); } catch (err) { toastError(err); }
        }) }, 'Togli') : null)));
  }
  function mapSettings() {
    const box = h('div', {});
    const m = modal('Mappa', form([
      field('Nome', h('input', { type: 'text', name: 'name', value: d.map.name, maxlength: '120' })),
      field('Descrizione', h('input', { type: 'text', name: 'description', value: d.map.description, maxlength: '500' })),
      box,
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn danger left', type: 'button', onclick: () => confirmDialog('Eliminare la mappa?', `"${d.map.name}" sparisce dall'elenco. Resta nel database e l'Hacker può recuperarla.`, 'Elimina mappa', async () => {
          try { await del(`/api/celle/maps/${mapId}`); m.close(); setHash(''); await viewCelle(el); } catch (err) { toastError(err); }
        }) }, 'Elimina mappa'),
        h('button', { class: 'btn primary', type: 'submit' }, 'Salva')),
    ], async (v) => { await patch(`/api/celle/maps/${mapId}`, v); m.close(); await reload(); }));
    box.replaceWith(templateBox(m));
  }

  // --- tabella (come il foglio BPB) con filtri
  function table() {
    const f = state.filter;
    const rows = [];
    for (const mac of d.macros) for (const p of mac.children) for (const u of p.children) rows.push({ mac, p, u });
    const match = ({ mac, p, u }) => (!f.q || `${u.code} ${mac.name} ${p.name} ${u.name} ${u.note} ${u.dipartimenti}`.toLowerCase().includes(f.q.toLowerCase()))
      && (!f.ambito || u.ambito === f.ambito) && (!f.stato || u.status === f.stato) && (!f.resp || String(u.responsibleId) === f.resp)
      && (!f.late || u.overdue) && (!f.issues || u.checks.length);
    const shown = rows.filter(match);
    const ctl = (key, el2) => { el2.addEventListener(el2.type === 'checkbox' ? 'change' : 'input', () => { f[key] = el2.type === 'checkbox' ? el2.checked : el2.value; render(); }); return el2; };
    return h('div', {},
      h('div', { class: 'tr-filters' },
        ctl('q', h('input', { type: 'search', placeholder: 'Cerca…', value: f.q })),
        ctl('ambito', h('select', {}, h('option', { value: '' }, 'Ogni ambito'), d.ambiti.map((a) => h('option', { value: a, selected: a === f.ambito }, a)))),
        ctl('stato', h('select', {}, h('option', { value: '' }, 'Ogni stato'), d.statuses.filter(Boolean).map((s) => h('option', { value: s, selected: s === f.stato }, s)))),
        ctl('resp', h('select', {}, h('option', { value: '' }, 'Ogni responsabile'), d.people.map((p) => h('option', { value: String(p.id), selected: String(p.id) === f.resp }, p.name)))),
        h('label', { class: 'check', style: 'margin:0' }, ctl('late', h('input', { type: 'checkbox', checked: f.late })), 'Scadute'),
        h('label', { class: 'check', style: 'margin:0' }, ctl('issues', h('input', { type: 'checkbox', checked: f.issues })), 'Con problemi'),
        h('span', { class: 'small muted' }, `${shown.length} di ${rows.length}`)),
      h('div', { class: 'table-wrap' }, h('table', { class: 'tr-table' },
        h('thead', {}, h('tr', {}, ['Codice', 'Macro', 'Processo', 'Sotto processo', 'Ambito', 'Responsabile', 'Scadenza', 'Stato', 'Check'].map((x) => h('th', {}, x)))),
        h('tbody', {}, shown.slice(0, 600).map(({ mac, p, u }) => h('tr', { class: 'tr-click', onclick: () => { state.tab = 'processi'; select(u.id); } },
          h('td', { class: 'mono nowrap' }, u.code), h('td', { class: 'small' }, mac.name), h('td', { class: 'small' }, p.name), h('td', {}, u.name),
          h('td', { class: 'small' }, u.ambito), h('td', { class: 'small' }, u.responsible || ''), h('td', { class: 'small nowrap' + (u.overdue ? ' tr-late' : '') }, shortDate(u.dueDate)),
          h('td', {}, u.status ? h('span', { class: `chip tr-mini ${STATUS_CHIP[u.status] || ''}` }, u.status) : ''),
          h('td', { class: 'small' + (u.checks.length ? ' tr-late' : '') }, u.checks.join('; ') || 'OK')))))),
      shown.length > 600 ? h('p', { class: 'small muted' }, 'Mostrate le prime 600 righe: usa i filtri.') : null);
  }

  function issuesView() {
    return d.issues.length ? h('ul', { class: 'list' }, d.issues.map((i) => h('li', {}, h('span', { class: 'tr-dot danger' }),
      h('button', { class: 'link title grow tr-link', type: 'button', onclick: () => { state.tab = 'processi'; select(i.id); } }, h('span', { class: 'tr-code' }, i.code), ` ${i.name}`),
      h('span', { class: 'small', style: 'color:var(--danger)' }, i.checks.join(' · ')))))
      : h('div', { class: 'empty' }, 'Nessun problema: codici, nomi e duplicati sono a posto.');
  }
  function requestsView() {
    return d.requests.length ? h('ul', { class: 'list' }, d.requests.map((r) => h('li', {},
      h('div', { class: 'grow' }, h('div', { class: 'title' }, `${r.code} ${r.name}`), h('div', { class: 'meta' }, `chiesta da ${r.by || '?'} il ${fmtDate(r.createdAt)}${r.reason ? ` · ${r.reason}` : ''}`)),
      d.canApprove ? [h('button', { class: 'btn sm', type: 'button', onclick: () => decide(r, false) }, 'Rifiuta'), h('button', { class: 'btn sm danger', type: 'button', onclick: () => decide(r, true) }, 'Elimina')] : h('span', { class: 'small muted' }, 'in attesa di un Manager'))))
      : h('div', { class: 'empty' }, 'Nessuna richiesta di eliminazione.');
  }
  const decide = async (r, approve) => { try { await post(`/api/celle/requests/${r.id}`, { approve }); toast(approve ? 'Eliminata.' : 'Richiesta rifiutata.'); await reload(); } catch (err) { toastError(err); } };

  // --- Modifica: a sinistra la tabella di riferimento (tutte le voci in ordine, come un foglio),
  // a destra le caratteristiche della voce scelta. Predecessore / successore / sotto-voce / sposta:
  // i codici di tutte le voci dopo si ricalcolano a cascata e il foglio mostra quali sono cambiati.
  const codesNow = () => new Map([...byId.values()].map((n) => [n.id, n.code]));
  async function cascade(label, fn) {
    const before = codesNow();
    let r;
    try { r = await fn(); } catch (err) { toastError(err); return; }
    await load();
    const changed = new Map();
    for (const n of byId.values()) if (before.has(n.id) && before.get(n.id) !== n.code) changed.set(n.id, before.get(n.id));
    state.mod.changed = changed;
    state.mod.last = `${label}${changed.size ? ` · ${changed.size} codici aggiornati a cascata` : ''}`;
    if (r && r.id) state.selected = r.id;
    remember();
    render();
  }
  const askName = (title, hint) => new Promise((resolve) => {
    const m = modal(title, form([
      field('Nome', h('textarea', { name: 'name', style: 'min-height:60px' }), hint),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', type: 'submit' }, 'Aggiungi')),
    ], async (v) => { m.close(); resolve(v.name); }));
  });
  async function insertAt(n, where) {
    const sibs = n.parent ? n.parent.children : d.macros;
    const idx = sibs.indexOf(n);
    const kind = LEVEL[n.level].toLowerCase();
    if (where === 'figlio') {
      if (n.level >= 3) return;
      const name = await askName(`Nuovo ${CHILD[n.level]}`, `Dentro ${n.code} ${n.name}, in fondo.`);
      return cascade(`Aggiunto ${CHILD[n.level]} in ${n.code}`, async () => { const r = await post(`/api/celle/maps/${mapId}/nodes`, { level: n.level + 1, parentId: n.id, name }); state.open.add(n.id); return r; });
    }
    const name = await askName(where === 'prima' ? `Nuovo ${kind} prima di ${n.code}` : `Nuovo ${kind} dopo ${n.code}`,
      where === 'prima' ? `Prende il posto di ${n.code}: ${n.code} e le voci dopo scalano di uno.` : `Va subito dopo ${n.code}: le voci dopo scalano di uno.`);
    const afterId = where === 'prima' ? (idx > 0 ? sibs[idx - 1].id : 0) : n.id;
    return cascade(where === 'prima' ? `Aggiunto predecessore di ${n.code}` : `Aggiunto successore di ${n.code}`,
      () => post(`/api/celle/maps/${mapId}/nodes`, { level: n.level, parentId: n.parent ? n.parent.id : null, name, afterId }));
  }
  const shiftNode = (n, delta) => {
    const sibs = n.parent ? n.parent.children : d.macros;
    const idx = sibs.indexOf(n);
    if (idx + delta < 0 || idx + delta >= sibs.length) return null;
    return cascade(`Spostato ${n.code}`, async () => { await post(`/api/celle/nodes/${n.id}/move`, { index: idx + delta, parentId: n.parent ? n.parent.id : null }); return { id: n.id }; });
  };
  function editor(selected) {
    const m = state.mod;
    const all = [];
    const walk = (list, depth) => { for (const n of list) { all.push({ n, depth }); walk(n.children, depth + 1); } };
    walk(d.macros, 0);
    const q = m.q.toLowerCase();
    const rows = all.filter(({ n }) => (!m.level || n.level === m.level) && (!q || `${n.code} ${n.name} ${n.responsible || ''}`.toLowerCase().includes(q)));
    const n = selected;
    const sibs = n ? (n.parent ? n.parent.children : d.macros) : [];
    const idx = n ? sibs.indexOf(n) : -1;
    const tool = (label, ico, fn, disabled, title) => h('button', { class: 'cg-tool', type: 'button', disabled: !n || disabled, title: title || label, onclick: fn }, icon(ico), h('span', {}, label));
    const ribbon = h('div', { class: 'cg-ribbon', role: 'toolbar', 'aria-label': 'Strumenti di modifica' },
      h('div', { class: 'cg-ribbon-group' },
        tool('Predecessore', 'up', () => insertAt(n, 'prima'), false, 'Aggiungi una voce dello stesso livello prima di questa'),
        tool('Successore', 'down', () => insertAt(n, 'dopo'), false, 'Aggiungi una voce dello stesso livello dopo questa'),
        tool(n && n.level < 3 ? `Aggiungi ${CHILD[n.level]}` : 'Sotto-voce', 'plus', () => insertAt(n, 'figlio'), n && n.level >= 3, 'Aggiungi una voce del livello sotto, in fondo')),
      h('div', { class: 'cg-ribbon-group' },
        tool('Sposta su', 'up', () => shiftNode(n, -1), idx <= 0),
        tool('Sposta giù', 'down', () => shiftNode(n, 1), idx < 0 || idx >= sibs.length - 1),
        tool('Elimina', 'trash', () => removeNode(n), false)),
      h('div', { class: 'cg-ribbon-group' }, h('button', { class: 'cg-tool', type: 'button', onclick: () => cascade('Aggiunto macro processo', async () => { const name = await askName('Nuovo macro processo', 'In fondo alla mappa, con il primo ID Macro libero.'); return post(`/api/celle/maps/${mapId}/nodes`, { level: 1, parentId: null, name }); }) }, icon('plus'), h('span', {}, 'Macro'))));
    const levelSeg = h('div', { class: 'cg-seg', role: 'group', 'aria-label': 'Livello' }, [[0, 'Tutti'], [1, 'Macro'], [2, 'Processi'], [3, 'Micro']].map(([lv, label]) =>
      h('button', { type: 'button', class: m.level === lv ? 'on' : '', onclick: () => { m.level = lv; render(); } }, label)));
    const search = h('input', { type: 'search', class: 'cg-search', placeholder: 'Cerca codice, nome, responsabile…', value: m.q, oninput: (e) => { m.q = e.target.value; clearTimeout(state.qt); state.qt = setTimeout(() => { render(); const s2 = el.querySelector('.cg-search'); if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); } }, 250); } });
    const table = h('div', { class: 'cg-sheet', tabindex: '0', onkeydown: (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const i = rows.findIndex((r) => r.n.id === state.selected);
      const next = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) { state.selected = next.n.id; remember(); render(); el.querySelector('.cg-sheet').focus(); }
    } },
    h('table', { class: 'cg-grid' },
      h('thead', {}, h('tr', {}, h('th', { class: 'cg-rn' }, ''), ['Codice', 'Livello', 'Nome', 'Responsabile', 'Stato', 'Scadenza'].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.slice(0, 1500).map(({ n: x, depth }, i) => {
        const was = m.changed.get(x.id);
        return h('tr', { class: `lv${x.level}` + (state.selected === x.id ? ' sel' : '') + (was ? ' changed' : ''), onclick: () => { state.selected = x.id; remember(); render(); } },
          h('td', { class: 'cg-rn' }, String(i + 1)),
          h('td', { class: 'mono nowrap' }, h('span', { class: 'cg-code' }, x.code), was ? h('span', { class: 'cg-was', title: 'Codice prima della modifica' }, was) : null),
          h('td', { class: 'small nowrap' }, LEVEL[x.level]),
          h('td', { style: `padding-left:${8 + (m.level ? 0 : depth * 16)}px` }, x.name || h('i', { class: 'muted' }, '(senza nome)'), x.checks.length ? h('span', { class: 'tr-dot danger', title: x.checks.join(' · '), style: 'margin-left:6px' }) : null),
          h('td', { class: 'small' }, x.responsible || ''),
          h('td', {}, x.status ? h('span', { class: `chip tr-mini ${STATUS_CHIP[x.status] || ''}` }, x.status) : ''),
          h('td', { class: 'small nowrap' + (x.overdue ? ' tr-late' : '') }, shortDate(x.dueDate)));
      }))));
    return h('div', { class: 'cg-editor' },
      h('section', { class: 'card glass cg-left' },
        h('div', { class: 'cg-left-head' }, h('div', {}, h('div', { class: 'cg-label' }, 'Tabella di riferimento'), h('strong', {}, `${rows.length} voci`)), levelSeg),
        ribbon, search,
        m.last ? h('div', { class: 'cg-cascade' }, icon('refresh'),
          h('div', { class: 'grow' }, h('b', {}, m.last),
            m.changed.size ? h('div', { class: 'small' }, [...m.changed.entries()].slice(0, 6).map(([cid, old]) => `${old} → ${byId.get(cid) ? byId.get(cid).code : '?'}`).join(' · ') + (m.changed.size > 6 ? ' · …' : '')) : null),
          h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Nascondi', onclick: () => { m.last = ''; m.changed = new Map(); render(); } }, icon('close'))) : null,
        table),
      h('section', { class: 'card glass cg-right' }, h('div', { class: 'cg-label' }, 'Caratteristiche'), detail(n)));
  }

  function render() {
    const selected = state.selected ? byId.get(state.selected) : null;
    let body;
    if (state.tab === 'tabella') body = h('section', { class: 'card glass' }, table());
    else if (state.tab === 'modifica') body = editor(selected);
    else if (state.tab === 'controlli') body = h('section', { class: 'card glass' }, issuesView());
    else if (state.tab === 'richieste') body = h('section', { class: 'card glass' }, requestsView());
    else {
      body = h('div', { class: 'tr-layout' },
        h('section', { class: 'card glass tr-tree' },
          h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:8px' }, h('strong', {}, `${d.macros.length} macro`),
            h('div', { class: 'row', style: 'gap:4px' },
              h('button', { class: 'btn sm', type: 'button', onclick: () => { for (const n of byId.values()) if (n.level < 3) state.open.add(n.id); render(); } }, 'Apri tutto'),
              h('button', { class: 'btn sm', type: 'button', onclick: () => { state.open.clear(); render(); } }, 'Chiudi'),
              h('button', { class: 'btn sm primary', type: 'button', onclick: () => addChild(null) }, icon('plus'), 'Macro'))),
          d.macros.length ? h('ul', { class: 'tr-list' }, d.macros.map(treeRow)) : h('div', { class: 'empty' }, 'Nessuna voce.')),
        h('section', { class: 'card glass' }, detail(selected)));
    }
    el.replaceChildren(h('div', { class: 'cg' },
      h('div', { style: 'margin-bottom:10px' }, h('button', { class: 'btn sm', type: 'button', onclick: () => { setHash(''); viewCelle(el).catch(toastError); } }, icon('back'), 'Tutte le mappe')),
      pageHead(d.map.name, `${d.map.project}${d.map.description ? ` · ${d.map.description}` : ''}${d.template ? ` · Excel come il file di origine «${d.template.name}»` : ''}`, actions()),
      h('datalist', { id: 'tr-ambiti' }, d.ambiti.map((a) => h('option', { value: a }))),
      tabs(), body));
    const active = el.querySelector('.tr-row.active');
    if (active && state.scroll !== state.selected) { state.scroll = state.selected; active.scrollIntoView({ block: 'nearest' }); }
  }

  await load();
  if (state.selected) for (let n = byId.get(state.selected); n; n = n.parent) state.open.add(n.id);
  render();
}

export async function viewCelle(el) {
  const id = Number(params().get('mappa'));
  if (id) {
    try { return await viewMap(el, id); } catch (err) { if (err.status !== 404) throw err; setHash(''); }
  }
  return viewList(el);
}

// Riquadro per la Home: le mie voci in scadenza (o scadute).
export async function myDeadlinesCard() {
  const list = await get('/api/celle/mine').catch(() => []);
  if (!list.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  return h('section', { class: 'card glass' }, h('div', { class: 'card-head' }, h('h2', {}, 'Le mie scadenze in GestioneCelle')),
    h('ul', { class: 'list' }, list.map((x) => h('li', {}, icon('clock'),
      h('div', { class: 'grow' }, h('a', { class: 'title', href: `#/celle?mappa=${x.mapId}&voce=${x.id}`, style: 'color:inherit;text-decoration:none;display:block' }, `${x.code} ${x.name}`),
        h('div', { class: 'meta' }, `${x.project} · ${x.map}${x.status ? ` · ${x.status}` : ''}`)),
      h('span', { class: `chip ${x.dueDate < today ? 'danger' : 'warn'}` }, x.dueDate < today ? `scaduta ${shortDate(x.dueDate)}` : shortDate(x.dueDate))))));
}
