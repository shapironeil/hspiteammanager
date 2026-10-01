# REPORT — 2026-10-01 — Fascicolo SAL: Cippi per funzioni e motore Word (Cippi 0.2.0, Verbale Studio 1.1.0)

Branch: `claude/awesome-cray-8lgn1k`.

## Da dove si parte

Due file del team: la **presentazione SAL** (`.pptx`, 5 slide scheletro con 4 master e 24 layout) e il **verbale SAL** (`.docx`, 10 capitoli, 12 tabelle, sezione orizzontale, segnaposto `[Inserire …]`). Le schede e le impronte stanno in `docs/MEMORIA/` (`pptx/sal-rti-rcapac`, `docx/sal-rti-rcapac`, `fascicolo-sal-rti-rcapac.md`), nella convenzione comune con le altre sessioni. Nessun file dei clienti nel repository.

## Cosa è cambiato

### Cippi 0.2.0 — per funzioni, non slide per slide

- `app/src/cippi/pptx-build.js`: slide nuove **dai layout del modello** (segnaposto titolo, contenuto, immagine, data, numero; caselle standard se il layout non ne ha), **agenda** numerata con il rettangolo-indicatore (clonata dalla slide Agenda del modello o creata dal layout) e divisori, **immagini** nel segnaposto senza deformarle, **tabelle** native con lo stile del file, **note** del relatore, **data** nei segnaposto, **pulizia** di layout/master/temi/immagini inutilizzati, **togli slide**, compilazione dei segnaposto di una slide esistente (copertina).
- `app/src/cippi/sal-deck.js`: la **presentazione SAL dai dati** dentro il modello aziendale.
- `app/src/routes/cippi.js`: `GET …/layouts`, `POST …/funzioni` (azioni in sequenza → nuova versione), `PUT …/slide-immagine`, `POST …/sal`, importazione diretta come modello (`modello=1`); l'analisi riporta il **modello noto** riconosciuto.
- `app/src/cippi/analyze.js`: controllo dei **segnaposto non compilati**; titolo riconosciuto anche un po' più in basso (le agende con caselle libere).
- `app/public/cippi/funzioni.js`: pannello **Funzioni**, modulo a sé (`#/doc/<id>?funzioni=1` o `CippiFunzioni.open(id)`), per non interferire con il restyling dell'interfaccia in corso in un'altra sessione.

### Motore Word (dentro Verbale Studio 1.1.0)

- `app/src/word/docx-read.js` (struttura), `docx-write.js` (run uniti, sostituzioni anche su frasi spezzate, paragrafi, tabelle a righe e a mesi, commenti, `updateFields`), `docx-new.js` (documenti da zero, modello di prova del verbale SAL), `sal-verbale.js` (compilazione del verbale SAL per ancoraggi e compilazione generica), `controlli.js`.
- `app/src/sal.js`: l'oggetto **SAL** comune (mesi, codici, totali, ritenuta 0,5%, IVA 22%, controlli, dati dal checkpoint).
- `app/src/modelli.js`: riconoscimento dei modelli noti da `docs/MEMORIA/*/*.impronta.json`, per `.pptx` e `.docx`.
- `app/src/routes/word.js`, `app/src/routes/sal.js`: API (vedi `docs/WORD.md`).
- Verbale Studio: voce **⋯ → Verbale SAL in Word (e presentazione)…** con il modello del progetto, i dati dal checkpoint, i campi del SAL, il salvataggio nella cartella del checkpoint o lo scarico, e la presentazione in Cippi insieme.

## Verifiche fatte

- Sui due file veri (solo in locale): presentazione SAL di 17 slide e verbale SAL con **0 segnaposto rimasti**, 12 tabelle compilate, validi allo schema OOXML (`validate.py` del toolkit Office) e riapribili con python-pptx / python-docx. Riconoscimento dei modelli: 100/100 per entrambi; una presentazione qualunque: 5/100.
- `node --test --test-concurrency=1 test/*.test.js`: **60 su 60** (nuovi: `word.test.js` con 6 prove, `cippi.test.js` con 2 prove in più).
- Prova nel browser: `app/test/browser/sal.ui.js` (pannello Funzioni di Cippi e verbale SAL da Verbale Studio).

## Cose aperte

- Il pulsante "Funzioni" nel pannello strumenti di Cippi va aggiunto dopo il merge del nuovo stile (l'altra sessione): per ora il pannello si apre dall'indirizzo.
- Da provare in PowerPoint e Word 365: l'indicatore dell'agenda, i caratteri dei layout, l'aggiornamento dell'indice all'apertura.
- `version.json` non è stato toccato: la versione del portale si alza quando si pubblica (le app hanno le loro versioni in `app.json`).
