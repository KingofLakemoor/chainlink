import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) {
    console.error("No adminDb found");
    return;
  }
  const campaignId = 'aUqhDhT3vKWfkPgSAVzf';
  
  const picksSnap = await adminDb.collection('pickemPicks').where('campaignId', '==', campaignId).get();
  console.log(`Found ${picksSnap.size} pick documents.`);
  
  const partsSnap = await adminDb.collection('pickemParticipants').where('campaignId', '==', campaignId).get();
  console.log(`Found ${partsSnap.size} participant entries.`);
  
  let batch = adminDb.batch();
  let count = 0;
  let totalDeleted = 0;
  
  for (const doc of picksSnap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count === 490) {
      await batch.commit();
      totalDeleted += count;
      batch = adminDb.batch();
      count = 0;
    }
  }
  
  for (const doc of partsSnap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count === 490) {
      await batch.commit();
      totalDeleted += count;
      batch = adminDb.batch();
      count = 0;
    }
  }
  
  if (count > 0) {
    await batch.commit();
    totalDeleted += count;
  }
  
  console.log(`Successfully deleted ${totalDeleted} documents total.`);
}

run().catch(console.error);
