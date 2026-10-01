'use strict';
// Crea il file Excel di una mappa di Trama, con la stessa struttura del file BPB di partenza:
//   Istruzioni · BPB (tblBPB: un micro processo per riga) · Anagrafica Processi BPB (tblMacro, tblProcessi)
// con le stesse formule (codici N / N.N / N.N.N, chiave tecnica, check), menu a tendina dell'ID Macro e colori.
// Ogni cella calcolata porta anche il valore gia' calcolato: il file si legge bene anche prima che Excel ricalcoli.
// In piu' rispetto all'originale: le colonne Responsabile, Scadenza e Stato (gestite in Trama).
const { writeZip } = require('./zip');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // caratteri di controllo non ammessi in XML
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
const colName = (n) => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

// Stili (indici in cellXfs)
const S = { normal: 0, headManual: 1, headCalc: 2, text: 3, calc: 4, title: 5, date: 6, number: 7, section: 8, calcText: 9 };
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="5"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF262626"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="14"/><color rgb="FF1F3864"/><name val="Calibri"/><family val="2"/></font><font><sz val="11"/><color rgb="FF595959"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFBFBFBF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="4">
<dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf>
<dxf><font><color rgb="FF9C5700"/></font><fill><patternFill><bgColor rgb="FFFFEB9C"/></patternFill></fill></dxf>
<dxf><font><color rgb="FF595959"/></font><fill><patternFill><bgColor rgb="FFEDEDED"/></patternFill></fill></dxf>
<dxf><font><color rgb="FF006100"/></font><fill><patternFill><bgColor rgb="FFC6EFCE"/></patternFill></fill></dxf>
</dxfs>
<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

