import * as firebaseAdmin from '../lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './espnScraper.js';
import { GridironEntry, GridironPick, GridironLeaderboardRecord } from '../types/gridiron.js';

let getAdminDb = () => firebaseAdmin.adminDb;

export function setAdminDbMock(mock: any) {
  getAdminDb = () => mock;
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
export async function gradeGridironWeek(season: number, weekNumber: number) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    console.warn("[GridironGrader] adminDb not initialized.");
    return { success: false, error: "adminDb not initialized" };
  }

  const docId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;
  const linesDocRef = adminDb.collection("gridiron_3x3_lines").doc(docId);
  const linesSnap = await linesDocRef.get();

  if (!linesSnap.exists) {
    return { success: false, error: `Lines snapshot not found for ${docId}` };
  }

  const snapshotData = linesSnap.data();
  const snapshotGames: any[] = snapshotData?.games || [];

  // Scrape live game scores
  const [nflRes, cfbRes] = await Promise.all([
    scrapeLeagueSchedules("NFL", true),
    scrapeLeagueSchedules("CFB", true)
  ]);

  const liveGamesMap = new Map<string, { homeScore: number; awayScore: number; status: string }>();

  for (const g of [...(nflRes?.data || []), ...(cfbRes?.data || [])]) {
    if (g.gameId) {
      liveGamesMap.set(String(g.gameId), {
        homeScore: g.homeTeam?.score || 0,
        awayScore: g.awayTeam?.score || 0,
        status: g.status || "STATUS_SCHEDULED"
      });
    }
  }

  // Fetch all entries for this season & week
  const entriesSnap = await adminDb.collection("gridiron_3x3_entries")
    .where("season", "==", season)
    .where("weekNumber", "==", weekNumber)
    .get();

  if (entriesSnap.empty) {
    return { success: true, gradedEntries: 0, message: "No entries to grade." };
  }

  let gradedCount = 0;
  const affectedContestIds = new Set<string>();

  for (const entryDoc of entriesSnap.docs) {
    const entry = entryDoc.data() as GridironEntry;
    let entryUpdated = false;

    const updatedPicks = entry.picks.map((pick) => {
      const gameInfo = liveGamesMap.get(pick.gameId);
      if (!gameInfo || gameInfo.status !== "STATUS_FINAL") {
        return pick;
      }

      const newStatus = evaluateGridironPick(pick, gameInfo.homeScore, gameInfo.awayScore);
      if (newStatus !== pick.status) {
        entryUpdated = true;
      }
      return { ...pick, status: newStatus };
    });

    if (entryUpdated) {
      await entryDoc.ref.update({
        picks: updatedPicks,
        updatedAt: Date.now()
      });
      gradedCount++;
    }

    if (entry.contestId) {
      affectedContestIds.add(entry.contestId);
    }
  }

  // Recalculate leaderboards for affected contests
  for (const contestId of affectedContestIds) {
    await updateGridironLeaderboard(contestId);
  }

  return { success: true, gradedEntries: gradedCount, updatedContests: affectedContestIds.size };
}

/**
 * Recalculates leaderboard for a contest and stores records in `gridiron_3x3_contests/{contestId}/leaderboard/{userId}`.
 */
export async function updateGridironLeaderboard(contestId: string) {
  const adminDb = getAdminDb();
  if (!adminDb) return;

  const contestDoc = await adminDb.collection("gridiron_3x3_contests").doc(contestId).get();
  if (!contestDoc.exists) return;

  const contestData = contestDoc.data();
  const participantUids: string[] = contestData?.participants || [];

  // Fetch all entries for this contest
  const entriesSnap = await adminDb.collection("gridiron_3x3_entries")
    .where("contestId", "==", contestId)
    .get();

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

  for (const entryDoc of entriesSnap.docs) {
    const entry = entryDoc.data() as GridironEntry;
    const uid = entry.userId;
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

    for (const p of entry.picks || []) {
      if (p.status === "won") {
        rec.totalWins++;
        if (p.league === "NFL") rec.nflWins++;
        if (p.league === "CFB") rec.cfbWins++;
      } else if (p.status === "lost") {
        rec.totalLosses++;
        if (p.league === "NFL") rec.nflLosses++;
        if (p.league === "CFB") rec.cfbLosses++;
      } else if (p.status === "push") {
        rec.totalPushes++;
        if (p.league === "NFL") rec.nflPushes++;
        if (p.league === "CFB") rec.cfbPushes++;
      }
    }
  }

  // Calculate win percentages & store in Firestore
  const batch = adminDb.batch();

  for (const [uid, rec] of userStatsMap.entries()) {
    const decided = rec.totalWins + rec.totalLosses;
    rec.winPercentage = decided > 0 ? parseFloat(((rec.totalWins / decided) * 100).toFixed(1)) : 0;

    const lbRef = adminDb.collection("gridiron_3x3_contests").doc(contestId).collection("leaderboard").doc(uid);
    batch.set(lbRef, rec, { merge: true });
  }

  await batch.commit();
}
