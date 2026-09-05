import cron from 'node-cron';
import * as firebaseAdmin from '../lib/firebase-admin.js';
import { scrapeLeagueSchedules } from './espnScraper.js';
import { Gridiron3x3Game, Gridiron3x3LinesDocument } from '../types/gridiron.js';
import { getFootballWeekDateRange, getCurrentFootballWeek, getGridironLinesLockTime } from '../utils/footballWeek.js';

export { getFootballWeekDateRange, getCurrentFootballWeek, getGridironLinesLockTime };

let getAdminDb = () => firebaseAdmin.adminDb;

export function setAdminDbMock(mock: any) {
  getAdminDb = () => mock;
}

/**
 * Filters and normalizes games for the Gridiron 3x3 draft board.
 * Strict Filter Criteria: Exclude any game that does NOT return BOTH a valid spread AND a valid total.
 */
export function filterAndNormalizeGridironGames(rawMatchups: any[], league: "NFL" | "CFB"): Gridiron3x3Game[] {
  const validGames: Gridiron3x3Game[] = [];

  for (const m of rawMatchups) {
    if (!m || !m.gameId) continue;

    // Extract spread & over/under total
    let spreadVal: number | null = null;
    let totalLine: number | null = null;

    if (m.metadata?.spread !== undefined && m.metadata?.spread !== null) {
      const parsed = parseFloat(m.metadata.spread);
      if (!isNaN(parsed)) spreadVal = parsed;
    } else if (m.spread?.awaySpread !== undefined) {
      const parsed = parseFloat(m.spread.awaySpread);
      if (!isNaN(parsed)) spreadVal = parsed;
    }

    if (m.metadata?.overUnder !== undefined && m.metadata?.overUnder !== null) {
      const parsed = parseFloat(m.metadata.overUnder);
      if (!isNaN(parsed)) totalLine = parsed;
    } else if (m.total?.line !== undefined) {
      const parsed = parseFloat(m.total.line);
      if (!isNaN(parsed)) totalLine = parsed;
    }

    // STRICT FILTER CRITERIA:
    // Exclude any game that does NOT return BOTH a valid spread AND a valid total line.
    if (spreadVal === null || totalLine === null) {
      continue;
    }

    const homeSpread = spreadVal;
    const awaySpread = -spreadVal;

    const gameStatus: "scheduled" | "in_progress" | "final" =
      m.status === "STATUS_FINAL" ? "final" : (m.status === "STATUS_IN_PROGRESS" ? "in_progress" : "scheduled");

    validGames.push({
      gameId: String(m.gameId),
      league,
      awayTeam: {
        name: m.awayTeam?.name || "Away Team",
        abbreviation: m.awayTeam?.shortName || m.awayTeam?.abbreviation || (m.awayTeam?.name || "AWAY").slice(0, 3).toUpperCase(),
        logoUrl: m.awayTeam?.image || m.awayTeam?.logoUrl
      },
      homeTeam: {
        name: m.homeTeam?.name || "Home Team",
        abbreviation: m.homeTeam?.shortName || m.homeTeam?.abbreviation || (m.homeTeam?.name || "HOME").slice(0, 3).toUpperCase(),
        logoUrl: m.homeTeam?.image || m.homeTeam?.logoUrl
      },
      kickoffTime: m.startTime || Date.now(),
      status: gameStatus,
      spread: {
        awaySpread,
        homeSpread
      },
      total: {
        line: totalLine,
        over: -110,
        under: -110
      }
    });
  }

  return validGames;
}

/**
 * Main ingestion logic with exponential backoff retry and automated sanity alert logging.
 */
