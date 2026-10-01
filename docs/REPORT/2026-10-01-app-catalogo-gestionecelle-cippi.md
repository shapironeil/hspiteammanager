# REPORT — 2026-10-01 — Catalogo delle app, GestioneCelle, Cippi (v0.8.0)

Branch: `claude/verbale-studio-portale`, pull request #2.

## Cosa è cambiato

### 1. Le app hanno una base comune e si scaricano dal catalogo (v0.7.0)

- Verbale Studio e GestioneCelle, e ora anche Cippi, sono **app del catalogo**. Ognuna sta in `app/catalogo/<id>/` con `app.json`, che tiene la sua versione (unica fonte), le novità, le icone e il motore locale facoltativo.
- **App e programmi** nel portale offre, per ogni app:
  - **Apri**, nel browser;
  - **Installa nel browser**: una finestra a sé, senza setup;
  - **Scarica sul PC** / **Apri sul PC** con HSPI Client: il pacchetto arriva dal portale, nessuna cartella da spostare, collegamento sul desktop, aggiornamento automatico. Se l'app è già sul PC si apre e basta.
- HSPI Client scarica, aggiorna e apre le app. L'AI di Verbale Studio arriva con il pacchetto dell'app.
- Guida per chi sviluppa: `docs/APP.md`.

### 2. Trama → GestioneCelle

- Nome cambiato ovunque.
- Le tabelle sono state rinominate con la migrazione 8, senza perdere dati.
- I vecchi collegamenti `#/trama` portano alla nuova schermata.
- GestioneCelle è anche un'app a sé su `/celle/`.

### 3. Pagine informative

Benvenuto, Guida e Scarica usano **lo stesso logo, nome e tema del portale** (cartella `logo`, Sistema → Impostazioni). Scarica elenca le app con versione e novità.

### 4. Cippi (nuova app, v0.1.0)

Presentazioni PowerPoint. Vedi `docs/CIPPI.md`.

- **Studio dei due esempi**:
  - la presentazione di chiusura progetto del flusso acquisti To-Be: 123 slide, 37 flussi a corsie, 45 schede casistica, Back Up con gli As-Is;
  - gli appunti di studio in PDF.
- Il **modo di leggere** viene da lì: contesto → legenda e sigle → mappa dei processi → ogni processo passo per passo → confronto To-Be / As-Is.
- **Lettura**: tipo di ogni slide, sezioni abbinate all'indice, blocchi in ordine di lettura con gerarchia.
- **Flussi ricostruiti**: corsie, step, decisioni Sì/No, sistemi, rimandi, note, frecce. Gli step nuovi o modificati si riconoscono **dalla legenda della presentazione stessa**.
- **Revisione e modifica**:
  - glossario delle sigle, punti chiave, controlli di completezza e coerenza;
  - modalità **Revisione** con pannello strumenti, pannello visione (la slide disegnata, il confronto To-Be/As-Is affiancato) e punti chiave;
  - **Modifica** di testi e ordine (sposta, duplica, togli).
- **Archivio e modelli**:
  - salvataggio di versioni nella cartella del progetto;
  - esportazione `.pptx` con la grafica originale;
  - **modelli** riutilizzabili (crea da modello, completezza rispetto a un modello) e **crea da zero**.
- **Sinergie**:
  - archivio in Esplora file (`Cippi/<documento>/`, appunti accanto);
  - processi collegati a GestioneCelle per nome;
  - glossario del progetto;
  - app del catalogo (installabile, scaricabile).

## Verifiche fatte

- Sulla presentazione vera (solo qui, il file non è nel repository):
  - importazione e analisi in circa 1,3 secondi;
  - 123 slide classificate: 37 flussi, 45 schede, 11 divisori, 2 legende, 2 mappe;
  - sezioni abbinate all'indice;
  - confronti To-Be / As-Is per i processi presenti in entrambe le versioni.
- Il `.pptx` esportato (riordinato, con una slide duplicata, slide tolte e un testo cambiato) si riapre con LibreOffice con la stessa grafica.
- `node --test --test-concurrency=1 test/*.test.js`: **52 su 52**.
- Browser (Playwright, desktop e telefono), tutti ok e senza errori JavaScript: `celle`, `cippi`, `client`, `explorer`, `pwa`, `ruoli`, `sistema`, `verbali`.

## Come verificarlo a mano

1. Portale → **App e programmi**: tre app con versione. Con HSPI Client aperto: **Scarica sul PC** → collegamento sul desktop → **Apri sul PC**.
2. Benvenuto / Guida / Scarica: c'è il logo del portale, non quello di serie.
3. Cippi → **Importa PowerPoint** con la presentazione di chiusura progetto.
   - Si apre la Revisione. Scegli un flusso e premi **Confronta con l'As-Is**.
   - Poi **Modifica**: cambia un titolo, **Salva versione**, e verifica il file in Esplora file → `Cippi/<nome>/`.
4. **Salva come modello**, poi dalla libreria **Nuovo da modello**.

## Assunzioni e cose aperte

- Gli step "nuovi" e "modificati" si riconoscono dalla legenda della presentazione. Se una presentazione non ha legenda, tutti gli step risultano "invariati".
- In questa versione Cippi non legge gli appunti in PDF: li archivia accanto al documento.
- Le anteprime sono disegnate dal browser, non da PowerPoint. Le immagini EMF compaiono come riquadri.
- **Da provare dal vivo**:
  - collegamenti sul desktop e finestra dell'app con Edge sui PC aziendali (`HSPI.bat --apri <app>`);
  - apertura del `.pptx` esportato in PowerPoint 365.
