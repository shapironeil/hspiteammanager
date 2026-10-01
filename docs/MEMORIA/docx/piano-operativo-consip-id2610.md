# Template: piano-operativo-consip-id2610 (.docx)

Piano Operativo del fornitore per un Contratto Esecutivo dell'Accordo Quadro Consip **ID 2610** (servizi applicativi in ottica cloud, Lotto 1). App: **Verbale Studio** (motore Word). Impronta: `piano-operativo-consip-id2610.impronta.json`. Conoscenza del kit: `kit-aq-id2610.conoscenza.json`. Fascicolo: `../fascicolo-aq-id2610.md`.

## File visti

| File | Modificato | Analizzato | Numeri |
|---|---|---|---|
| `ID_2610_SAC3_Template_Piano_Operativo_Template_Lotto_1_v3.docx` | 28/01/2026 | 01/10/2026 | 15 pagine, 4.299 parole, 11 tabelle, 9 titoli di livello 1, 24 di livello 2, 56 di livello 3, 201 evidenziazioni gialle, 24 immagini (12 MB, copertina), 36 caselle di testo |

## 1. Che cos'è e perché è fatto così

È il documento con cui il RTI risponde al **Piano dei Fabbisogni** dell'Amministrazione: dice quali servizi dell'AQ attiva, in che quantità, quando, con quali aziende del raggruppamento e con quali persone di riferimento. Il Piano Operativo diventa parte del Contratto Esecutivo (ODA). Chi l'ha costruito voleva un modulo **da compilare in fretta e in modo uniforme**: testo fisso "da capitolato", punti variabili evidenziati in giallo, un capitolo per servizio tutto uguale (si eliminano quelli non richiesti), tabelle con le quantità da copiare dal Piano dei Fabbisogni. Tutto ciò che è giallo o `xxx` è una decisione del fornitore; tutto il resto non va toccato perché ripete il capitolato.

Catena dei documenti: Piano dei Fabbisogni (PA) → **Piano Operativo** (fornitore) → Contratto Esecutivo / ODA → Piano di Lavoro Generale e di obiettivo (`../xlsx/piano-di-lavoro-txt-biosiris.md`) → kick-off → SAL periodici (`sal-verbale`, ramo awesome-cray) → fatturazione.

## 2. Struttura

