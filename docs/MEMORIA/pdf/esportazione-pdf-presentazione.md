# Template `esportazione-pdf-presentazione` — PDF esportato da una presentazione PowerPoint

## 1. Identità

- **Template**: `esportazione-pdf-presentazione` · formato `.pdf` · app di riferimento: **Cippi** (lo legge come appunto e lo confronta con la presentazione).
- **Tipo di documento**: il PDF che si manda al cliente, esportato da PowerPoint ("Salva con nome → PDF"); vale anche per gli appunti di studio in PDF.
- **Fornitore / progetto**: HSPI, kick-off Data Platform (il PDF è l'esportazione della scheda [`kickoff-hspi-atac-data-platform`](../pptx/kickoff-hspi-atac-data-platform.md)).
- **File visti**: `ATAC_Kick_Off_Data_Platform_v1.0.pdf` (16 pagine, 645 KB, creato il 05/05/2026 con "Microsoft® PowerPoint® for Microsoft 365", il giorno dopo la data in copertina).
- **Provenienza**: agente `ecstatic-planck`, sessione `session_01SsSNTHHcV7asTQyvonE7gX`, ramo `claude/ecstatic-planck-q9m57v`, commit `981931f` (lettore PDF, confronto, scheda) e il commit di unione con `main` v0.10.0; analisi del 01/10/2026 con Cippi 0.3.0. Nessun contenuto del file è copiato qui; niente nomi di persone.

## 2. Impronta di riconoscimento

Vedi `esportazione-pdf-presentazione.impronta.json`. Segnali, in ordine:

1. pagine `MediaBox [0 0 960 540]` pt = 13,33 × 7,5 pollici = la slide 16:9 "Widescreen" (720 × 540 per il 4:3) → è una presentazione;
2. `/Producer` e `/Creator` con "PowerPoint" → esportazione da PowerPoint (LibreOffice scrive "Impress", le stampanti virtuali il loro nome);
3. caratteri in **sottoinsieme** con prefisso casuale (`BCDEEE+Poppins-Bold`), titoli a 18 pt in alto con il numerino di pagina (8–9 pt) alla stessa altezza a destra;
4. **stesso nome di un `.pptx`** nella cartella del progetto → è la sua esportazione (Cippi lo elenca da solo negli Appunti).

Il riconoscimento utile non è "che template è" ma **a quale presentazione corrisponde e se è aggiornato**: confronto pagina per slide (Appunti → Confronta).

## 3. Mappa degli oggetti

| Cosa | Com'è nel file |
|---|---|
| Versione e struttura | PDF 1.7 con **flussi xref e object stream** (oggetti compressi dentro altri oggetti), aggiornamento incrementale (due `startxref`), non cifrato |
| Pagine | una per slide, stesso ordine (16 = 16) |
| Testo | righe di blocchi `Tj`/`TJ` con la matrice `Tm`; titolo in alto (y ≈ 509 su 540) a 18 pt; i testi ruotati (la fascia verticale del Gantt) escono una lettera per riga |
| Caratteri | TrueType semplici `WinAnsiEncoding` (apostrofi e trattini tipografici tra 0x80 e 0x9F) e composti `Type0` con `Identity-H` + mappa `ToUnicode` (due byte per carattere) |
| Immagini | 91 oggetti immagine (la tabella-immagine della slide 13, loghi, icone SVG rasterizzate): non si leggono |
| Metadati | producer/creator, titolo = quello del `.pptx` ("PowerPoint Presentation"), autore = chi ha esportato, data di creazione = data dell'esportazione |

## 4. Parti fisse e parti variabili

- **Fisse** (per ogni esportazione da PowerPoint): dimensione delle pagine, producer, struttura dei caratteri, titolo e numerino per pagina.
- **Variabili**: il contenuto (segue la presentazione al momento dell'esportazione), la data di creazione, l'autore.
- Il PDF **non si aggiorna da solo**: ogni correzione al `.pptx` fatta dopo l'esportazione non c'è nel PDF.

## 5. Regole di modifica, aggiunta ed eliminazione

- Non si modifica il PDF: si corregge il `.pptx` (in Cippi o in PowerPoint) e si **riesporta**, con lo stesso nome, nella cartella del progetto accanto al `.pptx`.
- Prima di inviarlo: Appunti → **Confronta** deve dire "Il PDF corrisponde alla presentazione".
- Per gli appunti PDF di altri documenti: *Aggiungi appunti* li mette in `Cippi/<documento>/Appunti/`.

## 6. Funzioni consigliate dell'app

Disponibili (Cippi 0.3.0):
- **Appunti → Confronta** (`GET /api/cippi/docs/:id/appunti/pdf?name=|path=`): legge il testo pagina per pagina e lo abbina alle slide (parole in comune e titolo); verdetto *allineato* / *non aggiornato* (pagine senza slide, slide senza pagina, ordine diverso, testi diversi, con le parole solo da una parte) / *non è l'esportazione*; sotto, il testo del PDF per pagina.
- **PDF collegati**: i PDF con lo stesso nome del `.pptx` nella cartella del progetto compaiono da soli negli Appunti.

Da realizzare:
- confronto della data di creazione del PDF con la data di modifica del `.pptx` e con la versione salvata in Cippi;
- ricerca nel testo degli appunti dal pannello strumenti;
- lettura delle tabelle incollate come immagini (OCR nel motore locale);
- testi ruotati raggruppati per matrice di rotazione.

## 7. Stato dell'app su questo template

Misurato il 01/10/2026 (Cippi 0.3.0, `app/src/cippi/pdf-read.js`, senza librerie):
- 16 pagine lette in **0,16 s** (object stream, Flate, ToUnicode, larghezze W);
- titoli di pagina corretti in 16 su 16 (il numerino a destra viene scartato perché più piccolo);
- confronto con il `.pptx` v1.0: 16 coppie nell'ordine, somiglianza media 0,98, **allineato**; con una slide tolta e due invertite nel `.pptx`: "1 pagina senza slide, ordine diverso".
- Prima della 0.3.0 Cippi archiviava i PDF senza leggerli.

## 8. Dubbi aperti

- Quando il PDF è più nuovo del `.pptx` in Cippi (esportato da PowerPoint dopo modifiche non importate), il confronto dice "non aggiornato" riferendosi alla presentazione in Cippi: serve un messaggio che distingua i due casi (date dei file).
- Le pagine con sola immagine (tabella incollata) risultano uguali alla slide anche se la tabella è cambiata.

## 9. Da classificare

- Il PDF porta nei metadati il nome di chi ha esportato (campo `Author`): non viene mostrato nelle schede né nel confronto.
- I PDF di Word (verbali stampati) hanno pagine A4 (595 × 842 pt): il lettore li legge, il confronto con una presentazione non ha senso ma la lettura del testo sì.

## 10. Fonti

- Lettura del file `ATAC_Kick_Off_Data_Platform_v1.0.pdf` con `pdf-read.js` e confronto con il `.pptx` (sessione `session_01SsSNTHHcV7asTQyvonE7gX`, 01/10/2026): sezioni 1, 3, 7.
- Analisi della struttura interna (oggetti, caratteri, metadati) con gli strumenti della sessione: sezioni 2, 3.
- Report `docs/REPORT/2026-10-01-memoria-kickoff-atac-offerta-erp-pdf.md`.
