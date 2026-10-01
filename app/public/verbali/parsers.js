/* Parser dei transcript Teams: WebVTT, SRT, testo/DOCX (formato "Nome  0:03") */
(function () {
  const TIME = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{1,2}(?:[.,]\d{1,3})?`;
  const ARROW_RE = new RegExp(`^\\s*(${TIME})\\s*-->\\s*(${TIME})`);

  function parseTime(t) {
    const parts = String(t).trim().replace(',', '.').split(':').map(Number);
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  let seq = 0;
  const newId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

  function cleanText(s) {
    return s
      .replace(/<\/?v[^>]*>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseVttLike(text) {
    const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
    const cues = [];
    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => l.trim() !== '');
      const idx = lines.findIndex((l) => ARROW_RE.test(l));
      if (idx < 0) continue;
      const m = ARROW_RE.exec(lines[idx]);
      const body = lines.slice(idx + 1);
      if (!body.length) continue;
      let speaker = '';
      const raw = body.join('\n');
      const v = /<v\s+([^>]+)>/.exec(raw);
      if (v) speaker = v[1].trim();
      let content = cleanText(body.join(' '));
      if (!speaker && body.length > 1 && body[0].length < 60 && !/[.?!,]$/.test(body[0]) && !/<v/.test(raw)) {
        // formato "timestamp / Nome / testo" (vecchi DOCX Teams)
        speaker = cleanText(body[0]);
        content = cleanText(body.slice(1).join(' '));
      }
      if (!speaker) {
        const sp = /^([A-ZÀ-Ý][\wÀ-ÿ'.\- ]{1,40}):\s+(.+)$/.exec(content);
        if (sp) { speaker = sp[1]; content = sp[2]; }
      }
      if (!content) continue;
      cues.push({ start: parseTime(m[1]), end: parseTime(m[2]), speaker, text: content });
    }
    return cues;
  }

  // Formato Teams .docx / copia-incolla:  "Mario Rossi   0:03" seguito dal testo
  function parseSpeakerTime(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const headRe = /^\s*(.{1,80}?)\s+((?:\d{1,2}:)?\d{1,2}:\d{2})\s*$/;
    const bracketRe = /^\s*\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]\s*(?:([^:]{1,60}):\s*)?(.*)$/;
    const cues = [];
    let cur = null;
    for (const line of lines) {
      const b = bracketRe.exec(line);
      if (b) {
        if (cur) cues.push(cur);
        cur = { start: parseTime(b[1]), end: 0, speaker: (b[2] || '').trim(), text: b[3].trim() };
        continue;
      }
      const h = headRe.exec(line);
      if (h && !/[.?!]$/.test(h[1])) {
        if (cur) cues.push(cur);
        cur = { start: parseTime(h[2]), end: 0, speaker: h[1].trim(), text: '' };
        continue;
      }
      if (cur && line.trim()) cur.text = (cur.text ? cur.text + ' ' : '') + line.trim();
    }
    if (cur) cues.push(cur);
    return cues.filter((c) => c.text && !/(started|stopped) transcription|ha (avviato|interrotto) la trascrizione/i.test(c.text));
  }

  function finalize(cues) {
    cues.sort((a, b) => a.start - b.start);
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i];
      const next = cues[i + 1];
      const words = c.text.split(/\s+/).length;
      if (!c.end || c.end <= c.start) {
        // Formato senza orario di fine: si usa l'inizio del blocco successivo, limitato a una durata di parlato plausibile
        const est = c.start + Math.max(2, words * 0.45);
        c.end = next ? Math.min(next.start, Math.max(est, c.start + 1)) : est;
        if (next && next.start - c.start < words * 0.6 + 8) c.end = next.start;
      }
      c.id = newId();
      c.reviewed = false;
      c.flagged = false;
    }
    return cues;
  }

  function parseTranscript(text) {
    const t = text.replace(/^﻿/, '');
    let cues = [];
    if (/-->/.test(t)) cues = parseVttLike(t);
    if (!cues.length) cues = parseSpeakerTime(t);
    if (!cues.length) throw new Error('Formato transcript non riconosciuto');
    return finalize(cues);
  }

  // ---------------- Export ----------------
  function fmt(s, withMs) {
    s = Math.max(0, s || 0);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    const ms = Math.round((s - Math.floor(s)) * 1000);
    const base = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return withMs ? `${base}.${String(ms).padStart(3, '0')}` : base;
  }
  function short(s) {
    s = Number.isFinite(s) ? Math.max(0, Math.floor(s)) : 0;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
  }
  function toVtt(cues) {
    return 'WEBVTT\n\n' + cues.map((c) => `${fmt(c.start, true)} --> ${fmt(c.end, true)}\n${c.speaker ? `<v ${c.speaker}>` : ''}${c.text}${c.speaker ? '</v>' : ''}`).join('\n\n') + '\n';
  }
  function toTxt(cues, header) {
    return (header ? header + '\n\n' : '') + cues.map((c) => `[${short(c.start)}] ${c.speaker ? c.speaker + ': ' : ''}${c.text}`).join('\n');
  }

  window.Transcript = { parseTranscript, toVtt, toTxt, fmtShort: short, newId };
})();
