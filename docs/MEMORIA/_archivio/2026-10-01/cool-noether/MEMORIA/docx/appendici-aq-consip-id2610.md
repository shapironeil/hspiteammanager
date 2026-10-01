# Template: appendici-aq-consip-id2610 (.docx) — documenti di riferimento del kit ODA

Le tre appendici al Capitolato Tecnico Speciale del Lotto 1 dell'AQ Consip ID 2610. Non si compilano: si **consultano** e vincolano ciò che il Piano Operativo, i piani di lavoro e i SAL possono dire. App: **Verbale Studio** (motore Word, lettura) e conoscenza condivisa in `kit-aq-id2610.conoscenza.json`. Impronta: `appendici-aq-consip-id2610.impronta.json`.

## File visti

| File | Pagine | Parole | Contenuto | Analizzato |
|---|---|---|---|---|
| `KIT_ODA_AQ_ID2610_-_Appendice_1_-_Profili_Professionali.docx` | 62 | 17.364 | 27 profili professionali (framework e-CF) in 27 tabelle a griglia verde `C2D59B` | 01/10/2026 |
| `KIT_ODA_AQ_ID2610_-_Appendice_2_-_Indicatori_di_qualit_.docx` | 59 | 12.910 | 37 indicatori di qualità in schede (49 tabelle), matrice indicatori ↔ azioni contrattuali, formule in equazioni Word (Cambria Math), indici di prestazione e quote sospese, indicatori di digitalizzazione | 01/10/2026 |
| `KIT_ODA_AQ_ID2610_-_Appendice_3_-_Cicli_e_prodotti.docx` | 34 | 12.758 | cicli di vita (tradizionali: completo, ridotto, a fase unica, realizzativo; agile: sprint), attività, 38 prodotti/deliverable con contenuti minimi | 01/10/2026 |

## 1. Cosa sono e come sono costruite

Documenti Consip "a schede": premessa, definizioni, poi una scheda per ogni elemento con **sempre gli stessi campi**. Questo li rende leggibili come **dati** oltre che come testo:

- **Profilo** (App. 1): Titolo del profilo · Descrizione sintetica · Missione · Principali task · Competenze (codice e-CF `A.1.`…`E.9.` + nome + livello) · Conoscenze · Abilità · Certificazioni (gruppi "almeno una per gruppo") · Titolo di studio · Anzianità lavorativa ("minimo N anni, di cui almeno M nella funzione").
- **Indicatore** (App. 2): codice di 3-5 lettere + nome; Aspetto da valutare · Unità di misura · Fonte dati · Periodo di riferimento · Frequenza di misurazione · Dati da rilevare · Formula (equazione) · Regole di arrotondamento · Valore di soglia · Azioni contrattuali (rilievo, quota sospesa, penale con percentuali per classe di rischio A/B/C) · Eccezioni. La **matrice** iniziale dice per ogni indicatore quali azioni contrattuali scattano.
- **Prodotto** (App. 3): nome del deliverable (Titolo 2) + contenuti minimi come elenco puntato; i piani (Piano di Lavoro Generale, di obiettivo, Piano della Qualità…) elencano le sezioni obbligatorie. Tabelle 3.1/3.2: fase → attività → criterio di uscita per ogni ciclo di vita.

Logica di fondo: un servizio attivato nel Piano Operativo porta con sé **i profili ammessi** (CV da allegare), **gli indicatori che lo misurano** (penali) e **i prodotti da consegnare** (ciclo di vita). Le tre appendici sono le tre dimensioni dello stesso contratto.

## 2. Stili e layout (famiglia Consip)

