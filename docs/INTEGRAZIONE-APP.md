# Integrare le app con l'archivio del portale

Obiettivo: **un solo archivio**. I file stanno nelle cartelle dei progetti del portale; le app come Verbale Studio non tengono un archivio proprio, leggono e scrivono lì.

## Situazione di partenza

Verbale Studio oggi:

- ha un suo **motore** (un programma avviato da `Avvia Verbale Studio (Windows).bat`) e un suo **archivio**;
- aperta dal portale come semplice pagina non trova il motore e mostra il messaggio "È ancora aperta una versione precedente del motore dell'app".

Finché non viene adattata, si usa così: la avvii con il suo `.bat`, poi in **Programmi → Modifica** incolli nel campo "Indirizzo dell'app" l'indirizzo che compare nel browser. Il pulsante **Apri** del portale porta lì.

## Dove vanno i file

```
progetti/
└── ATAC/                          un progetto = una cartella
    ├── Verbale Studio/            ciò che arriva dall'importazione una tantum
    │   └── 2026-09-28 .../        verbale e informazioni di quella data
    ├── Verbali/                   proposta: un verbale per cartella, AAAA-MM-GG in testa al nome
    ├── Checkpoint/                proposta: lo storico dei checkpoint del progetto
    └── .storico/                  versioni precedenti dei file sostituiti (nascosta nel portale)
```

Chi vede cosa lo decide la scheda del progetto: solo i membri e l'Hacker.

## Importazione una tantum

`sincronizza-una-tantum.bat` copia nel progetto i file che oggi stanno nell'archivio di Verbale Studio.

- Propone da solo le cartelle di dati trovate in `apptools`; in alternativa trascini una cartella nella finestra.
- Chiede il progetto di destinazione (predefinito: ATAC) e la sottocartella.
- **Copia soltanto**: l'origine non viene toccata. Non sovrascrive mai un file già presente nel progetto.
- Salta i file di programma (motore, librerie, script).
- Scrive un rapporto `_importazione-….txt` nella cartella del progetto.

Dopo l'importazione il progetto compare in **Progetti**, visibile solo all'Hacker finché non scegli le persone.

## Cosa offre già il portale alle app

Un'app aperta dal portale lavora con la sessione di chi l'ha aperta, quindi vede solo i progetti di quella persona.

| Operazione | Chiamata |
|---|---|
| Progetti visibili all'utente | `GET /api/projects` |
| Contenuto di una cartella | `GET /api/projects/<id>/files?path=<cartella>` |
| Leggere un file | `GET /api/projects/<id>/download?path=<file>` |
| Creare una cartella | `POST /api/projects/<id>/folders` con `{ path, name }` |
| Salvare un file nuovo | `PUT /api/projects/<id>/files?path=<cartella>&name=<nome>` |
| Salvare sopra un file esistente | come sopra, con `&overwrite=1`: la versione precedente finisce in `.storico` |

Le chiamate che modificano richiedono l'intestazione `x-hspi: 1`.

## Cosa resta da fare su Verbale Studio

Serve il suo codice, che oggi non è su GitHub. I passi:

1. Togliere l'archivio interno: salvataggi e letture passano dalle chiamate qui sopra.
2. Far scegliere il progetto di riferimento quando si apre o si crea un verbale.
3. Scrivere lo storico dei checkpoint nella cartella `Checkpoint` del progetto.
4. Unione delle modifiche: quando due persone salvano lo stesso verbale, decidere la regola (avviso e confronto, oppure l'ultima vince con la precedente nello storico, che è ciò che il portale fa già).
5. Decidere se il motore resta un programma a parte o se le sue funzioni entrano nel portale.

Per caricare il codice senza i documenti: `carica-su-github.bat` esclude da `apptools` le cartelle di dati più comuni e i documenti (docx, pdf, xlsx…). Controlla comunque l'elenco prima di confermare.
