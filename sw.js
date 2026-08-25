/* 100PLUSSHOP — Service Worker v7 (offline shell fiable en prod) */
const CACHE_VERSION = '100plusshop-v7';

/** Tout le shell + pages : indispensable hors ligne */
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
            cache.add(url).catch((err) => console.warn('[SW] skip', url, err && err.message))
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
  // Backend distant (Render/Railway/etc.) ou chemin /api
  if (url.pathname.includes('/api/') || /\/api(\/|$)/.test(url.pathname)) return true;
  if (url.port === '3000') return true;
  // host API typiques
  const h = url.hostname || '';
  if (/onrender\.com|railway\.app|fly\.dev|herokuapp\.com/i.test(h)) return true;
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
    p.endsWith('sw.js') ||
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

  // API → réseau uniquement (pas de ventes hors ligne sans file d'attente locale)
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            JSON.stringify({
              message:
                'Hors ligne : impossible de joindre le serveur. Les ventes et données live nécessitent Internet.',
              offline: true,
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    return;
  }

  // Fichiers de l'app : cache d'abord (fiable hors ligne), puis réseau en arrière-plan
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.ok && url.origin === self.location.origin) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);

        // Si on a le cache → on répond tout de suite (offline OK)
        if (cached) {
          // mise à jour silencieuse si online
          networkFetch.catch(() => {});
          return cached;
        }
        return networkFetch;
      })
    );
    return;
  }

  // Autre : réseau puis cache
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
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
