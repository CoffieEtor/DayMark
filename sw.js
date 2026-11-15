/* DAYMARK — Service Worker
 * Version: 1.0.0
 * Provides offline caching, network-resilient asset delivery, and Web Push notifications.
 */

const CACHE_NAME = 'daymark-cache-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/database.js',
  './js/state.js',
  './js/navigation.js',
  './js/dashboard.js',
  './js/tasks.js',
  './js/reminders.js',
  './js/wishlist.js',
  './js/picker.js',
  './js/notifications.js',
  './js/settings.js',
  './js/backup.js',
  './js/utilities.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/maskable-icon.png'
];

// Install: Cache essential application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up previous cache generations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets; Network-only for API calls
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests and dynamic push server API endpoints
  if (event.request.method !== 'GET' || requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  // For HTML navigation requests, try network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, serve from cache with background network refresh (stale-while-revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Event: Handle incoming background push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'DAYMARK Reminder', body: event.data.text() };
    }
  } else {
    payload = {
      title: 'DAYMARK Reminder',
      body: 'You have a pending reminder scheduled in DAYMARK.'
    };
  }

  const notificationTitle = payload.title || 'DAYMARK Reminder';
  const notificationOptions = {
    body: payload.body || 'Personal reminder notification',
    icon: payload.icon || './assets/icons/icon-192.png',
    badge: './assets/icons/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: payload.url || './index.html#reminders',
      id: payload.id || null,
      timestamp: Date.now()
    },
    actions: [
      { action: 'view', title: 'Open DAYMARK' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: payload.id ? `daymark-reminder-${payload.id}` : 'daymark-general',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Notification Click: Focus existing client or open window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './index.html#reminders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data
          });
          return client;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message listener for client coordination
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
