# Cippi — presentazioni del team

Cippi è l'app del portale per le presentazioni PowerPoint, come i documenti di chiusura progetto con i flussi To-Be. Si apre dal menu del portale, da **App e programmi** oppure all'indirizzo `/cippi/`. Si può installare come app del browser o scaricare sul PC con HSPI Client (vedi `docs/APP.md`).

Cippi fa quattro cose:

1. **Legge** una presentazione e ne ricostruisce la struttura.
2. **Aiuta a rivederla**: punti chiave, domande, controlli, confronto To-Be / As-Is.
3. **La modifica**: testi, ordine, slide duplicate o tolte. Poi la riesporta in `.pptx` con la stessa grafica.
4. **Ne fa un modello**, da cui si creano presentazioni nuove e con cui si misura quanto un documento è completo.

## Come legge una presentazione

Il metodo viene da come il team studia questi documenti: dagli appunti di studio sul flusso acquisti To-Be e dalla presentazione di chiusura progetto da cui nascono.

1. **Prima il contesto**: obiettivi, ambito, risultati.
2. **Poi legenda e sigle**: il significato dei colori e dei simboli, il glossario (CDR, DCAP, PBC, ...).
3. **Poi la mappa dei processi**, il Business Process Breakdown.
4. **Poi ogni processo, passo per passo**: chi fa cosa, cosa si decide, con quale sistema, dove rimanda, cosa dicono le note.
5. **Infine il confronto To-Be / As-Is** dello stesso processo, che nel Back Up ha lo stesso codice.

Questo è il **Percorso di lettura** che Cippi propone nel pannello strumenti.

Per ogni slide Cippi riconosce:

| Cosa | Come |
|---|---|
| **Tipo di slide** | copertina, titolo, indice, divisore di sezione, testo, legenda, flusso, mappa dei processi, scheda, tabella, schema, chiusura |
| **Titolo** | il segnaposto del titolo, altrimenti il testo più grande in alto. Le etichette delle corsie non contano. |
| **Blocchi in ordine di lettura** | a righe dall'alto, dentro la riga da sinistra a destra |
| **Gerarchia** | livello 0 titolo; 1 sottotitolo o intestazione; 2 paragrafo, elenco, tabella; 3 note ed etichette. I punti elenco tengono il loro livello di rientro. |
| **Sezioni** | dai divisori, abbinati alle voci dell'indice per somiglianza |

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
  - flussi senza legenda.

Il **punteggio** (%) riassume quanti controlli non passano rispetto al numero di slide.

## Modalità Revisione

Tre pannelli; sul telefono uno alla volta, con le schede in alto.

**Pannello strumenti**:
- Revisione / Modifica.
- Cosa mostrare: ordine di lettura e gerarchia, step nuovi e modificati, note dello speaker.
- La struttura per sezioni; in Modifica anche sposta, duplica e togli.
- Percorso di lettura, controlli, glossario (il significato delle sigle si scrive qui e vale per tutto il progetto), appunti, confronto con un modello.

Lo stile è un "PowerPoint futuristico": pannelli di vetro, accento arancio-rosso di PowerPoint, elementi compatti.

**Pannello visione**:
- La slide disegnata nel browser con forme, frecce (anche a gomito e ruotate, seguite come in PowerPoint), testi, immagini e tabelle, senza aprire PowerPoint. Ogni elemento si clicca e apre le sue caratteristiche.
- I blocchi numerati nell'ordine di lettura, colorati per livello; gli step nuovi (verde) e modificati (giallo).
- **Confronta con l'As-Is**: le due slide affiancate e l'elenco delle differenze.
- La striscia delle miniature. Le frecce ← → della tastiera scorrono le slide.

- Sotto l'anteprima, i **punti chiave**: della slide o di tutto il documento (punti chiave, note, domande, cose da fare, con la spunta "fatto").

**Pannello descrizione della slide** (a destra):
- Nei flussi, in ordine: i **protagonisti** (le corsie: quante attività, decisioni, sistemi) e poi la **struttura della slide**: gli step in ordine con forma (▭ attività, ◇ decisione), stato, protagonista, sistemi, uscite delle decisioni. Poi rimandi (si salta al processo citato), note del flusso, il processo con il collegamento a GestioneCelle.
- Nelle altre slide, i blocchi nell'ordine di lettura con il loro livello. In **Modifica** i testi si correggono qui: una riga per paragrafo, due spazi all'inizio per scendere di un livello di elenco.
- In fondo il **contesto del documento**.

