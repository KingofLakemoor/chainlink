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
  const user = await db.collection('users').doc('zy60aD7pqlamDCTN4JjadSxmxhF3').get();
  console.log("User exists:", user.exists);
  console.log("User data:", JSON.stringify(user.data(), null, 2));
}
run();
