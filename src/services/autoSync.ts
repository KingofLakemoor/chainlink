import { adminDb } from '../lib/firebase-admin.js';
import { logServerError } from '../lib/serverErrorLogger.js';
import { syncLeagueSchedules } from './scheduleProcessor.js';
import { updateAllProps } from './propGrader.js';
import { gradeGridironWeek, updateGridironLeaderboard } from './gridironGrader.js';
import { getCurrentFootballWeek } from './gridironIngestion.js';

let syncInterval: NodeJS.Timeout | null = null;
let loopCount = 0;
let cachedBracketMatchIds = new Set<string>();
let cachedPickemMatchupIds = new Set<string>();

let cachedActiveLeaguesSet = new Set<string>();
let cachedLeagueSettingsMap = new Map<string, any>();
let lastMetadataFetchTime = 0;
const METADATA_TTL_MS = 60 * 60 * 1000;

export function startAutoSyncJob() {
  if (syncInterval) return;
  
  // Run every 3 minutes
  const runSync = async () => {
    const isFullSync = loopCount % 5 === 0;
    loopCount++;
    try {
      console.log("[AutoSync] Starting background schedule sync...");
      if (!adminDb) return;

      const nowMs = Date.now();
      const activeLeaguesSet = new Set<string>();
      const leagueSettingsMap = new Map<string, any>();

      if (lastMetadataFetchTime > 0 && (nowMs - lastMetadataFetchTime) < METADATA_TTL_MS) {
        cachedActiveLeaguesSet.forEach(l => activeLeaguesSet.add(l));
        cachedLeagueSettingsMap.forEach((val, key) => leagueSettingsMap.set(key, val));
      } else {
        const activeLeaguesSnap = await adminDb.collection('leagueSettings').where('active', '==', true).get();
        activeLeaguesSnap.docs.forEach(doc => {
          activeLeaguesSet.add(doc.id);
          leagueSettingsMap.set(doc.id, doc.data());
        });

        // Also ensure any league actively used in a PickEm Campaign is synced
        const pickemCampaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
        pickemCampaignsSnap.docs.forEach(doc => {
            const c = doc.data();
            if (c.league) activeLeaguesSet.add(c.league);
            if (c.leagues) c.leagues.forEach((l: string) => activeLeaguesSet.add(l));
        });

        // Ensure any league in an active Link4 Segment is synced
        // Only fetch recent segments to avoid downloading years of history
        const link4SegmentsSnap = await adminDb.collection('link4Segments').orderBy('endTime', 'desc').limit(10).get();
        link4SegmentsSnap.docs.forEach(doc => {
            const seg = doc.data();
            const endMs = new Date(seg.endTime).getTime();
            // If the segment hasn't ended yet (plus 1 day buffer for scoring), sync its sports
            if (endMs + (24 * 60 * 60 * 1000) > nowMs && seg.allowedSports) {
                seg.allowedSports.forEach((l: string) => activeLeaguesSet.add(l));
            }
        });

        cachedActiveLeaguesSet = new Set(activeLeaguesSet);
        cachedLeagueSettingsMap = new Map(leagueSettingsMap);
        lastMetadataFetchTime = nowMs;
      }

      // ALWAYS sync leagues that have games currently in progress, to ensure they don't get stuck forever if a league is deactivated
      try {
          const inProgressSnap = await adminDb.collection('matchups').where('status', 'in', ['STATUS_IN_PROGRESS', 'STATUS_DELAYED']).get();
          inProgressSnap.docs.forEach(doc => {
              if (doc.data().league) activeLeaguesSet.add(doc.data().league);
          });
      } catch (e) {}

      // Fetch Pickem & Bracket match IDs ONCE on full syncs and cache them across runs
      if (isFullSync || cachedBracketMatchIds.size === 0) {
          try {
            const newBracketMatchIds = new Set<string>();
            const bracketsSnap = await adminDb.collection('brackets').where('status', 'in', ['OPEN', 'LOCKED', 'ACTIVE']).get();
            for (const doc of bracketsSnap.docs) {
              const bData = doc.data();
              if (bData.matchIds) Object.values(bData.matchIds).forEach(id => { if (id) newBracketMatchIds.add(String(id)); });
            }
            cachedBracketMatchIds = newBracketMatchIds;
          } catch(e) {}
          
          try {
              const newPickemMatchupIds = new Set<string>();
              const pickemMatchupsSnap = await adminDb.collection('pickemMatchups').where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED']).get();
              for (const doc of pickemMatchupsSnap.docs) {
                  const gameId = doc.data().gameId;
                  if (gameId) newPickemMatchupIds.add(String(gameId));
              }
              cachedPickemMatchupIds = newPickemMatchupIds;
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
             
             await syncLeagueSchedules(
               league as any,
               !isFullSync,
               undefined,
               cachedBracketMatchIds,
               cachedPickemMatchupIds,
               leagueSettingsMap.get(league)
             );
           } catch (err: any) {
             console.error(`[AutoSync] Error syncing ${league}: ${err.message}`);
             logServerError(`AutoSync Sync League (${league})`, err);
           }
        }
      }
      // Automatically grade Gridiron 3x3 active week games and update Test 1 standings on every autoSync cycle
      try {
        const { season, weekNumber } = getCurrentFootballWeek();
        await gradeGridironWeek(season, weekNumber, { contestId: 'test_1' });
        await updateGridironLeaderboard('test_1');
      } catch (e: any) {
        console.error(`[AutoSync] Error during background Gridiron grading:`, e?.message || e);
        logServerError('AutoSync Gridiron Grading', e);
      }

      console.log("[AutoSync] Background schedule sync completed.");
    } catch (e) {
      console.error("[AutoSync] Error during background sync job:", e);
      logServerError('AutoSync Background Job', e);
    }
  };
  
  // Run immediately on start
  runSync();
  syncInterval = setInterval(runSync, 3 * 60 * 1000);
}
