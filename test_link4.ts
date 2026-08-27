import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const segmentId = 'segment_1787759902919';
  const snap = await adminDb!.collection('link4Matchups').where('segmentId', '==', segmentId).get();
  console.log("Matchups found:", snap.docs.length);
  snap.docs.forEach(d => console.log(d.id, d.data().title));
}
run();
