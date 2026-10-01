# Modello: Piano di lavoro di dettaglio (Gantt mensile a due livelli) — Excel

Id: `excel-piano-di-lavoro-gantt` · App: **GestioneCelle** · Prima scheda: 2026-10-01 (file `…_PdL_di_dettaglio_v0.4.xlsx`, "PdL" = Piano di Lavoro).

## 1. Che cos'è

Il piano di lavoro di un progetto pluriennale, in un solo foglio: a sinistra la **WBS a due livelli** (work package → fasi), a destra una **timeline per mesi** su cui le attività sono disegnate come **barre colorate**. Serve a mostrare al cliente e al team chi fa cosa e quando; è il "masterplan" che poi finisce anche nelle presentazioni (slide Masterplan del kick-off).

È un file **disegnato, non calcolato**: non ci sono date, durate o formule che generino le barre. Le barre sono il colore di sfondo delle celle, messo a mano. Le uniche formule (54) copiano il codice e il nome del work package dalla riga sopra.

## 2. Struttura

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

## 3. Stili e layout (per riprodurlo uguale)

- **Carattere**: Calibri 11 ovunque (tema "minor"). Grassetto: intestazioni, righe di livello 1, nomi delle fasi (E) e owner (F). Intestazioni della timeline in **grassetto corsivo**.
- **Colore del testo**: nero; nelle righe di livello 2 le colonne B e C (codice e nome WP ripetuti) sono in **grigio** (tema 0, tinta −0,5) per lasciarle in secondo piano.
- **Riempimenti** (colori del tema, non RGB fissi):
  - livello 1: tema 9 / 4 / 5 con tinta **+0,40** (scuro);
  - livello 2: stesso tema con tinta **+0,80** (chiaro); la garanzia usa il tema 6 chiaro;
  - colonna D (codice fase) sempre `F2F2F2`; riga 3 `F2F2F2`; riga 4 tema 0 tinta −0,15; riga 2 tema 2 tinta −0,10 e tema 0 tinta −0,35.
- **Bordi**: `hair` dentro la griglia, `thin` sul contorno dei blocchi (32 combinazioni di bordo nel file: è il risultato di "tutti i bordi" + "bordo esterno spesso").
- **Allineamento**: tutto centrato in verticale con testo a capo; centrato in orizzontale tranne i nomi (C, E) a sinistra.
- **Formati numero**: `General`; `0.0` sui codici di livello 1 scritti come numero.
- **Righe**: altezza 29 (43,5 dove il nome va su due righe). **Colonne**: B 12 · C 41 · D 12 · E 38 · F 17 · G 25 · mesi ≈ 4,5.
- **Vista**: griglia nascosta, zoom **40 %**, blocco riquadri (nel file visto: `F16`, probabilmente un residuo: la posizione sensata è `H5`).
- Niente tabelle Excel, formati condizionali, convalide, nomi definiti, macro. Stampa: A4 verticale, nessuna area di stampa.
- Metadati: creato nel 2015 da un modello precedente, salvato con Excel 365 su SharePoint (parti `customXml` con il content type della raccolta: sono innocue e si possono ignorare o conservare).

## 4. Convenzioni di denominazione

- Codici: livello 1 `N` o `N.0`; livello 2 `N.N` (testo). Nel file visto i codici di livello 2 **non** seguono quelli di livello 1 (vedi anomalie): la convenzione attesa è `LIV2 = LIV1.k`.
- Owner: sigla del fornitore (`SIGLA` o `SIGLA/SIGLA` quando sono due).
- Nomi delle fasi: come nel vocabolario sopra, spesso con uno **spazio finale** (da pulire con TRIM).
- Nome file: `<PROGETTO>_PdL_di_dettaglio_v<major>.<minor>.xlsx`; versioni successive = nuovo file, non storico interno.

## 5. Segnali per riconoscere il modello

1. Un foglio chiamato `Piano di lavoro` (o simile), uno solo.
2. Nelle prime 6 righe una riga con `LIV 1`, `Work Package`, `LIV 2`, `Work Package`, `Owner`, `Note` seguiti da ≥ 12 celle con una sola lettera presa da `G F M A M G L A S O N D`.
3. Sopra: una riga con `Q1…Q4` in celle unite da 3, e una con anni in celle unite da 12.
4. Nelle colonne dei mesi: celle **senza valore ma con riempimento pieno** (le barre).
5. Assenza di tabelle, convalide, formati condizionali; formule solo del tipo `=B5` / `=C22` / `=+B5`.
6. Nome file con `PdL`, `Piano di lavoro`, `Gantt` o `Masterplan`.

Impronta in `modelli.json` (`punteggio_minimo` 4).

## 6. Funzioni e caratteristiche trovate nel file

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

## 7. Anomalie trovate (sono i controlli che l'app dovrà fare da sola)

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

## 8. Che cosa sa già fare GestioneCelle su questo file e che cosa manca

**Sa fare**

- Aprire il `.xlsx` senza librerie (`app/src/celle/xlsx-read.js`): valori delle celle, stringhe condivise, tabelle Excel.
- Importare un foglio generico scegliendo le colonne (`import.js`, `importGeneric`): qui funzionerebbe con LIV 1 = macro, "Work Package" (E) = processo, Owner come testo nelle note; i codici di livello 1 `1.0`/`6.0` passano come 1 e 6.
- Albero con codici automatici, controlli dei duplicati, scadenza singola, responsabile (utente del portale), storico, cestino, note del team.
- Scrivere un `.xlsx` con stili, formule, formati condizionali, convalide e tabelle (`xlsx-write.js`), ma solo nella forma del file BPB.

**Non sa fare (manca)**

- Leggere **riempimenti, celle unite, larghezze, altezze, blocco riquadri, caratteri, bordi**: oggi le barre del Gantt sono invisibili all'importazione.
- Capire l'**asse dei mesi** dalle tre righe di intestazione e trasformare le barre in **inizio / fine / durata**.
- Tenere per ogni voce un **periodo** (inizio-fine) e un **owner testuale** (fornitore), non solo una scadenza e un utente.
- I controlli del piano (anomalie 1-12).
- Le operazioni "da Super Excel": rinumerare, normalizzare, applicare le fasi standard, spostare/allungare barre, estendere l'orizzonte, confrontare due versioni.
- Riscrivere il file **con lo stesso aspetto** (intestazione a tre righe, famiglie di colore, bordi, zoom) o, meglio, **modificare il file originale conservando tutto ciò che non si tocca**.
- Riconoscere il modello all'arrivo del file e proporre le funzioni giuste.

## 9. Funzioni dell'app da usare quando arriva un file così (una volta sviluppate)

1. *Riconosci modello* → "Piano di lavoro (Gantt mensile)".
2. *Leggi piano* → work package, fasi, owner, note, barre con inizio/fine.
3. *Controlla piano* → elenco delle anomalie con cella e proposta di correzione.
4. *Normalizza* (TRIM, codici coerenti, tipi uniformi, formule regolari) se l'utente approva.
5. Lavoro nel portale: albero/Gantt, scadenze in Home, note del team.
6. *Esporta piano* con lo stesso aspetto, oppure *salva nel file originale* conservando il resto.
7. *Confronta* con la versione precedente del piano (cosa è cambiato: barre, nomi, owner).
