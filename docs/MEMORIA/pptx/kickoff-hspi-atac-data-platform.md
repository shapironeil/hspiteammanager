# Template `kickoff-hspi-atac-data-platform` — kick-off di progetto HSPI (PowerPoint)

## 1. Identità

- **Template**: `kickoff-hspi-atac-data-platform` · formato `.pptx` · app di riferimento: **Cippi**.
- **Tipo di documento**: presentazione di **avvio (kick-off)** di un progetto di consulenza, con in coda l'inquadramento di un Quick Win (selezione dei KPI).
- **Fornitore / progetto**: HSPI S.p.A. per un'azienda di trasporto pubblico (brand del cliente nelle slide); progetto "Data Platform".
- **File visti**: `ATAC_Kick_Off_Data_Platform_v1.0.pptx` (16 slide, 4,8 MB, ultima modifica 01/07/2026, creato nel 2021 da un modello precedente di HSPI "72 Brand"); la sua esportazione `ATAC_Kick_Off_Data_Platform_v1.0.pdf` (16 pagine, 05/05/2026: scheda [`esportazione-pdf-presentazione`](../pdf/esportazione-pdf-presentazione.md)).
- **Provenienza**: agente `ecstatic-planck`, sessione `session_01SsSNTHHcV7asTQyvonE7gX`, ramo `claude/ecstatic-planck-q9m57v`, commit `981931f` (scheda, impronta, codice) e il commit di unione con `main` v0.10.0; analisi del 01/10/2026 con Cippi 0.2.0 e rimisurata con la 0.3.0 unita a `main`. Nessun dato del cliente oltre a struttura e stile; niente nomi di persone; il file resta fuori dal repository.

## 2. Impronta di riconoscimento

Vedi `kickoff-hspi-atac-data-platform.impronta.json`. Segnali forti, in ordine:

1. layout `copertina` (slide 1) e `Blank page w/o line` (tutte le altre) del master "Tema di Office", con **Calibri nel tema e Poppins nei testi** (impostato run per run);
2. testo fisso dei layout `CONFIDENZIALE (CONFIDENTIAL)`;
3. tre master nel file, di cui due HSPI ("Slide Master_White" e "_Black", tema Poppins, accent1 `#307FE2`) **inutilizzati**: il tema "vero" del documento è a mano;
4. nessuna sezione nativa; indice numerato (`buAutoNum`) le cui voci sono i titoli delle slide;
5. colori a mano bordeaux `#6F2927` e blu notte `#172234`;
6. nome del file `<CLIENTE>_Kick_Off_<Progetto>_v<maggiore>.<minore>.pptx`.

