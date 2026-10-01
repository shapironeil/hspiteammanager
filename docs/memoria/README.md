# Memoria dei modelli di file

Qui l'agente conserva, in modo strutturato e riutilizzabile, quello che impara dai file che riceve (PowerPoint, Word, Excel, PDF, ...):
le funzioni e le caratteristiche trovate, il modello del file (struttura, layout, stili, convenzioni di denominazione), gli elementi
che permettono di riconoscere lo stesso modello in futuro e quali funzioni delle app conviene usare quando arriva un file di quel tipo.

Regole:

- **Niente dati aziendali**: nelle schede stanno la struttura e le convenzioni, mai i contenuti dei documenti compilati. I nomi
  delle persone trovati nei file non vengono riportati. I nomi di programma o di ente servono solo a riconoscere il modello.
- **I file originali non stanno nel repository**: restano nella cartella del progetto (Esplora file) sul PC del portale.
- Ogni scheda ha la stessa forma: sintesi, impronta per il riconoscimento, struttura, stili, convenzioni, quirk, funzioni dell'app
  da usare, cose mancanti.
- `modelli.json` ripete le impronte in forma leggibile da un programma: e' il punto di partenza per il riconoscimento automatico
  dei modelli dentro Cippi e Verbale Studio.

## Come riconoscere un file nuovo

1. Guarda il nome del file: le convenzioni sono in ogni scheda (`AAAA.MM.GG_<Cosa>_<Tipo>_vN.NN.<ext>`).
2. Confronta l'impronta (`modelli.json`): caratteri, colori, immagini (dimensioni), nomi dei layout, titoli di capitolo.
3. Se corrisponde, applica le funzioni indicate nella scheda; se corrisponde in parte, segnala le differenze invece di tirare a indovinare.

## Indice

| Modello | File | Scheda | App |
|---|---|---|---|
| **Fascicolo SAL** (stato avanzamento lavori) di un progetto PA: i due file sotto condividono brand, progetto e dati | | `fascicolo-sal.md` | Cippi + Verbale Studio |
| Presentazione SAL (PowerPoint) | `2026.02.23_Template_Presentazione_Sal_V1.00.pptx` | `modelli/sal-presentazione.md` | Cippi |
| Verbale SAL (Word) | `2026.02.15_Verbale_SAL_Template_v1.00.docx` | `modelli/sal-verbale.md` | Verbale Studio (motore Word da creare) |
