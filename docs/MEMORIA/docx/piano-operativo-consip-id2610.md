# Template `piano-operativo-consip-id2610` — Piano Operativo del fornitore per un Contratto Esecutivo dell'AQ Consip ID 2610 (Word)

## 1. Identità

| Voce | Valore |
|---|---|
| Nome del template | `piano-operativo-consip-id2610` |
| Formato | `.docx` (Word) |
| Tipo di documento | **Piano Operativo** del fornitore per un Contratto Esecutivo dell'Accordo Quadro Consip **ID 2610** (servizi applicativi in ottica cloud, Lotto 1): modulo da compilare |
| App di riferimento | **Verbale Studio** (motore Word, da realizzare) |
| Fornitore / progetto | modello del RTI aggiudicatario dell'AQ (capofila Engineering), compilato dal team per ogni PA |
| File visti | `ID_2610_SAC3_Template_Piano_Operativo_Template_Lotto_1_v3.docx`: modificato il 28/01/2026; 15 pagine, 4.299 parole, 11 tabelle, 9 titoli di livello 1, 24 di livello 2, 56 di livello 3, 201 evidenziazioni gialle, 24 immagini (12 MB, copertina), 36 caselle di testo; dimensione totale non nota |
| Analizzato | 01/10/2026 (Verbale Studio 1.0.0, portale 0.8.1) |

Conoscenza del kit: `kit-aq-id2610.conoscenza.json`. Fascicolo: `../fascicoli/fascicolo-aq-id2610.md`.

Che cos'è e perché è fatto così: è il documento con cui il RTI risponde al **Piano dei Fabbisogni** dell'Amministrazione: dice quali servizi dell'AQ attiva, in che quantità, quando, con quali aziende del raggruppamento e con quali persone di riferimento. Il Piano Operativo diventa parte del Contratto Esecutivo (ODA). Chi l'ha costruito voleva un modulo **da compilare in fretta e in modo uniforme**: testo fisso "da capitolato", punti variabili evidenziati in giallo, un capitolo per servizio tutto uguale (si eliminano quelli non richiesti), tabelle con le quantità da copiare dal Piano dei Fabbisogni.

Catena dei documenti: Piano dei Fabbisogni (PA) → **Piano Operativo** (fornitore) → Contratto Esecutivo / ODA → Piano di Lavoro Generale e di obiettivo (`../xlsx/piano-di-lavoro-txt-biosiris.md`) → kick-off (`../pptx/kickoff-txt-biosiris.md`) → SAL periodici (`sal-verbale.md`, `../pptx/sal-presentazione.md`) → fatturazione.

