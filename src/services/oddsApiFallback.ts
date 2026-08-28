import { ESPN_TO_ODDS_API_SPORT, teamsMatch } from '../utils/sportMapping';
import { NormalizedOdds } from '../types/odds';

const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

const slateCache: Record<string, { timestamp: number; data: any[] }> = {};
const activeSportsCache: { timestamp: number; data: any[] } = { timestamp: 0, data: [] };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10-minute cache window

export function clearOddsApiCache() {
  for (const key of Object.keys(slateCache)) {
    delete slateCache[key];
  }
  activeSportsCache.timestamp = 0;
  activeSportsCache.data = [];
}

async function getActiveSports(apiKey: string): Promise<any[]> {
  const now = Date.now();
  if (activeSportsCache.data.length > 0 && now - activeSportsCache.timestamp < CACHE_TTL_MS) {
    return activeSportsCache.data;
  }

  try {
    const res = await fetch(`${BASE_URL}/?apiKey=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) {
      activeSportsCache.timestamp = now;
      activeSportsCache.data = data;
      return data;
    }
  } catch (err) {
    console.warn('[The-Odds-API] Failed to fetch active sports list:', err);
  }
  return [];
}

async function getOddsApiSlate(oddsApiSportKey: string): Promise<any[]> {
  const apiKey = process.env.THE_ODDS_API_KEY || '';
  const now = Date.now();
  if (slateCache[oddsApiSportKey] && now - slateCache[oddsApiSportKey].timestamp < CACHE_TTL_MS) {
    return slateCache[oddsApiSportKey].data;
  }

  // Handle tennis sports that are fragmented by tournament in The-Odds-API (e.g. tennis_atp_wimbledon, tennis_atp_us_open)
  if (oddsApiSportKey === 'tennis_atp' || oddsApiSportKey === 'tennis_wta') {
    const activeSports = await getActiveSports(apiKey);
    const tournamentKeys = activeSports
      .filter((s: any) => s.key && (s.key === oddsApiSportKey || s.key.startsWith(`${oddsApiSportKey}_`)) && s.active !== false)
      .map((s: any) => s.key);

    if (tournamentKeys.length > 0) {
      const allEvents: any[] = [];
      const fetchPromises = tournamentKeys.map(async (key: string) => {
        try {
          const url = `${BASE_URL}/${key}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
          const res = await fetch(url);
          if (res.ok) {
            const events = await res.json();
            if (Array.isArray(events)) {
              allEvents.push(...events);
            }
          }
        } catch (err) {
          console.warn(`[The-Odds-API] Failed fetching tennis tournament ${key}:`, err);
        }
      });

      await Promise.all(fetchPromises);
      slateCache[oddsApiSportKey] = { timestamp: now, data: allEvents };
      return allEvents;
    }
  }

  const url = `${BASE_URL}/${oddsApiSportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`The Odds API HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  slateCache[oddsApiSportKey] = { timestamp: now, data };
  return data;
}

export async function matchAndFetchOddsApiFallback(
  espnGame: any,
  espnSportKey: string
): Promise<NormalizedOdds | null> {
  const oddsApiSportKey = ESPN_TO_ODDS_API_SPORT[espnSportKey.toLowerCase()];
  const apiKey = process.env.THE_ODDS_API_KEY || '';
  if (!oddsApiSportKey || !apiKey) return null;

  const competition = espnGame.competitions?.[0] || espnGame;
  if (!competition) return null;

  const homeCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'home') || competition.competitors?.[0];
  const awayCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'away') || competition.competitors?.[1];

  const espnHomeName = homeCompetitor?.athlete?.displayName || homeCompetitor?.athlete?.fullName || homeCompetitor?.team?.displayName || homeCompetitor?.team?.name;
  const espnAwayName = awayCompetitor?.athlete?.displayName || awayCompetitor?.athlete?.fullName || awayCompetitor?.team?.displayName || awayCompetitor?.team?.name;
  const espnGameTime = new Date(competition.date || espnGame.date).getTime();

  if (!espnHomeName || !espnAwayName || isNaN(espnGameTime)) return null;

  const isTennis = ['atp', 'wta', 'tennis'].includes(espnSportKey.toLowerCase()) || oddsApiSportKey.startsWith('tennis_');

  try {
    const oddsApiSlate = await getOddsApiSlate(oddsApiSportKey);

    const matchedEvent = oddsApiSlate.find((event: any) => {
      const eventTime = new Date(event.commence_time).getTime();
      const timeDiffHours = Math.abs(eventTime - espnGameTime) / (1000 * 60 * 60);
      if (timeDiffHours > 18) return false;

      return teamsMatch(espnHomeName, event.home_team, isTennis) && teamsMatch(espnAwayName, event.away_team, isTennis);
    });

    if (!matchedEvent || !matchedEvent.bookmakers?.length) return null;

    const preferredBooks = ['draftkings', 'fanduel', 'betmgm', 'bovada'];
    const bookmaker = matchedEvent.bookmakers.find((b: any) => preferredBooks.includes(b.key)) || matchedEvent.bookmakers[0];

    let spread: number | null = null;
    let favoriteTeamId: string | undefined;
    let overUnder: number | null = null;
    let homeMoneyline: number | null = null;
    let awayMoneyline: number | null = null;

    const spreadMarket = bookmaker.markets?.find((m: any) => m.key === 'spreads');
    if (spreadMarket?.outcomes) {
      const homeOutcome = spreadMarket.outcomes.find((o: any) => teamsMatch(espnHomeName, o.name, isTennis));
      if (homeOutcome?.point !== undefined) {
        spread = homeOutcome.point;
        favoriteTeamId = homeOutcome.point < 0 ? homeCompetitor?.id : awayCompetitor?.id;
      }
    }

    const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals');
    if (totalsMarket?.outcomes?.[0]?.point !== undefined) {
      overUnder = totalsMarket.outcomes[0].point;
    }

    const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');
    if (h2hMarket?.outcomes) {
      const homeH2h = h2hMarket.outcomes.find((o: any) => teamsMatch(espnHomeName, o.name, isTennis));
      const awayH2h = h2hMarket.outcomes.find((o: any) => teamsMatch(espnAwayName, o.name, isTennis));
      if (homeH2h?.price !== undefined) homeMoneyline = homeH2h.price;
      if (awayH2h?.price !== undefined) awayMoneyline = awayH2h.price;
    }

    return {
      spread,
      favoriteTeamId,
      overUnder,
      homeMoneyline,
      awayMoneyline,
      provider: 'the-odds-api',
      lineSummary: spread !== null ? `${spread > 0 ? '+' : ''}${spread}` : undefined,
    };
  } catch (err) {
    console.error('Failed to resolve odds from The Odds API fallback:', err);
    return null;
  }
}
