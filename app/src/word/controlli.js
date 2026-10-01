'use strict';
// Motore Word: i controlli su un documento letto (docx-read.js): cose da sistemare prima di mandarlo.
//   controllaDocx(struttura) -> [{ level: 'errore'|'avviso'|'info', text, dove }]
const SAL = require('../sal');

const euroOf = (s) => { const m = /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/.exec(String(s || '').replace(/\s/g, '')); return m ? SAL.num(m[0]) : null; };
const codes = (s) => [...String(s || '').matchAll(/\bS_\d+(?:\.\d+)?\b/g)].map((m) => m[0]);

function controllaDocx(st) {
  const out = [];
  const add = (level, text, dove) => out.push({ level, text, dove: dove || null });
  // segnaposto e evidenziazioni
  const left = new Map();
  for (const s of st.segnaposto || []) left.set(s.testo, (left.get(s.testo) || 0) + 1);
  for (const [t, n] of left) add('avviso', `Segnaposto da compilare: ${t}${n > 1 ? ` (${n} volte)` : ''}.`, (st.segnaposto.find((s) => s.testo === t) || {}).dove);
  if (st.evidenziati) add('info', `${st.evidenziati} paragrafi con testo evidenziato in giallo: nei modelli segna le parti da compilare.`);
  if ((st.commenti || []).length) add('avviso', `${st.commenti.length} commenti del modello ancora presenti (${st.commenti.map((c) => c.autore).filter(Boolean).join(', ')}).`);
  if (st.indiceAutomatico && !st.aggiornaCampiAllApertura) add('info', 'L\'indice è un campo: va aggiornato in Word (tasto destro → Aggiorna campo) perché i numeri di pagina siano giusti.');
  if (st.revisioni) add('info', 'Il documento contiene revisioni da accettare o rifiutare.');
  if (st.meta && st.meta.solaLetturaConsigliata) add('info', 'Il file consiglia l\'apertura in sola lettura (impostazione del modello).');
  // capitoli: numerazione e vuoti
  const caps = st.capitoli || [];
  if (!caps.length) add('avviso', 'Nessun capitolo riconosciuto (stili Titolo o numerazione).');
  for (const c of caps) {
    const inside = (st.blocchi || []).slice(c.blocco + 1, c.fino);
    if (!inside.some((b) => (b.tipo === 'paragrafo' && b.testo.trim()) || b.tipo === 'tabella')) add('avviso', `Capitolo "${c.titolo}" vuoto.`);
  }
  // codici delle attivita' coerenti tra i capitoli (S_n, S_n.m)
  const byChapter = caps.map((c) => ({ titolo: c.titolo, codici: new Set((st.blocchi || []).slice(c.blocco + 1, c.fino).flatMap((b) => (b.tipo === 'tabella' ? b.celle.flat().map((x) => x.testo) : [b.testo])).flatMap(codes)) })).filter((c) => c.codici.size);
  if (byChapter.length > 1) {
    // i codici delle attivita' (S_n.m) devono tornare tra piano di lavoro, resoconto e consuntivazione;
    // i codici dei servizi (S_n) anche nella fatturazione (che per le attivita' usa il codice breve A_1)
    const all = new Set(byChapter.flatMap((c) => [...c.codici]));
    for (const code of all) {
      if (/_n\b/.test(code)) continue;
      const scope = /\./.test(code) ? /avanzamento|consuntivazione/i : /avanzamento|consuntivazione|fatturazione/i;
      const relevant = byChapter.filter((c) => scope.test(c.titolo));
      const missing = relevant.filter((c) => !c.codici.has(code));
      const present = relevant.filter((c) => c.codici.has(code));
      if (missing.length && present.length) add('info', `Il codice ${code} compare in "${present.map((c) => c.titolo).join('", "')}" ma non in "${missing.map((c) => c.titolo).join('", "')}".`);
    }
  }
  // prospetto economico: importo - ritenuta = credito, IVA 22% sul credito, totale = credito + IVA
  const pro = (st.tabelle || []).map((t) => (st.blocchi || []).find((b) => b.tipo === 'tabella' && b.n === t.n)).find((t) => t && t.celle.some((r) => /Ritenuta 0,5%/.test(r[0] && r[0].testo)));
  if (pro) {
    const val = (re) => { const r = pro.celle.find((x) => re.test(x[0] && x[0].testo)); return r && r[1] ? euroOf(r[1].testo) : null; };
    const imp = val(/^Importo/); const rit = val(/^Ritenuta/); const cre = val(/^Credito/); const iva = val(/^IVA/); const tot = val(/^TOTALE/);
    const ok = (a, b) => a != null && b != null && Math.abs(a - b) <= 0.011;
    if (imp != null && rit != null && !ok(rit, SAL.round2(imp * SAL.RITENUTA))) add('errore', `Prospetto: la ritenuta (${SAL.euro(rit)}) non è lo 0,5% dell'importo (${SAL.euro(imp)}).`);
    if (imp != null && cre != null && rit != null && !ok(cre, imp - rit)) add('errore', `Prospetto: il credito (${SAL.euro(cre)}) non è importo meno ritenuta (${SAL.euro(imp - rit)}).`);
    if (cre != null && iva != null && !ok(iva, SAL.round2(cre * SAL.IVA))) add('errore', `Prospetto: l'IVA (${SAL.euro(iva)}) non è il 22% del credito (${SAL.euro(cre)}).`);
    if (cre != null && iva != null && tot != null && !ok(tot, cre + iva)) add('errore', `Prospetto: il totale fattura (${SAL.euro(tot)}) non è credito più IVA (${SAL.euro(cre + iva)}).`);
    if (imp == null) add('avviso', 'Prospetto economico senza importo.');
  }
  // tabella per componente RTI: la riga TOTALE e' la somma
  const comp = (st.blocchi || []).find((b) => b.tipo === 'tabella' && /Componente RTI/.test(b.intestazione.join(' ')));
  if (comp) {
    const rows = comp.celle.slice(1).filter((r) => r[0] && !/^TOTALE/i.test(r[0].testo));
    const tot = comp.celle.find((r) => r[0] && /^TOTALE/i.test(r[0].testo));
    if (tot && rows.length) for (const ci of [1, 2]) {
      const sum = SAL.round2(rows.reduce((a, r) => a + (euroOf(r[ci] && r[ci].testo) || 0), 0));
      const t = euroOf(tot[ci] && tot[ci].testo);
      if (t != null && sum && Math.abs(sum - t) > 0.011) add('errore', `Consuntivazione per componente RTI: il TOTALE della colonna ${ci + 1} (${SAL.euro(t)}) non è la somma delle righe (${SAL.euro(sum)}).`);
    }
  }
  return out;
}

module.exports = { controllaDocx };
