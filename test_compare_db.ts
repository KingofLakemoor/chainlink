import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').doc('401816655').get();
  console.log("DB DATA:", snap.data()?.updatedAt, snap.data()?.metadata);
}
run();
