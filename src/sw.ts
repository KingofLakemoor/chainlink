/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & typeof globalThis;

import { precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Prevent TypeScript from complaining about the missing property
const manifest = (self as any).__WB_MANIFEST || [];
precacheAndRoute(manifest);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

// We can read dynamic config from URL if it's there,
// or fallback to import.meta.env + firebaseConfig
let firebaseConfig: any = null;

try {
  const urlParams = new URLSearchParams(self.location.search);
  const configParam = urlParams.get('config');
  if (configParam) {
    firebaseConfig = JSON.parse(decodeURIComponent(configParam));
  }
} catch (e) {
  console.error('[sw.ts] Failed to parse dynamic config', e);
}

if (!firebaseConfig) {
  console.warn('[sw.ts] Missing dynamic config. Ensure the frontend passes app.options during registration. Using a dummy config.');
  firebaseConfig = {
    projectId: "chainlink-fallback",
    appId: "1:1234567890:web:1234567890",
    authDomain: "chainlink-fallback.firebaseapp.com",
    messagingSenderId: "1234567890",
    apiKey: "ignored-but-required-for-sw-compat"
  };
}

try {
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  onBackgroundMessage(messaging, (payload) => {
    console.log('[sw.ts] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'ChainLink Update';
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/icons/icon-192x192.png',
      data: {
         url: payload.data?.url || '/'
      }
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('Failed to initialize Firebase Messaging in Service Worker', error);
}

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
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
