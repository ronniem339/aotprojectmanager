// A robust, modern service worker using a stale-while-revalidate strategy.

const CACHE_NAME_STATIC = 'aot-pm-static-v2'; // Changed version to force update
const CACHE_NAME_DYNAMIC = 'aot-pm-dynamic-v2';

// These are the absolute core files for the app shell to work.
// This list must be 100% correct.
const STATIC_ASSETS = [
  './', // This is the alias for index.html, the start_url.
  './index.html',
  './manifest.json',
  './style.css',
  './icons/AOT-lg.png',
  './js/app.js',
  './js/components/common.js' // Contains the crucial login screen component
];

// INSTALL: Cache the static app shell.
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then(cache => {
      console.log('[Service Worker] Precaching App Shell...');
      // Use addAll to cache all static assets. If one fails, the SW install fails.
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
        // This is critical for debugging.
        console.error('[Service Worker] Pre-caching failed:', err);
    })
  );
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
          if (networkResponse && networkResponse.status === 200) {
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
