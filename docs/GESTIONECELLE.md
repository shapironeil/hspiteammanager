# GestioneCelle — mappe dei processi

GestioneCelle porta nel portale il lavoro del file Excel BPB: macro processi, processi e micro processi con codici automatici `1`, `1.2`, `1.2.3`.

Fino alla versione 0.6 del portale si chiamava **Trama**. I vecchi collegamenti `#/trama` portano qui. Le tabelle `trama_*` del database sono diventate `celle_*` con la migrazione 8, senza perdere dati. Si apre dal menu del portale oppure come app a sé, all'indirizzo `/celle/` (vedi `docs/APP.md`).

## Stile

GestioneCelle ha uno stile proprio, "Excel glass": vetro bianco e verde con un tocco di nero (barra degli strumenti, codici), controlli come quelli di iPhone, tabelle come un foglio di calcolo. Vale dentro il portale e nell'app a sé (`/celle/`, sempre chiara).

## Da dove nasce

Il file di partenza ha tre fogli:

- **Istruzioni**.
- **Anagrafica Processi BPB**, con le tabelle `tblMacro` (livello N, ID scritto a mano) e `tblProcessi` (livello N.N). L'ID del processo nasce dall'ordine delle righe.
- **BPB**, con la tabella `tblBPB`: un micro processo per riga, livello N.N.N. L'ID nasce dall'ordine delle righe dentro il processo.

I fogli sono collegati da una "Chiave (tecnica)" = `ID Macro|Nome processo`, dove il nome del processo viene confrontato senza spazi in eccesso (TRIM).

Il **Check** del file segnala:

- macro o processo non in anagrafica;
- ordine non crescente;
- righe non consecutive;
- sotto processo duplicato o mancante;
- processo duplicato;
- voce non ancora usata.

In GestioneCelle la struttura ad albero rende impossibili per costruzione gli errori di ordine e di consecutività. Restano i controlli su:

- ID macro mancante o duplicato;
- nomi mancanti;
- processi e sotto processi duplicati (spazi ignorati come in Excel);
- voci senza figli.

## Cosa si fa

| Azione | Come |
|---|---|
| Nuova mappa | GestioneCelle → *Nuova mappa*. Appartiene a un progetto: la vedono i membri e gli ospiti a tempo |
| Importare il file Excel | Mappa vuota → *Importa Excel*. Il formato BPB è riconosciuto da solo: ordine e codici restano quelli del file. Per altri fogli si sceglie quale colonna è macro, processo, sotto processo, ambito, responsabile, scadenza… |
| Navigare | *Processi* (prima si chiamava Albero): si apre livello per livello; il percorso sopra la scheda mostra dove sei. *Tabella*: come il foglio BPB, con filtri per testo, ambito, stato, responsabile, voci scadute e voci con problemi |
| Modificare la struttura | *Modifica*: a sinistra la **tabella di riferimento** (tutte le voci in ordine, come un foglio, con le righe numerate; si filtra per livello: tutti, macro, processi, micro; frecce ↑ ↓ per scorrere), a destra le **caratteristiche** della voce scelta. La barra in alto aggiunge un **predecessore** (stesso livello, prima), un **successore** (dopo), una sotto-voce, sposta su e giù, elimina. I codici delle voci successive si ricalcolano **a cascata**: il foglio evidenzia quelli cambiati e mostra il codice di prima |
| Aggiungere | Macro, processo o micro in fondo, oppure *dopo questa voce*: i codici successivi scalano da soli |
| Spostare | Su e giù, oppure in un altro macro o processo. Il portale dice il codice prima e dopo |
| Scadenze, responsabile, stato, note | Nella scheda della voce. Le voci scadute sono in rosso; ognuno vede le sue scadenze nella Home |
| Note del team | Commenti con autore e data, sotto ogni voce |
| Storico | Ogni modifica (chi, quando, prima e dopo) è nella scheda della voce e nello storico della mappa |
| Eliminare | Vedi sotto |
| Excel | *Scarica Excel*: se la mappa ha un **file di origine** (il file importato, o uno scelto dalle impostazioni) il file scaricato è **quel file con i dati aggiornati**: stessi colori, intestazioni, colonne, larghezze, fogli, formule, menu a tendina e colori condizionali, nessuna colonna nuova (vedi sotto). Senza file di origine: il formato BPB interno di GestioneCelle, tre fogli con le stesse formule del file BPB più Responsabile, Scadenza e Stato. *Salva nel progetto*: lo stesso file in `progetti/<progetto>/GestioneCelle/`, con le versioni precedenti. Il file si può modificare in Excel e reimportare |

## Il file di origine: stesso aspetto all'andata e al ritorno

Chi lavora sul file Excel deve ritrovarlo **com'era**: stessi colori, stesse colonne, stessi fogli. Per questo, dalla 0.9.3, il file Excel da cui nasce una mappa resta con la mappa come **file di origine** e l'esportazione non ricostruisce più il file da zero.

