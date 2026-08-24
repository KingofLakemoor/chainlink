import { adminDb } from '../lib/firebase-admin.js';
import { syncLeagueSchedules } from './scheduleProcessor.js';
import { updateAllProps } from './propGrader.js';

let syncInterval: NodeJS.Timeout | null = null;
let loopCount = 0;

export function startAutoSyncJob() {
  if (syncInterval) return;
  
  // Run every 2 minutes
  const runSync = async () => {
    const isFullSync = loopCount % 5 === 0;
    loopCount++;
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
      // Only fetch recent segments to avoid downloading years of history
      const link4SegmentsSnap = await adminDb.collection('link4Segments').orderBy('endTime', 'desc').limit(10).get();
      const nowMs = Date.now();
      link4SegmentsSnap.docs.forEach(doc => {
          const seg = doc.data();
          const endMs = new Date(seg.endTime).getTime();
          // If the segment hasn't ended yet (plus 1 day buffer for scoring), sync its sports
          if (endMs + (24 * 60 * 60 * 1000) > nowMs && seg.allowedSports) {
              seg.allowedSports.forEach(l => activeLeaguesSet.add(l));
          }
      });

      // Fetch Pickem & Bracket match IDs ONCE to save reads, and ONLY on full syncs to save thousands of reads
      const bracketMatchIds = new Set<string>();
      const pickemMatchupIds = new Set<string>();
      if (isFullSync) {
          try {
            const bracketsSnap = await adminDb.collection('brackets').where('status', 'in', ['OPEN', 'LOCKED', 'ACTIVE']).get();
            for (const doc of bracketsSnap.docs) {
              const bData = doc.data();
              if (bData.matchIds) Object.values(bData.matchIds).forEach(id => { if (id) bracketMatchIds.add(String(id)); });
            }
          } catch(e) {}
          
          try {
              const pickemMatchupsSnap = await adminDb.collection('pickemMatchups').where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED']).get();
              for (const doc of pickemMatchupsSnap.docs) {
                  const gameId = doc.data().gameId;
                  if (gameId) pickemMatchupIds.add(String(gameId));
              }
          } catch(e) {}
      }
      
      const activeLeagues = Array.from(activeLeaguesSet);
      
      for (let league of activeLeagues) {
        if (league === 'PROP') {
           await updateAllProps();
        } else {
           try {
             if (league === 'MEX' || league === 'Liga MX') league = 'LMX';
             if (league === 'Argentina' || league === 'Liga Profesional') league = 'ARG';
             if (league === 'Brazil' || league === 'Serie A' || league === 'Campeonato Brasileiro') league = 'BRA';
             
             await syncLeagueSchedules(league, !isFullSync, undefined, bracketMatchIds, pickemMatchupIds);
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
