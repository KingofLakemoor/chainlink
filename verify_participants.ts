import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const picksSnap = await adminDb.collection('pickemPicks').get();
  
  const pairs = new Map();
  picksSnap.docs.forEach(doc => {
      const data = doc.data();
      const campaignId = data.campaignId;
      const participantId = data.participantId || data.userId;
      if (!campaignId || !participantId) return;
      
      const pairId = `${campaignId}_${participantId}`;
      if (!pairs.has(pairId)) {
          pairs.set(pairId, { campaignId, participantId });
      }
  });

  console.log(`Verifying ${pairs.size} unique campaign-participant pairs...`);
  let missingCount = 0;
  for (const [pairId] of pairs.entries()) {
      const docSnap = await adminDb.collection('pickemParticipants').doc(pairId).get();
      if (!docSnap.exists) {
          missingCount++;
      }
  }

  console.log(`Missing participants: ${missingCount}`);
}
run();
