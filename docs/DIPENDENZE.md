# Albero delle dipendenze — HSPI Team Manager v0.1

Regola di fondo della v1: **meno dipendenze possibile**. Il portale gira con il solo Node.js; non c'è niente da installare con `npm`, niente Docker, niente database esterno.

## 1. Cosa serve sul PC che ospita il portale

```
HSPI Team Manager
├── Node.js 22.13 o successivo      obbligatorio; versione portatile nella cartella
│   │                                node-v22.22.2-win-x64 dentro il progetto
│   ├── node:http                    server web            (incluso in Node)
│   ├── node:sqlite                  database              (incluso in Node)
│   ├── node:crypto                  password e sessioni   (incluso in Node)
│   └── node:fs / path / os          file e sistema        (inclusi in Node)
├── Git per Windows                  facoltativo: rende più solido aggiorna.bat
└── Browser moderno                  Edge, Chrome o Firefox
```

**Node.js non si installa: si usa la versione portatile.** `avvia.bat` cerca `node.exe` in quest'ordine: cartella `node-v…-win-x64` dentro il progetto, stessa cartella un livello sopra, Node.js installato nel sistema. La cartella portatile non va su GitHub (è esclusa in `.gitignore`) e `aggiorna.bat` non la tocca.

Pacchetti npm: **nessuno**. Librerie front-end esterne: **nessuna** (niente CDN, il portale funziona anche senza internet).

Chi si collega dagli altri PC ha bisogno solo del browser.

## 2. Come dipendono tra loro i file del server

Le frecce vanno da chi usa a chi è usato. Un file può richiamare solo quelli sotto di lui: così non si creano dipendenze circolari.

```
avvia.bat
└── app/server.js                    punto di ingresso
    ├── src/routes/auth.js           stato, primo avvio, login, profilo
    ├── src/routes/users.js          account e ruoli
    ├── src/routes/programs.js       catalogo programmi
    ├── src/routes/files.js          file personali e invii
    └── src/routes/admin.js          home, annunci, log, errori, sistema
        │
        ├── src/storage.js           unico modulo che tocca i file su disco
        ├── src/http.js              router, controllo ruoli, file statici, errori
        │   └── src/security.js      password, sessioni, blocco tentativi
        │       └── src/db.js        database SQLite e migrazioni
        │           └── src/config.js   percorsi, porta, ruoli
```

## 3. Come dipendono tra loro i file dell'interfaccia

```
app/public/index.html
├── css/app.css                      tutto lo stile (colori in cima al file)
└── js/app.js                        avvio, login, menu laterale, navigazione
    ├── js/views-main.js             Home, Programmi, File, Profilo
    ├── js/views-admin.js            Team/Account, Log, Errori e bug, Sistema
    ├── js/ui.js                     elementi, icone, finestre, avvisi, formati
    └── js/api.js                    chiamate al server
```

## 4. Cartelle

```
hspiteammanager/
├── avvia.bat            avvia il portale solo su questo PC e apre il browser
├── avvia-rete.bat       come sopra, ma aperto alla rete locale (serve il firewall)
├── aggiorna.bat         scarica l'ultima versione da GitHub e avvia il portale
├── node-v22.22.2-win-x64/   Node.js portatile, MAI su GitHub
├── app/                 codice del portale (server + interfaccia)
├── images/              logo, sfondo, favicon personalizzati (anche branding/)
├── docs/                documentazione
├── scripts/             script di servizio (primo download)
└── data/                creata al primo avvio, MAI su GitHub
    ├── portale.db       database: account, programmi, log, impostazioni
    └── storage/         file caricati (programmi e file personali)
```

`data/` contiene tutto ciò che è tuo e non rigenerabile. Per fare un backup basta copiare quella cartella a portale fermo.

## 5. Regole per aggiungere cose

| Voglio aggiungere | Dove si tocca |
|---|---|
| Una nuova schermata | Una voce in `NAV` dentro `js/app.js` + una funzione `view…` in `views-main.js` o `views-admin.js` |
| Una nuova funzione lato server | Una `route(...)` nel file giusto di `src/routes/`, con il ruolo minimo indicato |
| Una nuova tabella o colonna | Una nuova voce **in fondo** a `MIGRATIONS` in `src/db.js` (mai modificare quelle esistenti) |
| Un nuovo ruolo | `ROLES` e `ROLE_LABELS` in `src/config.js` |
| Un altro archivio file (es. OneDrive) | Si sostituisce solo `src/storage.js` |
| Una libreria esterna | Prima si valuta se serve davvero; se sì, va scritta in questo documento |
