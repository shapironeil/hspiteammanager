# Versione, aggiornamenti, backup e ripristino (host)

## Versione: una sola fonte

La versione sta **solo** in `version.json` alla radice. La leggono:

- il portale (pagina Sistema, `GET /api/version` senza login, nome della cache dell'app installabile);
- `scripts/aggiorna.js` (confronto tra installata e disponibile);
- il programma client (fase 4).

Per pubblicare una nuova versione si cambia solo `version.json`.

## Cosa è importante e dove sta

| Cartella | Contenuto | Nel backup |
|---|---|---|
| `data/` | database (account, permessi, log, indice dei file), file personali (`personale/`), file inviati (`storage/`), impostazioni di Verbale Studio (`verbali/`) | sì (il database copiato a caldo, in modo coerente) |
| `progetti/` | file dei progetti, verbali, video, versioni (`.storico`) e cestini (`.cestino`) | sì |
| `images/` | logo, sfondi, avatar | sì |
| `apptools/` | web app del team | sì |
| programma (`app/`, `scripts/`, `.bat`, `docs/`) | si riscarica | no |
| Node.js / PortableGit | si riscaricano | no |

## Backup

- **Automatico**: una volta al giorno, con il portale acceso (Sistema → Backup → "Backup automatico ogni giorno").
- **Prima di ogni aggiornamento**: sempre.
- **A mano**: Sistema → Backup → **Esegui adesso**, oppure `backup.bat`.

Dove va:

- In `Backup\<data>__<motivo>\`, accanto al portale. Si può cambiare in Sistema → Backup; meglio un disco diverso.
- **Copia aggiuntiva** facoltativa, per esempio l'altro server: `\\server\cartella`.

Come funziona:

- Ogni backup è una **cartella completa**, apribile e copiabile a mano.
- I file non cambiati dal backup precedente non vengono ricopiati: sono *collegamenti fissi* allo stesso contenuto e non occupano spazio in più. Dove i collegamenti non sono possibili (altro disco, rete) si copia.
- Un backup interrotto resta `…incompleto` e non viene mai usato.
- **I backup non si cancellano da soli.** Quando servirà spazio, decidi tu quali togliere.

## Ripristino

`ripristina.bat` mostra i backup e chiede quale usare. Poi:

1. ferma il portale;
2. **sposta** le cartelle attuali in `.ripristino-precedente\<data>\` (non cancella niente);
3. **copia** i file del backup al loro posto (il backup resta intatto).

Da riga di comando: `ripristina.bat --backup <nome> --si`.

## Aggiornamento

`aggiorna.bat` (opzioni: `--forza`, `--solo-controllo`, `--da "cartella"`):

1. Confronta `version.json` installato con quello disponibile. Se sono uguali **non fa niente**: si può rilanciare quante volte si vuole.
2. Un aggiornamento alla volta (lucchetto in `.aggiornamento\`).
3. Ferma il portale se è acceso (con un codice segreto che solo questo PC conosce).
4. **Backup** completo.
5. Installa:
   - con Git (cartella clonata), avanzamento del ramo;
   - senza Git, nuova versione preparata accanto e **scambio delle cartelle del programma**. Le vecchie vanno in `.aggiornamento\precedenti\<data>\`; si tengono le ultime 3 copie del solo programma.
6. **Prova di avvio** su una porta di prova. Se la nuova versione non risponde, rimette programma e database com'erano e lo dice.

Non tocca mai `data`, `progetti`, `Backup`, `apptools`, Node.js e Git portatili. In `images` aggiunge solo file nuovi.

Fino alla versione stabile gli aggiornamenti arrivano da GitHub (ramo `main`); dopo arriveranno dall'host.

### Passaggio dalla v0.5

La prima volta l'aggiornamento lo fa ancora il vecchio `aggiorna.bat`, che copia i file nuovi, compreso il nuovo `aggiorna.bat`. Dalla volta successiva vale tutto quanto descritto sopra.
