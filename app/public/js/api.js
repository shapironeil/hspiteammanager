// Comunicazione con il server. Tutte le chiamate passano da qui.

export async function api(method, url, body) {
  const headers = { 'x-hspi': '1' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(url, {
    method, headers, credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Operazione non riuscita.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const get = (url) => api('GET', url);
export const post = (url, body = {}) => api('POST', url, body);
export const patch = (url, body = {}) => api('PATCH', url, body);
export const del = (url) => api('DELETE', url);

// Caricamento file con avanzamento (0..1).
export function upload(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-hspi', '1');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* risposta vuota */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error((data && data.error) || 'Caricamento non riuscito.'));
    };
    xhr.onerror = () => reject(new Error('Caricamento interrotto: controlla la connessione e la dimensione del file.'));
    xhr.send(file);
  });
}
