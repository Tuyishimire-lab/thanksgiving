const CACHE_NAME = 'praisepage-cache-v1';
const OFFLINE_PAGE = '/offline';

const ASSETS_TO_CACHE = [
  '/',
  OFFLINE_PAGE,
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png',
  '/assets/images/favicon.png',
  '/assets/images/praisepage.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline fallback and key assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore non-same-origin requests, Next.js dev server sockets, and chrome extensions
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/_next/webpack-hmr') || url.pathname.startsWith('/_next/data/')) return;

  // Cache-First strategy for static assets
  const isStaticAsset = 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Silent catch, return nothing
        });
      })
    );
  } else {
    // Network-First (with cache fallback) strategy for pages and API calls
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If the request was for a page/document navigation, return the offline fallback
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_PAGE);
            }
          });
        })
    );
  }
});

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────

// Map each notification tag to the URL the user should land on when they tap it
const NOTIFICATION_URLS = {
  'verse-of-day':          '/',
  'devotional-reminder':   '/plans',
  'gratitude-journal':     '/',
  'scripture-quiz':        '/bible',
};

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PraisePage', body: event.data.text(), tag: 'general' };
  }

  const { title, body, tag, icon, badge, data } = payload;

  const options = {
    body,
    tag: tag || 'general',
    icon: icon || '/assets/images/icon-192.png',
    badge: badge || '/assets/images/icon-192.png',
    data: data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: payload.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const tag = event.notification.tag;
  const targetUrl = NOTIFICATION_URLS[tag] || '/';
  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(fullUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
