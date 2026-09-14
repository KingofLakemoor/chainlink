import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const app = initializeApp({ projectId: 'ai-studio-1613b77c-1870-426f-a112-896d5efd5f69' });
const db = getFirestore(app);
async function run() {
  const snap = await db.collection('pickemCampaigns').get();
  snap.docs.forEach(d => {
    console.log(d.id, d.data().name, "isPrivate:", d.data().isPrivate, "isArchived:", d.data().isArchived, "archived:", d.data().archived);
  });
}
run();
