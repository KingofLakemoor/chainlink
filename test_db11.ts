import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const snap = await adminDb.collection('matchups').where('status', '==', 'STATUS_IN_PROGRESS').get();
  snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.league === 'ARG') console.log("ARG game:", data.title, "Abandoned:", data.abandoned);
  });
}
run();