**Provenienza**: agente `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, ramo `claude/cool-noether-kv3o8c`, commit `74c4dad`, analisi del 01/10/2026. Scheda originale in `../_archivio/2026-10-01/cool-noether/MEMORIA/docx/`. Unificata il 01/10/2026 sul ramo `claude/integrazione-2026-10-01`.

## 2. Impronta di riconoscimento

Impronta leggibile da un programma: `piano-operativo-consip-id2610.impronta.json` (`punteggioMinimo` 4). Segnali, in ordine, con il peso:

1. intestazione di pagina che contiene `ID 2610` e `Piano Operativo` (regex `ID 2610.*Piano Operativo`) (peso 2);
2. titoli di livello 1, in quest'ordine: DATI ANAGRAFICI AMMINISTRAZIONE RICHIEDENTE, INTRODUZIONE, ORGANIZZAZIONE DEL CONTRATTO ESECUTIVO, IMPORTO CONTRATTUALE E QUANTITÀ PREVISTE PER I SERVIZI OGGETTO DI FORNITURA, DELIVERABLE DELLA FORNITURA, SERVIZIO DI FORNITURA, Attività In Carico Alle Aziende e Quote di RTI, QUOTA E PRESTAZIONI IN SUBAPPALTO, CV DELLE RISORSE PROFESSIONALI (il primo titolo vale peso 2);
3. tabelle con intestazione Servizio / Modalità / Metrica / Dimensionamento / Fabbisogno (peso 2);
4. sotto-capitoli ripetuti Attivazione del Servizio / Vincoli Temporali / Erogazione e Consuntivazione / Cronoprogramma (peso 1);
5. stili con nome `*_AQ_DataManagement_ENG`; carattere Segoe UI colore `012F53` (peso 1);
6. piè di pagina "PIANO OPERATIVO | PAG." (peso 1); copertina con "ODA NR.";
7. nome del file con `Piano_Operativo` (peso 1; regex `(?i)piano[_ ]operativo`; regex del modello `^ID_\d{4}_SAC\d_Template_Piano_Operativo_Template_Lotto_\d+_v\d+\.docx$`).

Oggi nessun codice legge questa impronta (il riconoscimento dei `.docx` è da realizzare).

## 3. Mappa degli oggetti

| # | Capitolo (Titolo 1, maiuscolo) | Contenuto | Variabile |
|---|---|---|---|
| — | Copertina | pagina intera fatta di immagini e caselle di testo sovrapposte: titolo "PIANO OPERATIVO", "ODA NR. XXXXXX", "LOTTO 1", nome del RTI, "CONSIP", CIG dell'AQ, spazio "LOGO E INTESTAZIONE STAZIONE APPALTANTE" | ODA, logo PA |
| — | SOMMARIO | campo `TOC \o "1-2" \h \z \u` dentro un content control: va aggiornato | |
| 1 | Dati anagrafici amministrazione richiedente | 2 tabelle etichetta/valore: DENOMINAZIONE AMMNISTRAZIONE (refuso del modello), INDIRIZZO, CAP, COMUNE, PROVINCIA, REGIONE, CODICE FISCALE, CODICE IPA, INDIRIZZO MAIL, PEC; referente: REFERENTE AMMINISTRAZIONE, RUOLO, TELEFONO, INDIRIZZO MAIL, MAIL PEC | tutte le celle di destra |
| 2 | Introduzione | 2.1 Contesto, 2.2 Scopo, 2.3 Campo di applicazione: "riprendere dal Piano dei Fabbisogni"; 2.4 Acronimi e glossario (tabella DEFINIZIONE/ACRONIMO · DESCRIZIONE ESTESA con 8 voci di base, "da personalizzare") | testo + righe glossario |
| 3 | Organizzazione del contratto esecutivo | una frase fissa (rimando all'Offerta Tecnica) | — |
| 4 | Importo contrattuale e quantità | importo in cifre e lettere; 5 tabelle Servizio / Modalità / Metrica / Dimensionamento / Fabbisogno (Realizzativi, Manutenzione, Supporto tecnico-specialistico, Gestione del portafoglio, Accessori): 26 righe di servizio, celle unite sul nome del servizio | importo, 26 quantità `xxxx`, righe da togliere |
| 5 | Deliverable della fornitura | elenco puntato da riempire con i deliverable dell'OT per i servizi richiesti | elenco |
| 6 | Servizio di fornitura | **14 sotto-capitoli identici**, uno per servizio (SVI, MI, CF, CW, MAD, MAC, MAD-MAC, SA, GA, Gestione operativa, Identità e accesso, Acquisizione dati, E-learning, Contact center), ognuno con 4 Titolo 3: Attivazione del Servizio (`xx/xx/202X`), Vincoli Temporali (`XX mesi`, max 24), Erogazione e Consuntivazione (sede: `<fornitore / PA / altro>`), Cronoprogramma (`NOME AMMINISTRAZIONE`) | date, durate, sedi, nome PA; capitoli da eliminare |
| 7 | Attività in carico alle aziende e quote di RTI | matrice 18 aziende × 14 servizi (celle vuote da marcare); tabella AZIENDE / % RTI / Quota Ordine | marcature, `xx,xx%`, `xxx.xxx,xx€` |
| 8 | Quota e prestazioni in subappalto | frase fissa + frase gialla facoltativa | sì/no |
| 9 | CV delle risorse professionali | frase fissa; 9.1 tabella Nominativo / Ruolo / Profilo con 9 ruoli (RUAC del CE, Responsabile tecnico servizi tecnologici, Responsabile migrazione cloud, Referenti per realizzativi, portafoglio, manutenzione, supporto, accessori, referente cloud native) con rimando al Capitolato Tecnico Generale | nomi; righe da togliere |

Pagina e sezioni: A4 (11900×16840 twips); due sezioni: la copertina (margini 0, numerazione a parte, immagini e caselle di testo) e il corpo (margini stretti 1,5 cm ai lati, 0,3 cm sopra e sotto, cioè 851/170/176 twips; numerazione da 1). Intestazione del corpo: "PA Cliente ID 2610 – AQ SAC 3 - LOTTO 1 – Piano Operativo". Piè di pagina: nome RTI, "PIANO OPERATIVO | PAG. n di N" (campi PAGE e SECTIONPAGES).

### Stili e layout

- **Carattere**: Segoe UI 11, colore blu scuro `012F53` (stile Normal); tabelle in Calibri (stile Table Paragraph). Nei titoli 3 Segoe UI 10 grassetto `012F53`. Compaiono anche Arial (copertina) e Graphik (residui).
- **Titoli**: Heading 1 = 12 pt grassetto blu `002060` in maiuscolo, numerato; Heading 2 = 10 pt grassetto, numerato; i Titolo 3 usano uno stile personalizzato "Titolo 3 - PE_AQ_DataManagement_ENG" (e lo stile del corpo si chiama "Normale - PO_AQ_DataManagement_ENG"): nomi che tradiscono l'origine da un altro modello.
- **Tabelle**: riga di testa con sfondo blu `4472C4` e testo bianco; celle con sfondo `F2F2F2`; testo nelle celle dentro rientri "blockquote"; larghezze in percentuale (26/73, 25/19/21/19/14).
- **Campi**: TOC, 33 PAGEREF, 2 DOCVARIABLE "Data" (copertina, senza variabile definita nel file: residuo), PAGE, SECTIONPAGES.
- Nessuna revisione, nessun commento, nessuna protezione; proprietà SharePoint (`customXml`) innocue.

### Caratteristiche Word usate

| Caratteristica | Uso |
|---|---|
| Stili di titolo numerati (Heading 1/2 + stile personalizzato per il livello 3) | struttura e sommario automatico |
| Content control + campo TOC | sommario |
| Tabelle con celle unite in verticale | un servizio con più modalità |
| Evidenziazione gialla | marcare ciò che va compilato |
| Caselle di testo e immagini ancorate | copertina grafica |
| Due sezioni con intestazioni/piè di pagina diversi, campi PAGE/SECTIONPAGES | copertina senza numero, corpo numerato |
| DOCVARIABLE | data in copertina (non funzionante) |

### Convenzioni di denominazione

- File: `ID_<AQ>_SAC3_Template_Piano_Operativo_Template_Lotto_<n>_v<n>.docx` (il modello); compilato: atteso `<PA>_Piano_Operativo_<ODA>_v<n>.docx` o lo standard della PA (vedi Appendice 3: codice documento, versione, data, tabella revisioni).
- Sigle dei servizi: SVI, MI, CF, CW, MAD, MAC, MAD-MAC, SS (nelle tabelle) / SA (nel titolo del capitolo: incoerenza del modello), GA; servizi accessori senza sigla.
- Ruoli: "RUAC del CE", "Referente per …", con rimando "Rif. par. § 7.2.x Allegato 12 - Capitolato Tecnico Generale".

## 4. Parti fisse e parti variabili

Regola di fondo: **tutto ciò che è giallo o `xxx` è una decisione del fornitore; tutto il resto non va toccato perché ripete il capitolato.**

**Fisse**: struttura dei 9 capitoli e il loro ordine; testo "da capitolato"; frase del capitolo 3; frase fissa dei capitoli 8 e 9; intestazione e piè di pagina; tabelle delle quantità con le 26 righe di servizio; i 14 sotto-capitoli di servizio con i 4 Titolo 3; matrice 18 aziende × 14 servizi; i 9 ruoli.

**Variabili** (colonna "Variabile" della tabella sopra): numero ODA e logo della PA in copertina; anagrafica e referente (celle di destra); testi 2.1-2.3 e righe del glossario; importo in cifre e lettere; le 26 quantità; l'elenco dei deliverable; per ogni servizio attivato date, durate (max 24 mesi), sedi e nome della PA; marcature e quote della matrice; sì/no al subappalto; nomi dei ruoli.

**Da eliminare**: i capitoli dei servizi non richiesti (cap. 6), le righe delle tabelle del cap. 4 e i ruoli del cap. 9 non pertinenti.

**Segnaposto**: evidenziazione **gialla** (201 run); testo `xxxx` / `XXXXXXX` / `xx/xx/202X` / `XX mesi` / `xx,xx%` / `xxx.xxx,xx€` / `Nome Cognome` / `NOME AMMINISTRAZIONE`; istruzioni tra parentesi angolari `<Eliminare i servizi non richiesti>`; frasi d'istruzione in giallo: "Descrivere il contesto (riprendere dal Piano dei Fabbisogni)", "Riprendere dal Piano dei Fabbisogni (copiare e incollare)", "Da personalizzare", "Riportare solo quelli richiesti nel Piano dei Fabbisogni", "Fare riferimento ai deliverable presenti nell'OT", "Eliminare i servizi non richiesti", "Eliminare i ruoli dei servizi non richiesti". Pattern per trovarli: `x{3,}`, `X{2,}`, `xx/xx/202X`, `XX mesi`, `xx,xx%`, `xxx\.xxx,xx€`, `Nome Cognome`, `NOME AMMINISTRAZIONE`, `<[^>]+>`. Non ci sono content control, segnalibri o campi per i dati: la compilazione è a mano.

## 5. Regole di modifica, aggiunta ed eliminazione

- **Togliere un servizio**: eliminare il sotto-capitolo del cap. 6, le righe del cap. 4, la colonna/marcature del cap. 7 e il ruolo del cap. 9; i titoli sono numerati con gli stili, quindi la numerazione si aggiorna da sola, ma il **sommario è memorizzato e va rigenerato** dopo i tagli.
- **Coerenza tra capitoli**: ogni servizio nel cap. 4 deve avere il cap. 6 corrispondente (e viceversa); le quote RTI del cap. 7 devono sommare 100 %; quota ordine = % × importo; durate ≤ 24 mesi; date di attivazione non prima dell'ODA; sigle coerenti (SS/SA).
- **Correzioni al testo fisso**: nelle 14 sezioni di servizio il testo è identico, il modello si affida al copia-incolla: ogni correzione va ripetuta 14 volte.
- **Copertina**: le caselle di testo contengono ancora residui di un'altra gara (vedi sezione 7): vanno puliti o il PDF/la ricerca li mostrano.
- **Campi**: DOCVARIABLE "Data" senza variabile mostra l'ultimo valore memorizzato: scrivere la data a mano o definire la variabile.
- **Glossario** (2.4): aggiungere le sigle usate nel documento e non definite (serve il glossario del progetto).
- Non toccare intestazioni, piè di pagina, stili `*_AQ_DataManagement_ENG` e tabelle delle quantità oltre alle celle variabili.

## 6. Funzioni consigliate dell'app

Funzioni esistenti nel portale (nessuna funzione strutturata per Word esiste oggi):

- **Esplora file**: archiviare il modello e le versioni compilate nella cartella del progetto (versioni, cestino, ricerca).
- Verbale Studio, pulsante **Transcript** (o **Cartella di lavoro**): legge il `.docx` come testo piatto (`docxToText`); serve solo per cercare parole, non per compilare.
- Il glossario del progetto di Cippi (**Glossario**) e di Verbale Studio possono già ospitare le sigle dei servizi (SVI, MI, CF…) e del kit (AQ, CE, ODA, PdF, PO, SAC…).

Da realizzare (motore Word di Verbale Studio), nell'ordine d'uso quando arriva un file così:

1. *Riconosci modello* → "Piano Operativo AQ ID 2610".
2. *Leggi piano operativo* → struttura in dati: anagrafica, importo, quantità per servizio, servizi attivi con date/durate/sedi, aziende e quote, ruoli.
3. *Controlla* → segnaposto rimasti, servizi nel cap. 4 senza il cap. 6 corrispondente (e viceversa), quote RTI che non sommano 100 %, quota ordine ≠ % × importo, durate > 24 mesi, date prima dell'ODA, sigle incoerenti, residui di copertina, glossario con sigle usate ma non definite (qui serve il glossario del progetto).
4. *Compila* da un oggetto "contratto esecutivo" (lo stesso che alimenta piano di lavoro, SAL e kick-off): dati PA, quantità dal Piano dei Fabbisogni, servizi scelti, date, aziende, ruoli.
5. *Taglia* i capitoli dei servizi non richiesti e le righe delle tabelle, poi *rigenera il sommario*.
6. *Esporta* il `.docx` finito conservando copertina e stili; *confronta* con la versione precedente; *pulisci residui* (copertina, stili).

Vale anche per il verbale SAL (`sal-verbale.md`): lettura strutturata (titoli, tabelle, evidenziazioni, campi, sezioni, intestazioni), riconoscimento del modello, elenco dei punti da compilare, compilazione per funzioni, eliminazione dei capitoli con rinumerazione, controlli di completezza e coerenza, rigenerazione del sommario, esportazione `.docx` conservando il resto del file, confronto tra versioni, pulizia dei residui.

## 7. Stato dell'app su questo template

**Verbale Studio oggi** (1.0.0): legge un `.docx` solo come testo piatto (`app/src/verbali/docx.js`, `docxToText`; rotta `POST /api/vs/docx-text`) per i transcript. Nessuna scrittura di Word, nessuna lettura di tabelle, stili o campi.

**Manca**: tutto l'elenco "da realizzare" della sezione 6. Nessuna misura (tempi, punteggi) riportata.

### Anomalie trovate nel file visto (controlli che l'app dovrà fare)

1. **Copertina con residui di un'altra gara**: le caselle di testo contengono ancora "OFFERTA TECNICA AQ CONSIP ID 1881/L3", il nome di un'altra amministrazione e "MARZO 2021", oltre a "LOGO E INTESTAZIONE STAZIONE APPALTANTE": probabilmente coperti dall'immagine, ma restano nel file (ricerca, accessibilità, PDF).
2. Stili e proprietà con nomi di un altro modello (`PE_AQ_DataManagement_ENG`, azienda nei metadati diversa dal RTI).
3. Sigla del servizio di supporto scritta **SS** nelle tabelle e **SA** nel titolo del capitolo 6.
4. Refusi fissi: "AMMNISTRAZIONE" (tabella 1), "Piano de Fabbisogni", "IL servizio" in maiuscolo, titolo "Servizio di Servizio di Gestione…", spazi prima delle virgolette chiuse ("ICT ”").
5. Il capitolo 8 cita l'art. 105 del **D.Lgs. 50/2016** mentre la gara è ai sensi del D.Lgs. 36/2023 (le appendici lo dicono): da verificare con chi conosce il contratto.
6. Sommario memorizzato: va rigenerato dopo l'eliminazione dei capitoli.
7. Campi DOCVARIABLE senza variabile: in Word mostrano l'ultimo valore memorizzato.
8. Nelle 14 sezioni di servizio il testo è identico: il modello si affida al copia-incolla, quindi ogni correzione va ripetuta 14 volte.
9. Il titolo 9.1 finisce con un punto; il capitolo 4 dice "esprimere in lettere /00 euro" senza parentesi chiusa coerente.

Altri controlli attesi dall'impronta: segnaposto gialli rimasti; quote RTI che non sommano 100 %.

## 8. Dubbi aperti

- Il riferimento al D.Lgs. 50/2016 nel capitolo 8 va corretto in D.Lgs. 36/2023? Da verificare con chi conosce il contratto.
- La sigla giusta del servizio di supporto è SS (tabelle, conoscenza del kit) o SA (titolo del cap. 6)?
- Il nome atteso del file compilato (`<PA>_Piano_Operativo_<ODA>_v<n>.docx`) è un'ipotesi: la PA può imporre il suo standard (Appendice 3).
- Le 18 aziende della matrice del cap. 7 (capofila Engineering; tra loro HSPI e RPCNET) non comprendono TXT e-solutions, Deda Next e Webgenesys, che il kick-off BIOSIRIS presenta come raggruppamento: vedi `../CONFLITTI.md`, voce 1.
- L'azienda nei metadati del file è diversa dal RTI: quale?
- Il "Piano di Lavoro Generale e di obiettivo" della catena dei documenti è il piano Excel `piano-di-lavoro-txt-biosiris`? Da confermare.

## 9. Da classificare

- Sinergie scritte nell'impronta: con `piano-di-lavoro-txt-biosiris` (il cronoprogramma e le date di attivazione del cap. 6 sono le stesse del piano di lavoro); con `kickoff-txt-biosiris` (ambito, componenti e masterplan); con `sal-verbale` (servizi e attività con gli stessi codici; riferimenti ad AQ, Piano dei Fabbisogni, Piano Operativo, CE).
- Il campo `fornitore` dell'impronta: "modello del RTI aggiudicatario dell'AQ (capofila Engineering), compilato dal team per ogni PA".
- Il glossario di base del modello ha 8 voci; la conoscenza del kit ne tiene 10 (AQ, CE, GG/PP, OT, RTI, RUAC del CE, ODA, PdF, PO, SAC).

## 10. Fonti

- `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, commit `74c4dad`: `docs/MEMORIA/docx/piano-operativo-consip-id2610.md` (tutto il contenuto delle sezioni 1-9), `.impronta.json` (pesi dei segnali, regex, misure di pagina in twips, tabelle, pattern dei segnaposto, istruzioni gialle, campi, anomalie tipiche, sinergie, funzioni proposte), `kit-aq-id2610.conoscenza.json` (aziende del RTI, sigle, glossario di base), `docs/MEMORIA/fascicolo-aq-id2610.md` (catena dei documenti; ora `../fascicoli/fascicolo-aq-id2610.md`), riga in `docs/MEMORIA/README.md` e paragrafo "cosa confronta l'impronta dei .docx".
- `docs/INTEGRAZIONE-APP.md`, `app/src/verbali/docx.js`, `app/src/routes/verbali.js`, `app/public/verbali/app.js`: cosa fa oggi Verbale Studio con i `.docx` e i nomi reali dei comandi (Transcript, Cartella di lavoro).
- `admiring-hopper`, commit `fff10ab` (`../pptx/kickoff-txt-biosiris.md`): composizione del raggruppamento del kick-off (per la voce 1 di CONFLITTI.md).
