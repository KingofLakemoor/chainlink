import { adminDb } from '../lib/firebase-admin.js';
import { syncLeagueSchedules } from './scheduleProcessor.js';
import { updateAllProps } from './propGrader.js';

let syncInterval: NodeJS.Timeout | null = null;

export function startAutoSyncJob() {
  if (syncInterval) return;
  
  // Run every 2 minutes
  const runSync = async () => {
    try {
      console.log("[AutoSync] Starting background schedule sync...");
      if (!adminDb) return;
      const activeLeaguesSnap = await adminDb.collection('leagueSettings').where('active', '==', true).get();
      const activeLeaguesSet = new Set(activeLeaguesSnap.docs.map(doc => doc.id));

      // Also ensure any league actively used in a PickEm Campaign is synced
      const pickemCampaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
      pickemCampaignsSnap.docs.forEach(doc => {
          const c = doc.data();
          if (c.league) activeLeaguesSet.add(c.league);
          if (c.leagues) c.leagues.forEach(l => activeLeaguesSet.add(l));
      });

      // Ensure any league in an active Link4 Segment is synced
      const link4SegmentsSnap = await adminDb.collection('link4Segments').get();
      const nowMs = Date.now();
      link4SegmentsSnap.docs.forEach(doc => {
          const seg = doc.data();
          const endMs = new Date(seg.endTime).getTime();
          // If the segment hasn't ended yet (plus 1 day buffer for scoring), sync its sports
          if (endMs + (24 * 60 * 60 * 1000) > nowMs && seg.allowedSports) {
              seg.allowedSports.forEach(l => activeLeaguesSet.add(l));
          }
      });

      // Ensure any league with manually activated games on the main board is synced
      const activeMatchupsSnap = await adminDb.collection('matchups').where('active', '==', true).get();
      activeMatchupsSnap.docs.forEach(doc => {
          const m = doc.data();
          if (m.league) activeLeaguesSet.add(m.league);
      });
      
      const activeLeagues = Array.from(activeLeaguesSet);
      
      for (let league of activeLeagues) {
        if (league === 'PROP') {
           await updateAllProps();
        } else {
           try {
             if (league === 'MEX' || league === 'Liga MX') league = 'LMX';
             if (league === 'Argentina' || league === 'Liga Profesional') league = 'ARG';
             if (league === 'Brazil' || league === 'Serie A' || league === 'Campeonato Brasileiro') league = 'BRA';
             
             await syncLeagueSchedules(league, false);
           } catch (err: any) {
             console.error(`[AutoSync] Error syncing ${league}: ${err.message}`);
           }
        }
      }
      console.log("[AutoSync] Background schedule sync completed.");
    } catch (e) {
      console.error("[AutoSync] Error during background sync job:", e);
    }
  };
  
  // Run immediately on start
  runSync();
  syncInterval = setInterval(runSync, 2 * 60 * 1000);
}
