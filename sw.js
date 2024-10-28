// sw.js

const STATIC_CACHE_NAME = 'inspection-static-cache-v2';
const DYNAMIC_CACHE_NAME = 'inspection-dynamic-cache-v1';
const OFFLINE_URL = '/offline.html'; // Ensure this file exists in your project

const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/public/stylesinspection.css',
    '/public/main.js', // Add your main JavaScript file
    '/public/icons/icon-192x192.png', // Example icon
    '/public/icons/icon-512x512.png',
    // Add other static assets like images, fonts, etc.
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    // If using external libraries, consider caching them or serving them locally
];

// Install Event: Cache Static Assets
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Precaching App Shell');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => {
                console.error('[Service Worker] Failed to precache', err);
            })
    );
    self.skipWaiting();
});

// Activate Event: Clean Up Old Caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...', event);
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => {
                        if (cache !== STATIC_CACHE_NAME && cache !== DYNAMIC_CACHE_NAME) {
                            console.log('[Service Worker] Removing old cache:', cache);
                            return caches.delete(cache);
                        }
                    })
                );
            })
    );
    self.clients.claim();
});

// Fetch Event: Handle Network Requests
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    // Handle API requests separately (if any)
    if (requestUrl.origin === location.origin && requestUrl.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(DYNAMIC_CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Handle navigation requests (e.g., HTML pages)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(DYNAMIC_CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                })
                .catch(() => {
                    return caches.match(OFFLINE_URL);
                })
        );
        return;
    }

    // Handle static assets with Cache First strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then(networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone the response
                        const responseToCache = networkResponse.clone();

                        // Cache the new resource
                        caches.open(DYNAMIC_CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // If the request is for an image, you might return a placeholder image
                        if (event.request.destination === 'image') {
                            return caches.match('/public/icons/icon-192x192.png'); // Example placeholder
                        }
                        // For other requests, return the offline page
                        return caches.match(OFFLINE_URL);
                    });
            })
    );
});
