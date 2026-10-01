# Template `kickoff-txt-biosiris` — presentazione di kick-off di progetto (PowerPoint)

**File visti:** `BIOSIRIS_Kick-off_v0.9.1.pptx` (13 slide, 836 KB, ultima modifica 30/09/2026, autrice Chiara Ibba, azienda TXT e-solutions S.p.A.; co-autori nel file: Massimiliano Perri e Sarah Poma di Webgenesys).

Analizzato il 01/10/2026 con Cippi v0.1.0 (portale v0.8.1). Nessun dato del file è copiato qui oltre a struttura e stile: il file resta fuori dal repository.

## 1. Cos'è e a cosa serve

Presentazione di **avvio (kick-off) di un progetto** per una pubblica amministrazione: BIOSIRIS, Regione Siciliana, Dipartimento Sviluppo Rurale, nell'ambito dell'accordo quadro Consip "AQ SAC 3 - Lotto 1" (ID 2610). Il raggruppamento che la presenta è TXT e-solutions con HSPI, Deda Next, Webgenesys e RPC Net (loghi a piè di pagina). Serve a raccontare al cliente, nella prima riunione: contesto e finanziamento, obiettivi, ambiti di intervento (una scheda per ambito), piano di massima (masterplan a Gantt) e sintesi economica del contratto.

## 2. Struttura (parti nell'ordine)

Le **sezioni sono quelle native di PowerPoint** (`p14:sectionLst`), non ci sono slide divisorie:

| # | Sezione nativa | Slide | Tipo | Layout | Contenuto |
|---|---|---|---|---|---|
| 1 | Copertina | 1 | copertina | Title Slide | titolo "PROGETTO <NOME> KICK-OFF" (40 pt), sottotitolo con nome esteso del progetto e riferimento dell'AQ, data `gg/mm/aaaa`, loghi istituzionali in alto a destra, pannello verde a destra con stemma (Trinacria), loghi dei partner in basso |
| 2 | Indice | 2 | indice | Blank | "INDICE" (24 pt grassetto) + elenco **numerato** a due livelli (voci di primo livello 16 pt con `buAutoNum`, sotto-voci 14 pt con punto) |
| 3 | Introduzione e contesto | 3 | testo | 1_Title and Content | due paragrafi in grassetto, elenco con frecce verdi (priorità del programma), loghi dei fondi a destra, **barra verde** in basso con AQ di riferimento, importo e durata |
| 4 | Obiettivi | 4 | testo | 1_Title and Content | paragrafo introduttivo + **schema a esagono** (immagine PNG) con 5 obiettivi: freccia → quadrato colorato (freeform) + testo, colori accent3/accent4/accent2 |
| 5 | Ambito | 5 | scheda (1 riquadro) | 1_Title and Content | "INDIVIDUAZIONE e MANTENIMENTO": riquadro azzurro arrotondato `#DCEAF7` con icona SVG, intestazione verde scuro 16 pt grassetto, elenco con frecce a pentagono |
|   |   | 6 | scheda a righe | 1_Title and Content | 4 **componenti**: pillola colorata (testo bianco su `#00B095`, accent5, accent1, accent6) sopra un riquadro bianco con la descrizione (12 pt) |
|   |   | 7 | scheda a 4 riquadri | 1_Title and Content | griglia 2×2 di riquadri `#DCEAF7` con icona SVG, intestazione verde e punti elenco, uno per ambito |
|   |   | 8–11 | scheda ambito | 1_Title and Content | **modello ripetuto per ogni ambito**: paragrafo introduttivo; 3–4 componenti a pillola + descrizione (stessi colori della slide 6); linea verde; frase "Le funzionalità previste prevedono l'integrazione con alcune delle piattaforme abilitanti nazionali."; **tabella disegnata con forme** con colonne FUNZIONALITÀ · PIATTAFORMA ABILITANTE · FINALITÀ, una riga = una pillola verde scuro `#225546` con tre testi bianchi (10,5 pt, il primo in grassetto, il secondo in corsivo) |
| 6 | Masterplan | 12 | masterplan | 1_Title and Content | **Gantt come immagine SVG** (anni/mesi in alto, componenti con attività "Design e analisi funzionale / Sviluppo applicativi, Test e Implementazione / Rilascio e manutenzione applicativa", barre a freccia); testi a sinistra (introduzione, nota in piccolo) |
| 7 | Sintesi contratto esecutivo | 13 | tabella | 1_Title and Content | paragrafo in grassetto (AQ Consip, consuntivazione a SAL trimestrale) + **tabella nativa** 7 colonne × 8 righe: ID SERVIZIO, NOME SERVIZIO, METRICA, NOTE, PREZZO UNITARIO, QUANTITÀ, VALORE ECONOMICO; ultima riga TOTALE con 6 celle unite (`gridSpan=6`) e sfondo accent1; stile "Medium Style 2 - Accent 1" (prima riga e righe a bande); valori in grassetto; il totale è la somma delle righe |

