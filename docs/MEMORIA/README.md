# Memoria dei file analizzati (template, impronte e funzioni delle app)

Questa cartella è la **memoria strutturata** dei file che il team ha fatto analizzare (PowerPoint, Excel, Word, PDF...). Per ogni template c'è una scheda che dice:

1. cos'è il file e a cosa serve;
2. come riconoscere lo stesso template quando arriva un file nuovo (l'**impronta**);
3. il **template**: struttura, oggetti, stili, convenzioni di denominazione, parti fisse e variabili, regole per modificarlo senza romperlo;
4. quali funzioni dell'app del portale (MPoint, GestioneCelle, Verbale Studio) conviene usare con quel tipo di file, e quali mancano;
5. da dove viene ogni informazione (agente, sessione, ramo, commit).

Quando arriva un file nuovo si controlla prima qui se corrisponde a un template già noto (confronto dell'impronta), e si riusa ciò che si è imparato.

**Fonte di riferimento: da ora tutte le analisi dei file si salvano qui, con questo formato; le vecchie schede sono in `_archivio/`.**

Regole (valgono per tutti, agenti compresi: vedi anche `../REGOLE-AGENTI.md`):

- **Un solo posto**: `docs/MEMORIA/`. Niente altre cartelle (`docs/memoria`, `docs/MODELLI-FILE`, note sparse).
- **Niente dati del cliente**: nelle schede stanno struttura, stile, regole e misure, mai i contenuti dei documenti compilati. I nomi delle persone trovati nei file non si riportano; i nomi di programma o di ente servono solo a riconoscere il template.
- **I file originali non stanno nel repository**: restano nella cartella del progetto (Esplora file) sul PC del portale.
- Ogni informazione porta la sua **provenienza** (agente, sessione, ramo, commit, file analizzato).
- Se un file nuovo corrisponde a un template già noto si **aggiorna la scheda esistente** (sezione 1 "File visti" e sezione 10 "Fonti"), non se ne crea un'altra.
- Se due analisi si contraddicono si scrivono **entrambe** nella scheda e si aggiunge una voce in `CONFLITTI.md`: decide il proprietario.

## Come è organizzata

```
docs/MEMORIA/
├── README.md                      questo indice
├── CONFLITTI.md                   contraddizioni tra analisi, da far decidere al proprietario
├── fascicoli/                     insiemi di documenti che vanno insieme (stesso progetto o contratto)
│   ├── fascicolo-aq-id2610.md
│   └── fascicolo-sal.md
├── pptx/                          presentazioni PowerPoint (app: MPoint)
│   ├── <template>.md              scheda leggibile (10 sezioni fisse)
│   └── <template>.impronta.json   impronta leggibile da un programma
├── xlsx/                          fogli Excel (app: GestioneCelle)
├── docx/                          documenti Word (app: Verbale Studio)
│   └── kit-aq-id2610.conoscenza.json   conoscenza estratta da documenti di riferimento (non si compilano)
├── pdf/                           (quando servirà)
└── _archivio/2026-10-01/          le schede originali dei quattro agenti, com'erano prima dell'unificazione
```

Il nome del template è `<tipo-di-documento>-<fornitore>-<progetto>` in minuscolo, con i trattini (es. `kickoff-txt-biosiris`). I due template SAL (`sal-presentazione`, `sal-verbale`) hanno il nome dato dall'analisi originale: vedi `CONFLITTI.md`, voce 3.

### Il formato unico delle schede

Ogni scheda `<template>.md` ha queste 10 sezioni, nello stesso ordine, con gli stessi titoli (se una sezione non ha informazioni si scrive "Non noto"):

| # | Sezione | Contenuto |
|---|---|---|
| 1 | Identità | nome del template, formato, tipo di documento, app di riferimento, fornitore/progetto, file visti (nome, data, dimensione se nota), **Provenienza**: agente, sessione, ramo, commit, data dell'analisi |
| 2 | Impronta di riconoscimento | i segnali forti in ordine, come riconoscere lo stesso template in futuro; riferimento al file `.impronta.json` |
| 3 | Mappa degli oggetti | struttura (slide/sezioni, fogli/tabelle, capitoli/tabelle), oggetti, stili, convenzioni di denominazione |
| 4 | Parti fisse e parti variabili | cosa resta uguale tra un file e l'altro e cosa cambia (segnaposto, parti ripetibili) |
| 5 | Regole di modifica, aggiunta ed eliminazione | come si aggiunge/toglie una parte senza rompere il file (righe, slide, capitoli, formule, numerazioni, totali) |
| 6 | Funzioni consigliate dell'app | quali funzioni dell'app usare con questo tipo di file (nome esatto come nei documenti delle app) e quelle "da realizzare" |
| 7 | Stato dell'app su questo template | cosa fa già l'app e cosa manca, con misure se ci sono (prima/dopo) |
| 8 | Dubbi aperti | domande senza risposta |
| 9 | Da classificare | tutto ciò che c'era nelle analisi originali e non trova posto sopra: niente si perde |
| 10 | Fonti | quale informazione viene da quale agente/file/commit |

L'impronta `<template>.impronta.json` sta accanto alla scheda e tiene almeno i campi `template`, `formato` (`pptx`, `xlsx`, `docx`), `app` e `provenienza`. Per le presentazioni MPoint (`app/src/cippi/impronta.js`) legge anche `tema.colori`, `tema.caratteri`, `layout.usati`, `layout.pieDiPaginaRegex`, `sezioniNative`, `partiNellOrdine[].segnali`, `metadati.company`: questi nomi non si cambiano.

### Come si aggiunge un template

1. Studiare il file (struttura, formule, stili, layout, logica) e scrivere la scheda con le 10 sezioni nella cartella del formato.
2. Scrivere l'impronta `.impronta.json` accanto alla scheda e aggiungere la riga nella tabella "Template noti" qui sotto.
3. Dire sempre cosa l'app sa già fare e cosa manca: è da lì che nascono le proposte di sviluppo.
4. Se il file va insieme ad altri (stesso progetto o contratto), aggiornare o creare il fascicolo in `fascicoli/`.

### Come si riconosce un file nuovo

1. Guardare il nome del file: le convenzioni sono in ogni scheda (per esempio `<PROGETTO>_Kick-off_v0.9.1.pptx`, `<PROGETTO>_PdL_di_dettaglio_v0.4.xlsx`, `AAAA.MM.GG_<Cosa>_<Tipo>_vN.NN.<ext>`, `KIT_ODA_AQ_ID<AQ>_-_…`).
2. Confrontare l'impronta: caratteri, colori, immagini (dimensioni), nomi dei layout, sezioni, piè di pagina, titoli di capitolo, intestazioni delle tabelle.
3. Se corrisponde, applicare le funzioni indicate nella scheda; se corrisponde in parte, segnalare le differenze invece di tirare a indovinare.

## Template noti

| Template | Formato | App | Tipo di documento | Riconoscimento rapido | Funzioni dell'app disponibili per questo template | File visti | Provenienza (agente) |
|---|---|---|---|---|---|---|---|
| [kickoff-txt-biosiris](pptx/kickoff-txt-biosiris.md) | .pptx | MPoint | presentazione di kick-off di progetto per una PA | tema `Office Theme` con accent1 `#225546`, font Poppins, layout `1_Title and Content` con piè di pagina "Kick-off Progetto <Nome>", sezioni native di PowerPoint | Importa PowerPoint; Revisione (Percorso di lettura, Controlli, Glossario, Documento → "Somiglia a"); Modifica (testi, celle, Aggiungi riga, ordine); Trova e sostituisci; Salva come modello; Nuovo da modello; Punti chiave; Appunti; Scarica; Salva versione | `BIOSIRIS_Kick-off_v0.9.1.pptx` (30/09/2026) | admiring-hopper |
| [sal-presentazione](pptx/sal-presentazione.md) | .pptx | MPoint | scheletro di presentazione SAL (stato avanzamento lavori) di un progetto PA | nome file `AAAA.MM.GG_Template_Presentazione_Sal_Vn.nn.pptx`; 4 master e 24 layout; layout "Diapositiva titolo" con i testi "R-CAP.AC"; carattere Titillium Web; blu `164194` / `2F5496`; striscia loghi 2146×136 e trinacria 612×612 | Importa PowerPoint; Revisione; Modifica (testi, ordine, duplica slide); Trova e sostituisci; Salva come modello; Nuovo da modello; Scarica; Salva versione | `2026.02.23_Template_Presentazione_Sal_V1.00.pptx` (modificato 08/04/2026) | awesome-cray |
| [piano-di-lavoro-txt-biosiris](xlsx/piano-di-lavoro-txt-biosiris.md) | .xlsx | GestioneCelle | piano di lavoro di dettaglio (Gantt mensile a due livelli) | un solo foglio `Piano di lavoro`; riga con `LIV 1`, `Work Package`, `LIV 2`, `Work Package`, `Owner`, `Note` seguita dalle iniziali dei mesi; anni e trimestri in celle unite; barre del Gantt fatte con il colore di sfondo delle celle, nessuna formula di calcolo | Importa Excel (foglio generico, scelta delle colonne); Processi; Tabella; Modifica; scadenze, responsabile, stato, Note del team; Storico; Scarica Excel / Salva nel progetto (solo nella forma BPB) | `BIOSIRIS_PdL_di_dettaglio_v0.4.xlsx` (29/09/2026) | cool-noether |
| bpb-processi (vedi [GESTIONECELLE.md](../GESTIONECELLE.md)) | .xlsx | GestioneCelle | mappa dei processi BPB (macro / processo / micro) | tabelle Excel `tblMacro`, `tblProcessi`, `tblBPB`; fogli Istruzioni, Anagrafica Processi BPB, BPB (un punto ciascuno, almeno 3 per riconoscerlo) | Importa Excel (il formato BPB è riconosciuto da solo); Processi; Tabella; Modifica; Richieste; cestino; Scarica Excel; Salva nel progetto | file BPB dei processi (già gestito da GestioneCelle: 25 macro, 128 processi, 512 micro) | cool-noether (impronta nella prima versione, commit `0fe8189`) |
| [piano-operativo-consip-id2610](docx/piano-operativo-consip-id2610.md) | .docx | Verbale Studio | Piano Operativo del fornitore per un Contratto Esecutivo dell'AQ ID 2610 (modulo da compilare) | intestazione "ID 2610 … Piano Operativo"; titolo 1 "DATI ANAGRAFICI AMMINISTRAZIONE RICHIEDENTE"; tabelle Servizio/Modalità/Metrica/Dimensionamento/Fabbisogno; 14 capitoli di servizio uguali; segnaposto gialli `xxxx` | nessuna funzione strutturata per Word: Esplora file (archivio, versioni, cestino, ricerca); Transcript (solo testo piatto); Glossario di MPoint per le sigle. Il resto è da realizzare (motore Word) | `ID_2610_SAC3_Template_Piano_Operativo_Template_Lotto_1_v3.docx` (28/01/2026) | cool-noether |
| [appendici-aq-consip-id2610](docx/appendici-aq-consip-id2610.md) | .docx | Verbale Studio (consultazione) | appendici al Capitolato Tecnico Speciale: profili, indicatori di qualità, cicli e prodotti (non si compilano) | nome file `KIT_ODA_AQ_ID…Appendice`; piè di pagina "Procedura aperta per … Accordi Quadro"; schede con campi fissi (profili e-CF, indicatori con soglie, prodotti) → [`docx/kit-aq-id2610.conoscenza.json`](docx/kit-aq-id2610.conoscenza.json) | Esplora file; Transcript (solo testo piatto); conoscenza già estratta a mano nel `.conoscenza.json`. Estrazione, consultazione per codice e controlli: da realizzare | Appendice 1 Profili, 2 Indicatori di qualità, 3 Cicli e prodotti (2026) | cool-noether |
| [nomina-responsabile-trattamento-consip](docx/nomina-responsabile-trattamento-consip.md) | .docx | Verbale Studio | facsimile Consip di nomina del Responsabile del trattamento (art. 28 GDPR), allegato al contratto esecutivo | "Nomina Responsabile del trattamento dei dati", art. 28 GDPR; 21 clausole numerate; scelte in blu tra `< >` | Esplora file; Transcript (solo testo piatto). Compilazione guidata e controlli: da realizzare | `KIT_ODA_AQ_ID2610_-_Facsimile_nomina_responsabile_trattamento.docx` | cool-noether |
| [sal-verbale](docx/sal-verbale.md) | .docx | Verbale Studio | verbale formale di stato avanzamento lavori (SAL) di un progetto PA | nome file `AAAA.MM.GG_Verbale_SAL_Template_vn.nn.docx`; A4 con sezione centrale orizzontale; prima pagina diversa; Titillium Web; 10 capitoli da "Informazioni di verbalizzazione" ad "Accettazione"; segnaposto `[Inserire …]` in giallo | template del riepilogo "Stato avanzamento lavori (SAL)" (contenuti del cap. 7); Punti chiave; Email di riepilogo; Transcript (solo testo piatto); Esplora file. Motore Word: da realizzare | `2026.02.15_Verbale_SAL_Template_v1.00.docx` | awesome-cray |

## Fascicoli

Un fascicolo è un insieme di documenti che vanno insieme (stesso progetto o stesso contratto) e condividono gli stessi dati: i codici devono coincidere e i controlli incrociati sono la funzione più utile del portale.

| Fascicolo | Documenti | App | Scheda |
|---|---|---|---|
| **AQ Consip ID 2610** (Contratto Esecutivo, Lotto 1): Piano dei Fabbisogni (non visto) → Piano Operativo → Contratto Esecutivo/ODA → piano di lavoro → kick-off → SAL | `piano-operativo-consip-id2610`, `nomina-responsabile-trattamento-consip`, `appendici-aq-consip-id2610` (+ conoscenza del kit), `piano-di-lavoro-txt-biosiris`, `kickoff-txt-biosiris`; il fascicolo SAL per ipotesi (`CONFLITTI.md`, voce 1) | Verbale Studio, GestioneCelle, MPoint | [fascicoli/fascicolo-aq-id2610.md](fascicoli/fascicolo-aq-id2610.md) |
| **SAL** (progetto R-CAP.AC): presentazione PowerPoint e verbale Word dello stato avanzamento lavori, stesso brand e stesso oggetto "SAL" | `sal-presentazione`, `sal-verbale` | MPoint, Verbale Studio | [fascicoli/fascicolo-sal.md](fascicoli/fascicolo-sal.md) |

## Impronta: che cosa si confronta

Per i `.pptx` l'impronta (`*.impronta.json`) tiene: dimensione della slide, colori del tema, caratteri del tema, nomi dei layout, nomi delle sezioni native, testo del piè di pagina, nomi delle forme ricorrenti, tipi di slide nell'ordine, azienda in `docProps/app.xml`. Un file "corrisponde" se coincidono tema (colori e caratteri), layout usati e piè di pagina; le sezioni e l'ordine delle parti dicono quanto è completo rispetto al template.

Questa è la base per la funzione proposta a MPoint "riconosci il modello noto all'importazione" (vedi la scheda del template). Dalla versione 0.2.0 MPoint la fa davvero: `app/src/cippi/impronta.js` confronta la presentazione importata con ogni `*.impronta.json` di formato `pptx` e con i modelli salvati, e mostra "Somiglia a: … (NN%)" nel pannello Documento. L'analisi del fascicolo SAL (awesome-cray) propone di confrontare anche le immagini per dimensione, i layout con testo fisso e il carattere usato davvero nelle slide: oggi il codice non lo fa (`CONFLITTI.md`, voce 4).

Per i `.xlsx` l'impronta tiene: nomi dei fogli, la riga delle intestazioni fisse, la riga delle iniziali dei mesi, le celle unite di anni e trimestri, la presenza di barre a colore (celle piene senza valore), l'assenza di tabelle, convalide e formati condizionali, il tipo delle formule, lo schema del nome del file. Un file "corrisponde" se tornano le intestazioni fisse, le iniziali dei mesi e le barre a colore (`punteggioMinimo` nell'impronta).

È la base per la funzione proposta a GestioneCelle "riconosci il modello noto all'importazione" (vedi la scheda del template).

Per i `.docx` l'impronta tiene: intestazioni e piè di pagina, titoli di livello 1 nell'ordine, intestazioni delle tabelle, nomi degli stili, carattere e colore del testo normale, stile dei segnaposto (giallo + `xxx`, oppure blu tra `< >`, oppure `[Inserire …]` in giallo), campi presenti, schema del nome del file. Un file "corrisponde" se tornano intestazione o piè di pagina, i titoli di livello 1 e le intestazioni delle tabelle (`punteggioMinimo` nell'impronta). Un documento di riferimento (appendici) non si compila: si estrae in `*.conoscenza.json` e si usa per i controlli.

Oggi nessun codice legge le impronte `.xlsx` e `.docx`: il riconoscimento in GestioneCelle e in Verbale Studio è da realizzare.

## Conflitti e archivio

- `CONFLITTI.md`: le contraddizioni tra le analisi dei quattro agenti e le decisioni che spettano al proprietario.
- `_archivio/2026-10-01/`: le schede originali, copiate identiche, con un README che spiega cosa c'è e perché.
