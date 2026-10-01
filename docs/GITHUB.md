# GitHub: prove automatiche e pull request

## Dove le vedi

- **Nel portale**: Sistema → *Aggiornamenti e pull request* (solo Hacker), anche dal telefono. Mostra:
  - la versione installata e quella pubblicata su `main`; se è più nuova compare "nuova: lancia aggiorna.bat";
  - le pull request aperte, con l'esito delle prove (✓ passate, ✗ fallite, … in corso) e il link a GitHub.
- **Su GitHub**: scheda *Pull requests* del repository, oppure l'app GitHub sul telefono.

Il portale legge GitHub senza credenziali (il repository è pubblico) e tiene le risposte 10 minuti: GitHub permette 60 letture all'ora per rete. L'icona ⟳ forza un nuovo controllo.

## Prove automatiche (`.github/workflows/prove.yml`)

Partono a ogni pull request e a ogni modifica di `main`. Eseguono le stesse prove che si lanciano a mano (`node --test` nella cartella `app`).

## Pull request automatiche (`.github/workflows/pr-automatica.yml`)

- **A ogni push** su un ramo di lavoro (qualsiasi ramo tranne `main`): se non c'è già una pull request aperta verso `main`, la crea con l'elenco delle modifiche.
- **Ogni mattina** (07:00 UTC, cioè le 9 in estate e le 8 in inverno): controlla tutti i rami con modifiche nuove e apre quelle che mancano.
- **A mano**: GitHub → *Actions* → *Pull request automatica* → *Run workflow*. Puoi indicare un ramo; se lo lasci vuoto li controlla tutti.
- **Cambiare l'orario**: nel file, alla riga `cron: '0 7 * * *'` (minuto, ora UTC, giorno, mese, giorno della settimana). Per esempio `'0 7 * * 1'` vuol dire solo il lunedì.

Il **merge** resta sempre tuo: le automazioni aprono le pull request, non le uniscono.

**Una volta sola** su GitHub: *Settings → Actions → General → Workflow permissions* → spunta **"Allow GitHub Actions to create and approve pull requests"**. Senza questa spunta le prove funzionano, ma le pull request automatiche no.
