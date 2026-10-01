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
- [x] `avvia.bat` e `aggiorna.bat` (aggiornamento automatico, Node.js portatile nella cartella del progetto)
- [ ] Primo test di aggiornamento con `aggiorna.bat`: a video deve comparire la versione 0.1.1
- [x] Avvio sul PC Windows, solo in locale (v0.1.2: nessuna richiesta del firewall)
- [x] Logo personalizzato dalla cartella `images/`
- [x] v0.3: Progetti con membri e link a OneDrive, programmi come web app da `apptools`, tema chiaro/scuro, sfondo statico, guida a popup, `carica-su-github.bat`
- [x] v0.4: anteprima dei file nei progetti, nuova cartella, sostituzione con storico, importazione una tantum, `aggiorna.bat` che allinea la cartella di lavoro
- [x] v0.5: Esplora file (cartelle vere personali e di progetto, indice nel database, ricerca, versioni, cestino, modifica testi)
- [x] v0.5: Verbale Studio dentro il portale, archivio nelle cartelle dei progetti, importazione dal vecchio programma
- [x] v0.5: app installabile sul telefono (PWA) e guida Tailscale (`TELEFONO.md`)
- [x] v0.6: versione unica (version.json), aggiornamento sicuro con backup e ritorno indietro, backup giornalieri e ripristino
- [x] v0.6: gradi personalizzabili, Hacker nascosto, ospiti a tempo nei progetti, statistiche del team
- [x] v0.6: GestioneCelle (mappe dei processi con import/export del file Excel BPB)
- [x] v0.6: HSPI Client (installazione per utente, aggiornamento dall'host, motore locale per l'AI), sito /benvenuto /guida /scarica
- [ ] Provare l'importazione con i dati veri di Verbale Studio sul PC del portale
- [ ] Provare HSPI Client su un PC Windows aziendale e il file Excel di GestioneCelle in Excel 365
- [ ] Scegliere la destinazione della copia aggiuntiva dei backup (l'altro server)
- [ ] Decidere come trattare i file aziendali dei progetti (vedi `PROGETTI-E-DATI.md`)
- [ ] Decidere come collegare gli altri PC: porta aperta dall'IT, oppure altra strada approvata
- [ ] Prova con i primi colleghi
- [x] v0.2: accesso con Login/Registrazione, nome utente automatico `nome.cognome`, approvazione dell'Hacker
- [x] v0.2: spiegazioni (i) sui campi, logo più grande, sfondi dinamici, 36 avatar con quelli riservati per qualifica
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
