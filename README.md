# HSPI Team Manager

Portale interno (beta) per il team HSPI: account con ruoli, progetti con le persone autorizzate, **Esplora file** con cartelle vere (personali e di progetto), **Verbale Studio** integrato, programmi che si aprono dal portale con la loro guida, scambio file, log e pannello di controllo. Si installa anche sul telefono come app.

> **Stato:** v0.5 — in locale sul PC che lo ospita. Da usare con dati di prova finché non sono decisi i punti in `docs/PROGETTI-E-DATI.md`.

## Avvio rapido (Windows)

1. Metti nella cartella del progetto la cartella di Node.js portatile (es. `node-v22.22.2-win-x64`, dallo ZIP "Windows Binary" di nodejs.org). Non serve installare niente.
2. Doppio clic su **`avvia.bat`**: il portale parte solo su questo PC, senza richieste del firewall. Per aprirlo ai colleghi sulla stessa rete c'è **`avvia-rete.bat`** (serve il permesso del firewall, vedi `docs/ACCESSO-RETE.md`).
3. Si apre `http://localhost:8080`. Il primo account che si registra (solo dal PC che ospita il portale) diventa **Hacker**.
4. Gli altri si registrano da soli con nome e cognome: il nome utente è `nome.cognome` e l'account entra dopo la tua approvazione in **Account**. In alternativa li crei tu con una password provvisoria.

Per caricare su GitHub le tue risorse (loghi, sfondi, web app): doppio clic su **`carica-su-github.bat`**. Mostra l'elenco dei file e chiede conferma; `data/` e `progetti/` non vengono mai caricati.

Per portare nei progetti i file che stanno altrove (per esempio l'archivio di Verbale Studio): **`sincronizza-una-tantum.bat`**. Copia soltanto, non tocca l'origine. Vedi `docs/INTEGRAZIONE-APP.md`.

Per aggiornare all'ultima versione: doppio clic su **`aggiorna.bat`**. Scarica i file nuovi, toglie quelli che la nuova versione non usa più e avvia il portale senza fare domande. Database e file caricati (cartella `data/`), Node.js portatile e le tue immagini non vengono toccati.

## Cosa vede ogni ruolo

| Schermata | Dipendente | Manager | Hacker |
|---|:-:|:-:|:-:|
| Home, annunci | ✓ | ✓ + pubblica annunci | ✓ |
| Progetti: solo quelli di cui si è membri | ✓ | ✓ + crea e sceglie le persone | ✓ tutti |
| Esplora file: i miei file e le cartelle dei miei progetti (cartelle, caricamento, anteprima, modifica testi, versioni, cestino, ricerca) | ✓ | ✓ | ✓ tutti i progetti |
| Verbale Studio: verbali dei progetti di cui si è membri | ✓ | ✓ + addestra l'AI del progetto | ✓ + importazione, gestione AI locale |
| Programmi: apri dal portale e leggi la guida | ✓ | ✓ + modifica descrizione e guida | ✓ |
| File inviati: carica, invia, ricevi | ✓ | ✓ | ✓ + tutti i file |
| Profilo, avatar, cambio password, segnala un problema | ✓ | ✓ | ✓ |
| Team (elenco persone e ultimo accesso) | | ✓ | ✓ |
| Account (approva, crea, ruoli e qualifiche, disabilita, reimposta password) | | | ✓ |
| Log attività | | | ✓ |
| Errori e bug | | | ✓ |
| Sistema (link di accesso, spazio, impostazioni) | | | ✓ |

## Prove automatiche

Dalla cartella `app`: `node --test --test-concurrency=1 test/*.test.js` (API: account, Esplora file, Verbale Studio, sicurezza). Usano una cartella temporanea, mai i dati veri.
Prove nel browser (solo sul PC di sviluppo, serve Playwright): `node test/browser/explorer.ui.js`, `verbali.ui.js`, `pwa.ui.js`.

## Documentazione

| File | Contenuto |
|---|---|
| `docs/PROGETTI-E-DATI.md` | Come sono trattati i file dei progetti, permessi, decisioni aperte |
| `docs/INTEGRAZIONE-APP.md` | Archivio unico, Verbale Studio nel portale, importazione dal vecchio programma, API di Esplora file |
| `docs/TELEFONO.md` | Usare e installare il portale dal telefono con Tailscale (HTTPS) |
| `docs/DIPENDENZE.md` | Albero delle dipendenze, struttura delle cartelle, regole per aggiungere cose |
| `docs/ACCESSO-RETE.md` | Come far entrare i colleghi: stessa Wi-Fi, Tailscale, cosa evitare |
| `docs/ARCHITETTURA.md` | Architettura, moduli, modello dati, decisioni aperte |
| `docs/ROADMAP.md` | Fasi di lavoro |
| `branding/README.md` | Cartelle delle risorse: `logo`, `background`, `background portal`, `avatar`, `apptools` |

## Regole del repository

- **Nessun dato aziendale reale** e **nessuna credenziale** nel repository: solo codice e documentazione.
- La cartella `data/` (database e file caricati) resta sul PC ed è esclusa da Git.
