import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();
async function run() {
  const snap = await db.collection('pickemCampaigns').doc('aUqhDhT3vKWfkPgSAVzf').get();
  console.log(snap.data());
}
run();
