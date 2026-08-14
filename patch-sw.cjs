const fs = require('fs');
let content = fs.readFileSync('src/sw.ts', 'utf8');

const oldStr = `// VERSION: 1.0.2 - Force update to clear stuck caches
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  let needsReload = false;
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.includes('workbox') || cacheName.includes('precache')) {
            needsReload = true;
          }
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});`;

const newStr = `// VERSION: 1.0.3 - Force update to clear stuck caches (fix white screen)
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('src/sw.ts', content);
