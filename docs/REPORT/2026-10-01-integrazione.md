# REPORT — 2026-10-01 — Integrazione del lavoro degli agenti (v0.10.0)

Agente integratore: sessione `session_01GqNo1MzxngbR1RQrFUDijL`. Ramo di integrazione `claude/integrazione-2026-10-01`, partito da `origin/main` = `8b07add` (v0.8.1). Punto di ripristino: ramo `backup/2026-10-01-prima-integrazione` = `8b07add` su GitHub (il remoto rifiuta i tag: `the remote end hung up unexpectedly`, quindi il backup è un ramo).

## Fase 1 — Inventario (sola lettura, prima di toccare qualcosa)

### A. Memoria e analisi dei file

| Elemento | Autore (sessione) | Posizione | Stato | Visibile al proprietario |
|---|---|---|---|---|
| Scheda + impronta del kick-off PowerPoint (`BIOSIRIS_Kick-off_v0.9.1.pptx`) | admiring-hopper (`01GqNo…`) | ramo `claude/admiring-hopper-dc5bp0`, `docs/MEMORIA/pptx/kickoff-txt-biosiris.*`, commit `e5ab667` e `fff10ab` | completa, con misure prima/dopo | **no** (solo sul ramo) |
| Scheda + impronta del piano di lavoro Excel a Gantt (`BIOSIRIS_PdL_di_dettaglio_v0.4.xlsx`) | cool-noether (`016fgi…`) | ramo `claude/cool-noether-kv3o8c`, `docs/MEMORIA/xlsx/piano-di-lavoro-txt-biosiris.*`, commit `0fe8189`, `8314b5a` | completa | **no** |
| Schede + impronte del kit Word AQ Consip ID 2610 (piano operativo, appendici, nomina responsabile) + conoscenza estratta (`kit-aq-id2610.conoscenza.json`, 1743 righe) + fascicolo AQ | cool-noether | ramo `claude/cool-noether-kv3o8c`, `docs/MEMORIA/docx/*`, `docs/MEMORIA/fascicolo-aq-id2610.md` (ora `docs/MEMORIA/fascicoli/`), commit `74c4dad` | completa | **no** |
| Schede del fascicolo SAL (presentazione PowerPoint + verbale Word), `modelli.json` | awesome-cray (`01WbrS…`) | ramo `claude/awesome-cray-8lgn1k`, **`docs/memoria/`** (minuscolo, formato diverso), commit `51e11c0` | completa ma con un'altra convenzione | **no** |
| Analisi dei documenti ATAC (PDF/PPT) | ecstatic-planck (`01SsSN…`) | solo nel contenitore della sessione, ramo `claude/ecstatic-planck-q9m57v` **mai pushato** | in corso | **no** |
| Proposte e report precedenti (`docs/PROPOSTE-2026-10-01.md`, `docs/REPORT/*`) | sessione principale (`01VDL2…`) | `main` | completi | sì |

### B. Codice e funzioni

| Elemento | Autore | Posizione | Provato | Collegato all'interfaccia | Visibile |
|---|---|---|---|---|---|
| Cippi 0.1.0 (lettura `.pptx`, revisione, modelli, esportazione), GestioneCelle 0.8.0, Verbale Studio 1.0.0, catalogo delle app | sessione principale | `main` (`8b07add`) | sì | sì | **sì** |
| GestioneCelle 0.9.0 "Excel glass" + scheda Modifica; Cippi stile vetro, descrizione della slide, finestra delle caratteristiche, forma/colore nel `.pptx`, migrazione 10 | sessione principale | ramo `claude/verbale-studio-portale` `5da564c`, **pull request #3 aperta**, prove verdi su GitHub | sì (prove API e browser) | sì | **no** (pull request non unita) |
| Cippi 0.2.0: sezioni native, pillole, tabelle (anche disegnate), celle unite, totali, masterplan dal Gantt SVG, modelli noti (impronta), trova e sostituisci, celle e righe delle tabelle, esportazione pulita, glossario PA, 6 moduli nuovi in `app/src/cippi/` | admiring-hopper | ramo `claude/admiring-hopper-dc5bp0` `fff10ab`, **nessuna pull request** | sì (54 prove, browser) | sì | **no** |
| Motore Word + estensioni di Cippi | awesome-cray | solo nel contenitore della sessione (lavoro in corso, non committato né pushato) | no | no | **no** |
| Modifiche non committate, stash, worktree di questo contenitore | — | nessuno | — | — | — |

### C. Stato del repository (verificato con `git fetch --prune`, `git branch -a -vv`, `git log origin/main..<ramo>`)

