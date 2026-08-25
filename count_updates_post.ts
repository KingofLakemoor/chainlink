import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  if (!adminDb) return;
  const t0 = Date.now() - 30000;
  const snap = await adminDb.collection('matchups').where('updatedAt', '>', t0).get();
  console.log("Matchups updated in the last 30s:", snap.size);
}
run();
