# Template `sal-presentazione` — presentazione di stato avanzamento lavori (SAL) di un progetto PA (PowerPoint)

## 1. Identità

| Voce | Valore |
|---|---|
| Nome del template | `sal-presentazione` (nome dato dall'analisi originale; fuori dalla convenzione `<tipo>-<fornitore>-<progetto>`: vedi `../CONFLITTI.md`, voce 3) |
| Formato | `.pptx` (PowerPoint, 16:9 "Widescreen") |
| Tipo di documento | scheletro di presentazione per gli incontri di **stato avanzamento lavori (SAL)** |
| App di riferimento | **Cippi** |
| Fornitore / progetto | un RTI (raggruppamento di imprese, non nominato nel file) per conto di un'Amministrazione regionale; progetto **R-CAP.AC**, finanziato dal PN "Capacità per la Coesione 2021-2027" (Priorità 1 – Azione 1.1.4). Fa coppia con il verbale `../docx/sal-verbale.md` (fascicolo SAL) |
| File visti | `2026.02.23_Template_Presentazione_Sal_V1.00.pptx`: 183 KB, 5 slide, 13 parole; creato il 05/05/2025, ultima modifica 08/04/2026. Nessun contenuto reale: è lo scheletro |
| Analizzato | 01/10/2026 con Cippi 0.1.0 (portale 0.8.1) |

Cinque slide quasi vuote ("Titolo", "Agenda", "Testo"): il valore sta nei **master e layout** con il brand (loghi, stemma, colori, carattere) e nella struttura attesa: copertina → agenda numerata → slide di contenuto → slide con immagine.

Il file originale non sta nel repository: resta nella cartella del progetto (Esplora file) sul PC del portale.

**Provenienza**: agente `awesome-cray`, sessione `session_01WbrSz86BeYisrNNoJc7Eh5`, ramo `claude/awesome-cray-8lgn1k`, commit `51e11c0`, analisi del 01/10/2026. Scheda originale `docs/memoria/modelli/sal-presentazione.md` e voce `sal-presentazione` di `docs/memoria/modelli.json`, archiviate in `../_archivio/2026-10-01/awesome-cray/memoria/`. Unificata il 01/10/2026 sul ramo `claude/integrazione-2026-10-01`.

## 2. Impronta di riconoscimento

Impronta leggibile da un programma: `sal-presentazione.impronta.json` (creata nell'unificazione dalla voce di `modelli.json`, con tutti i campi originali più quelli letti da `app/src/cippi/impronta.js`). Segnali forti, in ordine:

1. nome del file `AAAA.MM.GG_Template_Presentazione_Sal_Vn.nn.pptx` (data, "Template", oggetto, versione con la V maiuscola; regex `^\d{4}\.\d{2}\.\d{2}_Template_Presentazione_Sal_V\d+\.\d+\.pptx$`);
2. **4 master** e **24 layout**, molti doppioni ("Titolo e contenuto" ×3, "Diapositiva titolo" ×2, "Layout personalizzato" ×3);
3. layout con testo fisso: "Diapositiva titolo" e "1_Diapositiva titolo" contengono i titoli del programma e la sigla **"R-CAP.AC"** ("Capacità per la Coesione 2021-2027");
4. carattere **Titillium Web** ovunque (titoli, testi, data, numero); il tema dichiara Aptos / Aptos Display ma è sovrascritto;
5. colori: blu brand **164194** (barra in basso, data, numero slide, sottotitolo della copertina), blu dei titoli **2F5496**, tema Office 2023 (accent1 156082);
6. immagini riconoscibili dalle dimensioni: `image2.png` 2146×136 striscia dei loghi; `image3.jpeg` 612×612 trinacria in bianco e nero; `image1.jpeg` 128×128 sfondo piastrellato con alpha 0 (invisibile);
7. slide tipiche nell'ordine: copertina, indice, testo, immagine, immagine;
8. metadati: 1 sezione "Sezione predefinita", `changesInfos` presente, customXml SharePoint, etichetta MIP rimossa.

Formato: 12192000 × 6858000 EMU (33,87 × 19,05 cm).

Attenzione: il confronto di Cippi (`impronta.js`) guarda colori e caratteri del tema, layout principale, piè di pagina, sezioni native, nomi di forme e azienda. Per questo template il tema è quello standard di Office e non c'è piè di pagina: i segnali forti (immagini per dimensione, layout con testo fisso, carattere usato nelle slide) oggi non vengono confrontati. Vedi `../CONFLITTI.md`, voce 4.

## 3. Mappa degli oggetti

| # | Layout (master) | Contenuto | Note |
|---|---|---|---|
| 1 | Diapositiva titolo (master 4) | Sottotitolo = titolo dell'incontro ("Titolo"); data "26/02/2026" bianca, corsivo, 12 pt in basso a sinistra | Il layout porta: striscia loghi in alto al centro, barra blu 164194 piena larghezza in basso, trinacria grande a destra (metà slide, in sovrimpressione), i due blocchi fissi "Programma Nazionale / Capacità per la Coesione 2021-2027 / Priorità 1 – Azione 1.1.4" e "PROGETTO RAFFORZAMENTO … 'R-CAP.AC'". La data è un segnaposto `dt` con idx orfano (4294967295): testo fisso, non si aggiorna da solo |
| 2 | Titolo e contenuto (master 1) | "Agenda" + elenco **numerato automatico** (`buAutoNum arabicPeriod`) "Titolo 1 / Titolo 2", grassetto 2F5496 | Titolo ed elenco sono **caselle di testo libere, non segnaposto**. Un rettangolo senza riempimento con bordo accent1 (19050 EMU) evidenzia la prima voce: è l'**indicatore della sezione corrente** da spostare sulle slide agenda ripetute |
| 3 | Titolo e contenuto (master 1) | Segnaposto titolo "Titolo", contenuto "Testo", numero slide | Slide di contenuto standard |
| 4 | 1_Layout personalizzato (master 2) | Titolo + **segnaposto immagine** (idx 11, metà destra a tutta altezza) + contenuto (idx 12) | Immagine a destra, testo a sinistra, vuoti |
| 5 | Layout personalizzato (master 2) | Contenuto (idx 1) + titolo + segnaposto immagine (idx 11) | Variante della 4 |

Master e layout:

- **Master 1** (contenuto): striscia loghi in basso al centro (posizione 4084187, 6492874; dimensioni 4023626×252000 EMU), data e numero slide in 164194 Titillium 12 pt, titolo 28 pt, corpo 20/18/16 pt.
- **Master 4** (copertina): barra blu in basso, data e numero in bianco, titolo 32 pt, trinacria.
- **Master 3** (layout 15, solo titolo con trinacria doppia) non è usato da nessuna slide.
- 18 layout su 24 non sono usati: il file è nato unendo più presentazioni.

Convenzioni:

- Agenda = elenco numerato; ogni voce corrisponde a una sezione della presentazione; l'agenda si ripete con l'indicatore spostato.
- Titoli in Titillium Web grassetto 2F5496; corpo in Titillium Web; data in formato `gg/mm/aaaa`.
- Numero slide in basso a destra (segnaposto `sldNum` idx 4, dimensione quarter), data in basso a sinistra.
- Lo stile tabella predefinito del file è "Stile medio 2 - Colore 1" (`{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}`): non ci sono tabelle, grafici o note.
- Nome del file: `AAAA.MM.GG_<Cosa>_<Tipo>_vN.NN.<ext>` (convenzione della famiglia SAL; qui con la V maiuscola).

## 4. Parti fisse e parti variabili

**Fisse** (nei master e nei layout): striscia dei loghi (Coesione Italia 21-27 Sicilia, UE "Cofinanziato dall'Unione europea", Repubblica Italiana, Regione Siciliana), stemma regionale (trinacria), barra blu 164194, blocchi di testo del programma e del progetto "R-CAP.AC", carattere Titillium Web, numero slide e data nei master.

**Variabili**: titolo dell'incontro (sottotitolo della copertina), data della copertina (testo fisso da cambiare a mano), voci dell'agenda e posizione dell'indicatore della sezione corrente, slide di contenuto (titolo + testo) e slide con immagine (titolo + immagine + testo), ripetibili quante volte serve.

Segnaposto del file: "Titolo", "Agenda", "Titolo 1 / Titolo 2", "Testo"; i segnaposto immagine delle slide 4 e 5 sono vuoti.

## 5. Regole di modifica, aggiunta ed eliminazione

- **Aggiungere una slide di contenuto**: duplicare la slide 3 ("Titolo e contenuto"); per una slide con immagine duplicare la 4 o la 5.
- **Agenda**: aggiungere una voce all'elenco numerato (la numerazione è automatica) e, nelle agende ripetute, spostare il rettangolo-indicatore sulla voce corrente. Agenda e titolo della slide 2 non sono segnaposto: Cippi li trova con la regola "testo più grande in alto".
- **Data della copertina**: è testo fisso in un segnaposto `dt` con idx orfano; va cambiata a mano (o con Trova e sostituisci: da verificare, vedi sezione 8).
- **Layout**: una funzione di pulizia dei 18 layout non usati deve conservare i layout 1, 13, 14, 16.
- `ppt/changesInfos/` è presente: l'esportazione di Cippi lo toglie già.
- L'immagine di sfondo invisibile (alpha 0) va ignorata nell'anteprima.
- Master, layout, tema e immagini restano quelli originali nel file esportato da Cippi.

## 6. Funzioni consigliate dell'app

Funzioni di Cippi esistenti (nomi come in `docs/CIPPI.md`; l'analisi originale le chiamava `importa`, `analisi`, `salva-come-modello`, `modifica-testi`, `duplica-slide`, `esporta`):

- **Importa PowerPoint** → modalità **Revisione**: tipi di slide (copertina, indice, testo, immagine), struttura, **Controlli**.
- **Salva come modello** per la ricetta (parti nell'ordine, blocchi, sezioni, colori e caratteri); poi **Nuovo da modello** per il SAL successivo.
- **Modifica**: testi e ordine; dal pannello Struttura **duplica** la slide "Titolo e contenuto" per aggiungerne altre.
- **Trova e sostituisci** per titoli e scritte ripetute (per la data della copertina: da verificare).
- **Scarica** il `.pptx` oppure **Salva versione** nella cartella del progetto.

Da realizzare (dalla proposta del 1° ottobre 2026 dell'analisi originale; nomi originali tra parentesi):

- **Registra modello aziendale** (`registra-modello-aziendale`): conservare master e layout veri, non solo la ricetta;
- slide nuove da un layout del file (`slide-da-layout`);
- agenda con numerazione e indicatore della sezione automatici (`agenda-automatica`);
- immagini dentro i segnaposto immagine (`immagine-nel-segnaposto`);
- tabelle (`tabelle`): il file non ne ha; Cippi 0.2.0 legge e modifica le tabelle esistenti ma non ne crea di nuove;
- generazione del SAL da dati (`genera-sal-da-dati`): lo stesso oggetto "SAL" del verbale Word (vedi `../fascicoli/fascicolo-sal.md`);
- aggiornamento della data in copertina (`data-copertina`);
- pulizia dei layout non usati (`pulizia-layout`) conservando 1, 13, 14, 16;
- controlli sui segnaposto non compilati (`controllo-segnaposto`).

## 7. Stato dell'app su questo template

Misurato con **Cippi 0.1.0** (portale 0.8.1), senza punteggio riportato:

- Cippi trova agenda e titolo della slide 2 con la regola "testo più grande in alto" (non sono segnaposto).
- L'esportazione toglie già `ppt/changesInfos/`.
- L'immagine di sfondo invisibile (alpha 0) compare nell'anteprima e va ignorata.
- Mancano le funzioni elencate in "Da realizzare" nella sezione 6.

Dopo l'analisi, lo stesso giorno, è uscito **Cippi 0.2.0** (ramo `claude/admiring-hopper-dc5bp0`): sezioni native, tabelle vere e disegnate con celle e **Aggiungi riga**, **Trova e sostituisci** anche nei layout, pannello **Documento** con i modelli noti. Su questo file non è stato rimisurato: la lista "mancanti" va riverificata (in particolare `tabelle` e `data-copertina`).

Riconoscimento con l'impronta: non misurato; con il confronto attuale il template è debole (vedi sezione 2).

## 8. Dubbi aperti

- Quale dei due caratteri del tema è il "maggiore": la scheda originale dice solo "Aptos / Aptos Display"; nell'impronta è scritto l'ordine standard di Office 2023 (titoli Aptos Display, corpo Aptos), da verificare sul file.
- Il tema è quello standard di Office 2023: con il confronto attuale di Cippi qualunque presentazione italiana con tema standard e layout "Titolo e contenuto" può somigliare a questo template. Serve pesare immagini, layout con testo fisso e carattere usato (`../CONFLITTI.md`, voce 4).
- **Trova e sostituisci** cambia anche il testo fisso della data nel segnaposto `dt` orfano? Da provare.
- Questo SAL appartiene allo stesso Accordo Quadro Consip ID 2610 degli altri documenti in memoria? L'analisi originale non lo dice; il fascicolo AQ lo dà per scontato (`../CONFLITTI.md`, voce 1).
- La proposta del 1° ottobre 2026 citata dall'analisi originale non è nel repository.
- Il nome `sal-presentazione` non segue la convenzione dei template (`../CONFLITTI.md`, voce 3).

## 9. Da classificare

- Regole generali della memoria scritte dall'analisi originale (`docs/memoria/README.md`): niente dati aziendali nelle schede (struttura e convenzioni, mai i contenuti dei documenti compilati; i nomi delle persone trovati nei file non vengono riportati; i nomi di programma o di ente servono solo a riconoscere il modello); i file originali non stanno nel repository; ogni scheda ha la stessa forma (sintesi, impronta, struttura, stili, convenzioni, quirk, funzioni dell'app da usare, cose mancanti); `modelli.json` ripete le impronte in forma leggibile da un programma per il riconoscimento automatico dentro Cippi e Verbale Studio. Ora valgono le regole di `../README.md`.
- Come riconoscere un file nuovo (dall'analisi originale): 1) guardare il nome del file; 2) confrontare l'impronta: caratteri, colori, immagini (dimensioni), nomi dei layout, titoli di capitolo; 3) se corrisponde applicare le funzioni della scheda, se corrisponde in parte segnalare le differenze invece di tirare a indovinare.
- Voce di `modelli.json`: `"fascicolo": "sal"`; `"scheda": "docs/memoria/modelli/sal-presentazione.md"` (percorso vecchio, conservato nell'impronta sotto `provenienza`).
- Nota del file `modelli.json`: "Impronte dei modelli di file conosciuti. Nessun dato aziendale: solo struttura, stili e segni di riconoscimento."

## 10. Fonti

- `awesome-cray`, sessione `session_01WbrSz86BeYisrNNoJc7Eh5`, commit `51e11c0`, `docs/memoria/modelli/sal-presentazione.md`: sintesi, impronta, struttura delle slide, master, convenzioni, quirk, funzioni di Cippi da usare, cosa manca.
- `awesome-cray`, commit `51e11c0`, `docs/memoria/modelli.json` (voce `sal-presentazione`): regex del nome del file, formato, master/layout, layout con testo, carattere, colori, immagini con dimensioni, slide tipiche, elenchi `funzioni` e `mancanti`.
- `awesome-cray`, commit `51e11c0`, `docs/memoria/README.md` e `docs/memoria/fascicolo-sal.md`: regole della memoria, convenzione del nome del file, contesto comune (progetto, programma, RTI, identità visiva).
- `docs/CIPPI.md` e `docs/REPORT/2026-10-01-cippi-kickoff.md` (admiring-hopper, `fff10ab`): nomi reali delle funzioni e novità di Cippi 0.2.0; `app/src/cippi/impronta.js`: cosa confronta il riconoscimento.
- Versioni al momento dell'analisi (Cippi 0.1.0, portale 0.8.1): dal commit `8b07add`, base del ramo `claude/awesome-cray-8lgn1k`.
