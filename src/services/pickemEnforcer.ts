import { adminDb } from '../lib/firebase-admin.js';

let enforcerInterval: NodeJS.Timeout | null = null;

export function startPickemEnforcerJob() {
  if (enforcerInterval) return;

  const runEnforcer = async () => {
    if (!adminDb) return;
    try {
      // console.log("[PickemEnforcer] Auditing pick limits...");
      
      const now = Date.now();
      
      // Get all active campaigns
      const campaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
      
      for (const campaignDoc of campaignsSnap.docs) {
         const campaign = campaignDoc.data();
         if (!campaign.currentWeek) continue;
         
         let expectedLimit = campaign.pickLimit;
         if (campaign.format === 'SURVIVOR') expectedLimit = 1;
         if (!expectedLimit || expectedLimit <= 0) continue; // No limit to enforce
         
         // Find all participants
         const participantsSnap = await adminDb.collection('pickemParticipants')
            .where('campaignId', '==', campaignDoc.id)
            .get();
            
         for (const pDoc of participantsSnap.docs) {
            const pData = pDoc.data();
            const pId = pData.participantId;
            
            // Get all picks for this user for the current week
            const picksSnap = await adminDb.collection('pickemPicks')
               .where('campaignId', '==', campaignDoc.id)
               .where('participantId', '==', pId)
               .where('week', '==', campaign.currentWeek)
               .get();
               
            if (picksSnap.size > expectedLimit) {
               console.warn(`[PickemEnforcer] User ${pId} exceeded limit for campaign ${campaignDoc.id}. Has ${picksSnap.size}, allowed ${expectedLimit}.`);
               
               // Get all picks and sort by creation date
               const allPicks: any[] = picksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
               allPicks.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
               
               // Delete the most recent ones that exceed the limit
               const picksToDelete = allPicks.slice(expectedLimit);
               
               for (const p of picksToDelete) {
                  // Make sure the game hasn't started yet! If it has, we can't delete it safely.
                  // (Though if they cheated, maybe we should, but for safety we only delete pending unlocked ones)
                  let canDelete = true;
                  if (p.matchupId) {
                     const mDoc = await adminDb.collection('pickemMatchups').doc(p.matchupId).get();
                     if (mDoc.exists) {
                        const mData = mDoc.data();
                        if (mData && mData.startTime && mData.startTime <= now) {
                           canDelete = false; // Locked game
                        }
                     }
                  }
                  
                  if (canDelete) {
                     console.log(`[PickemEnforcer] Deleting invalid pick ${p.id} for user ${pId}`);
                     await adminDb.collection('pickemPicks').doc(p.id).delete();
                  } else {
                     console.warn(`[PickemEnforcer] Could not delete invalid pick ${p.id} because the game has locked.`);
                  }
               }
            }
         }
      }
    } catch (e) {
      console.error("[PickemEnforcer] Error:", e);
    }
  };

  // Run every 10 minutes
  runEnforcer();
  enforcerInterval = setInterval(runEnforcer, 10 * 60 * 1000);
}
