// sw.js

const STATIC_CACHE_NAME = 'inspection-static-cache-v2';
const DYNAMIC_CACHE_NAME = 'inspection-dynamic-cache-v2';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/stylesinspection.css',
    '/js/main.js',
    '/index.js',

];

// Install Event: Cache Static Assets Individually
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(async (cache) => {
                for (const asset of STATIC_ASSETS) {
                    try {
                        const response = await fetch(asset);
                        if (response.ok) {
                            await cache.put(asset, response);
                            console.log(`[Service Worker] Cached: ${asset}`);
                        } else {
                            console.error(`[Service Worker] Failed to cache (status ${response.status}): ${asset}`);
                        }
                    } catch (error) {
                        console.error(`[Service Worker] Failed to cache (network error): ${asset}`, error);
                    }
                }
            })
            .catch((err) => {
                console.error('[Service Worker] Failed to open cache:', err);
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
    const requestUrl = new URL(request.url);

    console.log(`[Service Worker] Fetching: ${request.url}`);

    // Handle API requests separately (if any)
    if (requestUrl.origin === location.origin && requestUrl.pathname.startsWith('/api/')) {
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
                    return caches.match(request);
                })
        );
        return;
    }

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
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone the response
                        const responseToCache = networkResponse.clone();

                        // Cache the new resource
                        caches.open(DYNAMIC_CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                                console.log(`[Service Worker] Cached new asset: ${request.url}`);
                            });

                        return networkResponse;
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
