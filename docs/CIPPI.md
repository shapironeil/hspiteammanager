# Cippi — presentazioni del team

Cippi è l'app del portale per le presentazioni PowerPoint, come i documenti di chiusura progetto con i flussi To-Be. Si apre dal menu del portale, da **App e programmi** oppure all'indirizzo `/cippi/`. Si può installare come app del browser o scaricare sul PC con HSPI Client (vedi `docs/APP.md`).

Cippi fa cinque cose:

1. **Legge** una presentazione e ne ricostruisce la struttura.
2. **Aiuta a rivederla**: punti chiave, domande, controlli, confronto To-Be / As-Is.
3. **La modifica**: testi, ordine, slide duplicate o tolte. Poi la riesporta in `.pptx` con la stessa grafica.
4. **Ne fa un modello**, da cui si creano presentazioni nuove e con cui si misura quanto un documento è completo.
5. **Lavora per funzioni** (v0.2): slide nuove dai layout del modello, agenda con l'indicatore della sezione, immagini, tabelle, data, pulizia dei layout e la **presentazione SAL** generata dai dati. Riconosce i **modelli noti** della memoria del team.

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

**Pannello visione**:
- La slide disegnata nel browser con forme, frecce, testi, immagini e tabelle, senza aprire PowerPoint.
- I blocchi numerati nell'ordine di lettura, colorati per livello; gli step nuovi (verde) e modificati (giallo).
- **Confronta con l'As-Is**: le due slide affiancate e l'elenco delle differenze.
- La striscia delle miniature. Le frecce ← → della tastiera scorrono le slide.

**Pannello punti chiave**:
- I punti della slide (o di tutto il documento): punti chiave, note, domande, cose da fare, con la spunta "fatto".
- La **struttura della slide** (blocchi e livelli) e, nei flussi, il dettaglio: attori, step con stato e sistemi, uscite delle decisioni, rimandi (si salta al processo citato), note. Se il processo esiste in GestioneCelle con lo stesso nome compare **In GestioneCelle**.
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

## Funzioni (v0.2): per funzioni, non slide per slide

Dal documento aperto, con il pannello **Funzioni** (`#/doc/<id>?funzioni=1`, oppure `CippiFunzioni.open(id)` dal pulsante del pannello strumenti). Ogni funzione produce una **nuova versione** del file nella cartella del progetto (la precedente resta tra le versioni) e Cippi rianalizza.

| Funzione | Cosa fa |
|---|---|
| **Nuova slide** | Da un **layout del modello** (titolo e contenuto, due contenuti, solo titolo, intestazione sezione…): titolo, testo con i livelli, tabella nativa (stile tabella del file), note del relatore, posizione. I segnaposto del layout portano posizioni, caratteri e colori. Se il layout non ha segnaposto, le caselle vanno nelle posizioni standard. |
| **Agenda** | Elenco numerato automatico con il **rettangolo-indicatore** sulla voce corrente. Se il modello ha già una slide "Agenda" la clona (caselle libere, numerazione e indicatore compresi); altrimenti la crea dal layout. Con i **divisori** aggiunge una slide "Intestazione sezione" per voce. |
| **Immagine** | Una slide con l'immagine nel **segnaposto immagine** del layout (o nell'area del contenuto), senza deformarla. |
| **Data** | Scrive la data nei segnaposto data delle slide (la copertina). |
| **Pulizia** | Toglie layout, master, temi e immagini che nessuna slide usa (i modelli nati unendo più presentazioni ne hanno decine). |
| **Togli slide** | Toglie le slide indicate, con le note. |
| **Presentazione SAL** | Dai **dati del SAL** (gli stessi del verbale Word, vedi `WORD.md`) genera dentro il modello: copertina compilata, agenda ripetuta prima di ogni sezione con l'indicatore spostato, sintesi, piano di lavoro a celle con i mesi, una slide per servizio con attività e deliverable, tabella di raccordo, consuntivazione per componente RTI e per attività, fatturazione e prospetto (ritenuta 0,5%, IVA 22%), rischi e prossimi passi. Le slide d'esempio del modello vengono tolte. |

**Modello aziendale**: un `.pptx` si importa direttamente come modello (`Importa` con `modello=1`): restano i suoi master e layout veri, e da lì si creano le slide nuove. I modelli elencano i layout disponibili.

**Modelli noti**: all'importazione Cippi confronta il file con le impronte in `docs/MEMORIA/pptx/` (nome del file, formato, tema, caratteri, layout, testi fissi, immagini del brand). Se corrisponde, il documento dice quale modello è e quali funzioni usare. Oggi conosce la presentazione SAL del progetto R-CAP.AC e il kick-off TXT/BIOSIRIS.

**Controlli nuovi**: segnaposto da compilare ("Titolo", "Testo", "Titolo 1", "[Inserire …]"), voci dell'agenda senza slide.

## Dove stanno le cose

