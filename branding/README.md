# Immagini del portale

Le immagini personalizzate si mettono nella cartella **`images`** (oppure in questa, `branding`): il portale le usa da solo al prossimo caricamento della pagina.

Come viene scelto il logo, in ordine:

1. il file chiamato `logo` (es. `logo.png`);
2. un file con "logo" nel nome (es. `logo-hspi.png`);
3. altrimenti la prima immagine trovata in `images`.

Lo stesso vale per `sfondo` e `favicon`, ma solo con i primi due criteri.

| Nome del file | Dove compare | Consiglio |
|---|---|---|
| `logo.svg` / `logo.png` | Schermata di accesso e menu laterale | Quadrato, almeno 128×128, sfondo trasparente |
| `sfondo.jpg` / `sfondo.png` / `sfondo.webp` | Sfondo di tutto il portale, dietro i pannelli di vetro | Almeno 1920×1080; viene scurito in automatico |
| `favicon.ico` / `favicon.png` | Icona nella scheda del browser | 32×32 o 64×64 |

Formati accettati: svg, png, jpg, jpeg, webp, gif, ico. Se un file manca, il portale usa l'aspetto predefinito.

Le immagini che aggiungi restano sul tuo PC e `aggiorna.bat` non le tocca.
