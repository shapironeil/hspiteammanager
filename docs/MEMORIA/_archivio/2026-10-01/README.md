# Archivio del 01/10/2026 — le schede originali prima dell'unificazione

Qui ci sono le **copie identiche** (fatte con `cp`, byte per byte) delle schede di memoria scritte da quattro agenti il 1° ottobre 2026, com'erano nel ramo `claude/integrazione-2026-10-01` (commit `6bac9b0`) prima che venissero unificate in `docs/MEMORIA/` con il formato unico a 10 sezioni. I percorsi dentro ogni cartella sono quelli originali dentro `docs/`.

Perché esiste: gli agenti avevano usato due cartelle con convenzioni diverse (`docs/MEMORIA/` con una scheda e un'impronta per template; `docs/memoria/` con `modelli.json` e una cartella `modelli/`). Su Windows `memoria` e `MEMORIA` sono la stessa cartella, quindi `docs/memoria` è stata svuotata e rimossa. Le informazioni sono tutte nelle schede nuove (sezione "Da classificare" quando non avevano un posto); l'archivio serve a controllare che niente sia andato perso.

**Non modificare questi file**: le schede vive sono in `docs/MEMORIA/<formato>/`.

**Attenzione (da sistemare nel codice)**: `app/src/cippi/impronta.js` legge tutti i `*.impronta.json` sotto `docs/MEMORIA`, archivio compreso, quindi oggi vede due volte il kick-off (`admiring-hopper/MEMORIA/pptx/kickoff-txt-biosiris.impronta.json` e quello vivo). Serve far saltare le cartelle `_archivio/` (o che iniziano con `_`) in `modelliNoti`; finché non è fatto, nel pannello Documento di Cippi il kick-off può comparire due volte, la seconda con la scheda nell'archivio.

## Cosa c'è

| Cartella | Agente | Sessione | Ramo | Commit | File | Dove è finito |
|---|---|---|---|---|---|---|
| `admiring-hopper/MEMORIA/` | `admiring-hopper` | `session_01GqNo1MzxngbR1RQrFUDijL` | `claude/admiring-hopper-dc5bp0` | `e5ab667`, `fff10ab` | `README.md` (indice, creato da lui ed esteso da cool-noether in `8314b5a` e `74c4dad`: righe xlsx/docx, fascicolo, paragrafi sulle impronte dei `.xlsx` e dei `.docx`); `pptx/kickoff-txt-biosiris.md`, `pptx/kickoff-txt-biosiris.impronta.json` | `docs/MEMORIA/README.md`; `docs/MEMORIA/pptx/kickoff-txt-biosiris.md` (riscritta nel formato unico); impronta uguale con in più `provenienza` |
| `cool-noether/MEMORIA/` | `cool-noether` | `session_016fgi7494LKk88z4etQe9Lu` | `claude/cool-noether-kv3o8c` | `0fe8189`, `8314b5a`, `74c4dad` | `xlsx/piano-di-lavoro-txt-biosiris.md` + `.impronta.json`; `docx/piano-operativo-consip-id2610.md` + `.impronta.json`; `docx/appendici-aq-consip-id2610.md` + `.impronta.json`; `docx/nomina-responsabile-trattamento-consip.md` + `.impronta.json`; `docx/kit-aq-id2610.conoscenza.json`; `fascicolo-aq-id2610.md` | schede riscritte nel formato unico negli stessi percorsi; impronte uguali con in più `provenienza`; conoscenza del kit identica; fascicolo spostato in `docs/MEMORIA/fascicoli/fascicolo-aq-id2610.md` con i collegamenti aggiornati |
| `awesome-cray/memoria/` | `awesome-cray` | `session_01WbrSz86BeYisrNNoJc7Eh5` | `claude/awesome-cray-8lgn1k` | `51e11c0` | `README.md`; `modelli.json`; `modelli/sal-presentazione.md`; `modelli/sal-verbale.md`; `fascicolo-sal.md` | `docs/MEMORIA/pptx/sal-presentazione.md` + `.impronta.json` (dalla voce di `modelli.json`); `docs/MEMORIA/docx/sal-verbale.md` + `.impronta.json`; regole del README nel README generale; fascicolo spostato in `docs/MEMORIA/fascicoli/fascicolo-sal.md` |

## Versioni ancora più vecchie (solo in git)

- `0fe8189` (cool-noether): prima versione della scheda del piano di lavoro come `docs/MODELLI-FILE/excel-piano-di-lavoro-gantt.md`, con `README.md` e `modelli.json` (che conteneva anche l'impronta del BPB `excel-bpb-processi`). Tolta da cool-noether stesso in `8314b5a`; le informazioni in più sono nella sezione "Da classificare" di `docs/MEMORIA/xlsx/piano-di-lavoro-txt-biosiris.md`. Si rilegge con `git show 0fe8189:docs/MODELLI-FILE/modelli.json`.
- `e5ab667` (admiring-hopper): prima versione della scheda del kick-off, con la sezione 6 "Cosa fa già Cippi" misurata con Cippi 0.1.0 (il testo è conservato nella sezione 7 della scheda nuova).

## Conflitti trovati

Vedi `docs/MEMORIA/CONFLITTI.md`.
