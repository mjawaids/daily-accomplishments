const CACHE_NAME = 'daily-wins-v1';
const STATIC_CACHE = 'daily-wins-static-v1';
const DYNAMIC_CACHE = 'daily-wins-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls - let them go to network for real-time sync
  if (url.hostname.includes('supabase')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response
            const responseToCache = networkResponse.clone();

            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // If network fails and we're requesting the main page, return cached version
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline accomplishments
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-accomplishments') {
    event.waitUntil(syncAccomplishments());
  }
});

// Handle background sync
async function syncAccomplishments() {
  try {
    // Get pending accomplishments from IndexedDB
    const pendingAccomplishments = await getPendingAccomplishments();
    
    for (const accomplishment of pendingAccomplishments) {
      try {
        // Try to sync with Supabase
        await syncToSupabase(accomplishment);
        // Remove from pending if successful
        await removePendingAccomplishment(accomplishment.id);
      } catch (error) {
        console.log('Failed to sync accomplishment:', error);
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getPendingAccomplishments() {
  // This would interact with IndexedDB
  return [];
}

async function syncToSupabase(accomplishment) {
  // This would make the actual API call to Supabase
  return Promise.resolve();
}

async function removePendingAccomplishment(id) {
  // This would remove the item from IndexedDB
  return Promise.resolve();
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});