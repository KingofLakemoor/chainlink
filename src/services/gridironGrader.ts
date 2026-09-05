import * as firebaseAdmin from '../lib/firebase-admin.js';
import { scrapeLeagueSchedules, MATCHUP_FINAL_STATUSES } from './espnScraper.js';
import { fetchAndStoreTuesdayGridironLines, getFootballWeekDateRange } from './gridironIngestion.js';
import { GridironEntry, GridironPick, GridironLeaderboardRecord } from '../types/gridiron.js';

let getAdminDb = () => firebaseAdmin.adminDb;

export function setAdminDbMock(mock: any) {
  getAdminDb = () => mock;
}

export function isGameStatusFinal(status: string | undefined): boolean {
  if (!status) return false;
  const sUpper = String(status).toUpperCase();
  return (
    sUpper === "STATUS_FINAL" ||
    sUpper === "FINAL" ||
    sUpper === "COMPLETED" ||
    sUpper === "CLOSED" ||
    sUpper.includes("FINAL") ||
    MATCHUP_FINAL_STATUSES.includes(sUpper)
  );
}

export function evaluateGridironPick(
  pick: GridironPick,
  homeScore: number,
  awayScore: number
): "won" | "lost" | "push" | "pending" {
  if (pick.pickType === "spread") {
    // Value represents spread for the selected side or line
    if (pick.selection === "home_spread") {
      const margin = homeScore - awayScore;
      // e.g. homeSpread = -3.5. margin = 4 => 4 > -(-3.5) => 4 > 3.5 => won
      // pick.value is homeSpread (e.g. -3.5). Home score + homeSpread > away score
      const adjHome = homeScore + pick.value;
      if (adjHome > awayScore) return "won";
      if (adjHome === awayScore) return "push";
      return "lost";
    } else if (pick.selection === "away_spread") {
      // pick.value is awaySpread (e.g. +3.5). Away score + awaySpread > home score
      const adjAway = awayScore + pick.value;
      if (adjAway > homeScore) return "won";
      if (adjAway === homeScore) return "push";
      return "lost";
    }
  } else if (pick.pickType === "total") {
    const totalScore = homeScore + awayScore;
    if (pick.selection === "over") {
      if (totalScore > pick.value) return "won";
      if (totalScore === pick.value) return "push";
      return "lost";
    } else if (pick.selection === "under") {
      if (totalScore < pick.value) return "won";
      if (totalScore === pick.value) return "push";
      return "lost";
    }
  }
  return "pending";
}

/**
 * Grades user entries for a specific week across contests and updates group leaderboards.
 */
/**
 * Grades user entries for a specific week across contests, updates group leaderboards,
 * snapshots all entries into a single weekly Firestore document, and purges individual entries.
 */
