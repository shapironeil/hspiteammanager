# Template `sal-verbale` — verbale di stato avanzamento lavori (SAL) di un progetto PA (Word)

## 1. Identità

| Voce | Valore |
|---|---|
| Nome del template | `sal-verbale` (nome dato dall'analisi originale; fuori dalla convenzione `<tipo>-<fornitore>-<progetto>`: vedi `../CONFLITTI.md`, voce 3) |
| Formato | `.docx` (Word) |
| Tipo di documento | **verbale formale dello stato avanzamento lavori (SAL)** che l'RTI presenta all'Amministrazione |
| App di riferimento | **Verbale Studio** (motore Word da creare) |
| Fornitore / progetto | un RTI (non nominato) per conto di un'Amministrazione regionale; progetto **R-CAP.AC**, PN "Capacità per la Coesione 2021-2027" (Priorità 1 – Azione 1.1.4); rendiconta per **Lotto**, con SAL periodico (nel modello: trimestrale, "Aprile – Giugno"). Fa coppia con `../pptx/sal-presentazione.md` (fascicolo SAL) |
| File visti | `2026.02.15_Verbale_SAL_Template_v1.00.docx`: 453 KB; 10 capitoli, 12 tabelle, 1 commento; data di modifica non nota |
| Analizzato | 01/10/2026 (Verbale Studio 1.0.0, portale 0.8.1) |

Sintesi: chi c'era, riferimenti contrattuali, avanzamento del piano di lavoro per servizi e attività, consuntivazione economica per mese, fatturazione (con ritenuta 0,5% e IVA 22%) e accettazione firmata da RUP e DEC. Dieci capitoli con indice automatico. I campi da compilare sono tra parentesi quadre ed evidenziati in giallo.

Il file originale non sta nel repository: resta nella cartella del progetto (Esplora file) sul PC del portale.

**Provenienza**: agente `awesome-cray`, sessione `session_01WbrSz86BeYisrNNoJc7Eh5`, ramo `claude/awesome-cray-8lgn1k`, commit `51e11c0`, analisi del 01/10/2026. Scheda originale `docs/memoria/modelli/sal-verbale.md` e voce `sal-verbale` di `docs/memoria/modelli.json`, archiviate in `../_archivio/2026-10-01/awesome-cray/memoria/`. Unificata il 01/10/2026 sul ramo `claude/integrazione-2026-10-01`.

## 2. Impronta di riconoscimento

Impronta leggibile da un programma: `sal-verbale.impronta.json` (creata nell'unificazione dalla voce di `modelli.json`, con tutti i campi originali). Segnali forti, in ordine:

1. nome del file `AAAA.MM.GG_Verbale_SAL_Template_vn.nn.docx` (versione con la v minuscola; regex `^\d{4}\.\d{2}\.\d{2}_Verbale_SAL_Template_v\d+\.\d+\.docx$`);
2. pagina A4; sezione 1 verticale (margini 2,5 / 2 / 2 / 2 cm), **sezione 2 orizzontale** (solo la tabella economica del cap. 8), sezione 3 verticale;
3. prima pagina diversa (`titlePg`): intestazione della prima pagina con immagine blu "tessuto" 1251×1405 + striscia loghi; intestazione normale = striscia loghi 2146×136; piè di pagina = stemma regionale 225×225 + campo PAGE;
4. carattere **Titillium Web** (unico carattere usato nel corpo); il tema dichiara Aptos;
5. colori: intestazioni delle tabelle **002060** / 1F497D / 17365D (testo bianco), righe di gruppo **305496**, celle chiare DEEAF6 / DAE9F7, economics verde A9D08E / 70AD47, evidenziazione gialla sui segnaposto, titoli 0F4761 (stile Heading);
6. i 10 capitoli nell'ordine: Informazioni di verbalizzazione, Rappresentanti Amministrazione, Rappresentanti RTI, Riferimenti, Premessa, Avanzamento Piano di Lavoro, Avanzamento delle attività, Consuntivazione, Fatturazione attiva, Accettazione;
7. 12 tabelle; campi TOC, PAGEREF, PAGE; segnaposto `[Inserire …]` (regex `\[[Ii]nserire [^\]]+\]`).

Pesi e punteggio minimo non sono stati decisi dall'analisi originale. Oggi nessun codice legge le impronte `.docx`.

## 3. Mappa degli oggetti

| Cap. | Titolo | Contenuto | Tabella |
|---|---|---|---|
| — | INDICE | TOC automatico | |
| 1 | Informazioni di verbalizzazione | "Oggetto della sessione: SAL", Luogo e data (`Palermo – gg.mm.aaaa`), Facilitatore, Scrivente | 3×4 con celle unite |
| 2 | Rappresentanti Amministrazione | Nome e cognome, Ente, Ruolo (RUP, DEC) | 3×3 |
| 3 | Rappresentanti RTI | Nome e cognome, Società (4 righe vuote) | 5×2 |
| 4 | Riferimenti | Identificativo documento + titolo: Accordo Quadro (data, CIG lotto), Piano dei Fabbisogni, Piano Operativo, Contratto Esecutivo (data, CIG derivato, CUP) | 5×2 |
| 5 | Premessa | Paragrafo fisso con periodo e lotto | |
| 6 | Avanzamento Piano di Lavoro | Gantt a celle: `#`, Nome attività, `Mese_1 … Mese_n`; gruppi di servizio (SVI, SS, GA) in 305496, righe attività `A_1…A_n`, `B_1…`, `C_1…`; cella colorata DAE9F7 = mese attivo | 11×8 (ultima colonna da 160 twips: residuo) |
| 7 | Avanzamento delle attività | Per ogni servizio: `A – [Servizio] (S_1)`, `A1 – [Attività] (S_1.1)`, descrizione, `Deliverable:` + elenco. Poi **7.x Tabella di raccordo – Codifica deliverable** (#, denominazione, denominazione codificata) | 5×3 Grid Table 2 Accent 1 |
| 8 | Consuntivazione | (a) Componente RTI, Totale, Avanzamento SAL attuale, SAL precedenti, % progress, riga TOTALE; (b) **orizzontale**: Servizio, Q.tà, Tariffa, #, Nome attività, Valore attività, importi per mese `[Mese_n-Anno]`, righe servizio S_n (305496) e attività S_n.m | 4×5 e 10×11 (3 intestazioni unite, 24 celle unite) |
| 9 | Fatturazione attiva | Servizio, Attività, Totale, Importo al SAL (IVA esclusa), % consuntivazione, gg/pp; **Prospetto di ripartizione Economics**: Importo, Ritenuta 0,5%, Credito, IVA 22%, TOTALE FATTURA; dichiarazioni con importi; riferimento art. 11 c. 6 D.Lgs. 36/2023; firma "Per il RTI" | 4×6, 6×2, 1×2 |
| 10 | Accettazione | Autorizzazione all'emissione della fattura; firme RUP e DEC con data | 4×2 |

Stili e campi:

- Stili: `Normal` + numerazione (numId 1) per i capitoli 1–7 e 9, `Heading 1` per 8 e 10, `Heading 3` per "Tabella di raccordo", `Body Text`, `TOC 1`, tabella `Grid Table 2 Accent 1`.
- Campi: `TOC \h \u \z` con 10 `PAGEREF` (segnalibri `_Toc…`): l'indice è un campo con risultato memorizzato, va aggiornato; `PAGE` nel piè di pagina.
- Altro: 12 tabelle, 1 commento (indicazioni sulla codifica dei deliverable), nessuna revisione, `DocSecurity 4` (consigliata sola lettura), customXml SharePoint + bibliografia vuota.
- Larghezze delle tabelle miste (dxa e percentuali); la tabella del cap. 8 è larga 14923 twips e sta solo nella sezione orizzontale.

Codici e convenzioni:

- Servizi `S_1 … S_n`, attività `S_n.m`; codice breve dell'attività `A_1`, `B_1`, `C_1` (lettera = servizio; pattern `[A-Z]_n`); lotto `L<numero>`; mesi `Mese_n` / `[Mese_n-Anno]`.
- Date `gg.mm.aaaa` o `__/__/____`; importi `€`, percentuali `%`, "-" = non applicabile.
- Nome del file `AAAA.MM.GG_<Cosa>_<Tipo>_vN.NN.<ext>` (famiglia SAL; qui con la v minuscola).

## 4. Parti fisse e parti variabili

**Fisse**: i 10 capitoli e il loro ordine; le intestazioni delle 12 tabelle; il paragrafo della Premessa (con periodo e lotto da cambiare); le dichiarazioni del cap. 9 e il riferimento all'art. 11 c. 6 D.Lgs. 36/2023; le formule di firma ("Per il RTI", RUP e DEC); brand nelle intestazioni e nel piè di pagina.

**Variabili**: segnaposto `[Inserire …]` / `[inserire …]` evidenziati in giallo; luogo e data; facilitatore e scrivente; partecipanti PA (RUP, DEC) e RTI; riferimenti contrattuali (date, CIG, CUP); periodo e lotto; mesi del Gantt; importi, percentuali e totali; firme e date.

**Ripetibili**: gruppi di servizio e righe di attività nei capitoli 6, 7, 8 e 9 (le **stesse attività** compaiono in tutti e quattro: i codici devono coincidere); le righe dei rappresentanti; la tabella di raccordo dei deliverable.

## 5. Regole di modifica, aggiunta ed eliminazione

- **Aggiungere un'attività o un servizio**: va aggiunto in tutti i capitoli che lo citano (6 Gantt, 7 resoconto, 8 economics, 9 fatturazione) con lo stesso codice `S_n.m` e lo stesso codice breve; le righe di gruppo del servizio hanno il colore 305496, le righe attività restano chiare.
- **Calcoli attesi**: totale per servizio e per componente RTI; % progress = avanzamento cumulato / totale; credito = importo − ritenuta 0,5%; IVA 22% sul credito; totale fattura = credito + IVA. La riga TOTALE del cap. 8 va ricalcolata.
- **Mesi**: il Gantt del cap. 6 e la tabella del cap. 8 hanno una colonna per mese (`Mese_n`, `[Mese_n-Anno]`): aggiungere o togliere colonne in entrambi; la tabella del cap. 8 sta solo nella sezione orizzontale (14923 twips).
- **Indice**: è un campo con risultato memorizzato: dopo le modifiche va aggiornato. I capitoli sono numerati con due meccanismi diversi (Normal + numerazione, Heading 1): per l'indice contano i livelli di struttura, non lo stile.
- **Pulizia del compilato**: togliere il commento del modello (spiega la codifica dei deliverable); correggere il refuso "2'026" nella Premessa; l'ultima colonna da 160 twips della tabella del cap. 6 è un residuo.
- `DocSecurity 4`: il modello consiglia la sola lettura; il compilato va salvato come file nuovo.

## 6. Funzioni consigliate dell'app

Funzioni esistenti (nomi come nell'interfaccia di Verbale Studio e in `docs/INTEGRAZIONE-APP.md`):

- Il **template del riepilogo "Stato avanzamento lavori (SAL)"** di Verbale Studio produce i contenuti del capitolo 7 (sintesi, milestone raggiunte, avanzamento attività, prossime attività, rischi e issue, richieste al cliente, decisioni) a partire dal checkpoint; **Punti chiave** ed **Email di riepilogo** per diffonderli.
- **Transcript** / **Cartella di lavoro**: lettura del `.docx` come testo piatto (solo per cercare).
- **Esplora file**: archivio del modello e dei verbali compilati nella cartella `Verbali/` del progetto (versioni, cestino).

Da realizzare (il motore Word proposto il 1° ottobre 2026; nomi originali tra parentesi):

- lettura strutturata di titoli, tabelle, evidenziazioni, campi, sezioni (`lettura-strutturata`);
- compilazione del modello per funzioni (`compila-modello`), con le tabelle ripetute per servizio e attività (`tabelle-ripetute`);
- calcoli economici: totali, % progress, ritenuta 0,5%, IVA 22%, totale fattura (`calcoli-economici`);
- indice aggiornato (`toc-aggiornato`);
- controlli: codici uguali nei capitoli 6-9, segnaposto rimasti, totali che tornano (`controlli`);
- esportazione `.docx` conservando il resto del file (`esporta-docx`);
- dal checkpoint di Verbale Studio al verbale SAL (`da-checkpoint-a-verbale`), con l'oggetto "SAL" condiviso con la presentazione (`../fascicoli/fascicolo-sal.md`).

**Aggiornamento 1° ottobre 2026 — motore Word in Verbale Studio 1.1.0 (ramo `claude/awesome-cray-8lgn1k`, `app/src/word/`, vedi `docs/WORD.md`): la compilazione esiste.**

1. **Carica il modello nel progetto** (`PUT /api/word/modelli`, cartella `Verbali/Modelli/`): il motore lo riconosce dall'impronta (capitoli, carattere Titillium Web, immagini di intestazione e piè di pagina, numero di tabelle, sezioni; punteggio 100).
2. Da Verbale Studio, nel checkpoint del SAL: **⋯ → Verbale SAL in Word (e presentazione)**. I punti del checkpoint entrano da soli (per ruolo delle sezioni del riepilogo); si completano periodo, luogo, lotto, servizi, attività, importi per mese, rappresentanti e riferimenti; totali, ritenuta 0,5% e IVA 22% li calcola il portale (`app/src/sal.js`).
3. Il compilatore (`app/src/word/sal-verbale.js`) lavora sugli **ancoraggi** di questo modello: tabella "Informazioni generali", "Ente di appartenenza", "Nome e Cognome | Società", "Identificativo | Titolo", Gantt "# | Nome Attività | Mese_1", blocchi "A – [Inserire nome Servizio] (S_1)", "Denominazione del Deliverable", "Componente RTI | Totale", tabella economica "Q.ta | Tariffa" (sezione orizzontale, colonne dei mesi ricalcolate), "Importo al SAL Economico", prospetto "Ritenuta 0,5%", le dichiarazioni con `__/__/____` e `[Inserire importo]`, "[inserire periodo di riferimento]", le firme con `[Inserire data]`. Il commento del modello viene tolto; l'indice è segnato da aggiornare all'apertura in Word.
4. **Controlli** sul risultato (`app/src/word/controlli.js`): segnaposto rimasti, prospetto che quadra, totali per componente, codici `S_n` coerenti tra i capitoli.

## 7. Stato dell'app su questo template

Oggi Verbale Studio (1.0.0) legge un `.docx` solo come testo del transcript (`docxToText`; l'analisi originale lo chiamava `docx-testo (solo transcript)`). Per questo modello serve il motore Word proposto il 1° ottobre 2026: lettura strutturata, compilazione per funzioni, calcoli economici, controlli, esportazione. Nel frattempo il template di riepilogo "Stato avanzamento lavori (SAL)" copre i contenuti del capitolo 7. Nessuna misura riportata.

**Verificato il 1° ottobre 2026** sul file vero (solo in locale) con i dati d'esempio: 0 segnaposto rimasti, 12 tabelle compilate, documento valido allo schema OOXML e riapribile. Restano: numeri di pagina dell'indice senza Word, PDF, grassetti a metà frase nei testi compilati.

## 8. Dubbi aperti

- Questo verbale appartiene allo stesso Accordo Quadro Consip ID 2610 degli altri documenti in memoria? Il cap. 4 cita AQ, Piano dei Fabbisogni, Piano Operativo e Contratto Esecutivo, ma l'analisi originale non dice quale AQ; il fascicolo AQ lo dà per scontato (`../CONFLITTI.md`, voce 1).
- Il nome `sal-verbale` non segue la convenzione dei template (`../CONFLITTI.md`, voce 3).
- Il luogo fisso "Palermo" nel cap. 1 è del modello o del progetto?
- La proposta del 1° ottobre 2026 (motore Word) non è nel repository.
- Pesi e punteggio minimo dell'impronta da decidere.

## 9. Da classificare

- Voce di `modelli.json`: `"fascicolo": "sal"`; `"scheda": "docs/memoria/modelli/sal-verbale.md"` (percorso vecchio, conservato nell'impronta sotto `provenienza`); `"calcoli": { "ritenuta": 0.005, "iva": 0.22 }`.
- Il template è stato ricevuto il 1° ottobre 2026 insieme alla presentazione SAL.

## 10. Fonti

- `awesome-cray`, sessione `session_01WbrSz86BeYisrNNoJc7Eh5`, commit `51e11c0`, `docs/memoria/modelli/sal-verbale.md`: sintesi, impronta, struttura, convenzioni di compilazione, quirk, funzioni da usare.
- `awesome-cray`, commit `51e11c0`, `docs/memoria/modelli.json` (voce `sal-verbale`): regex del nome file, pagina, sezioni, prima pagina diversa, carattere, colori, immagini con dimensioni, capitoli, tabelle, campi, segnaposto, codici, calcoli, `funzioni` e `mancanti`.
- `awesome-cray`, commit `51e11c0`, `docs/memoria/fascicolo-sal.md` e `README.md`: contesto comune (programma, RTI, RUP e DEC, SAL trimestrale per lotto, identità visiva), convenzione del nome del file.
- `app/public/verbali/templates.js`, `docs/INTEGRAZIONE-APP.md`, `app/src/verbali/docx.js`: nomi reali del template di riepilogo e dei comandi di Verbale Studio.
