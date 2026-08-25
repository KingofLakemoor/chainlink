import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  if (!adminDb) return;
  const t0 = Date.now() - 120000; // 2 mins
  const snap = await adminDb.collection('matchups').where('updatedAt', '>', t0).limit(10).get();
  snap.docs.forEach(doc => {
      console.log(doc.id, new Date(doc.data().updatedAt).toISOString());
  });
}
run();