export async function gradeGridironWeek(
  season: number,
  weekNumber: number,
  options?: { finalizeAndPurge?: boolean; contestId?: string }
) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    console.warn("[GridironGrader] adminDb not initialized.");
    return { success: false, error: "adminDb not initialized" };
  }

  const docId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;
  const linesDocRef = adminDb.collection("gridiron_3x3_lines").doc(docId);
  let linesSnap = await linesDocRef.get();

  if (!linesSnap.exists && process.env.NODE_ENV !== 'test') {
    try {
      await fetchAndStoreTuesdayGridironLines(season, weekNumber);
      linesSnap = await linesDocRef.get();
    } catch (e) {
      console.warn(`[GridironGrader] Auto-generation of lines failed for ${docId}:`, e);
    }
  }

  if (!linesSnap.exists) {
    if (options?.contestId) {
      await updateGridironLeaderboard(options.contestId);
    }
    return { success: false, error: `Lines snapshot not found for ${docId}` };
  }

  const snapshotData = linesSnap.data();
  const snapshotGames: any[] = snapshotData?.games || [];
  const snapshotGamesMap = new Map<string, any>(
    snapshotGames.map((g: any) => [String(g.gameId), g])
  );

  const weekRange = getFootballWeekDateRange(season, weekNumber);

  // Scrape live game scores across all dates in the active football week
  let liveGamesMap = new Map<string, { homeScore: number; awayScore: number; status: string }>();
  if (process.env.NODE_ENV !== 'test') {
    try {
      const [nflRes, cfbRes] = await Promise.all([
        scrapeLeagueSchedules("NFL", true, undefined, weekRange.dateStrings),
        scrapeLeagueSchedules("CFB", true, undefined, weekRange.dateStrings)
      ]);

      for (const g of [...(nflRes?.data || []), ...(cfbRes?.data || [])]) {
        if (g.gameId) {
          liveGamesMap.set(String(g.gameId), {
            homeScore: g.homeTeam?.score || 0,
            awayScore: g.awayTeam?.score || 0,
            status: g.status || "STATUS_SCHEDULED"
          });
        }
      }
    } catch (err) {
      console.warn("[GridironGrader] Live schedule scrape error:", err);
    }
  }

  // Fetch DB matchups collection as additional fallback
  const dbMatchupsMap = new Map<string, { homeScore: number; awayScore: number; status: string }>();
  const gameIds = snapshotGames.map((g: any) => String(g.gameId)).filter(Boolean);
  if (gameIds.length > 0) {
    try {
      for (let i = 0; i < gameIds.length; i += 30) {
        const chunk = gameIds.slice(i, i + 30);

        // 1. Fetch by document ID
        try {
          const docRefs = chunk.map(id => adminDb.collection("matchups").doc(id));
          const docs = await adminDb.getAll(...docRefs);
          docs.forEach(d => {
            if (d.exists) {
              const data = d.data();
              if (data) {
                const gid = String(data.gameId || d.id);
                const hScore = typeof data.homeTeam?.score === 'number' ? data.homeTeam.score : (typeof data.homeScore === 'number' ? data.homeScore : 0);
                const aScore = typeof data.awayTeam?.score === 'number' ? data.awayTeam.score : (typeof data.awayScore === 'number' ? data.awayScore : 0);
                dbMatchupsMap.set(gid, {
                  homeScore: hScore,
                  awayScore: aScore,
                  status: data.status || "STATUS_SCHEDULED"
                });
              }
            }
          });
        } catch (e) {
          console.warn("[GridironGrader] getAll matchups lookup error:", e);
        }

        // 2. Fetch by gameId field query
        try {
          const mSnap = await adminDb.collection("matchups").where("gameId", "in", chunk).get();
          mSnap.docs.forEach(d => {
            const data = d.data();
            if (data) {
              const gid = String(data.gameId || d.id);
              const hScore = typeof data.homeTeam?.score === 'number' ? data.homeTeam.score : (typeof data.homeScore === 'number' ? data.homeScore : 0);
              const aScore = typeof data.awayTeam?.score === 'number' ? data.awayTeam.score : (typeof data.awayScore === 'number' ? data.awayScore : 0);
              dbMatchupsMap.set(gid, {
                homeScore: hScore,
                awayScore: aScore,
                status: data.status || "STATUS_SCHEDULED"
              });
            }
          });
        } catch (e) {
          console.warn("[GridironGrader] where gameId matchups lookup error:", e);
        }
      }
    } catch (e) {
      console.warn("[GridironGrader] Matchups collection lookup error:", e);
    }
  }

  // Fetch active unpurged entries for this season & week
  const entriesSnap = await adminDb.collection("gridiron_3x3_entries")
    .where("season", "==", season)
    .where("weekNumber", "==", weekNumber)
    .get();

  const weeklySnapshotRef = adminDb.collection("gridiron_3x3_weekly_snapshots").doc(docId);
  const existingSnapshotSnap = await weeklySnapshotRef.get();

  let allEntries: GridironEntry[] = [];
  let isFromSnapshot = false;

  if (!entriesSnap.empty) {
    allEntries = entriesSnap.docs.map(d => d.data() as GridironEntry);
  } else if (existingSnapshotSnap.exists) {
    // Fallback to existing weekly snapshot if individual entries were already purged
    allEntries = (existingSnapshotSnap.data()?.entries as GridironEntry[]) || [];
    isFromSnapshot = true;
  }

  if (allEntries.length === 0) {
    if (options?.contestId) {
      await updateGridironLeaderboard(options.contestId);
    }
    return { success: true, gradedEntries: 0, message: "No entries found to grade." };
  }

  let gradedCount = 0;
  const affectedContestIds = new Set<string>();
  const updatedEntries: GridironEntry[] = [];

  let allGamesFinal = snapshotGames.length > 0;

  for (const entry of allEntries) {
    let entryUpdated = false;

    const updatedPicks = entry.picks.map((pick) => {
      let homeScore = 0;
      let awayScore = 0;
      let isFinal = false;

      // 1. Check liveGamesMap
      const liveInfo = liveGamesMap.get(pick.gameId);
      if (liveInfo && isGameStatusFinal(liveInfo.status)) {
        homeScore = liveInfo.homeScore;
        awayScore = liveInfo.awayScore;
        isFinal = true;
      }

      // 2. Check snapshotGames
      if (!isFinal) {
        const snapGame = snapshotGamesMap.get(pick.gameId);
        if (snapGame) {
          const snapStatus = snapGame.status;
          const snapHome = snapGame.homeTeam?.score;
          const snapAway = snapGame.awayTeam?.score;
          if (isGameStatusFinal(snapStatus) || (snapHome !== undefined && snapAway !== undefined && snapStatus !== 'STATUS_SCHEDULED' && snapStatus !== 'upcoming')) {
            homeScore = snapHome || 0;
            awayScore = snapAway || 0;
            isFinal = isGameStatusFinal(snapStatus) || (snapHome > 0 || snapAway > 0);
          }
        }
      }

      // 3. Check dbMatchupsMap
      if (!isFinal) {
        const dbInfo = dbMatchupsMap.get(pick.gameId);
        if (dbInfo && isGameStatusFinal(dbInfo.status)) {
          homeScore = dbInfo.homeScore;
          awayScore = dbInfo.awayScore;
          isFinal = true;
        }
      }

      if (!isFinal) {
        allGamesFinal = false;
        return pick;
      }

      const newStatus = evaluateGridironPick(pick, homeScore, awayScore);
      if (newStatus !== pick.status) {
        entryUpdated = true;
      }
      return { ...pick, status: newStatus };
    });

    if (entryUpdated) {
      gradedCount++;
    }

    const updatedEntry: GridironEntry = {
      ...entry,
      picks: updatedPicks,
      updatedAt: entryUpdated ? Date.now() : entry.updatedAt
    };

    updatedEntries.push(updatedEntry);

    // Save individual updated document if not yet purged
    if (entryUpdated && !isFromSnapshot) {
      const entryRef = adminDb.collection("gridiron_3x3_entries").doc(entry.entryId);
      await entryRef.update({
        picks: updatedPicks,
        updatedAt: Date.now()
      });
    }

    if (entry.contestId) {
      affectedContestIds.add(entry.contestId);
    }
  }

