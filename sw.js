/* 100PLUSSHOP — Service Worker v8 (stable prod) */
const CACHE_VERSION = '100plusshop-v8';

const PRECACHE = [
  './',
  './index.html',
  './app.html',
  './css/app.css',
  './style.css',
  './js/api.js',
  './js/app.js',
  './js/pagination.js',
  './js/pwa-register.js',
  './js/pages/dashboard.js',
  './js/pages/produits.js',
  './js/pages/marques.js',
  './js/pages/categories.js',
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
            cache
              .add(url)
              .catch((err) =>
                console.warn('[SW] skip', url, err && err.message)
              )
          )
        )
      )
    // Pas de skipWaiting auto → évite les reloads en boucle
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  if (url.pathname.includes('/api/') || /\/api(\/|$)/.test(url.pathname)) {
    return true;
  }
  if (url.port === '3000') return true;
  const h = url.hostname || '';
  if (
    /onrender\.com|railway\.app|fly\.dev|herokuapp\.com|vercel\.app/i.test(h)
  ) {
    return true;
  }
  return false;
}

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return (
    p.endsWith('.html') ||
    p.endsWith('.js') ||
    p.endsWith('.css') ||
    p.endsWith('.png') ||
    p.endsWith('.jpg') ||
    p.endsWith('.jpeg') ||
    p.endsWith('.webp') ||
    p.endsWith('.svg') ||
    p.endsWith('.ico') ||
    p.endsWith('.webmanifest') ||
    p === '/' ||
    p.endsWith('/')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  if (url.pathname.endsWith('/sw.js') || url.pathname.endsWith('sw.js')) {
    event.respondWith(fetch(req));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            JSON.stringify({
              message:
                'Serveur injoignable. Vérifiez votre connexion ou réessayez.',
              offline: true,
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    return;
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('.html') || url.pathname.endsWith('/'))
  ) {
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
          caches.match(req).then((c) => c || caches.match('./app.html'))
        )
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
        if (cached) {
          networkFetch.catch(() => {});
          return cached;
        }
        return networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});