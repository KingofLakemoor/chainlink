import { adminDb } from './src/lib/firebase-admin.js';
async function run() {
  const snap = await adminDb!.collection('pickemMatchups').where('campaignId', '==', 'aUqhDhT3vKWfkPgSAVzf').where('type', '==', 'TIEBREAKER').get();
  console.log('Tiebreakers:', snap.size);
}
run();
