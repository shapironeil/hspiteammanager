# REPORT — 2026-10-01 — Cippi v0.2.0: presentazioni di kick-off (sezioni native, schede, tabelle, masterplan, modelli noti, trova e sostituisci)

Branch: `claude/admiring-hopper-dc5bp0`. Parte dalla v0.8.1 del portale (`main`). Le modifiche di Cippi pubblicate nel frattempo dall'altro agente nella pull request #3 (v0.9.0) **non sono incluse**: il merge tra i due rami è descritto in fondo.

## Da dove nasce

Dall'analisi del file `BIOSIRIS_Kick-off_v0.9.1.pptx` (scheda in `docs/MEMORIA/pptx/kickoff-txt-biosiris.md`). Cippi lo leggeva in un decimo di secondo ma sbagliava cinque tipi di slide su tredici, vedeva una sola sezione invece di sette, dava sei falsi avvisi (punteggio 77%), non capiva pillole, tabelle disegnate, celle unite e Gantt, e l'anteprima era senza loghi e senza stile delle tabelle.

## Cosa è cambiato

### Lettura (`app/src/cippi/pptx-extra.js`, `gantt-svg.js`, agganci in `pptx-read.js`)

- **Sezioni native** di PowerPoint (`p14:sectionLst`): nome e slide di ogni sezione.
- **Metadati estesi**: azienda, applicazione, parole, caratteri dichiarati, co-autori (`authors.xml`), registro delle revisioni e ultima modifica per slide (`changesInfos`), commenti; **caratteri usati davvero** nelle slide.
- **Tabelle**: celle unite (`gridSpan`, `hMerge`, ...), riempimenti, grassetti, allineamenti, larghezze delle colonne, stile (prima riga, righe a bande).
- **Forme personalizzate** (`custGeom`) come percorso SVG; **testo ridotto** dall'adattamento automatico (`fontScale`).
- **Forme di sfondo** di layout e master (loghi, barre, numero di slide) per ogni slide.
- **Gantt in SVG**: anni, mesi, righe (componenti in maiuscolo, attività), barre → periodo da mese a mese; titoli spezzati su due righe ricomposti; la componente copre il periodo delle sue attività.

### Analisi (`app/src/cippi/struttura.js`, `glossario-pa.js`, agganci in `analyze.js`)

- Piè di pagina, data e numero di slide **non sono più blocchi** di contenuto.
- **Pillole**: testo trasparente sopra una forma colorata = intestazione con quel colore.
- **Tabelle disegnate con le forme** (righe di caselle allineate in colonne, 3×2 o 2×3 almeno) = un blocco tabella con le celle, ognuna legata alla sua forma (quindi modificabile).
- **Tipi nuovi o corretti**: `copertina` (layout "Title Slide" o segnaposto del titolo centrato), `masterplan` (Gantt letto o titolo), `scheda` (riquadri arrotondati con intestazioni).
- **Sezioni**: quelle native se ci sono, altrimenti i divisori come prima.
- **Indice a due livelli**: una voce "trova" la sua slide anche se il titolo è "Ambito - Nome" o le somiglia molto; le sezioni "Copertina/Indice" non danno l'avviso "non presente nell'indice".
- **Controlli nuovi**: il totale di una tabella deve essere la somma delle righe (info se torna, errore se no); caratteri di prova ("Trial", "Demo") e caratteri fuori tema; testo ridotto per entrare nella forma.
- **Glossario**: niente sigle false da parole accentate (FINALITÀ), sigle lunghe se il documento le spiega (BIOSIRIS), voci miste (PagoPA, AppIO, WebGIS), **glossario della PA preimpostato** (`known: true`), con precedenza al glossario del progetto.
- Punti chiave e percorso di lettura: piano di progetto (componenti e periodi), tabelle e numeri.

### Modelli noti (`app/src/cippi/impronta.js`)

- Impronta della presentazione: colori e caratteri del tema, layout principale, piè di pagina, sezioni native, nomi di forme non di serie, azienda.
- Confronto con `docs/MEMORIA/**/*.impronta.json` (la memoria dei file analizzati) e con i modelli salvati in Cippi: punteggio 0..100 e motivi. Il kick-off BIOSIRIS vero e la presentazione di prova risultano "kick-off di progetto" al 78%.

### Modifiche per funzione (`app/src/cippi/pptx-edit.js`, agganci in `pptx-write.js`, `routes/cippi.js`, migrazione 10)

- **Celle delle tabelle** (`cells: { idTabella: { "riga,colonna": righe } }`) e **righe nuove** clonate da una riga esistente (`tableRows`), con lo stile della tabella; la riga del totale resta unita.
- **Trova e sostituisci** `POST /api/cippi/docs/:id/sostituisci`: nelle slide (testi e celle) diventa una modifica dei testi come quelle fatte a mano; nel layout e nel master (piè di pagina, scritte fisse) una regola salvata in `cippi_docs.edits` e applicata all'esportazione. Con `anteprima` conta soltanto.
- **Esportazione pulita**: media non più citati tolti, `Slides` e `Notes` aggiornati. Il file esportato dal kick-off vero passa `validate.py` ("All validations PASSED").
- `ANALYZER` 3 → 5: le analisi salvate si rifanno.

### Interfaccia (`app/public/cippi/render.js`, `main.js`, `cippi.css`)

- Anteprima: forme di sfondo del layout sotto la slide; tabelle con colonne, celle unite, riempimenti, prima riga e bande; forme personalizzate; testo ridotto.
- Strumenti → **Documento**: autore e co-autori, azienda, data e parole, ultime modifiche per slide, caratteri, "Somiglia a: ..." con i motivi e la scheda in memoria.
- **Trova e sostituisci** nella barra del documento.
- Modifica: le tabelle (vere e disegnate) si correggono cella per cella; **Aggiungi riga** nelle tabelle vere.
- Pannello destro: il piano di progetto letto dal Gantt (componenti, attività, periodi); tipo "Masterplan".

