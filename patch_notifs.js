import fs from 'fs';
const content = fs.readFileSync('src/hooks/useNotifications.ts', 'utf8');
const newContent = content.replace(
  /export async function requestNotificationPermission\(userUid: string, profile: any\) \{[\s\S]*?\} catch \(error\) \{[\s\S]*?console\.error\('Error setting up notifications:', error\);[\s\S]*?return false;\n  \}\n\}/,
  `export async function requestNotificationPermission(userUid: string, profile: any) {
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
    const configParam = encodeURIComponent(JSON.stringify(app.options));
    const swUrl = \`/sw.js?config=\${configParam}\`;
    const registration = await navigator.serviceWorker.register(swUrl);
    
    if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
      console.error('Missing VITE_FIREBASE_VAPID_KEY environment variable. Push notifications require this key.');
      return { granted: false, reason: 'missing_vapid' };
    }

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
      return { granted: true };
    } else {
      console.error('Failed to get FCM token');
      return { granted: false, reason: 'no_token' };
    }
  } catch (error: any) {
    console.error('Error setting up notifications:', error);
    return { granted: false, reason: error.message || 'error' };
  }
}`
);
fs.writeFileSync('src/hooks/useNotifications.ts', newContent);
console.log('patched');