| Ramo | Commit oltre `main` | Contenuto | Pull request |
|---|---|---|---|
| `origin/main` | `8b07add` v0.8.1 | ciò che il proprietario installa | — |
| `origin/claude/verbale-studio-portale` | 1 (`5da564c`, v0.9.0, 20 file, +942/−160) | codice GestioneCelle 0.9.0 + Cippi | #3 aperta, prove ✓ |
| `origin/claude/admiring-hopper-dc5bp0` | 2 (`e5ab667`, `fff10ab`, 24 file, +1847/−91) | codice Cippi 0.2.0 + memoria kick-off | nessuna |
| `origin/claude/cool-noether-kv3o8c` | 3 (`0fe8189`, `8314b5a`, `74c4dad`, 11 file, +2489) | solo memoria (Excel, Word) | nessuna |
| `origin/claude/awesome-cray-8lgn1k` | 1 (`51e11c0`, 5 file, +226) | solo memoria (SAL), cartella `docs/memoria` | nessuna |
| `claude/ecstatic-planck-q9m57v` | non esiste sul remoto | sessione in corso | — |

### D. Che cosa vede il proprietario e come arriva un aggiornamento

- Il portale gira sul PC che lo ospita. `aggiorna.bat` → `scripts/aggiorna.js` fa `git fetch origin main` + `merge --ff-only origin/main` (oppure scarica lo ZIP del ramo `main` da GitHub), fa il backup, scambia le cartelle e riavvia (`docs/BACKUP-E-AGGIORNAMENTI.md`). **Tutto ciò che non è su `main` non esiste per il proprietario.**
- Il numero di versione viene da `version.json` ed è mostrato nella pagina di accesso ("v… beta"), in Sistema → Aggiornamenti e nella risposta di `GET /api/version`. La cache del browser (`sw.js`) si rinnova quando cambia la versione.
- I client (HSPI Client) si aggiornano da soli dall'host al prossimo avvio; le app del catalogo arrivano con il loro `app.json`.
- Versione installata al momento dell'inventario: al massimo `main` = **0.8.1** (`8b07add`); non posso leggere il PC del proprietario, ma non può avere di più perché `main` non è andato oltre.

## Fase 2 — Diagnosi: perché il proprietario non vedeva gli aggiornamenti

| Upgrade | Dove si era fermato | Causa (dalla lista 1–9) | Evidenza |
|---|---|---|---|
| GestioneCelle 0.9.0 e Cippi stile vetro (sessione principale) | pushato, pull request #3 aperta, mai unita | **4** (ramo diverso da `main`, mai unito) | `git log origin/main..origin/claude/verbale-studio-portale` = 1 commit; PR #3 `state: open`, check `prove` e `apri` verdi |
| Cippi 0.2.0 (admiring-hopper) | pushato sul suo ramo, **senza pull request** | **4** + flusso automatico bloccato | `gh pr create` nel flusso `pr-automatica.yml` fallisce: *"GitHub Actions is not permitted to create or approve pull requests"* (run 36877733554, job `apri`); PR #1, #2, #3 sono state create a mano dal proprietario |
| Memorie Excel, Word, SAL (cool-noether, awesome-cray) | pushate su rami propri, senza pull request | **4** + **1** per il formato (due cartelle `docs/MEMORIA` e `docs/memoria`, due indici, `modelli.json` contro `*.impronta.json`): non erano ancora un'unica base | elenco dei file per ramo sopra; su Windows `MEMORIA`/`memoria` sarebbero la stessa cartella e il checkout si romperebbe |
| Motore Word + estensioni Cippi (awesome-cray), analisi ATAC (ecstatic-planck) | nel contenitore della sessione | **2** (non committato) / **3** (non pushato) | `git ls-remote` non ha i rami; i riassunti delle sessioni dicono "in corso" |
| Niente di dichiarato "fatto" risulta inesistente (causa 9): tutto il codice dei rami c'è, è provato e collegato ai menu | — | — | prove verdi sul ramo integrato: 55/55, browser Cippi e GestioneCelle "Tutto ok" |

Cause **non** trovate: niente nascosto da flag o permessi (6, 8); i meccanismi di distribuzione (5, 7) funzionano, semplicemente non avevano nulla di nuovo su `main`.

Il problema di fondo è uno: **il lavoro si fermava ai rami**, e il flusso che doveva aprire le pull request non ha il permesso su GitHub. Senza pull request il proprietario non vedeva nemmeno l'elenco in Sistema → Aggiornamenti.

## Fase 3 — Base di conoscenza unificata

