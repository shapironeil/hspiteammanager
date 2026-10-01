# Memoria dei file analizzati (template e funzioni)

Questa cartella è la **memoria strutturata** dei file che il team ha fatto analizzare (PowerPoint, Excel, Word, PDF...). Per ogni file c'è una scheda che dice:

1. cos'è il file e a cosa serve;
2. le funzioni e le caratteristiche trovate dentro, e come vengono usate;
3. il **template**: struttura, layout, stili, convenzioni di denominazione;
4. l'**impronta**: gli elementi che permettono di riconoscere lo stesso template quando arriva un file nuovo;
5. quali funzioni dell'app del portale (Cippi, GestioneCelle, ...) conviene usare con quel tipo di file.

Quando arriva un file nuovo si controlla prima qui se corrisponde a un template già noto (confronto dell'impronta), e si riusa ciò che si è imparato.

## Come è organizzata

```
docs/MEMORIA/
├── README.md                 questo indice
├── pptx/                     presentazioni PowerPoint (app: Cippi)
│   ├── <template>.md         scheda leggibile
│   └── <template>.impronta.json   impronta leggibile da un programma
├── xlsx/                     fogli Excel (app: GestioneCelle)
├── docx/                     documenti Word (app: Verbale Studio, motore Word)
├── fascicolo-<nome>.md       quando piu' file di formati diversi appartengono allo stesso fascicolo (stessi dati, stesso brand)
└── pdf/
```

Il nome del template è `<tipo-di-documento>-<fornitore>-<progetto>` in minuscolo, con i trattini (es. `kickoff-txt-biosiris`). Se un file nuovo corrisponde a un template già noto si aggiorna la scheda esistente (sezione "File visti"), non se ne crea un'altra.

## Template noti

| Template | Formato | App | Riconoscimento rapido | File visti |
|---|---|---|---|---|
| [kickoff-txt-biosiris](pptx/kickoff-txt-biosiris.md) | .pptx | Cippi | tema `Office Theme` con accent1 `#225546`, font Poppins, layout `1_Title and Content` con piè di pagina "Kick-off Progetto <Nome>", sezioni native di PowerPoint | `BIOSIRIS_Kick-off_v0.9.1.pptx` (30/09/2026) |
| [piano-di-lavoro-txt-biosiris](xlsx/piano-di-lavoro-txt-biosiris.md) | .xlsx | GestioneCelle | un solo foglio `Piano di lavoro`; riga con `LIV 1`, `Work Package`, `LIV 2`, `Work Package`, `Owner`, `Note` seguita dalle iniziali dei mesi; anni e trimestri in celle unite; barre del Gantt fatte con il colore di sfondo delle celle, nessuna formula di calcolo | `BIOSIRIS_PdL_di_dettaglio_v0.4.xlsx` (29/09/2026) |
| [sal-rti-rcapac](pptx/sal-rti-rcapac.md) | .pptx | Cippi | 4 master e 24 layout, carattere Titillium Web, blu `164194`/`2F5496`, layout `Diapositiva titolo` con i testi fissi del programma e la sigla `R-CAP.AC`, striscia dei loghi 2146×136 px, agenda numerata con rettangolo-indicatore | `2026.02.23_Template_Presentazione_Sal_V1.00.pptx` (01/10/2026) |
| [sal-rti-rcapac](docx/sal-rti-rcapac.md) | .docx | Verbale Studio (motore Word) | A4 con sezione centrale orizzontale, prima pagina diversa, carattere Titillium Web, 10 capitoli con indice automatico (`Informazioni di verbalizzazione` … `Accettazione`), 12 tabelle con intestazioni `002060`, segnaposto `[Inserire …]` in giallo, codici `S_n` / `S_n.m` / `A_1` | `2026.02.15_Verbale_SAL_Template_v1.00.docx` (01/10/2026) |
| bpb-processi (vedi [GESTIONECELLE.md](../GESTIONECELLE.md)) | .xlsx | GestioneCelle | tabelle Excel `tblMacro`, `tblProcessi`, `tblBPB`; fogli Istruzioni, Anagrafica Processi BPB, BPB | file BPB dei processi (già gestito da GestioneCelle) |

## Impronta: che cosa si confronta

Per i `.pptx` l'impronta (`*.impronta.json`) tiene: dimensione della slide, colori del tema, caratteri del tema, nomi dei layout, nomi delle sezioni native, testo del piè di pagina, nomi delle forme ricorrenti, tipi di slide nell'ordine, azienda in `docProps/app.xml`. Un file "corrisponde" se coincidono tema (colori e caratteri), layout usati e piè di pagina; le sezioni e l'ordine delle parti dicono quanto è completo rispetto al template.

Questa è la base per la funzione proposta a Cippi "riconosci il modello noto all'importazione" (vedi la scheda del template).

Per i `.xlsx` l'impronta tiene: nomi dei fogli, la riga delle intestazioni fisse, la riga delle iniziali dei mesi, le celle unite di anni e trimestri, la presenza di barre a colore (celle piene senza valore), l'assenza di tabelle, convalide e formati condizionali, il tipo delle formule, lo schema del nome del file. Un file "corrisponde" se tornano le intestazioni fisse, le iniziali dei mesi e le barre a colore (`punteggioMinimo` nell'impronta).

È la base per la funzione proposta a GestioneCelle "riconosci il modello noto all'importazione" (vedi la scheda del template).

Per i `.docx` l'impronta tiene: formato pagina e sezioni (verticale/orizzontale), prima pagina diversa, carattere e colori usati, immagini di intestazione e piè di pagina (dimensioni in pixel), titoli dei capitoli nell'ordine, numero di tabelle, campi (TOC, PAGE), schema dei segnaposto, schema del nome del file. Un file "corrisponde" se tornano i capitoli, il carattere e le immagini (`punteggioMinimo` nell'impronta).

È la base della funzione "riconosci il modello" del motore Word (`app/src/modelli.js` legge tutte le impronte di questa cartella).

## Fascicoli

| Fascicolo | File | Scheda |
|---|---|---|
| SAL del progetto R-CAP.AC: la presentazione e il verbale condividono brand, progetto e dati (periodo, servizi `S_n`, attività, importi, deliverable) | `pptx/sal-rti-rcapac`, `docx/sal-rti-rcapac` | [fascicolo-sal-rti-rcapac.md](fascicolo-sal-rti-rcapac.md) |
