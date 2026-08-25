import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const oneMinAgo = Date.now() - 60000 * 5; // 5 mins
  const snap = await adminDb.collection('matchups').where('updatedAt', '>', oneMinAgo).get();
  const counts: any = {};
  snap.docs.forEach(doc => {
      const l = doc.data().league;
      counts[l] = (counts[l] || 0) + 1;
  });
  console.log("Matchups updated in the last 5 mins:", counts);
}
run();
