# Template `piano-di-lavoro-txt-biosiris` — piano di lavoro di dettaglio, Gantt mensile a due livelli (Excel)

## 1. Identità

| Voce | Valore |
|---|---|
| Nome del template | `piano-di-lavoro-txt-biosiris` (prima versione dell'analisi: `excel-piano-di-lavoro-gantt` in `docs/MODELLI-FILE`, commit `0fe8189`) |
| Formato | `.xlsx` (Excel) |
| Tipo di documento | piano di lavoro di dettaglio di un progetto pluriennale: WBS a due livelli (work package → fasi) e timeline per mesi con barre colorate |
| App di riferimento | **GestioneCelle** |
| Fornitore / progetto | TXT e-solutions S.p.A. con Deda Next e Webgenesys (le sigle che compaiono come Owner); progetto BIOSIRIS. Il kick-off dello stesso progetto mostra anche HSPI e RPC Net tra i partner: vedi sezione 8 |
| File visti | `BIOSIRIS_PdL_di_dettaglio_v0.4.xlsx` ("PdL" = Piano di Lavoro): modificato il 29/09/2026; 1 foglio, 6 work package, 46 fasi, 39 mesi (ottobre 2026 - dicembre 2029), 54 formule, 17 celle unite; dimensione non nota |
| Analizzato | 01/10/2026 (GestioneCelle 0.8.0, portale 0.8.1) |

A cosa serve: mostrare al cliente e al team chi fa cosa e quando; è il "masterplan" che poi finisce anche nelle presentazioni (slide Masterplan del kick-off). È un file **disegnato, non calcolato**: non ci sono date, durate o formule che generino le barre. Le barre sono il colore di sfondo delle celle, messo a mano. Le uniche formule (54) copiano il codice e il nome del work package dalla riga sopra.

Sinergia con MPoint: la slide 12 (Masterplan) del template `../pptx/kickoff-txt-biosiris.md` è la versione grafica di questo piano, con le stesse componenti e le fasi raggruppate in tre macro-fasi, anni 2026-2028.

**Provenienza**: agente `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, ramo `claude/cool-noether-kv3o8c`, commit `0fe8189` (prima versione in `docs/MODELLI-FILE/excel-piano-di-lavoro-gantt.md` + `modelli.json`) e `8314b5a` (spostata in `docs/MEMORIA/xlsx/` con il nome attuale e l'impronta), analisi del 01/10/2026. Scheda originale in `../_archivio/2026-10-01/cool-noether/MEMORIA/xlsx/`. Unificata il 01/10/2026 sul ramo `claude/integrazione-2026-10-01`.

## 2. Impronta di riconoscimento

Impronta leggibile da un programma: `piano-di-lavoro-txt-biosiris.impronta.json` (`punteggioMinimo` 4). Segnali, in ordine, con il peso dell'impronta:

1. un foglio chiamato `Piano di lavoro` (o simile), uno solo (peso 1);
2. nelle prime 6 righe una riga con `LIV 1`, `Work Package`, `LIV 2`, `Work Package`, `Owner`, `Note` (peso 2) seguiti da ≥ 12 celle con una sola lettera presa da `G F M A M G L A S O N D` (peso 2);
3. sopra: una riga con `Q1…Q4` in celle unite da 3 (peso 1), e una con anni in celle unite da 12 (peso 1);
4. nelle colonne dei mesi: celle **senza valore ma con riempimento pieno** (le barre) (peso 2);
5. assenza di tabelle, convalide, formati condizionali, nomi definiti; formule solo del tipo `=B5` / `=C22` / `=+B5` (nella prima versione dell'impronta: peso 0, cioè solo conferma);
6. nome file con `PdL`, `Piano di lavoro`, `Gantt` o `Masterplan` (peso 1; regex lasca `(?i)pdl|piano.?di.?lavoro|gantt|masterplan`).

Nome del file: schema `<PROGETTO>_PdL_di_dettaglio_v<maggiore>.<minore>.xlsx`, regex `^[A-Za-z0-9]+_PdL_di_dettaglio_v\d+\.\d+\.xlsx$`.

Oggi nessun codice legge questa impronta: GestioneCelle non riconosce il modello all'importazione (funzione da realizzare, sezione 6).

## 3. Mappa degli oggetti

| Zona | Dove | Contenuto |
|---|---|---|
| Margine | riga 1, colonna A | vuoti |
| Anni | riga 2 | celle unite per 12 mesi (`K2:V2`, `W2:AH2`, `AI2:AT2`) con l'anno; i mesi iniziali prima del primo anno pieno (`H2:J2`) sono uniti ma **senza anno** |
| Trimestri | riga 3 | `Q4`, `Q1`, `Q2`… celle unite per 3 mesi, sfondo grigio `F2F2F2` |
| Intestazioni | riga 4 | `LIV 1` · `Work Package` · `LIV 2` · `Work Package` · `Owner` · `Note` nelle colonne B-G, poi **le iniziali italiane dei mesi** (`O N D G F M A M G L A S …`) una per colonna, da H in poi; sfondo grigio chiaro su tutta la riga |
| Timeline | colonne H → AT | 39 colonne mensili (ott 2026 → dic 2029), larghezza ≈ 4,5 |
| Righe "work package" (livello 1) | B = codice (`1.0`, `2`, …), C = nome | D-G vuote; barra **scura** per tutto l'arco del WP |
| Righe "fase" (livello 2) | B = `=B<riga sopra>` (copia il codice), C = nome WP ripetuto (testo o `=C<riga sopra>`), D = codice `N.N` (testo), E = nome fase, F = owner, G = note | barra **chiara** della stessa famiglia di colore del WP |

Ordine delle righe: un blocco per work package = 1 riga di livello 1 + le sue fasi. Nessuna riga vuota tra i blocchi. Un blocco "Garanzia" ha solo la riga di livello 1 (barra dopo il go-live, 24 mesi).

### Vocabolario standard delle fasi (livello 2)

Ogni work package "verticale" ripete le stesse 8 fasi, con durate e scostamenti fissi rispetto all'inizio del WP:

| # | Fase | Inizio (mesi dall'inizio del WP) | Durata (mesi) |
|---|---|---|---|
| 1 | Design e Prototipazione | 0 | 2 |
| 2 | Analisi Funzionale | 0 | 5 |
| 3 | Sviluppo Applicativo | +2 | 13 (12 nel WP che parte dopo) |
| 4 | UAT & Stress Test | +13 | 2 |
| 5 | VA/PT e Monitoraggio post pubblicazione Versione Beta Soluzione | +13 | 2 |
| 6 | Implementazione soluzione su data center/infrastruttura del cliente | +13 | 2 |
| 7 | Go Live e Messa in esercizio | +15 | 1 |
| 8 | MAD/MAC/MEV/HD | +15 | fino alla fine del contratto (12 o 9) |

Il primo work package ("componenti trasversali") è diverso: fasi tecniche (assessment, design system, IAM, API gateway, pagamenti, interoperabilità, SPOC) tutte di 4 mesi all'avvio, con il supporto SPOC che riprende per tutto il periodo di esercizio.

### Stili e layout (per riprodurlo uguale)

- **Carattere**: Calibri 11 ovunque (tema "minor"). Grassetto: intestazioni, righe di livello 1, nomi delle fasi (E) e owner (F). Intestazioni della timeline (mesi e trimestri) in **grassetto corsivo**.
- **Colore del testo**: nero; nelle righe di livello 2 le colonne B e C (codice e nome WP ripetuti) sono in **grigio** (tema 0, tinta −0,5) per lasciarle in secondo piano.
- **Riempimenti** (colori del tema, non RGB fissi):
  - livello 1: tema 9 / 4 / 5 con tinta **+0,40** (scuro);
  - livello 2: stesso tema con tinta **+0,80** (chiaro); la garanzia usa il tema 6 chiaro;
  - colonna D (codice fase) sempre `F2F2F2`; riga 3 `F2F2F2`; riga 4 tema 0 tinta −0,15; riga 2 tema 2 tinta −0,10 e tema 0 tinta −0,35.
- **Bordi**: `hair` dentro la griglia, `thin` sul contorno dei blocchi (32 combinazioni di bordo nel file: è il risultato di "tutti i bordi" + "bordo esterno spesso").
- **Allineamento**: tutto centrato in verticale con testo a capo; centrato in orizzontale tranne i nomi (C, E) a sinistra.
- **Formati numero**: `General`; `0.0` sui codici di livello 1 scritti come numero (fa vedere `2` come `2.0` per allinearlo a `1.0` scritto come testo).
- **Righe**: altezza 29 (43,5 dove il nome va su due righe). **Colonne**: B 12 · C 41 (41,4) · D 12 · E 38 (37,8) · F 17 (16,9) · G 25 (25,4) · mesi ≈ 4,5.
- **Vista**: griglia nascosta, zoom **40 %** (vista d'insieme "da stampa"), blocco riquadri (nel file visto: `F16`, probabilmente un residuo: la posizione sensata è `H5`).
- Niente tabelle Excel, formati condizionali, convalide, nomi definiti, macro. Stampa: A4 verticale, nessuna area di stampa.
- Metadati: creato nel 2015 da un modello precedente, salvato con Excel 365 su SharePoint (parti `customXml` con il content type della raccolta: sono innocue e si possono ignorare o conservare).

### Caratteristiche Excel usate

| Caratteristica | Come è usata |
|---|---|
| Celle unite | Anni (12 colonne) e trimestri (3 colonne) in intestazione |
| Riempimenti a tema con tinta | Barre del Gantt e gerarchia visiva (scuro = WP, chiaro = fase); famiglie di colore per distinguere i WP |
| Formule di propagazione `=B5`, `=C22`, `=+B5` | Ripetere codice e nome del WP nelle righe delle fasi (54 formule; alcune saltano una riga) |
| Bordi hair/thin | Griglia e contorno dei blocchi |
| Testo a capo + altezze fisse | Nomi lunghi su due righe |
| Zoom 40 % + griglia nascosta | Vista d'insieme "da stampa" |
| Blocco riquadri | Mantenere colonne/righe fisse scorrendo (posizionato male) |
| Formato `0.0` | Far vedere `2` come `2.0` per allinearlo a `1.0` scritto come testo |

### Convenzioni di denominazione

- Codici: livello 1 `N` o `N.0`; livello 2 `N.N` (testo). Nel file visto i codici di livello 2 **non** seguono quelli di livello 1 (vedi le anomalie nella sezione 7): la convenzione attesa è `LIV2 = LIV1.k`.
- Owner: sigla del fornitore (`SIGLA` o `SIGLA/SIGLA` quando sono due).
- Nomi delle fasi: come nel vocabolario sopra, spesso con uno **spazio finale** (da pulire con TRIM).
- Nome file: `<PROGETTO>_PdL_di_dettaglio_v<major>.<minor>.xlsx`; versioni successive = nuovo file, non storico interno.

## 4. Parti fisse e parti variabili

**Fisse**: le tre righe di intestazione (anni uniti da 12, trimestri uniti da 3, intestazioni fisse B-G + iniziali dei mesi da H); la struttura a blocchi (riga di livello 1 + fasi); le famiglie di colore (scuro = WP, chiaro = fase); il vocabolario delle 8 fasi standard con durate e scostamenti; bordi, carattere, zoom.

**Variabili**: nome del progetto (nome del file); orizzonte temporale (mese iniziale, numero di mesi, anni); numero e nomi dei work package; fasi di ogni WP (il primo WP, trasversale, ha fasi diverse); owner; note; posizione e lunghezza delle barre; il blocco "Garanzia" dopo il go-live.

Parti ripetibili: il blocco work package (1 riga di livello 1 + le sue fasi); dentro il blocco, le 8 fasi standard.

Non ci sono segnaposto: le celle vuote (owner, note) sono semplicemente vuote.

## 5. Regole di modifica, aggiunta ed eliminazione

- **Aggiungere una fase**: inserire una riga dentro il blocco del WP; in B e C mettere le formule `=B<riga sopra>` / `=C<riga sopra>` (non valori fissi); in D il codice `LIV1.k` come testo con sfondo `F2F2F2`; disegnare la barra con il riempimento chiaro della famiglia del WP. Attenzione: nel file visto alcune formule saltano una riga (`B11=B9`, `B20=B18`, `B29=B27`, `B48=B46`, `B12=+B5`): oggi danno il risultato giusto, ma inserendo una riga si rompono. Vanno rese regolari prima.
- **Aggiungere un work package**: un blocco nuovo subito dopo l'ultimo, senza righe vuote; codice di livello 1 `N` (meglio tutto dello stesso tipo: o testo `N.0` o numero con formato `0.0`); barra scura per tutto l'arco; fasi standard con gli scostamenti del vocabolario.
- **Eliminare una fase o un WP**: togliere le righe e rinumerare i codici di livello 2 (`LIV1.k`); controllare le formule delle righe sotto.
- **Estendere l'orizzonte**: aggiungere colonne mensili con l'iniziale del mese in riga 4, allargare o aggiungere le celle unite dei trimestri (3) e degli anni (12), tenere la larghezza ≈ 4,5.
- **Spostare o allungare una barra**: cambiare il riempimento delle celle (non ci sono date né formule da aggiornare); le fasi UAT, VA/PT e implementazione vanno insieme negli stessi 2 mesi.
- **Pulizia**: TRIM sugli spazi finali di nomi e owner; anno anche sul primo gruppo di mesi (`H2:J2`); blocco riquadri su `H5`.
- Nessun totale e nessuna formula di calcolo da tenere aggiornata.

## 6. Funzioni consigliate dell'app

Funzioni di GestioneCelle esistenti (nomi come in `docs/GESTIONECELLE.md`):

- **Importa Excel** su una mappa vuota, come foglio generico scegliendo le colonne: LIV 1 = macro, "Work Package" (colonna E, il nome della fase) = processo, Owner come testo nelle note; i codici di livello 1 `1.0`/`6.0` passano come 1 e 6. Barre, celle unite e stili non vengono letti.
- **Processi** e **Tabella** per navigare e filtrare; **Modifica** (predecessore, successore, sotto-voce, sposta, elimina, codici a cascata) per riordinare.
- Scadenze, responsabile (utente del portale), stato e **Note del team** nella scheda di ogni voce; **Storico**; cestino.
- **Scarica Excel** / **Salva nel progetto**: oggi scrivono solo nella forma del file BPB, non in questa.
- Esplora file del portale per archiviare il `.xlsx` originale nella cartella del progetto (versioni, cestino).

Da realizzare (funzioni proposte dall'analisi, nell'ordine d'uso quando arriva un file così):

1. *Riconosci modello* → "Piano di lavoro (Gantt mensile)" (con l'impronta della sezione 2).
2. *Leggi piano* → work package, fasi, owner, note, barre con inizio/fine (e segmenti, se la barra si interrompe), dall'asse dei mesi delle tre righe di intestazione.
3. *Controlla piano* → elenco delle anomalie (sezione 7) con cella e proposta di correzione: codici, duplicati, tipi misti, nomi ripetuti, barre non contigue, owner mancanti, spazi, formule di propagazione.
4. *Normalizza* (TRIM, codici coerenti, tipi uniformi, formule regolari) se l'utente approva.
5. Lavoro nel portale: albero/Gantt, scadenze in Home, note del team; per ogni voce un **periodo** (inizio-fine) e un **owner testuale** (fornitore).
6. *Applica fasi standard* a un work package; *sposta / allunga / accorcia* barre e work package per mesi; *estendi o riduci l'orizzonte* temporale.
7. *Esporta piano* con lo stesso aspetto (intestazione a tre righe, famiglie di colore, bordi, larghezze, zoom), oppure *salva nel file originale* conservando tutto ciò che non si tocca.
8. *Confronta* con la versione precedente del piano (cosa è cambiato: barre, nomi, owner).
9. *Esporta il Gantt verso MPoint* (slide Masterplan del kick-off).

## 7. Stato dell'app su questo template

**GestioneCelle sa fare** (versione 0.8.0 al momento dell'analisi; 0.9.0 ha aggiunto la scheda Modifica con predecessore/successore):

- Aprire il `.xlsx` senza librerie (`app/src/celle/xlsx-read.js`): valori delle celle, stringhe condivise, tabelle Excel.
- Importare un foglio generico scegliendo le colonne (`import.js`, `importGeneric`): qui funzionerebbe con LIV 1 = macro, "Work Package" (E) = processo, Owner come testo nelle note; i codici di livello 1 `1.0`/`6.0` passano come 1 e 6.
- Albero con codici automatici, controlli dei duplicati, scadenza singola, responsabile (utente del portale), storico, cestino, note del team.
- Scrivere un `.xlsx` con stili, formule, formati condizionali, convalide e tabelle (`xlsx-write.js`), ma solo nella forma del file BPB.

**Non sa fare (manca)**:

- Leggere **riempimenti, celle unite, larghezze, altezze, blocco riquadri, caratteri, bordi**: oggi le barre del Gantt sono invisibili all'importazione.
- Capire l'**asse dei mesi** dalle tre righe di intestazione e trasformare le barre in **inizio / fine / durata**.
- Tenere per ogni voce un **periodo** (inizio-fine) e un **owner testuale** (fornitore), non solo una scadenza e un utente.
- I controlli del piano (anomalie 1-12 qui sotto).
- Le operazioni "da Super Excel": rinumerare, normalizzare, applicare le fasi standard, spostare/allungare barre, estendere l'orizzonte, confrontare due versioni.
- Riscrivere il file **con lo stesso aspetto** (intestazione a tre righe, famiglie di colore, bordi, zoom) o, meglio, **modificare il file originale conservando tutto ciò che non si tocca**.
- Riconoscere il modello all'arrivo del file e proporre le funzioni giuste.

Nessuna misura di tempo o punteggio è stata riportata.

### Anomalie trovate nel file visto (sono i controlli che l'app dovrà fare da sola)

| # | Anomalia | Dove |
|---|---|---|
| 1 | Codici di livello 2 non coerenti con il livello 1 (WP `2` ha fasi `5.x`, WP `3` → `2.x`, WP `4` → `3.x`, WP `5` → `4.x`) | D14-D49 |
| 2 | Codice di livello 1 duplicato (`4` sia per un WP sia per "Garanzia") | B31, B40 |
| 3 | Tipi misti nei codici di livello 1: `1.0` e `6.0` testo, `2`…`5` numeri formattati `0.0` | colonna B |
| 4 | Nome del WP ripetuto sbagliato: le fasi dell'ultimo WP riportano il nome di un altro WP (copia-incolla) | C51-C58 |
| 5 | Formule di propagazione che saltano una riga (`B11=B9`, `B20=B18`, `B29=B27`, `B48=B46`, `B12=+B5`): risultato giusto oggi, sbagliato appena si inserisce una riga | colonna B |
| 6 | Ultimo WP senza formule (valori fissi) a differenza degli altri | B51-C58 |
| 7 | Barra non contigua: una fase di supporto si interrompe per 7 mesi e riprende (da chiedere se è voluto) | riga 12 |
| 8 | Owner mancante in due fasi; colonna Note sempre vuota | F6, F12, G |
| 9 | Spazi finali in molti nomi e owner | C, E, F |
| 10 | Primo gruppo di mesi senza l'anno in riga 2 | H2:J2 |
| 11 | Blocco riquadri su `F16` invece che sull'angolo della timeline | vista |
| 12 | Tre fasi (UAT, VA/PT, implementazione) sempre sovrapposte negli stessi 2 mesi: forse voluto, ma il piano non lo dice | righe 17-19 e analoghe |

## 8. Dubbi aperti

- Anomalia 7: la barra di supporto interrotta per 7 mesi è voluta?
- Anomalia 12: la sovrapposizione fissa di UAT, VA/PT e implementazione è una regola del fornitore o una semplificazione?
- Il blocco riquadri su `F16` è un residuo (atteso `H5`)?
- Il primo gruppo di mesi (`H2:J2`) senza anno è una dimenticanza?
- Come Owner compaiono solo TXT, Deda Next e Webgenesys; il kick-off dello stesso progetto mostra anche i loghi di HSPI e RPC Net; il Piano Operativo dell'AQ elenca 18 aziende tra cui HSPI e RPCNET ma non TXT, Deda Next e Webgenesys. Vedi `../CONFLITTI.md`, voce 1.
- Il piano arriva a dicembre 2029 (39 mesi, con la garanzia di 24 mesi dopo il go-live); il masterplan del kick-off si ferma a dicembre 2028 e il Piano Operativo limita ogni servizio a 24 mesi: come si conciliano? Vedi `../fascicoli/fascicolo-aq-id2610.md`.
- Il fascicolo dell'AQ chiama questo file "Piano di Lavoro Generale e di obiettivo" (nome del prodotto dell'Appendice 3): è davvero quel deliverable o un piano interno?

## 9. Da classificare

- Dalla prima versione (commit `0fe8189`, `docs/MODELLI-FILE/`): la cartella aveva un indice con le regole "qui stanno struttura, stili, convenzioni e regole dei modelli, mai dati aziendali (nomi di persone, percorsi SharePoint, contenuti dei progetti)" e tre passi per aggiungere un modello (studiare il file e scrivere la scheda; aggiungere l'impronta e la riga nell'indice; dire sempre cosa l'app sa già fare e cosa manca). In `modelli.json` c'era anche l'impronta del modello **BPB dei processi** (`excel-bpb-processi`): tabelle Excel `tblMacro`, `tblProcessi`, `tblBPB` e foglio "Anagrafica Processi BPB", un punto ciascuno, punteggio minimo 3; funzioni: importa BPB (già in GestioneCelle, `app/src/celle/import.js`), scarica Excel / salva nel progetto (già, `xlsx-write.js`). Quell'impronta non è stata riportata in `docs/MEMORIA` (il BPB è descritto in `docs/GESTIONECELLE.md`); i segnali sono ora nella riga "bpb-processi" di `../README.md`.
- Nella prima versione il segnale "assenza di tabelle Excel, formati condizionali, convalide, nomi definiti" aveva peso 0 (solo conferma); nell'impronta attuale compare nella lista `stile.assenti` e non tra i segnali pesati.
- Il file ha 32 combinazioni di bordo diverse.

## 10. Fonti

- `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, commit `0fe8189` (`docs/MODELLI-FILE/README.md`, `excel-piano-di-lavoro-gantt.md`, `modelli.json`): prima versione della scheda, impronta con i pesi, funzioni consigliate dettagliate, impronta BPB.
- `cool-noether`, commit `8314b5a` (`docs/MEMORIA/xlsx/piano-di-lavoro-txt-biosiris.md` e `.impronta.json`, righe in `docs/MEMORIA/README.md`): scheda definitiva (file visti, struttura, vocabolario delle fasi, stili, convenzioni, segnali, caratteristiche, anomalie, stato di GestioneCelle, funzioni da usare), impronta con `fasiStandard`, `stile`, `anomalieTipiche`, `sinergie`, `gestioneCelle.funzioniProposte`, paragrafo "cosa confronta l'impronta dei .xlsx".
- `docs/GESTIONECELLE.md` (versione 0.9.0, integrazione): nomi reali delle funzioni di GestioneCelle; `app/src/celle/import.js`, `xlsx-read.js`, `xlsx-write.js`: funzioni del codice citate.
- `admiring-hopper`, commit `fff10ab` (`../pptx/kickoff-txt-biosiris.md`): masterplan 2026-10 → 2028-12 e partner del raggruppamento; `cool-noether`, commit `74c4dad` (`../fascicoli/fascicolo-aq-id2610.md`, `../docx/kit-aq-id2610.conoscenza.json`): catena dei documenti, aziende del RTI, limite dei 24 mesi.
