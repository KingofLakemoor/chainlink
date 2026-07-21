import fs from 'fs';
const content = fs.readFileSync('src/hooks/useNotifications.ts', 'utf8');
const newContent = content.replace(
  /const unsubscribe = onMessage\(messaging, \(payload\) => \{[\s\S]*?\}\);/g,
  `const unsubscribe = onMessage(messaging, (payload) => {
            if (payload.notification) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(payload.notification.title || 'Notification', {
                  body: payload.notification.body,
                  icon: '/icons/icon-192x192.png',
                  data: {
                     url: payload.data?.url || '/'
                  }
                });
              });
            }
          });`
);
fs.writeFileSync('src/hooks/useNotifications.ts', newContent);
console.log('patched onmessage');
