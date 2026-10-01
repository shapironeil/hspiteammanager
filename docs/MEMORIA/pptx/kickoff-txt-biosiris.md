# Template `kickoff-txt-biosiris` — presentazione di kick-off di progetto (PowerPoint)

## 1. Identità

| Voce | Valore |
|---|---|
| Nome del template | `kickoff-txt-biosiris` |
| Formato | `.pptx` (PowerPoint, 16:9 "Widescreen") |
| Tipo di documento | presentazione di **avvio (kick-off) di un progetto** per una pubblica amministrazione |
| App di riferimento | **Cippi** |
| Fornitore / progetto | raggruppamento guidato da TXT e-solutions S.p.A. con HSPI, Deda Next, Webgenesys e RPC Net (loghi a piè di pagina); progetto BIOSIRIS, Regione Siciliana, Dipartimento Sviluppo Rurale, nell'ambito dell'accordo quadro Consip "AQ SAC 3 - Lotto 1" (ID 2610) |
| File visti | `BIOSIRIS_Kick-off_v0.9.1.pptx`: 13 slide, 836 KB, ultima modifica 30/09/2026, revisione 68, 1976 parole, 221 paragrafi; azienda nei metadati "TXT e-solutions S.p.A."; nel file un'autrice (Chiara Ibba) e due co-autori di Webgenesys (Massimiliano Perri e Sarah Poma). I nomi sono dati personali: vedi `../CONFLITTI.md`, voce 2 |
| Analizzato | 01/10/2026 con Cippi 0.1.0 (portale 0.8.1); misure ripetute lo stesso giorno con Cippi 0.2.0 |

A cosa serve: raccontare al cliente, nella prima riunione, contesto e finanziamento, obiettivi, ambiti di intervento (una scheda per ambito), piano di massima (masterplan a Gantt) e sintesi economica del contratto.

Nessun dato del file è copiato qui oltre a struttura e stile: il file resta fuori dal repository.

**Provenienza**: agente `admiring-hopper`, sessione `session_01GqNo1MzxngbR1RQrFUDijL`, ramo `claude/admiring-hopper-dc5bp0`, commit `e5ab667` (scheda e impronta, prima versione) e `fff10ab` (misure con Cippi 0.2.0), analisi del 01/10/2026. Scheda originale in `../_archivio/2026-10-01/admiring-hopper/MEMORIA/pptx/`. Unificata il 01/10/2026 sul ramo `claude/integrazione-2026-10-01`.

## 2. Impronta di riconoscimento

Impronta leggibile da un programma: `kickoff-txt-biosiris.impronta.json` (la legge `app/src/cippi/impronta.js`). Segnali forti, in ordine:

1. tema con accent1 `#225546` e accent5 `#1482AB`, caratteri del tema Poppins/Poppins;
2. layout usato dalla maggior parte delle slide `1_Title and Content` con piè di pagina "Kick-off Progetto …" (regex `^Kick-off Progetto .+`);
3. sezioni native "Copertina, Indice, Introduzione e contesto, Obiettivi, Ambito, Masterplan, Sintesi contratto esecutivo";
4. forme chiamate "Web Design", "Programming", "Database" (le pillole) e "Text 85"/"Text 90" (la tabella disegnata);
5. ultima slide con una tabella il cui ultimo rigo è "TOTALE";
6. azienda "TXT e-solutions S.p.A." nei metadati.

Con 1+2 il file è una presentazione di questa famiglia (kick-off, SAL, chiusura dello stesso raggruppamento); con 3 è proprio un kick-off.

Nome del file: schema `<PROGETTO>_Kick-off_v<maggiore>.<minore>.<patch>.pptx`, regex `^[A-Za-z0-9]+_Kick-off_v\d+\.\d+(\.\d+)?\.pptx$`.

