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
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`\nMatchup ID: ${doc.id}`);
    console.log(`Home: ${data.homeTeam?.name} - ${data.homeTeam?.image}`);
    console.log(`Away: ${data.awayTeam?.name} - ${data.awayTeam?.image}`);
  });
}
run().catch(console.error);
