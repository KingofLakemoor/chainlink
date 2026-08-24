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
  const snap = await db.collection('matchups').where('league', '==', 'LLWS').get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.title && data.title.includes('Chiriqui')) {
      console.log(`Doc: ${doc.id}`);
      console.log(`Title: ${data.title}`);
      console.log(`Away: ${data.awayTeam.shortName} / ${data.awayTeam.name} / ${data.awayTeam.image}`);
      console.log(`Home: ${data.homeTeam.shortName} / ${data.homeTeam.name} / ${data.homeTeam.image}`);
      console.log(`UpdatedAt: ${new Date(data.updatedAt).toISOString()}`);
      console.log('---');
    }
  }
}
run().catch(console.error);
