import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const leagueSnap = await adminDb.collection('leagueSettings').doc('ARG').get();
  console.log("ARG leagueSettings:", leagueSnap.data());
}
run();