if (options?.contestId) {
  affectedContestIds.add(options.contestId);
}

// Update snapshot games in gridiron_3x3_lines if live scores or game statuses changed
let linesUpdated = false;
const updatedSnapshotGames = snapshotGames.map((g: any) => {
  const liveInfo = liveGamesMap.get(String(g.gameId)) || dbMatchupsMap.get(String(g.gameId));
  if (liveInfo) {
    const isFinal = isGameStatusFinal(liveInfo.status);
    const newStatus = isFinal ? "final" : (liveInfo.status.includes("IN_PROGRESS") ? "in_progress" : g.status);
    if (
      g.status !== newStatus ||
      g.homeTeam?.score !== liveInfo.homeScore ||
      g.awayTeam?.score !== liveInfo.awayScore
    ) {
      linesUpdated = true;
      return {
        ...g,
        status: newStatus,
        homeTeam: { ...g.homeTeam, score: liveInfo.homeScore },
        awayTeam: { ...g.awayTeam, score: liveInfo.awayScore }
      };
    }
  }
  return g;
});

if (linesUpdated) {
  try {
    await linesDocRef.update({ games: updatedSnapshotGames });
  } catch (e) {
    console.warn("[GridironGrader] Error updating snapshot lines scores:", e);
  }
}

// Query all contests matching this season/week to guarantee leaderboards refresh
try {
  const contestSnaps = await adminDb.collection("gridiron_3x3_contests")
    .where("season", "==", season)
    .where("weekNumber", "==", weekNumber)
    .get();
  contestSnaps.docs.forEach(doc => affectedContestIds.add(doc.id));
} catch (e) {
  console.warn("[GridironGrader] Error querying contests for season/week:", e);
}

  // 1. Write / update leaderboard entries for all affected contests
  for (const contestId of affectedContestIds) {
    await updateGridironLeaderboard(contestId);
  }

  // 2. Snapshot entire week into a single Firestore document to replace individual pick history
  const shouldPurge = options?.finalizeAndPurge || (allGamesFinal && snapshotGames.length > 0);
  const snapshotContestIds = Array.from(new Set(updatedEntries.map(e => e.contestId).filter(Boolean)));

  await weeklySnapshotRef.set({
    season,
    weekNumber,
    snapshotTimestamp: Date.now(),
    isFinalized: shouldPurge,
    contestIds: snapshotContestIds,
    entries: updatedEntries
  }, { merge: true });

  // 3. Purge individual pick documents in favor of the weekly snapshot document
  let purgedCount = 0;
  if (shouldPurge && !entriesSnap.empty) {
    const batch = adminDb.batch();
    for (const doc of entriesSnap.docs) {
      batch.delete(doc.ref);
      purgedCount++;
    }
    await batch.commit();
  }

  return {
    success: true,
    gradedEntries: gradedCount,
    updatedContests: affectedContestIds.size,
    snapshottedEntries: updatedEntries.length,
    purgedEntries: purgedCount,
    isFinalized: shouldPurge
  };
}

