import { adminDb } from './src/lib/firebase-admin.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  console.log("Starting sync ARG");
  await syncLeagueSchedules('ARG');
  console.log("Finished sync ARG");
  
  const snap = await adminDb.collection('matchups').where('status', '==', 'STATUS_IN_PROGRESS').get();
  snap.docs.forEach(doc => {
      if (doc.data().league === 'ARG') console.log("Still in progress:", doc.data().title, doc.data().statusDesc);
  });
}
run();
