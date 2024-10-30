// sw.js

const STATIC_CACHE_NAME = 'inspection-static-cache-v1';
const DYNAMIC_CACHE_NAME = 'inspection-dynamic-cache-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/stylesinspection.css',

  // Add other font files and assets as needed
  '/index.js',  // Include if you have a main.js file
];

// Install Event: Cache Static Assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching Static Assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[Service Worker] Failed to precache', err);
      })
  );
  self.skipWaiting();
});

// Activate Event: Clean Up Old Caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (![STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME].includes(cache)) {
              console.log('[Service Worker] Removing old cache:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .catch((err) => {
        console.error('[Service Worker] Activation failed:', err);
      })
  );
  self.clients.claim();
});

// Fetch Event: Handle Network Requests
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Handle navigation requests (HTML pages)
  if (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept') &&
      request.headers.get('accept').includes('text/html'))
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle static assets (CSS, JS, images, fonts)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            return caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, networkResponse.clone());
                return networkResponse;
              });
          })
          .catch(() => {
            // Fallback for images
            if (request.destination === 'image') {
              return caches.match('/icons/icon-192x192.png');
            }
            // For other requests, serve offline page
            return caches.match(OFFLINE_URL);
          });
      })
  );
});
