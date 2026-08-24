import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

try {
  let app;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
     const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
     app = initializeApp({ credential: cert(serviceAccount) });
  } else {
     app = initializeApp();
  }
  const db = getFirestore();
  const snap = await db.collection('system_errors').orderBy('timestamp', 'desc').limit(5).get();
  console.log(`Found ${snap.size} errors.`);
  snap.docs.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
} catch(e) {
  console.error("Script error:", e);
}