// ---- Formule (identiche al file BPB di partenza) ----------------------------------------
const F = {
  bpbMacro: 'IF(tblBPB[[#This Row],[ID Macroprocesso]]="","",IFERROR(INDEX(tblMacro[Macro processo],MATCH(tblBPB[[#This Row],[ID Macroprocesso]],tblMacro[ID Macro],0)),"ID macro non censito"))',
  bpbIdProc: 'IF(tblBPB[[#This Row],[Chiave (tecnica)]]="","",IFERROR(INDEX(tblProcessi[ID Processo],MATCH(tblBPB[[#This Row],[Chiave (tecnica)]],tblProcessi[Chiave (tecnica)],0)),"N/D"))',
  bpbIdMicro: 'IF(OR(tblBPB[[#This Row],[ID Processo]]="",tblBPB[[#This Row],[ID Processo]]="N/D"),"",tblBPB[[#This Row],[ID Processo]]&"."&SUMPRODUCT(--(INDEX(tblBPB[ID Processo],1):tblBPB[[#This Row],[ID Processo]]=tblBPB[[#This Row],[ID Processo]])))',
  bpbCheck: 'IF(tblBPB[[#This Row],[Chiave (tecnica)]]="","",_xlfn.LET(_xlpm.n,ROW()-ROW(tblBPB[#Headers]),_xlpm.pos,MATCH(tblBPB[[#This Row],[Chiave (tecnica)]],tblProcessi[Chiave (tecnica)],0),_xlpm.chiavePrec,IF(_xlpm.n=1,"",INDEX(tblBPB[Chiave (tecnica)],_xlpm.n-1)),_xlpm.macroPrec,IF(_xlpm.n=1,"",INDEX(tblBPB[ID Macroprocesso],_xlpm.n-1)),_xlpm.posPrec,IF(_xlpm.macroPrec=tblBPB[[#This Row],[ID Macroprocesso]],IFERROR(MATCH(_xlpm.chiavePrec,tblProcessi[Chiave (tecnica)],0),0),0),_xlpm.dup,SUMPRODUCT((tblBPB[ID Processo]=tblBPB[[#This Row],[ID Processo]])*(TRIM(tblBPB[Sotto processi])=TRIM(tblBPB[[#This Row],[Sotto processi]])))>1,_xlpm.msg,_xlfn.TEXTJOIN("; ",TRUE,IF(ISNA(MATCH(tblBPB[[#This Row],[ID Macroprocesso]],tblMacro[ID Macro],0)),"Macro non in anagrafica",""),IF(ISNA(_xlpm.pos),"Processo non in anagrafica",IF(_xlpm.pos<_xlpm.posPrec,"Ordine non crescente","")),IF(_xlpm.dup,"Sotto processo duplicato",""),IF(TRIM(tblBPB[[#This Row],[Sotto processi]])="","Sotto processo mancante","")),IF(_xlpm.msg="","OK",_xlpm.msg)))',
  bpbKey: 'IF(TRIM(tblBPB[[#This Row],[Processo]])="","",tblBPB[[#This Row],[ID Macroprocesso]]&"|"&TRIM(tblBPB[[#This Row],[Processo]]))',
  macroNProc: 'COUNTIF(tblProcessi[ID Macro],tblMacro[[#This Row],[ID Macro]])',
  macroNMicro: 'COUNTIF(tblBPB[ID Macroprocesso],tblMacro[[#This Row],[ID Macro]])',
  macroCheck: 'IF(tblMacro[[#This Row],[ID Macro]]="","Inserire ID Macro",IF(COUNTIF(tblMacro[ID Macro],tblMacro[[#This Row],[ID Macro]])>1,"ID macro duplicato",IF(tblMacro[[#This Row],[N. processi]]=0,"Nessun processo in anagrafica",IF(tblMacro[[#This Row],[N. micro processi]]=0,"Non ancora usato nel BPB","OK"))))',
  procMacro: 'IFERROR(INDEX(tblMacro[Macro processo],MATCH(tblProcessi[[#This Row],[ID Macro]],tblMacro[ID Macro],0)),"ID macro non censito")',
  procN: 'IF(tblProcessi[[#This Row],[ID Macro]]="","",COUNTIF(INDEX(tblProcessi[ID Macro],1):tblProcessi[[#This Row],[ID Macro]],tblProcessi[[#This Row],[ID Macro]]))',
  procId: 'IF(tblProcessi[[#This Row],[ID Macro]]="","",tblProcessi[[#This Row],[ID Macro]]&"."&tblProcessi[[#This Row],[N. progressivo]])',
  procNMicro: 'SUMPRODUCT(--(tblBPB[Chiave (tecnica)]=tblProcessi[[#This Row],[Chiave (tecnica)]]))',
  procCheck: 'IF(tblProcessi[[#This Row],[Chiave (tecnica)]]="","Completare ID Macro e Processo",_xlfn.LET(_xlpm.n,tblProcessi[[#This Row],[N. micro processi]],_xlpm.prima,IFERROR(MATCH(tblProcessi[[#This Row],[Chiave (tecnica)]],tblBPB[Chiave (tecnica)],0),0),_xlpm.ultima,IFERROR(LOOKUP(2,1/(tblBPB[Chiave (tecnica)]=tblProcessi[[#This Row],[Chiave (tecnica)]]),ROW(tblBPB[Chiave (tecnica)])-ROW(tblBPB[#Headers])),0),_xlpm.dupl,SUMPRODUCT(--(tblProcessi[Chiave (tecnica)]=tblProcessi[[#This Row],[Chiave (tecnica)]]))>1,IF(_xlpm.dupl,"Processo duplicato in anagrafica",IF(_xlpm.n=0,"Non ancora usato nel BPB",IF(_xlpm.ultima-_xlpm.prima+1<>_xlpm.n,"Righe non consecutive nel BPB","OK")))))',
  procKey: 'IF(OR(tblProcessi[[#This Row],[ID Macro]]="",TRIM(tblProcessi[[#This Row],[Processo]])=""),"",tblProcessi[[#This Row],[ID Macro]]&"|"&TRIM(tblProcessi[[#This Row],[Processo]]))',
};

