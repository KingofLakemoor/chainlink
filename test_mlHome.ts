import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').doc('718-2026_184453').get();
  console.log("metadata:", snap.data()?.metadata);
}
run();
