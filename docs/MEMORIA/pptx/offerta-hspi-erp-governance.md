# Template `offerta-hspi-erp-governance` — presentazione di offerta "ERP Governance" (PowerPoint)

**File visti:** `HSPI_ERP_Governance_Offering_v0.2.pptx` (18 slide, 10 MB, ultima modifica 26/03/2026, creato il 07/04/2022; metadati: titolo "Offerta Tecnico-Economica", soggetto "SAP S4 HANA").

Analizzato il 01/10/2026 con Cippi v0.2.0 (portale v0.8.1). Nessun dato di cliente è copiato qui oltre a struttura e stile: il file resta fuori dal repository. Niente nomi di persone.

## 1. Cos'è e a cosa serve

La **presentazione standard dell'offerta HSPI per l'ERP Governance**: si riusa per ogni cliente che avvia un programma ERP (SAP S/4HANA e simili). Ha tre blocchi: chi siamo (gruppo TXT, HSPI in due slide, le practice), cosa offriamo (il framework ERP Governance in sei fasi, i servizi nella fase di implementazione, l'approccio di interdipendenza tra processi e sistemi), le referenze (tre tabelle). Chiude con i contatti; in **Back up** ci sono le tre slide di dettaglio dei servizi per area (Governance Tecnologica, Governance Funzionale-Operativa, Change Management & Communication).

Il nome del cliente va nella copertina al posto di "xxxxxx": è un **segnaposto** che Cippi segnala finché non viene compilato.

## 2. Struttura (parti nell'ordine)

Le **sezioni sono quelle native di PowerPoint** (`p14:sectionLst`): `Intro` (1–13), `End` (14–15), `Back up` (16–18). L'indice è alla slide 3.

| # | Sezione nativa | Slide | Tipo (Cippi) | Layout | Contenuto |
|---|---|---|---|---|---|
| 1 | Intro | 1 | copertina | `1_1` | una sola immagine a tutta pagina |
| 2 | | 2 | titolo | `1_1` | "HSPI / ERP Governance - Offering" (36 pt), segnaposto "xxxxxx" (il cliente), logo e riga del master |
| 3 | | 3 | indice | `Black and white` | "Indice dei contenuti" nel segnaposto a sinistra, elenco con pallini Wingdings a destra (7 voci: gruppo, HSPI, practice, framework, implementation, approccio, referenze) |
| 4 | | 4 | scheda | `Custom Layout` | **"TXT GROUP"**: paragrafo, 5 intestazioni con icona (know-how, presenza, solidità, esperienza…), 4 **numeri in evidenza** con etichetta (consulenti, sedi, ricavi, anni), fascia con i loghi delle 20+ società del gruppo |
| 5 | | 5 | testo | `Custom Layout` | **"HSPI (1/2)"**: chi è HSPI, certificazioni (loghi come immagini), approccio |
| 6 | | 6 | scheda | `Custom Layout` | **"HSPI (2/2)"**: numeri (fatturato, clienti, sedi), linee di offerta (Business Consulting, IT Governance, Cybersecurity, Digital Innovation), settori |
| 7 | | 7 | tabella (griglia) | `Custom Layout` | **"HSPI – Practice"**: 4 colonne (le linee di offerta) × 8 righe di practice, caselle con icone (146 forme): Cippi la legge come tabella |
| 8 | | 8 | scheda | `Custom Layout` | **"ERP Governance - Framework"**: 6 fasi a chevron (Strategy, Pioneer, Start-up, Implementation, Optimization, Maintenance), attività per fase, "Obiettivi" e "Punti di attenzione" |
| 9 | | 9 | tabella (matrice) | `Custom Layout` | **"ERP Implementation"**: matrice **3 aree di servizio × 5 fasi** (Design, Build, Test, Deploy, Post Go Live): intestazioni di colonna a chevron verdi `#56B093`, intestazioni di riga a sinistra, celle con punti elenco 9,5 pt |
| 10 | | 10 | scheda | `Custom Layout` | **"Approccio di interdipendenza"**: schema processi ↔ sistemi (stato iniziale → target), note dello speaker presenti |
| 11–13 | | 11, 12, 13 | tabella | `Custom Layout` | **"Referenze HSPI (1/3)…(3/3)"**: 5 intestazioni colorate `#00CFB4` (Cliente · Titolo · Breve descrizione · Tecnologia · Periodo) sopra una **tabella nativa** 4–5 righe, loghi dei clienti come immagini nella prima colonna |
| 14 | End | 14 | chiusura | `1_1` | contatti del gruppo (indirizzo, e-mail, nota di riservatezza) |
| 15 | | 15 | chiusura | `1_1` | citazione, tre sedi con indirizzo e telefono |
| 16–18 | Back up | 16, 17, 18 | scheda | `Blank page w/o line` | dettaglio per area di servizio ("ERP Implementation: Governance Tecnologica", …): stessa matrice della slide 9 ridotta a una riga, con "0+" e "0K" **residui di un contatore del modello** (segnalati) |

Titoli: segnaposto o forma "Title 1" a 4,9 % dall'alto (14 pt), paragrafo introduttivo nel segnaposto `body`; numero di slide in alto a destra. Le slide 16–18 hanno il paragrafo introduttivo come segnaposto e il titolo vero in una forma "Title": Cippi preferisce la forma chiamata "Title".

## 3. Stile e convenzioni

- **Dimensione**: 16:9, 33,87 × 19,05 cm.
- **Tema** "3_Slide Master_White" (due master, il secondo "Slide Master_White" non usato): dk2 `#44546A`, lt2 `#E7E6E6`, **accent1 `#307FE2`** (blu HSPI), accent2 `#00CFB4` (verde acqua), accent3 `#56B093`, accent4 `#FFC000`, accent5 `#E2665C`, accent6 `#D95030`, hlink `#002394`. Caratteri del tema **Poppins / Poppins**.
- **Colori a mano**: `#726754` (testi grigi), `#113F78`, `#2C2E3C`, `#2A594A`, `#00B095`, `#1A96C1`, `#009B87`, `#F2F2F2` (sfondi delle celle).
- **Caratteri nelle slide**: Poppins e Poppins SemiBold, Arial, Helvetica / Helvetica Neue, Calibri, Roboto Bold (referenze), Work Sans ExtraLight (slide 4), Sora (slide 17), Wingdings (pallini). Cippi segnala Roboto Bold, Work Sans ExtraLight e Sora.
- **Forme**: `homePlate` + `chevron` per le fasi, `rect` con sfondo `#F2F2F2` per le celle, `line` per le griglie, immagini PNG/JPEG/SVG per loghi e icone (115 media). Nomi delle forme di default ("Rectangle 3", "Freccia a gallone 18", "Text Placeholder 50").
- **Convenzioni di denominazione**: file `HSPI_<Offering>_Offering_v<maggiore>.<minore>.pptx`; titoli in Title Case con le parti "(1/2)", "(1/3)"; le slide di back-up ripetono il titolo della slide madre con ": <area>".
- **Metadati**: `docProps/core.xml` titolo "Offerta Tecnico-Economica", soggetto "SAP S4 HANA", parole chiave = cliente dell'ultima occasione (da pulire prima del riuso), creatore "HSPI"; `docProps/app.xml` 2968 parole, 14 caratteri, 2 temi; 11 note (quasi tutte con il solo numero).

## 4. Impronta (per riconoscerlo in futuro)

Vedi `offerta-hspi-erp-governance.impronta.json`. Segnali forti, in ordine:

1. tema con accent1 `#307FE2` e accent2 `#00CFB4`, caratteri Poppins/Poppins (è la **famiglia grafica HSPI**: la stessa dei master inutilizzati del kick-off ATAC e del modello `packDeck` delle prove);
2. sezioni native `Intro`, `End`, `Back up`;
3. layout `1_1`, `Black and white`, `Custom Layout`, `Blank page w/o line`;
4. titolo nei metadati "Offerta Tecnico-Economica";
5. nome del file `HSPI_<…>_Offering_v0.2.pptx`.

Con 1 è un documento HSPI; con 2+4 è un'offerta; le slide 4–7 (gruppo, HSPI 1/2, 2/2, practice) sono il **blocco aziendale** che si ritrova identico in altre offerte.

## 5. Funzioni e caratteristiche trovate (cosa ci si può fare)

| Caratteristica | Dove | Uso nell'app |
|---|---|---|
| Sezioni native di PowerPoint | `presentation.xml` | struttura del documento senza divisori (fatto: `sectionsSource = native`) |
| Indice senza numeri che coincide con i titoli | 3 | abbinamento voce ↔ slide con "uno contiene l'altro" ("Approccio interdipendenza" ↔ "Approccio di interdipendenza": non è un refuso) (fatto) |
| Segnaposto "xxxxxx" per il cliente, "0+"/"0K" residui | 2, 17 | controllo "testo segnaposto da compilare" (fatto) |
| Matrice aree × fasi | 9, 16–18 | letta come tabella con intestazioni di riga e colonna (fatto); da fare: generare le tre slide di back-up dalla matrice e viceversa |
| Griglia delle practice | 7 | tabella 4 colonne (fatto) |
| Tabelle native con loghi | 11–13 | tabella + intestazioni colorate; da fare: unire le tre parti in un elenco di referenze filtrabile per tecnologia e periodo |
| Numeri in evidenza dentro una scheda | 4, 6 | restano "scheda" (i numeri sono piccoli): da fare, riconoscere i numeri anche a 20–28 pt |
| Blocco aziendale riusato in ogni offerta | 4–7 | "Salva come modello" con le parti aziendali marcate come fisse; da fare: libreria di slide aziendali condivisa tra i modelli |
| Parti "(1/2)", "(1/3)" | 5–6, 11–13 | controllo parti (fatto) |
| Note dello speaker vere | 10 | mostrate con "Note dello speaker" |
| Sigle (ERP, SAP, AMS, UAT, SoD, PMO, ECC, ITIL, COBIT, BPR, AFC…) | tutto | glossario; AMS, UAT e SoD già spiegate nel testo (fatto) |
| Metadati con il cliente precedente | `core.xml` | da fare: avviso "parole chiave dei metadati = cliente di un'altra offerta" |

## 6. Cosa fa Cippi su questo file (misurato il 01/10/2026, v0.2.0)

- Legge e analizza in **0,3 s**: 18 slide, 2 master, 69 layout, 115 immagini.
- Tipi: copertina, titolo, indice, scheda ×4, testo, tabella ×5, chiusura ×2, scheda ×3 (back-up). Con la v0.1.0: nessun indice, nessuna chiusura, titoli sbagliati nelle slide 16–18, 4 falsi "senza titolo".
- Sezioni: `Intro`, `End`, `Back up` (native).
- Controlli: 7 (segnaposto "xxxxxx", "0+", "0K"; sezioni End e Back up non nell'indice, info; caratteri fuori tema). Punteggio **90 %** (era 86 %).
- Glossario: 59 sigle, 3 spiegate (UAT, AMS, SoD).

## 7. Funzioni di Cippi da usare con un file di questo tipo

1. **Importa PowerPoint** nel progetto dell'offerta; "Modello noto: offerta-hspi-erp-governance".
2. **Controlli**: compilare i segnaposto (cliente in copertina, contatori "0+"/"0K" nel back-up), ripulire le parole chiave dei metadati.
3. **Salva come modello** "Offerta ERP Governance": parti fisse = blocco aziendale (4–7) e framework (8–10); parti variabili = referenze (scegliere quelle del settore del cliente) e back-up.
4. **Nuovo da modello** per la prossima offerta, con "Testi come segnaposto" solo sulle slide variabili.
5. **Glossario del progetto**: ERP, SAP, AMS, UAT, SoD, PMO, ECC, BPR, AFC, ICT.
