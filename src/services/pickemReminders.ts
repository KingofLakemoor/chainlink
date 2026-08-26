import { adminDb } from '../lib/firebase-admin.js';

let reminderInterval: NodeJS.Timeout | null = null;

export function startPickemRemindersJob() {
  if (reminderInterval) return;
  
  const runReminders = async () => {
    if (!adminDb) return;
    try {
      console.log("[PickemReminders] Checking for missing picks...");
      
      const now = Date.now();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      
      // Get all active campaigns
      const campaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
      
      for (const campaignDoc of campaignsSnap.docs) {
         const campaign = campaignDoc.data();
         if (campaign.currentWeek === undefined || campaign.currentWeek === null) continue;
         
         // Find the earliest game in this week for this campaign
         const matchupsSnap = await adminDb.collection('pickemMatchups')
            .where('campaignId', '==', campaignDoc.id)
            .where('week', '==', campaign.currentWeek)
            .get();
            
         if (matchupsSnap.empty) continue;
         
         let earliestStart = Infinity;
         matchupsSnap.docs.forEach(m => {
            const mData = m.data();
            if (mData.startTime && mData.startTime < earliestStart) earliestStart = mData.startTime;
         });
         
         if (earliestStart === Infinity) continue;
         
         const timeUntilLock = earliestStart - now;
         
         if (timeUntilLock > 0 && timeUntilLock <= twelveHoursMs && timeUntilLock > (twelveHoursMs - 60 * 60 * 1000)) {
            // Find all participants
            const participantsSnap = await adminDb.collection('pickemParticipants')
               .where('campaignId', '==', campaignDoc.id)
               .get();

            if (participantsSnap.empty) continue;

            // Fetch ALL picks for this campaign week in ONE query
            const picksSnap = await adminDb.collection('pickemPicks')
               .where('campaignId', '==', campaignDoc.id)
               .where('week', '==', campaign.currentWeek)
               .get();

            const pickCountByParticipant = new Map<string, number>();
            picksSnap.docs.forEach(pDoc => {
               const pId = pDoc.data().participantId;
               if (pId) {
                  pickCountByParticipant.set(pId, (pickCountByParticipant.get(pId) || 0) + 1);
               }
            });

            // Fetch ALL deduplication notifications for this campaign & week in ONE query
            const prefix = `pickem_remind_${campaignDoc.id}_w${campaign.currentWeek}_`;
            const notifSnap = await adminDb.collection('notifications')
               .where('dedupeId', '>=', prefix)
               .where('dedupeId', '<=', prefix + '\uf8ff')
               .get();
            const sentUserIds = new Set(notifSnap.docs.map(d => d.data().userId || d.data().targetUserId));

            let expectedLimit = campaign.pickLimit;
            if (campaign.format === 'SURVIVOR') expectedLimit = 1;

            if (!expectedLimit || expectedLimit <= 0) continue;

            for (const pDoc of participantsSnap.docs) {
               const pData = pDoc.data();
               const pId = pData.participantId;
               if (!pId || sentUserIds.has(pId)) continue;
               
               const userPickCount = pickCountByParticipant.get(pId) || 0;
               
               if (userPickCount < expectedLimit) {
                  const missing = expectedLimit - userPickCount;
                  const dedupeId = `pickem_remind_${campaignDoc.id}_w${campaign.currentWeek}_${pId}`;

                  await adminDb.collection('notifications').add({
                     userId: pId,
                     title: `Missing Picks: ${campaign.name}`,
                     message: `You still have ${missing} pick${missing > 1 ? 's' : ''} to make for Week ${campaign.currentWeek}! Games lock soon.`,
                     link: `/pickem/${campaignDoc.id}`,
                     read: false,
                     createdAt: Date.now(),
                     dedupeId: dedupeId
                  });
               }
            }
         }
      }
    } catch (e) {
      console.error("[PickemReminders] Error:", e);
    }
  };
  
  // Run every hour
  runReminders();
  reminderInterval = setInterval(runReminders, 60 * 60 * 1000);
}
