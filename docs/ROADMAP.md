# Roadmap — HSPI Team Manager

## Fase 0 — Base (fatta)

- [x] Repository con struttura, documento di architettura e roadmap
- [x] Script `.bat` per scaricare il progetto da GitHub

## Fase 1 — Progettazione

- [ ] Confermare stack e moduli della v1 (vedi "Decisioni aperte" in `ARCHITETTURA.md`)
- [ ] Definire le schermate della v1: login, dashboard, elenco risorse, scheda risorsa, utenti, profilo
- [ ] Rifinire il modello dati
- [ ] Preparare dati di esempio realistici ma finti

## Fase 2 — v1 da mostrare

- [x] Portale funzionante in locale (Node.js + SQLite, nessuna dipendenza esterna)
- [x] Login e tre ruoli (dipendente, manager, hacker), menu laterale per ruolo
- [x] Gestione account: creazione, ruoli, disabilitazione, password provvisorie
- [x] Programmi scaricabili con guida all'uso
- [x] File: caricamento, invio a colleghi, archivio locale con tetto di spazio
- [x] Annunci, log attività, errori e segnalazioni, pannello Sistema
- [x] `avvia.bat` e `aggiorna.bat`
- [ ] Prova sul PC Windows e con i primi colleghi in rete locale
- [ ] Logo e sfondo HSPI nella cartella `branding/`
- [ ] Portafoglio software e servizi (licenze, scadenze, referenti)
- [ ] Assegnazioni utente-risorsa
- [ ] Demo al responsabile

## Fase 3 — Verso l'uso reale

- [ ] Richiesta all'IT: registrazione app in Entra ID e scelta dell'hosting
- [ ] Login Microsoft al posto di email/password
- [ ] Archivio file su OneDrive/SharePoint
- [ ] Deploy sull'hosting approvato, HTTPS, backup

## Fase 4 — Estensioni

- [ ] Documenti collegati a risorse e processi
- [ ] Processi, template e checklist
- [ ] Dipendenze tra risorse
- [ ] Registro attività
