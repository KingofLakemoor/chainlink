import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const snap = await adminDb.collection('pickemParticipants').get();
  console.log("Total:", snap.docs.length);
  snap.docs.slice(0, 10).forEach(d => console.log(d.id, d.data()));
}
run().catch(console.error);
