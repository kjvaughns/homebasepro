// HomeBase Service Worker
const CACHE_NAME = 'homebase-v3';
const urlsToCache = [
  '/homebase-logo.png',
  '/manifest.json',
  '/pwa-launch'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API calls
  if (url.pathname.startsWith('/rest/') || 
      url.pathname.startsWith('/auth/') || 
      url.pathname.startsWith('/functions/')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
    );
    return;
  }

// Network-first for navigation requests (HTML pages)
if (request.mode === 'navigate') {
  event.respondWith(
    fetch(request)
      .then((response) => {
        const path = url.pathname;
        // Avoid caching auth routing pages to prevent stale redirects
        const shouldCache = !['/pwa-launch', '/login', '/auth', '/home'].includes(path);
        if (shouldCache) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clonedResponse));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
  return;
}

  // Cache-first for static assets
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
  );
});

// Push event - show notification
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {
    title: 'HomeBase',
    body: 'You have a new update',
    url: '/messages',
    icon: '/homebase-logo.png'
  };

  const options = {
    body: data.body,
    icon: data.icon || '/homebase-logo.png',
    badge: data.badge || '/homebase-logo.png',
    data: data.data || { url: data.url || '/messages' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [200, 100, 200],
    tag: data.tag || 'homebase-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/messages';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes('/messages') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle push subscription changes (browser refresh/invalidation)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('🔄 Push subscription changed event');
  
  event.waitUntil(
    // Notify all clients to re-sync their subscriptions
    clients.matchAll({ type: 'window' }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    })
  );
});
