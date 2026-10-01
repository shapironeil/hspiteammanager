'use strict';
// Testi predefiniti per i progetti di Verbale Studio: email d'esempio (stile da imitare) e glossario ATAC.

const DEFAULT_EXAMPLE_EMAIL = `Ciao a tutti,

di seguito i punti discussi durante il checkpoint odierno.

• Attività completate:
   o Ingestion delle estrazioni dei dati dai database sorgente in formato CSV, dal livello bronze al livello silver;
   o Sviluppo del layer Gold (ETL) della Data Platform sulla base dei file ricevuti da ATAC;
   o Analisi delle modifiche al Terraform per abilitare la connettività ai sistemi on-premise di ATAC.

• Attività in corso (pianificate per questa settimana):
   o Definizione del documento di governance tramite template dedicato con identificazione di ruoli e responsabilità per la gestione e l’evoluzione della Data Platform e del relativo design; → mandato in review dal GdL ai referenti ATAC.
   o Definizione e strutturazione della libreria di Data Quality della Data Platform;
   o Definizione della roadmap use case e del modello target (To-Be);
   o Definizione e sviluppo delle dashboard a supporto dell’MVP della Data Platform.

• Prossimi passi
   o Ottenimento degli accessi alle fonti dati censite;
   o Verifica degli accessi ai database sorgente su Databricks;
   o Creazione e configurazione dei job all’interno della Virtual Network;

Per il secondo e terzo punto → Attualmente non è possibile effettuare il ping necessario al controllo della raggiungibilità dei database sorgente. Il problema sembra essere riconducibile alla fase di creazione dei cluster di calcolo; è necessario verificare se si tratti di un’anomalia nella configurazione di Azure Databricks oppure di una limitazione legata alla disponibilità di risorse sui server nelle regioni North Europe/East Europe. Si rende quindi necessario pianificare uno slot con Genesio di Sabatino per analizzare i log prodotti e disponibili su Microsoft Azure, al fine di identificare la causa del problema e definire le opportune azioni correttive.

• Punti di attenzione:
   1. Pianificare, nel rispetto delle scadenze progettuali, riunioni di assessment con i vendor finalizzate alla selezione della piattaforma più idonea.
      (Owner- ATAC) → Deadline: 18/05/2026
   2. Consistenza delle estrazioni dati dai database sorgente in formato CSV (Dado e BITP): rilevate anomalie sui dati ricevuti, in attesa della trasmissione dei dataset corretti. → Deadline: 24/07/2026

È stato concordato che il checkpoint di oggi costituisce l’ultimo incontro prima della pausa estiva e che i successivi checkpoint riprenderanno da lunedì 7 settembre.

In allegato trovate le slide discusse durante la riunione; come sempre, vi chiedo cortesemente di estendere la presente a chi riteniate opportuno.

A disposizione,
Grazie
Lucrezia`;

const ATAC_GLOSSARY = 'ATAC, Databricks, Azure, Terraform, Virtual Network, Data Platform, bronze, silver, gold, ETL, MVP, Data Quality, GdL, Dado, BITP';

module.exports = { DEFAULT_EXAMPLE_EMAIL, ATAC_GLOSSARY };