Vedi `docs/MEMORIA/README.md` (indice generale) e `docs/MEMORIA/CONFLITTI.md`. Le schede sono state riscritte nel formato unico a 10 sezioni (identità, impronta, mappa degli oggetti, parti fisse e variabili, regole di modifica, funzioni consigliate, stato dell'app, dubbi aperti, da classificare, fonti), con la provenienza di ogni informazione. Le schede originali sono in `docs/MEMORIA/_archivio/2026-10-01/<agente>/`. La cartella `docs/memoria` (minuscola) non esiste più: il suo contenuto è nelle schede nuove e nell'archivio.

## Fase 4 — Integrazione del codice (ordine e conflitti)

1. `origin/claude/verbale-studio-portale` (v0.9.0, pull request #3): avanzamento rapido, nessun conflitto.
2. `origin/claude/admiring-hopper-dc5bp0` (Cippi 0.2.0): 8 file in conflitto, risolti **tenendo entrambi**:
   - `app/src/db.js`: migrazione 10 della sessione principale (`background`, `cippi_items`) e la mia rinumerata **11** (`edits`);
   - `app/src/routes/cippi.js`: `ANALYZER = 6`; `GEOMS`/`ITEM_FIELDS`/`items`/`background` + `cells`/`tableRows`/`edits`/`impronta`/`sostituisci`;
   - `app/src/cippi/pptx-write.js`: `replaceShapeGeom`/`replaceShapeFill` + `build(src, slides, edits)` con celle, righe, sostituzioni nei layout e pulizia;
   - `app/public/cippi/render.js`: forma e colore per id + percorsi personalizzati, sfondo del layout, tabelle con stile, celle modificate;
   - `app/public/cippi/main.js`: pannello Descrizione e finestra delle caratteristiche (sessione principale) con dentro l'editor delle celle, il piano di progetto e la sezione Documento, Trova e sostituisci (mie);
   - `app/public/cippi/cippi.css`, `app/catalogo/cippi/app.json` (novità di entrambi sotto la 0.2.0), `docs/CIPPI.md`: entrambi i blocchi.
   Un errore di sintassi lasciato dalla risoluzione (una graffa) è stato corretto prima delle prove.
3. `origin/claude/cool-noether-kv3o8c`: conflitto su `docs/MEMORIA/README.md`, presa la versione più completa (superinsieme della mia).
4. `origin/claude/awesome-cray-8lgn1k`: nessun conflitto (poi la cartella `docs/memoria` è stata fusa in `docs/MEMORIA`).

**Duplicati**: nessuna funzione doppia nel codice (le due sessioni avevano toccato parti diverse di Cippi). Nella memoria c'erano due indici e due formati di impronta (`modelli.json` e `*.impronta.json`): resta il formato `*.impronta.json`, che è quello letto dal codice (`app/src/cippi/impronta.js`).

**Prove sul ramo integrato**: `node --test --test-concurrency=1 test/*.test.js` → **55 su 55**; `test/browser/cippi.ui.js` → tutto ok (31 controlli, di entrambi gli agenti); `test/browser/celle.ui.js` → tutto ok.

## Fase 5 — Rilascio

- `version.json` → **0.10.0**; `docs/CHANGELOG.md` nuovo; README aggiornato.
- Verifica dal punto di vista dell'utente (portale avviato dal ramo integrato, Playwright, account di prova): pagina di accesso "v0.10.0 beta"; `GET /api/version` → 0.10.0 con cippi 0.2.0, gestione-celle 0.9.0, verbale-studio 1.0.0; App e programmi con le tre app e le novità; Sistema mostra 0.10.0; GestioneCelle con le schede Processi · Tabella · **Modifica** · Controlli; Cippi 0.2.0 con Documento ("Somiglia a: kick-off di progetto (78%)"), Descrizione della slide, Contesto del documento, Trova e sostituisci; nessun errore JavaScript.
- Come arriva al proprietario: vedi la guida di verifica nel messaggio finale e in `docs/CHANGELOG.md`.

## Fase 6 — Regole

`docs/REGOLE-AGENTI.md`: un solo posto per le analisi, rami e pull request, cosa vuol dire "fatto", nota di fine lavoro.

## Non integrato

- Il motore Word e le estensioni di Cippi della sessione awesome-cray e le analisi ATAC della sessione ecstatic-planck: lavoro in corso, non pushato. Entrambe le sessioni sono state avvisate: quando faranno push, si integra con la stessa procedura.
- Le pull request automatiche restano bloccate finché su GitHub non si attiva *Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"* (impostazione del repository, non del codice).