Cosa confronta davvero Cippi (`impronta.js`): colori del tema (`tema.colori`), caratteri del tema (`tema.caratteri`), layout principale (il più usato in `layout.usati`), piè di pagina (`layout.pieDiPaginaRegex`), sezioni native (`sezioniNative`), nomi delle pillole presi da `partiNellOrdine[].segnali`, azienda (`metadati.company`). Risultato sul file visto: "Somiglia a: kick-off di progetto (78%)".

## 3. Mappa degli oggetti

Le **sezioni sono quelle native di PowerPoint** (`p14:sectionLst`): non ci sono slide divisorie.

| # | Sezione nativa | Slide | Tipo | Layout | Contenuto |
|---|---|---|---|---|---|
| 1 | Copertina | 1 | copertina | Title Slide | titolo "PROGETTO <NOME> KICK-OFF" (40 pt), sottotitolo con nome esteso del progetto e riferimento dell'AQ, data `gg/mm/aaaa`, loghi istituzionali in alto a destra, pannello verde a destra con stemma (Trinacria), loghi dei partner in basso |
| 2 | Indice | 2 | indice | Blank | "INDICE" (24 pt grassetto) + elenco **numerato** a due livelli (voci di primo livello 16 pt con `buAutoNum`, sotto-voci 14 pt con punto) |
| 3 | Introduzione e contesto | 3 | testo | 1_Title and Content | due paragrafi in grassetto, elenco con frecce verdi (priorità del programma), loghi dei fondi a destra, **barra verde** in basso con AQ di riferimento, importo e durata |
| 4 | Obiettivi | 4 | testo | 1_Title and Content | paragrafo introduttivo + **schema a esagono** (immagine PNG) con 5 obiettivi: freccia → quadrato colorato (freeform) + testo, colori accent3/accent4/accent2 |
| 5 | Ambito | 5 | scheda (1 riquadro) | 1_Title and Content | "INDIVIDUAZIONE e MANTENIMENTO": riquadro azzurro arrotondato `#DCEAF7` con icona SVG, intestazione verde scuro 16 pt grassetto, elenco con frecce a pentagono |
|   |   | 6 | scheda a righe | 1_Title and Content | 4 **componenti**: pillola colorata (testo bianco su `#00B095`, accent5, accent1, accent6) sopra un riquadro bianco con la descrizione (12 pt) |
|   |   | 7 | scheda a 4 riquadri | 1_Title and Content | griglia 2×2 di riquadri `#DCEAF7` con icona SVG, intestazione verde e punti elenco, uno per ambito |
|   |   | 8–11 | scheda ambito | 1_Title and Content | **modello ripetuto per ogni ambito**: paragrafo introduttivo; 3–4 componenti a pillola + descrizione (stessi colori della slide 6); linea verde; frase "Le funzionalità previste prevedono l'integrazione con alcune delle piattaforme abilitanti nazionali."; **tabella disegnata con forme** con colonne FUNZIONALITÀ · PIATTAFORMA ABILITANTE · FINALITÀ, una riga = una pillola verde scuro `#225546` con tre testi bianchi (10,5 pt, il primo in grassetto, il secondo in corsivo) |
| 6 | Masterplan | 12 | masterplan | 1_Title and Content | **Gantt come immagine SVG** (anni/mesi in alto, componenti con attività "Design e analisi funzionale / Sviluppo applicativi, Test e Implementazione / Rilascio e manutenzione applicativa", barre a freccia); testi a sinistra (introduzione, nota in piccolo) |
| 7 | Sintesi contratto esecutivo | 13 | tabella | 1_Title and Content | paragrafo in grassetto (AQ Consip, consuntivazione a SAL trimestrale) + **tabella nativa** 7 colonne × 8 righe: ID SERVIZIO, NOME SERVIZIO, METRICA, NOTE, PREZZO UNITARIO, QUANTITÀ, VALORE ECONOMICO; ultima riga TOTALE con 6 celle unite (`gridSpan=6`) e sfondo accent1; stile "Medium Style 2 - Accent 1" (prima riga e righe a bande; `tableStyleId {5C22544A-7EE6-4342-B048-85BDC9FD1C3A}`); valori in grassetto; il totale è la somma delle righe |

