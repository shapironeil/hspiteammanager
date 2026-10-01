# REPORT — 2026-10-01 — Host/client, ruoli, Trama (v0.6.0)

Branch: `claude/verbale-studio-portale` (non unito a `main`). Ordine approvato: versione, aggiornamento e backup → ruoli → Trama → client e sito.

## Fase 1 — Versione, aggiornamento, backup

**File**:
- `version.json` (nuovo, unica fonte della versione);
- `app/src/config.js`, `app/src/routes/admin.js` (`/api/version`, arresto locale con codice segreto, Backup in Sistema);
- `app/src/backup.js` (nuovo);
- `scripts/aggiorna.js`, `scripts/lib-host.js`, `scripts/backup.js`, `scripts/ripristina.js` (nuovi);
- `aggiorna.bat` (riscritto), `backup.bat`, `ripristina.bat` (nuovi), `avvia.bat` (limite di memoria);
- `app/src/http.js` (service worker con la versione);
- `app/public/js/views-admin.js` (sezione Backup);
- `docs/BACKUP-E-AGGIORNAMENTI.md`.

**Come verificarlo a mano**:
1. Sistema → Backup → *Esegui adesso*: compare in `Backup\<data>__manuale\` con `data`, `progetti`, `images`, `apptools`.
2. Fai un secondo backup: in Sistema → Backup → l'elenco dei backup, l'ultimo mostra pochi MB "nuovi". I file uguali non vengono ricopiati.
3. Rilancia `aggiorna.bat` senza novità: deve dire *Già aggiornato* e non toccare niente.
4. `ripristina.bat`: scegli un backup. I dati di prima finiscono in `.ripristino-precedente\`.

**Assunzioni / aperto**:
- Fino alla versione stabile gli aggiornamenti dell'host arrivano da GitHub (ramo `main`).
- La prima volta l'aggiornamento lo fa ancora il vecchio `aggiorna.bat`.
- I backup non si cancellano mai da soli.
- La copia aggiuntiva va configurata quando sarà pronto l'altro server.

## Fase 2 — Ruoli e accessi

**File**:
- `app/src/db.js` (migrazione 6), `app/src/grades.js` (nuovo), `app/src/routes/team.js` (nuovo);
- `app/src/routes/users.js`, `auth.js`, `projects.js`, `app/src/security.js`;
- `app/public/js/views-admin.js` (Account con gradi, *Aggiungi il team*, *Elimina persona*, Ruoli, Il mio team), `views-projects.js` (ospiti a tempo), `ui.js`, `app.js`, `percorso.js`;
- `docs/RUOLI.md`.

**Come verificarlo a mano**:
1. Account → *Aggiungi il team*: una riga per persona, `Nome Cognome; Grado`, poi annota le password mostrate.
2. Ruoli: rinomina, riordina, crea, elimina gradi; sposta le persone tra i gradi.
3. Entra come Manager: in Team non vedi che sei Hacker, vedi solo "Dipendente".
4. Progetto → *Ospiti a tempo* → aggiungi una persona per 7 giorni. Da Senior manager, *Il mio team* mostra l'accesso.

**Assunzioni**:
- Tu (Hacker) risulti "Dipendente" con badge verde acqua.
- "Elimina persona" toglie l'account dal portale ma **conserva i dati**: la cartella personale viene rinominata, non cancellata.
- "Stage" è il grado più basso.
- I nomi delle persone non sono nel repository: si inseriscono dal portale.

## Fase 3 — Trama

**File**:
- `app/src/trama/` (`zip.js`, `xlsx-read.js`, `xlsx-write.js`, `model.js`, `import.js`), `app/src/routes/trama.js`;
- `app/src/db.js` (migrazione 7);
- `app/public/js/trama.js`, `app/public/js/views-main.js` (scadenze in Home), CSS;
- `docs/TRAMA.md`.

**Verifica fatta**:
- Il file BPB reale importato dà 25 macro, 128 processi, 512 micro e gli stessi 4 duplicati del Check.
- L'Excel esportato, confrontato riga per riga con l'originale, ha 0 differenze.

**Come verificarlo a mano**:
1. Trama → *Nuova mappa* → *Importa Excel* con il file BPB.
2. Apri `1.3.4` / `1.3.5`: sono segnalati come duplicati.
3. Aggiungi un micro "dopo questa": i codici successivi scalano.
4. *Scarica Excel* e aprilo in Excel 365: le formule devono ricalcolarsi uguali.

**Aperto**:
- Il ricalcolo delle formule in Excel va provato dal vivo: qui non c'è un foglio di calcolo, e `LET`/`TEXTJOIN` richiedono Excel 2021/365.
- Excel per il web resta subordinato all'IT (Microsoft 365, Graph).

## Fase 4 — Client, host leggero, sito

**File**:
- `client/` (nuovo: `installa.bat`, `HSPI.bat`, `LEGGIMI.txt`, `app/hspi-client.js`);
- `app/src/client-package.js`, `app/src/downloads.js`, `app/src/http-headers.js`;
- `app/src/routes/verbali.js` (AI sull'host spenta di default, `prepare`/`info` per il client), `app/src/routes/admin.js` (stato dell'host);
- `app/public/verbali/app.js` (usa il motore locale se c'è);
- `app/public/sito/` (benvenuto, guida, scarica);
- `docs/CLIENT.md`.

**Come verificarlo a mano**:
1. Da un altro PC (Tailscale acceso) apri `/scarica` e scarica lo ZIP.
2. Estrailo e lancia `installa.bat`: si crea **HSPI** sul desktop e si apre il portale.
3. Verbale Studio → AI locale: deve dire "L'AI gira **sul tuo PC**".
4. Sul PC del portale, Sistema → *Stato del PC del portale*: memoria e persone collegate.
5. Pubblica una versione nuova: all'avvio successivo HSPI Client si aggiorna da solo.

**Assunzioni / aperto**:
- **Pesante** = AI locale. È l'unico processo pesante oggi: è spostata sui client e spenta sull'host.
- I client si aggiornano dall'host, che è l'unica fonte. Node.js per i client viene dal Node portatile dell'host.
- **Da provare dal vivo**:
  - `curl` e PowerShell sui PC aziendali;
  - il dialogo pagina `https://…ts.net` → `http://127.0.0.1:4320` in Edge/Chrome aziendali;
  - Ollama vero sul client.

## Prove automatiche

- `node --test --test-concurrency=1 test/*.test.js`: **43 su 43**.
  - Aggiornamento: ZIP/cartella e Git, annullamento di una versione rotta.
  - Backup a collegamenti fissi, ripristino.
  - Ruoli, ospiti, statistiche.
  - Trama: import BPB e foglio generico, codici, eliminazione con richieste, export e reimport.
  - Client: pacchetti, aggiornamento, motore locale, sito.
  - Sicurezza dietro proxy.
- Browser (Playwright, desktop e telefono): `explorer`, `verbali`, `pwa`, `sistema`, `ruoli`, `trama`, `client`, tutti ok, senza errori JavaScript.

## Domande aperte

1. Merge del ramo in `main` per far arrivare tutto con `aggiorna.bat`: quando vuoi.
2. Destinazione della copia aggiuntiva dei backup (l'altro server).
3. Ok dell'IT per Tailscale sul PC del portale e sui PC del team.
