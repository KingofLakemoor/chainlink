import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const picksSnap = await adminDb.collection('pickemPicks').limit(5).get();
  picksSnap.docs.forEach(doc => {
      console.log(doc.data());
  });
}
run();
