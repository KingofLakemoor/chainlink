import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const snap = await adminDb.collection('pickemCampaigns').get();
  snap.docs.forEach(d => {
    console.log(d.id, d.data().name, "isPrivate:", d.data().isPrivate, "isArchived:", d.data().isArchived, "archived:", d.data().archived, "isOpen:", d.data().isOpen);
  });
}
run().catch(console.error);
