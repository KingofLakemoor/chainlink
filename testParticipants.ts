import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const campaignIds = ['yes_day_2026', 'charity', 'YES Day Walk for Autism 2026', 'aUqhDhT3vKWfkPgSAVzf'];
  
  for (const cid of campaignIds) {
    const snap = await adminDb.collection('pickemParticipants').where('campaignId', '==', cid).get();
    console.log(`Campaign ${cid} has ${snap.size} participants.`);
    snap.forEach(d => {
      console.log(d.id, '->', d.data());
    });
  }
}
run();
