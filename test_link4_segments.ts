import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const now = Date.now();
  const snap = await adminDb!.collection('link4Segments')
    .where('endTime', '>=', now)
    .orderBy('endTime', 'asc')
    .limit(1)
    .get();
  if (snap.empty) {
    console.log("No active link4 segment found.");
  } else {
    console.log("Active segment:", snap.docs[0].id, snap.docs[0].data().name);
  }
}
run();
