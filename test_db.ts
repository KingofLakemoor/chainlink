import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').doc('1075-2026_182119').get();
  console.log("statusDesc:", snap.data()?.statusDesc);
}
run();
