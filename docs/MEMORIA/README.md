# Memoria dei file analizzati (template e funzioni)

Questa cartella è la **memoria strutturata** dei file che il team ha fatto analizzare (PowerPoint, Excel, Word, PDF...). Per ogni file c'è una scheda che dice:

1. cos'è il file e a cosa serve;
2. le funzioni e le caratteristiche trovate dentro, e come vengono usate;
3. il **template**: struttura, layout, stili, convenzioni di denominazione;
4. l'**impronta**: gli elementi che permettono di riconoscere lo stesso template quando arriva un file nuovo;
5. quali funzioni dell'app del portale (Cippi, GestioneCelle, ...) conviene usare con quel tipo di file.

Quando arriva un file nuovo si controlla prima qui se corrisponde a un template già noto (confronto dell'impronta), e si riusa ciò che si è imparato. **Cippi lo fa da solo**: all'apertura di una presentazione confronta la sua impronta con quelle di questa cartella e mostra il modello riconosciuto (sezione *Memoria dei modelli* del pannello strumenti); con *Scarica impronta* si ottiene il file `.impronta.json` di una presentazione nuova, da salvare qui con la sua scheda.

Regole:

- **Niente dati aziendali e niente nomi di persone** nelle schede: solo struttura, stile, convenzioni, e il nome del cliente o del progetto quando serve a riconoscere il template. I file originali restano nella cartella del progetto sul PC del portale, mai nel repository.
- Se un file nuovo corrisponde a un template già noto si aggiorna la scheda esistente (sezione "File visti"), non se ne crea un'altra.

## Come è organizzata

```
docs/MEMORIA/
├── README.md                 questo indice
├── pptx/                     presentazioni PowerPoint (app: Cippi)
│   ├── <template>.md         scheda leggibile
│   └── <template>.impronta.json   impronta leggibile da un programma (Cippi la legge)
├── xlsx/                     fogli Excel (app: GestioneCelle)
├── docx/                     documenti Word (app: Verbale Studio)
└── pdf/                      PDF (Cippi li legge come appunti e come esportazione di una presentazione)
```

Il nome del template è `<tipo-di-documento>-<fornitore>-<progetto>` in minuscolo, con i trattini (es. `kickoff-txt-biosiris`, `kickoff-hspi-atac-data-platform`).

> Attenzione: su Windows (dove gira il portale) `docs/MEMORIA` e `docs/memoria` sono **la stessa cartella**. Cippi legge entrambe le grafie e non conta due volte lo stesso file, ma nel repository va tenuta una grafia sola: questa.

## Template noti

| Template | Formato | App | Riconoscimento rapido | File visti |
|---|---|---|---|---|
| [kickoff-hspi-atac-data-platform](pptx/kickoff-hspi-atac-data-platform.md) | .pptx | Cippi | layout `copertina` + `Blank page w/o line` del master "Tema di Office" (Calibri nel tema, **Poppins** nei testi), piè di pagina `CONFIDENZIALE (CONFIDENTIAL)`, bordeaux `#6F2927` e blu notte `#172234` a mano, nessuna sezione nativa, indice numerato, piano Gantt e tabelle **disegnate con le forme** | `ATAC_Kick_Off_Data_Platform_v1.0.pptx` (01/07/2026) e la sua esportazione `.pdf` |
| [offerta-hspi-erp-governance](pptx/offerta-hspi-erp-governance.md) | .pptx | Cippi | tema `3_Slide Master_White` con accent1 `#307FE2`, accent2 `#00CFB4`, Poppins; sezioni native `Intro`, `End`, `Back up`; layout `1_1`, `Black and white`, `Custom Layout`; metadati titolo "Offerta Tecnico-Economica" | `HSPI_ERP_Governance_Offering_v0.2.pptx` (26/03/2026) |
| [esportazione-pdf-presentazione](pdf/esportazione-pdf-presentazione.md) | .pdf | Cippi | pagine 960 × 540 pt (16:9), producer "Microsoft® PowerPoint® for Microsoft 365", caratteri in sottoinsieme `XXXXXX+Nome`, titolo in alto con il numerino di pagina a destra | `ATAC_Kick_Off_Data_Platform_v1.0.pdf` (16 pagine) |

Altri template sono in arrivo da altri agenti (kick-off TXT/BIOSIRIS, piano di lavoro Excel, fascicolo SAL): quando i loro rami vengono uniti, le righe vanno aggiunte qui.

## Impronta: che cosa si confronta

Per i `.pptx` l'impronta (`*.impronta.json`) tiene: dimensione della slide, nome del tema, colori del tema, caratteri del tema e caratteri usati nelle slide, master e quante slide usano ognuno, layout usati (con le slide), piè di pagina e testi fissi dei layout, sezioni native, tipi di slide nell'ordine, sezioni, sigle più frequenti, metadati (azienda, applicazione, titolo, soggetto), schema del nome del file.

Cippi la calcola con `fingerprintOf` (`app/src/cippi/memoria.js`) e la confronta con `matchOf`. I segnali e il loro peso (su 100):

| Segnale | Peso |
|---|---|
| colori del tema (dk2, lt2, accent1–6) tutti uguali | 35 (25 se ne coincidono quasi tutti, 10 se solo accent1) |
| caratteri del tema (maggiore e minore) | 15 |
| layout usati presenti anche nel file nuovo | fino a 15 |
| piè di pagina / testi fissi dei layout (`pieDiPaginaRegex` o `pieDiPagina`) | 15 |
| sezioni native in comune | 10 |
| nome del file (`nomeFile.regex`) | 10 |
| ordine dei tipi di slide (`tipi`) | fino a 10 |
| azienda nei metadati | 5 |
| nome del tema | 5 |

Il punteggio è normalizzato sui segnali che l'impronta nota definisce. Sopra **55** il file è *riconosciuto*; tra 35 e 55 è *simile* (stessa famiglia grafica, documento diverso). La stessa logica funziona con le impronte scritte a mano dagli altri agenti, purché usino le stesse chiavi (`tema.colori`, `tema.caratteri.maggiore/minore`, `layout.usati`, `layout.pieDiPaginaRegex`, `sezioniNative`, `nomeFile.regex`, `metadati.company`, `tipi` oppure `partiNellOrdine`).

Per i `.pdf` l'impronta è più leggera: dimensione delle pagine, producer, caratteri. Il riconoscimento utile è un altro: **a quale presentazione corrisponde** (confronto pagina per slide, vedi la scheda).
