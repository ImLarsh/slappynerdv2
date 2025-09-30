// Enhanced service worker - always serve latest version
const CACHE_VERSION = 'v' + Date.now(); // Force cache invalidation on each deploy
const STATIC_CACHE = 'slappy-nerds-static-' + CACHE_VERSION;
const IMAGE_CACHE = 'slappy-nerds-images-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, IMAGE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isImage = req.destination === 'image' || /\.(png|webp|jpg|jpeg|gif|svg)$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req, { cache: 'no-store' })
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  // Network-first for app resources to ensure latest version
  const isAppResource = url.pathname.endsWith('.js') || 
                       url.pathname.endsWith('.css') || 
                       url.pathname.endsWith('.html') || 
                       url.pathname === '/';

  if (isAppResource) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for other resources
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});