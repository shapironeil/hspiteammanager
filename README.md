# HSPI Team Manager

Portale interno (beta) per il team HSPI: un posto unico per utenti, risorse software, servizi e processi standardizzati.

> **Stato:** fase di progettazione. Non c'è ancora codice applicativo: questo repository contiene la base (struttura, architettura proposta, script di download).

## Cosa c'è qui

| Percorso | Contenuto |
|---|---|
| `docs/ARCHITETTURA.md` | Architettura proposta, moduli, modello dati, decisioni aperte |
| `docs/ROADMAP.md` | Fasi di lavoro: dalla base alla v1 da mostrare, fino all'uso reale |
| `app/` | Codice del portale (vuoto per ora, si riempie con la v1) |
| `scripts/scarica-progetto.bat` | Scarica o aggiorna tutto il progetto da GitHub su Windows |

## Scaricare il progetto su Windows

1. Salva `scripts/scarica-progetto.bat` in una cartella a piacere (es. `Documenti`).
2. Doppio clic.
3. Il progetto viene scaricato nella sottocartella `hspiteammanager`. Rilanciando lo script si aggiorna all'ultima versione.

Con Git installato lo script usa `git clone` / `git pull`. Senza Git scarica lo ZIP del ramo `main` (funziona solo se il repository è pubblico; con repository privato serve Git: https://git-scm.com/download/win).

## Regole del repository

- **Nessun dato aziendale reale** e **nessuna credenziale** nel repository: solo codice, documentazione e dati di esempio.
- I segreti (chiavi, password, client secret Microsoft) vivono in file `.env` locali, esclusi da Git.