Con 1+2 è un documento di questa famiglia; con 4 e il piano Gantt disegnato è un kick-off. Il tema di serie di Office non basta da solo: tante presentazioni lo usano (vedi `CONFLITTI.md`, voce 4: servono i testi fissi dei layout e i caratteri usati, che l'impronta scaricata da Cippi contiene).

## 3. Mappa degli oggetti

### Struttura (capitoli dall'indice)

| # | Capitolo (dall'indice) | Slide | Tipo (Cippi) | Contenuto |
|---|---|---|---|---|
| 1 | — | 1 | copertina | layout `copertina`: titolo in due righe ("Kick-Off" / nome del progetto in corsivo) con una riga grigia sotto, **data** in basso a sinistra ("4 Maggio, 2026"), grande immagine a destra (PNG), logo del cliente in alto a destra, dicitura "CONFIDENZIALE (CONFIDENTIAL)" |
| 2 | — | 2 | indice | fascia bordeaux a sinistra con "INDICE" in bianco (48 pt), fascia bordeaux in alto, trattini grigi decorativi (28 orizzontali, 11 verticali), elenco **numerato automatico** nel segnaposto di testo: 9 voci in corsivo grassetto 18 pt |
| 3 | Introduzione e Contesto | 3 | testo | titolo in maiuscolo (18 pt grassetto, forma "Right"), numero di slide in alto a destra, due paragrafi con i concetti chiave in grassetto, **3 schede di fase**: pillola bordeaux (titolo della fase in corsivo bianco) + riquadro grigio `#F2F2F2` con la descrizione |
| 4 | Obiettivi e benefici dell'iniziativa | 4 | scheda | pillola "OBIETTIVI", **elenco di 7 obiettivi allineati a destra** con un'icona SVG in cerchio grigio lungo una linea tratteggiata verticale, freccia bordeaux, 2 riquadri e 3 benefici uniti da parentesi graffe |
| 5 | Approccio metodologico | 5 | scheda | due chevron "F1 – …" e "F2 – …" con "3 Mesi" sopra, ognuno con **Attività** e **Deliverables** in due colonne (deliverable in grassetto); sotto, tre chevron "F3 Implementazione" con l'icona del ciclo e "Ciclo iterativo di 30 mesi" |
| 6 | Focus fase Implementazione | 6 | schema | paragrafo; **schema a blocchi** con frecce rosse (Analysis & Design → Build → Build & Test → Training & UAT → Deploy & Go-live; sotto, su sfondo grigio "Data Platform Enrichment": Structured Ingestion → Governance), note con linee di richiamo, riquadro bordeaux con la frase chiave |
| 7 | Supporto al monitoraggio… | 7 | testo | paragrafo, icona, **riquadro grigio arrotondato con bordo tratteggiato bordeaux** con 8 punti elenco quadrati (parole chiave in grassetto) |
| 8 | Piano di progetto | 8 | masterplan | **Gantt disegnato con le forme**: 12 chevron dei mesi (APR … MAR, forme "Google Shape" bordeaux), righe delle tre fasi (riquadri bianchi a sinistra), barre grigie, stelle gialle (milestone), cerchi arancioni (SAL), colonne tratteggiate (pause operative), fascia verticale con testo ruotato, fumetto con nota, riquadro "Kick Off progettuale" con freccia, **legenda in basso a destra** |
| 9 | Team di progetto | 9 | organigramma | riquadri "Fornitori" e logo del cliente in alto; **albero**: Direzione Progetto → Project Management → (Subject Matter Expert, Stakeholders del cliente) → Project Team; riquadri arrotondati rossi (`C0504D`, testo bianco corsivo grassetto 16 pt), linee di collegamento, **nomi in caselle di testo a lato** (sinistra = fornitore, destra = cliente) |
| 10 | Punti di attenzione | 10 | testo | paragrafo + elenco numerato di 3 punti, giustificato |
| 11 | Quick Win KPI | 11 | testo | titolo con **refuso** ("KIP"), sottotitolo, due colonne "Contesto" / "Obiettivi della selezione KPI": intestazione bordeaux con bordo giallo, riquadro beige `#EDEBDD` con punti elenco |
| 12 | (Quick Win KPI) | 12 | numeri | **3 schede-numero** in gruppo: riquadro beige, bordino colorato in alto (blu notte, grigio, giallo `#F5BA00`), numero 64 pt, etichetta 14 pt grassetto, sottotitolo 11 pt |
| 13 | (Quick Win KPI) | 13 | immagine | titolo, sottotitolo e **una tabella incollata come immagine PNG** (fonti dato con pillole "FILE / SQL Server / MariaDB / ORACLE / API" e stato "Da indagare / Richiedere accesso") |
| 14–16 | (Quick Win KPI) | 14, 15, 16 | tabella | "CATALOGO KPI ELEGGIBILI (1/3)…(3/3)" con il refuso "ELEGGBILI": **tabella disegnata con le forme** (gruppo): riga di intestazione blu notte con 6 caselle bianche (ID · Nome KPI · Sigla · Riferimento · Formula · Fonte dato), righe alternate rosa, caselle 9,5 pt (ID e nome in grassetto, formula in corsivo); 14, 12 e 7 righe |

Ogni slide di contenuto ha: titolo in maiuscolo 18 pt grassetto in alto a sinistra (forma "Right"), numero di slide (segnaposto `sldNum`), sottotitolo 14 pt (forma "Styles come and go.…", residuo del modello), logo del cliente e "CONFIDENZIALE (CONFIDENTIAL)" dal layout. **Le note dello speaker contengono solo il numero della slide**.

### Stile e convenzioni

- **Dimensione**: 16:9, 33,87 × 19,05 cm (12192000 × 6858000 EMU), "Widescreen".
- **Master e tema**: tre master; le slide usano solo il terzo, "Tema di Office" (colori di serie di Office 2007–2010: accent1 `#4F81BD`, accent2 `#C0504D`, accent6 `#F79646`; caratteri del tema Calibri). Gli altri due sono quelli del modello HSPI e restano inutilizzati.
- **Colori a mano**: bordeaux `#6F2927` (fasce, pillole, chevron dei mesi, pallini), blu notte `#172234` (intestazioni delle tabelle, bordino), grigio `#595959`, grigio chiaro `#BFBFBF` (trattini), beige `#EDEBDD` e `#FCF7E6`, giallo `#F0C402` / `#F5BA00`, `#2C2E3C`.
- **Caratteri**: Poppins in quasi tutti i testi; poi Calibri, Arial, Roboto Black/Light (tabelle), Fira Sans Extra Condensed Medium (slide 8), Ubuntu (slide 6), Gill Sans MT (slide 8), "72 Brand" (dichiarato). Cippi li elenca come "diversi da quelli del tema".
- **Dimensioni testo**: titolo 18 pt grassetto maiuscolo; copertina 40 pt; corpo 14 pt; schede 12 pt; tabelle 9,5–11 pt; numeri in evidenza 64 pt.
- **Forme**: `rect` e `roundRect` per schede e pillole, `homePlate`/`chevron` per fasi e mesi, `star5` per le milestone, connettori `line`, gruppi (`Group N`) per tabelle, schede-numero e organigramma. Molte forme vengono da Google Slides ("Google Shape;1755;p35") e da un template grafico ("Styles come and go.…").
- **Convenzioni di denominazione**: file `<CLIENTE>_Kick_Off_<Progetto>_v<maggiore>.<minore>.pptx`; titoli in maiuscolo; parti numerate "(1/3)"; indice numerato le cui voci coincidono con i titoli; i capitoli lunghi (Quick Win) proseguono su più slide senza divisori.
- **Metadati**: `core.xml` titolo "PowerPoint Presentation" (non compilato), creato 22/07/2021, revisione 2; `app.xml` 2462 parole, 477 paragrafi, 12 caratteri, 3 temi, senza azienda; 16 note (solo il numero di slide); registro delle revisioni con l'ultima modifica alla slide 8.
- **Media**: 8 PNG (copertina, loghi, la tabella-immagine), 16 SVG (icone, legenda del piano), 2 EMF.

## 4. Parti fisse e parti variabili

- **Fisse** del template: copertina (titolo, data, immagine, logo), indice numerato, titolo + sottotitolo + numero in ogni slide, dicitura di riservatezza, i capitoli 3–10 nell'ordine (contesto, obiettivi, approccio, focus, supporto, piano, team, punti di attenzione), la legenda del piano.
- **Variabili**: i testi; le **schede di fase** (3, 5: una per fase, ripetibili); le righe del piano; i ruoli e i nomi del team; il blocco Quick Win (11–16), che è specifico di questo progetto e si può togliere; le pagine del catalogo (ripetibili, "(n/m)").
- **Segnaposto**: nessuno rimasto da compilare (i refusi sì: "KIP", "ELEGGBILI").

## 5. Regole di modifica, aggiunta ed eliminazione

- **Aggiungere un capitolo**: slide con titolo in maiuscolo 18 pt nella forma "Right" + sottotitolo; aggiungere la voce nell'indice numerato (i numeri si aggiornano da soli) **con lo stesso testo del titolo**: Cippi usa l'indice per i capitoli e segnala le differenze.
- **Togliere un capitolo**: togliere anche la voce dell'indice, altrimenti "voce dell'indice senza slide".
- **Piano**: le barre, le stelle (milestone) e i cerchi (SAL) sono forme libere allineate a mano ai chevron dei mesi: spostando un mese si spostano a mano anche le barre. Aggiungere un mese = clonare un chevron "Google Shape" e spostare le colonne tratteggiate.
- **Tabelle disegnate** (14–16): una riga = 6 caselle di testo + (una riga sì e una no) un rettangolo rosa; aggiungere una riga = duplicare le 6 caselle e il rettangolo spostandoli di 4,17 % in basso; aggiornare il conteggio nel sottotitolo ("14 KPI") e la parte "(n/m)" se si aggiunge una pagina. In Cippi le celle si modificano una per una (Modifica).
- **Tabella-immagine** (13): si rifà nello strumento di origine e si incolla di nuovo.
- **Organigramma**: i nomi stanno in caselle di testo a lato dei riquadri, collegate a mano con le linee: cambiando un ruolo si sposta la casella.

## 6. Funzioni consigliate dell'app

Disponibili (Cippi 0.3.0):
1. **Importa PowerPoint** nel progetto del cliente → Revisione; pannello **Documento** → "Somiglia a: … kickoff-hspi-atac-data-platform".
2. **Struttura**: i 10 capitoli dall'indice (`sectionsSource = indice`); tipi copertina, indice, masterplan, organigramma, numeri, tabella.
3. **Controlli**: refuso "Quick Win KPI" ↔ "QUICK WIN KIP"; caratteri diversi dal tema; (da correggere a mano) "ELEGGBILI".
4. **Punti chiave**: numeri in evidenza con l'etichetta, periodi e fasi del piano, ruoli del team, grassetti dei testi.
5. **Modifica**: testi, celle delle tabelle disegnate, ordine delle slide; **Trova e sostituisci** per il nome del cliente/progetto.
6. **Appunti → Confronta** sul PDF esportato prima di mandarlo al cliente: deve risultare *allineato*.
7. **Salva come modello** "Kick-off HSPI": parti ripetibili le schede di fase e le pagine del catalogo; con "Nuovo da modello" il prossimo kick-off parte da qui.
8. **Glossario del progetto**: KPI, MVP, UAT, BI, ETL, CdS (Contratto di Servizio), SAL, KT.
9. **Documento → Scarica impronta** per aggiornare l'impronta dopo una versione nuova.

Da realizzare:
- barre, milestone e SAL del piano disegnato → date e **scadenze in GestioneCelle** (il piano SVG le ha già);
- organigramma → ruoli e persone collegati ai membri del progetto nel portale;
- unione delle tabelle in più parti (1/3 + 2/3 + 3/3) ed esportazione in Excel;
- lettura della tabella incollata come immagine (OCR, motore locale);
- refusi nei titoli non citati dall'indice ("ELEGGBILI");
- legenda del piano fatta di icone SVG (oggi Cippi legge solo le legende a forme).

## 7. Stato dell'app su questo template

Misurato il 01/10/2026 (Cippi 0.3.0 unito a `main` v0.10.0):
- Legge e analizza in **0,3 s**: 16 slide, 3 master, 93 layout, 26 immagini.
- Tipi: copertina ✓, indice ✓, testo ×4, scheda ×2, schema ✓, masterplan ✓, organigramma ✓, numeri ✓, immagine (la tabella-PNG), tabella ×3 (disegnate, lette da `struttura.js`: 6 colonne, celle modificabili). Con la 0.1.0: slide 1 "titolo", 2 "testo", 13 "divisore" (falso), "manca l'indice" (falso).
- Sezioni: 10, dai capitoli dell'indice ("Quick Win KPI" contiene 11–16).
- Controlli: 2 (refuso "Quick Win KPI" ↔ "QUICK WIN KIP"; caratteri diversi dal tema: Poppins, Ubuntu, Roboto, Gill Sans MT, 72 Brand, …). Punteggio **96 %** (era 94 % con due falsi avvisi).
- Glossario: 21 sigle, nessuna spiegata nel testo; nessuna del glossario PA.
- Memoria: `impronta.js` riconosce l'impronta scaricata da Cippi (stessi colori, caratteri, layout principale, piè di pagina "CONFIDENZIALE (CONFIDENTIAL)").
- PDF: 16 pagine in 0,16 s; confronto con il `.pptx`: 16 coppie nell'ordine, somiglianza media 0,98, **allineato**.

## 8. Dubbi aperti

- Il tema "vero" è a mano (Calibri nel tema, Poppins nei testi): va fatto un modello HSPI pulito con il brand del cliente nel tema, o si continua così? Cippi segnalerà sempre "caratteri diversi dal tema".
- La legenda del piano usa icone SVG: Cippi non la legge come legenda. Serve una regola per le legende con icone?
- Il blocco Quick Win (11–16) è parte del kick-off standard o un'aggiunta di questo progetto?

## 9. Da classificare

- Nomi delle forme ereditati da Google Slides e dal template grafico ("Styles come and go.…", "Google Shape;1755;p35"): utili come segnale dell'impronta, inutili per chi legge.
- Due EMF tra i media (non visibili nell'anteprima).
- `app.xml` dichiara "72 Brand" tra i caratteri: residuo del modello del 2021.

## 10. Fonti

- Lettura del `.pptx` con Cippi (`pptx-read.js`, `analyze.js`, `struttura.js`) e ispezione del pacchetto (presentation.xml, master, layout, docProps) nella sessione `session_01SsSNTHHcV7asTQyvonE7gX`, 01/10/2026: sezioni 2, 3, 7.
- Confronto con il PDF esportato (`pdf-read.js`, `appunti.js`): sezione 7.
- Osservazioni di `admiring-hopper` sul kick-off TXT/BIOSIRIS (sezioni native non lette, copertina, falsi avvisi sull'indice, note con il solo numero): risolte nel codice unito, sezione 7.
- Report `docs/REPORT/2026-10-01-memoria-kickoff-atac-offerta-erp-pdf.md`.
