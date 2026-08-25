import { adminDb } from './src/lib/firebase-admin.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  if (!adminDb) return;
  const t0 = Date.now();
  await syncLeagueSchedules('WTA', false, undefined, new Set(), new Set());
  const snap = await adminDb.collection('matchups').where('updatedAt', '>', t0).get();
  console.log("Matchups updated in this run:", snap.size);
}
run();
