import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const snap = await adminDb!.collection('link4Segments').get();
  snap.docs.forEach(d => console.log(d.id, d.data().name, d.data().endTime, typeof d.data().endTime));
}
run();
