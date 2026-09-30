# HSPI Team Manager

Portale interno (beta) per il team HSPI: account con ruoli, programmi da scaricare con la loro guida, scambio file, log e pannello di controllo.

> **Stato:** v0.1 — prima versione funzionante, in locale sul PC che la ospita. Da usare con dati di prova.

## Avvio rapido (Windows)

1. Metti nella cartella del progetto la cartella di Node.js portatile (es. `node-v22.22.2-win-x64`, dallo ZIP "Windows Binary" di nodejs.org). Non serve installare niente.
2. Doppio clic su **`avvia.bat`**: il portale parte solo su questo PC, senza richieste del firewall. Per aprirlo ai colleghi sulla stessa rete c'è **`avvia-rete.bat`** (serve il permesso del firewall, vedi `docs/ACCESSO-RETE.md`).
3. Si apre `http://localhost:8080`. Il primo account che si registra (solo dal PC che ospita il portale) diventa **Hacker**.
4. Gli altri si registrano da soli con nome e cognome: il nome utente è `nome.cognome` e l'account entra dopo la tua approvazione in **Account**. In alternativa li crei tu con una password provvisoria.

Per aggiornare all'ultima versione: doppio clic su **`aggiorna.bat`**. Aggiorna i file e avvia il portale senza fare domande. Database e file caricati (cartella `data/`), Node.js portatile e le tue immagini non vengono toccati.

## Cosa vede ogni ruolo

| Schermata | Dipendente | Manager | Hacker |
|---|:-:|:-:|:-:|
| Home, annunci | ✓ | ✓ + pubblica annunci | ✓ |
| Programmi: scarica e leggi la guida | ✓ | ✓ + pubblica e modifica | ✓ |
| File: carica, invia, ricevi | ✓ | ✓ | ✓ + tutti i file |
| Profilo, avatar, cambio password, segnala un problema | ✓ | ✓ | ✓ |
| Team (elenco persone e ultimo accesso) | | ✓ | ✓ |
| Account (approva, crea, ruoli e qualifiche, disabilita, reimposta password) | | | ✓ |
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
| `branding/README.md` | Logo, sfondi dinamici e avatar: cartelle `logo`, `background`, `avatar` |

## Regole del repository

- **Nessun dato aziendale reale** e **nessuna credenziale** nel repository: solo codice e documentazione.
- La cartella `data/` (database e file caricati) resta sul PC ed è esclusa da Git.
