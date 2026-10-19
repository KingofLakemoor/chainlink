import { adminDb } from '../lib/firebase-admin.js';
import { SUPPORTED_LEAGUES } from './espnScraper.js';

export const ALL_SYSTEM_LEAGUES = [...SUPPORTED_LEAGUES, 'PROP'] as const;

export interface ActiveLeaguesResult {
  activeLeagues: string[];
  leagueSettingsMap: Map<string, any>;
}

/**
 * Retrieves all active leagues.
 * A league is active UNLESS explicitly set to active: false in leagueSettings.
 * If a league is not in leagueSettings yet, it defaults to active: true (matching frontend UI).
 */
export async function getActiveLeagues(): Promise<ActiveLeaguesResult> {
  const leagueSettingsMap = new Map<string, any>();
  const activeLeagues: string[] = [];

  if (!adminDb) {
    return {
      activeLeagues: Array.from(ALL_SYSTEM_LEAGUES),
      leagueSettingsMap
    };
  }

  try {
    const snap = await adminDb.collection('leagueSettings').get();
    snap.docs.forEach(doc => {
      leagueSettingsMap.set(doc.id, doc.data());
    });
  } catch (err) {
    console.error('[leagueService] Failed to load leagueSettings from Firestore:', err);
  }

  for (const league of ALL_SYSTEM_LEAGUES) {
    const setting = leagueSettingsMap.get(league);
    if (!setting || setting.active !== false) {
      activeLeagues.push(league);
    }
  }

  return { activeLeagues, leagueSettingsMap };
}
