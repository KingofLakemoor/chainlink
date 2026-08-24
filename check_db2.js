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
  const doc = await db.collection('matchups').doc('401896830').get();
  console.log(JSON.stringify(doc.data().awayTeam, null, 2));
  console.log(JSON.stringify(doc.data().homeTeam, null, 2));
}
run().catch(console.error);
