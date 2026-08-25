import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  if (!adminDb) return;
  const t0 = Date.now() - 120000;
  const snap = await adminDb.collection('matchups').where('updatedAt', '>', t0).limit(5).get();
  snap.docs.forEach(doc => {
      console.log(doc.id, doc.data().league, doc.data().status, doc.data().metadata);
  });
}
run();
