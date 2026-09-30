# HSPI Team Manager

Portale interno (beta) per il team HSPI: account con ruoli, programmi da scaricare con la loro guida, scambio file, log e pannello di controllo.

> **Stato:** v0.1 — prima versione funzionante, in locale sul PC che la ospita. Da usare con dati di prova.

## Avvio rapido (Windows)

1. Metti nella cartella del progetto la cartella di Node.js portatile (es. `node-v22.22.2-win-x64`, dallo ZIP "Windows Binary" di nodejs.org). Non serve installare niente.
2. Doppio clic su **`avvia.bat`**.
3. Si apre `http://localhost:8080`. Al primo avvio crei il tuo account **Hacker**.
4. Da **Account** crei gli altri utenti con una password provvisoria: al primo accesso ognuno sceglie la propria.

Per aggiornare all'ultima versione: doppio clic su **`aggiorna.bat`**. Aggiorna i file e avvia il portale senza fare domande. Database e file caricati (cartella `data/`), Node.js portatile e immagini in `branding/` non vengono toccati.

## Cosa vede ogni ruolo

| Schermata | Dipendente | Manager | Hacker |
|---|:-:|:-:|:-:|
| Home, annunci | ✓ | ✓ + pubblica annunci | ✓ |
| Programmi: scarica e leggi la guida | ✓ | ✓ + pubblica e modifica | ✓ |
| File: carica, invia, ricevi | ✓ | ✓ | ✓ + tutti i file |
| Profilo, cambio password, segnala un problema | ✓ | ✓ | ✓ |
| Team (elenco persone e ultimo accesso) | | ✓ | ✓ |
| Account (crea, ruoli, disabilita, reimposta password) | | | ✓ |
| Log attività | | | ✓ |
| Errori e bug | | | ✓ |
| Sistema (link di accesso, spazio, impostazioni) | | | ✓ |

## Documentazione

| File | Contenuto |
|---|---|
| `docs/DIPENDENZE.md` | Albero delle dipendenze, struttura delle cartelle, regole per aggiungere cose |
| `docs/ACCESSO-RETE.md` | Come far entrare i colleghi: stessa Wi-Fi, Tailscale, cosa evitare |
| `docs/ARCHITETTURA.md` | Architettura, moduli, modello dati, decisioni aperte |
| `docs/ROADMAP.md` | Fasi di lavoro |
| `branding/README.md` | Come personalizzare logo, sfondo e icona |

## Regole del repository

- **Nessun dato aziendale reale** e **nessuna credenziale** nel repository: solo codice e documentazione.
- La cartella `data/` (database e file caricati) resta sul PC ed è esclusa da Git.
