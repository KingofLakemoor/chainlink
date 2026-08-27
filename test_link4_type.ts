import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const snap = await adminDb!.collection('link4Segments').get();
  snap.docs.forEach(d => console.log(d.id, typeof d.data().endTime, d.data().endTime));
}
run();