/**
 * Recalculates leaderboard for a contest by scanning both active individual entries
 * and consolidated weekly snapshots, then stores records in `gridiron_3x3_contests/{contestId}/leaderboard/{userId}`.
 */
export async function updateGridironLeaderboard(contestId: string) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const contestDoc = await adminDb.collection("gridiron_3x3_contests").doc(contestId).get();
  if (!contestDoc.exists) return;

  const contestData = contestDoc.data();
  const participantUids: string[] = contestData?.participants || [];

  // 1. Query active individual entries
  const activeEntriesSnap = await adminDb.collection("gridiron_3x3_entries")
    .where("contestId", "==", contestId)
    .get();

  const activeEntries: GridironEntry[] = activeEntriesSnap.docs.map(d => d.data() as GridironEntry);

  // 2. Query weekly snapshots filtered by contestId to avoid scanning all historical snapshots
  const snapshotEntries: GridironEntry[] = [];
  const activeEntryIds = new Set(activeEntries.map(e => e.entryId));

  try {
    const weeklySnapshotsSnap = await adminDb.collection("gridiron_3x3_weekly_snapshots")
      .where("contestIds", "array-contains", contestId)
      .get();

    if (!weeklySnapshotsSnap.empty) {
      weeklySnapshotsSnap.docs.forEach(doc => {
        const snapData = doc.data();
        const entriesList: GridironEntry[] = snapData?.entries || [];
        entriesList.forEach(e => {
          if (e.contestId === contestId && !activeEntryIds.has(e.entryId)) {
            snapshotEntries.push(e);
          }
        });
      });
    } else {
      // Fallback for snapshots missing contestIds array or created prior to contestIds indexing
      const allSnapshotsSnap = await adminDb.collection("gridiron_3x3_weekly_snapshots").get();
      allSnapshotsSnap.docs.forEach(doc => {
        const snapData = doc.data();
        const entriesList: GridironEntry[] = snapData?.entries || [];
        entriesList.forEach(e => {
          if (e.contestId === contestId && !activeEntryIds.has(e.entryId)) {
            snapshotEntries.push(e);
          }
        });
      });
    }
  } catch (e) {
    // Fallback on query error
    const allSnapshotsSnap = await adminDb.collection("gridiron_3x3_weekly_snapshots").get();
    allSnapshotsSnap.docs.forEach(doc => {
      const snapData = doc.data();
      const entriesList: GridironEntry[] = snapData?.entries || [];
      entriesList.forEach(e => {
        if (e.contestId === contestId && !activeEntryIds.has(e.entryId)) {
          snapshotEntries.push(e);
        }
      });
    });
  }

  const allContestEntries = [...activeEntries, ...snapshotEntries];

  const userStatsMap = new Map<string, GridironLeaderboardRecord>();

  // Fetch user display names
  const userDocs = participantUids.length > 0
    ? await adminDb.getAll(...participantUids.map(uid => adminDb.collection("users").doc(uid)))
    : [];

  const displayNameMap = new Map<string, string>();
  for (const uDoc of userDocs) {
    if (uDoc.exists) {
      const uData = uDoc.data();
      displayNameMap.set(uDoc.id, uData?.username || uData?.name || "Player");
    }
  }

  for (const uid of participantUids) {
    userStatsMap.set(uid, {
      userId: uid,
      displayName: displayNameMap.get(uid) || "Player",
      totalWins: 0,
      totalLosses: 0,
      totalPushes: 0,
      nflWins: 0,
      nflLosses: 0,
      nflPushes: 0,
      cfbWins: 0,
      cfbLosses: 0,
      cfbPushes: 0,
      winPercentage: 0
    });
  }

  for (const entry of allContestEntries) {
    const uid = entry.userId;
    if (!uid) continue;

    if (!userStatsMap.has(uid)) {
      userStatsMap.set(uid, {
        userId: uid,
        displayName: entry.displayName || displayNameMap.get(uid) || "Player",
        totalWins: 0,
        totalLosses: 0,
        totalPushes: 0,
        nflWins: 0,
        nflLosses: 0,
        nflPushes: 0,
        cfbWins: 0,
        cfbLosses: 0,
        cfbPushes: 0,
        winPercentage: 0
      });
    }

    const rec = userStatsMap.get(uid)!;
    if (entry.displayName && (rec.displayName === "Player" || !rec.displayName)) {
      rec.displayName = entry.displayName;
    }

    for (const p of entry.picks || []) {
      const lgUpper = p.league?.toUpperCase();
      const stLower = p.status?.toLowerCase();

      if (stLower === "won" || stLower === "win") {
        rec.totalWins++;
        if (lgUpper === "NFL") rec.nflWins++;
        if (lgUpper === "CFB") rec.cfbWins++;
      } else if (stLower === "lost" || stLower === "loss") {
        rec.totalLosses++;
        if (lgUpper === "NFL") rec.nflLosses++;
        if (lgUpper === "CFB") rec.cfbLosses++;
      } else if (stLower === "push" || stLower === "draw") {
        rec.totalPushes++;
        if (lgUpper === "NFL") rec.nflPushes++;
        if (lgUpper === "CFB") rec.cfbPushes++;
      }
    }
  }

  // 3. Fetch existing leaderboard records to skip unnecessary Firestore writes if stats haven't changed
  const existingLbSnap = await adminDb.collection("gridiron_3x3_contests").doc(contestId).collection("leaderboard").get();
  const existingLbMap = new Map<string, any>();
  existingLbSnap.docs.forEach(d => existingLbMap.set(d.id, d.data()));

  const batch = adminDb.batch();
  let hasWrites = false;

  for (const [uid, rec] of userStatsMap.entries()) {
    const decided = rec.totalWins + rec.totalLosses;
    rec.winPercentage = decided > 0 ? parseFloat(((rec.totalWins / decided) * 100).toFixed(1)) : 0;

    const existing = existingLbMap.get(uid);
    const isUnchanged = existing &&
      existing.displayName === rec.displayName &&
      existing.totalWins === rec.totalWins &&
      existing.totalLosses === rec.totalLosses &&
      existing.totalPushes === rec.totalPushes &&
      existing.nflWins === rec.nflWins &&
      existing.nflLosses === rec.nflLosses &&
      existing.nflPushes === rec.nflPushes &&
      existing.cfbWins === rec.cfbWins &&
      existing.cfbLosses === rec.cfbLosses &&
      existing.cfbPushes === rec.cfbPushes &&
      existing.winPercentage === rec.winPercentage;

    if (!isUnchanged) {
      const lbRef = adminDb.collection("gridiron_3x3_contests").doc(contestId).collection("leaderboard").doc(uid);
      batch.set(lbRef, rec, { merge: true });
      hasWrites = true;
    }
  }

  if (hasWrites) {
    await batch.commit();
  }
}
