import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const pickemMatchupsSnap = await adminDb.collection('pickemMatchups').where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED']).get();
  const leagues = new Set();
  pickemMatchupsSnap.docs.forEach(doc => {
      leagues.add(doc.data().league);
  });
  console.log("Leagues currently having active pickemMatchups:", Array.from(leagues));
}
run();
