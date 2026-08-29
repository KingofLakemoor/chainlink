import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  const p = await adminDb!.collection('pickemParticipants').doc('aUqhDhT3vKWfkPgSAVzf_oAehm3hCCqRaimY14fQ0B7yuzYP2').get();
  console.log(p.data());
}
run();
