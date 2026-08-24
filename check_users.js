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
  const users = await db.collection('users').get();
  users.forEach(doc => {
    console.log(doc.id, doc.data().email, doc.data().role);
  });
}
run();
