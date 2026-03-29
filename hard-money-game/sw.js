const CACHE_NAME = 'ledger-sword-v6';
const ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/game.js',
    './js/engine.js',
    './js/combat.js',
    './js/ui.js',
    './js/audio.js',
    './js/sprites.js',
    './js/cutscenes.js',
    './js/questions.js',
    './js/shop.js',
    './js/save.js',
    './js/events.js',
    './js/deals.js',
    './manifest.json',
    './icons/icon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache the fresh response for offline use
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
