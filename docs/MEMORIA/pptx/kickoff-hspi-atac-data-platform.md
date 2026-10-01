# Template `kickoff-hspi-atac-data-platform` — kick-off di progetto HSPI (PowerPoint)

**File visti:** `ATAC_Kick_Off_Data_Platform_v1.0.pptx` (16 slide, 4,8 MB, ultima modifica 01/07/2026, creato nel 2021 da un modello precedente di HSPI, "72 Brand") e la sua esportazione `ATAC_Kick_Off_Data_Platform_v1.0.pdf` (16 pagine, 645 KB, creata il 05/05/2026 con PowerPoint per Microsoft 365).

Analizzato il 01/10/2026 con Cippi v0.2.0 (portale v0.8.1). Nessun dato del cliente è copiato qui oltre a struttura e stile: i file restano fuori dal repository. Niente nomi di persone.

## 1. Cos'è e a cosa serve

Presentazione di **avvio (kick-off)** di un progetto di consulenza per un'azienda di trasporto pubblico: la Data Platform di nuova generazione. È il documento che HSPI usa nella prima riunione con il cliente per fissare: contesto e fasi, obiettivi e benefici, approccio metodologico, focus sulla fase di implementazione, attività di supporto e monitoraggio, piano con le milestone, team e ruoli, punti di attenzione. Nella seconda parte c'è un **inquadramento del Quick Win** (selezione dei KPI calcolabili per un caso d'uso sperimentale): contesto e obiettivi, numeri in evidenza, fonti dato, catalogo dei KPI in tre pagine.

A differenza del kick-off TXT/BIOSIRIS (altra scheda), qui **non ci sono sezioni native di PowerPoint**: la struttura è nell'indice numerato della slide 2, i cui titoli coincidono con i titoli delle slide seguenti.

## 2. Struttura (parti nell'ordine)

| # | Capitolo (dall'indice) | Slide | Tipo (Cippi) | Contenuto |
|---|---|---|---|---|
| 1 | — | 1 | copertina | layout `copertina`: titolo in due righe ("Kick-Off" / nome del progetto in corsivo) con una riga grigia sotto, **data** in basso a sinistra ("4 Maggio, 2026"), grande immagine a destra (PNG), logo del cliente in alto a destra, dicitura "CONFIDENZIALE (CONFIDENTIAL)" in basso |
| 2 | — | 2 | indice | fascia bordeaux a sinistra con "INDICE" in bianco (48 pt), fascia bordeaux in alto, "trattini" grigi decorativi (28 rettangoli in orizzontale, 11 in verticale), elenco **numerato automatico** (`buAutoNum`) nel segnaposto di testo: 9 voci in corsivo grassetto 18 pt |
| 3 | Introduzione e Contesto | 3 | testo | titolo in maiuscolo (18 pt grassetto, forma "Right"), numero di slide in alto a destra, due paragrafi con i concetti chiave in **grassetto**, poi **3 schede di fase**: pillola bordeaux `#6F2927` (titolo della fase in corsivo bianco) + riquadro grigio `#F2F2F2` con la descrizione |
| 4 | Obiettivi e benefici dell'iniziativa | 4 | scheda | pillola "OBIETTIVI", **elenco di 7 obiettivi allineati a destra** con un'icona SVG in cerchio grigio ciascuno lungo una linea tratteggiata verticale, freccia bordeaux, 2 riquadri "abilitare / supportare" e 3 benefici a destra uniti da parentesi graffe |
| 5 | Approccio metodologico | 5 | scheda | due chevron grandi "F1 – …" e "F2 – …" con "3 Mesi" sopra, ognuno con **Attività** e **Deliverables** in due colonne di punti elenco (deliverable in grassetto); sotto, tre chevron "F3 Implementazione" in sequenza con l'icona del ciclo e "Ciclo iterativo di 30 mesi" |
| 6 | Focus fase Implementazione | 6 | schema | paragrafo introduttivo; **schema a blocchi** con frecce rosse (Analysis & Design → Build → Build & Test → Training & UAT → Deploy & Go-live; sotto, su sfondo grigio "Data Platform Enrichment": Structured Ingestion → Governance), note in piccolo con linee di richiamo, riquadro bordeaux con la frase chiave |
| 7 | Supporto al monitoraggio… | 7 | testo | paragrafo, icona, **riquadro grigio arrotondato con bordo tratteggiato bordeaux** con 8 punti elenco quadrati (parole chiave in grassetto) |
| 8 | Piano di progetto | 8 | piano | **Gantt disegnato con le forme**: 12 chevron dei mesi (APR … MAR, forme "Google Shape" bordeaux), righe delle tre fasi (riquadri bianchi a sinistra), barre grigie, stelle gialle (milestone), cerchi arancioni (SAL), colonne tratteggiate (pause operative), fascia verticale con testo ruotato ("attività preparatorie"), fumetto con nota, riquadro "Kick Off progettuale" con freccia, **legenda in basso a destra** (Attività iterative, Milestone, SAL, Pausa Operativa) |
| 9 | Team di progetto | 9 | organigramma | riquadri "Fornitori" e logo del cliente in alto; **albero**: Direzione Progetto → Project Management → (Subject Matter Expert, ATAC Stakeholders) → Project Team; riquadri arrotondati rossi (`C0504D`, testo bianco corsivo grassetto 16 pt), linee di collegamento, **nomi in caselle di testo a lato** (sinistra = fornitore, destra = cliente) |
| 10 | Punti di attenzione | 10 | testo | paragrafo + elenco numerato di 3 punti, giustificato |
| 11 | Quick Win KPI | 11 | testo | titolo con **refuso** ("KIP"), sottotitolo, due colonne "Contesto" / "Obiettivi della selezione KPI": intestazione bordeaux con bordo giallo, riquadro beige `#EDEBDD` con punti elenco (pallino bordeaux), parole chiave in grassetto |
| 12 | (Quick Win KPI) | 12 | numeri | **3 schede-numero** in gruppo: riquadro beige, bordino colorato in alto (blu notte `#172234`, grigio `#595959`, giallo `#F5BA00`), numero grande 64 pt, etichetta 14 pt grassetto, sottotitolo 11 pt |
| 13 | (Quick Win KPI) | 13 | immagine | titolo, sottotitolo e **una tabella incollata come immagine PNG** (fonti dato con pillole "FILE / SQL Server / MariaDB / ORACLE / API" e stato "Da indagare / Richiedere accesso") |
| 14–16 | (Quick Win KPI) | 14, 15, 16 | tabella | "CATALOGO KPI ELEGGIBILI (1/3)…(3/3)" con il refuso "ELEGGBILI": **tabella disegnata con le forme** (gruppo): riga di intestazione blu notte con 6 caselle bianche (ID · Nome KPI · Sigla · Riferimento · Formula · Fonte dato), righe alternate con sfondo rosa `C0504D` trasparente, caselle di testo 9,5 pt (ID e nome in grassetto, formula in corsivo); 14, 12 e 7 righe |

Ogni slide di contenuto ha: titolo in maiuscolo 18 pt grassetto in alto a sinistra (forma chiamata "Right"), numero di slide (segnaposto `sldNum`) in alto a destra, sottotitolo 14 pt (forma "Styles come and go.…", residuo del modello), logo del cliente e "CONFIDENZIALE (CONFIDENTIAL)" dal layout. **Le note dello speaker contengono solo il numero della slide** (vuote in pratica: Cippi le ignora).

## 3. Stile e convenzioni

- **Dimensione**: 16:9, 33,87 × 19,05 cm (12192000 × 6858000 EMU), "Widescreen".
- **Master e tema**: tre master nel file; le slide usano solo il terzo, "Tema di Office" (colori di serie di Office 2007–2010: accent1 `#4F81BD`, accent2 `#C0504D`, accent6 `#F79646`; caratteri del tema **Calibri**). Gli altri due master ("Slide Master_White" e "_Black", tema Poppins, accent1 `#307FE2`) sono quelli del modello HSPI e restano inutilizzati: **il tema "vero" del documento è a mano**.
- **Colori a mano** (non del tema): bordeaux `#6F2927` (fasce, pillole, chevron dei mesi, pallini), blu notte `#172234` (intestazioni delle tabelle, bordino), grigio `#595959`, grigio chiaro `#BFBFBF` (trattini), beige `#EDEBDD` e `#FCF7E6`, giallo `#F0C402` / `#F5BA00`, `#2C2E3C`.
- **Caratteri**: Poppins in quasi tutti i testi (impostato run per run, perché il tema dice Calibri); poi Calibri, Arial, Roboto Black/Light (tabelle), Fira Sans Extra Condensed Medium (slide 8), Ubuntu (slide 6), Gill Sans MT (slide 8). Cippi segnala come "fuori tema" quelli usati in poche slide.
- **Dimensioni testo**: titolo 18 pt grassetto maiuscolo; copertina 40 pt; corpo 14 pt; schede 12 pt; tabelle 9,5–11 pt; numeri in evidenza 64 pt.
- **Forme**: `rect` e `roundRect` per schede e pillole, `homePlate`/`chevron` per fasi e mesi, `star5` per le milestone, connettori `line` (frecce rosse dello schema, linee dell'organigramma), gruppi (`Group N`) per tabelle, schede-numero e organigramma. Molte forme vengono da Google Slides ("Google Shape;1755;p35") e da un template grafico ("Styles come and go.…").
- **Convenzioni di denominazione**: file `<CLIENTE>_Kick_Off_<Progetto>_v<maggiore>.<minore>.pptx`; titoli in maiuscolo; parti numerate "(1/3)"; indice a voci numerate che coincidono con i titoli; capitoli lunghi (Quick Win) proseguono su più slide senza divisori.
- **Metadati**: `docProps/core.xml` titolo "PowerPoint Presentation" (non compilato), creato 22/07/2021, revisione 2; `docProps/app.xml` 2462 parole, 477 paragrafi, 12 caratteri usati, 3 temi, senza azienda; 16 note (solo il numero di slide).
- **Media**: 8 PNG (immagine di copertina, loghi, la tabella-immagine della slide 13), 16 SVG (icone degli obiettivi, legenda del piano), 2 EMF.

## 4. Impronta (per riconoscerlo in futuro)

Vedi `kickoff-hspi-atac-data-platform.impronta.json`. Segnali forti, in ordine:

1. layout `copertina` (slide 1) e `Blank page w/o line` (tutte le altre) del master "Tema di Office" con caratteri Calibri nel tema e Poppins nei testi;
2. testo fisso dei layout `CONFIDENZIALE (CONFIDENTIAL)`;
3. tre master nel file, di cui due HSPI (tema Poppins, accent1 `#307FE2`) inutilizzati;
4. nessuna sezione nativa, indice numerato con `buAutoNum`;
5. colori a mano `#6F2927` e `#172234`;
6. nome del file `<CLIENTE>_Kick_Off_<Progetto>_v1.0.pptx`.

Con 1+2 è un documento di questa famiglia; con 4 (indice numerato con capitoli che coincidono con i titoli) e il piano Gantt disegnato è un kick-off.

## 5. Funzioni e caratteristiche trovate (cosa ci si può fare)

| Caratteristica | Dove | Uso nell'app |
|---|---|---|
| Indice numerato con i titoli delle slide | 2 | capitoli = sezioni (fatto: "sezioni dall'indice"); controllo voce ↔ titolo con i **refusi** (fatto: trova "KIP") |
| Copertina con data e immagine | 1 | tipo "copertina" dal nome del layout (fatto) |
| Piano Gantt disegnato con le forme | 8 | tipo "piano", mesi letti (fatto); da fare: barre → date di inizio e fine per fase, milestone (stelle) e SAL (cerchi) → scadenze in GestioneCelle |
| Organigramma | 9 | tipo "organigramma", ruoli letti (fatto); da fare: albero ruoli → persone, collegato ai membri del progetto nel portale |
| Numeri in evidenza | 12 | tipo "numeri", numero + etichetta nei punti chiave (fatto) |
| Tabella disegnata con le forme | 14–16 | tipo "tabella" con intestazione e righe (fatto); da fare: esportazione in Excel, modifica cella per cella, unione delle parti (1/3 + 2/3 + 3/3) in una tabella sola |
| Tabella incollata come immagine | 13 | si vede solo come immagine: da fare, lettura con il motore locale (OCR) |
| Parti numerate "(1/3)" | 14–16 | controllo parti mancanti/doppie (fatto) |
| Schede di fase (pillola + riquadro) | 3, 5 | blocchi "intestazione + paragrafo"; parte ripetibile del modello (una scheda per fase) |
| Schema a blocchi con frecce | 6 | tipo "schema"; da fare: lettura del grafo come nei flussi (nodi e frecce) |
| Legenda del piano (icone + etichette) | 8 | la legenda di Cippi legge solo simboli-forme; da fare: icone SVG come simboli |
| Caratteri fuori tema | 5, 6, 8 | controllo "caratteri fuori tema" (fatto) |
| Note con il solo numero di slide | tutte | ignorate (fatto) |
| Esportazione PDF con lo stesso nome | cartella del progetto | **confronto PDF ↔ presentazione** pagina per slide (fatto): il PDF del 05/05/2026 corrisponde alla v1.0 |
| Sigle (KPI, MVP, UAT, BI, ETL, CdS, SAL, …) | tutto | glossario del progetto; "CdS" letta grazie alle sigle con minuscole (fatto) |

## 6. Cosa fa Cippi su questo file (misurato il 01/10/2026, v0.2.0)

- Legge e analizza in **0,3 s**: 16 slide, 3 master, 93 layout, 26 immagini.
- Tipi: copertina ✓, indice ✓, testo ×4, scheda ×2, schema ✓, piano ✓, organigramma ✓, numeri ✓, immagine (la tabella-PNG), tabella ×3. Con la v0.1.0 erano: titolo, testo, testo, scheda…, 13 "divisore" (falso) e "manca l'indice" (falso).
- Sezioni: 10, dai capitoli dell'indice; "Quick Win KPI" contiene le slide 11–16.
- Controlli: 2 (refuso "Quick Win KPI" ↔ "QUICK WIN KIP"; caratteri fuori tema Ubuntu e Gill Sans MT). Punteggio **96 %** (era 94 % con due falsi avvisi).
- Glossario: 21 sigle, nessuna spiegata nel testo.
- Memoria: impronta riconosciuta al 100 % contro se stessa; contro `offerta-hspi-erp-governance` circa 10 (tema diverso: qui "Tema di Office", lì Poppins/`#307FE2`).
- PDF: 16 pagine lette in 0,16 s; confronto con il `.pptx`: 16 coppie, ordine uguale, testi uguali (**allineato**). Spostando una slide e togliendone una, il confronto lo dice (pagina senza slide, ordine diverso).

## 7. Funzioni di Cippi da usare con un file di questo tipo

1. **Importa PowerPoint** nel progetto del cliente → Revisione; il pannello strumenti mostra "Modello noto: kickoff-hspi-atac-data-platform".
2. **Controlli**: correggere i refusi segnalati (titolo citato dall'indice, "ELEGGBILI" non è ancora rilevato), i caratteri fuori tema.
3. **Appunti → Confronta** sul PDF esportato prima di mandarlo al cliente: deve risultare *allineato* all'ultima versione.
4. **Punti chiave**: Cippi propone numeri in evidenza, periodi del piano, ruoli del team, intestazioni delle tabelle, grassetti dei testi.
5. **Salva come modello** "Kick-off HSPI": parti ripetibili le schede di fase e le pagine del catalogo; con "Nuovo da modello" il prossimo kick-off parte da qui.
6. **Glossario del progetto**: KPI, MVP, UAT, BI, ETL, CdS (Contratto di Servizio), SAL, KT.
