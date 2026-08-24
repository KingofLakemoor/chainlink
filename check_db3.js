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
  console.log('awayTeam:', doc.data().awayTeam.shortName, doc.data().awayTeam.name);
  console.log('homeTeam:', doc.data().homeTeam.shortName, doc.data().homeTeam.name);
}
run().catch(console.error);
