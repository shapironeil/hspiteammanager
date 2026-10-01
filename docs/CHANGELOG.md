# Novità di ogni versione

La versione del portale sta in `version.json` (unica fonte) e compare nella pagina di accesso ("v0.10.0 beta") e in Sistema. Ogni app del catalogo ha la sua versione in `app/catalogo/<id>/app.json` e le sue novità in **App e programmi → Novità**.

## 0.12.0 — 1 ottobre 2026
- **MPoint 0.4.0, schermata iniziale nuova**: all'apertura prima i **file recenti** (gli ultimi aperti dalla persona, poi gli ultimi aggiornati nel team), poi le **cartelle dei progetti** (quanti documenti, modelli, PowerPoint ancora da importare, ultimo aggiornamento), poi i modelli; ricerca per nome. La **cartella di un progetto** si apre dentro MPoint: i suoi documenti, i PowerPoint presenti nella cartella del progetto (caricati in Esplora file: si importano con un clic; già importati: si aprono) e i modelli, con il collegamento alla cartella in Esplora file. Migrazione 12 (`cippi_recenti`: ultima apertura di ogni documento per persona).

## 0.11.0 — 1 ottobre 2026
- **Cippi si chiama MPoint** (MPoint 0.3.0): pagina `/mpoint/`, i vecchi collegamenti `/cippi/` portano lì. I nomi interni (cartella `app/src/cippi`, rotte `/api/cippi`, tabelle `cippi_*`) restano: non si vedono.
- **Le app non stanno più nel menu laterale** del portale: MPoint, GestioneCelle e Verbale Studio si aprono da **App e programmi**, ognuna nel suo ambiente. In alto a sinistra di ogni app c'è il **bottone che richiama il menu del portale** (Home, Progetti, Esplora file, App e programmi, …, Profilo, Esci) per tornare al portale o cambiare schermata; sostituisce il collegamento "← Portale". Le voci del menu stanno in `app/public/js/nav.js`, condivise dal portale e dalle app (`app/public/js/menu-app.js`).
- GestioneCelle 0.9.1 e Verbale Studio 1.0.1: solo il bottone del menu.

## 0.10.1 — 1 ottobre 2026
- Cippi: le schede archiviate in `docs/MEMORIA/_archivio/` non contano più come modelli noti (il kick-off compariva due volte in "Somiglia a").

## 0.10.0 — 1 ottobre 2026 (integrazione del lavoro di quattro agenti)

Porta in `main` tutto il lavoro rimasto sui rami (dettagli e diagnosi in `docs/REPORT/2026-10-01-integrazione.md`).

**Portale**
- `docs/MEMORIA/`: memoria unica dei file analizzati (template noti, impronte, funzioni delle app da usare), con l'indice e le vecchie schede archiviate.
- `docs/REGOLE-AGENTI.md`: dove si salvano le analisi, rami e pull request, cosa vuol dire "fatto", nota di fine lavoro.
- Questo changelog.

**GestioneCelle 0.9.0** (dal ramo `claude/verbale-studio-portale`, pull request #3)
- Stile proprio "Excel glass": vetro bianco e verde, un tocco di nero, controlli come su iPhone, tabelle come un foglio.
- La vista Albero si chiama Processi (i vecchi collegamenti funzionano).
- Scheda **Modifica**: tabella di riferimento a sinistra (righe numerate, filtro per livello, frecce), caratteristiche a destra; predecessore, successore, sotto-voce, sposta, elimina; codici ricalcolati a cascata ed evidenziati con il codice di prima.

**Cippi 0.2.0** (unione del ramo `claude/verbale-studio-portale` e del ramo `claude/admiring-hopper-dc5bp0`)
- Stile PowerPoint a vetro, elementi più compatti; punti chiave sotto l'anteprima; a destra la **descrizione della slide** (protagonisti, struttura degli step, rimandi, note, processo) e la **finestra delle caratteristiche** (testo, forma, stato nuovo/modificato, tecnologia, collegamenti, descrizione, processo, contesto del documento); forma, colore e testi finiscono nel `.pptx`.
- Lettura più precisa dei flussi: frecce a gomito e ruotate, etichette Sì/No completate, scritte sulle frecce collegate.
- **Sezioni** lette da quelle di PowerPoint; indice a due livelli senza falsi avvisi; copertina, schede e masterplan riconosciuti.
- **Pillole** (testo sopra una forma colorata) come intestazioni; **tabelle disegnate con le forme** lette come tabelle; tabelle vere con celle unite, stile e controllo "il totale torna".
- **Masterplan**: il Gantt incollato come immagine SVG diventa un piano con componenti, attività e periodi.
- Anteprima con loghi e numero del layout, tabelle con lo stile, forme personalizzate, testo ridotto come in PowerPoint.
- **Trova e sostituisci** in tutto il documento (anche piè di pagina e layout); celle e righe nuove nelle tabelle.
- Sezione **Documento**: autori, azienda, ultime modifiche, caratteri; **modelli noti** riconosciuti dalla memoria (`docs/MEMORIA`).
- Glossario della pubblica amministrazione preimpostato; esportazione pulita (niente immagini orfane).

**Memoria dei file analizzati** (rami `claude/admiring-hopper-dc5bp0`, `claude/cool-noether-kv3o8c`, `claude/awesome-cray-8lgn1k`)
- Kick-off di progetto (PowerPoint), piano di lavoro a Gantt (Excel), kit Word dell'Accordo Quadro Consip ID 2610 (piano operativo, appendici, nomina responsabile), fascicolo SAL (presentazione e verbale), fascicolo dell'AQ.

## 0.9.0 — 1 ottobre 2026
- GestioneCelle "Excel glass" con scheda Modifica; Cippi in stile PowerPoint vetro con descrizione della slide e finestra delle caratteristiche (ramo `claude/verbale-studio-portale`; entrato in `main` con la 0.10.0).

## 0.8.1 — 1 ottobre 2026
- Catalogo delle app, GestioneCelle, Cippi 0.1.0, menu laterale dinamico (pull request #2).

## 0.8.0 — 1 ottobre 2026
- Cippi, app per le presentazioni PowerPoint: lettura della struttura, modalità Revisione, modifica, modelli, esportazione.

## 0.7.0 — 1 ottobre 2026
- Catalogo delle app (Verbale Studio, GestioneCelle) con versioni proprie e download con HSPI Client; Trama diventa GestioneCelle; pagine informative con il logo del portale.

## 0.6.0 — 1 ottobre 2026
- Esplora file, Verbale Studio nel portale, Trama, ruoli, backup e aggiornamento sicuro, HSPI Client (pull request #1).

## 0.5.0 — 1 ottobre 2026
- App installabile (PWA), guida telefono e Tailscale, controllo "dal PC del portale" sicuro dietro proxy.

## 0.4.0 — 30 settembre 2026
- Archivio unico nei progetti, importazione una tantum, aggiornamento che allinea la cartella.

## 0.3.x — 30 settembre 2026
- Progetti, web app da apptools, tema chiaro/scuro, guida, caricamento su GitHub; gruppi del menu apribili, pulsante Aggiorna.

## 0.2.0 — 30 settembre 2026
- Registrazione, nome utente automatico, sfondi dinamici, avatar.

## 0.1.x — 30 settembre 2026
- Portale v0.1: login con ruoli, programmi, file, log e pannello admin; Node.js portatile; avvio solo locale.
