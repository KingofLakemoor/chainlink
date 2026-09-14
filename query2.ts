import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('pickemParticipants').get();
  console.log('Total participants:', snap.size);
  snap.forEach(doc => {
    console.log(doc.id, '=>', doc.data().campaignId, doc.data().participantId, doc.data().userId);
  });
}
run();
