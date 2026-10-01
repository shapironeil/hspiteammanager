# Conflitti e contraddizioni tra le analisi — decide il proprietario

Trovati nell'unificazione del 01/10/2026 (ramo `claude/integrazione-2026-10-01`) delle schede scritte da quattro agenti: `admiring-hopper` (kick-off PowerPoint), `cool-noether` (piano di lavoro Excel e kit Word dell'AQ ID 2610), `awesome-cray` (fascicolo SAL). Nessuna delle due versioni è stata scelta: in ogni scheda ci sono entrambe. Qui, per ogni voce: cosa, chi dice cosa, cosa serve decidere.

## A. Conflitti da decidere

### 1. Il fascicolo SAL (R-CAP.AC) fa parte del fascicolo AQ ID 2610? E chi è il raggruppamento?

- **cool-noether** (`fascicoli/fascicolo-aq-id2610.md`, scheda del Piano Operativo, commit `74c4dad`): "I modelli ricevuti il 1° ottobre 2026 (su più rami) appartengono tutti al ciclo di vita di un Contratto Esecutivo dell'AQ Consip ID 2610, Lotto 1", e mette il SAL di awesome-cray in fondo alla catena Piano Operativo → piano di lavoro → kick-off → SAL. La conoscenza del kit (`docx/kit-aq-id2610.conoscenza.json`, dal cap. 7 del Piano Operativo) elenca 18 aziende del RTI dell'AQ: Engineering (capofila), NTT Data, Schema31, Eustema, Perfexia, **HSPI**, Consis, ICS 4, DGS, **RPCNET**, XD Speed Solution, Advantech, Medas, Esri Italia, Società Gruppo ISC, Progesi, IFM, EDP La Traccia.
- **awesome-cray** (`fascicoli/fascicolo-sal.md`, commit `51e11c0`): i due modelli SAL sono del progetto **R-CAP.AC** (PN "Capacità per la Coesione 2021-2027", Priorità 1 – Azione 1.1.4), eseguito da un RTI non nominato per un'Amministrazione regionale; il verbale cita AQ, Piano dei Fabbisogni, Piano Operativo e Contratto Esecutivo ma **non dice quale AQ**. L'identità visiva (Titillium Web, blu `164194`) è diversa da quella del kick-off.
- **admiring-hopper** (`pptx/kickoff-txt-biosiris.md`, commit `e5ab667`): il kick-off BIOSIRIS è presentato da "TXT e-solutions con HSPI, Deda Next, Webgenesys e RPC Net" sotto "AQ SAC 3 - Lotto 1 (ID 2610)"; la scheda del piano di lavoro (cool-noether) dà come fornitore "TXT e-solutions S.p.A. (con Deda Next, Webgenesys)". **TXT e-solutions, Deda Next e Webgenesys non sono tra le 18 aziende del RTI** del Piano Operativo.

Da decidere / verificare: (a) se il SAL R-CAP.AC è dello stesso AQ ID 2610 e dello stesso raggruppamento, oppure se i due fascicoli vanno tenuti separati; (b) il rapporto tra TXT e-solutions, Deda Next, Webgenesys e il RTI dell'AQ (subappalto, consorzio, altro lotto, altro accordo?), perché cambia gli Owner ammessi nel piano di lavoro e il cap. 7 di un Piano Operativo per BIOSIRIS. Fino alla decisione il fascicolo AQ include il SAL "per ipotesi" e lo dice.

### 2. Dati personali e dati del cliente nelle schede

- **Regola** (awesome-cray, `docs/memoria/README.md`: "Niente dati aziendali… I nomi delle persone trovati nei file non vengono riportati"; cool-noether, prima versione in `docs/MODELLI-FILE/README.md`, commit `0fe8189`: "mai dati aziendali (nomi di persone, percorsi SharePoint, contenuti dei progetti)"; `docs/REGOLE-AGENTI.md` §1: "nessun dato del cliente: solo struttura, stile, regole, misure").
- **Contenuto** (admiring-hopper, `pptx/kickoff-txt-biosiris.md`): la scheda riporta il nome dell'autrice e dei due co-autori del file (sezione 1) e l'importo totale del contratto letto dalla tabella della slide 13 (sezione 7, "Totale verificato (3.941.900 €)"). Sono stati conservati perché l'unificazione non doveva perdere informazioni.

Da decidere: togliere nomi e importo dalla scheda (e dalla copia in `_archivio/`, che li conserva, e dalla cronologia git) oppure ammettere nelle schede i nomi degli autori interni e le misure di controllo. Nelle nuove schede e nel README i nomi non sono stati ripetuti.

### 3. Nomi dei template SAL fuori convenzione

