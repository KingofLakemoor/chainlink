import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth-context';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function requestNotificationPermission(userUid: string, profile: any) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    const configParam = encodeURIComponent(JSON.stringify(app.options));
    const swUrl = `/sw.js?config=${configParam}`;
    const registration = await navigator.serviceWorker.register(swUrl);

    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      const hasToken = profile?.fcmTokens?.includes(currentToken);
      if (!hasToken) {
        const userRef = doc(db, 'users', userUid);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
      }
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error setting up notifications:', error);
    return false;
  }
}

export function useNotifications() {
  const { user, profile } = useAuth();
  const setupDone = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const configParam = encodeURIComponent(JSON.stringify(app.options));
      navigator.serviceWorker.register(`/sw.js?config=${configParam}`).catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }

    if (!user || !profile || setupDone.current) return;

    if (profile.notificationsEnabled === false) return;

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      const setupNotifications = async () => {
        try {
          const messaging = getMessaging(app);

          // Only proceed automatically if permission is ALREADY granted
          if (Notification.permission !== 'granted') {
            return;
          }

          const registration = await navigator.serviceWorker.ready;

          const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
          });

          if (currentToken) {
            const hasToken = profile.fcmTokens?.includes(currentToken);
            if (!hasToken) {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                fcmTokens: arrayUnion(currentToken)
              });
            }
          }

          const unsubscribe = onMessage(messaging, (payload) => {
            if (payload.notification) {
              const notification = new Notification(payload.notification.title || 'Notification', {
                body: payload.notification.body
              });
              notification.onclick = function() {
                window.focus();
                this.close();
              };
            }
          });

          setupDone.current = true;

        } catch (error) {
          console.error('Error setting up notifications:', error);
        }
      };

      setupNotifications();
    }
  }, [user, profile]);
}
