# REPORT — 2026-10-01 — Memoria dei file: kick-off ATAC Data Platform, offerta ERP Governance, PDF esportato (Cippi 0.3.0)

Ramo: `claude/ecstatic-planck-q9m57v`, commit `981931f` (lavoro sulla base v0.8.1) e il commit di unione con `origin/main` v0.10.0 (`78ad5e7`). Pull request: **non aperta** (il proprietario non l'ha chiesta in questa sessione; il flusso automatico non ha il permesso su GitHub): va aperta a mano da `claude/ecstatic-planck-q9m57v` verso `main`.

## Unione con main v0.10.0 (fatta dopo il primo push)

`main` nel frattempo aveva preso Cippi 0.2.0 di `admiring-hopper` (sezioni native, pillole, tabelle disegnate, masterplan dal Gantt SVG, modelli noti con `impronta.js`, trova e sostituisci) e la memoria unificata a 10 sezioni. Nell'unione ho **tenuto la versione di `main`** come base e riportato sopra solo ciò che mancava:

- riconoscimento dei modelli noti: resta `impronta.js` di `main` (motore unico); il mio `memoria.js` si riduce all'impronta completa da scaricare (`GET /api/cippi/docs/:id/impronta`) e al nome proposto del template; l'impronta scaricata ha i campi che `impronta.js` legge più quelli chiesti in `CONFLITTI.md` voce 4 (testi fissi dei layout, caratteri usati);
- tabelle disegnate con le forme: resta `struttura.js` di `main` (celle modificabili); la mia lettura a griglia è stata tolta, ma il tipo "tabella" scatta anche per le tabelle disegnate che sono il contenuto principale della slide;
- "piano" disegnato con le forme → confluito nel tipo `masterplan` di `main` (riga dei mesi come segnale in più, periodi nei punti chiave);
- caratteri fuori tema: resta il controllo di `main`; i caratteri per slide restano nel lettore (`slides[].fonts`);
- `ANALYZER` → 7 (era 6 su `main`); Cippi `app.json` → 0.3.0 con le novità; `version.json` non toccato (lo alza chi integra);
- le tre schede riscritte nel formato a 10 sezioni con la provenienza; le impronte rigenerate con il codice unito e `provenienza`;
- prove: 59 su 59 (le 55 di `main` + le mie 4, adattate); prova nel browser con i passi di entrambi.

## I file ricevuti e cosa ho imparato

| File | Cos'è | Scheda |
|---|---|---|
| `ATAC_Kick_Off_Data_Platform_v1.0.pptx` (16 slide) | kick-off HSPI per un cliente: contesto, obiettivi, approccio, piano Gantt disegnato con le forme, organigramma, punti di attenzione, Quick Win KPI con numeri in evidenza e tabelle disegnate | `docs/MEMORIA/pptx/kickoff-hspi-atac-data-platform.md` + `.impronta.json` |
| `ATAC_Kick_Off_Data_Platform_v1.0.pdf` (16 pagine) | l'esportazione PDF della stessa presentazione, quella che si manda al cliente | `docs/MEMORIA/pdf/esportazione-pdf-presentazione.md` + `.impronta.json` |
| `HSPI_ERP_Governance_Offering_v0.2.pptx` (18 slide) | l'offerta standard HSPI "ERP Governance": blocco aziendale, framework, matrice servizi × fasi, referenze, back-up; sezioni native di PowerPoint | `docs/MEMORIA/pptx/offerta-hspi-erp-governance.md` + `.impronta.json` |

Nelle schede: struttura, stile, convenzioni, impronta, caratteristiche trovate e cosa ci si può fare, cosa fa Cippi oggi su quel file. Niente dati del cliente e niente nomi di persone. I file restano fuori dal repository.

Perché sono fatti così (la logica di chi li ha costruiti):

- il kick-off ATAC è nato da un modello HSPI (due master Poppins/`#307FE2` rimasti inutilizzati) ma usa un terzo master "Tema di Office" con i colori del brand del cliente impostati a mano: il tema "ufficiale" dice Calibri, tutto il testo è Poppins. Per questo il riconoscimento non può fidarsi del solo tema;
- l'indice numerato ripete i titoli delle slide: è la struttura del documento (non ci sono divisori né sezioni native) e permette di scoprire un refuso ("KIP");
- il piano e le tabelle sono disegnati con le forme (non tabelle né grafici): si possono leggere, ma solo riconoscendo l'allineamento delle caselle;
- l'offerta ERP usa le sezioni native (`Intro`, `End`, `Back up`) e ha segnaposto da compilare ("xxxxxx" per il cliente, "0+"/"0K" nel back-up); le parole chiave dei metadati portano il nome del cliente dell'occasione precedente.

## Allineamento con gli altri agenti

- Tre rami stanno creando una memoria dei file: `claude/cool-noether-kv3o8c` e `claude/admiring-hopper-dc5bp0` in `docs/MEMORIA/` (convenzione dichiarata comune), `claude/awesome-cray-8lgn1k` in `docs/memoria/`. Ho seguito `docs/MEMORIA/` con lo stesso formato di scheda e di impronta (`tema.colori`, `tema.caratteri`, `layout.usati`, `layout.pieDiPaginaRegex`, `sezioniNative`, `nomeFile.regex`, `metadati.company`): le loro impronte funzioneranno con il riconoscimento di Cippi senza modifiche. **Attenzione**: su Windows `docs/MEMORIA` e `docs/memoria` sono la stessa cartella; Cippi legge entrambe le grafie senza contare due volte, ma nel repository va tenuta una grafia sola.
- `claude/verbale-studio-portale` (v0.9.0) e `claude/admiring-hopper-dc5bp0` (Cippi 0.2.0) sono stati uniti in `main` v0.10.0 dall'agente integratore mentre questo lavoro era in corso: l'unione è descritta sopra. Le mie modifiche a `main.js` sono poche e localizzate (etichette dei tipi, Confronta sui PDF negli Appunti, Scarica impronta in Documento).
- Il kick-off TXT/BIOSIRIS dell'altro agente segnalava a Cippi: sezioni native non lette, copertina scambiata per testo, falsi avvisi sull'indice, note con il solo numero. Sono tutte cose risolte qui.

## Cosa è cambiato in Cippi (v0.1.0 → v0.2.0)

### Lettura (`pptx-read.js`)
- sezioni native di PowerPoint (`p14:sectionLst`);
- tema del master usato da ogni slide (prima: il primo master della presentazione), elenco dei master con quante slide li usano;
- caratteri usati slide per slide; elenchi numerati (`buAutoNum`); testi fissi dei layout (piè di pagina); metadati completi (azienda, applicazione, titolo, soggetto, parole chiave, date);
- note con il solo numero della slide = vuote.

### Analisi (`analyze.js`)
- tipi nuovi: **piano** (riga di mesi), **organigramma**, **numeri**, **tabella disegnata con le forme** (griglia ≥ 3 × 3 → intestazione, righe, intestazioni di riga); copertina dal nome del layout; indice dalla parola "Indice" più un elenco; chiusura dai contatti; "immagine con titolo" invece di falso divisore (lo stile "normale" del titolo esclude il divisore);
- sezioni: native → capitoli dall'indice (ogni voce abbinata al titolo più vicino, con il refuso riconosciuto a distanza di modifica) → divisori;
- controlli nuovi: refuso tra indice e titolo, segnaposto da compilare, parti mancanti o doppie in qualunque titolo "(n/m)", caratteri fuori tema (base = tema + caratteri usati in metà delle slide, varianti comprese);
- sigle con minuscole (CdS, PagoPA), mesi esclusi dalle sigle; punti chiave per numeri (numero + etichetta), piano (periodi e fasi), team (solo i ruoli), tabelle; percorso di lettura con piano, team, numeri e tabelle;
- il titolo preferisce la forma chiamata "Title" (le slide di back-up dell'offerta avevano il titolo nel paragrafo).

### Memoria dei modelli (`memoria.js`, nuovo)
- impronta di una presentazione; lettura delle impronte note da `docs/MEMORIA` (e `docs/memoria`); confronto a segnali pesati (colori del tema 35, caratteri 15, layout 15, piè di pagina 15, sezioni native 10, nome del file 10, ordine dei tipi 10, azienda 5, nome del tema 5); riconosciuto ≥ 55, simile 35–55;
- API: `memoria` in `GET /api/cippi/docs/:id`, `GET /api/cippi/memoria`, `GET /api/cippi/docs/:id/impronta` (scaricabile).

### PDF (`pdf-read.js` e `appunti.js`, nuovi)
- lettore PDF senza librerie: oggetti e object stream, Flate con predittore, ASCII85/Hex/LZW, caratteri WinAnsi (Differences) e Type0/Identity-H (ToUnicode, larghezze W), Form XObject, righe con posizione, titolo di pagina senza il numerino, metadati; PDF cifrati rifiutati;
- confronto PDF ↔ presentazione pagina per slide (parole in comune + titolo), verdetto "allineato / non aggiornato / non è l'esportazione", pagine senza slide, slide senza pagina, ordine diverso, parole solo da una parte;
- API: `GET /api/cippi/docs/:id/appunti/pdf?name=|path=`; `pdfCollegati` nel documento (i PDF con lo stesso nome nella cartella del progetto).

### Interfaccia
- etichette e colori dei tipi nuovi; chip "modello noto" accanto al punteggio; sezione **Memoria dei modelli** (riconosciuto, candidati, *Scarica impronta*); negli **Appunti** i PDF collegati e il pulsante **Confronta** con la finestra del confronto (verdetto, tabella pagina ↔ slide, differenze, testo per pagina); la tabella disegnata mostrata come tabella nel pannello della slide.

## Verifiche fatte

- Sui file veri (solo qui, non nel repository):
  - kick-off ATAC: 16 slide in 0,3 s; tipi copertina, indice, testo ×4, scheda ×2, schema, piano, organigramma, numeri, immagine, tabella ×3; 10 sezioni dai capitoli dell'indice; controlli: refuso "Quick Win KPI" ↔ "QUICK WIN KIP", caratteri Ubuntu e Gill Sans MT; punteggio 96 % (era 94 % con due falsi avvisi e un "manca l'indice" falso);
  - offerta ERP: 18 slide in 0,3 s; sezioni native Intro/End/Back up; indice e chiusure riconosciuti; titoli giusti nelle slide di back-up; segnaposto "xxxxxx", "0+", "0K" segnalati; punteggio 90 % (era 86 % con 4 falsi "senza titolo");
  - memoria: ogni file riconosce la propria impronta al 100 %, l'altra a 9–12; il documento di processo delle prove (tema HSPI) risulta "simile" all'offerta (54), com'è giusto;
  - PDF ATAC: 16 pagine in 0,16 s, titoli corretti 16/16; confronto con il `.pptx`: allineato (somiglianza media 0,98); con una slide tolta e due invertite: "pagina senza slide, ordine diverso".
- `node --test --test-concurrency=1 test/*.test.js`: **59 su 59** dopo l'unione con `main` (4 prove nuove: kick-off HSPI, memoria, PDF, API).
- Browser (Playwright, desktop e telefono) `test/browser/cippi.ui.js`: tutti ok, nessun errore JavaScript; con i passi nuovi (organigramma e numeri, refuso nei controlli, Scarica impronta, confronto del PDF) accanto a quelli di `main`.

## Come verificarlo a mano

1. Cippi → **Importa PowerPoint** con il kick-off ATAC: pannello strumenti → Documento → "Somiglia a: … kickoff-hspi-atac-data-platform"; struttura con i 10 capitoli; controlli con il refuso; slide 8 "Masterplan", 9 "Organigramma", 12 "Numeri", 14–16 "Tabella" (le celle nel pannello Descrizione, modificabili in Modifica).
2. Pannello strumenti → **Appunti**: il PDF con lo stesso nome (se è nella cartella del progetto) → **Confronta** → "Il PDF corrisponde alla presentazione".
3. **Modifica**: togli una slide, salva, riapri il confronto: "non è aggiornato: 1 pagina senza slide".
4. Importa l'offerta ERP: sezioni Intro/End/Back up, segnaposto segnalati.
5. **Documento → Scarica impronta** su una presentazione nuova: salva il file in `docs/MEMORIA/pptx/` con una scheda a 10 sezioni (completando `provenienza`, `tipoDocumento`, `fornitore`): dalla volta dopo viene riconosciuta.

## Cosa deve fare il proprietario per vederlo

1. Aprire la pull request da `claude/ecstatic-planck-q9m57v` verso `main` (non è stata aperta da questa sessione) e unirla; chi integra alza `version.json` e sposta in quella versione le righe "Non ancora rilasciato" di `docs/CHANGELOG.md`.
2. Sul PC che ospita il portale: `aggiorna.bat`, poi ricaricare la pagina (Cippi 0.3.0 in App e programmi → Novità).
3. Provare dal menu: Cippi → Importa PowerPoint → Appunti → Confronta su un PDF; Documento → Scarica impronta.

## Assunzioni e cose aperte

- La memoria vive nel repository (`docs/MEMORIA`): si aggiorna con un commit, non dal portale. Si può aggiungere in seguito una cartella dati (`data/memoria`) per le impronte salvate dall'interfaccia.
- Le soglie (riconosciuto ≥ 55, simile ≥ 35) sono tarate su quattro impronte: da rivedere quando ce ne saranno di più.
- Il confronto del PDF guarda i testi: una tabella incollata come immagine è invisibile da entrambe le parti.
- Proposte già scritte nelle schede: date delle barre del Gantt → scadenze in GestioneCelle; organigramma → membri del progetto; unione delle tabelle in più parti ed esportazione in Excel; avviso sulle parole chiave dei metadati con il cliente precedente; libreria delle slide aziendali condivisa tra i modelli.
