# Motore Word — documenti `.docx` per funzioni

Il motore Word legge, controlla e **compila** i documenti Word del team per funzioni, senza toccare il testo riga per riga e senza librerie esterne. Vive dentro **Verbale Studio** (il primo documento che compila è il **verbale SAL**) ed è a disposizione di tutto il portale con le API `/api/word/`. I dati del SAL sono gli stessi che Cippi usa per la **presentazione SAL** (vedi `CIPPI.md`): si compilano una volta e si ottengono il verbale Word e le slide.

## Cosa fa

| Funzione | Cosa succede |
|---|---|
| **Leggi** | Ricostruisce la struttura di un `.docx`: capitoli (dagli stili Titolo o dalla numerazione), paragrafi, tabelle con celle unite e colori, sezioni (verticale/orizzontale), intestazioni e piè di pagina, campi (indice, numeri di pagina), commenti, revisioni, segnaposto `[Inserire …]`. |
| **Riconosci il modello** | Confronta il file con le impronte in `docs/MEMORIA/docx/`: se è un modello noto (per esempio il verbale SAL) dice quale, con un punteggio e le funzioni da usare. |
| **Controlla** | Segnaposto rimasti, evidenziazioni gialle, commenti del modello, indice da aggiornare, capitoli vuoti, codici `S_n` / `S_n.m` incoerenti tra i capitoli, prospetto economico che non quadra (ritenuta 0,5%, IVA 22%, totale), totali per componente RTI. |
| **Compila il verbale SAL** | Dai dati del SAL riempie il modello: informazioni, rappresentanti, riferimenti contrattuali, premessa, **Gantt a celle** con i mesi del periodo, **resoconto per servizio e attività** con i deliverable, tabella di raccordo, **consuntivazione** per componente RTI e per attività (sezione orizzontale, colonne dei mesi ricalcolate), **fatturazione** e prospetto economico, dichiarazioni e firme. Toglie i commenti del modello, segna l'indice da aggiornare, toglie l'evidenziazione dai campi compilati. |
| **Compila un modello qualunque** | Sostituzioni testo → testo e tabelle a righe (copiate da una riga modello), per qualunque `.docx` con segnaposto. |
| **Crea da zero** | Un documento con titoli, paragrafi, tabelle e sezioni, o il **modello di prova** del verbale SAL (inventato, con la stessa struttura di quello vero). |
| **Archivia** | Il file compilato va nella cartella del checkpoint di Verbale Studio (`Verbali/<data titolo>/`) o in `Verbali/SAL/`, con le versioni precedenti in Esplora file. Oppure si scarica. |

Le frasi che Word spezza in più "run" (correttore, stili diversi a metà frase) vengono ricomposte prima della ricerca: `[Inserire importo]` si trova anche se nel file è in tre pezzi. Il testo nuovo prende lo stile del punto in cui comincia la frase sostituita.

## Dall'app: Verbale Studio → Verbale SAL in Word

Nel checkpoint, menu **⋯ → Verbale SAL in Word (e presentazione)…**:

1. si sceglie il **modello Word** del progetto (caricato una volta in `Verbali/Modelli/`, oppure il modello di prova);
2. i punti del checkpoint sono già nei dati (sintesi, milestone, avanzamento, prossimi passi, rischi con owner e scadenza, decisioni), riconosciuti dal **ruolo** delle sezioni del riepilogo, non dal nome;
3. si completano numero del SAL, periodo, luogo, lotto e, nel riquadro JSON, **servizi, attività, importi per mese, rappresentanti, riferimenti**: totali, percentuali, ritenuta e IVA li calcola il portale;
4. **Crea il verbale**: il `.docx` finisce nella cartella del checkpoint (o si scarica). Se si sceglie anche un **modello Cippi**, nasce pure la presentazione.

Prima di compilare, i dati vengono controllati: un avanzamento che supera il valore dell'attività, codici ripetuti, consuntivazione per componente diversa da quella per attività fermano la creazione (con `forza: true` dall'API si procede lo stesso).

## I dati del SAL

Un solo oggetto (`app/src/sal.js`), usato da Word e da Cippi. Tutto è facoltativo: i calcoli completano quello che manca.