- **admiring-hopper** (`README.md`, commit `e5ab667`): il nome del template è `<tipo-di-documento>-<fornitore>-<progetto>` (es. `kickoff-txt-biosiris`); cool-noether ha seguito la regola (`piano-di-lavoro-txt-biosiris`, `piano-operativo-consip-id2610`…).
- **awesome-cray** (`modelli.json`, commit `51e11c0`): id `sal-presentazione` e `sal-verbale`, senza fornitore né progetto (il fornitore non è nominato nel file; il progetto è R-CAP.AC).

Nell'unificazione i nomi sono rimasti `sal-presentazione` e `sal-verbale` (sono quelli indicati per i file e i collegamenti). Da decidere: rinominarli (per esempio `sal-presentazione-rti-rcapac` / `sal-verbale-rti-rcapac`) o accettare che i template senza fornitore noto abbiano un nome corto.

### 4. Metodo di riconoscimento delle presentazioni (.pptx)

- **admiring-hopper** (`README.md` e `app/src/cippi/impronta.js`, commit `fff10ab`): un file corrisponde se coincidono tema (colori e caratteri), layout principale e piè di pagina; contano anche sezioni native, nomi di forme non di serie e azienda. È il metodo **realizzato** in Cippi 0.2.0.
- **awesome-cray** (`docs/memoria/README.md` e scheda `sal-presentazione`): confrontare caratteri **usati nelle slide**, colori del brand, **immagini per dimensione**, nomi dei layout e **layout con testo fisso** ("R-CAP.AC"), titoli di capitolo.

Per il template SAL il metodo realizzato è debole: il tema è quello standard di Office 2023 (accent1 `156082`), il layout principale è "Titolo e contenuto" e non c'è piè di pagina, quindi molte presentazioni italiane con tema standard possono "somigliare" al SAL e il SAL vero può non essere riconosciuto. L'impronta `pptx/sal-presentazione.impronta.json` contiene i dati di entrambi i metodi. Da decidere: estendere il confronto di `impronta.js` (immagini per dimensione, testi fissi dei layout, caratteri usati) e con quali pesi. È una modifica al codice: non fatta nell'unificazione.

*Aggiornamento (ramo `claude/awesome-cray-8lgn1k`)*: il metodo di awesome-cray è realizzato in `app/src/modelli.js` (legge le stesse impronte, anche nella forma unificata, per `.pptx` e `.docx`) e il risultato arriva all'interfaccia di Cippi nel campo `modello` accanto a `impronta` (metodo di admiring-hopper). Sul SAL vero dà 100/100, su una presentazione qualunque 5/100. Resta da decidere se unire i due confronti in un solo punteggio.

## B. Divergenze risolte nell'unificazione (da confermare)

### 5. Campo del formato: `tipo` (awesome-cray) contro `formato` (admiring-hopper, cool-noether)

`modelli.json` usava `"tipo": "pptx"` e un oggetto `impronta` annidato; le impronte `*.impronta.json` usano `"formato": "pptx"` al primo livello, che è ciò che legge `impronta.js`. Nei due file nuovi (`pptx/sal-presentazione.impronta.json`, `docx/sal-verbale.impronta.json`) ci sono **entrambi**: tutti i campi originali di `modelli.json` (compreso `tipo`, `id`, `scheda`, `fascicolo`, `nomeFile` come stringa, `impronta`, `funzioni`, `mancanti`) più `template`, `formato`, `app`, `provenienza` e i campi con i nomi letti dal codice (`tema`, `layout`, `sezioniNative`, `partiNellOrdine`, `metadati`). Il campo `scheda` punta al nuovo percorso; quello vecchio è in `provenienza.schedaOriginale`.

### 6. Il README era di due agenti

`docs/MEMORIA/README.md` è stato creato da admiring-hopper (`e5ab667`) ed esteso da cool-noether (`8314b5a`: righe xlsx e paragrafo sull'impronta dei `.xlsx`; `74c4dad`: righe docx, fascicolo e paragrafo sui `.docx`). La copia archiviata sta in `_archivio/2026-10-01/admiring-hopper/MEMORIA/README.md` (una sola copia, con la nota nel README dell'archivio).

### 7. Due fascicoli, non uno

Il fascicolo SAL resta un file a sé (`fascicoli/fascicolo-sal.md`) e il fascicolo AQ lo cita "per ipotesi" (voce 1). Se il proprietario conferma che il SAL è dello stesso contratto, i due file si possono unire.

### 8. Stato di Cippi nelle schede SAL

Le schede di awesome-cray sono state scritte con Cippi 0.1.0 (ore 14:06); Cippi 0.2.0 (admiring-hopper, ore 14:36) ha aggiunto tabelle, trova e sostituisci anche nei layout, sezioni native e modelli noti. La lista "mancanti" del SAL è riportata com'era, con la nota che va rimisurata: non è una contraddizione, ma una misura vecchia di mezz'ora.
