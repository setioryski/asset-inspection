// sw.js
const CACHE_NAME = 'inspection-cache-v2'; // Increment version to force update
const urlsToCache = [
  '/',              // Home page
  '/inspection',    // Cache the /inspection route
  '/js/main.js',    // Your main JS
  '/css/stylesinspection.css', // Your CSS
  '/manifest.json', // Cache the manifest
  '/images/icons/icon-192x192.png', // Cache the icon images
  '/images/icons/icon-512x512.png',
  '/images/icons/apple-touch-icon.png',
  '/images/icons/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // For navigations (typing URL in address bar or clicking links):
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Serve from cache if available
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise, fetch from network
        return fetch(event.request).catch(() => {
          // Optionally return an offline fallback HTML if not in cache
        });
      })
    );
  } else {
    // For other requests (CSS, images, etc.)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  // Clean up old caches when a new service worker takes over
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
