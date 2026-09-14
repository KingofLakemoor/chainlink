import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const campaignIds = ['yes_day_2026', 'charity', 'YES Day Walk for Autism 2026', 'aUqhDhT3vKWfkPgSAVzf'];
  
  let winCount = 0;
  let lossCount = 0;
  let pendingCount = 0;
  for (const cid of campaignIds) {
    const snap = await adminDb.collection('pickemPicks').where('campaignId', '==', cid).get();
    snap.forEach(d => {
      if (d.data().status === 'WIN') winCount++;
      else if (d.data().status === 'LOSS') lossCount++;
      else pendingCount++;
    });
  }
  console.log(`Wins: ${winCount}, Losses: ${lossCount}, Pending: ${pendingCount}`);
}
run();