- Copertina con stile "Stile Titolo copertina + Crenatura 16 pt"; titolo in blu `0070C0`; piè di pagina con la frase lunga della procedura ("Procedura aperta per la conclusione di Accordi Quadro, ai sensi del D.Lgs. n. 36/2023 … servizi applicativi in ottica cloud …") e numero di pagina; intestazione con loghi (immagini ancorate).
- A4 con `w:code="9"`; una sezione (App. 3: due).
- App. 1: tutto in stile "Elenco Numerato" dentro tabelle, griglia verde `C2D59B`, 234 celle unite in orizzontale.
- App. 2: stili propri `tab_iq` / `tab_iq_bold` / `Titolo_schede_IQ` / `corpo_IQ`; intestazioni di scheda grigie `D9D9D9` / `A5A5A5`; equazioni OMML; campi REF/SEQ per tabelle numerate; segnaposto `[fase attivazione]` / `[fase esecuzione]`.
- App. 3: stili "CL corpo testo", "Elenco.Bullet01.Tondo", "A BLOCK PARA"; note a piè di pagina; campi STYLEREF/NOTEREF; voci `[trash]` nel pacchetto (parti cancellate ma rimaste nello zip).
- Titoli numerati con stili Titolo 1/2/3 (App. 1 e 3 usano gli id italiani `Titolo2`, App. 2 quelli inglesi `Heading2`: due generazioni di Word).

## 3. Convenzioni

- File: `KIT_ODA_AQ_ID<AQ>_-_Appendice_<n>_-_<Titolo>.docx`.
- Codici indicatore: 3-5 maiuscole (RSPL, GSCO, DAES, CTFU, RIUSO, TRCG, TROR, DFCC, MDTE, TRPM, QNFU, TROI, CSR, RMCO, RSCC, DSGP, RSCA, TRRA, NRPR, RSGT, SPSS, CSIS, RSSP, DSIS, RSAC, TRCH, TPAC, TRAC, RLSA, PFI, TIP, RSCT, MAPP, VQF, RSER, RLFN, MIDG, TAI), raggruppati per servizio e "Governo della fornitura".
- Competenze e-CF: `<Area>.<n>.` con livello 1-5. Anzianità: "Minimo N anni, di cui almeno M nella funzione". Classi di rischio degli obiettivi: A / B / C. Categorie di malfunzionamento: 1-4 (bloccante = 1-2).

## 4. Segnali per riconoscere la famiglia

1. Nome file che inizia con `KIT_ODA_AQ_ID` e contiene `Appendice`.
2. Piè di pagina con "Procedura aperta per … Accordi Quadro … servizi applicativi in ottica cloud".
3. Stile "Stile Titolo copertina + Crenatura 16 pt".
4. App. 1: 27 titoli 2 tutti in maiuscolo con "Titolo del profilo" come prima riga della tabella. App. 2: titoli 3 nella forma `CODICE – Nome`, "Matrice di Corrispondenza". App. 3: "Tabella 3.1 Fasi e attività nei cicli di vita tradizionali", titoli 2 = nomi dei prodotti.

## 5. Anomalie e cose da sapere

- App. 2: l'equazione di RSPL è scritta in OMML e si perde nelle conversioni in testo (pandoc la rende come TeX); i segnaposto `[fase attivazione]` sono rimasti; alcune soglie sono tabelle, non frasi (TRCG, DAES, TROI).
- App. 3: voci `[trash]` nello zip; refuso "Servizio di Servizio" assente qui ma presente nel Piano Operativo che la cita.
- Le tre appendici hanno date di creazione 2020-2022 e modifiche fino al 2026: sono riedizioni; una stessa sigla può cambiare significato tra edizioni dell'AQ (controllare l'ID).

## 6. Cosa sa fare l'app e cosa manca

Oggi: solo testo piatto. Manca: lettura delle schede come dati (già fatta una volta a mano in `kit-aq-id2610.conoscenza.json`), ricerca per codice ("cosa prevede TROR?"), collegamento servizio → profili / indicatori / prodotti, uso di questa conoscenza nei controlli del Piano Operativo, del piano di lavoro e dei SAL (es. il SAL deve riportare gli indicatori del servizio; il piano di obiettivo deve avere le milestone che RSPL misura).

## 7. Funzioni da usare quando arrivano file così

1. *Riconosci* "appendice del kit AQ Consip".
2. *Estrai schede* → aggiorna `kit-aq-id2610.conoscenza.json` (profili, indicatori, prodotti, cicli).
3. *Consulta* dal portale: glossario e schede per codice, collegate ai servizi del Piano Operativo.
4. *Controlla* i documenti del progetto contro le appendici (profili dichiarati ammessi, indicatori citati esistenti, deliverable previsti dal ciclo di vita).
