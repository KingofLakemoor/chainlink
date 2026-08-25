import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const oneMinAgo = Date.now() - 60000;
  const snap = await adminDb.collection('matchups').where('updatedAt', '>', oneMinAgo).get();
  console.log("Matchups updated in the last minute:", snap.size);
}
run();
