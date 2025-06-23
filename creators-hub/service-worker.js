// A service worker for basic offline functionality and PWA installability.

const CACHE_NAME = 'creators-hub-cache-v1';
// This list includes the core files needed for the app shell to work offline.
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/icons/AOT-sm.png',
  '/icons/AOT-lg.png',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://unpkg.com/react@17/umd/react.development.js',
  'https://unpkg.com/react-dom@17/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://www.gstatic.com/firebasejs/8.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.6.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.6.1/firebase-storage.js',
  '/js/config.js',
  '/js/app.js',
  '/js/components/common.js'
];

// Install event: Open a cache and add the app shell files to it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all the core files to the cache
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: Serve cached content when available.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the resource is in the cache, return it
        if (response) {
          return response;
        }

        // Otherwise, fetch the resource from the network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time-use stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Cache the newly fetched resource
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Activate event: Clean up any old, unused caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache is not in our whitelist, delete it
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
