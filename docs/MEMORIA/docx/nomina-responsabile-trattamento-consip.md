# Template `nomina-responsabile-trattamento-consip` — facsimile Consip di nomina del Responsabile del trattamento dei dati, art. 28 GDPR (Word)

## 1. Identità

| Voce | Valore |
|---|---|
| Nome del template | `nomina-responsabile-trattamento-consip` |
| Formato | `.docx` (Word) |
| Tipo di documento | atto di **nomina del Responsabile del trattamento dei dati** (art. 28 GDPR) da allegare al contratto di fornitura di un Contratto Esecutivo dell'AQ ID 2610, Lotto 1 |
| App di riferimento | **Verbale Studio** (motore Word, da realizzare) |
| Fornitore / progetto | Consip S.p.A. (facsimile del kit ODA; la PA lo adotta per ogni contratto) |
| File visti | `KIT_ODA_AQ_ID2610_-_Facsimile_nomina_responsabile_trattamento.docx`: 5 pagine, 2.670 parole, 21 clausole; data e dimensione non note |
| Analizzato | 01/10/2026 (Verbale Studio 1.0.0, portale 0.8.1) |

Fascicolo: `../fascicoli/fascicolo-aq-id2610.md`.

**Provenienza**: agente `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, ramo `claude/cool-noether-kv3o8c`, commit `74c4dad`, analisi del 01/10/2026. Scheda originale in `../_archivio/2026-10-01/cool-noether/MEMORIA/docx/`. Unificata il 01/10/2026 sul ramo `claude/integrazione-2026-10-01`.

## 2. Impronta di riconoscimento

Impronta leggibile da un programma: `nomina-responsabile-trattamento-consip.impronta.json` (`punteggioMinimo` 3). Segnali, in ordine, con il peso:

1. nome del file con `Facsimile_nomina_responsabile_trattamento` (regex `(?i)facsimile_nomina_responsabile_trattamento`) (peso 2);
2. titolo in grassetto "Nomina Responsabile del trattamento dei dati" e riferimento "art. 28 del Regolamento UE n. 2016/679" (peso 2);
3. testo blu `0000FF` in corsivo tra `<` e `>` (peso 1);
4. 21 clausole numerate senza titoli (peso 1); piè di pagina della procedura (stessa famiglia delle appendici).

## 3. Mappa degli oggetti

- Un atto giuridico a **21 clausole numerate** (elenco numerato di Word, stile "Paragrafo elenco"), con sotto-elenco 1)-9) nella clausola 6 e puntati nella 7.
- Non ha titoli, tabelle, campi o sommario.
- Calibri 11, A4, una sezione; intestazione con loghi (immagini), piè di pagina con la frase della procedura ("Procedura aperta per l'affidamento di Accordi Quadro … servizi applicativi in ottica cloud"); nessun campo; metadati con azienda Consip.
- Gli spazi per nomi e date sono linee `________` (pattern `_{5,}`).

## 4. Parti fisse e parti variabili

**Fisso**: il testo delle 21 clausole. Chi l'ha scritto voleva un testo che la PA possa adottare quasi senza modifiche, ma con **scelte esplicite** (le alternative) e qualche vuoto obbligatorio.

**Variabili** (scritte **in blu `0000FF`, grassetto corsivo, tra parentesi angolari** `<…>`): nota iniziale per la PA (RTI: una clausola unica o nomine separate), finalità del trattamento, tipi di dati, categorie di interessati, obbligo del registro (soglia 250 dipendenti), misure AgID 2/2017, preavviso per gli audit (tre giorni o altro), **alternative da scegliere** (autorizzazione generale/specifica dei sub-responsabili; riscontro agli interessati opzione 1/2), periodicità delle comunicazioni. Più le linee `________` per nomi e date (PA, fornitore, firme).

## 5. Regole di modifica, aggiunta ed eliminazione

- Compilare ogni parte blu e ogni linea vuota; **risolvere ogni alternativa** scegliendone una e togliendo l'altra; **togliere la nota iniziale per la PA**.
- Controlli naturali del documento finito: "nessun blu rimasto, nessuna linea vuota, ogni alternativa risolta".
- Non aggiungere o togliere clausole: la numerazione è un elenco numerato di Word e si aggiorna da sola, ma il testo è un facsimile Consip.
- Caso RTI: la PA decide se una clausola unica o nomine separate per ogni azienda (nota iniziale).

## 6. Funzioni consigliate dell'app

Funzioni esistenti nel portale: **Esplora file** per archiviare facsimile e versioni firmate (versioni, cestino); Verbale Studio **Transcript** solo per leggere il testo piatto.

Da realizzare (motore Word di Verbale Studio):

1. *Elenca scelte e campi* (alternative, parti blu, linee vuote).
2. *Compila guidato*: nome PA, fornitore, finalità, dati, interessati, opzioni.
3. *Togli le note per la PA*.
4. *Controlla*: niente blu, niente linee vuote, ogni alternativa risolta.
5. *Esporta* `.docx`.

È lo stesso motore "compila un modello" del Piano Operativo (`piano-operativo-consip-id2610.md`), con segnaposto diversi (blu + parentesi angolari invece di giallo + `xxx`): il motore deve riconoscere entrambi gli stili di segnaposto.

## 7. Stato dell'app su questo template

Oggi solo testo piatto (`docxToText`). Manca tutto l'elenco della sezione 6. Nessuna misura riportata.

## 8. Dubbi aperti

- RTI: la PA sceglie una clausola unica o nomine separate? Decisione da prendere per ogni contratto.
- Preavviso per gli audit: tre giorni o altro valore?
- La soglia dei 250 dipendenti per l'obbligo del registro va verificata per ogni azienda del RTI.

## 9. Da classificare

- Nulla: tutte le informazioni della scheda originale sono nelle sezioni sopra.

## 10. Fonti

- `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, commit `74c4dad`: `docs/MEMORIA/docx/nomina-responsabile-trattamento-consip.md` (sezioni 1-4 originali), `.impronta.json` (pesi, pattern, struttura, alternative, funzioni proposte), riga nel README.
- `docs/INTEGRAZIONE-APP.md`, `app/src/verbali/docx.js`: funzioni reali disponibili oggi.
