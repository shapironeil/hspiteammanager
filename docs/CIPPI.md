# Cippi — presentazioni del team

Cippi è l'app del portale per le presentazioni PowerPoint, come i documenti di chiusura progetto con i flussi To-Be. Si apre dal menu del portale, da **App e programmi** oppure all'indirizzo `/cippi/`. Si può installare come app del browser o scaricare sul PC con HSPI Client (vedi `docs/APP.md`).

Cippi fa sei cose:

1. **Legge** una presentazione e ne ricostruisce la struttura.
2. **Aiuta a rivederla**: punti chiave, domande, controlli, confronto To-Be / As-Is.
3. **La modifica**: testi, ordine, slide duplicate o tolte. Poi la riesporta in `.pptx` con la stessa grafica.
4. **Ne fa un modello**, da cui si creano presentazioni nuove e con cui si misura quanto un documento è completo.
5. **Riconosce i modelli noti** della memoria del team (`docs/MEMORIA`) e produce l'impronta di quelli nuovi.
6. **Legge i PDF** accanto al documento e confronta il PDF esportato con la presentazione, pagina per slide.

## Come legge una presentazione

Il metodo viene da come il team studia questi documenti: dagli appunti di studio sul flusso acquisti To-Be e dalla presentazione di chiusura progetto da cui nascono.

1. **Prima il contesto**: obiettivi, ambito, risultati.
2. **Poi legenda e sigle**: il significato dei colori e dei simboli, il glossario (CDR, DCAP, PBC, ...).
3. **Poi la mappa dei processi**, il Business Process Breakdown.
4. **Poi ogni processo, passo per passo**: chi fa cosa, cosa si decide, con quale sistema, dove rimanda, cosa dicono le note.
5. **Infine il confronto To-Be / As-Is** dello stesso processo, che nel Back Up ha lo stesso codice.

Questo è il **Percorso di lettura** che Cippi propone nel pannello strumenti.