// ---- Celle ----------------------------------------------------------------------
function cell(ref, value, style = 0) {
  if (value === null || value === undefined || value === '') return `<c r="${ref}" s="${style}"/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}
// formula con il suo valore gia' calcolato; array = formula matriciale classica (compatibile con ogni Excel)
function fcell(ref, formula, cached, style, array = false) {
  const f = array ? `<f t="array" ref="${ref}">${esc(formula)}</f>` : `<f>${esc(formula)}</f>`;
  if (typeof cached === 'number') return `<c r="${ref}" s="${style}">${f}<v>${cached}</v></c>`;
  return `<c r="${ref}" s="${style}" t="str">${f}<v>${esc(cached == null ? '' : cached)}</v></c>`;
}
// data "AAAA-MM-GG" -> numero seriale di Excel
const excelDate = (iso) => { const t = Date.parse(`${iso}T00:00:00Z`); return Number.isFinite(t) ? Math.round(t / 86400000) + 25569 : null; };

function sheetXml({ cols, rows, freeze, extra = '', views = '' }) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"${views}>${freeze ? `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}"${c.hidden ? ' hidden="1"' : ''} customWidth="1"/>`).join('')}</cols>
<sheetData>${rows.join('')}</sheetData>${extra}
<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>${/<tablePart/.test(extra) ? '' : ''}
</worksheet>`;
}

function tableXml(id, name, ref, columns) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${name}" displayName="${name}" ref="${ref}" totalsRowShown="0">
<autoFilter ref="${ref}"/>
<tableColumns count="${columns.length}">${columns.map((c, i) => `<tableColumn id="${i + 1}" name="${esc(c.name)}"${c.formula ? `><calculatedColumnFormula${c.array ? ' array="1"' : ''}>${esc(c.formula)}</calculatedColumnFormula></tableColumn>` : '/>'}`).join('')}</tableColumns>
<tableStyleInfo name="TableStyleLight1" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`;
}

