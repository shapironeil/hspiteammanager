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
├── docx/                     documenti Word (app: Verbale Studio)
└── pdf/
```

Il nome del template è `<tipo-di-documento>-<fornitore>-<progetto>` in minuscolo, con i trattini (es. `kickoff-txt-biosiris`). Se un file nuovo corrisponde a un template già noto si aggiorna la scheda esistente (sezione "File visti"), non se ne crea un'altra.

## Template noti

| Template | Formato | App | Riconoscimento rapido | File visti |
|---|---|---|---|---|
| [kickoff-txt-biosiris](pptx/kickoff-txt-biosiris.md) | .pptx | Cippi | tema `Office Theme` con accent1 `#225546`, font Poppins, layout `1_Title and Content` con piè di pagina "Kick-off Progetto <Nome>", sezioni native di PowerPoint | `BIOSIRIS_Kick-off_v0.9.1.pptx` (30/09/2026) |
| [piano-di-lavoro-txt-biosiris](xlsx/piano-di-lavoro-txt-biosiris.md) | .xlsx | GestioneCelle | un solo foglio `Piano di lavoro`; riga con `LIV 1`, `Work Package`, `LIV 2`, `Work Package`, `Owner`, `Note` seguita dalle iniziali dei mesi; anni e trimestri in celle unite; barre del Gantt fatte con il colore di sfondo delle celle, nessuna formula di calcolo | `BIOSIRIS_PdL_di_dettaglio_v0.4.xlsx` (29/09/2026) |
| bpb-processi (vedi [GESTIONECELLE.md](../GESTIONECELLE.md)) | .xlsx | GestioneCelle | tabelle Excel `tblMacro`, `tblProcessi`, `tblBPB`; fogli Istruzioni, Anagrafica Processi BPB, BPB | file BPB dei processi (già gestito da GestioneCelle) |
| [piano-operativo-consip-id2610](docx/piano-operativo-consip-id2610.md) | .docx | Verbale Studio | intestazione "ID 2610 … Piano Operativo"; titolo 1 "DATI ANAGRAFICI AMMINISTRAZIONE RICHIEDENTE"; tabelle Servizio/Modalità/Metrica/Dimensionamento/Fabbisogno; 14 capitoli di servizio uguali; segnaposto gialli `xxxx` | `ID_2610_SAC3_Template_Piano_Operativo_Template_Lotto_1_v3.docx` (28/01/2026) |
| [appendici-aq-consip-id2610](docx/appendici-aq-consip-id2610.md) | .docx | Verbale Studio (consultazione) | nome file `KIT_ODA_AQ_ID…Appendice`; piè di pagina "Procedura aperta per … Accordi Quadro"; schede con campi fissi (profili e-CF, indicatori con soglie, prodotti) → `docx/kit-aq-id2610.conoscenza.json` | Appendice 1 Profili, 2 Indicatori di qualità, 3 Cicli e prodotti (2026) |
| [nomina-responsabile-trattamento-consip](docx/nomina-responsabile-trattamento-consip.md) | .docx | Verbale Studio | "Nomina Responsabile del trattamento dei dati", art. 28 GDPR; 21 clausole numerate; scelte in blu tra `< >` | `KIT_ODA_AQ_ID2610_-_Facsimile_nomina_responsabile_trattamento.docx` |
| **Fascicolo AQ ID 2610**: come si legano Piano Operativo, piano di lavoro, kick-off e SAL | | | vedi [fascicolo-aq-id2610.md](fascicolo-aq-id2610.md) | |

## Impronta: che cosa si confronta

Per i `.pptx` l'impronta (`*.impronta.json`) tiene: dimensione della slide, colori del tema, caratteri del tema, nomi dei layout, nomi delle sezioni native, testo del piè di pagina, nomi delle forme ricorrenti, tipi di slide nell'ordine, azienda in `docProps/app.xml`. Un file "corrisponde" se coincidono tema (colori e caratteri), layout usati e piè di pagina; le sezioni e l'ordine delle parti dicono quanto è completo rispetto al template.

Questa è la base per la funzione proposta a Cippi "riconosci il modello noto all'importazione" (vedi la scheda del template).

Per i `.xlsx` l'impronta tiene: nomi dei fogli, la riga delle intestazioni fisse, la riga delle iniziali dei mesi, le celle unite di anni e trimestri, la presenza di barre a colore (celle piene senza valore), l'assenza di tabelle, convalide e formati condizionali, il tipo delle formule, lo schema del nome del file. Un file "corrisponde" se tornano le intestazioni fisse, le iniziali dei mesi e le barre a colore (`punteggioMinimo` nell'impronta).

È la base per la funzione proposta a GestioneCelle "riconosci il modello noto all'importazione" (vedi la scheda del template).

Per i `.docx` l'impronta tiene: intestazioni e piè di pagina, titoli di livello 1 nell'ordine, intestazioni delle tabelle, nomi degli stili, carattere e colore del testo normale, stile dei segnaposto (giallo + `xxx`, oppure blu tra `< >`), campi presenti, schema del nome del file. Un file "corrisponde" se tornano intestazione o piè di pagina, i titoli di livello 1 e le intestazioni delle tabelle (`punteggioMinimo` nell'impronta). Un documento di riferimento (appendici) non si compila: si estrae in `*.conoscenza.json` e si usa per i controlli.
