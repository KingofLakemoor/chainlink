import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const camps = await adminDb.collection('pickemCampaigns').get();
  const validCampIds = new Set(camps.docs.map(d => d.id));
  
  const parts = await adminDb.collection('pickemParticipants').get();
  const orphanCids = new Set();
  const validCids = new Set();

  parts.docs.forEach(d => {
    const cid = d.data().campaignId;
    if (!validCampIds.has(cid)) {
      orphanCids.add(cid);
    } else {
      validCids.add(cid);
    }
  });

  console.log("Valid Campaign IDs in participants:", Array.from(validCids));
  console.log("Orphan Campaign IDs in participants:", Array.from(orphanCids));
}
run().catch(console.error);
