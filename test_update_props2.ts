import admin from 'firebase-admin';
import { fetchPlayerStat, fetchGameStatus } from './src/services/propGrader.js'; // need to make fetchPlayerStat exported or just use same code

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
  const doc = await db.collection('matchups').doc('prop_builder_1784830497147_4346117_40912').get();
  const m = doc.data();
  console.log("Current homeTeam score:", m.homeTeam.score);
  
  // same code from test_fetcher...
}
run();
