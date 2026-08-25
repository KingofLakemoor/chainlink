import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').where('status', '==', 'STATUS_DELAYED').limit(5).get();
  snap.docs.forEach(doc => console.log(doc.id, doc.data().statusDesc));
}
run();
