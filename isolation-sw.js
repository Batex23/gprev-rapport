// Service worker du widget Rapport.
// LibreOffice (WebAssembly) a besoin que la page soit « isolée » (crossOriginIsolated).
// GitHub Pages ne permet pas d'ajouter les en-têtes HTTP nécessaires : ce service worker
// les ajoute aux pages du widget. Il ne touche à aucune autre ressource.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.mode !== 'navigate') return;
  e.respondWith(fetch(r).then((res) => {
    if (res.status === 0) return res;
    const h = new Headers(res.headers);
    // Chrome / Edge : isolation possible même à l'intérieur d'un cadre (cas de Grist).
    h.set('Document-Isolation-Policy', 'isolate-and-credentialless');
    // Navigateurs qui ouvrent le widget dans un onglet à part.
    h.set('Cross-Origin-Embedder-Policy', 'credentialless');
    h.set('Cross-Origin-Opener-Policy', 'same-origin');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }).catch(() => fetch(r)));
});
