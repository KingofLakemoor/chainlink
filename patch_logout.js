import fs from 'fs';
const content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const updatedLogout = `import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { arrayRemove } from 'firebase/firestore';

export const logout = async () => {
  if (import.meta.env.DEV && (!app.options.apiKey || app.options.apiKey === 'MY_FIREBASE_API_KEY')) {
    window.dispatchEvent(new Event('mock-logout'));
    return;
  }
  
  if (auth.currentUser) {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY }).catch(() => null);
        if (currentToken) {
           await deleteToken(messaging).catch(() => null);
           await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              fcmTokens: arrayRemove(currentToken)
           }).catch(() => null);
        }
      }
    } catch (e) {
      console.warn("Could not clean up FCM token on logout", e);
    }
  }

  return signOut(auth);
};`;

const newContent = content.replace(
  /export const logout = \(\) => \{[\s\S]*?return signOut\(auth\);\n\};/,
  updatedLogout
);

fs.writeFileSync('src/lib/firebase.ts', newContent);
