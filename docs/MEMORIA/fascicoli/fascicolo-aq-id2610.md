# Fascicolo AQ Consip ID 2610 — come si legano i file del team

**Provenienza**: agente `cool-noether`, sessione `session_016fgi7494LKk88z4etQe9Lu`, ramo `claude/cool-noether-kv3o8c`, commit `74c4dad`, 01/10/2026. Spostato da `docs/MEMORIA/fascicolo-aq-id2610.md` nell'unificazione del 01/10/2026 (originale in `../_archivio/2026-10-01/cool-noether/MEMORIA/`); i collegamenti sono stati aggiornati ai nuovi percorsi, il testo è quello originale. Vedi anche `fascicolo-sal.md`.

I modelli ricevuti il 1° ottobre 2026 (su più rami) appartengono tutti al ciclo di vita di un **Contratto Esecutivo** dell'Accordo Quadro Consip ID 2610, Lotto 1 (servizi applicativi in ottica cloud per le PA locali). Conviene pensarli come **un solo fascicolo** con un unico modello dei dati.

```
Piano dei Fabbisogni (PA)            ← non ancora visto
   └─> Piano Operativo (fornitore)   ../docx/piano-operativo-consip-id2610.md          [Verbale Studio]
         + Nomina responsabile       ../docx/nomina-responsabile-trattamento-consip.md
         + Appendici 1-3 (vincoli)   ../docx/appendici-aq-consip-id2610.md → ../docx/kit-aq-id2610.conoscenza.json
   └─> Contratto Esecutivo / ODA
         └─> Piano di Lavoro         ../xlsx/piano-di-lavoro-txt-biosiris.md           [GestioneCelle]
               └─> Kick-off          ../pptx/kickoff-txt-biosiris.md                   [Cippi]
                     └─> SAL         ../docx/sal-verbale.md / ../pptx/sal-presentazione.md  [Verbale Studio + Cippi]
                                     (fascicolo SAL del progetto R-CAP.AC: l'appartenenza a questo AQ è da confermare, vedi sotto)
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
3. La **conoscenza del kit** (`../docx/kit-aq-id2610.conoscenza.json`) è il dizionario contro cui si controllano tutti: profili ammessi, indicatori e soglie, prodotti per ciclo di vita, sigle, glossario.

## Dubbi aperti (aggiunti nell'unificazione del 01/10/2026)

- **Il fascicolo SAL appartiene a questo AQ?** Le due schede SAL (`awesome-cray`) descrivono il progetto R-CAP.AC (PN "Capacità per la Coesione 2021-2027") e non dicono di quale Accordo Quadro è il contratto; questo fascicolo le include per ipotesi. Decisione in `../CONFLITTI.md`, voce 1.
- **Composizione del raggruppamento.** Il Piano Operativo (cap. 7, conoscenza del kit) elenca 18 aziende del RTI dell'AQ, tra cui HSPI e RPCNET ma non TXT e-solutions, Deda Next e Webgenesys; il kick-off BIOSIRIS presenta un raggruppamento TXT e-solutions, HSPI, Deda Next, Webgenesys, RPC Net sotto "AQ SAC 3 - Lotto 1 (ID 2610)"; il piano di lavoro ha come Owner TXT, Deda Next, Webgenesys. Da chiarire con chi conosce il contratto (`../CONFLITTI.md`, voce 1).
- **Durate.** Il Piano Operativo limita ogni servizio a 24 mesi; il masterplan del kick-off copre 2026-10 → 2028-12 (27 mesi); il piano di lavoro Excel arriva a 2029-12 (39 mesi, con la garanzia di 24 mesi dopo il go-live). Come si conciliano (servizi scaglionati, garanzia fuori contratto)?
- **Piano di Lavoro Generale e di obiettivo.** La catena sopra chiama così il file Excel `piano-di-lavoro-txt-biosiris`, che si presenta come "PdL di dettaglio": è davvero il prodotto dell'Appendice 3 o un piano interno?