```json
{
  "progetto": "Nome", "committente": "Ente", "lotto": "1", "numero": 2,
  "periodo": { "da": "2026-04-01", "a": "2026-06-30" }, "luogo": "Palermo", "data": "2026-07-10",
  "facilitatore": "", "scrivente": "",
  "rappresentantiPA": [{ "nome": "", "ente": "", "ruolo": "RUP" }], "rappresentantiRTI": [{ "nome": "", "societa": "" }],
  "riferimenti": { "accordoQuadro": { "id": "", "data": "", "descrizione": "", "cigLotto": "" }, "pianoFabbisogni": { "id": "" }, "pianoOperativo": { "id": "" }, "contrattoEsecutivo": { "id": "", "data": "", "cig": "", "cup": "" } },
  "servizi": [{ "codice": "S_1", "lettera": "A", "sigla": "SVI", "nome": "", "quantita": 100, "tariffa": 300,
    "attivita": [{ "nome": "", "descrizione": "", "deliverable": ["…"], "valore": 12000, "importiMese": [4000, 4000, 2000], "importoPrecedente": 0, "gg": null }] }],
  "componentiRTI": [{ "nome": "", "totale": 30000, "attuale": 22000, "precedenti": 0 }],
  "deliverableCodifica": [{ "nome": "", "codice": "" }],
  "sintesi": "", "milestone": [], "avanzamento": [], "prossimiPassi": [], "rischi": [{ "text": "", "owner": "", "deadline": "" }], "decisioni": []
}
```

Calcoli: i **mesi** dal periodo; i **codici** `S_n`, `S_n.m` e `A_1` se mancano; l'importo del SAL di ogni attività come somma dei mesi; totali per servizio e complessivi; `% progress` = (SAL attuale + precedenti) / valore; **ritenuta 0,5%**, **credito**, **IVA 22%** sul credito, **totale fattura**. `GET /api/sal/esempio` restituisce dati d'esempio già calcolati.

## API

| Metodo e indirizzo | Cosa |
|---|---|
| `PUT /api/word/leggi?name=` (corpo = `.docx`) | struttura, modello riconosciuto, controlli |
| `POST /api/word/controlla` (corpo = `.docx`) | solo i controlli |
| `GET /api/word/modelli?projectId=` | i modelli Word del progetto (`Verbali/Modelli/*.docx` e i `.docx` con "template" o "modello" nel nome), con il modello riconosciuto |
| `PUT /api/word/modelli?projectId=&name=` (corpo = `.docx`) | salva un modello nella cartella del progetto |
| `POST /api/word/sal` `{projectId, modello, dati, nome, checkpointId, scarica, forza}` | verbale SAL compilato (`modello` = percorso nel progetto, oppure `"esempio"`) |
| `POST /api/word/compila` `{projectId, modello, sostituzioni, tabelle, nome, scarica}` | modello qualunque compilato |
| `POST /api/word/nuovo` `{projectId, nome, blocchi, esempio}` | documento da zero, o il modello di prova |
| `GET /api/sal/esempio` · `POST /api/sal/calcola {dati}` · `POST /api/sal/da-checkpoint {projectId, checkpointId, template}` | dati del SAL |

Permessi: chi vede il progetto. Tutto viene registrato nel log (`word.*`).

## Codice

| File | Cosa fa |
|---|---|
| `app/src/word/docx-read.js` | lettura strutturata |
| `app/src/word/docx-write.js` | modifica per funzioni: run uniti, sostituzioni, paragrafi, tabelle, commenti, impostazioni |
| `app/src/word/docx-new.js` | documento da zero e modello di prova del verbale SAL |
| `app/src/word/sal-verbale.js` | compilazione del verbale SAL e compilazione generica |
| `app/src/word/controlli.js` | controlli |
| `app/src/sal.js` | dati, calcoli e controlli del SAL (comune a Word e Cippi) |
| `app/src/modelli.js` | riconoscimento dei modelli noti (impronte in `docs/MEMORIA`) |
| `app/src/routes/word.js`, `app/src/routes/sal.js` | API |
| `app/test/word.test.js` | prove (modello inventato: nessun file di un cliente nel repository) |

## Limiti di questa versione

- Il modello del verbale SAL si riconosce dagli ancoraggi (titoli dei capitoli, intestazioni delle tabelle, segnaposto tra parentesi quadre): un modello con capitoli rinominati va compilato con la funzione generica.
- L'indice (campo TOC) viene segnato da aggiornare: Word lo ricalcola alla prima apertura (chiede conferma). I numeri di pagina non si calcolano senza Word.
- Il testo nuovo dentro una frase spezzata prende lo stile del primo pezzo: i grassetti a metà frase vanno rifatti in Word.
- Niente PDF: si fa da Word, o in futuro con il motore locale di HSPI Client.
