# Memoria dei modelli di file

Ogni file che il team usa davvero (Excel, PowerPoint, Word, PDF…) viene studiato una volta e descritto qui, così che:

- quando arriva un file simile lo si **riconosce** senza ricominciare da capo;
- si sa subito **quale app del portale** lo gestisce e **quali funzioni** usare;
- le app crescono su casi reali: ogni modello elenca ciò che l'app sa già fare e ciò che manca.

Regola del repository: qui stanno **struttura, stili, convenzioni e regole** dei modelli, mai dati aziendali (nomi di persone, percorsi SharePoint, contenuti dei progetti).

## Come è fatta la cartella

| File | Contenuto |
|---|---|
| `README.md` | Questo indice |
| `modelli.json` | Le **impronte** dei modelli, leggibili da codice: segnali di riconoscimento, app di destinazione, funzioni consigliate. In futuro l'importazione delle app lo userà per dire "riconosciuto come …" |
| `<formato>-<modello>.md` | La scheda di dettaglio di ogni modello: sintesi, struttura, stili, convenzioni, funzioni trovate, segnali di riconoscimento, cosa fa l'app, anomalie tipiche |

## Indice dei modelli

| Id | Formato | Modello | Come si riconosce | App | Scheda |
|---|---|---|---|---|---|
| `excel-piano-di-lavoro-gantt` | Excel (.xlsx) | Piano di lavoro di dettaglio (Gantt mensile a due livelli) | Un foglio "Piano di lavoro"; riga 4 con `LIV 1`, `Work Package`, `LIV 2`, `Work Package`, `Owner`, `Note` e poi le iniziali dei mesi; righe 2-3 con anni e trimestri in celle unite; barre fatte con il colore di sfondo delle celle, nessuna formula di calcolo | GestioneCelle | `excel-piano-di-lavoro-gantt.md` |
| `excel-bpb-processi` | Excel (.xlsx) | Mappa dei processi BPB (macro / processo / micro) | Tabelle Excel `tblMacro`, `tblProcessi`, `tblBPB`; fogli Istruzioni, Anagrafica Processi BPB, BPB | GestioneCelle | `docs/GESTIONECELLE.md` (già descritto lì) |

## Come aggiungere un modello

1. Studiare il file (struttura, formule, stili, layout, logica) e scrivere la scheda `<formato>-<modello>.md`.
2. Aggiungere l'impronta in `modelli.json` e la riga in questo indice.
3. Nella scheda, dire sempre cosa l'app sa già fare e cosa manca: è da lì che nascono le proposte di sviluppo.
