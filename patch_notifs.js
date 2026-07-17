import fs from 'fs';
let content = fs.readFileSync('src/hooks/useNotifications.ts', 'utf8');

const importToast = "import { useToast } from '../components/ui/Toast';\n";
content = importToast + content;

content = content.replace(
  "export function useNotifications() {",
  "export function useNotifications() {\n  const { addToast } = useToast();"
);

const originalOnMessage = `          const unsubscribe = onMessage(messaging, (payload) => {
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
          });`;

const newOnMessage = `          const unsubscribe = onMessage(messaging, (payload) => {
            if (payload.notification) {
               addToast({
                 title: payload.notification.title || 'Notification',
                 body: payload.notification.body || '',
                 url: payload.data?.url || '/'
               });
            }
          });`;

content = content.replace(originalOnMessage, newOnMessage);
fs.writeFileSync('src/hooks/useNotifications.ts', content);
