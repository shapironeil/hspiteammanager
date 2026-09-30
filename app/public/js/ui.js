// Mattoncini dell'interfaccia: creazione elementi, icone, finestre, avvisi, formati.
// Il testo degli utenti passa sempre da h() come testo, mai come HTML.

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  el.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  apps: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 20v-1a4 4 0 0 0-3-3.87M15.5 3.13a4 4 0 0 1 0 7.75',
  log: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  bug: 'M8 8a4 4 0 0 1 8 0v1H8zM6 9h12v5a6 6 0 0 1-12 0zM12 13v7M3 13h3M18 13h3M4 7l3 2M20 7l-3 2M4 20l3-2.5M20 20l-3-2.5',
  system: 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 15V3M7 8l5-5 5 5M4 21h16',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  close: 'M6 6l12 12M18 6 6 18',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  pin: 'M9 6l6 6-6 6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01',
  external: 'M14 5h5v5M19 5l-8 8M18 14v5H5V6h5',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  cloud: 'M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5a4.25 4.25 0 0 1-.5 8.5z',
  play: 'M8 5v14l11-7z',
  back: 'M15 6l-6 6 6 6',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
};

export function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name] || ICONS.apps);
  svg.append(path);
  return svg;
}

export function toast(message, type) {
  const el = h('div', { class: 'toast' + (type === 'error' ? ' error' : ''), role: type === 'error' ? 'alert' : 'status' }, message);
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), type === 'error' ? 6000 : 3200);
}
export const toastError = (err) => toast(err.message || String(err), 'error');

// Finestra di dialogo. Restituisce { close }.
export function modal(title, content, { wide } = {}) {
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const back = h('div', { class: 'modal-back', onmousedown: (e) => { if (e.target === back) close(); } },
    h('div', { class: 'modal glass' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'modal-head' }, h('h2', {}, title),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Chiudi', onclick: close }, icon('close'))),
      content));
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  const first = back.querySelector('input, textarea, select');
  if (first) first.focus();
  return { close };
}

export function confirmDialog(title, message, confirmLabel, onConfirm) {
  const m = modal(title, h('div', {},
    h('p', { class: 'muted' }, message),
    h('div', { class: 'modal-actions', style: 'margin-top:20px' },
      h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Annulla'),
      h('button', { class: 'btn danger', type: 'button', onclick: async () => { m.close(); await onConfirm(); } }, confirmLabel))));
}

// Campo con etichetta.
// Campo con etichetta. "info" aggiunge la (i) con la spiegazione di cosa va scritto.
export function field(label, input, info) {
  return h('label', { class: 'field' },
    h('span', { class: 'field-label' }, label,
      info ? h('button', { class: 'info', type: 'button', 'aria-label': `Informazioni: ${info}`, 'data-tip': info }, 'i') : null),
    input);
}

// Cerchio dell'utente: immagine avatar, oppure le iniziali se non ne ha una.
export function avatarEl(user, size) {
  const cls = 'avatar' + (size ? ` ${size}` : '');
  return user.avatar
    ? h('img', { class: cls, src: user.avatar, alt: '' })
    : h('span', { class: cls }, initials(user.name));
}

// Stessa regola del server: nome.cognome senza accenti, spazi o simboli.
const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export function usernamePreview(firstName, lastName) {
  const a = slug(firstName);
  const b = slug(lastName);
  return a && b ? `${a}.${b}`.slice(0, 28) : '';
}

// Form con gestione errori: onSubmit riceve i valori dei campi per "name".
export function form(children, onSubmit) {
  const error = h('div', { class: 'form-error', role: 'alert' });
  const el = h('form', {
    novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      error.textContent = '';
      const values = {};
      for (const input of el.elements) {
        if (!input.name) continue;
        values[input.name] = input.type === 'checkbox' ? input.checked : input.value;
      }
      const buttons = [...el.querySelectorAll('button')];
      buttons.forEach((b) => { b.disabled = true; });
      try { await onSubmit(values, el); } catch (err) { error.textContent = err.message || String(err); }
      buttons.forEach((b) => { b.disabled = false; });
    },
  }, children, error);
  return el;
}

export function fmtBytes(n) {
  if (n == null) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = Number(n);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1).replace('.', ',')} ${units[i]}`;
}

const dateFmt = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : 'mai');

export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export function pageHead(title, subtitle, ...actions) {
  return h('div', { class: 'page-head' },
    h('div', {}, h('h1', {}, title), subtitle ? h('p', {}, subtitle) : null),
    h('div', { class: 'row' }, actions));
}

export function meter(fraction) {
  const pct = Math.max(0, Math.min(1, fraction || 0)) * 100;
  return h('div', { class: 'meter' }, h('i', { style: `width:${pct}%` }));
}

// Markdown essenziale per le guide: titoli, elenchi, grassetto, codice, link.
function inline(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(h('strong', {}, m[1]));
    else if (m[2]) out.push(h('code', {}, m[2]));
    else out.push(h('a', { href: m[4], target: '_blank', rel: 'noopener noreferrer' }, m[3]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function markdown(src) {
  const root = h('div', { class: 'prose' });
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  let para = [];
  let list = null;
  const flush = () => {
    if (para.length) { root.append(h('p', {}, inline(para.join(' ')))); para = []; }
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      flush();
      const code = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      root.append(h('pre', {}, h('code', {}, code.join('\n'))));
      continue;
    }
    const head = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (head) { flush(); root.append(h('h' + head[1].length, {}, inline(head[2]))); }
    else if (bullet || numbered) {
      const tag = bullet ? 'ul' : 'ol';
      if (para.length) { root.append(h('p', {}, inline(para.join(' ')))); para = []; }
      if (!list || list.tagName.toLowerCase() !== tag) { list = h(tag, {}); root.append(list); }
      list.append(h('li', {}, inline((bullet || numbered)[1])));
    } else if (!line.trim()) flush();
    else { list = null; para.push(line.trim()); }
  }
  flush();
  if (!root.childNodes.length) root.append(h('p', { class: 'muted' }, 'Nessuna guida disponibile.'));
  return root;
}
