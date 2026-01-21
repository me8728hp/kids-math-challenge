const CACHE_NAME = 'kids-math-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png',
    // Placeholders - 実際にはファイルが存在しなくてもエラーにならないようFetchでCatchする戦略が必要だが
    // 今回は基本的な構成のみ
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => {
                // 一部のファイルがなくて失敗しても続行（開発中のため）
                console.warn('Pre-caching warning:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // ネットワーク優先、落ちてたらキャッシュ (API等がないのでCache Firstでも良いが更新反映のため)
    // 今回はAssetsはCache First, 他はGlobal

    // 基本的な Cache First
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});
