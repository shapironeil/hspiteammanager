# Regole di lavoro per gli agenti (e per chiunque sviluppi il portale)

Valgono per tutti gli agenti Claude che lavorano su HSPI Team Manager e per le persone. Nascono dall'integrazione del 1° ottobre 2026 (`docs/REPORT/2026-10-01-integrazione.md`): quattro agenti avevano lavorato bene, ma il proprietario non vedeva niente perché ogni lavoro era rimasto sul suo ramo, con due memorie diverse e nessuna pull request.

## 1. Dove si salvano le analisi dei file

- **Un solo posto**: `docs/MEMORIA/`. Niente altre cartelle (`docs/memoria`, `docs/MODELLI-FILE`, note sparse, file nello scratchpad).
- **Un solo formato**: una scheda per template in `docs/MEMORIA/<formato>/<tipo>-<fornitore>-<progetto>.md` con le 10 sezioni fisse descritte in `docs/MEMORIA/README.md`, più l'impronta `<stesso-nome>.impronta.json` (quella che il codice legge per riconoscere i modelli noti).
- Se un file corrisponde a un template già presente, si **aggiorna la scheda esistente** (sezione "File visti" e "Fonti"), non se ne crea un'altra. Se due analisi si contraddicono, si scrivono entrambe e si aggiunge una voce in `docs/MEMORIA/CONFLITTI.md`: decide il proprietario.
- Nella memoria non va **nessun dato del cliente**: solo struttura, stile, regole, misure.
- Ogni informazione porta la sua provenienza (agente, sessione, ramo, commit, file analizzato).

## 2. Rami e come il lavoro arriva nel principale

- Si lavora sempre su un ramo `claude/<nome>` (o `feature/<nome>`), **mai direttamente su `main`**. `main` è ciò che il proprietario installa con `aggiorna.bat`: tutto ciò che non è su `main` **non esiste** per lui.
- Prima di iniziare: `git fetch origin` e si parte da `origin/main` aggiornato. Se un altro agente ha una pull request aperta sugli stessi file, si parte dal suo ramo e lo si scrive nella nota di fine lavoro.
- Ogni push su un ramo deve avere la sua **pull request verso `main`** (il flusso `pr-automatica.yml` la apre da solo solo se su GitHub è attivo *Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"*; se la pull request non compare, la si apre a mano).
- Chi integra (l'agente integratore o il proprietario) unisce le pull request in `main` nell'ordine delle dipendenze, risolvendo i conflitti **senza scartare** il lavoro di nessuno; poi alza `version.json`, aggiorna `docs/CHANGELOG.md` e fa push.
- Un ramo già unito non si riusa: per il lavoro successivo si riparte da `main`.
- Mai riscrivere la cronologia di un ramo altrui (niente rebase, amend o force push); mai cancellare rami o file senza il via del proprietario.

## 3. Cosa vuol dire "fatto"

Un lavoro è **fatto** solo quando tutte queste cose sono vere, nell'ordine:

1. **committato** sul proprio ramo, con un messaggio che dice cosa cambia e per chi;
2. **pushato** su GitHub (`git push -u origin <ramo>`), con la pull request aperta;
3. **provato**: `node --test --test-concurrency=1 test/*.test.js` verde e, se tocca l'interfaccia, la prova nel browser (`test/browser/<app>.ui.js`) verde;
4. **integrato** in `main` (pull request unita) con `version.json` alzato e `docs/CHANGELOG.md` aggiornato;
5. **distribuito**: sull'host gira la versione nuova (`aggiorna.bat`, poi riavvio; la pagina di accesso e Sistema mostrano il numero nuovo) e i client si aggiornano da soli al prossimo avvio;
6. **verificato come visibile all'utente**: qualcuno ha aperto l'app e ha provato la funzione dal menu, non solo l'API.

Fino al punto 6 si scrive "in corso", "pushato", "in pull request": **non** "fatto".

## 4. La nota di fine lavoro

Ogni agente chiude il lavoro con una nota (nel messaggio finale e, per le modifiche di codice, in `docs/REPORT/<data>-<argomento>.md`) che dice:

- **cosa** ha fatto (funzioni, file, schede di memoria) e cosa **non** ha fatto o ha lasciato aperto;
- **dove**: ramo, commit (hash), pull request, percorsi dei file;
- **versione** toccata (`version.json`, `app.json` dell'app) e novità aggiunte al changelog;
- **come verificarlo**: i passi esatti dal punto di vista dell'utente e il risultato atteso;
- **cosa deve fare il proprietario** per vederlo (unire la pull request, lanciare `aggiorna.bat`, ricaricare la pagina).

## 5. Convenzioni del progetto che restano

- Tutto in italiano: nomi, commenti, messaggi, documentazione.
- Nessuna dipendenza npm, nessuna libreria esterna nell'interfaccia (vedi `docs/DIPENDENZE.md`).
- Le migrazioni del database si aggiungono **in fondo** a `MIGRATIONS` in `app/src/db.js`, numerate di seguito, mai modificate; chi integra rinumera se due agenti hanno usato lo stesso numero.
- Quando cambia l'analisi di MPoint si alza `ANALYZER` in `app/src/routes/cippi.js`.
- Ogni app ha la sua versione in `app/catalogo/<id>/app.json` con la voce in `novita`; il portale ha `version.json`.
- Nessun file di un cliente nel repository: le prove usano presentazioni, fogli e documenti inventati.
