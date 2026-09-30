# Progetti e dati aziendali

Come il portale tratta i file dei progetti, e cosa resta da decidere prima di metterci dati veri.

## Il problema

I documenti dei progetti esistono già su OneDrive / SharePoint condiviso: circa 80 GB, con i permessi decisi dall'azienda. Copiarli tutti sul PC che ospita il portale ha quattro difetti:

1. **È lento e pesante**: 80 GB da scaricare, e da riscaricare ogni volta che cambiano.
2. **Diventa una seconda copia**: due versioni dello stesso file che col tempo divergono.
3. **Salta i permessi aziendali**: su OneDrive ognuno vede solo ciò che gli è stato concesso. Una copia locale servita dal portale è visibile a chiunque il portale lasci entrare, anche a chi su OneDrive non avrebbe accesso.
4. **Sposta dati aziendali** su un PC e su un programma che l'IT non conosce.

## Come funziona oggi (v0.3)

Il portale **non copia** i file aziendali. Tiene la scheda del progetto e rimanda alla cartella vera.

| Cosa | Dove sta | Chi decide chi vede |
|---|---|---|
| Scheda del progetto: nome, cliente, stato, persone | Database del portale | Portale: solo i membri del progetto e l'Hacker |
| Documenti ufficiali | OneDrive / SharePoint, invariati | Azienda: il link si apre con l'account Microsoft di chi clicca |
| Materiale di lavoro nato nel portale | Cartella locale `progetti/<nome>` | Portale: solo i membri del progetto e l'Hacker |

Regole dei permessi nel portale:

- Un progetto lo vede **solo chi ne è membro**. Per gli altri non esiste: non compare in elenco e l'indirizzo diretto risponde "non trovato".
- L'**Hacker** vede tutti i progetti.
- Un **Manager** crea progetti e modifica quelli di cui è membro, scegliendo le persone.
- Un **Dipendente** vede i progetti a cui è stato aggiunto, scarica e carica file.
- Togliere un progetto dal portale **non cancella** la sua cartella.
- Una cartella creata a mano dentro `progetti/` diventa un progetto visibile solo all'Hacker, finché non assegna le persone.

La cartella `progetti/` è esclusa da Git: `carica-su-github.bat` non la carica mai.

## Come popolare i progetti esistenti

Per ogni progetto già presente su OneDrive:

1. Crea il progetto nel portale (**Progetti → Nuovo progetto**).
2. Apri la cartella del progetto su OneDrive nel browser, copia l'indirizzo e incollalo nel campo del link.
3. Scegli le persone. Conviene ricalcare chi ha già accesso a quella cartella su OneDrive: così portale e azienda dicono la stessa cosa.

Nessun file viene spostato. Chi clicca **Apri su OneDrive** vede ciò che l'azienda gli consente.

## Da decidere

| # | Decisione | Chi decide |
|---|---|---|
| 1 | Si possono tenere file aziendali nella cartella locale `progetti/` di un PC, o solo su OneDrive? | Manager + IT |
| 2 | Chi assegna le persone ai progetti: solo l'Hacker, o anche i manager di progetto? | Manager |
| 3 | Passo successivo: mostrare i file di OneDrive dentro il portale (Microsoft Graph). Serve la registrazione dell'app da parte dell'IT; i permessi restano quelli aziendali. | IT |
| 4 | Il repository GitHub è su un account personale: va bene per logo e codice aziendale, o serve uno spazio HSPI? | Manager |
