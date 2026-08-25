import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').where('status', '==', 'STATUS_IN_PROGRESS').get();
  console.log("In progress matchups:", snap.docs.length);
  snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(data.league, data.statusDesc, data.title);
  });
}
run();
