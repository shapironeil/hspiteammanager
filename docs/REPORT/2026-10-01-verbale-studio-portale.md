# REPORT — 2026-10-01 — Verbale Studio nel portale, Esplora file, telefono

Branch: `claude/verbale-studio-portale` (non unito a `main`: il merge lo decide il proprietario).

## Cosa è stato fatto

1. **Esplora file** (menu *Esplora file*, anche dentro la scheda di ogni progetto)
   - Spazio personale per ogni persona (`data/personale/<id>`) e cartelle dei progetti di cui si è membri.
   - Cartelle vere sul disco + indice nel database (`fs_index`) per ricerca e "modifiche recenti", con chi ha modificato.
   - Nuova cartella, caricamento multiplo (anche trascinando), anteprima di PDF/immagini/video/audio/testi, modifica dei testi nel portale, rinomina, sposta, **versioni** (sostituire o modificare conserva la precedente), **cestino** con ripristino. Niente si cancella davvero.
   - Video in streaming con Range (si può saltare avanti e indietro).
2. **Verbale Studio dentro il portale** (`/verbali/`, voce *Verbale Studio* nel menu)
   - Stessa interfaccia della v1.5 locale; le chiamate passano da `/api/vs/` con i permessi del portale.
   - Archivio unico: `progetti/<progetto>/Verbali/<data> <titolo>/` con video, transcript, email, punti chiave, note; dati del programma in `.verbale/` (nascosti).
   - Checkpoint ritrovati anche se la cartella viene rinominata o spostata; cartella rinominata da sola se cambiano data/titolo.
   - Versioni sempre conservate quando cambia la persona che modifica; avviso se due persone lavorano sullo stesso checkpoint.
   - Video e checkpoint eliminati → cestino del progetto.
   - "Cartella di lavoro": trova video e transcript caricati negli spazi del portale.
   - Template e preimpostazioni comuni al team; firma e modello AI personali.
   - **Importazione dal vecchio Verbale Studio** (solo Hacker, dal PC del portale): copia, non sposta; rilanciabile.
3. **Telefono**
   - App installabile (manifest, icone, service worker che non salva mai i dati, pagina "portale non raggiungibile").
   - Layout per telefono di Esplora file e Verbale Studio.
   - Guida `docs/TELEFONO.md`: Tailscale con condivisione del solo PC per ~15 persone e `tailscale serve` per l'HTTPS.
4. **Sicurezza**: dietro `tailscale serve` (proxy su 127.0.0.1) le richieste non valgono più come "dal PC del portale".

## Decisioni prese in autonomia (reversibili)

| Decisione | Motivo | Come annullarla |
|---|---|---|
| AI in cloud (Claude API) disattivata nel portale; solo Ollama locale | Regola "nessun pacchetto npm" e dati delle riunioni che non escono dall'azienda | Riattivare le rotte `/api/vs/ai/*` con una chiamata `fetch` all'API |
| Backup giornaliero e "copia aggiuntiva" del vecchio programma non portati | Nel portale valgono versioni e cestino nelle cartelle; un backup va fatto per tutto il portale, non per una sola app | Vedi domanda 2 |
| Chi vede un progetto può modificare e eliminare (nel cestino) i verbali | Coerente con i file del progetto già condivisi tra i membri; tutto recuperabile | Usare `canEdit` al posto di `canSee` in `src/verbali/archivio.js` |
| Video presi da "I miei file" vengono sempre copiati nel checkpoint | Gli altri membri non vedono i file personali | — |
| Oltre 80 versioni di un checkpoint le più vecchie vanno in `versioni/archiviate` | Mai cancellare | — |
| I testi esportati (Transcript revisionato, Email…) si riscrivono a ogni salvataggio | Sono generati dai dati del checkpoint; modificarli a mano da Esplora file non ha effetto | Documentato |

## Prove

- `node --test --test-concurrency=1 test/*.test.js`: **18 su 18** (account, Esplora file, Verbale Studio, importazione, sicurezza proxy).
- Browser (Playwright, desktop 1280–1366 px e telefono 390 px): `explorer.ui.js`, `verbali.ui.js`, `pwa.ui.js` tutti ok, nessun errore JavaScript, nessuno scorrimento orizzontale su telefono.
- **Non verificato**: Windows reale, Tailscale reale, telefoni reali (iPhone/Android), Ollama reale, importazione con i dati veri.

## Domande aperte

1. **Merge**: va bene unire `claude/verbale-studio-portale` in `main`? `aggiorna.bat` scarica solo `main`, quindi finché non c'è il merge l'aggiornamento non arriva sul PC.
2. **Backup**: serve una copia periodica di `data/` e `progetti/` (es. su OneDrive aziendale o disco esterno)? Oggi ci sono versioni e cestino, ma se si rompe il disco del PC si perde tutto.
3. **Tailscale**: va chiesto l'ok all'IT per installarlo sul PC aziendale e condividerlo con il team.
4. **Video grandi**: il limite per file è 2048 MB (Sistema → impostazioni). Le registrazioni Teams lunghe possono superarlo: alzarlo?
