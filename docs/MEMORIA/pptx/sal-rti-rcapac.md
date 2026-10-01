# sal-rti-rcapac (.pptx) — Presentazione SAL del progetto R-CAP.AC

File ricevuto: `2026.02.23_Template_Presentazione_Sal_V1.00.pptx` (183 KB). Analizzato il 1° ottobre 2026. Nessun contenuto reale: e' lo scheletro.

## Sintesi

Scheletro di presentazione per gli incontri di stato avanzamento lavori (SAL) del progetto R-CAP.AC. Cinque slide quasi vuote
("Titolo", "Agenda", "Testo"): il valore sta nei **master e layout** con il brand (loghi, stemma, colori, carattere) e nella
struttura attesa: copertina → agenda numerata → slide di contenuto → slide con immagine.

## Impronta (per riconoscerlo)

| Elemento | Valore |
|---|---|
| Nome file | `AAAA.MM.GG_Template_Presentazione_Sal_Vn.nn.pptx` (data, "Template", oggetto, versione con la V maiuscola) |
| Formato | 16:9, 12192000 × 6858000 EMU (33,87 × 19,05 cm), "Widescreen" |
| Masters / layout | **4 master**, **24 layout** (molti doppioni: "Titolo e contenuto" ×3, "Diapositiva titolo" ×2, "Layout personalizzato" ×3) |
| Layout con testo fisso | "Diapositiva titolo" e "1_Diapositiva titolo" contengono i titoli del programma e la sigla **"R-CAP.AC"** |
| Carattere | **Titillium Web** ovunque (titoli, testi, data, numero). Il tema dichiara Aptos / Aptos Display ma e' sovrascritto |
| Colori | blu brand **164194** (barra in basso, data, numero slide, sottotitolo copertina), blu titoli **2F5496**, tema Office 2023 (accent1 156082) |
| Immagini | `image2.png` 2146×136 striscia dei loghi; `image3.jpeg` 612×612 trinacria in bianco e nero; `image1.jpeg` 128×128 sfondo piastrellato con alpha 0 (invisibile) |
| Metadati | creato 2025-05-05, ultima modifica 2026-04-08, 13 parole, 1 sezione "Sezione predefinita", `changesInfos` presente, customXml SharePoint, etichetta MIP rimossa |

## Struttura delle slide

| # | Layout (master) | Contenuto | Note |
|---|---|---|---|
| 1 | Diapositiva titolo (master 4) | Sottotitolo = titolo dell'incontro ("Titolo"); data "26/02/2026" bianca, corsivo, 12 pt in basso a sinistra | Il layout porta: striscia loghi in alto al centro, barra blu 164194 piena larghezza in basso, trinacria grande a destra (meta' slide, in sovrimpressione), i due blocchi fissi "Programma Nazionale / Capacita' per la Coesione 2021-2027 / Priorita' 1 – Azione 1.1.4" e "PROGETTO RAFFORZAMENTO … 'R-CAP.AC'". La data e' un segnaposto `dt` con idx orfano (4294967295): testo fisso, non si aggiorna da solo |
| 2 | Titolo e contenuto (master 1) | "Agenda" + elenco **numerato automatico** (`buAutoNum arabicPeriod`) "Titolo 1 / Titolo 2", grassetto 2F5496 | Titolo ed elenco sono **caselle di testo libere, non segnaposto**. Un rettangolo senza riempimento con bordo accent1 (19050 EMU) evidenzia la prima voce: e' l'**indicatore della sezione corrente** da spostare sulle slide agenda ripetute |
| 3 | Titolo e contenuto (master 1) | Segnaposto titolo "Titolo", contenuto "Testo", numero slide | Slide di contenuto standard |
| 4 | 1_Layout personalizzato (master 2) | Titolo + **segnaposto immagine** (idx 11, meta' destra a tutta altezza) + contenuto (idx 12) | Immagine a destra, testo a sinistra, vuoti |
| 5 | Layout personalizzato (master 2) | Contenuto (idx 1) + titolo + segnaposto immagine (idx 11) | Variante della 4 |

Master 1 (contenuto): striscia loghi in basso al centro (4084187, 6492874; 4023626×252000 EMU), data e numero slide in 164194 Titillium 12 pt,
titolo 28 pt, corpo 20/18/16 pt. Master 4 (copertina): barra blu in basso, data e numero in bianco, titolo 32 pt, trinacria.
Master 3 (layout 15, solo titolo con trinacria doppia) non e' usato da nessuna slide.

## Convenzioni

- Agenda = elenco numerato; ogni voce corrisponde a una sezione della presentazione; l'agenda si ripete con l'indicatore spostato.
- Titoli in Titillium Web grassetto 2F5496; corpo in Titillium Web; data in formato `gg/mm/aaaa`.
- Numero slide in basso a destra (segnaposto `sldNum` idx 4, sz quarter), data in basso a sinistra.
- Lo stile tabella predefinito del file e' "Stile medio 2 - Colore 1" (`{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}`): non ci sono tabelle, grafici o note.

## Quirk da ricordare

- Agenda e titolo della slide 2 non sono segnaposto: Cippi li trova con la regola "testo piu' grande in alto".
- 18 layout su 24 non sono usati: il file e' nato unendo piu' presentazioni. Una funzione di pulizia e' utile ma deve conservare i layout 1, 13, 14, 16.
- `ppt/changesInfos/` e' presente: l'esportazione di Cippi lo toglie gia'.
- L'immagine di sfondo invisibile (alpha 0) va ignorata nell'anteprima.

## Funzioni di Cippi da usare quando arriva un file di questo tipo

1. **Importa come modello aziendale** (`Importa` con `modello=1`): Cippi lo riconosce (impronta `sal-rti-rcapac`, punteggio 100) e tiene i suoi master e layout.
2. **Presentazione SAL** (pannello Funzioni → Presentazione SAL, oppure da Verbale Studio → "Verbale SAL in Word (e presentazione)"): dai dati del SAL nascono copertina compilata, agenda clonata dalla slide 2 con l'indicatore spostato, piano di lavoro, slide per servizio, consuntivazione, fatturazione, rischi. Le slide d'esempio del modello vengono tolte.
3. Per ritocchi: **Nuova slide** da "Titolo e contenuto" / "Solo titolo" (tabelle) / "Layout personalizzato" (immagine a destra), **Agenda** con "Copia l'agenda della slide 2", **Data** per la copertina, **Pulizia** (toglie 18 layout e 1 master inutilizzati; restano "Diapositiva titolo", "Titolo e contenuto", "Layout personalizzato", "Intestazione sezione", "Solo titolo").
4. **Controlli**: i segnaposto lasciati ("Titolo", "Testo", "Titolo 1 / Titolo 2") compaiono tra gli avvisi finché non si compilano.

Verificato il 1° ottobre 2026 sul file vero: 13 slide generate con le funzioni, presentazione SAL di 17 slide dai dati d'esempio, file validi (schema OOXML) e riapribili.

## Cosa manca ancora

Grassetti dentro una frase, grafici nativi, anteprima con i caratteri del layout (l'anteprima di Cippi non è PowerPoint).