Ogni slide di contenuto ha: titolo in maiuscolo (o "Ambito - NOME"), paragrafo introduttivo nel segnaposto del corpo, piè di pagina "Kick-off Progetto BioSiris", numero di slide. Note dello speaker: 5 slide le hanno ma contengono **solo il numero della slide** (vuote in pratica).

## 3. Stile e convenzioni

- **Dimensione**: 16:9, 33,87 × 19,05 cm (12192000 × 6858000 EMU), formato "Widescreen".
- **Tema** "Office Theme", schema colori personalizzato: dk2 `#335B74`, lt2 `#DFE3E5`, accent1 `#225546` (verde scuro, colore guida), accent2 `#A9D7B6`, accent3 `#318B71`, accent4 `#42BA97`, accent5 `#1482AB` (blu), accent6 `#264457`, hlink `#6EAC1C`, folHlink `#B26B02`. Colori extra usati a mano: `#DCEAF7` (riquadri azzurri), `#00B095` (pillola verde acqua), `#767171` e `#292C35` (grigi), `#41B6E6`, `#247DE1`.
- **Caratteri**: tema Poppins (titoli e corpo). Nelle slide compaiono anche Helvetica (schede), Arial (punti elenco), Open Sans e **"FT Habit Trial"** (slide 8–11, carattere di prova non standard: da segnalare).
- **Dimensioni testo**: titolo 24 pt grassetto (master), copertina 40 pt, corpo 12–14 pt, pillole 12 pt bianco, righe della tabella disegnata 10,5 pt, note 8–9 pt. Interlinea 130–150 % nei paragrafi introduttivi.
- **Layout del master** `1_Title and Content`: numero slide in alto a destra con trattino verde, logo cliente in alto a sinistra con trattino verde, piè di pagina centrato, 4 loghi dei partner in basso (2 a sinistra, 2 a destra) separati da linee verticali `bg2`.
- **Forme**: `roundRect` per riquadri e pillole, `homePlate` come freccia-elenco, `rightArrow` piccoli, `custGeom` per i quadrati con icona, connettori `line` per separatori e frecce. Nomi delle forme lasciati di default ("Rectangle: Rounded Corners 39", "Text 85/90") tranne le pillole, chiamate "Web Design", "Programming", "Database" (residuo di un modello grafico scaricato).
- **Convenzioni di denominazione**: file `<PROGETTO>_Kick-off_v<maggiore>.<minore>.<patch>.pptx`; titoli delle schede "Ambito - NOME AMBITO" in maiuscolo; componenti con nome "titolo (Backend)/(Frontend)/(API)/(DSS)".
- **Metadati**: `docProps/app.xml` Company "TXT e-solutions S.p.A.", 1976 parole, 221 paragrafi; `docProps/core.xml` titolo vuoto, revisione 68; `ppt/authors.xml` con due co-autori (Microsoft 365); `ppt/revisionInfo.xml` e `ppt/changesInfos/changesInfo1.xml` con il registro delle ultime modifiche (29–30/09/2026, slide 5, 6, 7 e 12); erano presenti commenti, poi cancellati.
- **Media**: 11 PNG (loghi, stemma, esagono degli obiettivi), 6 SVG (5 icone Microsoft "Icons_TopographyMap/Target/ShoppingCart/Plant/Home" e il Gantt), 1 `hdphoto1.wdp` (effetto artistico su un'immagine della slide 3).

## 4. Impronta (per riconoscerlo in futuro)

Vedi `kickoff-txt-biosiris.impronta.json`. Segnali forti, in ordine:

1. tema con accent1 `#225546` e accent5 `#1482AB`, caratteri Poppins/Poppins;
2. layout usato dalla maggior parte delle slide `1_Title and Content` con piè di pagina "Kick-off Progetto …";
3. sezioni native "Copertina, Indice, Introduzione e contesto, Obiettivi, Ambito, Masterplan, Sintesi contratto esecutivo";
4. forme chiamate "Web Design", "Programming", "Database" (le pillole) e "Text 85"/"Text 90" (la tabella disegnata);
5. ultima slide con una tabella il cui ultimo rigo è "TOTALE";
6. azienda "TXT e-solutions S.p.A." nei metadati.

Con 1+2 il file è una presentazione di questa famiglia (kick-off, SAL, chiusura dello stesso raggruppamento); con 3 è proprio un kick-off.

## 5. Funzioni e caratteristiche trovate (cosa ci si può fare)

| Caratteristica | Dove | Uso possibile nell'app |
|---|---|---|
| Sezioni native di PowerPoint | `presentation.xml` | struttura del documento senza slide divisorie; indice automatico; completezza rispetto al modello |
| Indice a due livelli numerato | slide 2 | abbinamento voce ↔ slide (anche per le sotto-voci "Ambito - X"); controllo "voce senza slide" corretto |
| Scheda ambito ripetuta (8–11) | slide 8–11 | parte **ripetibile** del modello: "nuovo kick-off con N ambiti" |
| Pillola = forma colorata + casella di testo trasparente sopra | 6, 8–11 | blocco "intestazione" con colore; cambio colore/testo per funzione |
| Tabella disegnata con forme (3 colonne) | 8–11 | trasformare in tabella logica (funzionalità, piattaforma, finalità); aggiungere una riga clonando la pillola; estrarre l'elenco delle piattaforme abilitanti del progetto |
| Tabella nativa con celle unite, stile e totale | 13 | lettura con stile e celle unite; modifica celle; controllo "totale = somma"; esportazione in Excel/GestioneCelle |
| Gantt come SVG con testi | 12 | lettura di anni/mesi, componenti, attività e barre → masterplan strutturato; collegamento con il piano di lavoro Excel (PdL) dello stesso progetto |
| Icone SVG di Office | 5, 7 | anteprima fedele (già ok); libreria di icone riusabile nelle nuove slide |
| Loghi e numero slide nel layout | layout 3 | anteprima con lo sfondo del layout; sostituzione del logo cliente per funzione |
| Glossario di sigle della PA | tutto | AQ, SAC, PMO, SPID/CIE, PagoPA, AppIO, PDND, SEND, FESR, PSR, PSP/PAC, PRIU, SAL, FTE, GG, DSS, OMS, IAM, TIC: glossario preimpostato e definizioni "SIGLA (significato)" |
| Registro revisioni, autori, azienda | `authors.xml`, `revisionInfo.xml`, `changesInfos/`, `app.xml` | "chi ha toccato cosa e quando" nella revisione |
| Carattere di prova "FT Habit Trial", caratteri fuori tema | slide 8–11 | controllo "caratteri non standard" |
| Testi che sforano i riquadri | 5, 7 (intestazioni lunghe) | controllo "testo che non entra" |

## 6. Cosa fa già Cippi su questo file (misurato il 01/10/2026)

- Legge tutto in **0,1 s**: 13 slide, tema, caratteri, 12 layout, forme, immagini (PNG e SVG), tabella (testi), note.
- Tipi riconosciuti: indice ✓, tabella ✓, 4 schede ✓ (7–10). Sbagliati: slide 1 "testo" (è la copertina), 5 "schema", 6, 11 e 12 "testo" (sono schede e masterplan).
- Sezioni: una sola ("Apertura"): **non legge le sezioni native**.
- Indice: trovato con 11 voci, ma 5 **falsi avvisi** "voce senza slide" (le sotto-voci e i titoli "Ambito - X"), più "manca una slide di titolo" (falso).
- Blocchi: ordine di lettura buono; il piè di pagina e la data contano come blocchi; le pillole sono "paragrafo" e non "intestazione"; la tabella disegnata resta forme sciolte.
- Glossario: 16 sigle, 5 con significato (PSR, PSP, TIC, DSS, OMS); "FINALITÀ" letta come "FINALIT"; BIOSIRIS non spiegato (8 lettere); PagoPA/AppIO non visti.
- Anteprima nel browser: fedele (colori, posizioni, SVG, Gantt), ma senza loghi/numero slide del layout, tabella senza stile né celle unite, qualche intestazione che sfora per il carattere sostituito, quadrati `custGeom` disegnati come rettangoli.
- Esportazione `.pptx` dopo riordino/duplicazione/eliminazione: si riapre, ma lascia **3 immagini orfane** (`image11.png`, `image12.svg`, `image17.svg`) e non aggiorna `Notes`/`TitlesOfParts` in `app.xml`.
- Punteggio 77 %, abbassato dai falsi avvisi.

## 7. Funzioni di Cippi da usare con un file di questo tipo

1. **Importa PowerPoint** nel progetto del cliente → Revisione.
2. **Salva come modello** "Kick-off <raggruppamento>": le parti ripetibili sono *scheda ambito* (8–11); la scheda 7 (griglia 2×2) va tenuta allineata a mano al numero di ambiti.
3. **Nuovo da modello** per il kick-off successivo: copertina, indice, contesto, obiettivi, ambito × N, masterplan, sintesi contratto; con "testi come segnaposto".
4. **Glossario del progetto**: inserire subito le sigle della PA (vedi sopra), valgono per tutti i documenti del progetto.
5. Punti chiave: i grassetti della slide 3 (contesto), importo e durata, le piattaforme abilitanti per ambito, la nota del masterplan ("vista di alto livello…").
6. Appunti accanto al documento: il piano di lavoro Excel (PdL) dello stesso progetto, da cui nasce il masterplan.

Le funzioni mancanti e la loro priorità sono nella proposta inviata il 01/10/2026 (da approvare prima di toccare il codice).