### Presentazioni di prova e prove (`app/src/cippi/pptx-new.js`, `app/test/pptx-kickoff-prova.js`, `app/test/cippi.test.js`)

- Il costruttore di presentazioni di prova ha ora sezioni native, immagini (SVG), tabelle con celle unite, forme fisse del layout, tema personalizzato, azienda, caratteri espliciti e adattamento automatico.
- `pptx-kickoff-prova.js`: un kick-off inventato con tutte le caratteristiche sopra (nessun file di un cliente nel repository).
- Due prove nuove: lettura (sezioni, copertina, indice, pillole, tabella disegnata, Gantt, totale giusto e sbagliato, caratteri, glossario, sfondo del layout) e portale (modello noto riconosciuto, sfondo del layout nella slide, trova e sostituisci in slide e layout, celle e righe delle tabelle nel file esportato, nessun media orfano).

## Verifiche fatte

- Sul kick-off vero (solo qui, il file non è nel repository): 13 tipi di slide giusti su 13, 7 sezioni native, **nessun falso avviso**, punteggio 77% → **97%**, glossario con 30 sigle di cui 26 spiegate, masterplan con 6 componenti e 22 attività con i periodi, totale del contratto verificato, modello riconosciuto al 78%.
- Esportazione con riordino, duplicati, cella e riga di tabella, piè di pagina sostituito: `validate.py --original` → **tutte le verifiche passate**; 15 media su 18 (i 3 orfani tolti).
- `node --test --test-concurrency=1 test/cippi.test.js`: **9 su 9**.
- Prova nel browser `test/browser/cippi.ui.js` (desktop e telefono): tutto ok, nessun errore JavaScript.
- Anteprime delle 13 slide disegnate da Cippi (con loghi del layout e tabella con lo stile) controllate a occhio.

## Come verificarlo a mano

1. Cippi → **Importa PowerPoint** con un kick-off. In Strumenti → **Documento** compare "Somiglia a: kick-off di progetto (NN%)" con i motivi.
2. Struttura: le sezioni sono quelle di PowerPoint; la copertina, le schede e il masterplan hanno il loro tipo; Controlli senza avvisi sull'indice.
3. Slide del masterplan: a destra il piano con componenti e periodi. Slide del contratto: Controlli dice "Totale verificato".
4. **Modifica** → slide del contratto: cambia una cella, **Aggiungi riga**; **Trova e sostituisci** "Kick-off" → "SAL 1" con "anche piè di pagina e layout"; **Scarica** e apri il `.pptx`.

## Merge con la pull request #3 (v0.9.0 dell'altro agente)

I due rami toccano gli stessi file di Cippi. Il merge va fatto a mano, con questi punti di attenzione:

| File | Questo ramo | Pull request #3 |
|---|---|---|
| `app/src/db.js` | migrazione 10: colonna `edits` | migrazione 10: `background` e tabella `cippi_items` → tenere entrambe, rinumerare la mia come **11** (vanno in fondo, mai modificate) |
| `app/src/routes/cippi.js` | `ANALYZER = 5`, `cleanSlides` (celle, righe), `cleanEdits`, rotta `sostituisci`, `impronta` ed `edits` nella GET, `background` nella GET della slide | `ANALYZER = 4`, `GEOMS`, `ITEM_FIELDS`, `background`/`items`/`geoms`, rotta `items` → tenere tutto, `ANALYZER = 5` |
| `app/src/cippi/pptx-write.js` | `build(src, slides, edits)`, celle e righe, sostituzioni nei layout, `cleanPackage` | `replaceShapeGeom`, `replaceShapeFill` → entrambe |
| `app/src/cippi/pptx-read.js` | `pptx-extra`, `gantt`, `background`, `sections`, `fontsUsed`, `partsXml` | `connectorPath`, `pts` → entrambe |
| `app/src/cippi/analyze.js` | blocchi, tipi, sezioni, controlli, glossario, percorso | collegamenti e etichette dei flussi → regioni diverse |
| `app/public/cippi/render.js` | sfondo, `tableEl`, `path`, `fontScale`, `cells` | `pts`, `geom`/`fill` per id → entrambe |
| `app/public/cippi/main.js` | `KIND.masterplan`, sezione Documento, Trova e sostituisci, `tableEditor`, `plan`, `cells`/`tableRows` nel salvataggio | pannello Descrizione, finestra delle caratteristiche (riscrittura della parte VISIONE) → riportare i miei pezzi dentro la sua versione |
| `app/catalogo/cippi/app.json` | v0.2.0 | v0.x → unire le novità |
| `docs/CIPPI.md` | paragrafi nuovi | paragrafi nuovi → entrambi |

I moduli nuovi (`pptx-extra.js`, `gantt-svg.js`, `struttura.js`, `glossario-pa.js`, `impronta.js`, `pptx-edit.js`, `test/pptx-kickoff-prova.js`) non creano conflitti.

## Assunzioni e cose aperte

- Le righe nuove delle tabelle si vedono nel file esportato e dopo "Salva versione", non nell'anteprima (l'anteprima mostra le celle modificate).
- Il Gantt si legge solo se è un'immagine SVG con i testi (come lo esportano PowerPoint ed Excel); un PNG resta un'immagine.
- L'impronta della memoria si legge da `docs/MEMORIA` accanto alla cartella `app` (il repository): sull'host va bene; se un giorno la cartella dei documenti si sposta, basta cambiare il percorso in `impronta.js`.