- **Quando si salva.** Importando un file nel formato BPB in una mappa che non ha ancora un file di origine. Il sottotitolo della mappa dice «Excel come il file di origine «nome»»; lo Storico registra *file di origine conservato*.
- **Che cosa fa l'esportazione.** Riscrive **soltanto le righe di dati** delle tre tabelle `tblMacro`, `tblProcessi` e `tblBPB`, dentro il file di origine. Ogni cella nuova prende lo stile della sua colonna (quello più usato nelle righe del file) e l'altezza di riga del file; le colonne calcolate usano **la formula del file** (anche matriciale), con il valore già calcolato accanto, ed Excel ricalcola tutto all'apertura. Le intestazioni, i titoli sopra le tabelle, le larghezze, i fogli che GestioneCelle non usa (Istruzioni, legende…), le celle unite, gli stili e le stringhe condivise restano **byte per byte** com'erano.
- **Che cosa si allarga da solo.** I colori condizionali, i menu a tendina e i nomi definiti che coprivano le righe della tabella si allungano fino alla nuova ultima riga; gli intervalli delle tabelle si aggiornano; i filtri e gli ordinamenti attivi vengono tolti (si riferivano alle righe di prima) e la catena di calcolo viene rimossa (Excel la ricostruisce).
- **Nessuna colonna nuova.** Responsabile, Scadenza e Stato finiscono nel file solo se il file ha già quelle colonne (per esempio perché è un file esportato da GestioneCelle o perché il team le ha aggiunte alla tabella `tblBPB`): altrimenti restano solo in GestioneCelle. Le colonne del team che GestioneCelle non conosce (una "Priorità", un "Referente") restano al loro posto con il loro colore, ma **vuote**: GestioneCelle non ha quei dati. Chi ha una data in una colonna senza formato data la trova scritta come testo `gg/mm/aaaa`.
- **Che cosa non si conserva.** I colori messi a mano su singole righe (vale lo stile della colonna), i commenti agganciati alle celle delle tabelle, le righe nascoste da un filtro.
- **Impostazioni della mappa → File di origine** (chi gestisce la mappa): *Scarica l'originale* com'era stato caricato; *Sostituisci…* / *Scegli un file…* per usare un altro file BPB come modello, anche per una mappa nata da zero (si prende solo l'aspetto: i dati restano quelli della mappa; un file che non ha le tre tabelle viene rifiutato); *Togli* per tornare al formato BPB interno.
- **Se qualcosa non va** (file di origine illeggibile): l'esportazione usa il formato interno e lo segnala in *Errori e bug*.

API: `GET /api/celle/maps/:id/template` (scarica l'originale), `PUT …/template?name=` (sostituisce, solo file BPB), `DELETE …/template` (toglie); la scheda della mappa (`GET /api/celle/maps/:id`) ha `template: { name, size, importedAt, by } | null`. Tabella `celle_map_templates` (migrazione 12). Codice: `app/src/celle/xlsx-template.js`; il formato interno resta in `app/src/celle/xlsx-write.js`.

## Eliminare senza fare danni

1. Prima di eliminare, GestioneCelle mostra cosa si porta dietro: processi e micro, note, scadenze aperte, voci protette, voci di cui sono responsabili altre persone.
2. Se ci sono **voci protette** o **voci di altri responsabili**, chi non è Manager del progetto non elimina: parte una **richiesta**. I Manager del progetto la vedono nella scheda *Richieste* e decidono se eliminare o rifiutare.
3. Tutto va nel **cestino della mappa** e si può ripristinare con i codici ricalcolati.

Proteggere una voce e approvare le richieste spetta ai Manager del progetto (o all'Hacker). Chi ha creato una mappa può rinominarla, eliminarla e ripristinare dal cestino.

## Excel per il web

Aprire e comandare Excel per il web dal portale richiede Microsoft 365 con un'app registrata dall'IT (Microsoft Graph). Per ora GestioneCelle lavora nel portale e **genera e rilegge** il file Excel con le stesse formule. Vedi `PROPOSTE-2026-10-01.md`.

## Verifiche fatte

- Il file BPB reale è stato importato: 25 macro, 128 processi, 512 micro. GestioneCelle trova gli stessi 4 sotto processi duplicati del Check di Excel.
- L'Excel esportato è stato confrontato riga per riga con l'originale (ambito, ID macro, ID processo, ID micro, check): 0 differenze.
- L'esportazione nel file di origine è provata con un file costruito "come lo salva Excel" (stringhe condivise, stili propri, formule condivise e matriciali, catena di calcolo, filtri attivi, colori condizionali e convalide su poche righe, nome con intervallo fisso, foglio Legenda con celle unite, colonna del team): stili, stringhe condivise, foglio Legenda e intestazioni escono identici byte per byte; le righe nuove hanno stili, altezza e formule del file; intervalli, colori condizionali, menu a tendina e nomi si allargano; nessuna colonna nuova; il file si rilegge e si reimporta (`app/test/celle.test.js`).
- **Da verificare in Excel**: il ricalcolo delle formule (`LET` e `TEXTJOIN` richiedono Excel 2021/365) e l'apertura senza avviso di riparazione del file esportato nel file di origine. In questo ambiente non c'è un foglio di calcolo per provarlo.
