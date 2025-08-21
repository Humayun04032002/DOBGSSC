const CACHE_NAME = 'botany-app-v3';
const urlsToCache = [
    './',
    './DOBGSSC/index.html',
    './DOBGSSC/style.css',
    './DOBGSSC/script.js',
    // Add any other critical assets here that should be cached for offline use
    // For example, if you have an 'icons' folder, list them like:
    // './icons/icon-72x72.png',
    // './icons/icon-96x96.png',
    // etc.
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});



