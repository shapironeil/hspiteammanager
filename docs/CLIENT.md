# Host e client

| | **Host** (il PC del portale, 16 GB di RAM) | **Client** (il PC di ogni persona) |
|---|---|---|
| Cosa gira | Il portale: un solo processo Node.js, memoria limitata a 768 MB | HSPI Client: aggiornamento, motore locale, apertura del portale |
| Cosa conserva | Tutti i file importanti (`data`, `progetti`, immagini, web app) + backup | Niente di importante: solo il programma |
| Lavori pesanti | No. L'AI locale sull'host è **spenta** di default (Sistema → Impostazioni) | Sì: l'AI locale (Ollama) gira qui, nel motore locale |
| Streaming | Invia i file a pezzi (video compresi, con Range), senza caricarli in memoria | Li riceve nel browser |
| Accesso | Solo da 127.0.0.1 + `tailscale serve` (HTTPS nella rete privata) | Tailscale acceso |

## Versione: una sola fonte

`version.json` alla radice del portale. La legge:

- il portale: `GET /api/version`, senza login, raggiungibile solo dalla rete privata;
- `aggiorna.bat` sull'host;
- HSPI Client, che si allinea sempre alla versione dell'host.

## HSPI Client

**Installazione** (pagina `/scarica` del portale):

1. Si scarica `HSPI-Client.zip`. Lo prepara l'host al momento e dentro mette `host.txt` con l'indirizzo da cui è stato scaricato: il client sa già a chi collegarsi.
2. Si estrae e si lancia `installa.bat`. **Non servono diritti di amministratore**: tutto va in `%LOCALAPPDATA%\HSPI-Client`.
3. Se sul PC non c'è Node.js, lo scarica dall'host (`/scarica/node.exe`, lo stesso Node portatile del PC del portale).
4. Crea il collegamento **HSPI** sul desktop e lo avvia.

**A ogni avvio** (`HSPI.bat` → `app/hspi-client.js`):

1. Chiede all'host `/api/version`.
2. Se la sua versione è diversa, scarica `/scarica/client-app.zip` e controlla l'**impronta SHA-256** pubblicata dall'host.
3. Prepara la nuova versione accanto alla vecchia e le scambia. La vecchia va in `precedenti\` (si tengono le ultime 2). Se qualcosa va storto resta quella di prima.
4. Riparte con la versione nuova.
5. Accende il **motore locale** su `http://127.0.0.1:4320`, che risponde solo alle pagine del portale.
6. Apre il portale nel browser.

**Motore locale:**

- Verbale Studio lo cerca all'apertura. Se c'è, l'AI locale gira sul PC dell'utente: installazione di Ollama, download dei modelli, riformulazioni, correzioni, addestramento e chat.
- L'host prepara soltanto i testi da passare all'AI (contesto della riunione, glossario, esempi): è un lavoro leggero.
- Se il client non c'è, Verbale Studio lo dice e rimanda alla pagina Scarica. Il resto del portale funziona normalmente.

## Sito

Pagine senza accesso (comunque solo dentro la rete privata):

- `/benvenuto`: presentazione;
- `/guida`: cos'è, come funziona, come si installa, come ci si collega, domande;
- `/scarica`: HSPI Client con versione e istruzioni.

Dalla pagina di accesso del portale c'è il link *Cos'è e come si installa*.

## Da verificare dal vivo

- `installa.bat` su un PC Windows aziendale: download con `curl`, collegamento sul desktop con PowerShell.
- Il browser che apre il portale in `https://…ts.net` e parla con `http://127.0.0.1:4320`. È previsto dalle regole dei browser (indirizzo locale e intestazione *Private Network Access*), ma va provato con Edge/Chrome aziendali.
- Ollama sul client con un modello vero.
