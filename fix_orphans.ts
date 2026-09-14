import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const camps = await adminDb.collection('pickemCampaigns').get();
  const validCampIds = new Set(camps.docs.map(d => d.id));
  
  const parts = await adminDb.collection('pickemParticipants').get();
  const orphanDocs = [];

  parts.docs.forEach(d => {
    const cid = d.data().campaignId;
    if (!validCampIds.has(cid)) {
      orphanDocs.push(d.ref);
    }
  });

  console.log(`Found ${orphanDocs.length} orphaned participant records.`);
  // We won't delete them just yet unless we want to clean up the DB.
  // Actually, it doesn't hurt to leave them or clean them. Let's just report.
}
run().catch(console.error);
