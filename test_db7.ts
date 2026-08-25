import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const campaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '==', true).get();
  campaignsSnap.docs.forEach(doc => {
      const c = doc.data();
      console.log("Archived Campaign:", c.id, c.league, c.leagues);
  });
}
run();
