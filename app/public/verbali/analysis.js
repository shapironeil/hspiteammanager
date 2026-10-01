/*
 * Analisi locale del transcript (nessuna AI esterna):
 * - collega il transcript ai punti aperti dei checkpoint precedenti ("punti toccati")
 * - propone nuovi punti con ruolo, owner e deadline rilevati
 * - estrae gli argomenti principali
 * - ricostruisce il "filo" delle attività tra checkpoint (voci collegate)
 * - impara dalle scelte dell'utente (classificatore Naive Bayes per progetto)
 */
(function () {
  const STOP = new Set(
    ('a ad al allo ai agli alla alle anche ancora avere abbiamo avete hanno ha ho hai c ce che chi ci con col come cosa cui da dal dallo dai dagli dalla dalle del dello dei degli della delle di dove e ed è era erano essere fa fare fatto già gli ha i il in io la le lei li lo loro lui ma me mi mia mie miei mio molto ne nei nel nello negli nella nelle noi non nostro nostra o oppure ora per perché però più poi può quale quando quanto quella quelle quelli quello questa queste questi questo qui se sei si sia siamo siete sono sta stai stanno stato su sua sue sui sul sullo sulla sulle suo suoi ti tra tu tutti tutto tutte un una uno vi voi allora quindi cioè ok okay sì va bene diciamo praticamente comunque insomma adesso appunto magari tipo proprio però ecco eh ehm dunque invece solo sempre ogni anche altro altra altri stesso dire detto vedere vediamo')
      .split(' ')
  );
  const SUFFIXES = ['azioni', 'azione', 'amenti', 'amento', 'imenti', 'imento', 'mente', 'zioni', 'zione', 'ando', 'endo', 'ato', 'ata', 'ati', 'ate', 'ito', 'ita', 'iti', 'ite', 'uto', 'uta', 'uti', 'are', 'ere', 'ire', 'ano', 'ono', 'ione', 'ioni', 'ità'];

  const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  function stem(w) {
    w = deaccent(w.toLowerCase());
    for (const suf of SUFFIXES) if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
    return w.length > 4 ? w.replace(/[aeiou]+$/, '') : w;
  }
  function words(text) {
    return String(text || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [];
  }
  function terms(text) {
    const out = new Set();
    for (const w of words(text)) {
      const base = w.replace(/^[a-z]{1,3}'/, ''); // l'ingestion → ingestion
      if (base.length < 3 || STOP.has(base) || /^\d+$/.test(base)) continue;
      out.add(stem(base));
    }
    return out;
  }
  function overlap(A, B) {
    let n = 0;
    A.forEach((t) => B.has(t) && n++);
    return n;
  }
  // Somiglianza tra due testi (0..1), con almeno 2 termini in comune per testi non brevissimi
  function similarity(a, b) {
    const A = a instanceof Set ? a : terms(a);
    const B = b instanceof Set ? b : terms(b);
    if (!A.size || !B.size) return 0;
    const n = overlap(A, B);
    if (n < Math.min(2, A.size, B.size)) return 0;
    return n / Math.min(A.size, B.size);
  }

  // ------------------------------------------------------------ utterances
  // Unisce i blocchi consecutivi dello stesso speaker in interventi, poi li divide in frasi
  function utterances(cues) {
    const out = [];
    let cur = null;
    for (const c of cues) {
      if (cur && cur.speaker === c.speaker && c.start - cur.end < 2.5 && cur.text.split(' ').length < 80) {
        cur.parts.push({ id: c.id, start: c.start, offset: cur.text.length + 1 });
        cur.text += ' ' + c.text;
        cur.end = c.end;
      } else {
        if (cur) out.push(cur);
        cur = { speaker: c.speaker, start: c.start, end: c.end, text: c.text, parts: [{ id: c.id, start: c.start, offset: 0 }] };
      }
    }
    if (cur) out.push(cur);
    return out;
  }
  // Frasi di ogni intervento, ciascuna collegata al blocco del transcript in cui inizia
  function sentences(utts) {
    const out = [];
    for (const u of utts) {
      const parts = u.text.split(/(?<=[.?!])\s+(?=[A-ZÀ-Ý])/);
      let pos = 0;
      for (const p of parts) {
        const at = u.text.indexOf(p, pos);
        pos = at + p.length;
        if (p.split(/\s+/).length < 4) continue;
        const cue = u.parts.filter((x) => x.offset <= at).pop() || u.parts[0];
        out.push({ text: p.trim(), speaker: u.speaker, start: cue.start, cueIds: [cue.id] });
      }
    }
    return out;
  }

  // ------------------------------------------------------------ pattern
  const P = {
    done: [
      [/\b(abbiamo|ho|hanno|avete|è stat[oa]|sono stat[ie])\s+(già\s+)?(completat|conclus|terminat|chius|rilasciat|consegnat|finit|fatt|sistemat|risolt|caricat|mandat|inviat|implementat|sviluppat)/i, 3],
      [/\b(completat[oaie]|conclus[oaie]|terminat[oaie]|rilasciat[oaie]|risolt[oaie])\b/i, 1.5],
      [/\b(è andat[oa] in produzione|è live|funziona(no)? correttamente|chiuso il ticket)\b/i, 2],
    ],
    doing: [
      [/\b(stiamo|sto|stanno|state)\s+(lavorando|facendo|definendo|sviluppando|analizzando|completando|preparando|verificando|terminando|chiudendo|scrivendo)/i, 3],
      [/\b(in corso|in lavorazione|in progress|questa settimana|a buon punto|quasi finit)/i, 2],
      [/\b(stiamo portando avanti|continuiamo con|proseguiamo)\b/i, 2],
    ],
    next: [
      [/\b(prossim[oi] pass[oi]|next step)/i, 3],
      [/\b(dobbiamo|dovremo|dovremmo|bisogna|occorre|è necessario|sarà necessario|serve|servirebbe|ci serve)\b/i, 2],
      [/\b(pianificare|pianifichiamo|organizzare|organizziamo|fissare|fissiamo|schedulare|mandare|mandiamo|inviare|inviamo|preparare|prepariamo|verificare|verifichiamo|chiedere|chiediamo|sentire|sentiamo)\b/i, 1.5],
      [/\b(mi prendo l'azione|me ne occupo|ci pensiamo noi|ci pensa|se ne occupa|vi mando|vi mandiamo|vi giro|entro)\b/i, 2],
      [/\b(la prossima settimana|domani|lunedì prossimo|al prossimo checkpoint)\b/i, 1],
    ],
    risk: [
      [/\b(problema|problemi|criticità|critico|rischio|rischi|bloccat[oaie]|blocco|bloccante|anomali[ae]|errore|errori|ritardo|ritardi|impediment)/i, 2.5],
      [/\bnon\s+(funziona|funzionano|riusciamo|riesco|è possibile|abbiamo ancora|ci sono|risponde)/i, 2.5],
      [/\b(in attesa|aspettiamo|stiamo aspettando|attendiamo|dipende da|manca(no)?|mancano ancora)\b/i, 2],
      [/\b(scadenza|deadline|urgente|attenzione)\b/i, 1.5],
    ],
    decision: [
      [/\b(abbiamo deciso|si è deciso|decidiamo|concordato|concordiamo|d'accordo|siamo allineati|confermiamo|confermato|approvat[oa]|la decisione)\b/i, 3],
      [/\b(procediamo con|andiamo con|scegliamo|optiamo)\b/i, 2],
    ],
  };

  const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const pad = (n) => String(n).padStart(2, '0');

  // Rileva una scadenza nel testo e la converte in gg/mm/aaaa quando possibile
  function findDeadline(text, refIso) {
    const ref = refIso ? new Date(refIso + 'T12:00:00') : new Date();
    const year = (m) => (m < ref.getMonth() - 2 ? ref.getFullYear() + 1 : ref.getFullYear());
    let m = /\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/.exec(text);
    if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) <= 31) {
      const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year(Number(m[2]) - 1);
      return { label: `${pad(m[1])}/${pad(m[2])}/${y}`, raw: m[0] };
    }
    m = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?`, 'i').exec(text);
    if (m) {
      const mi = MONTHS.indexOf(m[2].toLowerCase());
      return { label: `${pad(m[1])}/${pad(mi + 1)}/${m[3] || year(mi)}`, raw: m[0] };
    }
    m = /\b(entro|per|da)\s+(fine\s+(settimana|mese|anno)|la prossima settimana|domani|(luned|marted|mercoled|gioved|venerd)ì(\s+prossimo)?)/i.exec(text);
    if (m) {
      const d = new Date(ref);
      const w = m[2].toLowerCase();
      if (w.includes('settimana') && w.includes('fine')) d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
      else if (w.includes('prossima settimana')) d.setDate(d.getDate() + 7);
      else if (w.includes('mese')) d.setMonth(d.getMonth() + 1, 0);
      else if (w.includes('anno')) d.setMonth(11, 31);
      else if (w.includes('domani')) d.setDate(d.getDate() + 1);
      else {
        const day = ['luned', 'marted', 'mercoled', 'gioved', 'venerd'].findIndex((x) => w.startsWith(x)) + 1;
        d.setDate(d.getDate() + (((day - d.getDay() + 7) % 7) || 7));
      }
      return { label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, raw: m[0], approx: true };
    }
    return null;
  }

  function findOwner(text, orgs, speaker) {
    for (const o of orgs) if (new RegExp(`\\b${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text) && /\b(owner|carico|occup|pens|devono|deve|dovrebbe|lato)\b/i.test(text)) return o;
    if (/\b(mi prendo|me ne occupo|ci penso io|lo faccio io|vi mando|vi giro)\b/i.test(text)) return speaker || '';
    if (/\b(ci pensiamo noi|ce ne occupiamo)\b/i.test(text)) return speaker ? `team di ${speaker.split(' ')[0]}` : '';
    return '';
  }

  // ------------------------------------------------------------ apprendimento (Naive Bayes)
  const LABELS = ['done', 'doing', 'next', 'risk', 'decision', 'info', 'none'];
  function emptyModel() {
    return { docs: Object.fromEntries(LABELS.map((l) => [l, 0])), words: Object.fromEntries(LABELS.map((l) => [l, {}])), totals: Object.fromEntries(LABELS.map((l) => [l, 0])), examples: 0 };
  }
  function learn(model, text, label) {
    if (!LABELS.includes(label)) return model;
    model = model?.docs ? model : emptyModel();
    model.docs[label]++;
    model.examples++;
    for (const t of terms(text)) {
      model.words[label][t] = (model.words[label][t] || 0) + 1;
      model.totals[label]++;
    }
    return model;
  }
  function predict(model, text) {
    if (!model?.examples || model.examples < 8) return null;
    const ts = [...terms(text)];
    const vocab = new Set(LABELS.flatMap((l) => Object.keys(model.words[l]))).size || 1;
    const scores = {};
    for (const l of LABELS) {
      if (!model.docs[l]) continue;
      let s = Math.log(model.docs[l] / model.examples);
      for (const t of ts) s += Math.log(((model.words[l][t] || 0) + 1) / (model.totals[l] + vocab));
      scores[l] = s;
    }
    const max = Math.max(...Object.values(scores));
    const exp = Object.fromEntries(Object.entries(scores).map(([l, s]) => [l, Math.exp(s - max)]));
    const sum = Object.values(exp).reduce((a, b) => a + b, 0);
    return Object.fromEntries(Object.entries(exp).map(([l, v]) => [l, v / sum]));
  }

  // ------------------------------------------------------------ candidati
  function classify(text, model) {
    const scores = { done: 0, doing: 0, next: 0, risk: 0, decision: 0, info: 0 };
    for (const [role, pats] of Object.entries(P)) for (const [re, w] of pats) if (re.test(text)) scores[role] += w;
    if (/\?\s*$/.test(text)) Object.keys(scores).forEach((k) => (scores[k] *= 0.5)); // le domande pesano meno
    const nb = predict(model, text);
    if (nb) {
      for (const k of Object.keys(scores)) scores[k] += (nb[k] || 0) * 3;
      if (nb.none > 0.6) Object.keys(scores).forEach((k) => (scores[k] *= 0.4));
    }
    const [role, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return { role, score, learned: Boolean(nb) };
  }

  function candidates(cues, { date, orgs = [], existing = [], model, dismissed = new Set() } = {}) {
    const sents = sentences(utterances(cues));
    const existingTerms = existing.map((e) => terms(e));
    const out = [];
    for (const s of sents) {
      const { role, score, learned } = classify(s.text, model);
      const deadline = findDeadline(s.text, date);
      const total = score + (deadline ? 1.5 : 0);
      if (total < 2) continue;
      const key = `${Math.round(s.start)}:${s.text.slice(0, 40)}`;
      if (dismissed.has(key)) continue;
      const ts = terms(s.text);
      const dup = existingTerms.some((e) => similarity(ts, e) >= 0.6);
      out.push({
        key,
        text: s.text,
        speaker: s.speaker,
        start: s.start,
        cueIds: s.cueIds,
        role: deadline && role === 'decision' ? 'next' : role,
        score: Math.round(total * 10) / 10,
        confidence: total >= 4.5 ? 'alta' : total >= 3 ? 'media' : 'bassa',
        deadline: deadline?.label || '',
        deadlineApprox: Boolean(deadline?.approx),
        owner: findOwner(s.text, orgs, s.speaker),
        duplicate: dup,
        learned,
      });
    }
    return out.sort((a, b) => a.start - b.start);
  }

  // ------------------------------------------------------------ punti toccati
  const OUTCOME = [
    ['done', /\b(completat|conclus|terminat|chius|rilasciat|consegnat|finit|fatto|risolt|sistemat|ok,? (è|e') (fatto|andato))/i],
    ['risk', /\b(bloccat|problem|non (funziona|riusciamo|è possibile|abbiamo)|in attesa|ritard|manca|anomali|errore)/i],
    ['doing', /\b(stiamo|in corso|avanti|lavorando|quasi|a buon punto|questa settimana)/i],
  ];
  // Parole "di progetto" troppo generiche per collegare da sole un tema al transcript
  const GENERIC = new Set(
    'definizione definire sviluppo sviluppare attività verifica verificare analisi gestione creazione configurazione pianificazione strutturazione progetto dati lavoro parte punto settimana relativo ottenimento abilitare identificazione fase supporto'
      .split(' ')
      .map(stem)
  );
  function touchedItems(prevItems, cues) {
    const sents = sentences(utterances(cues));
    const sentTerms = sents.map((s) => terms(s.text));
    return prevItems.map((item) => {
      const it = new Set([...terms(item.text)].filter((t) => !GENERIC.has(t)));
      const mentions = [];
      sents.forEach((s, i) => {
        const n = overlap(it, sentTerms[i]);
        const need = Math.min(it.size, it.size <= 6 ? 2 : 3);
        if (n >= need && n > 0) mentions.push({ ...s, score: n / it.size });
      });
      mentions.sort((a, b) => b.score - a.score);
      const top = mentions.slice(0, 4).sort((a, b) => a.start - b.start);
      let outcome = null;
      let evidence = null;
      for (const m of mentions.slice(0, 4)) {
        const hit = OUTCOME.find(([, re]) => re.test(m.text));
        if (hit) { outcome = hit[0]; evidence = m; break; }
      }
      return { ...item, mentions: top, discussed: top.length > 0, outcome: outcome || (top.length ? 'doing' : null), evidence: evidence || top[0] || null };
    });
  }

  // ------------------------------------------------------------ argomenti
  function topics(cues, glossary = []) {
    const freq = new Map();
    const glossTerms = glossary.map((g) => ({ label: g, t: [...terms(g)] })).filter((g) => g.t.length);
    for (const c of cues) {
      const seen = new Set();
      for (const w of words(c.text)) {
        const base = w.replace(/^[a-z]{1,3}'/, '');
        if (base.length < 4 || STOP.has(base) || /^\d+$/.test(base)) continue;
        const st = stem(base);
        if (seen.has(st)) continue;
        seen.add(st);
        const f = freq.get(st) || { count: 0, forms: {}, first: c.start, times: [] };
        f.count++;
        f.forms[base] = (f.forms[base] || 0) + 1;
        if (f.times.length < 12) f.times.push(c.start);
        freq.set(st, f);
      }
    }
    const list = [...freq.entries()]
      .map(([st, f]) => {
        const g = glossTerms.find((x) => x.t.includes(st));
        const form = g ? g.label : Object.entries(f.forms).sort((a, b) => b[1] - a[1])[0][0];
        return { stem: st, label: form, count: f.count, first: f.first, times: f.times, glossary: Boolean(g) };
      })
      .filter((t) => t.count >= 2);
    list.sort((a, b) => (b.glossary - a.glossary) * 2 + (b.count - a.count));
    return list.slice(0, 24);
  }

  // ------------------------------------------------------------ filo delle attività
  // checkpoints: [{id, date, items:[{role, section, text}]}] in ordine cronologico
  function threads(checkpoints) {
    const out = [];
    for (const c of checkpoints) {
      for (const it of c.items) {
        if (it.paragraph) continue;
        const ts = terms(it.text);
        let best = null;
        let bestScore = 0;
        for (const th of out) {
          if (th.last.cpId === c.id) continue;
          const sc = similarity(ts, th.terms);
          if (sc > bestScore) { bestScore = sc; best = th; }
        }
        const entry = { cpId: c.id, date: c.date, role: it.role, section: it.section, text: it.text, owner: it.owner, deadline: it.deadline };
        if (best && bestScore >= 0.55) {
          best.entries.push(entry);
          best.last = entry;
          ts.forEach((t) => best.terms.add(t));
        } else out.push({ terms: ts, entries: [entry], last: entry });
      }
    }
    return out.map((th) => ({ title: th.last.text, entries: th.entries, last: th.last, length: th.entries.length }));
  }

  function related(text, history, excludeCpId) {
    const ts = terms(text);
    const res = [];
    for (const c of history) {
      if (c.id === excludeCpId) continue;
      for (const it of c.items) {
        if (it.paragraph) continue;
        const sc = similarity(ts, it.text);
        if (sc >= 0.5) res.push({ date: c.date, cpId: c.id, role: it.role, section: it.section, text: it.text, score: sc });
      }
    }
    return res.sort((a, b) => a.date.localeCompare(b.date));
  }

  window.Analysis = { classify, terms, similarity, utterances, sentences, candidates, touchedItems, topics, threads, related, findDeadline, learn, predict, emptyModel };
})();
