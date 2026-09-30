# Cartelle delle risorse

Il portale riconosce le cartelle dal nome, senza badare a maiuscole, spazi o trattini. Possono stare nella cartella del progetto oppure dentro `images/`. Basta aggiungere o togliere file e ricaricare la pagina.

In **Sistema → Risorse trovate** vedi cosa il portale ha trovato e dove: è il primo posto da guardare se un logo o uno sfondo non compare.

| Cartella | A cosa serve | Come funziona |
|---|---|---|
| `logo` | Logo nel login, in alto nel portale, nel menu | Usa il file chiamato `logo`, poi uno con "logo" nel nome, altrimenti la prima immagine. |
| `background` | Sfondi dinamici | Si alternano in dissolvenza ogni 40 secondi, in ordine diverso per ogni persona. Si vedono **solo nell'accesso e nella Home**. |
| `background portal` | Sfondo statico delle altre schermate | Due immagini: una per il tema chiaro e una per il tema scuro. |
| `avatar` | Immagini utente | Ognuno sceglie la sua dal Profilo. |
| `apptools` | Web app del team | Ogni sottocartella è un programma che si apre dal portale. |
| `progetti` | File di lavoro dei progetti | Una sottocartella per progetto. Vedi `docs/PROGETTI-E-DATI.md`. |

Formati immagine accettati: svg, png, jpg, jpeg, jfif, webp, gif, avif, bmp, ico.

## Logo

- Meglio PNG o SVG con sfondo trasparente, alto almeno 300 pixel.
- Un file con "favicon" nel nome diventa l'icona della scheda del browser.
- Se metti due versioni, il portale sceglie in base al tema: un file con `white`, `bianco`, `light` o `chiaro` nel nome è il logo chiaro, usato sul tema scuro; uno con `black`, `nero`, `dark` o `scuro` è il logo scuro, usato sul tema chiaro.

## Sfondo statico: chiaro e scuro

Il portale capisce quale immagine va con quale tema dal nome: `white`, `bianco`, `light`, `chiaro` per il tema chiaro; `black`, `nero`, `dark`, `scuro` per il tema scuro. Se i nomi non lo dicono, misura quale delle due immagini è più luminosa e decide da solo.

Il tema si cambia con il pulsante sole/luna in alto a destra e resta memorizzato sul browser.

## Web app in apptools

- Il portale cerca la pagina iniziale: l'`index.html` meno profondo nella cartella (fino a 3 livelli), o l'unico file `.html` in cima.
- Il programma compare da solo in **Programmi**, con il pulsante **Apri**. Descrizione, versione e guida si scrivono con **Modifica**.
- Funziona con le web app fatte di soli file (HTML, CSS, JavaScript). Un'app che ha bisogno di un proprio server non parte così: va valutata a parte.
- Le app in `apptools` girano con la sessione di chi le apre: metti lì solo codice di cui ti fidi.

## Avatar

Il portale ne include 36, in `images/avatar`: 24 liberi e 12 riservati, con l'anello colorato, 3 per ciascuna qualifica (Dirigente, Manager, Project Manager, Sviluppatore).

Un avatar è riservato quando il nome del file inizia con la qualifica: `dirigente-`, `manager-`, `project-manager-`, `sviluppatore-`. Si sblocca quando l'Hacker assegna quella qualifica in **Account → Modifica**. Gli avatar inclusi si rigenerano con `node scripts/genera-avatar.js`.