Il secondo modo di leggere viene dai **kick-off e dalle offerte** (il kick-off Data Platform per ATAC e l'offerta ERP Governance, vedi `docs/MEMORIA/pptx/`): copertina con la data, indice numerato le cui voci sono i titoli delle slide, contesto e obiettivi, approccio, **piano** (Gantt disegnato con le forme), **team** (organigramma), punti di attenzione, **numeri in evidenza**, **tabelle disegnate con le forme**; nelle offerte, le sezioni native di PowerPoint (`Intro`, `End`, `Back up`), il blocco aziendale riusato e le referenze. Il percorso di lettura aggiunge "Piano e milestone", "Team e ruoli", "Numeri e tabelle".

Per ogni slide Cippi riconosce:

| Cosa | Come |
|---|---|
| **Tipo di slide** | copertina, titolo, indice, divisore di sezione, testo, legenda, flusso, mappa dei processi, scheda, tabella, schema, piano, organigramma, numeri, immagine, chiusura |
| **Titolo** | il segnaposto del titolo, altrimenti la forma chiamata "Title"/"Titolo" in alto, altrimenti il testo più grande in alto. Le etichette delle corsie non contano. |
| **Copertina** | dal nome del layout (copertina, Title Slide, Diapositiva titolo) oppure prima slide con una grande immagine e la data |
| **Indice** | la parola "Indice" (titolo o scritta) con un elenco; le voci numerate perdono il numero |
| **Piano** | una riga di mesi, trimestri o anni (APR, MAG…, Q1, 2026) |
| **Organigramma** | riquadri colorati con un ruolo, collegati da linee, con i nomi accanto |
| **Numeri** | almeno due numeri grandi (≥ 30 pt); nei punti chiave ogni numero con la sua etichetta |
| **Tabella disegnata con le forme** | caselle di testo allineate in colonne e righe (almeno 3 × 3): intestazione, righe, intestazioni di riga. Nel pannello della slide compare come tabella vera |
| **Blocchi in ordine di lettura** | a righe dall'alto, dentro la riga da sinistra a destra |
| **Gerarchia** | livello 0 titolo; 1 sottotitolo o intestazione; 2 paragrafo, elenco, tabella; 3 note ed etichette. I punti elenco tengono il loro livello di rientro. |
| **Sezioni** | le **sezioni native di PowerPoint** se ci sono; altrimenti i **capitoli dell'indice** (ogni voce abbinata alla slide con il titolo più vicino, le slide seguenti restano nel capitolo); altrimenti i divisori, abbinati alle voci dell'indice per somiglianza |
| **Tema e caratteri** | il tema del master usato da ogni slide (una presentazione può averne più d'uno), i caratteri usati slide per slide |
| **Note** | le note dello speaker con il solo numero della slide (le lascia PowerPoint) contano come vuote |

Nei **flussi a corsie** riconosce:

| Cosa | Come |
|---|---|
| **Corsie (attori)** | i rettangoli stretti a sinistra |
| **Step** | testo che inizia con "N." |
| **Decisioni** | i rombi. Le uscite Si/No vengono dalle etichette vicine alle frecce. |
| **Inizio e fine** | START e END |
| **Sistemi** | SAP, Archiflow (i cilindri), associati allo step vicino |
| **Rimandi ad altri processi** | testo che inizia con un codice, per esempio "4.1.2.2 Emissione …" |
| **Connettori A/B** | i cerchi con una lettera |
| **Note** | i riquadri gialli tratteggiati o a fumetto |
| **Collegamenti** | dalle frecce, cioè dalle forme di partenza e di arrivo dei connettori |
| **Nuovo / modificato** | dal colore dello step confrontato con la **legenda della presentazione stessa**: verde = nuovo nel To-Be, giallo = modificato rispetto all'As-Is |

Le forme copiate due volte una sopra l'altra contano una volta sola.

Dall'insieme della presentazione ricava inoltre:

- i **processi**, unendo le parti (1/3, 2/3, 3/3);
- il **confronto To-Be / As-Is**: step in più, step in meno, attori diversi;
- il **glossario**: le sigle, e il loro significato quando il testo lo dice ("CDR (Centro di Responsabilità)");
- i **punti chiave**: le frasi in grassetto, le note dei flussi, il riepilogo di ogni processo, le novità del To-Be;
- i **controlli**, cioè le cose da sistemare:
  - voci dell'indice senza slide;
  - parti mancanti (2/3 senza 3/3);
  - numeri di step ripetuti o saltati;
  - decisioni con una sola uscita o senza Si/No;
  - step non collegati;
  - corsie vuote;
  - rimandi a processi che non sono nella presentazione;
  - slide senza titolo o nascoste;
  - flussi senza legenda;
  - **voce dell'indice con un refuso** nel titolo della slide ("Quick Win KPI" ↔ "QUICK WIN KIP") o senza slide;
  - **testi segnaposto da compilare** (xxxxxx, TBD, [inserire…], 0+, 0K);
  - **parti mancanti o doppie** nei titoli con "(1/3)" anche fuori dai flussi;
  - **caratteri fuori tema**: non del tema e usati in poche slide (quelli usati quasi ovunque sono la base di fatto).

Il **punteggio** (%) riassume quanti controlli non passano rispetto al numero di slide.

## Modalità Revisione

Tre pannelli; sul telefono uno alla volta, con le schede in alto.

**Pannello strumenti**:
- Revisione / Modifica.
- Cosa mostrare: ordine di lettura e gerarchia, step nuovi e modificati, note dello speaker.
- La struttura per sezioni; in Modifica anche sposta, duplica e togli.
- Percorso di lettura, controlli, glossario (il significato delle sigle si scrive qui e vale per tutto il progetto), appunti, confronto con un modello.
- **Appunti**: i file accanto al documento e i PDF con lo stesso nome nella cartella del progetto (l'esportazione). Su un PDF, **Confronta** lo legge e lo confronta con la presentazione pagina per slide: dice se corrisponde (stesse pagine, stesso ordine, stessi testi) o se è una versione vecchia (pagine senza slide, slide senza pagina, ordine diverso, testi diversi), con le parole che stanno solo da una parte; sotto, il testo del PDF pagina per pagina.
- **Memoria dei modelli**: il template noto riconosciuto (con i segnali e il punteggio), gli altri candidati, e **Scarica impronta**: il file `.impronta.json` da salvare in `docs/MEMORIA/pptx/` con la sua scheda, così Cippi riconoscerà le prossime presentazioni dello stesso tipo. In alto, accanto al punteggio, il nome del modello riconosciuto.

**Pannello visione**:
- La slide disegnata nel browser con forme, frecce, testi, immagini e tabelle, senza aprire PowerPoint.
- I blocchi numerati nell'ordine di lettura, colorati per livello; gli step nuovi (verde) e modificati (giallo).
- **Confronta con l'As-Is**: le due slide affiancate e l'elenco delle differenze.
- La striscia delle miniature. Le frecce ← → della tastiera scorrono le slide.

**Pannello punti chiave**:
- I punti della slide (o di tutto il documento): punti chiave, note, domande, cose da fare, con la spunta "fatto".
- La **struttura della slide** (blocchi e livelli) e, nei flussi, il dettaglio: attori, step con stato e sistemi, uscite delle decisioni, rimandi (si salta al processo citato), note. Se il processo esiste in GestioneCelle con lo stesso nome compare **In GestioneCelle**. Nelle tabelle disegnate con le forme, la tabella letta (intestazione, righe, intestazioni di riga).
- In **Modifica** i testi dei blocchi si correggono qui: una riga per paragrafo, due spazi all'inizio per scendere di un livello di elenco. L'anteprima si aggiorna subito e le modifiche si salvano da sole.

## Creare, importare, salvare

- **Importa PowerPoint**: dal PC, oppure scegliendo un `.pptx` già nella cartella del progetto.
- **Crea da zero**: una presentazione base con la struttura tipica (titolo, indice, sezione, testo, legenda, flusso a corsie, chiusura), da riscrivere in Modifica.
- **Nuovo da modello**: si scelgono le parti del modello e quante volte ripeterle. Con *Testi come segnaposto*, titoli e paragrafi diventano "Titolo della slide", "Testo del paragrafo"…; flussi e schemi restano come esempio.
- **Scarica**: il `.pptx` con le modifiche. Master, layout, tema, immagini e forme restano quelli originali.
- **Salva versione**: scrive il `.pptx` nella cartella del progetto. La versione precedente resta tra le versioni del file in Esplora file. Il risultato diventa la nuova base del documento e Cippi lo rianalizza.
- **Salva come modello**: conserva la "ricetta" della presentazione: le parti nell'ordine in cui si presentano, i blocchi di ogni slide e dove stanno, le sezioni, la legenda, colori e caratteri.
  - Un modello lo vedono le persone del progetto.
  - Chi l'ha creato (o un Manager del progetto) può **condividerlo con tutti**.

## Dove stanno le cose

| Cosa | Dove |
|---|---|
| File di partenza di ogni versione | `data/cippi/sorgenti/<impronta>.pptx`: non si perde anche se lo si sposta in Esplora file. Entra nei backup. |
| Analisi (rifatta da sola se cambia il modo di leggere) | `data/cippi/analisi/` |
| Copia, versioni salvate, appunti | cartella del progetto, `Cippi/<nome documento>/` (`Appunti/` per PDF, Word, immagini). I modelli in `Cippi/Modelli/`. |
| Documenti, punti, glossario | database: `cippi_docs`, `cippi_points`, `cippi_glossary` (migrazione 9) |

**Permessi:** vede e modifica un documento chi vede il progetto. Lo elimina chi l'ha creato o un Manager del progetto. I file nella cartella del progetto restano.

## Memoria dei modelli

La memoria del team sta in `docs/MEMORIA/` (vedi il suo `README.md`): per ogni file analizzato una scheda e un'impronta. Cippi legge le impronte `*.impronta.json` (anche in `docs/memoria`, stessa cartella su Windows) e, per ogni documento, calcola la sua impronta (tema, caratteri, layout usati, piè di pagina dei layout, sezioni native, tipi di slide, metadati, nome del file) e la confronta: sopra 55/100 il modello è *riconosciuto*, tra 35 e 55 è *simile* (stessa famiglia grafica). I pesi dei segnali sono nel README della memoria. Le impronte scritte a mano dagli altri agenti funzionano se usano le stesse chiavi.

## PDF

Cippi legge i PDF da solo (`app/src/cippi/pdf-read.js`, senza librerie): oggetti diretti e negli object stream, flussi FlateDecode (anche con predittore), caratteri semplici WinAnsi con le Differences e composti Identity-H con la mappa ToUnicode, testi nei Form XObject; per ogni pagina le righe con posizione e dimensione, il titolo, il testo. I PDF cifrati vengono rifiutati; le immagini non si leggono (una tabella incollata come immagine resta un buco). Il confronto con la presentazione (`appunti.js`) abbina ogni pagina alla slide con più parole in comune e lo stesso titolo, nell'ordine attuale del documento.

## Limiti di questa versione (0.2)

- Legge solo `.pptx`. I vecchi `.ppt` vanno salvati come `.pptx` da PowerPoint.
- L'anteprima è fedele nella disposizione, nei colori e nei testi, ma non è PowerPoint:
  - le immagini EMF/WMF compaiono come riquadri;
  - le frecce a gomito sono semplificate;
  - i caratteri sono quelli del PC.
- In Modifica si cambiano i testi delle forme e l'ordine delle slide. Il testo modificato prende lo stile del paragrafo che sostituisce, ma i grassetti dentro una frase vanno rifatti in PowerPoint. Tabelle e flussi si cambiano in PowerPoint.
- Gli appunti in Word si archiviano e si aprono, ma Cippi non li legge; i PDF sì (solo il testo: niente immagini, testi ruotati letti male).
- I refusi nei titoli si vedono solo se il titolo è citato nell'indice ("ELEGGBILI" non viene segnalato).
- Il piano Gantt dà i periodi e le fasi, non ancora le date di inizio e fine delle barre.

## Proposte per le prossime versioni

- **Motore locale** (HSPI Client): anteprime identiche a PowerPoint generate sul PC dell'utente, e OCR delle tabelle incollate come immagini.
- **Dal piano Gantt alle scadenze**: barre, milestone e SAL del piano → scadenze in GestioneCelle; dall'organigramma ai membri del progetto.
- **Tabelle disegnate**: unire le parti (1/3, 2/3, 3/3), esportare in Excel, modificare cella per cella.
- **Da Cippi a GestioneCelle**: creare la mappa macro/processi/micro dai flussi e dalla mappa dei processi della presentazione.
- **Verbale Studio**: i punti chiave di una presentazione come punti di partenza del verbale della riunione in cui la si presenta.

## API

| Metodo e indirizzo | Cosa |
|---|---|
| `GET /api/cippi` | progetti, documenti e modelli visibili |
| `PUT /api/cippi/import?projectId=&name=[&nome=]` | importa un `.pptx` (il corpo è il file) |
| `POST /api/cippi/import-progetto` `{projectId, path}` | importa un `.pptx` della cartella del progetto |
| `GET /api/cippi/file-progetto?projectId=` | `.pptx` presenti nella cartella del progetto |
| `POST /api/cippi/nuovo` `{projectId, name}` | crea da zero |
| `GET /api/cippi/docs/:id[?modello=ID]` | documento, analisi completa, punti, collegamenti a GestioneCelle, appunti, confronto con un modello |
| `GET /api/cippi/docs/:id/slide/:n` | forme della slide di origine n (per l'anteprima) |
| `GET /api/cippi/docs/:id/media?name=ppt/media/…` | immagini |
| `PATCH /api/cippi/docs/:id` | `{name, description, status, shared, slides: [{src, texts: {idForma: [righe]}, note}], updatedAt}`. Il 409 avvisa se qualcun altro ha salvato nel frattempo. |
| `DELETE /api/cippi/docs/:id` | elimina |
| `GET /api/cippi/docs/:id/download` | `.pptx` con le modifiche |
| `POST /api/cippi/docs/:id/salva-versione` | salva nella cartella del progetto e rianalizza |
| `POST /api/cippi/docs/:id/modello` | salva come modello |
| `POST /api/cippi/models/:id/nuovo` | `{projectId, name, parts: [{part, count}], vuoto}`: crea da un modello |
| `POST /api/cippi/docs/:id/points` | aggiunge un punto: `{slide, kind: chiave\|nota\|domanda\|da-fare, text}` |
| `PATCH /api/cippi/points/:id` | modifica un punto |
| `DELETE /api/cippi/points/:id` | elimina un punto |
| `PUT /api/cippi/docs/:id/appunti?name=` | appunti nella cartella del documento |
| `PUT /api/cippi/glossario` | `{projectId, term, meaning}` |
| `GET /api/cippi/memoria` | i modelli noti della memoria (`docs/MEMORIA/**/*.impronta.json`) |
| `GET /api/cippi/docs/:id/impronta` | l'impronta del documento, da salvare in `docs/MEMORIA/pptx/<nome>.impronta.json` |
| `GET /api/cippi/docs/:id/appunti/pdf?name=` oppure `?path=` | testo per pagina di un PDF (negli appunti, o nella cartella del progetto) e confronto con la presentazione nell'ordine attuale |

`GET /api/cippi/docs/:id` restituisce anche `memoria` (modello riconosciuto, candidati, impronta, nome proposto) e `pdfCollegati` (i PDF con lo stesso nome nella cartella del progetto); nell'analisi, `sectionsSource` (`native`, `indice`, `divisori`), `nativeSections`, `fontsUsed`, `masters`, per le tabelle disegnate `slides[].table`, per i piani `slides[].months`, per l'indice `index.matches`.

**Codice:**

| File | Cosa fa |
|---|---|
| `app/src/cippi/pptx-read.js` | lettura del `.pptx` |
| `app/src/cippi/analyze.js` | struttura, flussi, controlli, modello |
| `app/src/cippi/pptx-write.js` | esportazione |
| `app/src/cippi/pptx-new.js` | presentazione base e presentazioni di prova |
| `app/src/cippi/memoria.js` | impronta e riconoscimento dei modelli noti |
| `app/src/cippi/pdf-read.js` | lettura del testo dei PDF |
| `app/src/cippi/appunti.js` | confronto PDF ↔ presentazione |
| `app/src/routes/cippi.js` | API |
| `app/public/cippi/` | interfaccia |

**Prove:**

- `app/test/cippi.test.js`;
- `app/test/browser/cippi.ui.js`.

Usano presentazioni inventate (`app/test/pptx-prova.js`: il documento di processo e un kick-off con i difetti apposta) e un PDF costruito da zero (`app/test/pdf-prova.js`): nessun file di un cliente sta nel repository.
