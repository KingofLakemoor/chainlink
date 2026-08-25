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
         
         // Fetch all picks for this campaign and week in a single query
         const picksSnap = await adminDb.collection('pickemPicks')
            .where('campaignId', '==', campaignDoc.id)
            .where('week', '==', campaign.currentWeek)
            .get();

         if (picksSnap.empty) continue;

         // Group picks by participantId
         const picksByParticipant = new Map<string, any[]>();
         for (const pDoc of picksSnap.docs) {
            const pData: any = { id: pDoc.id, ...pDoc.data() };
            const pId = pData.participantId;
            if (!pId) continue;
            if (!picksByParticipant.has(pId)) {
               picksByParticipant.set(pId, []);
            }
            picksByParticipant.get(pId)!.push(pData);
         }

         for (const [pId, userPicks] of picksByParticipant.entries()) {
            if (userPicks.length > expectedLimit) {
               console.warn(`[PickemEnforcer] User ${pId} exceeded limit for campaign ${campaignDoc.id}. Has ${userPicks.length}, allowed ${expectedLimit}.`);
               
               // Sort by creation date ascending
               userPicks.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
               
               // Delete the most recent ones that exceed the limit
               const picksToDelete = userPicks.slice(expectedLimit);
               
               for (const p of picksToDelete) {
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
