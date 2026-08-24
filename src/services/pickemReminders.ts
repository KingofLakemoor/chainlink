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
         if (!campaign.currentWeek) continue;
         
         // Find the earliest game in this week for this campaign
         // We do this by looking at pickemMatchups
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
         
         // If we are within 12 hours of the first game locking, and haven't sent a reminder yet...
         // Actually, let's just do within 12 and 11 hours to prevent spam, or track it in a separate collection.
         const timeUntilLock = earliestStart - now;
         
         if (timeUntilLock > 0 && timeUntilLock <= twelveHoursMs && timeUntilLock > (twelveHoursMs - 60 * 60 * 1000)) {
            // Find all participants
            const participantsSnap = await adminDb.collection('pickemParticipants')
               .where('campaignId', '==', campaignDoc.id)
               .get();
               
            for (const pDoc of participantsSnap.docs) {
               const pData = pDoc.data();
               const pId = pData.participantId;
               
               // Check their picks
               const picksSnap = await adminDb.collection('pickemPicks')
                  .where('campaignId', '==', campaignDoc.id)
                  .where('participantId', '==', pId)
                  .where('week', '==', campaign.currentWeek)
                  .get();
                  
               let expectedLimit = campaign.pickLimit;
               if (campaign.format === 'SURVIVOR') expectedLimit = 1;
               
               if (expectedLimit > 0 && picksSnap.size < expectedLimit) {
                  const missing = expectedLimit - picksSnap.size;
                  
                  // Check if we already sent this notification (to prevent spam within the 1-hour window)
                  const dedupeId = `pickem_remind_${campaignDoc.id}_w${campaign.currentWeek}_${pId}`;
                  const notifSnap = await adminDb.collection('notifications')
                     .where('dedupeId', '==', dedupeId)
                     .limit(1)
                     .get();
                     
                  if (notifSnap.empty) {
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
      }
    } catch (e) {
      console.error("[PickemReminders] Error:", e);
    }
  };
  
  // Run every hour
  runReminders();
  reminderInterval = setInterval(runReminders, 60 * 60 * 1000);
}
