import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').where('title', '==', 'Rosario Central @ Talleres (Córdoba)').get();
  snap.docs.forEach(doc => {
      console.log(doc.data());
  });
}
run();
