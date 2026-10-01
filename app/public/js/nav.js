// Voci del menu del portale, senza le funzioni che disegnano le schermate: le usa app.js (menu laterale del
// portale) e menu-app.js (il menu richiamabile dalle app a se': MPoint, GestioneCelle, Verbale Studio).
//
// Le app NON compaiono nel menu laterale: si aprono da "App e programmi" nel loro ambiente, con il bottone in alto
// a sinistra che richiama questo menu per tornare al portale. Le loro rotte restano valide per i collegamenti
// vecchi (#/celle, /verbali/, /mpoint/).
export const RANK = { dipendente: 0, manager: 1, hacker: 2 };
export const can = (user, role) => !!user && RANK[user.role] >= RANK[role];
export const labelOf = (n, user) => (typeof n.label === 'function' ? n.label(user) : n.label);

// "min" e' il ruolo minimo che vede la voce; "group" apre un gruppo del menu; "show" nasconde la voce a chi non serve;
// "dynamic" = sfondo dinamico in quella schermata.
export const NAV_PORTALE = [
  { id: 'home', label: 'Home', icon: 'home', min: 'dipendente', dynamic: true },
  { id: 'progetti', label: 'Progetti', icon: 'briefcase', min: 'dipendente' },
  { id: 'esplora', label: 'Esplora file', icon: 'folder', min: 'dipendente' },
  { id: 'programmi', label: 'App e programmi', icon: 'apps', min: 'dipendente' },
  { id: 'file', label: 'File inviati', icon: 'upload', min: 'dipendente' },
  { id: 'team', label: (u) => (u.role === 'hacker' ? 'Account' : 'Team'), icon: 'users', min: 'manager', group: 'Organizzazione' },
  // Statistiche di chi sta sotto nella gerarchia: compare solo a chi ha qualcuno sotto di se'.
  { id: 'mio-team', label: 'Il mio team', icon: 'chart', min: 'dipendente', show: (u) => u.teamCount > 0 },
  { id: 'ruoli', label: 'Ruoli', icon: 'shield', min: 'hacker', group: 'Controllo' },
  { id: 'percorso', label: 'Percorso', icon: 'trophy', min: 'hacker' },
  { id: 'log', label: 'Log attività', icon: 'log', min: 'hacker' },
  { id: 'problemi', label: 'Errori e bug', icon: 'bug', min: 'hacker' },
  { id: 'sistema', label: 'Sistema', icon: 'system', min: 'hacker' },
];

// Le app del catalogo: rotte ancora valide, ma fuori dal menu laterale (app: true).
export const APP_ROUTES = [
  { id: 'celle', label: 'GestioneCelle', icon: 'tree', min: 'dipendente', app: true },
  { id: 'verbali', label: 'Verbale Studio', icon: 'note', min: 'dipendente', href: '/verbali/', app: true },
  { id: 'mpoint', label: 'MPoint', icon: 'image', min: 'dipendente', href: '/mpoint/', app: true },
];

export const PROFILE = { id: 'profilo', label: 'Profilo', icon: 'user', min: 'dipendente' };
