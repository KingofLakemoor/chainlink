import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const picksSnap = await adminDb.collection('pickemPicks').get();
  const pickCampaigns = new Set();
  const pickParticipants = new Set();
  picksSnap.docs.forEach(doc => {
      pickCampaigns.add(doc.data().campaignId);
      pickParticipants.add(`${doc.data().campaignId}_${doc.data().participantId || doc.data().userId}`);
  });
  console.log("Unique Campaign-User pairs from picks:", pickParticipants.size);

  const partSnap = await adminDb.collection('pickemParticipants').get();
  console.log("Total pickemParticipants records:", partSnap.docs.length);
}
run();
