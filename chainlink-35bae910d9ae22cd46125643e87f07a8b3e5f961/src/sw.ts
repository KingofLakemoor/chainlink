/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & typeof globalThis;

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import firebaseConfig from '../firebase-applet-config.json';

// VERSION: 1.0.1 - Force update to clear stuck caches

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
      ).then(() => {
        if (needsReload) {
          self.clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let client of windowClients) {
              client.navigate(client.url);
            }
          });
        }
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler for PWA requirements
});

try {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  
  onBackgroundMessage(messaging, (payload) => {
    console.log('[sw.ts] Received background message ', payload);
    
    // Support both notification and data payloads to avoid duplicates
    const title = payload.notification?.title || payload.data?.title || "Social Pick 'Em Update";
    const body = payload.notification?.body || payload.data?.body;
    
    const notificationOptions = {
      body: body,
      icon: '/logo.png',
      data: {
         url: payload.data?.url || '/'
      }
    };
    self.registration.showNotification(title, notificationOptions);
  });
} catch (error) {
  console.error('Failed to initialize Firebase Messaging in Service Worker', error);
}

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
