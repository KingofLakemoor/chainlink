import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) {
     console.log("No adminDb");
     return;
  }
  const snap = await adminDb.collection('pickemCampaigns').get();
  snap.forEach(doc => {
    console.log(doc.id, '=>', doc.data().name, 'isCharity:', doc.data().isCharity);
  });
}
run();
