// Versione del portale e dimensione del pacchetto client (dalla stessa fonte: version.json dell'host)
fetch('/api/version').then((r) => r.json()).then((v) => {
  const f = document.getElementById('versione');
  if (f) f.textContent = `Versione ${v.version}`;
  const cv = document.getElementById('cv');
  if (cv && v.client) cv.textContent = `v${v.client.version}`;
  const cs = document.getElementById('cs');
  if (cs && v.client) cs.textContent = 'Pacchetto ZIP con installa.bat · per Windows · si aggiorna da solo';
}).catch(() => {});
