import { adminDb } from './src/lib/firebase-admin.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
  if (!adminDb) return;
  const inProgressSnap = await adminDb.collection('matchups').where('status', 'in', ['STATUS_IN_PROGRESS', 'STATUS_DELAYED']).get();
  let batch = adminDb.batch();
  let updatedCount = 0;
  
  for (const doc of inProgressSnap.docs) {
      if (doc.data().abandoned === true) {
          console.log("Un-abandoning", doc.data().title);
          batch.update(doc.ref, { abandoned: false });
          updatedCount++;
      }
  }
  
  if (updatedCount > 0) {
      await batch.commit();
      console.log("Committed un-abandonments.");
  } else {
      console.log("No abandoned stuck games found.");
  }
}
run();
