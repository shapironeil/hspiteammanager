# Usare il portale dal telefono (app installabile)

Il portale si può installare sul telefono come un'app (icona HSPI nella schermata Home, si apre a schermo intero). Da lì si vedono e si modificano i file, si caricano foto e documenti, si apre Verbale Studio.

Per installarlo servono due cose:

1. **raggiungere il PC del portale** dal telefono, anche fuori ufficio;
2. **un indirizzo `https://`**: i telefoni installano un'app web solo da un indirizzo sicuro.

Tailscale risolve tutte e due, senza mettere il portale su internet.

> **Prima di tutto: serve l'ok dell'IT.** Tailscale va installato sul PC aziendale che ospita il portale e crea una rete privata verso l'esterno. È una regola di sicurezza dell'azienda: non aggirarla.

## Come funziona

```
telefono di Marco ──(Tailscale, cifrato)──► PC del portale ──► portale (http://localhost:8080)
                                            "tailscale serve" mette davanti l'indirizzo
                                            https://<nome-pc>.<rete>.ts.net
```

- Il portale resta in ascolto **solo sul PC** (`avvia.bat`, nessuna porta aperta, nessuna richiesta del firewall).
- `tailscale serve` pubblica il portale **solo dentro la rete Tailscale** con un indirizzo `https://` e un certificato valido.
- Ogni collega entra con **il suo account del portale**: Tailscale apre la strada, i permessi restano quelli del portale.

## 1. Sul PC del portale (una volta, con l'ok dell'IT)

1. Installa Tailscale e accedi con il tuo account (quello che "possiede" la rete).
2. Nella console di Tailscale (`login.tailscale.com` → **DNS**) attiva **MagicDNS** e **HTTPS Certificates**.
3. Avvia il portale con `avvia.bat`.
4. Apri il Prompt dei comandi e scrivi, una volta sola:

   ```
   tailscale serve --bg 8080
   ```

   Il comando risponde con l'indirizzo, del tipo `https://pc-ufficio.tail1234.ts.net`. Resta attivo anche dopo un riavvio. Per spegnerlo: `tailscale serve --https=443 off`.

5. Apri quell'indirizzo dal telefono (con Tailscale acceso) per provarlo.

## 2. Far entrare il team (circa 15 persone)

Ci sono due strade. Verifica sempre i limiti aggiornati su `tailscale.com/pricing`: cambiano nel tempo.

| | **Condivisione del solo PC** (consigliata) | Utenti nella tua rete |
|---|---|---|
| Cosa vedono i colleghi | Solo il PC del portale | Tutti i dispositivi della rete |
| Account Tailscale dei colleghi | Il loro, gratuito | Entrano nella tua rete |
| Limite di persone | Non conta nel limite di utenti del piano gratuito | Il piano gratuito ha un numero limitato di utenti (pochi): per 15 persone serve un piano a pagamento |
| Come | Console → **Machines** → PC del portale → **Share…** → invito per email | Console → **Users** → **Invite users** |

**Condivisione del solo PC, passo per passo**

1. Console di Tailscale → **Machines** → il PC del portale → menu **…** → **Share…**.
2. Crea un link di invito per ogni collega (o invialo per email).
3. Il collega installa l'app Tailscale sul telefono (App Store / Play Store), accede con un suo account e accetta l'invito.
4. Da quel momento sul suo telefono funziona `https://pc-ufficio.tail1234.ts.net`.

La condivisione di un dispositivo è una funzione che Tailscale indica ancora come "beta": funziona bene, ma va riverificata se cambia qualcosa nel servizio.

## 3. Installare l'app sul telefono

**iPhone (Safari)**: apri l'indirizzo `https://…ts.net` → pulsante **Condividi** → **Aggiungi alla schermata Home**.

**Android (Chrome)**: apri l'indirizzo → menu **⋮** → **Installa app** (o "Aggiungi a schermata Home").

L'icona HSPI apre il portale a schermo intero. Tenendo premuta l'icona (Android) ci sono le scorciatoie **Esplora file** e **Verbale Studio**.

## Cosa si può fare dal telefono

| Funzione | Note |
|---|---|
| Esplora file | Sfogliare le cartelle personali e dei progetti, cercare, aprire PDF, immagini, video |
| Caricare file | **Carica** → anche foto dalla fotocamera; più file insieme |
| Modificare | Testi (`.txt`, `.md`, `.csv`, `.vtt`, …) direttamente nel portale; gli altri file si scaricano, si modificano e si ricaricano (la versione precedente resta nelle versioni) |
| Cestino e versioni | Come dal PC: niente si perde |
| Verbale Studio | Revisione, storico, email: lo schermo piccolo va bene per controllare e correggere; per revisionare un'ora di riunione è più comodo il PC |

## Sicurezza

- Il traffico è cifrato da Tailscale e il portale **non è visibile da internet**.
- Le funzioni riservate al "PC del portale" (primo account, importazioni, apertura di cartelle sul PC) **non** sono disponibili attraverso `tailscale serve`, anche se le richieste arrivano dal PC stesso: il portale riconosce il passaggio dal proxy.
- Se un telefono si perde: disattiva il suo account nel portale (**Account**) e togli la condivisione in Tailscale.
- L'app sul telefono non salva i dati: senza connessione mostra solo la pagina "Il portale non è raggiungibile".

## Se qualcosa non va

| Problema | Causa probabile |
|---|---|
| L'indirizzo `ts.net` non si apre | Tailscale spento sul telefono, oppure PC del portale spento o senza il portale avviato |
| "Il portale non è raggiungibile" | Come sopra: il telefono non arriva al PC |
| Manca "Installa app" | L'indirizzo non è `https://` (stai usando `http://100.x.x.x:8080`): usa quello `ts.net` |
| Si apre ma chiede di accedere ogni volta | La sessione dura 7 giorni; dopo un "Esci" serve di nuovo la password |
