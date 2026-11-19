const CACHE_NAME = 'aashray-scanner-v1';

const STATIC_ASSETS = [
  // 11 Scanner and Kiosk HTML Pages
  '/admin/food/issuePlate.html',
  '/admin/food/issuePlateScan.html',
  '/admin/gate/gateInTap.html',
  '/admin/gate/gateOutTap.html',
  '/admin/gate/gateIn.html',
  '/admin/gate/gateOut.html',
  '/admin/adhyayan/adhyayanAttendanceScanTap.html',
  '/admin/adhyayan/adhyayanAttendanceScanMob.html',
  '/admin/utsav/issuePlateScanUtsav.html',
  '/admin/utsav/utsavCheckin.html',
  '/admin/room/selfKiosk.html',

  // Page Scripts
  '/admin/food/issuePlate.js',
  '/admin/food/issuePlateScan.js',
  '/admin/gate/gateInTap.js',
  '/admin/gate/gateOutTap.js',
  '/admin/gate/gateIn.js',
  '/admin/gate/gateOut.js',
  '/admin/adhyayan/adhyayanAttendanceScanTap.js',
  '/admin/adhyayan/adhyayanAttendanceScanMob.js',
  '/admin/utsav/issuePlateScanUtsav.js',
  '/admin/utsav/utsavCheckin.js',
  '/admin/room/selfKiosk.js',
  '/admin/room/kioskCommon.js',

  // Core Utilities & Styles
  '/style/css/styles.css',
  '/style/css/style.css',
  '/style/js/jquery.min.js',
  '/style/js/html5-qrcode.min.js',
  '/style/js/config.js',
  '/style/js/custom.js',
  '/style/js/plugin.js',
  '/style/js/roleCheck.js',
  '/style/js/scannerCommon.js',
  '/style/js/pwa-register.js',
  '/style/js/offline-db.js',
  '/style/js/stationAuth.js',
  '/manifest.json',
  '/assets/images/logo.png',
  '/assets/sound/alert.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch on each to prevent one missing asset from failing entire precache
      return Promise.all(
        STATIC_ASSETS.map((url) => {
          return cache.add(url).catch((err) => {
            console.warn(`[SW] Precache skipped for ${url}:`, err.message);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Bypass API requests to live network
  if (url.pathname.includes('/api/v1/')) {
    return;
  }

  // Restrict caching strictly to precached assets, style/asset bundles, and scanner pages
  const isScannerPage = [
    '/admin/food/issuePlate.html',
    '/admin/food/issuePlateScan.html',
    '/admin/gate/gateInTap.html',
    '/admin/gate/gateOutTap.html',
    '/admin/gate/gateIn.html',
    '/admin/gate/gateOut.html',
    '/admin/adhyayan/adhyayanAttendanceScanTap.html',
    '/admin/adhyayan/adhyayanAttendanceScanMob.html',
    '/admin/utsav/issuePlateScanUtsav.html',
    '/admin/utsav/utsavCheckin.html',
    '/admin/room/selfKiosk.html'
  ].includes(url.pathname);

  const isStaticResource =
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith('/style/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json';

  if (!isScannerPage && !isStaticResource) {
    // Pass all general admin pages directly to network without caching
    return;
  }

  // Handle static asset & template delivery
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Stale-while-revalidate for background updates when online
        if (navigator.onLine) {
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(event.request, { ignoreSearch: true });
        }
      });
    })
  );
});
