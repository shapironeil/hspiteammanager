# Immagini del portale

Le risorse grafiche stanno in tre cartelle. Il portale le legge da sole: basta aggiungere o togliere file e ricaricare la pagina.
Ogni cartella può stare dentro `images/` oppure direttamente nella cartella del progetto.

| Cartella | A cosa serve | Come funziona |
|---|---|---|
| `logo` | Logo nel login, in alto nel portale e nel menu | Usa il file chiamato `logo`, poi uno con "logo" nel nome, altrimenti la prima immagine. Un file con "favicon" nel nome diventa l'icona della scheda del browser. |
| `background` | Sfondi dinamici | Tutte le immagini si alternano in dissolvenza ogni 40 secondi, in ordine casuale diverso per ogni persona. |
| `avatar` | Immagini utente | Ognuno sceglie la sua dal Profilo. |

Formati accettati: svg, png, jpg, jpeg, webp, gif, avif, ico.

## Logo

Meglio un PNG o SVG con sfondo trasparente, alto almeno 300 pixel: viene mostrato fino a 130 pixel di altezza nel login e 52 in alto nel portale, quindi un file piccolo risulta sgranato.

## Sfondi

- Consigliati almeno 1920×1080, in formato JPG o WebP per non appesantire il caricamento.
- Vengono scuriti in automatico per tenere leggibili i testi.
- Il primo sfondo che vede una persona nuova è assegnato a rotazione: due persone che aprono il portale per la prima volta non partono dalla stessa immagine. A ogni apertura successiva si riparte dall'immagine seguente.

## Avatar

Il portale ne include 36, in `images/avatar`:

- **24 liberi**: persone in giacca e cravatta, uomini e donne. Alla registrazione ne viene assegnato uno a caso.
- **12 riservati**, con un anello colorato: 3 per ciascuna qualifica (Dirigente, Manager, Project Manager, Sviluppatore).

Un avatar è riservato quando il nome del file inizia con la qualifica: `dirigente-`, `manager-`, `project-manager-`, `sviluppatore-`. Si sblocca quando l'Hacker assegna quella qualifica alla persona in **Account → Modifica**. L'Hacker li ha tutti; chi ha il ruolo Manager ha anche quelli della qualifica Manager.

Per aggiungerne di tuoi basta mettere l'immagine nella cartella, con il prefisso giusto se deve essere riservata. Gli avatar inclusi si rigenerano con `node scripts/genera-avatar.js`.
