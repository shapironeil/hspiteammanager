# Template `esportazione-pdf-presentazione` — PDF esportato da una presentazione PowerPoint

**File visti:** `ATAC_Kick_Off_Data_Platform_v1.0.pdf` (16 pagine, 645 KB, creato il 05/05/2026 con "Microsoft® PowerPoint® for Microsoft 365"): è l'esportazione della presentazione della scheda [`kickoff-hspi-atac-data-platform`](../pptx/kickoff-hspi-atac-data-platform.md).

Analizzato il 01/10/2026 con Cippi v0.2.0. Nessun contenuto del file è copiato qui.

## 1. Cos'è e a cosa serve

È il file che si **manda al cliente**: PowerPoint → "Salva con nome" → PDF. Ha lo stesso nome della presentazione con l'estensione `.pdf`, una pagina per slide, le stesse dimensioni (16:9). Nasce in un momento preciso (qui il 05/05/2026, il giorno dopo la data in copertina) e **non si aggiorna da solo**: se dopo l'esportazione si corregge il `.pptx`, il PDF resta vecchio. Il rischio pratico è mandare un PDF che non corrisponde all'ultima versione.

Lo stesso formato vale per gli **appunti di studio** in PDF (esportazioni di altre presentazioni, documenti Word stampati in PDF): Cippi li legge allo stesso modo.

## 2. Struttura

| Cosa | Com'è nel file |
|---|---|
| Pagine | `MediaBox [0 0 960 540]` pt = 13,33 × 7,5 pollici = 33,87 × 19,05 cm: la slide 16:9 "Widescreen" di PowerPoint. 16 pagine = 16 slide, stesso ordine |
| Versione e struttura | PDF 1.7 con **flussi xref e object stream** (oggetti compressi dentro altri oggetti), aggiornamento incrementale (due `startxref`) |
| Testo | ogni riga di testo è uno o più blocchi `Tj`/`TJ` con la matrice `Tm`; i titoli in alto (y ≈ 509 su 540) a 18 pt, il **numero di pagina** piccolo (8–9 pt) alla stessa altezza a destra; i testi ruotati (la fascia verticale del Gantt) vengono fuori una lettera per riga |
| Caratteri | **sottoinsiemi** con prefisso casuale (`BCDEEE+Poppins-Bold`): TrueType semplici con `WinAnsiEncoding` (apostrofi e trattini tipografici tra 0x80 e 0x9F) e composti `Type0` con `Identity-H` + mappa `ToUnicode` (due byte per carattere, che la mappa traduce) |
| Immagini | 91 oggetti immagine (la tabella-immagine della slide 13, i loghi, le icone SVG rasterizzate): non si leggono |
| Metadati | `/Producer` e `/Creator` "Microsoft® PowerPoint® for Microsoft 365", titolo "PowerPoint Presentation" (quello del `.pptx`), autore = chi ha esportato, data di creazione = data dell'esportazione |

## 3. Impronta (per riconoscerlo)

- pagine 960 × 540 pt (o 720 × 540 per il 4:3) → è una presentazione;
- producer/creator con "PowerPoint" → esportazione da PowerPoint (LibreOffice scrive "Impress"; le stampanti virtuali scrivono il loro nome);
- caratteri in sottoinsieme `XXXXXX+Nome`, titoli a 18 pt in alto con il numerino a destra;
- stesso nome di un `.pptx` nella cartella del progetto → è la sua esportazione.

Vedi `esportazione-pdf-presentazione.impronta.json`.

## 4. Funzioni e caratteristiche trovate (cosa ci si può fare)

| Caratteristica | Uso nell'app |
|---|---|
| Testo per pagina con posizione e dimensione | lettura degli appunti PDF dentro Cippi (fatto: `GET /api/cippi/docs/:id/appunti/pdf`); da fare: ricerca nel testo degli appunti dal pannello strumenti |
| Titolo di ogni pagina | abbinamento pagina ↔ slide (fatto) |
| Una pagina per slide, stesso ordine | **controllo "il PDF è aggiornato?"**: pagine senza slide, slide senza pagina, ordine diverso, testi diversi (fatto: pulsante *Confronta* negli appunti) |
| Data di creazione nei metadati | da fare: confronto con la data di modifica del `.pptx` e con la versione salvata in Cippi |
| Immagini | non lette; la tabella incollata come immagine resta un buco anche nel confronto (la pagina 13 ha solo titolo e sottotitolo, come la slide) |
| Testi ruotati | letti male (una lettera per riga): da fare, raggruppare per matrice di rotazione |

## 5. Cosa fa Cippi su questo file (misurato il 01/10/2026)

- Legge 16 pagine in **0,16 s** (oggetti negli object stream, Flate, ToUnicode).
- Titoli di pagina corretti in 16 su 16 (il numerino a destra viene scartato perché più piccolo).
- Confronto con il `.pptx` v1.0: 16 coppie nell'ordine, somiglianza media 0,98, verdetto **allineato**. Con una slide tolta e due invertite nel `.pptx`: "1 pagina senza slide, ordine diverso".

## 6. Funzioni di Cippi da usare con un file di questo tipo

1. Lasciare il PDF nella **cartella del progetto accanto al `.pptx`** con lo stesso nome: Cippi lo elenca da solo tra gli appunti ("PDF con lo stesso nome").
2. **Confronta** prima di inviarlo: deve dire "corrisponde alla presentazione". Se no, *Scarica* o *Salva versione* il `.pptx` aggiornato e riesporta il PDF.
3. Gli appunti PDF di studio: *Aggiungi appunti* → *Confronta* mostra anche il testo pagina per pagina, utile per cercare una frase senza aprire il file.
