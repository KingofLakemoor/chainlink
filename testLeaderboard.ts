import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const campaignIds = ['yes_day_2026', 'charity', 'YES Day Walk for Autism 2026', 'aUqhDhT3vKWfkPgSAVzf'];
  
  let partCount = 0;
  for (const cid of campaignIds) {
    const snap = await adminDb.collection('pickemParticipants').where('campaignId', '==', cid).get();
    partCount += snap.size;
  }
  console.log('Participants:', partCount);

  let picksCount = 0;
  for (const cid of campaignIds) {
    const snap = await adminDb.collection('pickemPicks').where('campaignId', '==', cid).get();
    picksCount += snap.size;
  }
  console.log('Picks:', picksCount);
}
run();