export async function fetchAndStoreTuesdayGridironLines(
  forcedSeason?: number,
  forcedWeek?: number
): Promise<{ success: boolean; season: number; weekNumber: number; count: number; error?: string }> {
  const adminDb = getAdminDb();
  if (!adminDb) {
    console.warn("[GridironIngestion] adminDb not initialized. Skipping ingestion.");
    return { success: false, season: 0, weekNumber: 0, count: 0, error: "adminDb not initialized" };
  }

  const { season, weekNumber } = (forcedSeason && forcedWeek) ? { season: forcedSeason, weekNumber: forcedWeek } : getCurrentFootballWeek();
  const weekRange = getFootballWeekDateRange(season, weekNumber);
  const docId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;

  let attempts = 0;
  const maxAttempts = 3;
  let delay = 1000;

  let nflRaw: any[] = [];
  let cfbRaw: any[] = [];

  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`[GridironIngestion] Pulling lines for ${docId} (${weekRange.formattedRange}) (Attempt ${attempts}/${maxAttempts})...`);

      const [nflRes, cfbRes] = await Promise.all([
        scrapeLeagueSchedules("NFL", true, undefined, weekRange.dateStrings),
        scrapeLeagueSchedules("CFB", true, undefined, weekRange.dateStrings)
      ]);

      nflRaw = nflRes?.data || [];
      cfbRaw = cfbRes?.data || [];

      if (nflRaw.length > 0 || cfbRaw.length > 0) {
        break; // Successfully pulled schedule data
      }
    } catch (e: any) {
      console.error(`[GridironIngestion] Attempt ${attempts} failed:`, e?.message || e);
    }

    if (attempts < maxAttempts) {
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; // Exponential backoff
    }
  }

  const getKickoffMs = (kickoffTime: any): number => {
    if (!kickoffTime) return 0;
    if (typeof kickoffTime === 'number') return kickoffTime;
    if (typeof kickoffTime?.toMillis === 'function') return kickoffTime.toMillis();
    if (typeof kickoffTime?.seconds === 'number') return kickoffTime.seconds * 1000;
    const parsed = new Date(kickoffTime).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const nflGames = filterAndNormalizeGridironGames(nflRaw, "NFL");
  const cfbGames = filterAndNormalizeGridironGames(cfbRaw, "CFB");
  const allGames = [...nflGames, ...cfbGames]
    .filter(g => {
      const ms = getKickoffMs(g.kickoffTime);
      return ms >= weekRange.startMs && ms <= weekRange.endMs;
    })
    .sort((a, b) => {
      const timeA = getKickoffMs(a.kickoffTime);
      const timeB = getKickoffMs(b.kickoffTime);
      if (timeA !== timeB) return timeA - timeB;
      return a.gameId.localeCompare(b.gameId);
    });

  // Sanity Alert Check
  if (nflGames.length < 10) {
    console.warn(`[GridironAlert] Sanity Warning: NFL slate contains ${nflGames.length} games with full spread & total lines (< 10 threshold).`);
  }
  if (cfbGames.length < 10) {
    console.warn(`[GridironAlert] Sanity Warning: CFB slate contains ${cfbGames.length} games with full spread & total lines (< 10 threshold).`);
  }

  const snapshotDoc: Gridiron3x3LinesDocument = {
    season,
    weekNumber,
    snapshotTimestamp: Date.now(),
    games: allGames
  };

  try {
    await adminDb.collection("gridiron_3x3_lines").doc(docId).set(snapshotDoc, { merge: true });
    console.log(`[GridironIngestion] Successfully stored snapshot lines for ${docId} (${allGames.length} valid games).`);
    return { success: true, season, weekNumber, count: allGames.length };
  } catch (err: any) {
    console.error(`[GridironIngestion] Failed to store snapshot lines in Firestore:`, err);
    return { success: false, season, weekNumber, count: allGames.length, error: err.message };
  }
}

/**
 * Registers the Tuesday 12:00 PM EST cron job (0 17 * * 2 UTC).
 */
export function startGridironIngestionJob() {
  // Tuesday at 12:00 PM EST (17:00 UTC)
  cron.schedule('0 17 * * 2', async () => {
    console.log('[GridironIngestion] Running Tuesday 12:00 PM EST Gridiron 3x3 lines snapshot job...');
    await fetchAndStoreTuesdayGridironLines();
  });
}
