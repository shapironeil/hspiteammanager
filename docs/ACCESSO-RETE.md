# Far entrare i colleghi nel portale

Il portale gira sul tuo PC (host). Gli altri lo raggiungono con un link.

## Prima di tutto: due modi di avviare

| Script | Chi può entrare | Firewall di Windows |
|---|---|---|
| `avvia.bat` (e `aggiorna.bat`) | Solo il tuo PC | Nessuna richiesta |
| `avvia-rete.bat` | Anche i PC sulla stessa rete | Chiede il permesso: serve un account amministratore |

## Il blocco del firewall

Quando un programma si mette in ascolto sulla rete, Windows chiede se consentirlo. Su un PC aziendale quella conferma richiede un account amministratore: senza, gli altri PC non riescono a collegarsi, mentre sul tuo il portale continua a funzionare.

Quel blocco è una regola di sicurezza dell'azienda, non un difetto del portale. La strada pulita è farla aprire a chi ne ha l'autorità. All'IT serve un solo comando, da eseguire una volta come amministratore:

```
netsh advfirewall firewall add rule name="HSPI Team Manager" dir=in action=allow protocol=TCP localport=8080 profile=domain,private
```

Apre solo la porta 8080 in ingresso, solo sulle reti aziendali e private. Per toglierla: `netsh advfirewall firewall delete rule name="HSPI Team Manager"`.

Aggirare il blocco con un tunnel verso internet su un PC aziendale significa scavalcare quella regola: non farlo senza l'ok dell'IT.

Una volta aperta la porta, le strade sono queste, dalla più semplice.

## A. Stessa rete Wi-Fi — consigliata per iniziare

1. Avvia il portale con `avvia-rete.bat`.
2. La finestra nera mostra i link. Quello utile è **Rete locale**, tipo `http://192.168.1.23:8080`. Lo trovi anche in **Sistema → Link di accesso**, con il pulsante per copiarlo.
3. Se la regola del firewall non c'è ancora, Windows chiede il permesso (vedi sopra).
4. Manda il link ai colleghi. Entrano con l'account che hai creato per loro.

Cose da sapere:

- **Il PC deve restare acceso** con la finestra del portale aperta.
- **L'indirizzo può cambiare** da un giorno all'altro. In alternativa usa il link con il nome del PC (`http://NOME-PC:8080`), che resta uguale.
- **Alcune reti aziendali bloccano il traffico tra PC** della stessa Wi-Fi. Se il link non si apre dal PC di un collega, mentre sul tuo funziona, la causa è quasi sempre questa o il firewall di Windows.
- **Il traffico non è cifrato** (`http`, non `https`): chi è sulla stessa rete e sa intercettare il traffico può leggere password e file. Va bene per provare con dati finti, non per dati aziendali riservati.

## B. Tailscale — privato e cifrato

Tailscale crea una rete privata tra i dispositivi autorizzati. Il portale resta invisibile a tutti gli altri e il traffico è cifrato.

1. Installa Tailscale sul tuo PC e accedi.
2. Ogni collega installa Tailscale e viene invitato nella tua rete (oppure condividi con lui solo questo PC).
3. Il portale mostra da solo il link **Tailscale** (indirizzo `100.x.x.x`) in **Sistema → Link di accesso**.

Cose da sapere:

- Funziona anche fuori dall'ufficio, non solo sulla stessa Wi-Fi.
- Il piano gratuito ha un numero limitato di utenti: per 12 persone va verificato sul sito se basta.
- Ogni collega deve installare un programma sul PC aziendale: **serve il via libera dell'IT**.

## C. Tunnel pubblico (Cloudflare Tunnel, ngrok) — da evitare per ora

Un tunnel pubblico mette il portale su internet con un link raggiungibile da chiunque lo conosca. Questa versione non è pensata per stare su internet: niente tunnel pubblici finché non ci sono HTTPS, login aziendale e un hosting approvato.

## In sintesi

| | Stessa Wi-Fi | Tailscale | Tunnel pubblico |
|---|---|---|---|
| Da installare ai colleghi | Niente | Tailscale | Niente |
| Cifrato | No | Sì | Sì |
| Visibile da internet | No | No | Sì |
| Adatto a | Prove e demo | Uso interno controllato | Non questa versione |
