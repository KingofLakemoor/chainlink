import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').limit(1).get();
  console.log(snap.docs[0].data());
}
run();
