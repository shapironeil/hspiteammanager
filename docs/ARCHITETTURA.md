# Architettura — HSPI Team Manager

Versione 0.2 — 30 settembre 2026.

## 0. Stato attuale: v0.1 in locale

La prima versione funzionante esiste e gira sul PC di chi la ospita. Per partire subito, senza dipendere da IT e senza installazioni pesanti, usa una base più leggera di quella descritta come obiettivo nelle sezioni successive:

| Pezzo | v0.1 (oggi) | Obiettivo (sezioni 2-5) |
|---|---|---|
| Applicazione | Node.js puro (portatile, nella cartella del progetto), nessun pacchetto esterno | Da rivalutare: restare così o passare a Next.js |
| Database | SQLite, un file in `data/portale.db` | PostgreSQL |
| Archivio file | Cartella locale `data/storage/`, tetto configurabile (100 GB) | OneDrive / SharePoint |
| Login | Nome utente e password gestiti dal portale | Account Microsoft (Entra ID) |
| Hosting | PC personale, rete locale | Azure nel tenant HSPI o server aziendale |

I tre punti di sostituzione sono isolati: database in `src/db.js`, archivio in `src/storage.js`, login in `src/security.js`. Dettagli in `DIPENDENZE.md`; accesso dei colleghi in `ACCESSO-RETE.md`.

Moduli presenti (v0.3): progetti con membri e collegamento alla cartella OneDrive (vedi `PROGETTI-E-DATI.md`), programmi come web app ospitate dal portale, registrazione con approvazione, account con ruoli (dipendente, manager, hacker) e qualifiche (dirigente, manager, project manager, sviluppatore), avatar, programmi scaricabili con guida, file personali e invii, annunci, log attività, errori e segnalazioni, pannello Sistema.

Il resto del documento descrive l'architettura a regime ed è una **proposta**: le scelte segnate come "da decidere" vanno confermate.

## 1. Obiettivo

