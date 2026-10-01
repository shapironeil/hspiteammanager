/* Template di riepilogo e composizione dell'email */
(function () {
  /*
   * Un template descrive le sezioni del riepilogo e il testo dell'email.
   * kind: list (elenco puntato) · numbered (elenco numerato) · actions (numerato con owner e deadline) · paragraph (testo libero)
   * role: done · doing · next · risk · decision · info — serve a collegare le sezioni tra template diversi
   *       (riporto dal checkpoint precedente, analisi, storico e previsione)
   */
  const ROLES = {
    done: 'Completato',
    doing: 'In corso',
    next: 'Prossimo passo',
    risk: 'Attenzione / rischio',
    decision: 'Decisione',
    info: 'Informazione',
  };
  const KINDS = { list: 'Elenco puntato', numbered: 'Elenco numerato', actions: 'Azioni (owner + deadline)', paragraph: 'Paragrafo' };

  const CLOSING_SLIDES = 'In allegato trovate le slide discusse durante la riunione; come sempre, vi chiedo cortesemente di estendere la presente a chi riteniate opportuno.';
  const SIGNOFF = 'A disposizione,\nGrazie\n{firma}';

  const BUILTIN = [
    {
      id: 'checkpoint-settimanale',
      name: 'Checkpoint settimanale',
      description: 'Il formato dei riepiloghi ATAC: completate, in corso, prossimi passi, punti di attenzione.',
      greeting: 'Ciao a tutti,',
      intro: 'di seguito i punti discussi durante il checkpoint odierno.',
      sections: [
        { key: 'completed', title: 'Attività completate', label: 'Attività completate:', kind: 'list', role: 'done', note: true },
        { key: 'inProgress', title: 'Attività in corso', label: 'Attività in corso (pianificate per questa settimana):', kind: 'list', role: 'doing', note: true },
        { key: 'nextSteps', title: 'Prossimi passi', label: 'Prossimi passi', kind: 'list', role: 'next', note: true },
        { key: 'nextStepsNote', title: 'Dettaglio prossimi passi', label: '', kind: 'paragraph', role: 'risk', hideLabel: true, hint: 'Blocchi o criticità legati ai prossimi passi' },
        { key: 'attention', title: 'Punti di attenzione', label: 'Punti di attenzione:', kind: 'actions', role: 'risk' },
        { key: 'closingNotes', title: 'Note di chiusura', label: '', kind: 'paragraph', role: 'info', hideLabel: true, hint: 'Accordi generali: date dei prossimi incontri, pause…' },
      ],
      closing: CLOSING_SLIDES,
      signoff: SIGNOFF,
    },
    {
      id: 'sal',
      name: 'Stato avanzamento lavori (SAL)',
      description: 'Per gli incontri di avanzamento con il management: sintesi, milestone, rischi e richieste.',
      greeting: 'Buongiorno a tutti,',
      intro: 'di seguito la sintesi dello stato avanzamento lavori discusso nell’incontro odierno.',
      sections: [
        { key: 'synthesis', title: 'Sintesi', label: 'Sintesi:', kind: 'paragraph', role: 'info', hint: 'Stato generale del progetto in 2-3 righe' },
        { key: 'milestones', title: 'Milestone raggiunte', label: 'Milestone raggiunte:', kind: 'list', role: 'done', note: true },
        { key: 'progress', title: 'Avanzamento attività', label: 'Avanzamento attività:', kind: 'list', role: 'doing', note: true },
        { key: 'nextActivities', title: 'Prossime attività', label: 'Prossime attività:', kind: 'list', role: 'next', note: true },
        { key: 'risks', title: 'Rischi e issue', label: 'Rischi e issue:', kind: 'actions', role: 'risk' },
        { key: 'requests', title: 'Richieste al cliente', label: 'Richieste al cliente:', kind: 'actions', role: 'next' },
        { key: 'decisions', title: 'Decisioni', label: 'Decisioni:', kind: 'list', role: 'decision' },
      ],
      closing: CLOSING_SLIDES,
      signoff: SIGNOFF,
    },
    {
      id: 'verbale',
      name: 'Verbale di riunione formale',
      description: 'Partecipanti, ordine del giorno, decisioni e azioni con owner e scadenza.',
      greeting: 'Buongiorno a tutti,',
      intro: 'si riporta di seguito il verbale della riunione del {data}.',
      sections: [
        { key: 'participants', title: 'Partecipanti', label: 'Partecipanti:', kind: 'paragraph', role: 'info' },
        { key: 'agenda', title: 'Ordine del giorno', label: 'Ordine del giorno:', kind: 'numbered', role: 'info' },
        { key: 'discussion', title: 'Sintesi della discussione', label: 'Sintesi della discussione:', kind: 'list', role: 'info', note: true },
        { key: 'decisions', title: 'Decisioni prese', label: 'Decisioni prese:', kind: 'numbered', role: 'decision' },
        { key: 'actions', title: 'Azioni', label: 'Azioni:', kind: 'actions', role: 'next' },
        { key: 'openPoints', title: 'Punti aperti', label: 'Punti aperti:', kind: 'list', role: 'risk', note: true },
        { key: 'nextMeeting', title: 'Prossima riunione', label: 'Prossima riunione:', kind: 'paragraph', role: 'info' },
      ],
      closing: 'Eventuali osservazioni o integrazioni al presente verbale sono gradite entro due giorni lavorativi.',
      signoff: 'Cordiali saluti,\n{firma}',
    },
    {
      id: 'tecnico',
      name: 'Riunione tecnica / troubleshooting',
      description: 'Problemi analizzati, evidenze, soluzioni e azioni correttive.',
      greeting: 'Ciao a tutti,',
      intro: 'di seguito il riepilogo della sessione tecnica odierna.',
      sections: [
        { key: 'context', title: 'Contesto', label: 'Contesto:', kind: 'paragraph', role: 'info' },
        { key: 'issues', title: 'Problemi analizzati', label: 'Problemi analizzati:', kind: 'list', role: 'risk', note: true },
        { key: 'evidence', title: 'Evidenze emerse', label: 'Evidenze emerse:', kind: 'list', role: 'info' },
        { key: 'solutions', title: 'Soluzioni e decisioni', label: 'Soluzioni individuate / decisioni:', kind: 'list', role: 'decision', note: true },
        { key: 'fixed', title: 'Risolti', label: 'Attività completate:', kind: 'list', role: 'done' },
        { key: 'actions', title: 'Azioni correttive', label: 'Azioni correttive:', kind: 'actions', role: 'next' },
        { key: 'openPoints', title: 'Punti aperti', label: 'Punti aperti:', kind: 'list', role: 'risk' },
      ],
      closing: 'Resto a disposizione per eventuali approfondimenti.',
      signoff: 'Grazie,\n{firma}',
    },
    {
      id: 'kickoff',
      name: 'Kick-off di progetto',
      description: 'Obiettivi, perimetro, referenti, pianificazione e prerequisiti.',
      greeting: 'Buongiorno a tutti,',
      intro: 'grazie per la partecipazione al kick-off; di seguito i principali punti condivisi.',
      sections: [
        { key: 'goals', title: 'Obiettivi', label: 'Obiettivi del progetto:', kind: 'list', role: 'info' },
        { key: 'scope', title: 'Perimetro', label: 'Perimetro:', kind: 'list', role: 'info' },
        { key: 'roles', title: 'Ruoli e referenti', label: 'Ruoli e referenti:', kind: 'list', role: 'info' },
        { key: 'plan', title: 'Pianificazione', label: 'Pianificazione e milestone:', kind: 'list', role: 'doing', note: true },
        { key: 'prerequisites', title: 'Prerequisiti e accessi', label: 'Prerequisiti e accessi necessari:', kind: 'actions', role: 'risk' },
        { key: 'nextSteps', title: 'Prossimi passi', label: 'Prossimi passi:', kind: 'list', role: 'next', note: true },
      ],
      closing: CLOSING_SLIDES,
      signoff: SIGNOFF,
    },
    {
      id: 'breve',
      name: 'Riepilogo breve',
      description: 'Per call veloci: punti discussi e azioni.',
      greeting: 'Ciao a tutti,',
      intro: 'riepilogo veloce della call di oggi.',
      sections: [
        { key: 'points', title: 'Punti discussi', label: 'Punti discussi:', kind: 'list', role: 'info', note: true },
        { key: 'actions', title: 'Azioni', label: 'Azioni:', kind: 'actions', role: 'next' },
      ],
      closing: '',
      signoff: 'Grazie,\n{firma}',
    },
  ];
  BUILTIN.forEach((t) => (t.builtin = true));

  let custom = [];
  const all = () => [...custom, ...BUILTIN.filter((b) => !custom.some((c) => c.id === b.id))];
  const get = (id) => all().find((t) => t.id === id) || BUILTIN[0];
  const itemSections = (tpl) => tpl.sections.filter((s) => s.kind !== 'paragraph');

  // ------------------------------------------------------------ summary
  function normItem(x, kind) {
    if (typeof x === 'string') x = { text: x };
    const it = { text: x.text || '' };
    if (kind === 'actions') { it.owner = x.owner || ''; it.deadline = x.deadline || ''; }
    else it.note = x.note || '';
    if (x.ref) it.ref = x.ref; // collegamento a transcript / checkpoint precedente
    return it;
  }

  // Normalizza il riepilogo secondo il template; le sezioni non previste dal template vengono conservate
  function normalize(summary, tpl) {
    const s = { ...(summary || {}) };
    for (const sec of tpl.sections) {
      const v = s[sec.key];
      if (sec.kind === 'paragraph') s[sec.key] = Array.isArray(v) ? v.filter(Boolean).join('\n\n') : v || '';
      else s[sec.key] = (Array.isArray(v) ? v : []).map((x) => normItem(x, sec.kind));
    }
    return s;
  }

  // Tutte le voci del riepilogo con il loro ruolo (indipendente dal template usato)
  function roleItems(summary, tpl) {
    const out = [];
    if (!summary) return out;
    for (const sec of tpl.sections) {
      const v = summary[sec.key];
      if (sec.kind === 'paragraph') { if (v && String(v).trim()) out.push({ role: sec.role, section: sec.title, text: String(v), paragraph: true }); }
      else (v || []).forEach((it) => it.text?.trim() && out.push({ role: sec.role, section: sec.title, key: sec.key, ...it }));
    }
    return out;
  }

  // Cambio template: le voci delle sezioni non più presenti passano alla prima sezione con lo stesso ruolo
  function convert(summary, fromTpl, toTpl) {
    const out = normalize({}, toTpl);
    const target = (sec) =>
      toTpl.sections.find((t) => t.key === sec.key && (t.kind === 'paragraph') === (sec.kind === 'paragraph')) ||
      toTpl.sections.find((t) => t.role === sec.role && (t.kind === 'paragraph') === (sec.kind === 'paragraph')) ||
      toTpl.sections.find((t) => (t.kind === 'paragraph') === (sec.kind === 'paragraph'));
    for (const sec of fromTpl.sections) {
      const v = summary[sec.key];
      const t = target(sec);
      if (!t || !v || (Array.isArray(v) && !v.length)) continue;
      if (t.kind === 'paragraph') out[t.key] = [out[t.key], v].filter(Boolean).join('\n\n');
      else out[t.key].push(...v.map((x) => normItem(x, t.kind)));
    }
    return out;
  }

  // ------------------------------------------------------------ testo email
  const fill = (text, vars) => String(text || '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

  function punct(text, last) {
    return text.trim().replace(/[;.,:]+$/, '') + (last ? '.' : ';');
  }

  function toText(summary, tpl, vars = {}) {
    const s = normalize(summary, tpl);
    const L = [fill(tpl.greeting, vars), '', fill(tpl.intro, vars), ''];
    for (const sec of tpl.sections) {
      if (sec.kind === 'paragraph') {
        const t = s[sec.key].trim();
        if (!t) continue;
        if (!sec.hideLabel && sec.label) {
          L.push(`• ${sec.label}`);
          t.split('\n').forEach((line) => L.push(line.trim() ? `   ${line.trim()}` : ''));
        } else L.push(t);
        L.push('');
        continue;
      }
      const items = s[sec.key].filter((i) => i.text.trim());
      if (!items.length) continue;
      L.push(`• ${sec.label || sec.title}`);
      items.forEach((it, i) => {
        const last = i === items.length - 1;
        if (sec.kind === 'list') {
          L.push(`   o ${it.note?.trim() ? `${it.text.trim().replace(/[;.]+$/, '')}; → ${it.note.trim()}` : punct(it.text, last)}`);
        } else {
          L.push(`   ${i + 1}. ${it.text.trim().replace(/[;.]*$/, '.')}${sec.kind === 'numbered' && it.note?.trim() ? ` → ${it.note.trim()}` : ''}`);
          if (sec.kind === 'actions') {
            const tail = [it.owner && `(Owner – ${it.owner})`, it.deadline && `→ Deadline: ${it.deadline}`].filter(Boolean).join(' ');
            if (tail) L.push(`      ${tail}`);
          }
        }
      });
      L.push('');
    }
    if (tpl.closing) L.push(fill(tpl.closing, vars), '');
    L.push(fill(tpl.signoff || '', vars));
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  }

  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Converte il testo (anche modificato a mano) in HTML con elenchi veri, per incollarlo in Outlook
  function textToHtml(text) {
    const lines = text.split('\n');
    let html = '';
    let i = 0;
    const arrow = (s) => s.replace(/→/g, '&rarr;');
    while (i < lines.length) {
      const bullet = /^\s*[•*]\s+(.*)$/.exec(lines[i]);
      if (bullet) {
        i++;
        const subs = [];
        const paras = [];
        let ordered = false;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
          const sub = /^\s+(?:o|-|◦|(\d+)\.)\s+(.*)$/.exec(lines[i]);
          if (sub) {
            if (sub[1]) ordered = true;
            subs.push(esc(sub[2]));
          } else if (subs.length) subs[subs.length - 1] += '<br>' + esc(lines[i].trim());
          else paras.push(esc(lines[i].trim()));
          i++;
        }
        let inner = paras.length ? `<div style="margin:2px 0 4px">${arrow(paras.join('<br>'))}</div>` : '';
        if (subs.length) {
          const tag = ordered ? 'ol' : 'ul';
          inner += `<${tag} style="margin:4px 0;${ordered ? '' : 'list-style-type:circle;'}">${subs.map((s) => `<li style="margin-bottom:2px">${arrow(s)}</li>`).join('')}</${tag}>`;
        }
        html += `<ul style="margin:8px 0;"><li><b>${esc(bullet[1])}</b>${inner}</li></ul>`;
        continue;
      }
      html += lines[i].trim() ? `<p style="margin:0">${arrow(esc(lines[i]))}</p>` : '<p style="margin:0">&nbsp;</p>';
      i++;
    }
    return `<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:11pt;">${html}</div>`;
  }

  function toEml({ to, subject, text }) {
    const html = textToHtml(text);
    const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, '$&\r\n');
    const boundary = 'vs' + Math.random().toString(36).slice(2);
    return [
      `To: ${to || ''}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject || '')))}?=`,
      'X-Unsent: 1',
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(text),
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(`<html><body>${html}</body></html>`),
      `--${boundary}--`,
      '',
    ].join('\r\n');
  }

  window.Templates = {
    ROLES,
    KINDS,
    BUILTIN,
    setCustom: (list) => (custom = Array.isArray(list) ? list : []),
    getCustom: () => custom,
    all,
    get,
    itemSections,
    normalize,
    roleItems,
    convert,
    fill,
  };
  window.Email = { toText, textToHtml, toEml };
})();
