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

  console.log(`Found ${pairs.size} unique campaign-participant pairs from picks.`);

  let batch = adminDb.batch();
  let opCount = 0;
  let addedCount = 0;

  for (const [pairId, pairData] of pairs.entries()) {
      const docRef = adminDb.collection('pickemParticipants').doc(pairId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
          batch.set(docRef, {
              campaignId: pairData.campaignId,
              participantId: pairData.participantId,
              joinedAt: Date.now(),
              migratedFromPicks: true
          });
          addedCount++;
          opCount++;
          
          if (opCount >= 400) {
              await batch.commit();
              batch = adminDb.batch();
              opCount = 0;
          }
      }
  }

  if (opCount > 0) {
      await batch.commit();
  }
  
  console.log(`Successfully married up ${addedCount} missing participants!`);
}
run();
