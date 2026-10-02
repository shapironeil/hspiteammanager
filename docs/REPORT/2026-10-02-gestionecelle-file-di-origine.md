# GestioneCelle 0.9.3 — l'Excel esportato ha lo stesso aspetto del file importato

Nota di fine lavoro (regole in `docs/REGOLE-AGENTI.md`, §4). Ramo `claude/focused-pasteur-o83vl4`, 2 ottobre 2026. Partito da `origin/main` (0.11.1, commit `601bdc2`).

## Il problema

Chi lavorava sul file Excel esportato da GestioneCelle si ritrovava **colori e colonne diversi** da quelli del file BPB che conosceva: l'esportazione ricostruiva il file da zero con uno stile proprio (intestazioni blu e grigie, colonne in più Responsabile/Scadenza/Stato, foglio Istruzioni riscritto). Per i manager, che lavorano sempre sullo stesso file, ogni colore o colonna nuova è un ostacolo. Richiesta: **importazione ed esportazione devono usare e conservare lo stesso stile**.

## Che cosa ho fatto

- **Il file di origine resta con la mappa.** Quando si importa un file nel formato BPB in una mappa che non ne ha ancora uno, il file viene conservato (tabella `celle_map_templates`, migrazione 12 in `app/src/db.js`). Lo Storico registra *file di origine conservato*; la risposta dell'importazione ha `template: true`.
- **L'esportazione riscrive i dati dentro il file di origine** (`app/src/celle/xlsx-template.js`, nuovo): solo le righe di dati di `tblMacro`, `tblProcessi` e `tblBPB` cambiano. Per ogni colonna si riconosce il nome (gli stessi dell'importazione), si prende lo stile più usato nelle righe del file e la formula del file (anche matriciale) con il valore già calcolato. Intestazioni, titoli, larghezze, fogli non usati, celle unite, `styles.xml` e `sharedStrings.xml` restano **byte per byte**. Si allargano gli intervalli delle tabelle, i formati condizionali, le convalide (anche in `extLst`) e i nomi definiti con intervallo fisso; si tolgono filtri/ordinamenti attivi e `calcChain.xml`; si forza `fullCalcOnLoad`. Le date vanno come numero seriale solo se la colonna ha un formato data, altrimenti come testo `gg/mm/aaaa`. Le righe dei totali (se ci sono) seguono la tabella.
- **Nessuna colonna nuova**: Responsabile, Scadenza e Stato finiscono nel file solo se il file le ha. Le colonne del team sconosciute a GestioneCelle restano, con il loro stile, ma vuote. Decisione presa per la richiesta esplicita «niente nuove variabili o colori»; è scritta in `docs/GESTIONECELLE.md`.
- **Senza file di origine** (mappa nata da zero o da un foglio generico) resta il formato BPB interno (`xlsx-write.js`, immutato). Se il file di origine non si riesce a usare, l'esportazione ricade sul formato interno e lo segnala in *Errori e bug*.
- **Rotte** (`app/src/routes/celle.js`): `GET /api/celle/maps/:id/template` scarica l'originale; `PUT …/template?name=` lo sostituisce o lo imposta (solo file con le tre tabelle, solo chi gestisce la mappa); `DELETE …/template` lo toglie. `GET /api/celle/maps/:id` ha `template: { name, size, importedAt, by } | null`.
- **Interfaccia** (`app/public/js/celle.js`): sottotitolo della mappa «Excel come il file di origine «nome»»; suggerimento su *Scarica Excel* e *Salva nel progetto*; in *Impostazioni della mappa* la sezione **File di origine** (Scarica l'originale, Sostituisci…/Scegli un file…, Togli); l'avviso dopo l'importazione dice che il file resta come origine.
- **Prove** (`app/test/celle.test.js`, due nuove): un file costruito "come lo salva Excel" (stringhe condivise, stili propri con intestazioni rosse e colonna gialla del team, formule condivise e matriciali, catena di calcolo, filtri attivi, formato condizionale e convalida su poche righe, nome con intervallo fisso, foglio Legenda con celle unite, senza Responsabile/Scadenza/Stato) viene importato, la mappa cresce, si esporta: stili, stringhe, Legenda e intestazioni identici; righe nuove con stili, altezza e formule del file; intervalli allargati; niente colonne nuove; si rilegge e si reimporta; *Salva nel progetto* usa lo stesso file. La seconda prova copre la mappa senza origine, il rifiuto di un file non BPB, la scelta, lo scarico e la rimozione del file di origine, lo Storico. Tutta la suite: 58 prove verdi (`node --test --test-concurrency=1 test/*.test.js`).
- **Documentazione**: `docs/GESTIONECELLE.md` (nuova sezione "Il file di origine", riga Excel, verifiche), `docs/CHANGELOG.md` (0.11.2), `app/catalogo/gestione-celle/app.json` (0.9.3 con novità), `version.json` (0.11.2), `docs/MEMORIA/README.md` (riga bpb-processi), `README.md`.

## Che cosa non ho fatto / resta aperto

- **Non provato in Excel vero** (qui non c'è): l'apertura senza avviso di riparazione e il ricalcolo delle formule del file esportato nel file di origine. Da fare con il file BPB reale al primo utilizzo: importare, aggiungere una voce, *Scarica Excel*, aprire.
- La prova nel browser `test/browser/celle.ui.js` non è stata eseguita (serve Playwright sul PC di sviluppo); l'interfaccia è stata controllata solo nella sintassi.
- I colori messi a mano su singole righe non si conservano (vale lo stile della colonna); i commenti agganciati alle celle delle tabelle restano alla stessa cella, non alla stessa voce.
- Le mappe importate **prima** della 0.9.3 non hanno il file di origine: da *Impostazioni della mappa → File di origine → Scegli un file…* si carica il file BPB del team (solo l'aspetto; i dati restano quelli della mappa).

## Come verificarlo (dal punto di vista dell'utente)

1. GestioneCelle → *Nuova mappa* → *Importa Excel* con il file BPB del team. Il messaggio dice che il file resta come origine; il sottotitolo mostra «Excel come il file di origine «nome»».
2. Aggiungere un micro processo e un macro processo nuovo con un processo.
3. *Scarica Excel*: aprire il file. Attesi: stessi fogli, colori, intestazioni e colonne del file del team, nessuna colonna nuova; le righe nuove in fondo ai loro processi con codici e formule; il check e i menu a tendina funzionano anche sulle righe aggiunte.
4. *Impostazioni della mappa* (matita): sezione *File di origine* con *Scarica l'originale*, *Sostituisci…*, *Togli*. Con *Togli*, *Scarica Excel* torna al formato di GestioneCelle (intestazioni blu/grigie, colonne Responsabile/Scadenza/Stato).

## Che cosa deve fare il proprietario

1. Unire la pull request del ramo `claude/focused-pasteur-o83vl4` in `main`.
2. Sull'host: `aggiorna.bat`, poi riavvio. La pagina di accesso e Sistema mostrano **v0.11.2**; in *App e programmi → Novità* compare GestioneCelle 0.9.3.
3. Per le mappe già esistenti: *Impostazioni della mappa → File di origine → Scegli un file…* con il file BPB del team.
