import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('pickemMatchups').where('league', '==', 'ARG').get();
  console.log("Total ARG pickemMatchups:", snap.docs.length);
  snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(data.gameId, data.status, data.awayTeam.name, "@", data.homeTeam.name);
  });
}
run();
