// sw.js

const CACHE_NAME = 'inspection-app-cache-v1';
const urlsToCache = [
    '/',
    '/js/main.js',
    '/stylesinspection.css',
    // Add other resources you want to cache
];

// Install the Service Worker and cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
})

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Bypass cache for form pages (edit pages for Tipe Door, Tipe HB, Tipe Lantai, User, and Tipe Aset)
    if (
        url.pathname.startsWith('/admin') || 
        url.pathname.startsWith('/dashboard') ||
        url.pathname.startsWith('/edit-tipe-door-form') ||
        url.pathname.startsWith('/edit-tipe-hb-form') ||
        url.pathname.startsWith('/edit-tipe-lantai-form') ||
        url.pathname.startsWith('/edit-user-form') ||
        url.pathname.startsWith('/edit-tipe-aset-form')
    ) {
        event.respondWith(fetch(event.request)); // Always fetch fresh data
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(networkResponse => {
                if (event.request.method === 'GET') {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }
                return networkResponse;
            });
        })
    );
});



// Activate the Service Worker and remove old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Always bypass cache for user-related API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Serve from cache, but update cache in background
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((networkResponse) => {
                if (event.request.method === 'GET') {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }
                return networkResponse;
            });
        })
    );
});


