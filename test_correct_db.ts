import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) { console.error("No adminDb"); return; }
  console.log("adminDb databaseId:", adminDb.projectId, adminDb.databaseId);
  const snap = await adminDb.collection('link4Matchups').where('segmentId', '==', 'segment_1787759902919').get();
  console.log("Matchups in correct DB:", snap.docs.length);
}
run();
