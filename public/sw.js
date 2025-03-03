// sw.js
const CACHE_NAME = 'inspection-cache-v1';
const urlsToCache = [
  '/',              // If you have a home page
  '/inspection',    // Cache the /inspection route
  '/js/main.js',    // Your main JS
  '/css/stylesinspection.css', // Your CSS
  // ...other assets you want offline
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
    // For other requests (e.g. CSS, images, etc.)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});
