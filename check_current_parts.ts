import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const camps = await adminDb.collection('pickemCampaigns').get();
  const validCampIds = new Set(camps.docs.map(d => d.id));
  
  const parts = await adminDb.collection('pickemParticipants').get();
  const validCids = new Map();

  parts.docs.forEach(d => {
    const cid = d.data().campaignId;
    if (validCampIds.has(cid)) {
      if (!validCids.has(cid)) validCids.set(cid, []);
      validCids.get(cid).push(d.data().participantId);
    }
  });

  console.log("Current Campaigns and their participants:");
  for (const [cid, pids] of validCids.entries()) {
    console.log(cid, ":", pids.length, "participants");
  }
}
run().catch(console.error);
