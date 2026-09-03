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
         if (campaign.currentWeek === undefined || campaign.currentWeek === null) continue;
         
         let expectedLimit = campaign.pickLimit;
         if (campaign.format === 'SURVIVOR') expectedLimit = 1;
         if (!expectedLimit || expectedLimit <= 0) continue; // No limit to enforce
         
         // Fetch all picks for this campaign and week in a single query
         const picksSnap = await adminDb.collection('pickemPicks')
            .where('campaignId', '==', campaignDoc.id)
            .get();
         
         const pickDocs = picksSnap.docs.filter(d => d.data().week === campaign.currentWeek);
         if (pickDocs.length === 0) continue;

         // Group picks by participantId
         const picksByParticipant = new Map<string, any[]>();
         for (const pDoc of pickDocs) {
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

               // Collect matchup IDs to batch fetch
               const matchupIds = Array.from(new Set(picksToDelete.map(p => p.matchupId).filter(Boolean)));
               const matchupMap = new Map<string, any>();

               if (matchupIds.length > 0) {
                 // Firestore 'in' query supports up to 30 items
                 for (let i = 0; i < matchupIds.length; i += 30) {
                   const chunk = matchupIds.slice(i, i + 30);
                   const mSnap = await adminDb.collection('pickemMatchups')
                     .where('__name__', 'in', chunk)
                     .get();
                   mSnap.docs.forEach(d => matchupMap.set(d.id, d.data()));
                 }
               }
               
               for (const p of picksToDelete) {
                  let canDelete = true;
                  if (p.matchupId && matchupMap.has(p.matchupId)) {
                     const mData = matchupMap.get(p.matchupId);
                     if (mData && mData.startTime && mData.startTime <= now) {
                        canDelete = false; // Locked game
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

  // Run every 6 hours
  runEnforcer();
  enforcerInterval = setInterval(runEnforcer, 6 * 60 * 60 * 1000);
}
