# Integrare le app con l'archivio del portale

Obiettivo: **un solo archivio**. I file stanno nelle cartelle dei progetti del portale; le app non tengono un archivio proprio, leggono e scrivono lì.

Dalla v0.5 **Verbale Studio è dentro il portale** (menu **Verbale Studio**, pagina `/verbali/`): stessi account, stessi progetti, stesse cartelle. Non serve più avviare il suo motore a parte.

## Dove vanno i file

```
progetti/
└── ATAC/                                   un progetto = una cartella (Esplora file → ATAC)
    ├── Verbali/                            archivio di Verbale Studio
    │   ├── 2026-09-28 Checkpoint settimanale/
    │   │   ├── Registrazione.mp4           video della riunione
    │   │   ├── Transcript originale.vtt    file di Teams
    │   │   ├── Transcript revisionato.txt  scritti da Verbale Studio a ogni salvataggio
    │   │   ├── Email di riepilogo.txt
    │   │   ├── Punti chiave.txt / Note.txt
    │   │   └── .verbale/                   dati del programma e versioni (nascosti in Esplora file)
    │   ├── .verbale-progetto.json          destinatari, oggetto, glossario, email d'esempio
    │   ├── .verbale-apprendimento.json     apprendimento locale del progetto
    │   └── .verbale-previsione.json        previsione del prossimo checkpoint
    ├── Registrazioni/                      (esempio) video di Teams ancora da usare
    ├── .storico/                           versioni precedenti dei file sostituiti
    └── .cestino/                           elementi eliminati, recuperabili
data/
├── personale/<id utente>/                  "I miei file" di ogni persona (Esplora file)
└── verbali/                                template e preimpostazioni comuni, impostazioni personali
```

Regole:

- Chi vede un progetto (membri e Hacker) vede e modifica anche i suoi verbali.
- La cartella di un checkpoint si può **rinominare o spostare** da Esplora file: Verbale Studio la ritrova.
- Se cambiano data o titolo del checkpoint, la cartella si rinomina da sola.
- **Niente si cancella**: checkpoint e video eliminati vanno nel cestino del progetto; ogni modifica conserva la versione precedente (anche quando a modificare è un collega).
- Se due persone lavorano sullo stesso checkpoint, chi apre o salva riceve un avviso con il nome dell'altra persona; le versioni precedenti restano recuperabili (⋯ → Versioni precedenti). Non c'è unione automatica delle modifiche.

## Portare dentro i dati del vecchio Verbale Studio

Una volta sola, dal PC che ospita il portale, con l'account Hacker:

1. Verbale Studio → **Impostazioni** → **Importa dal vecchio Verbale Studio**.
2. Scrivi la cartella del vecchio programma (quella con `data`, `Archivio`, `Registrazioni`), es. `C:\$$SHAPPA$$\APPS\VerbaleStudio`.
3. **Controlla e importa…** mostra cosa verrà importato e in quale progetto; conferma.

Cosa fa:

- **Copia** progetti, checkpoint, video, transcript, versioni, template, preimpostazioni, apprendimento e la tua firma. La cartella di origine non viene toccata.
- Un progetto del vecchio programma va nel progetto del portale con lo stesso nome; se non c'è, lo crea (visibile solo all'Hacker finché non scegli le persone).
- Si può rilanciare: i checkpoint già importati vengono saltati.
- La chiave API di Claude **non** viene importata: nel portale l'AI è solo locale (Ollama).

Il vecchio `sincronizza-una-tantum.bat` resta disponibile per copiare nei progetti altri file sparsi.

## Cosa offre il portale alle app

Un'app aperta dal portale lavora con la sessione di chi l'ha aperta, quindi vede solo gli spazi di quella persona. Le chiamate che modificano richiedono l'intestazione `x-hspi: 1`.

**Esplora file** — `<spazio>` è `me` (file personali) oppure `p<id>` (progetto):

| Operazione | Chiamata |
|---|---|
| Spazi visibili | `GET /api/explorer/spaces` |
| Contenuto di una cartella | `GET /api/explorer/<spazio>/list?path=<cartella>` |
| Aprire / scaricare (con Range per i video) | `GET /api/explorer/<spazio>/view?path=…` · `…/download?path=…` |
| Nuova cartella | `POST /api/explorer/<spazio>/folder` con `{ path, name }` |
| Caricare | `PUT /api/explorer/<spazio>/file?path=<cartella>&name=<nome>` (`&overwrite=1` per sostituire: la versione precedente va in `.storico`) |
| Rinominare / spostare | `POST …/rename` `{ path, name }` · `POST …/move` `{ path, to }` |
| Cestino | `POST …/trash` `{ path }` · `GET …/trash` · `POST …/trash/restore` `{ id }` |
| Versioni | `GET …/versions?path=…` · `POST …/versions/restore` `{ path, id }` |
| Ricerca e modifiche recenti (tutti gli spazi) | `GET /api/explorer/search?q=…` · `GET /api/explorer/recent` |

Le vecchie chiamate `/api/projects/<id>/files|download|view|folders` restano attive.

**Verbale Studio** usa le sue rotte sotto `/api/vs/` (stesse dell'app originale): vedi `app/src/routes/verbali.js`.

## Indice nel database

Le cartelle sono vere (sul disco), il database tiene un **indice** per la ricerca e per sapere chi ha modificato cosa:

- tabella `fs_index`: un rigo per file/cartella di ogni spazio; si aggiorna a ogni operazione del portale e si riallinea da solo (all'avvio, ogni ora e a ogni apertura di cartella) se qualcuno mette o toglie file direttamente dal disco;
- tabella `verbali`: un rigo per checkpoint, ricostruita dalle cartelle `.verbale` se serve.

Se l'indice si rovina non si perde niente: si ricostruisce dalle cartelle.
