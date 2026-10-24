const APP_VERSION = '6.4.0';
const SCOPE_URL = self.registration.scope;
const CACHE_PREFIX = 'hvac-advisor:' + new URL(SCOPE_URL).pathname + ':';
const CACHE_NAME = CACHE_PREFIX + APP_VERSION;
const appURL = path => new URL(path, SCOPE_URL).href;
const ASSETS = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'].map(appURL);
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Fonts are optional; only the scope-relative app shell is required offline.
        await cache.addAll(ASSETS.map(url => new Request(url, {cache:'reload'})));
        await self.skipWaiting();
    })());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key =>
            (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) || key === 'hvac-advisor-v1'
        ).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    // Weather/geocoding never consult the Cache API, including the legacy cache.
    if(request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(SCOPE_URL)) return;
    const assetURL = request.mode === 'navigate' ? appURL('index.html') : url.href;
    if(request.mode !== 'navigate' && !ASSETS.includes(assetURL)) return;
    event.respondWith((async () => {
        try {
            const response = await fetch(request, {cache:'no-cache'});
            if(response.ok){
                // Cache quota/storage failures must not replace fresh online content.
                try{const cache=await caches.open(CACHE_NAME);await cache.put(assetURL,response.clone());}catch{}
            }
            // HTTP errors stay visible; offline fallback applies only to network failure.
            return response;
        } catch(error) {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(assetURL);
            if(cached) return cached;
            throw error;
        }
    })());
});