| # | Capitolo (Titolo 1, maiuscolo) | Contenuto | Variabile |
|---|---|---|---|
| — | Copertina | pagina intera fatta di immagini e caselle di testo sovrapposte: titolo "PIANO OPERATIVO", "ODA NR. XXXXXX", "LOTTO 1", nome del RTI, "CONSIP", CIG dell'AQ, spazio "LOGO E INTESTAZIONE STAZIONE APPALTANTE" | ODA, logo PA |
| — | SOMMARIO | campo `TOC \o "1-2"` dentro un content control: va aggiornato | |
| 1 | Dati anagrafici amministrazione richiedente | 2 tabelle etichetta/valore: denominazione, indirizzo, CAP, comune, provincia, regione, CF, codice IPA, mail, PEC; referente: ruolo, telefono, mail, PEC | tutte le celle di destra |
| 2 | Introduzione | 2.1 Contesto, 2.2 Scopo, 2.3 Campo di applicazione: "riprendere dal Piano dei Fabbisogni"; 2.4 Acronimi e glossario (tabella con 8 voci di base, "da personalizzare") | testo + righe glossario |
| 3 | Organizzazione del contratto esecutivo | una frase fissa (rimando all'Offerta Tecnica) | — |
| 4 | Importo contrattuale e quantità | importo in cifre e lettere; 5 tabelle Servizio / Modalità / Metrica / Dimensionamento / Fabbisogno (Realizzativi, Manutenzione, Supporto tecnico-specialistico, Gestione del portafoglio, Accessori): 26 righe di servizio, celle unite sul nome del servizio | importo, 26 quantità `xxxx`, righe da togliere |
| 5 | Deliverable della fornitura | elenco puntato da riempire con i deliverable dell'OT per i servizi richiesti | elenco |
| 6 | Servizio di fornitura | **14 sotto-capitoli identici**, uno per servizio (SVI, MI, CF, CW, MAD, MAC, MAD-MAC, SA, GA, Gestione operativa, Identità e accesso, Acquisizione dati, E-learning, Contact center), ognuno con 4 Titolo 3: Attivazione (`xx/xx/202X`), Vincoli temporali (`XX mesi`, max 24), Erogazione e consuntivazione (sede: `<fornitore / PA / altro>`), Cronoprogramma (`NOME AMMINISTRAZIONE`) | date, durate, sedi, nome PA; capitoli da eliminare |
| 7 | Attività in carico alle aziende e quote di RTI | matrice 18 aziende × 14 servizi (celle vuote da marcare); tabella Azienda / % RTI / Quota ordine | marcature, `xx,xx%`, `xxx.xxx,xx€` |
| 8 | Quota e prestazioni in subappalto | frase fissa + frase gialla facoltativa | sì/no |
| 9 | CV delle risorse professionali | frase fissa; 9.1 tabella Nominativo / Ruolo / Profilo con 9 ruoli (RUAC del CE, Responsabile tecnico servizi tecnologici, Responsabile migrazione cloud, Referenti per realizzativi, portafoglio, manutenzione, supporto, accessori, referente cloud native) con rimando al Capitolato Tecnico Generale | nomi; righe da togliere |

Due sezioni: la copertina (margini 0, numerazione a parte) e il corpo (A4, margini stretti 1,5 cm ai lati, 0,3 cm sopra e sotto, numerazione da 1). Intestazione del corpo: "PA Cliente ID 2610 – AQ SAC 3 - LOTTO 1 – Piano Operativo". Piè di pagina: nome RTI, "PIANO OPERATIVO | PAG. n di N" (campi PAGE e SECTIONPAGES).

## 3. Stili e layout

- **Carattere**: Segoe UI 11, colore blu scuro `012F53` (stile Normal); tabelle in Calibri (stile Table Paragraph). Nei titoli 3 Segoe UI 10 grassetto `012F53`. Compaiono anche Arial (copertina) e Graphik (residui).
- **Titoli**: Heading 1 = 12 pt grassetto blu `002060` in maiuscolo, numerato; Heading 2 = 10 pt grassetto, numerato; i Titolo 3 usano uno stile personalizzato "Titolo 3 - PE_AQ_DataManagement_ENG" (e lo stile del corpo si chiama "Normale - PO_AQ_DataManagement_ENG"): nomi che tradiscono l'origine da un altro modello.
- **Tabelle**: riga di testa con sfondo blu `4472C4` e testo bianco; celle con sfondo `F2F2F2`; testo nelle celle dentro rientri "blockquote"; larghezze in percentuale (26/73, 25/19/21/19/14).
- **Segnaposto**: evidenziazione **gialla** (201 run), testo `xxxx` / `XXXXXXX` / `xx/xx/202X` / `XX mesi` / `xx,xx%` / `xxx.xxx,xx€` / `Nome Cognome` / `NOME AMMINISTRAZIONE`, istruzioni tra parentesi angolari `<Eliminare i servizi non richiesti>` e frasi d'istruzione in giallo ("Riprendere dal Piano dei Fabbisogni"). Non ci sono content control, segnalibri o campi per i dati: la compilazione è a mano.
- **Campi**: TOC, 33 PAGEREF, 2 DOCVARIABLE "Data" (copertina, senza variabile definita nel file: residuo), PAGE, SECTIONPAGES.
- Nessuna revisione, nessun commento, nessuna protezione; proprietà SharePoint (`customXml`) innocue.

## 4. Convenzioni di denominazione

- File: `ID_<AQ>_SAC3_Template_Piano_Operativo_Template_Lotto_<n>_v<n>.docx` (il modello); compilato: atteso `<PA>_Piano_Operativo_<ODA>_v<n>.docx` o lo standard della PA (vedi Appendice 3: codice documento, versione, data, tabella revisioni).
- Sigle dei servizi: SVI, MI, CF, CW, MAD, MAC, MAD-MAC, SS (nelle tabelle) / SA (nel titolo del capitolo: incoerenza del modello), GA; servizi accessori senza sigla.
- Ruoli: "RUAC del CE", "Referente per …", con rimando "Rif. par. § 7.2.x Allegato 12 - Capitolato Tecnico Generale".

## 5. Segnali per riconoscere il modello

1. Intestazione di pagina che contiene `ID 2610` e `Piano Operativo`.
2. Titoli di livello 1 (in quest'ordine): DATI ANAGRAFICI AMMINISTRAZIONE RICHIEDENTE, INTRODUZIONE, ORGANIZZAZIONE DEL CONTRATTO ESECUTIVO, IMPORTO CONTRATTUALE E QUANTITÀ…, DELIVERABLE DELLA FORNITURA, SERVIZIO DI FORNITURA, ATTIVITÀ IN CARICO ALLE AZIENDE E QUOTE DI RTI, QUOTA E PRESTAZIONI IN SUBAPPALTO, CV DELLE RISORSE PROFESSIONALI.
3. Tabelle con intestazione Servizio / Modalità / Metrica / Dimensionamento / Fabbisogno.
4. Sotto-capitoli ripetuti Attivazione del Servizio / Vincoli Temporali / Erogazione e Consuntivazione / Cronoprogramma.
5. Stili con nome `*_AQ_DataManagement_ENG`; carattere Segoe UI colore `012F53`.
6. Piè di pagina "PIANO OPERATIVO | PAG."; copertina con "ODA NR."

## 6. Funzioni e caratteristiche Word usate

| Caratteristica | Uso |
|---|---|
| Stili di titolo numerati (Heading 1/2 + stile personalizzato per il livello 3) | struttura e sommario automatico |
| Content control + campo TOC | sommario |
| Tabelle con celle unite in verticale | un servizio con più modalità |
| Evidenziazione gialla | marcare ciò che va compilato |
| Caselle di testo e immagini ancorate | copertina grafica |
| Due sezioni con intestazioni/piè di pagina diversi, campi PAGE/SECTIONPAGES | copertina senza numero, corpo numerato |
| DOCVARIABLE | data in copertina (non funzionante) |

## 7. Anomalie trovate (controlli che l'app dovrà fare)

1. **Copertina con residui di un'altra gara**: le caselle di testo contengono ancora "OFFERTA TECNICA AQ CONSIP ID 1881/L3", il nome di un'altra amministrazione e "MARZO 2021", oltre a "LOGO E INTESTAZIONE STAZIONE APPALTANTE": probabilmente coperti dall'immagine, ma restano nel file (ricerca, accessibilità, PDF).
2. Stili e proprietà con nomi di un altro modello (`PE_AQ_DataManagement_ENG`, azienda nei metadati diversa dal RTI).
3. Sigla del servizio di supporto scritta **SS** nelle tabelle e **SA** nel titolo del capitolo 6.
4. Refusi fissi: "AMMNISTRAZIONE" (tabella 1), "Piano de Fabbisogni", "IL servizio" in maiuscolo, titolo "Servizio di Servizio di Gestione…", spazi prima delle virgolette chiuse ("ICT ”").
5. Il capitolo 8 cita l'art. 105 del **D.Lgs. 50/2016** mentre la gara è ai sensi del D.Lgs. 36/2023 (le appendici lo dicono): da verificare con chi conosce il contratto.
6. Sommario memorizzato: va rigenerato dopo l'eliminazione dei capitoli.
7. Campi DOCVARIABLE senza variabile: in Word mostrano l'ultimo valore memorizzato.
8. Nelle 14 sezioni di servizio il testo è identico: il modello si affida al copia-incolla, quindi ogni correzione va ripetuta 14 volte.
9. Il titolo 9.1 finisce con un punto; il capitolo 4 dice "esprimere in lettere /00 euro" senza parentesi chiusa coerente.

## 8. Cosa sa fare l'app oggi e cosa manca

**Verbale Studio oggi**: legge un `.docx` solo come testo piatto (`app/src/verbali/docx.js`, `docxToText`) per i transcript. Nessuna scrittura di Word, nessuna lettura di tabelle, stili o campi.

**Manca** (vale anche per il verbale SAL della sessione awesome-cray): lettura strutturata (titoli, tabelle, evidenziazioni, campi, sezioni, intestazioni), riconoscimento del modello, elenco dei punti da compilare, compilazione per funzioni (anagrafica, quantità, servizi attivi, date, aziende, ruoli), eliminazione dei capitoli non richiesti con rinumerazione, controlli di completezza e coerenza, rigenerazione del sommario, esportazione `.docx` conservando il resto del file, confronto tra versioni, pulizia dei residui (copertina, stili).

## 9. Funzioni dell'app da usare quando arriva un file così (una volta sviluppate)

1. *Riconosci modello* → "Piano Operativo AQ ID 2610".
2. *Leggi piano operativo* → struttura in dati: anagrafica, importo, quantità per servizio, servizi attivi con date/durate/sedi, aziende e quote, ruoli.
3. *Controlla* → segnaposto rimasti, servizi nel cap. 4 senza il cap. 6 corrispondente (e viceversa), quote RTI che non sommano 100 %, quota ordine ≠ % × importo, durate > 24 mesi, date prima dell'ODA, sigle incoerenti, residui di copertina, glossario con sigle usate ma non definite (qui serve il glossario del progetto).
4. *Compila* da un oggetto "contratto esecutivo" (lo stesso che alimenta piano di lavoro, SAL e kick-off): dati PA, quantità dal Piano dei Fabbisogni, servizi scelti, date, aziende, ruoli.
5. *Taglia* i capitoli dei servizi non richiesti e le righe delle tabelle, poi *rigenera il sommario*.
6. *Esporta* il `.docx` finito conservando copertina e stili; *confronta* con la versione precedente.
