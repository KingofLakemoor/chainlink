import { useToast } from '../components/ui/Toast';
import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth-context';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function requestNotificationPermission(userUid: string, profile: any) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('Push notifications not supported by browser');
    return { granted: false, reason: 'unsupported' };
  }
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('Permission not granted:', permission);
      return { granted: false, reason: 'denied' };
    }
    
    const swUrl = `/sw.js`;
    const registration = await navigator.serviceWorker.register(swUrl);
    
    if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
      console.error('Missing VITE_FIREBASE_VAPID_KEY environment variable. Push notifications require this key.');
      return { granted: false, reason: 'missing_vapid' };
    }

    let currentToken;
    try {
      currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
    } catch (tokenErr: any) {
      console.error('Error during getToken:', tokenErr);
      if (tokenErr.message && tokenErr.message.includes('less than the existing version')) {
        console.warn('Detected IndexedDB version mismatch. Clearing FCM DBs and retrying...');
        const dbsToClear = ['firebase-messaging-database', 'firebase-installations-database', 'fcm_token_details_db'];
        for (const dbName of dbsToClear) {
          try { indexedDB.deleteDatabase(dbName); } catch (e) {}
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        });
      } else {
        throw tokenErr;
      }
    }
    if (currentToken) {
      const hasToken = profile?.fcmTokens?.includes(currentToken);
      if (!hasToken) {
        const userRef = doc(db, 'users', userUid);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
      }
      return { granted: true };
    } else {
      console.error('Failed to get FCM token');
      return { granted: false, reason: 'no_token' };
    }
  } catch (error: any) {
    console.error('Error setting up notifications:', error);
    return { granted: false, reason: error.message || 'error' };
  }
}

export function useNotifications() {
  const { addToast } = useToast();
  const { user, profile } = useAuth();
  const setupDone = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      
      navigator.serviceWorker.register(`/sw.js`).catch((error) => {
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

          let currentToken;
          try {
            currentToken = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration
            });
          } catch (tokenErr: any) {
            console.error('Error during background getToken:', tokenErr);
            if (tokenErr.message && tokenErr.message.includes('less than the existing version')) {
              console.warn('Detected IndexedDB version mismatch. Clearing FCM DBs and retrying...');
              const dbsToClear = ['firebase-messaging-database', 'firebase-installations-database', 'fcm_token_details_db'];
              for (const dbName of dbsToClear) {
                try { indexedDB.deleteDatabase(dbName); } catch (e) {}
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
              currentToken = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: registration
              });
            } else {
              throw tokenErr;
            }
          }

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
               addToast({
                 title: payload.notification.title || payload.data?.title || "Social Pick 'Em Update",
                 body: payload.notification.body || '',
                 url: payload.data?.url || '/'
               });
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
