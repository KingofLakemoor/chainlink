import { adminDb } from './src/lib/firebase-admin.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  if (!adminDb) return;
  const inProgressSnap = await adminDb.collection('matchups').where('status', 'in', ['STATUS_IN_PROGRESS', 'STATUS_DELAYED']).get();
  const leaguesToSync = new Set<string>();
  inProgressSnap.docs.forEach(doc => {
      if (doc.data().league) leaguesToSync.add(doc.data().league);
  });
  console.log("Leagues with stuck games:", Array.from(leaguesToSync));
  
  for (const l of Array.from(leaguesToSync)) {
      console.log("Syncing", l);
      await syncLeagueSchedules(l);
  }
}
run();
