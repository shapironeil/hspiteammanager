# sal-rti-rcapac (.docx) — Verbale SAL del progetto R-CAP.AC

File ricevuto: `2026.02.15_Verbale_SAL_Template_v1.00.docx` (453 KB). Analizzato il 1° ottobre 2026.

## Sintesi

Verbale formale dello stato avanzamento lavori (SAL) che l'RTI presenta all'Amministrazione: chi c'era, riferimenti contrattuali,
avanzamento del piano di lavoro per servizi e attivita', consuntivazione economica per mese, fatturazione (con ritenuta 0,5% e IVA 22%)
e accettazione firmata da RUP e DEC. Dieci capitoli con indice automatico. I campi da compilare sono tra parentesi quadre ed evidenziati in giallo.

## Impronta (per riconoscerlo)

| Elemento | Valore |
|---|---|
| Nome file | `AAAA.MM.GG_Verbale_SAL_Template_vn.nn.docx` (versione con la v minuscola) |
| Pagina | A4; sezione 1 verticale (margini 2,5 / 2 / 2 / 2 cm), **sezione 2 orizzontale** (solo la tabella economica del cap. 8), sezione 3 verticale |
| Prima pagina diversa | `titlePg`: intestazione della prima pagina con immagine blu "tessuto" 1251×1405 + striscia loghi; intestazione normale = striscia loghi 2146×136; pie' di pagina = stemma regionale 225×225 + campo PAGE |
| Carattere | **Titillium Web** (unico carattere usato nel corpo); il tema dichiara Aptos |
| Colori | intestazioni tabelle **002060** / 1F497D / 17365D (testo bianco), righe di gruppo **305496**, celle chiare DEEAF6 / DAE9F7, economics verde A9D08E / 70AD47, evidenziazione gialla sui segnaposto, titoli 0F4761 (stile Heading) |
| Stili | `Normal` + numerazione (numId 1) per i capitoli 1–7 e 9, `Heading 1` per 8 e 10, `Heading 3` per "Tabella di raccordo", `Body Text`, `TOC 1`, tabella `Grid Table 2 Accent 1` |
| Campi | `TOC \h \u \z` con 10 `PAGEREF` (segnalibri `_Toc…`): l'indice e' un campo con risultato memorizzato, va aggiornato |
| Altro | 12 tabelle, 1 commento (indicazioni sulla codifica dei deliverable), nessuna revisione, `DocSecurity 4` (consigliata sola lettura), customXml SharePoint + bibliografia vuota |

## Struttura (capitoli e tabelle)

| Cap. | Titolo | Contenuto | Tabella |
|---|---|---|---|
| — | INDICE | TOC automatico | |
| 1 | Informazioni di verbalizzazione | "Oggetto della sessione: SAL", Luogo e data (`Palermo – gg.mm.aaaa`), Facilitatore, Scrivente | 3×4 con celle unite |
| 2 | Rappresentanti Amministrazione | Nome e cognome, Ente, Ruolo (RUP, DEC) | 3×3 |
| 3 | Rappresentanti RTI | Nome e cognome, Societa' (4 righe vuote) | 5×2 |
| 4 | Riferimenti | Identificativo documento + titolo: Accordo Quadro (data, CIG lotto), Piano dei Fabbisogni, Piano Operativo, Contratto Esecutivo (data, CIG derivato, CUP) | 5×2 |
| 5 | Premessa | Paragrafo fisso con periodo e lotto | |
| 6 | Avanzamento Piano di Lavoro | Gantt a celle: `#`, Nome attivita', `Mese_1 … Mese_n`; gruppi di servizio (SVI, SS, GA) in 305496, righe attivita' `A_1…A_n`, `B_1…`, `C_1…`; cella colorata DAE9F7 = mese attivo | 11×8 (ultima colonna da 160 twips: residuo) |
| 7 | Avanzamento delle attivita' | Per ogni servizio: `A – [Servizio] (S_1)`, `A1 – [Attivita'] (S_1.1)`, descrizione, `Deliverable:` + elenco. Poi **7.x Tabella di raccordo – Codifica deliverable** (#, denominazione, denominazione codificata) | 5×3 Grid Table 2 Accent 1 |
| 8 | Consuntivazione | (a) Componente RTI, Totale, Avanzamento SAL attuale, SAL precedenti, % progress, riga TOTALE; (b) **orizzontale**: Servizio, Q.ta', Tariffa, #, Nome attivita', Valore attivita', importi per mese `[Mese_n-Anno]`, righe servizio S_n (305496) e attivita' S_n.m | 4×5 e 10×11 (3 intestazioni unite, 24 celle unite) |
| 9 | Fatturazione attiva | Servizio, Attivita', Totale, Importo al SAL (IVA esclusa), % consuntivazione, gg/pp; **Prospetto di ripartizione Economics**: Importo, Ritenuta 0,5%, Credito, IVA 22%, TOTALE FATTURA; dichiarazioni con importi; riferimento art. 11 c. 6 D.Lgs. 36/2023; firma "Per il RTI" | 4×6, 6×2, 1×2 |
| 10 | Accettazione | Autorizzazione all'emissione della fattura; firme RUP e DEC con data | 4×2 |

## Convenzioni di compilazione

- Segnaposto: `[Inserire …]` / `[inserire …]` evidenziato in giallo; date `gg.mm.aaaa` o `__/__/____`; importi `€`, percentuali `%`, "-" = non applicabile.
- Codici: servizi `S_1 … S_n`, attivita' `S_n.m`; codice breve dell'attivita' `A_1`, `B_1`, `C_1` (lettera = servizio); lotto `L<numero>`; mesi `Mese_n` / `[Mese_n-Anno]`.
- Le stesse attivita' compaiono nei capitoli 6, 7, 8 e 9: i codici devono coincidere.
- Calcoli attesi: totale per servizio e per componente RTI; % progress = avanzamento cumulato / totale; credito = importo − ritenuta 0,5%; IVA 22% sul credito; totale fattura = credito + IVA.

## Quirk da ricordare

- Capitoli numerati con due meccanismi diversi (Normal + numerazione, Heading 1): per l'indice contano i livelli di struttura, non lo stile.
- Refuso nel modello: "2'026" nella Premessa.
- Larghezze delle tabelle miste (dxa e percentuali); la tabella del cap. 8 e' larga 14923 twips e sta solo nella sezione orizzontale.
- Il commento del modello spiega la codifica dei deliverable: nel documento compilato va tolto.

## Funzioni dell'app da usare quando arriva un file di questo tipo

Oggi Verbale Studio legge un `.docx` solo come testo del transcript (`docxToText`). Per questo modello serve il motore Word proposto il 1° ottobre 2026:
lettura strutturata, compilazione per funzioni, calcoli economici, controlli, esportazione. Nel frattempo: il modello di riepilogo
"Stato avanzamento lavori (SAL)" di Verbale Studio produce i contenuti del capitolo 7 (avanzamento, prossime attivita', rischi, decisioni).
