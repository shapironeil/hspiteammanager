# Template `appendici-aq-consip-id2610` — appendici al Capitolato Tecnico Speciale dell'AQ Consip ID 2610, documenti di riferimento del kit ODA (Word)

## 1. Identità

| Voce | Valore |
|---|---|
| Nome del template | `appendici-aq-consip-id2610` (una famiglia di tre documenti) |
| Formato | `.docx` (Word) |
| Tipo di documento | le tre **appendici al Capitolato Tecnico Speciale** del Lotto 1 dell'AQ Consip ID 2610. Non si compilano: si **consultano** e vincolano ciò che il Piano Operativo, i piani di lavoro e i SAL possono dire |
| App di riferimento | **Verbale Studio** (motore Word, lettura) e conoscenza condivisa in `kit-aq-id2610.conoscenza.json` |
| Fornitore / progetto | Consip S.p.A. (documenti pubblici di gara: niente dati del team) |
| File visti | vedi tabella sotto; dimensioni non note; date di creazione 2020-2022 e modifiche fino al 2026 |
| Analizzato | 01/10/2026 (Verbale Studio 1.0.0, portale 0.8.1) |

| File | Pagine | Parole | Tabelle | Contenuto |
|---|---|---|---|---|
| `KIT_ODA_AQ_ID2610_-_Appendice_1_-_Profili_Professionali.docx` | 62 | 17.364 | 27 | 27 profili professionali (framework e-CF) in 27 tabelle a griglia verde `C2D59B` |
| `KIT_ODA_AQ_ID2610_-_Appendice_2_-_Indicatori_di_qualit_.docx` | 59 | 12.910 | 49 | 37 indicatori di qualità in schede, matrice indicatori ↔ azioni contrattuali, formule in equazioni Word (Cambria Math), indici di prestazione e quote sospese, indicatori di digitalizzazione |
| `KIT_ODA_AQ_ID2610_-_Appendice_3_-_Cicli_e_prodotti.docx` | 34 | 12.758 | 2 | cicli di vita (tradizionali: completo, ridotto, a fase unica, realizzativo; agile: sprint), attività, 38 prodotti/deliverable con contenuti minimi |

Logica di fondo: un servizio attivato nel Piano Operativo porta con sé **i profili ammessi** (CV da allegare), **gli indicatori che lo misurano** (penali) e **i prodotti da consegnare** (ciclo di vita). Le tre appendici sono le tre dimensioni dello stesso contratto. Fascicolo: `../fascicoli/fascicolo-aq-id2610.md`.

