import admin from 'firebase-admin';
import { fetchPlayerStat } from './src/services/propGrader.js';

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
  console.log("Current awayTeam score:", m.awayTeam.score, "homeTeam score:", m.homeTeam.score);
  
  const valueA = await fetchPlayerStat(m.metadata.optionA, m.metadata.timeframe);
  const valueB = await fetchPlayerStat(m.metadata.optionB, m.metadata.timeframe);
  
  console.log("Fetched valueA:", valueA, "valueB:", valueB);
  
  await db.collection('matchups').doc(doc.id).update({
      'awayTeam.score': valueA,
      'homeTeam.score': valueB
  });
  
  const doc2 = await db.collection('matchups').doc('prop_builder_1784830497147_4346117_40912').get();
  console.log("After update awayTeam score:", doc2.data().awayTeam.score, "homeTeam score:", doc2.data().homeTeam.score);
}
run();