Un portale interno per il team HSPI (circa 12 persone all'inizio: manager + team) che uniformi e standardizzi:

- **utenti abilitati** tramite login, ognuno con il proprio account e ruolo;
- **portafoglio delle risorse software** e dei servizi dedicati (chi usa cosa, licenze, scadenze, referenti);
- **gestione delle risorse** e delle loro dipendenze;
- **processi**: procedure, template e checklist condivisi.

Si parte piccoli e si cresce per gradi: una base solida su cui aggiungere moduli.

## 2. I tre pezzi che servono

Un portale del genere ha bisogno di tre cose distinte, che conviene tenere separate:

| Pezzo | A cosa serve | Proposta |
|---|---|---|
| **Applicazione (server)** | Pagine, login, logica | Un'unica web app full-stack |
| **Database** | Dati strutturati: utenti, ruoli, risorse, assegnazioni | PostgreSQL |
| **Archivio file** | Documenti, allegati, template | OneDrive / SharePoint via Microsoft Graph |

Punto importante: **OneDrive è un archivio di file, non un database.** Va benissimo per i documenti, ma utenti, permessi e anagrafiche devono stare in un database vero. Nel database si salva solo il *riferimento* al file; il file resta su OneDrive.

```
   Browser (utenti HSPI)
            |
            v
   +-------------------+        +--------------------+
   |  Web app (server) | <----> |  PostgreSQL        |
   |  pagine + API     |        |  dati strutturati  |
   +-------------------+        +--------------------+
      |             |
      v             v
  Login         Archivio file
  (Microsoft    (OneDrive / SharePoint
   Entra ID)     via Microsoft Graph)
```

## 3. Stack proposto

| Livello | Scelta | Perché |
|---|---|---|
| Applicazione | **Next.js + TypeScript** | Front-end e back-end in un solo progetto: meno pezzi da mantenere per un team piccolo |
| Interfaccia | Tailwind CSS + shadcn/ui | Aspetto professionale in poco tempo |
| Database | **PostgreSQL** + Prisma | Standard, robusto, gestibile ovunque (Azure, server aziendale, Docker) |
| Login | **Auth.js** con provider Microsoft Entra ID | Gli utenti entrano con l'account HSPI che hanno già: niente password nuove da gestire |
| File | Microsoft Graph API | Accesso a OneDrive / SharePoint |
| Esecuzione | **Docker Compose** | Lo stesso pacchetto gira sul PC, su un server aziendale o nel cloud |

## 4. Due dipendenze dall'IT di HSPI

Queste due cose non si possono fare da soli e conviene chiederle presto:

1. **Registrazione dell'app in Microsoft Entra ID** (il tenant Microsoft di HSPI). Serve sia per il login con account aziendale sia per leggere/scrivere su OneDrive. Richiede un amministratore IT che crei la registrazione e dia il consenso ai permessi.
2. **Dove ospitare il portale** (vedi sezione 5).

Per non restare bloccati, la v1 è progettata per funzionare **anche senza** queste due cose (vedi sezione 8).

### Nota su OneDrive

- Meglio una **raccolta documenti SharePoint del team** che il OneDrive personale di qualcuno: i file su un OneDrive personale sono legati all'account di quella persona e diventano un problema se cambia ruolo o lascia l'azienda.
- Lo "spazio illimitato" va verificato con l'IT: i piani Microsoft 365 hanno di norma una quota per utente e una quota complessiva per SharePoint. Per i volumi di un team di 12 persone non sarà comunque un limite.

## 5. Hosting — opzioni

| Opzione | Pro | Contro |
|---|---|---|
| **A. Azure, nel tenant HSPI** | Naturale con Microsoft 365; login e Graph integrati; gestito | Ha un costo mensile; serve una sottoscrizione approvata |
| **B. Server o VM aziendale** | Dati dentro HSPI; nessun costo cloud | Serve che l'IT la metta a disposizione e la renda raggiungibile |
| **C. Ambiente demo temporaneo** (PC locale o VPS) | Pronto subito, nessuna approvazione | Solo per la demo, **solo con dati finti** |

**Raccomandazione:** C per la v1 da mostrare, poi A o B per l'uso reale, in base a cosa approva HSPI.

Dati aziendali reali non vanno su server personali o account personali senza un'approvazione esplicita: è il primo punto che un manager o l'IT solleverà.

## 6. Moduli

| # | Modulo | Contenuto | Fase |
|---|---|---|---|
| 1 | **Utenti e accesso** | Login, profilo, ruoli, abilitazione/disabilitazione account | v1 |
| 2 | **Portafoglio software e servizi** | Catalogo strumenti e servizi: referente, licenze, costo, scadenza, stato | v1 |
| 3 | **Assegnazioni** | Chi ha accesso a cosa; richiesta e revoca | v1 (base) |
| 4 | **Dashboard** | Riepilogo: risorse, scadenze vicine, utenti attivi | v1 |
| 5 | **Documenti** | File collegati a risorse e processi, archiviati su OneDrive/SharePoint | v2 |
| 6 | **Processi** | Procedure standard, template, checklist | v2 |
| 7 | **Dipendenze** | Relazioni tra risorse (questo servizio dipende da quello strumento) | v2 |
| 8 | **Registro attività** | Chi ha fatto cosa e quando | v2 |

### Ruoli

| Ruolo | Può fare |
|---|---|
| **Hacker** (amministratore) | Tutto: account, ruoli, log, errori, configurazione |
| **Manager** | Ciò che vede il dipendente + team, annunci, pubblicazione dei programmi |
| **Dipendente** | Programmi, file, profilo, segnalazioni |

## 7. Modello dati (prima bozza)

| Tabella | Campi principali |
|---|---|
| `utenti` | nome, email, ruolo, stato (attivo/disabilitato), ultimo accesso |
| `risorse` | nome, tipo (software / servizio), descrizione, fornitore, referente, stato |
| `licenze` | risorsa, numero posti, costo, data rinnovo |
| `assegnazioni` | utente, risorsa, data inizio, data fine, stato |
| `dipendenze` | risorsa A dipende da risorsa B |
| `processi` | titolo, descrizione, responsabile, passi |
| `documenti` | titolo, collegato a (risorsa o processo), riferimento al file nell'archivio |
| `registro_attivita` | utente, azione, oggetto, data e ora |

## 8. Come è fatta la v1 per non dipendere dall'IT

Due componenti sono costruiti dietro un'interfaccia, con un'implementazione semplice subito e quella definitiva dopo:

| Componente | v1 (demo) | Dopo |
|---|---|---|
| **Login** | Email e password gestite dal portale, utenti di esempio | Login Microsoft (Entra ID) |
| **Archivio file** | Cartella locale sul server | OneDrive / SharePoint via Graph |

Il resto del codice non cambia quando si passa dall'una all'altra: si sostituisce solo l'adattatore.

## 9. Sicurezza — minimo indispensabile

- Accesso solo dopo login; ogni pagina e ogni API controlla il ruolo.
- HTTPS obbligatorio fuori dal PC locale.
- Segreti solo in file `.env`, mai nel repository.
- Backup periodico del database.
- Registro attività per le operazioni sensibili (utenti, ruoli, assegnazioni).

## 10. Decisioni aperte

| # | Decisione | Chi decide |
|---|---|---|
| 1 | Stack a regime: tenere la base leggera della v0.1 o passare a Next.js + PostgreSQL | Shappa |
| 2 | Hosting definitivo: Azure nel tenant HSPI o server aziendale | Manager + IT |
| 3 | Registrazione dell'app in Entra ID | IT |
| 4 | Archivio: raccolta SharePoint del team o OneDrive; verifica della quota | Manager + IT |
| 5 | Quali moduli entrano nella v1 e in che ordine | Shappa + manager |
| 6 | Repository: resta sull'account GitHub personale o passa a un'organizzazione HSPI | Manager |
