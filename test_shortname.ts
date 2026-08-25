import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').limit(10).get();
  snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Team: ${data.homeTeam?.name}, shortName: ${data.homeTeam?.shortName}`);
  });
}
run();