Ogni slide di contenuto ha: titolo in maiuscolo (o "Ambito - NOME"), paragrafo introduttivo nel segnaposto del corpo, piè di pagina "Kick-off Progetto BioSiris", numero di slide. Note dello speaker: 5 slide le hanno ma contengono **solo il numero della slide** (vuote in pratica).

Segnali delle parti, nell'ordine (dall'impronta):

| Parte | Slide | Segnali |
|---|---|---|
| copertina | 1 | `ph ctrTitle`, `ph subTitle`, `ph dt`, "Rectangle 6" accent1 a destra, 6 immagini |
| indice | 2 | testo INDICE 24 pt grassetto, elenco `buAutoNum` con sotto-voci di livello 1 |
| contesto | 3 | paragrafi in grassetto, `rightArrow` ×3, "Rectangle 6" accent3 in basso con AQ/importo/durata |
| obiettivi | 4 | 5 gruppi `custGeom` + TextBox, "Picture 6" esagono, "Straight Arrow Connector" |
| ambito-riquadro | 5 | `roundRect` `DCEAF7` grande, `homePlate` ×4, Graphic SVG |
| ambito-componenti | 6 | gruppi: `roundRect` bianco + pillola `roundRect` colorata + TextBox |
| ambito-griglia | 7 | 4 `roundRect` `DCEAF7`, 4 Graphic SVG, 8 TextBox |
| scheda-ambito (ripetibile) | 8–11 | titolo "Ambito - …", pillole Web Design/Programming/Database, "Straight Connector" accent1, "Text 85" ×3 intestazioni FUNZIONALITÀ/PIATTAFORMA ABILITANTE/FINALITÀ, righe `roundRect` `225546` + "Text 90" ×3 |
| masterplan | 12 | Picture SVG grande con testi anni/mesi, TextBox nota in piccolo |
| sintesi-contratto | 13 | `graphicFrame` tabella 7 colonne, ultima riga TOTALE `gridSpan 6`, `tableStyleId {5C22544A-7EE6-4342-B048-85BDC9FD1C3A}` |

Tabella del contratto (slide 13): larghezze delle colonne in EMU 1105786, 2072589, 1092566, 1150589, 1200167, 1150445, 1434911; regola VALORE ECONOMICO = PREZZO UNITARIO × QUANTITÀ, TOTALE = somma dei valori.

### Stile e convenzioni

