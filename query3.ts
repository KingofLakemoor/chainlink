import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('pickemPicks').get();
  let yesDayPicks = 0;
  snap.forEach(doc => {
    if (doc.data().campaignId === 'aUqhDhT3vKWfkPgSAVzf') {
      yesDayPicks++;
    }
  });
  console.log('Total YES Day picks:', yesDayPicks);
}
run();
