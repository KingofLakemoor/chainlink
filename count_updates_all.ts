import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const oneMinAgo = Date.now() - 300000;
  const snap = await adminDb.collection('matchups').where('updatedAt', '>', oneMinAgo).get();
  
  const counts: any = {};
  snap.docs.forEach(doc => {
      const data = doc.data();
      const reason = `${data.league} - status: ${data.status}`;
      counts[reason] = (counts[reason] || 0) + 1;
  });
  console.log("Matchups updated:", counts);
}
run();
