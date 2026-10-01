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

## Impronta: che cosa si confronta

Per i `.pptx` l'impronta (`*.impronta.json`) tiene: dimensione della slide, colori del tema, caratteri del tema, nomi dei layout, nomi delle sezioni native, testo del piè di pagina, nomi delle forme ricorrenti, tipi di slide nell'ordine, azienda in `docProps/app.xml`. Un file "corrisponde" se coincidono tema (colori e caratteri), layout usati e piè di pagina; le sezioni e l'ordine delle parti dicono quanto è completo rispetto al template.

Questa è la base per la funzione proposta a Cippi "riconosci il modello noto all'importazione" (vedi la scheda del template).
