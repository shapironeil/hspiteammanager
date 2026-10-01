// Verbale Studio: il bottone in alto a sinistra richiama il menu del portale (per tornarci o cambiare schermata).
// Sta in un file a se' perche' la pagina non ammette script scritti dentro l'HTML.
import { mountPortalMenu } from '/js/menu-app.js';
mountPortalMenu(document.getElementById('portalMenu'), { appName: 'Verbale Studio', appIcon: '/catalogo/verbale-studio/icon.svg' }).catch(() => {});
