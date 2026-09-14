import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const campaignIds = ['yes_day_2026', 'charity', 'YES Day Walk for Autism 2026', 'aUqhDhT3vKWfkPgSAVzf'];
  
  let missingPid = 0;
  for (const cid of campaignIds) {
    const snap = await adminDb.collection('pickemPicks').where('campaignId', '==', cid).get();
    snap.forEach(d => {
      const data = d.data();
      if (!data.participantId && !data.userId) {
        missingPid++;
      }
    });
  }
  console.log('Picks missing participantId/userId:', missingPid);
}
run();
