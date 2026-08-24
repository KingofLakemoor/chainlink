import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();
let app;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({ credential: cert(serviceAccount) });
} else {
    app = initializeApp();
}
const db = getFirestore();

async function run() {
  const usersRef = db.collection('users');
  const snap = await usersRef.get();
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (data.username && data.username.toLowerCase().includes('abes') || data.email && data.email.toLowerCase().includes('abes') || data.name && data.name.toLowerCase().includes('abes')) {
      console.log(`Found: ID=${doc.id}, username=${data.username}, email=${data.email}, name=${data.name}`);
    }
  });
}
run().catch(console.error);
