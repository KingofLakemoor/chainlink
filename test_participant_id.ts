import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const picksSnap = await adminDb.collection('pickemPicks').get();
  
  let missingParticipantId = 0;
  picksSnap.docs.forEach(doc => {
      if (!doc.data().participantId) missingParticipantId++;
  });

  console.log(`Picks missing participantId: ${missingParticipantId}`);
}
run();