**Finestra delle caratteristiche** (si apre cliccando uno step, un protagonista, un blocco o il processo; stile impostazioni, scura):
- *Generale*: testo; **forma** (per esempio il rettangolo che diventa rombo: l'attività diventa una decisione); **stato** rispetto all'As-Is (nuovo, modificato, invariato: il colore segue la legenda della presentazione); protagonista. Forma, colore e testo cambiano anche nel `.pptx`.
- *Tecnologia*: i sistemi disegnati accanto allo step (si possono rinominare) e le altre tecnologie o transazioni.
- *Collegamenti*: da dove arriva e dove va, con le etichette Si/No e le scritte sulle frecce; si passa da uno step all'altro.
- *Descrizione*: descrizione, input, output, responsabile, tempi, criticità, note. Restano in Cippi e valgono anche per le versioni successive.
- *Processo*: codice, parti, protagonisti, sistemi, novità rispetto all'As-Is, e obiettivo e descrizione del processo.
- *Contesto*: lo sfondo generale del documento (cliente, progetto, obiettivi, perimetro). Se manca si scrive qui; Cippi ne propone uno dalle prime slide.

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
| Documenti, punti, glossario, contesto, caratteristiche | database: `cippi_docs` (con `background`), `cippi_points`, `cippi_glossary`, `cippi_items` (migrazioni 9 e 10) |

**Permessi:** vede e modifica un documento chi vede il progetto. Lo elimina chi l'ha creato o un Manager del progetto. I file nella cartella del progetto restano.

## Limiti di questa versione (0.1)

- Legge solo `.pptx`. I vecchi `.ppt` vanno salvati come `.pptx` da PowerPoint.
- L'anteprima è fedele nella disposizione, nei colori e nei testi, ma non è PowerPoint:
  - le immagini EMF/WMF compaiono come riquadri;
  - le frecce a gomito sono semplificate;
  - i caratteri sono quelli del PC.
- In Modifica si cambiano i testi delle forme e l'ordine delle slide. Il testo modificato prende lo stile del paragrafo che sostituisce, ma i grassetti dentro una frase vanno rifatti in PowerPoint. Tabelle e flussi si cambiano in PowerPoint.
- Gli appunti (PDF, Word) si archiviano e si aprono, ma Cippi non li legge.

## Proposte per le prossime versioni

- **Motore locale** (HSPI Client): anteprime identiche a PowerPoint generate sul PC dell'utente, e lettura degli appunti PDF.
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
| `PATCH /api/cippi/docs/:id` | `{name, description, status, shared, background, slides: [{src, texts: {idForma: [righe]}, geom: {idForma: forma}, fill: {idForma: colore}, note}], updatedAt}`. Il 409 avvisa se qualcun altro ha salvato nel frattempo. |
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
| `PUT /api/cippi/docs/:id/items` | `{key, data: {descrizione, tecnologia, input, output, responsabile, tempi, criticita, obiettivo, note}}`: caratteristiche di un elemento; la chiave è stabile tra le versioni (`nodo\|<codice processo>\|<variante>\|<testo dello step>`, `attore\|<nome>`, `processo\|<codice>\|<variante>`, `blocco\|<titolo slide>\|<testo>`). Dati vuoti = elimina |

**Codice:**

| File | Cosa fa |
|---|---|
| `app/src/cippi/pptx-read.js` | lettura del `.pptx` |
| `app/src/cippi/analyze.js` | struttura, flussi, controlli, modello |
| `app/src/cippi/pptx-write.js` | esportazione |
| `app/src/cippi/pptx-new.js` | presentazione base e presentazioni di prova |
| `app/src/routes/cippi.js` | API |
| `app/public/cippi/` | interfaccia |

**Prove:**

- `app/test/cippi.test.js`;
- `app/test/browser/cippi.ui.js`.

Usano una presentazione inventata (`app/test/pptx-prova.js`): nessun file di un cliente sta nel repository.