// map: { name, macros: [{ code, name, check, processes: [{ code, name, check, micros: [{ code, name, ambito, dipartimenti, note, responsabile, scadenza, stato, check }] }] }] }
function buildBpbWorkbook(map) {
  // ---- foglio BPB
  const BPB_COLS = [
    { name: 'Ambito Analisi', width: 28 }, { name: 'Dipartimenti coinvolti', width: 40 }, { name: 'ID Macroprocesso', width: 14 },
    { name: 'Macro processo', width: 45, formula: F.bpbMacro, calc: true }, { name: 'ID Processo', width: 12, formula: F.bpbIdProc, calc: true },
    { name: 'Processo', width: 45 }, { name: 'ID Micro Processi', width: 14, formula: F.bpbIdMicro, array: true, calc: true },
    { name: 'Sotto processi', width: 55 }, { name: 'Note', width: 50 }, { name: 'Check processi', width: 12, hidden: true },
    { name: 'Check automatico', width: 30, formula: F.bpbCheck, array: true, calc: true },
    { name: 'Responsabile', width: 22 }, { name: 'Scadenza', width: 12 }, { name: 'Stato', width: 14 },
    { name: 'Chiave (tecnica)', width: 50, formula: F.bpbKey, calc: true },
  ];
  const bpbRows = [`<row r="1" ht="32" customHeight="1">${BPB_COLS.map((c, i) => cell(`${colName(i + 1)}1`, c.name, c.calc ? S.headCalc : S.headManual)).join('')}</row>`];
  let r = 1;
  for (const m of map.macros) {
    for (const p of m.processes) {
      for (const u of p.micros) {
        r++;
        const v = [u.ambito, u.dipartimenti, m.code, null, null, p.name, null, u.name, u.note, null, null, u.responsabile, u.scadenza, u.stato, null];
        bpbRows.push(`<row r="${r}">${[
          cell(`A${r}`, v[0], S.text), cell(`B${r}`, v[1], S.text), cell(`C${r}`, m.code, S.number),
          fcell(`D${r}`, F.bpbMacro, m.name, S.calcText), fcell(`E${r}`, F.bpbIdProc, p.code, S.calc),
          cell(`F${r}`, p.name, S.text), fcell(`G${r}`, F.bpbIdMicro, u.code, S.calc, true),
          cell(`H${r}`, u.name, S.text), cell(`I${r}`, u.note, S.text), cell(`J${r}`, null, S.text),
          fcell(`K${r}`, F.bpbCheck, u.check || 'OK', S.calcText, true),
          cell(`L${r}`, u.responsabile, S.text), u.scadenza && excelDate(u.scadenza) ? cell(`M${r}`, excelDate(u.scadenza), S.date) : cell(`M${r}`, null, S.date),
          cell(`N${r}`, u.stato, S.text), fcell(`O${r}`, F.bpbKey, `${m.code}|${String(p.name).trim()}`, S.calcText),
        ].join('')}</row>`);
      }
    }
  }
  if (r === 1) { r = 2; bpbRows.push(`<row r="2">${BPB_COLS.map((_, i) => cell(`${colName(i + 1)}2`, null, S.text)).join('')}</row>`); }
  const bpbRef = `A1:${colName(BPB_COLS.length)}${r}`;
  const last = Math.max(r, 2000);
  const bpbExtra = `
<conditionalFormatting sqref="A2:A${last}"><cfRule type="containsText" dxfId="1" priority="1" operator="containsText" text="in scope - Da attenzionare"><formula>NOT(ISERROR(SEARCH("in scope - Da attenzionare",A2)))</formula></cfRule><cfRule type="containsText" dxfId="2" priority="2" operator="containsText" text="out"><formula>NOT(ISERROR(SEARCH("out",A2)))</formula></cfRule><cfRule type="containsText" dxfId="3" priority="3" operator="containsText" text="in scope"><formula>NOT(ISERROR(SEARCH("in scope",A2)))</formula></cfRule></conditionalFormatting>
<conditionalFormatting sqref="K2:K${last}"><cfRule type="expression" dxfId="0" priority="4"><formula>AND($K2&lt;&gt;"",$K2&lt;&gt;"OK")</formula></cfRule></conditionalFormatting>
<dataValidations count="2"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="ID Macro non valido" error="Scegliere un ID presente in Anagrafica Processi. Per un nuovo macro processo aggiungerlo prima in anagrafica." sqref="C2:C${last}"><formula1>ListaMacro</formula1></dataValidation><dataValidation allowBlank="1" showInputMessage="1" promptTitle="Processo" prompt="Scrivere il nome esattamente come in Anagrafica Processi. Se non è censito, l'ID Processo mostrerà N/D." sqref="F2:F${last}"/></dataValidations>
<tableParts count="1"><tablePart r:id="rId1"/></tableParts>`;

  // ---- foglio Anagrafica
  const MACRO_COLS = [{ name: 'ID Macro' }, { name: 'Macro processo' }, { name: 'N. processi', formula: F.macroNProc, calc: true }, { name: 'N. micro processi', formula: F.macroNMicro, calc: true }, { name: 'Check', formula: F.macroCheck, calc: true }];
  const PROC_COLS = [{ name: 'ID Macro' }, { name: 'Macro processo', formula: F.procMacro, calc: true }, { name: 'N. progressivo', formula: F.procN, calc: true }, { name: 'ID Processo', formula: F.procId, calc: true }, { name: 'Processo' }, { name: 'N. micro processi', formula: F.procNMicro, array: true, calc: true }, { name: 'Check', formula: F.procCheck, array: true, calc: true }, { name: 'Chiave (tecnica)', formula: F.procKey, calc: true }];
  const procs = map.macros.flatMap((m) => m.processes.map((p, i) => ({ m, p, n: i + 1 })));
  const height = Math.max(map.macros.length, procs.length, 1);
  const anaRows = [
    `<row r="1" ht="22" customHeight="1">${cell('A1', 'MACRO PROCESSI  (livello N)', S.section)}${cell('G1', 'PROCESSI  (livello N.N)', S.section)}</row>`,
    `<row r="2" ht="32" customHeight="1">${MACRO_COLS.map((c, i) => cell(`${colName(i + 1)}2`, c.name, c.calc ? S.headCalc : S.headManual)).join('')}${PROC_COLS.map((c, i) => cell(`${colName(i + 7)}2`, c.name, c.calc ? S.headCalc : S.headManual)).join('')}</row>`,
  ];
  for (let i = 0; i < height; i++) {
    const row = i + 3;
    const parts = [];
    const m = map.macros[i];
    if (m) {
      const nMicro = m.processes.reduce((n, p) => n + p.micros.length, 0);
      parts.push(cell(`A${row}`, m.code, S.number), cell(`B${row}`, m.name, S.text), fcell(`C${row}`, F.macroNProc, m.processes.length, S.calc),
        fcell(`D${row}`, F.macroNMicro, nMicro, S.calc), fcell(`E${row}`, F.macroCheck, m.check || 'OK', S.calcText));
    } else if (i === 0) {
      parts.push(cell(`A${row}`, null, S.number), cell(`B${row}`, null, S.text), fcell(`C${row}`, F.macroNProc, 0, S.calc), fcell(`D${row}`, F.macroNMicro, 0, S.calc), fcell(`E${row}`, F.macroCheck, 'Inserire ID Macro', S.calcText));
    }
    const q = procs[i];
    if (q) {
      parts.push(cell(`G${row}`, q.m.code, S.number), fcell(`H${row}`, F.procMacro, q.m.name, S.calcText), fcell(`I${row}`, F.procN, q.n, S.calc),
        fcell(`J${row}`, F.procId, q.p.code, S.calc), cell(`K${row}`, q.p.name, S.text), fcell(`L${row}`, F.procNMicro, q.p.micros.length, S.calc, true),
        fcell(`M${row}`, F.procCheck, q.p.check || 'OK', S.calcText, true), fcell(`N${row}`, F.procKey, `${q.m.code}|${String(q.p.name).trim()}`, S.calcText));
    } else if (i === 0) {
      parts.push(cell(`G${row}`, null, S.number), fcell(`H${row}`, F.procMacro, '', S.calcText), fcell(`I${row}`, F.procN, '', S.calc), fcell(`J${row}`, F.procId, '', S.calc),
        cell(`K${row}`, null, S.text), fcell(`L${row}`, F.procNMicro, 0, S.calc, true), fcell(`M${row}`, F.procCheck, 'Completare ID Macro e Processo', S.calcText, true), fcell(`N${row}`, F.procKey, '', S.calcText));
    }
    anaRows.push(`<row r="${row}">${parts.join('')}</row>`);
  }
  const macroRef = `A2:E${2 + Math.max(map.macros.length, 1)}`;
  const procRef = `G2:N${2 + Math.max(procs.length, 1)}`;
  const anaExtra = `
<conditionalFormatting sqref="E3:E1000"><cfRule type="expression" dxfId="0" priority="1"><formula>AND($E3&lt;&gt;"",$E3&lt;&gt;"OK")</formula></cfRule></conditionalFormatting>
<conditionalFormatting sqref="M3:M2000"><cfRule type="expression" dxfId="0" priority="2"><formula>AND($M3&lt;&gt;"",$M3&lt;&gt;"OK")</formula></cfRule></conditionalFormatting>
<tableParts count="2"><tablePart r:id="rId1"/><tablePart r:id="rId2"/></tableParts>`;

  // ---- foglio Istruzioni
  const guide = [
    ['GUIDA ALL\'UTILIZZO DEL FILE', '', S.title], [`Mappa: ${map.name} · generata da Trama (HSPI Team Manager) il ${new Date().toLocaleDateString('it-IT')}`, '', 0], ['', '', 0],
    ['STRUTTURA DEI CODICI', '', S.section], ['Livello', 'Significato', S.headManual], ['N', 'Macro processo (es. 1)', 0], ['N.N', 'Processo all\'interno del macro processo (es. 1.2)', 0], ['N.N.N', 'Micro processo / sotto processo all\'interno del processo (es. 1.2.3)', 0], ['', '', 0],
    ['FOGLI', '', S.section], ['Foglio', 'Contenuto', S.headManual], ['BPB', 'Elenco di lavoro dei micro processi (una riga = un sotto processo). Tabella tblBPB.', 0], ['Anagrafica Processi BPB', 'Elenco ufficiale dei macro processi (N) e dei processi (N.N). Da qui nascono gli ID usati nel BPB.', 0], ['', '', 0],
    ['LEGENDA COLORI', '', S.section], ['Intestazione blu', 'Colonna da compilare a mano', 0], ['Intestazione grigia', 'Colonna calcolata in automatico: non scrivere, non cancellare', 0], ['Check rosso', 'Riga da verificare: il testo spiega il problema', 0], ['', '', 0],
    ['COME AGGIUNGERE…', '', S.section],
    ['Un macro processo', 'Anagrafica Processi BPB → tabella Macro processi: nuova riga in fondo con il primo ID libero e il nome.', 0],
    ['Un processo', 'Anagrafica Processi BPB → tabella Processi: nuova riga in fondo con ID Macro e nome del Processo. ID Processo (N.N) si genera da solo con il numero successivo.', 0],
    ['Un micro processo', 'Foglio BPB: inserire una riga all\'interno del gruppo del processo (tasto destro → Inserisci → Righe tabella sopra). Compilare ID Macroprocesso (menu a tendina), Processo (stesso nome dell\'anagrafica) e Sotto processi.', 0],
    ['', '', 0], ['REGOLE IMPORTANTI', '', S.section],
    ['1', 'Il nome del Processo nel BPB deve essere identico a quello in anagrafica (spazi iniziali/finali e doppi vengono ignorati). Se diverso, ID Processo mostra N/D.', 0],
    ['2', 'La numerazione segue l\'ordine delle righe: spostare un processo in anagrafica o una riga nel BPB cambia i relativi ID.', 0],
    ['3', 'Le righe di uno stesso processo nel BPB devono essere consecutive e nell\'ordine dell\'anagrafica (altrimenti il Check lo segnala).', 0],
    ['4', 'Non cancellare le colonne grigie né la colonna "Chiave (tecnica)": servono ai collegamenti tra i fogli.', 0],
    ['5', 'Responsabile, Scadenza e Stato si gestiscono in Trama: il file si può reimportare in Trama dopo averlo modificato.', 0],
  ];
  const guideRows = guide.map(([a, b, s], i) => `<row r="${i + 1}">${cell(`A${i + 1}`, a, s)}${cell(`B${i + 1}`, b, s === S.headManual ? s : s === S.title || s === S.section ? 0 : S.text)}</row>`);

  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/><Override PartName="/xl/tables/table2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/><Override PartName="/xl/tables/table3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(map.name)}</dc:title><dc:creator>Trama · HSPI Team Manager</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` },
    { name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="1"/></bookViews><sheets><sheet name="Istruzioni" sheetId="1" r:id="rId1"/><sheet name="BPB" sheetId="2" r:id="rId2"/><sheet name="Anagrafica Processi BPB" sheetId="3" r:id="rId3"/></sheets><definedNames><definedName name="ListaMacro" comment="Elenco ID macro processi (da Anagrafica Processi)">tblMacro[ID Macro]</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: STYLES },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml({ cols: [{ width: 28 }, { width: 120 }], rows: guideRows }) },
    { name: 'xl/worksheets/sheet2.xml', data: sheetXml({ cols: BPB_COLS, rows: bpbRows, freeze: 1, extra: bpbExtra, views: ' tabSelected="1" zoomScale="85"' }) },
    { name: 'xl/worksheets/_rels/sheet2.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>` },
    { name: 'xl/worksheets/sheet3.xml', data: sheetXml({ cols: [{ width: 10 }, { width: 50 }, { width: 11 }, { width: 13 }, { width: 26 }, { width: 3 }, { width: 10 }, { width: 45 }, { width: 13 }, { width: 11 }, { width: 50 }, { width: 13 }, { width: 28 }, { width: 50 }], rows: anaRows, freeze: 2, extra: anaExtra }) },
    { name: 'xl/worksheets/_rels/sheet3.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table2.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table3.xml"/></Relationships>` },
    { name: 'xl/tables/table1.xml', data: tableXml(1, 'tblBPB', bpbRef, BPB_COLS) },
    { name: 'xl/tables/table2.xml', data: tableXml(2, 'tblMacro', macroRef, MACRO_COLS) },
    { name: 'xl/tables/table3.xml', data: tableXml(3, 'tblProcessi', procRef, PROC_COLS) },
  ];
  return writeZip(files);
}

module.exports = { buildBpbWorkbook, excelDate };
