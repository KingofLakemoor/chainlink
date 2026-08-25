import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups')
    .limit(1)
    .get();
  snap.docs.forEach(doc => {
      console.log(doc.id, JSON.stringify(doc.data(), null, 2));
  });
}
run();
