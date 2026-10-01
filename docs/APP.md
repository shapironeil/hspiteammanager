# App del portale (catalogo)

Verbale Studio, GestioneCelle e Cippi sono **app dedicate** del portale. Usano gli stessi account e gli stessi progetti del portale. Ognuna ha però la sua versione, la sua pagina, le sue novità e, se le serve, un proprio motore che gira sul PC dell'utente.

## Come si usano (per il team)

Dal portale si va in **App e programmi**. Per ogni app ci sono tre modi d'uso, tutti senza setup e senza cartelle da spostare.

| Modo | Pulsante | Cosa succede |
|---|---|---|
| Nel browser | **Apri** | La pagina dell'app (`/verbali/`, `/celle/`). Funziona sempre, anche dal telefono. |
| App del browser | **Installa nel browser** | Edge o Chrome la installano come app: finestra a sé, icona nel menu Start. Non servono diritti di amministratore. |
| Sul PC con HSPI Client | **Scarica sul PC** / **Apri sul PC** | HSPI Client scarica il pacchetto dal portale (impronta SHA-256), lo mette in `%LOCALAPPDATA%\HSPI-Client\apps\<id>\`, crea il collegamento sul desktop e lo tiene aggiornato. Se l'app è già sul PC, si apre e basta, nella sua finestra (Edge in modalità app). |

Se l'app è già sul PC ma il portale ha una versione più nuova, compare **Aggiorna a vX**. In ogni caso HSPI Client aggiorna da solo le app a ogni avvio.

## Com'è fatta un'app (per chi sviluppa)

Ogni app è una cartella `app/catalogo/<id>/` con questi file:

| File | Obbligatorio | Contenuto |
|---|---|---|
| `app.json` | sì | La scheda dell'app. Tiene la **versione dell'app (unica fonte)**, la pagina web, le novità e il motore. |
| `icon.svg` | sì | Icona |
| `icon-192.png`, `icon-512.png` | consigliati | Per l'installazione nel browser e il collegamento sul desktop. Si rigenerano con `node scripts/genera-icone-app.js`. |
| `engine.js` | no | Motore locale. Gira dentro HSPI Client, sul PC dell'utente. |

Le altre parti stanno dove stanno le parti del portale:

- la pagina, in `app/public/<cartella>/`, con `<link rel="manifest" href="/catalogo/<id>/manifest.webmanifest">`;
- le API, in `app/src/routes/<nome>.js`;
- la logica, in `app/src/<nome>/`.

Un esempio di `app.json`:

```json
{
  "id": "gestione-celle",
  "name": "GestioneCelle",
  "version": "0.8.0",
  "released": "2026-10-01",
  "summary": "Una riga per la scheda",
  "description": "Più dettagli",
  "web": "/celle/",
  "icon": "icon.svg",
  "minPortal": "0.7.0",
  "engine": null,
  "novita": [{ "version": "0.8.0", "date": "2026-10-01", "items": ["..."] }]
}
```

Il campo `engine` di un'app con motore (Verbale Studio):

```json
"engine": { "main": "engine.js", "files": { "engine.js": "catalogo/verbale-studio/engine.js", "ollama.js": "src/verbali/ollama.js" }, "does": "AI locale con Ollama" }
```

- `files` elenca i file del pacchetto, con il percorso a partire da `app/`. Un modulo usato anche dall'host, come `ollama.js`, resta in un'unica copia.
- `minPortal` è la versione minima del portale. Se il portale è più vecchio, l'app compare con l'avviso *Da aggiornare il portale*.

### Il motore locale

```js
module.exports = {
  routes: {
    'GET /stato': async () => ({ ok: true }),
    'POST /lavoro': async ({ body, host }) => ({ risultato: fai(body) }),
    // streaming: si scrive da sé su res e si restituisce undefined
    'POST /flusso': async ({ body, res, cors }) => { res.writeHead(200, { ...cors }); res.end('...'); },
  },
};
```

HSPI Client espone il motore su `http://127.0.0.1:4320/app/<id>/<percorso>`, solo alle pagine del portale (controllo dell'Origin, Private Network Access). La pagina dell'app controlla `/stato` di HSPI Client: `apps` dice quali app sono sul PC e con quale versione.

### Pubblicare una versione nuova

1. Modifica l'app e alza `version` in `app.json`; aggiungi una voce in `novita`.
2. Pubblica il portale come sempre: `aggiorna.bat` sull'host.
3. I client si allineano da soli al prossimo avvio. In alternativa basta il pulsante **Aggiorna** nella pagina App.

### Indirizzi dell'host

| Indirizzo | Cosa |
|---|---|
| `GET /api/catalogo` | Elenco delle app: versione, novità, pacchetto con impronta. Pubblico, come `/api/version`. |
| `GET /api/version` → `apps` | Versione e pacchetto di ogni app, per HSPI Client |
| `GET /scarica/app/<id>.zip` | Pacchetto dell'app |
| `GET /catalogo/<id>/icon.svg`, `icon-192.png`, `icon-512.png` | Icone. Dalla cartella dell'app non si serve nient'altro. |
| `GET /catalogo/<id>/manifest.webmanifest` | Manifest per installarla nel browser (scope = pagina dell'app) |

### Indirizzi di HSPI Client (127.0.0.1:4320)

| Indirizzo | Cosa |
|---|---|
| `GET /stato` | `{ app: 'hspi-client', version, host, apps: { id: versione } }` |
| `POST /app/installa {id}` | Scarica o aggiorna l'app dal portale e crea il collegamento sul desktop |
| `POST /app/apri {id}` | Apre l'app nella sua finestra; se non è sul PC, prima la scarica |
| `POST /app/rimuovi {id}` | Toglie l'app e il collegamento |
| `* /app/<id>/<percorso>` | Rotte del motore dell'app |

Il collegamento sul desktop lancia `HSPI.bat --apri <id>`:

- se HSPI Client è già aperto, gli chiede di aprire l'app;
- altrimenti lo avvia, si aggiorna e apre l'app invece del portale.
