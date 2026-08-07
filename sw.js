/* 100PLUSSHOP — Service Worker v3 (PWA + hors ligne) */
const CACHE_VERSION = '100plusshop-v3';
const PRECACHE = [
  './',
  './index.html',
  './app.html',
  './inscription.html',
  './inscription-admin.html',
  './css/app.css',
  './style.css',
  './js/api.js',
  './js/app.js',
  './js/datetime.js',
  './js/pagination.js',
  './js/pages/dashboard.js',
  './js/pages/produits.js',
  './js/pages/ventes.js',
  './js/pages/clients.js',
  './js/pages/stocks.js',
  './js/pages/factures.js',
  './js/pages/pos.js',
  './js/pages/depenses.js',
  './js/pages/rapports.js',
  './js/pages/fournisseurs.js',
  './js/pages/achats.js',
  './js/pages/promotions.js',
  './js/pages/utilisateurs.js',
  './js/pages/journal.js',
  './js/pages/corbeille.js',
  './script.js',
  './script-inscription.js',
  './script-inscription-admin.js',
  './logo_100plus.jpg.jpeg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(url).catch((err) => console.warn('[SW] skip', url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return (
    url.port === '3000' ||
    url.pathname.includes('/api/') ||
    url.pathname.endsWith('/api') ||
    /\/api(\/|$)/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            JSON.stringify({
              message: 'Hors ligne : le serveur API est injoignable. Vérifiez votre connexion.',
              offline: true,
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    return;
  }

  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(fetch(req).catch(() => new Response('', { status: 504 })));
    return;
  }

  const isHtml =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (c) =>
              c ||
              caches.match('./app.html') ||
              caches.match('./index.html') ||
              new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
