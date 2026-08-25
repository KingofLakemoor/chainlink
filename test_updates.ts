import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups')
    .where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS'])
    .limit(5)
    .get();
  snap.docs.forEach(doc => {
      console.log(doc.id, "updatedAt:", doc.data().updatedAt, "diff from now:", Date.now() - doc.data().updatedAt);
  });
}
run();