| Cosa | Dove |
|---|---|
| File di partenza di ogni versione | `data/cippi/sorgenti/<impronta>.pptx`: non si perde anche se lo si sposta in Esplora file. Entra nei backup. |
| Analisi (rifatta da sola se cambia il modo di leggere) | `data/cippi/analisi/` |
| Copia, versioni salvate, appunti | cartella del progetto, `Cippi/<nome documento>/` (`Appunti/` per PDF, Word, immagini). I modelli in `Cippi/Modelli/`. |
| Documenti, punti, glossario | database: `cippi_docs`, `cippi_points`, `cippi_glossary` (migrazione 9) |

**Permessi:** vede e modifica un documento chi vede il progetto. Lo elimina chi l'ha creato o un Manager del progetto. I file nella cartella del progetto restano.

## Limiti di questa versione (0.2)

- Legge solo `.pptx`. I vecchi `.ppt` vanno salvati come `.pptx` da PowerPoint.
- L'anteprima è fedele nella disposizione, nei colori e nei testi, ma non è PowerPoint:
  - le immagini EMF/WMF compaiono come riquadri;
  - le frecce a gomito sono semplificate;
  - i caratteri sono quelli del PC.
- In Modifica si cambiano i testi delle forme e l'ordine delle slide. Il testo modificato prende lo stile del paragrafo che sostituisce, ma i grassetti dentro una frase vanno rifatti in PowerPoint. Tabelle e flussi si cambiano in PowerPoint.
- Gli appunti (PDF, Word) si archiviano e si aprono, ma Cippi non li legge.
- Le slide generate dalle funzioni usano i segnaposto del layout: il risultato è fedele al modello in PowerPoint, mentre l'anteprima di Cippi mostra i testi senza i caratteri del layout.
- L'indicatore dell'agenda viene posizionato calcolando l'altezza delle righe (carattere, interlinea): con elenchi molto lunghi può servire un ritocco in PowerPoint.

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
| `PATCH /api/cippi/docs/:id` | `{name, description, status, shared, slides: [{src, texts: {idForma: [righe]}, note}], updatedAt}`. Il 409 avvisa se qualcun altro ha salvato nel frattempo. |
| `DELETE /api/cippi/docs/:id` | elimina |
| `GET /api/cippi/docs/:id/download` | `.pptx` con le modifiche |
| `POST /api/cippi/docs/:id/salva-versione` | salva nella cartella del progetto e rianalizza |
| `POST /api/cippi/docs/:id/modello` | salva come modello |
| `POST /api/cippi/models/:id/nuovo` | `{projectId, name, parts: [{part, count}], vuoto}`: crea da un modello |
| `GET /api/cippi/docs/:id/layouts` | i layout del file (segnaposto, immagine, testi fissi) e le sezioni della presentazione SAL |
| `POST /api/cippi/docs/:id/funzioni` | `{azioni: [{tipo: slide\|agenda\|data\|testi\|compila\|rimuovi\|pulisci, …}]}`: applica le azioni in ordine e salva una nuova versione |
| `PUT /api/cippi/docs/:id/slide-immagine?layout=&title=&body=&at=&name=` | slide con l'immagine (il corpo è l'immagine) |
| `POST /api/cippi/docs/:id/sal` | `{projectId, dati, name, sezioni, ripetiAgenda, divisori, pulisci}`: presentazione SAL nuova, con questo file come modello |
| `PUT /api/cippi/import?projectId=&name=&modello=1` | importa un `.pptx` direttamente come modello aziendale |
| `POST /api/cippi/docs/:id/points` | aggiunge un punto: `{slide, kind: chiave\|nota\|domanda\|da-fare, text}` |
| `PATCH /api/cippi/points/:id` | modifica un punto |
| `DELETE /api/cippi/points/:id` | elimina un punto |
| `PUT /api/cippi/docs/:id/appunti?name=` | appunti nella cartella del documento |
| `PUT /api/cippi/glossario` | `{projectId, term, meaning}` |

**Codice:**

| File | Cosa fa |
|---|---|
| `app/src/cippi/pptx-read.js` | lettura del `.pptx` |
| `app/src/cippi/analyze.js` | struttura, flussi, controlli, modello |
| `app/src/cippi/pptx-write.js` | esportazione |
| `app/src/cippi/pptx-new.js` | presentazione base e presentazioni di prova |
| `app/src/cippi/pptx-build.js` | slide nuove dai layout, agenda, immagini, tabelle, data, pulizia, note |
| `app/src/cippi/sal-deck.js` | la presentazione SAL dai dati (`app/src/sal.js`) |
| `app/src/modelli.js` | riconoscimento dei modelli noti (`docs/MEMORIA`) |
| `app/public/cippi/funzioni.js` | pannello Funzioni (modulo a sé) |
| `app/src/routes/cippi.js` | API |
| `app/public/cippi/` | interfaccia |

**Prove:**

- `app/test/cippi.test.js`;
- `app/test/browser/cippi.ui.js`.

Usano una presentazione inventata (`app/test/pptx-prova.js`): nessun file di un cliente sta nel repository.
