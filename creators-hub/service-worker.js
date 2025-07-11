// A robust, modern service worker using a stale-while-revalidate strategy.

const CACHE_NAME_STATIC = 'aot-pm-static-v3';
const CACHE_NAME_DYNAMIC = 'aot-pm-dynamic-v3';

// These are the absolute core files for the app shell to work.
// This list must be 100% correct.
const STATIC_ASSETS = [
  './', // This is the alias for index.html, the start_url.
  './index.html',
  './manifest.json',
  './style.css',
  './icons/AOT-lg.png',
  './js/app.js'
];

// INSTALL: Cache the static app shell.
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then(cache => {
      console.log('[Service Worker] Precaching App Shell...');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
        console.error('[Service Worker] Pre-caching failed:', err);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// ACTIVATE: Clean up old caches.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        // Delete all caches that are not the current static or dynamic cache.
        if (key !== CACHE_NAME_STATIC && key !== CACHE_NAME_DYNAMIC) {
          console.log('[Service Worker] Removing old cache.', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Tell the active service worker to take immediate control of all open pages.
  return self.clients.claim();
});

// FETCH: Apply a "stale-while-revalidate" strategy.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If we get a valid response, put it in the dynamic cache.
          // Only attempt to cache GET requests.
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            return caches.open(CACHE_NAME_DYNAMIC).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        });

        // Return the cached response immediately if it exists, otherwise wait for the network.
        return cachedResponse || fetchPromise;
      })
      .catch(err => {
         // This is a fallback for when both cache and network fail.
         // You could return a generic offline page here if you had one.
         console.error('[Service Worker] Fetch failed:', err);
      })
  );
});

// MODIFICATION: Listen for messages from the app.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Received CLEAR_CACHE command.');
    event.waitUntil(
      caches.keys().then(keyList => {
        console.log('[Service Worker] Deleting all caches:', keyList);
        return Promise.all(keyList.map(key => caches.delete(key)));
      }).then(() => {
        console.log('[Service Worker] All caches cleared.');
        // Optionally notify clients that the cache is cleared
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'CACHE_CLEARED' }));
        });
      })
    );
  }
});
