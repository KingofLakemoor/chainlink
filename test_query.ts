import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const q = adminDb.collection('pickemParticipants').where('participantId', '==', 'oAehm3hCCqRaimY14fQ0B7yuzYP2');
  const snap = await q.get();
  console.log(snap.docs.length);
}
run().catch(console.error);