- **Dimensione**: 16:9, 33,87 × 19,05 cm (12192000 × 6858000 EMU), formato "Widescreen".
- **Tema** "Office Theme", schema colori personalizzato: dk1 `#000000`, lt1 `#FFFFFF`, dk2 `#335B74`, lt2 `#DFE3E5`, accent1 `#225546` (verde scuro, colore guida), accent2 `#A9D7B6`, accent3 `#318B71`, accent4 `#42BA97`, accent5 `#1482AB` (blu), accent6 `#264457`, hlink `#6EAC1C`, folHlink `#B26B02`. Colori extra usati a mano: `#DCEAF7` (riquadri azzurri), `#00B095` (pillola verde acqua), `#767171` e `#292C35` (grigi), `#41B6E6`, `#247DE1`, `#C3E7DD`.
- **Caratteri**: tema Poppins (titoli e corpo). Nelle slide compaiono anche Helvetica (schede), Arial (punti elenco), Open Sans e **"FT Habit Trial"** (slide 8–11, carattere di prova non standard: da segnalare).
- **Dimensioni del testo**: titolo 24 pt grassetto (master), copertina 40 pt, corpo 12–14 pt, pillole 12 pt bianco, righe della tabella disegnata 10,5 pt, note 8–9 pt. Interlinea 130–150 % nei paragrafi introduttivi.
- **Layout disponibili** nel master: Title Slide, Title and Content, 1_Title and Content, Section Header, Two Content, Comparison, Title Only, Blank, Content with Caption, Picture with Caption, Title and Vertical Text, Vertical Title and Text. Usati: Title Slide (slide 1), Blank (slide 2), 1_Title and Content (slide 3–13).
- **Layout del master** `1_Title and Content`: numero slide in alto a destra con trattino verde, logo cliente in alto a sinistra con trattino verde, piè di pagina centrato, 4 loghi dei partner in basso (2 a sinistra, 2 a destra) separati da linee verticali `bg2`. Forme del layout: "Rectangle 12", "Rectangle 3", "Immagine 4", "Picture 8", "Picture 10", "Picture 13", "Picture 14", "Straight Connector 11", "Straight Connector 15".
- **Forme**: `roundRect` per riquadri e pillole, `homePlate` come freccia-elenco, `rightArrow` piccoli, `custGeom` per i quadrati con icona, connettori `line` per separatori e frecce. Nomi delle forme lasciati di default ("Rectangle: Rounded Corners 39", "Text 85/90") tranne le pillole, chiamate "Web Design", "Programming", "Database" (residuo di un modello grafico scaricato).
- **Convenzioni di denominazione**: file `<PROGETTO>_Kick-off_v<maggiore>.<minore>.<patch>.pptx`; titoli delle schede "Ambito - NOME AMBITO" in maiuscolo; componenti con nome "titolo (Backend)/(Frontend)/(API)/(DSS)".
- **Metadati**: `docProps/app.xml` Company "TXT e-solutions S.p.A.", applicazione "Microsoft Office PowerPoint 16", 1976 parole, 221 paragrafi; `docProps/core.xml` titolo vuoto, revisione 68; `ppt/authors.xml` con due co-autori (Microsoft 365); `ppt/revisionInfo.xml` e `ppt/changesInfos/changesInfo1.xml` con il registro delle ultime modifiche (29–30/09/2026, slide 5, 6, 7 e 12); erano presenti commenti, poi cancellati.
- **Media**: 11 PNG (loghi, stemma, esagono degli obiettivi), 6 SVG (5 icone Microsoft "Icons_TopographyMap/Target/ShoppingCart/Plant/Home" e il Gantt), 1 `hdphoto1.wdp` (effetto artistico su un'immagine della slide 3).
- **Glossario atteso** (sigle della PA che compaiono): AQ, SAC, PMO, SPID, CIE, PagoPA, AppIO, PDND, SEND, FESR, PSR, PSP, PAC, PRIU, SAL, FTE, GG, DSS, OMS, IAM, TIC, Consip.

### Caratteristiche trovate e uso possibile nell'app

| Caratteristica | Dove | Uso possibile nell'app |
|---|---|---|
| Sezioni native di PowerPoint | `presentation.xml` | struttura del documento senza slide divisorie; indice automatico; completezza rispetto al modello |
| Indice a due livelli numerato | slide 2 | abbinamento voce ↔ slide (anche per le sotto-voci "Ambito - X"); controllo "voce senza slide" corretto |
| Scheda ambito ripetuta (8–11) | slide 8–11 | parte **ripetibile** del modello: "nuovo kick-off con N ambiti" |
| Pillola = forma colorata + casella di testo trasparente sopra | 6, 8–11 | blocco "intestazione" con colore; cambio colore/testo per funzione |
| Tabella disegnata con forme (3 colonne) | 8–11 | trasformare in tabella logica (funzionalità, piattaforma, finalità); aggiungere una riga clonando la pillola; estrarre l'elenco delle piattaforme abilitanti del progetto |
| Tabella nativa con celle unite, stile e totale | 13 | lettura con stile e celle unite; modifica celle; controllo "totale = somma"; esportazione in Excel/GestioneCelle |
| Gantt come SVG con testi | 12 | lettura di anni/mesi, componenti, attività e barre → masterplan strutturato; collegamento con il piano di lavoro Excel (PdL) dello stesso progetto |
| Icone SVG di Office | 5, 7 | anteprima fedele (già ok); libreria di icone riusabile nelle nuove slide |
| Loghi e numero slide nel layout | layout 3 | anteprima con lo sfondo del layout; sostituzione del logo cliente per funzione |
| Glossario di sigle della PA | tutto | AQ, SAC, PMO, SPID/CIE, PagoPA, AppIO, PDND, SEND, FESR, PSR, PSP/PAC, PRIU, SAL, FTE, GG, DSS, OMS, IAM, TIC: glossario preimpostato e definizioni "SIGLA (significato)" |
| Registro revisioni, autori, azienda | `authors.xml`, `revisionInfo.xml`, `changesInfos/`, `app.xml` | "chi ha toccato cosa e quando" nella revisione |
| Carattere di prova "FT Habit Trial", caratteri fuori tema | slide 8–11 | controllo "caratteri non standard" |
| Testi che sforano i riquadri | 5, 7 (intestazioni lunghe) | controllo "testo che non entra" |

## 4. Parti fisse e parti variabili

**Fisse** (uguali tra un kick-off e l'altro dello stesso raggruppamento):

- tema, caratteri, layout `1_Title and Content` con loghi dei partner, trattini verdi e numero slide;
- le 7 sezioni native nell'ordine: Copertina, Indice, Introduzione e contesto, Obiettivi, Ambito, Masterplan, Sintesi contratto esecutivo;
- la frase fissa delle schede ambito ("Le funzionalità previste prevedono l'integrazione con alcune delle piattaforme abilitanti nazionali.") e le tre colonne FUNZIONALITÀ · PIATTAFORMA ABILITANTE · FINALITÀ;
- le 7 colonne della tabella del contratto e la riga TOTALE unita.

**Variabili**:

- nome del progetto (titolo della copertina, piè di pagina "Kick-off Progetto <Nome>", nome del file), data, logo del cliente, stemma;
- testi di contesto, importo e durata nella barra verde; i 5 obiettivi; il paragrafo introduttivo di ogni slide;
- **numero di ambiti**: la scheda ambito (slide 8–11) è la parte **ripetibile**; la griglia 2×2 della slide 7 e le sotto-voci dell'indice vanno tenute allineate a mano al numero di ambiti;
- componenti per ambito (3–4 pillole) e righe della tabella disegnata (funzionalità/piattaforma/finalità);
- il Gantt del masterplan (immagine SVG rifatta dal piano di lavoro Excel) e la sua nota;
- le righe della tabella del contratto (servizi, quantità, prezzi) e il totale.

Segnaposto: il file non ne ha di espliciti. Con **Nuovo da modello** e *Testi come segnaposto*, titoli e paragrafi diventano "Titolo della slide", "Testo del paragrafo"…

## 5. Regole di modifica, aggiunta ed eliminazione

- **Aggiungere un ambito**: duplicare una slide "scheda ambito" (8–11) dentro la sezione nativa "Ambito"; aggiungere la sotto-voce "Ambito - NOME" nell'indice (slide 2) e il riquadro nella griglia 2×2 della slide 7 (a mano: la griglia non si adatta da sola). Il titolo va scritto "Ambito - NOME AMBITO" in maiuscolo, altrimenti l'abbinamento con l'indice si perde.
- **Aggiungere una riga alla tabella disegnata** (8–11): clonare la pillola `roundRect` `#225546` con i suoi tre testi ("Text 90") e spostarla in basso; le intestazioni ("Text 85") restano. In Cippi le celle si correggono una per una in Modifica.
- **Tabella del contratto** (13): ogni riga rispetta VALORE ECONOMICO = PREZZO UNITARIO × QUANTITÀ; il TOTALE deve restare la somma delle righe (Cippi lo controlla: "Totale verificato"). Con **Aggiungi riga** Cippi clona una riga esistente con il suo stile e la riga del totale resta unita (`gridSpan=6`).
- **Piè di pagina e scritte fisse del layout**: si cambiano con **Trova e sostituisci** e *anche piè di pagina e layout* ("Kick-off Progetto X" → "SAL 1 Progetto X"); nel layout è una regola applicata all'esportazione, portata nel file da "Salva versione".
- **Riordino, duplicazione, eliminazione di slide**: dal pannello Struttura in Modifica; all'esportazione le immagini non più usate vengono tolte e i contatori (`Slides`, `Notes`, `TitlesOfParts`) aggiornati.
- **Masterplan**: il Gantt si legge solo se è un'immagine SVG con i testi (come lo esportano PowerPoint ed Excel); un PNG resta un'immagine. Quando cambia il piano di lavoro Excel, l'immagine va rifatta.
- **Caratteri**: evitare caratteri fuori tema e di prova (Cippi li segnala); il testo lungo nelle intestazioni delle slide 5 e 7 sfora i riquadri.
- Master, layout, tema, immagini e forme restano quelli originali nel file esportato.

## 6. Funzioni consigliate dell'app

Funzioni di Cippi esistenti (nomi come in `docs/CIPPI.md`):

1. **Importa PowerPoint** nel progetto del cliente → modalità **Revisione** (Percorso di lettura, Controlli, Glossario, pannello **Documento** con "Somiglia a: kick-off di progetto").
2. **Salva come modello** "Kick-off <raggruppamento>": le parti ripetibili sono la *scheda ambito* (8–11); la scheda 7 (griglia 2×2) va tenuta allineata a mano al numero di ambiti. Chi l'ha creato o un Manager del progetto può **condividerlo con tutti**.
3. **Nuovo da modello** per il kick-off successivo: copertina, indice, contesto, obiettivi, ambito × N, masterplan, sintesi contratto; con *Testi come segnaposto*.
4. **Glossario** del progetto: inserire subito le sigle della PA (vedi sezione 3), valgono per tutti i documenti del progetto; il glossario della PA preimpostato propone i significati mancanti.
5. **Punti chiave**: i grassetti della slide 3 (contesto), importo e durata, le piattaforme abilitanti per ambito, la nota del masterplan ("vista di alto livello…").
6. **Appunti** accanto al documento: il piano di lavoro Excel (PdL) dello stesso progetto, da cui nasce il masterplan (vedi `../xlsx/piano-di-lavoro-txt-biosiris.md`).
7. **Modifica**: testi, celle delle tabelle (vere e disegnate), **Aggiungi riga**, ordine delle slide; **Trova e sostituisci**; **Scarica** il `.pptx` o **Salva versione** nella cartella del progetto.

Da realizzare (uso possibile indicato nell'analisi, non ancora nell'app):

- esportazione della tabella del contratto verso Excel / GestioneCelle;
- collegamento tra il masterplan letto dal Gantt e il piano di lavoro Excel dello stesso progetto (confronto, "esporta il Gantt verso Cippi" proposto anche nella scheda del PdL);
- libreria di icone SVG riusabile nelle slide nuove;
- sostituzione del logo del cliente per funzione;
- elenco delle piattaforme abilitanti del progetto estratto dalle tabelle disegnate.

## 7. Stato dell'app su questo template

**Con Cippi 0.1.0 (prima dell'analisi, ANALYZER 3):** 13 slide lette in 0,1 s (tema, caratteri, 12 layout, forme, immagini PNG e SVG, tabella come testi, note); tipi sbagliati in 5 casi (slide 1 "testo" invece di copertina, 5 "schema", 6 e 11 "testo" invece di scheda, 12 "testo" invece di masterplan; giusti: indice, tabella, schede 7–10); una sola sezione ("Apertura": non leggeva le sezioni native); indice con 11 voci ma 5 falsi avvisi "voce senza slide" (sotto-voci e titoli "Ambito - X") più "manca una slide di titolo" (falso): 6 falsi avvisi; piè di pagina e data contati come blocchi; pillole come "paragrafo" e non "intestazione"; tabella disegnata come forme sciolte; tabella vera senza celle unite né stile; glossario con 16 sigle, 5 spiegate (PSR, PSP, TIC, DSS, OMS), "FINALITÀ" letta come "FINALIT", BIOSIRIS non spiegato (8 lettere), PagoPA e AppIO non visti; anteprima fedele (colori, posizioni, SVG, Gantt) ma senza loghi e numero slide del layout, tabella senza stile né celle unite, intestazioni che sforano per il carattere sostituito, quadrati `custGeom` disegnati come rettangoli; esportazione dopo riordino/duplicazione/eliminazione che si riapre ma lascia 3 immagini orfane (`image11.png`, `image12.svg`, `image17.svg`) e non aggiorna `Notes`/`TitlesOfParts` in `app.xml`. Punteggio **77%**, abbassato dai falsi avvisi.

**Con Cippi 0.2.0 (dopo le funzioni aggiunte il 01/10/2026, vedi `docs/REPORT/2026-10-01-cippi-kickoff.md`):**

- 13 tipi giusti su 13: copertina, indice, 2 testo, 7 schede, masterplan, tabella.
- 7 sezioni native (Copertina, Indice, Introduzione e contesto, Obiettivi, Ambito, Masterplan, Sintesi contratto esecutivo).
- Nessun falso avviso; controlli utili: "Totale verificato" nella sintesi del contratto (3.941.900 €; importo del contratto: vedi `../CONFLITTI.md`, voce 2), testo ridotto al 90% in 4 slide. Punteggio **97%**.
- Pillole come intestazioni con il loro colore; la tabella disegnata delle schede ambito letta come tabella FUNZIONALITÀ · PIATTAFORMA ABILITANTE · FINALITÀ.
- Masterplan: piano da 2026-10 a 2028-12, 6 componenti e 22 attività con i periodi (per esempio Gestione informatizzata dei vivai da 2027-02 a 2028-12).
- Glossario: 30 sigle, 26 spiegate (BIOSIRIS, PSR, PSP, TIC, DSS, OMS dal documento; SPID/CIE, PagoPA, AppIO, PDND, SEND, FESR, SAL, FTE... dal glossario della PA).
- Documento: autrice, 2 co-autori, azienda TXT e-solutions, ultime modifiche alle slide 5, 6, 7 e 12 del 30/09/2026, 1976 parole.
- Riconosciuto come "kick-off di progetto" al 78% rispetto a questa scheda.
- Anteprima con loghi e barre del layout, tabella con celle unite e stile, forme esagonali degli obiettivi disegnate.
- Esportazione con riordino, cella e riga di tabella aggiunte, piè di pagina sostituito: file valido (`validate.py`: tutte le verifiche passate), nessun media orfano (15 media su 18, i 3 orfani tolti).

Le funzioni proposte il 01/10/2026 sono state approvate e realizzate in Cippi 0.2.0. Limiti che restano (da `docs/CIPPI.md`): le righe nuove delle tabelle si vedono nel file esportato e dopo "Salva versione", non nell'anteprima; i grassetti dentro una frase modificata vanno rifatti in PowerPoint; i caratteri dell'anteprima sono quelli del PC.

## 8. Dubbi aperti

- Il carattere **"FT Habit Trial"** (slide 8–11) è di prova: chiedere all'autrice se va sostituito con Poppins.
- Le intestazioni lunghe delle slide 5 e 7 sforano i riquadri: errore del file o scelta?
- Il file da cui nasce l'impronta è riconosciuto solo al **78%**: quali segnali non tornano (nomi delle forme, sezioni, azienda)? Da capire prima di fissare una soglia.
- La scheda dice che con i segnali 1+2 il file è "della famiglia" (kick-off, SAL, chiusura dello stesso raggruppamento): la presentazione SAL vista finora (`sal-presentazione.md`, progetto R-CAP.AC) è di un'altra famiglia grafica (Titillium Web, blu `164194`). Un SAL di questo raggruppamento non è ancora stato visto.
- Il raggruppamento del kick-off (TXT e-solutions, HSPI, Deda Next, Webgenesys, RPC Net) non coincide con le 18 aziende del RTI dell'AQ ID 2610 elencate nel Piano Operativo (dove ci sono HSPI e RPCNET ma non TXT, Deda Next, Webgenesys): vedi `../CONFLITTI.md`, voce 1.
- Il masterplan copre 2026-10 → 2028-12 (27 mesi) mentre il piano di lavoro Excel arriva a 2029-12 e il Piano Operativo limita ogni servizio a 24 mesi: da verificare come si conciliano (vedi `../fascicoli/fascicolo-aq-id2610.md`).

## 9. Da classificare

- Impronta, blocco `cippi` (misura storica con Cippi 0.1.0 / ANALYZER 3): tipi riconosciuti per slide 1 "testo (atteso copertina)", 2 "indice", 3 "testo", 4 "testo", 5 "schema (atteso scheda)", 6 "testo (atteso scheda)", 7–10 "scheda", 11 "testo (atteso scheda)", 12 "testo (atteso masterplan)", 13 "tabella"; punteggio 77; falsi avvisi 6.
- La prima versione della scheda (commit `e5ab667`) chiudeva con: "Le funzioni mancanti e la loro priorità sono nella proposta inviata il 01/10/2026 (da approvare prima di toccare il codice)"; la seconda (`fff10ab`) con: "Le funzioni proposte il 01/10/2026 sono state approvate e realizzate in Cippi 0.2.0".
- Nomi dell'autrice e dei co-autori (sezione 1) e importo del contratto (sezione 7): la regola della memoria vieta i dati personali e del cliente; sono qui perché erano nella scheda originale. Decisione in `../CONFLITTI.md`, voce 2.
- Tema: dk1 `000000` e lt1 `FFFFFF` (dall'impronta; la scheda originale non li elencava).

## 10. Fonti

- `admiring-hopper`, sessione `session_01GqNo1MzxngbR1RQrFUDijL`, commit `e5ab667` (docs/MEMORIA/pptx/kickoff-txt-biosiris.md e .impronta.json, prima versione; docs/MEMORIA/README.md): identità, struttura, stile, impronta, caratteristiche trovate, stato con Cippi 0.1.0, funzioni da usare.
- `admiring-hopper`, commit `fff10ab` (stessa scheda, aggiornata; `docs/REPORT/2026-10-01-cippi-kickoff.md`; `docs/CIPPI.md`): misure con Cippi 0.2.0, esportazione valida, limiti che restano, nomi reali delle funzioni.
- `kickoff-txt-biosiris.impronta.json` (admiring-hopper, `e5ab667`): colori completi del tema, layout disponibili, forme del layout, segnali per parte, larghezze della tabella, glossario atteso, blocco `cippi`.
- `app/src/cippi/impronta.js` (admiring-hopper, `fff10ab`): quali campi dell'impronta vengono confrontati.
- `cool-noether`, commit `74c4dad` (`../docx/kit-aq-id2610.conoscenza.json`, `../fascicoli/fascicolo-aq-id2610.md`) e `8314b5a` (`../xlsx/piano-di-lavoro-txt-biosiris.md`): aziende del RTI, catena dei documenti, sinergia con il piano di lavoro.
- `awesome-cray`, commit `51e11c0` (`sal-presentazione.md`, stessa cartella): confronto con la famiglia grafica del SAL R-CAP.AC.
