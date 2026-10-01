# Fascicolo SAL — cosa lega la presentazione e il verbale

I due modelli SAL ricevuti il 1° ottobre 2026 appartengono allo stesso contesto e vanno pensati insieme.

## Contesto comune

- Progetto di una pubblica amministrazione regionale, finanziato dal PN "Capacità per la Coesione 2021-2027" (Priorità 1 – Azione 1.1.4),
  sigla di progetto **R-CAP.AC**, eseguito da un **RTI** (raggruppamento di imprese) per conto dell'**Amministrazione**.
- Ruoli della PA: **RUP** (responsabile unico del progetto) e **DEC** (direttore dell'esecuzione del contratto). Il verbale e' firmato da entrambi.
- Il **SAL** (stato avanzamento lavori) e' periodico (nel modello: trimestrale, "Aprile – Giugno") e rendiconta per **Lotto**.
- Stessa identita' visiva: striscia dei loghi (Coesione Italia 21-27 Sicilia, UE "Cofinanziato dall'Unione europea", Repubblica Italiana,
  Regione Siciliana, 2146×136 px), stemma regionale, carattere **Titillium Web**, blu **164194** / **2F5496** / **002060**.

## Lo stesso modello dei dati alimenta entrambi i file

| Dato | Nel verbale (Word) | Nella presentazione (PowerPoint) |
|---|---|---|
| Periodo del SAL, lotto, data e luogo | cap. 1, 5, 9, 10 | copertina (data), agenda |
| Partecipanti PA / RTI | cap. 2, 3 | — (eventuale slide) |
| Riferimenti contrattuali (AQ, Piano dei fabbisogni, Piano operativo, CE, CIG, CUP) | cap. 4 | — |
| **Servizi** `S_n` → **attivita'** `S_n.m` con codice breve `A_1`, `B_1`, `C_1` | cap. 6 (Gantt), 7 (resoconto), 8 (economics), 9 (fatturazione) | slide per servizio/attivita' |
| Deliverable e codifica condivisa | cap. 7 (tabella di raccordo) | slide deliverable |
| Importi: valore attivita', avanzamento per mese, SAL precedenti, % progress | cap. 8 | slide riepilogo |
| Fattura: importo, ritenuta 0,5%, credito, IVA 22%, totale | cap. 9 | — |

Conseguenza per le app: conviene un **unico oggetto "SAL"** (periodo, lotto, servizi, attivita', avanzamenti, importi, deliverable,
partecipanti) da cui Verbale Studio genera il `.docx` e Cippi la presentazione, e che si potrebbe esportare anche in Excel.
I punti chiave di un checkpoint di Verbale Studio (modello di riepilogo "Stato avanzamento lavori (SAL)": sintesi, milestone,
avanzamento, prossime attivita', rischi, richieste, decisioni) sono la fonte naturale del capitolo 7 del verbale e delle slide di avanzamento.
