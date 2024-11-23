// sw.js

const CACHE_NAME = 'inspection-cache-v1'; // Use a single cache for simplicity
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/stylesinspection.css',
    '/js/main.js',
    // Add other assets to cache
];

// Install Event: Cache Static Assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((err) => {
                console.error('[Service Worker] Failed to open cache:', err);
            })
    );
    self.skipWaiting(); // Activate worker immediately
});

// Activate Event: Clean Up Old Caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating Service Worker...', event);
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME) {
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
    self.clients.claim(); // Take control of all clients immediately
});

// Fetch Event: Implement Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle GET requests for same-origin resources
    if (request.method !== 'GET' || url.origin !== location.origin) {
        return;
    }

    // Network First Strategy for HTML pages
    if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, networkResponse.clone());
                            return networkResponse;
                        });
                })
                .catch(() => {
                    return caches.match(request)
                        .then((cachedResponse) => {
                            return cachedResponse || caches.match(OFFLINE_URL);
                        });
                })
        );
        return;
    }

    // Stale-While-Revalidate Strategy for static assets
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    // Update cache with new response
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, networkResponse.clone());
                    });
                    return networkResponse;
                }).catch(() => {
                    // Return cached response if network fails
                    return cachedResponse;
                });
                // Return cached response immediately, update cache in background
                return cachedResponse || fetchPromise;
            })
    );
});
