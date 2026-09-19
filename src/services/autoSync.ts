import { adminDb } from '../lib/firebase-admin.js';
import { logServerError } from '../lib/serverErrorLogger.js';
import { syncLeagueSchedules } from './scheduleProcessor.js';
import { updateAllProps } from './propGrader.js';
import { gradeGridironWeek, updateGridironLeaderboard } from './gridironGrader.js';
import { getCurrentFootballWeek } from './gridironIngestion.js';

let syncTimeout: NodeJS.Timeout | null = null;
let loopCount = 0;
let cachedBracketMatchIds = new Set<string>();
let cachedPickemMatchupIds = new Set<string>();

let cachedActiveLeaguesSet = new Set<string>();
let cachedLeagueSettingsMap = new Map<string, any>();
let lastMetadataFetchTime = 0;
const METADATA_TTL_MS = 60 * 60 * 1000;

let finalizedGridironWeeksCache = new Set<string>();

export function startAutoSyncJob() {
  if (syncTimeout) return;

  const runSync = async () => {
    let hasLiveGames = false;
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

      // ALWAYS sync leagues that have games currently in progress or starting soon/past start time
      try {
          const inProgressSnap = await adminDb.collection('matchups').where('status', 'in', ['STATUS_IN_PROGRESS', 'STATUS_DELAYED']).get();
          if (!inProgressSnap.empty) {
              hasLiveGames = true;
          }
          inProgressSnap.docs.forEach(doc => {
              if (doc.data().league) activeLeaguesSet.add(doc.data().league);
          });

          // Check active scheduled matchups whose start time has arrived or is arriving soon (next 15 minutes)
          const activeScheduledSnap = await adminDb.collection('matchups')
              .where('status', '==', 'STATUS_SCHEDULED')
              .where('active', '==', true)
              .get();

          activeScheduledSnap.docs.forEach(doc => {
              const m = doc.data();
              const startTime = typeof m.startTime === 'number' ? m.startTime : (m.startTime ? new Date(m.startTime).getTime() : 0);
              if (startTime > 0 && startTime <= nowMs + 15 * 60 * 1000 && startTime >= nowMs - 12 * 60 * 60 * 1000) {
                  hasLiveGames = true;
                  if (m.league) activeLeaguesSet.add(m.league);
              }
          });

          // Check active Pick'Em matchups in progress or starting soon
          const activePickemSnap = await adminDb.collection('pickemMatchups')
              .where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_DELAYED'])
              .get();

          activePickemSnap.docs.forEach(doc => {
              const pm = doc.data();
              const startTime = typeof pm.startTime === 'number' ? pm.startTime : (pm.startTime ? new Date(pm.startTime).getTime() : 0);
              if (pm.status === 'STATUS_IN_PROGRESS' || pm.status === 'STATUS_DELAYED' || (startTime > 0 && startTime <= nowMs + 15 * 60 * 1000 && startTime >= nowMs - 12 * 60 * 60 * 1000)) {
                  hasLiveGames = true;
                  if (pm.league) activeLeaguesSet.add(pm.league);
              }
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
           try {
             await updateAllProps();
           } catch (err: any) {
             console.error(`[AutoSync] Error updating props: ${err?.message || err}`);
             logServerError('AutoSync Update Props', err);
           }
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

      // Automatically grade Gridiron 3x3 active week games in background (skipping if week is already finalized or off-peak)
      try {
        const { season, weekNumber } = getCurrentFootballWeek();
        const weekKey = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;

        if (!finalizedGridironWeeksCache.has(weekKey)) {
          // Only perform grading if games are live or on full syncs to avoid redundant reads/writes off-peak
          if (hasLiveGames || isFullSync) {
            const snapRef = adminDb.collection('gridiron_3x3_weekly_snapshots').doc(weekKey);
            const snapDoc = await snapRef.get();

            if (snapDoc.exists && snapDoc.data()?.isFinalized === true) {
              finalizedGridironWeeksCache.add(weekKey);
            } else {
              const result = await gradeGridironWeek(season, weekNumber);
              if (result && result.isFinalized) {
                finalizedGridironWeeksCache.add(weekKey);
              }
            }
          }
        }
      } catch (e: any) {
        console.error(`[AutoSync] Error during background Gridiron grading:`, e?.message || e);
        logServerError('AutoSync Gridiron Grading', e);
      }

      console.log("[AutoSync] Background schedule sync completed.");
    } catch (e) {
      console.error("[AutoSync] Error during background sync job:", e);
      logServerError('AutoSync Background Job', e);
    } finally {
      // Adaptive interval: 3 mins during live games, 10 mins during off-peak hours
      const nextDelayMs = hasLiveGames ? 3 * 60 * 1000 : 10 * 60 * 1000;
      syncTimeout = setTimeout(runSync, nextDelayMs);
    }
  };

  // Run immediately on start
  runSync();
}
