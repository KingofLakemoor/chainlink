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
    if (data.homeTeam?.shortName !== data.homeTeam?.name || data.awayTeam?.shortName !== data.awayTeam?.name) {
       console.log(`Fixing matchup ${doc.id}`);
       await doc.ref.update({
         "homeTeam.shortName": data.homeTeam.name,
         "awayTeam.shortName": data.awayTeam.name
       });
    }
  }
}
run().catch(console.error);
