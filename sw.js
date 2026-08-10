/* 100PLUSSHOP — Service Worker v6 (auto-update) */
const CACHE_VERSION = '100plusshop-v6';
const PRECACHE = [
  './',
  './index.html',
  './app.html',
  './css/app.css',
  './style.css',
  './js/api.js',
  './js/app.js',
  './js/pagination.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
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
    /\/api(\/|$)/.test(url.pathname)
  );
}

/** HTML / JS / CSS : réseau d'abord pour recevoir les mises à jour */
function isAppShell(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return (
    p.endsWith('.html') ||
    p.endsWith('.js') ||
    p.endsWith('.css') ||
    p.endsWith('sw.js') ||
    p.endsWith('.webmanifest') ||
    p.endsWith('/')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API : toujours réseau, pas de cache applicatif
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            JSON.stringify({
              message: 'Hors ligne : API injoignable.',
              offline: true,
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    return;
  }

  // Coquille app : réseau d'abord, sinon cache
  if (isAppShell(url)) {
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
              new Response('Hors ligne', { status: 503 })
          )
        )
    );
    return;
  }

  // Autres assets : cache d'abord, puis réseau
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