**Provenienza**: agente `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, ramo `claude/cool-noether-kv3o8c`, commit `74c4dad`, analisi del 01/10/2026. Scheda originale in `../_archivio/2026-10-01/cool-noether/MEMORIA/docx/`. Unificata il 01/10/2026 sul ramo `claude/integrazione-2026-10-01`.

## 2. Impronta di riconoscimento

Impronta leggibile da un programma: `appendici-aq-consip-id2610.impronta.json` (`punteggioMinimo` 3). Segnali della famiglia, in ordine, con il peso:

1. nome del file che inizia con `KIT_ODA_AQ_ID` e contiene `Appendice` (regex `^KIT_ODA_AQ_ID\d{4}_-_Appendice_\d_-_.+\.docx$`) (peso 2);
2. piè di pagina con "Procedura aperta per … Accordi Quadro … servizi applicativi in ottica cloud" (peso 2);
3. stile "Stile Titolo copertina + Crenatura 16 pt" (peso 1);
4. App. 1: 27 titoli 2 tutti in maiuscolo con "Titolo del profilo" come prima riga della tabella (peso 1). App. 2: titoli 3 nella forma `CODICE – Nome`, "Matrice di Corrispondenza" (peso 1). App. 3: "Tabella 3.1 Fasi e attività nei cicli di vita tradizionali", titoli 2 = nomi dei prodotti (peso 1).

Schema del nome: `KIT_ODA_AQ_ID<AQ>_-_Appendice_<n>_-_<Titolo>.docx`. Un documento di riferimento non si compila: si estrae in `*.conoscenza.json` e si usa per i controlli.

## 3. Mappa degli oggetti

Documenti Consip "a schede": premessa, definizioni, poi una scheda per ogni elemento con **sempre gli stessi campi**. Questo li rende leggibili come **dati** oltre che come testo:

- **Profilo** (App. 1): Titolo del profilo · Descrizione sintetica · Missione · Principali task · Competenze (codice e-CF `A.1.`…`E.9.` + nome + livello) · Conoscenze · Abilità · Certificazioni (gruppi "almeno una per gruppo") · Titolo di studio · Anzianità lavorativa ("minimo N anni, di cui almeno M nella funzione").
- **Indicatore** (App. 2): codice di 3-5 lettere + nome; Aspetto da valutare · Unità di misura · Fonte dati · Periodo di riferimento · Frequenza di misurazione · Dati da rilevare · Formula (equazione) · Regole di arrotondamento · Valore di soglia · Azioni contrattuali (rilievo, quota sospesa, penale con percentuali per classe di rischio A/B/C) · Eccezioni. La **matrice** iniziale dice per ogni indicatore quali azioni contrattuali scattano.
- **Prodotto** (App. 3): nome del deliverable (Titolo 2) + contenuti minimi come elenco puntato; i piani (Piano di Lavoro Generale, di obiettivo, Piano della Qualità…) elencano le sezioni obbligatorie. Tabelle 3.1/3.2: fase → attività → criterio di uscita per ogni ciclo di vita.

### Stili e layout (famiglia Consip)

- Copertina con stile "Stile Titolo copertina + Crenatura 16 pt"; titolo in blu `0070C0`; piè di pagina con la frase lunga della procedura ("Procedura aperta per la conclusione di Accordi Quadro, ai sensi del D.Lgs. n. 36/2023 … servizi applicativi in ottica cloud …") e numero di pagina; intestazione con loghi (immagini ancorate).
- A4 con `w:code="9"`; una sezione (App. 3: due).
- App. 1: tutto in stile "Elenco Numerato" dentro tabelle, griglia verde `C2D59B`, 234 celle unite in orizzontale.
- App. 2: stili propri `tab_iq` / `tab_iq_bold` / `Titolo_schede_IQ` / `corpo_IQ`; intestazioni di scheda grigie `D9D9D9` / `A5A5A5`; equazioni OMML (Cambria Math); campi REF/SEQ per tabelle numerate; segnaposto `[fase attivazione]` / `[fase esecuzione]`.
- App. 3: stili "CL corpo testo", "Elenco.Bullet01.Tondo", "A BLOCK PARA"; note a piè di pagina; campi STYLEREF/NOTEREF (e SEQ/REF); voci `[trash]` nel pacchetto (parti cancellate ma rimaste nello zip).
- Titoli numerati con stili Titolo 1/2/3 (App. 1 e 3 usano gli id italiani `Titolo2`, App. 2 quelli inglesi `Heading2`: due generazioni di Word).

### Convenzioni

- File: `KIT_ODA_AQ_ID<AQ>_-_Appendice_<n>_-_<Titolo>.docx`.
- Codici indicatore: 3-5 maiuscole (RSPL, GSCO, DAES, CTFU, RIUSO, TRCG, TROR, DFCC, MDTE, TRPM, QNFU, TROI, CSR, RMCO, RSCC, DSGP, RSCA, TRRA, NRPR, RSGT, SPSS, CSIS, RSSP, DSIS, RSAC, TRCH, TPAC, TRAC, RLSA, PFI, TIP, RSCT, MAPP, VQF, RSER, RLFN, MIDG, TAI), raggruppati per servizio e "Governo della fornitura".
- Competenze e-CF: `<Area>.<n>.` con livello 1-5. Anzianità: "Minimo N anni, di cui almeno M nella funzione". Classi di rischio degli obiettivi: A / B / C. Categorie di malfunzionamento: 1-4 (bloccante = 1-2).

### La conoscenza estratta (`kit-aq-id2610.conoscenza.json`)

Fatta a mano una volta dalle tre appendici e dal Piano Operativo. Contiene: accordo quadro (ID 2610, terza edizione, oggetto, Lotto 1, normativa D.Lgs. 36/2023); 26 righe di servizio (servizio, modalità, metrica, dimensionamento); 9 sigle dei servizi (SVI, MI, CF, CW, MAD, MAC, MAD-MAC, SS, GA); 18 aziende del RTI; ruoli del fornitore con il riferimento al Capitolato Tecnico Generale; cicli di vita (tradizionali e agili, fasi e criteri di uscita); attività per ciclo; 38 prodotti; 37 indicatori con soglie e azioni; 27 profili e-CF; glossario di base (10 voci). Il file non si tocca a mano se non per aggiornarlo da una nuova edizione.

## 4. Parti fisse e parti variabili

Tutto il contenuto è **fisso**: le appendici non si compilano. Variano solo tra **edizioni** dell'Accordo Quadro: le tre appendici hanno date di creazione 2020-2022 e modifiche fino al 2026, sono riedizioni; una stessa sigla può cambiare significato tra edizioni (controllare l'ID dell'AQ nel nome del file e nel piè di pagina).

Parti ripetute: le schede (27 profili, 37 indicatori, 38 prodotti) con sempre gli stessi campi. Segnaposto rimasti nel modello Consip: `[fase attivazione]` / `[fase esecuzione]` nell'App. 2.

## 5. Regole di modifica, aggiunta ed eliminazione

- **Non si modificano**: sono documenti di gara. L'unica operazione è **riestrarre la conoscenza** quando arriva una nuova edizione: aggiornare `kit-aq-id2610.conoscenza.json` (profili, indicatori, prodotti, cicli) e controllare l'ID dell'AQ.
- Nelle conversioni in testo l'equazione di RSPL (OMML) si perde (pandoc la rende come TeX): per le formule serve leggere l'OMML, non il testo piatto.
- Alcune soglie sono tabelle, non frasi (TRCG, DAES, TROI): l'estrazione deve leggere le tabelle.
- Le voci `[trash]` nello zip dell'App. 3 vanno ignorate.

## 6. Funzioni consigliate dell'app

Funzioni esistenti nel portale:

- **Esplora file**: le appendici stanno nella cartella del progetto (ricerca, anteprima, versioni).
- Verbale Studio, **Transcript** / **Cartella di lavoro**: lettura come testo piatto, utile solo per cercare una parola.
- La conoscenza del kit è già in `kit-aq-id2610.conoscenza.json`: oggi la si consulta a mano o con un programma.
- **Glossario** del progetto in MPoint (e glossario della PA preimpostato) per le sigle del kit.

Da realizzare, nell'ordine d'uso quando arrivano file così:

1. *Riconosci* "appendice del kit AQ Consip".
2. *Estrai schede* → aggiorna `kit-aq-id2610.conoscenza.json` (profili, indicatori, prodotti, cicli).
3. *Consulta* dal portale: glossario e schede per codice ("cosa prevede TROR?"), collegate ai servizi del Piano Operativo.
4. *Controlla* i documenti del progetto contro le appendici: profili dichiarati ammessi, indicatori citati esistenti, deliverable previsti dal ciclo di vita (per esempio il SAL deve riportare gli indicatori del servizio; il piano di obiettivo deve avere le milestone che RSPL misura).

## 7. Stato dell'app su questo template

Oggi: solo testo piatto (`docxToText`). Manca: lettura delle schede come dati (già fatta una volta a mano in `kit-aq-id2610.conoscenza.json`), ricerca per codice, collegamento servizio → profili / indicatori / prodotti, uso di questa conoscenza nei controlli del Piano Operativo, del piano di lavoro e dei SAL. Nessuna misura riportata.

## 8. Dubbi aperti

- Le sigle degli indicatori possono cambiare significato tra edizioni dell'AQ: quale edizione vale per ogni Contratto Esecutivo?
- I segnaposto `[fase attivazione]` / `[fase esecuzione]` rimasti nell'App. 2 sono voluti dal modello Consip?
- Il refuso "Servizio di Servizio" è assente nelle appendici ma presente nel Piano Operativo che le cita: il modello del RTI va corretto?

## 9. Da classificare

- "App. 3: refuso 'Servizio di Servizio' assente qui ma presente nel Piano Operativo che la cita" (anomalia riportata dall'analisi originale, qui spostata nei dubbi).
- Nota del file di conoscenza: "Conoscenza estratta dal kit dell'Accordo Quadro Consip ID 2610 (Lotto 1, servizi applicativi in ottica cloud). Documenti pubblici di gara: niente dati del team."
- Nella riga del README originale l'app era indicata come "Verbale Studio (consultazione)".

## 10. Fonti

- `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, commit `74c4dad`: `docs/MEMORIA/docx/appendici-aq-consip-id2610.md` (sezioni 1-7 originali), `.impronta.json` (pesi, regex, stili per appendice, campi delle schede), `kit-aq-id2610.conoscenza.json` (conteggi e contenuti della conoscenza), `docs/MEMORIA/fascicolo-aq-id2610.md` (ora `../fascicoli/fascicolo-aq-id2610.md`), riga nel README.
- `docs/INTEGRAZIONE-APP.md`, `app/src/verbali/docx.js`, `docs/MPOINT.md`: funzioni reali disponibili oggi.
