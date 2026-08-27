import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const snap = await adminDb!.collection('pickemCampaigns').get();
  snap.docs.forEach(d => console.log(d.id, d.data().name, "CODE:", d.data().joinCode));
}
run();
