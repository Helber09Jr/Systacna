// ============================================================================
// SISTACNA - Service Worker
// ============================================================================

const CACHE_NAME = 'sistacna-v1';
const CACHE_DINAMICO = 'sistacna-dinamico-v1';

const ARCHIVOS_CORE = [
  '/',
  '/index.html',
  '/carta.html',
  '/carrito.html',
  '/css/utils.css',
  '/css/index.css',
  '/css/carta.css',
  '/css/carrito.css',
  '/js/utils.js',
  '/js/firebase-config.js',
  '/js/index.js',
  '/js/carta.js',
  '/js/carrito.js',
  '/data/platos.json',
  '/data/configuracion.json',
  '/PWA/manifest.json'
];

const LIMITE_CACHE_DINAMICO = 50;

// --- Instalacion ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Cacheando archivos core');
        return cache.addAll(ARCHIVOS_CORE);
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.log('SW: Error al cachear (algunos archivos pueden no existir aun):', err);
        return self.skipWaiting();
      })
  );
});

// --- Activacion ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME && key !== CACHE_DINAMICO)
            .map(key => {
              console.log('SW: Eliminando cache antiguo:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// --- Estrategia de fetch ---
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No cachear: Firebase, APIs externas, admin
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.includes('/admin') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Datos JSON: Network first, fallback cache
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clon = response.clone();
          caches.open(CACHE_DINAMICO).then(cache => {
            cache.put(event.request, clon);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML, CSS, JS: Cache first, fallback network
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const clon = response.clone();
            caches.open(CACHE_DINAMICO).then(cache => {
              cache.put(event.request, clon);
              limpiarCacheDinamico();
            });

            return response;
          });
      })
      .catch(() => {
        // Offline fallback para navegacion
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});

// --- Limitar cache dinamico ---
function limpiarCacheDinamico() {
  caches.open(CACHE_DINAMICO).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > LIMITE_CACHE_DINAMICO) {
        cache.delete(keys[0]).then(() => limpiarCacheDinamico());
      }
    });
  });
}
