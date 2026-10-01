# Fascicolo AQ Consip ID 2610 — come si legano i file del team

I modelli ricevuti il 1° ottobre 2026 (su più rami) appartengono tutti al ciclo di vita di un **Contratto Esecutivo** dell'Accordo Quadro Consip ID 2610, Lotto 1 (servizi applicativi in ottica cloud per le PA locali). Conviene pensarli come **un solo fascicolo** con un unico modello dei dati.

```
Piano dei Fabbisogni (PA)            ← non ancora visto
   └─> Piano Operativo (fornitore)   docx/piano-operativo-consip-id2610   [Verbale Studio]
         + Nomina responsabile       docx/nomina-responsabile-trattamento-consip
         + Appendici 1-3 (vincoli)   docx/appendici-aq-consip-id2610 → kit-aq-id2610.conoscenza.json
   └─> Contratto Esecutivo / ODA
         └─> Piano di Lavoro         xlsx/piano-di-lavoro-txt-biosiris     [GestioneCelle]
               └─> Kick-off          pptx/kickoff-txt-biosiris             [Cippi]
                     └─> SAL         sal-verbale / sal-presentazione (ramo awesome-cray) [Verbale Studio + Cippi]
```

## Lo stesso oggetto "contratto esecutivo" alimenta tutti i documenti

| Dato | Piano Operativo | Piano di lavoro (Excel) | Kick-off (PowerPoint) | SAL (Word/PowerPoint) |
|---|---|---|---|---|
| Amministrazione, referente | cap. 1 | — | copertina, contesto | rappresentanti PA |
| Servizi attivati, sigle (SVI, MI, CF, CW, MAD, MAC, MAD-MAC, SS, GA, accessori) | cap. 4 e 6 | work package | ambito, componenti | servizi `S_n` |
| Quantità e metriche (PF, giorni/team, FTE/mese, GG/PP) | cap. 4 | — | sintesi contratto | consuntivazione |
| Date di attivazione, durate (max 24 mesi), cronoprogramma | cap. 6 | barre del Gantt | masterplan | avanzamento |
| Aziende del RTI, quote, owner | cap. 7 | colonna Owner | — | componente RTI |
| Ruoli e persone di riferimento | cap. 9 | — | — | rappresentanti RTI |
| Deliverable (Appendice 3) | cap. 5 | — | — | tabella di raccordo |
| Indicatori di qualità (Appendice 2) | — (impliciti) | milestone misurate da RSPL | — | report IQ |
| Profili (Appendice 1) | CV allegati | — | — | — |

Conseguenze per le app:

1. **Un modello dei dati condiviso** (contratto esecutivo → servizi → attività/obiettivi → milestone → deliverable → persone/aziende) in cui ogni app legge e scrive la sua parte: GestioneCelle il piano, Cippi le slide, Verbale Studio i documenti Word.
2. I **codici** devono coincidere tra documenti (sigle dei servizi, codici attività `S_n.m`, nomi dei deliverable): i controlli incrociati sono la funzione più utile del portale.
3. La **conoscenza del kit** (`kit-aq-id2610.conoscenza.json`) è il dizionario contro cui si controllano tutti: profili ammessi, indicatori e soglie, prodotti per ciclo di vita, sigle, glossario.
