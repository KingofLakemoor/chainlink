import { ESPN_TO_ODDS_API_SPORT, teamsMatch } from '../utils/sportMapping';
import { NormalizedOdds } from '../types/odds';

const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

const slateCache: Record<string, { timestamp: number; data: any[] }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10-minute cache window

export function clearOddsApiCache() {
  for (const key of Object.keys(slateCache)) {
    delete slateCache[key];
  }
}

async function getOddsApiSlate(oddsApiSportKey: string): Promise<any[]> {
  const apiKey = process.env.THE_ODDS_API_KEY || '';
  const now = Date.now();
  if (slateCache[oddsApiSportKey] && now - slateCache[oddsApiSportKey].timestamp < CACHE_TTL_MS) {
    return slateCache[oddsApiSportKey].data;
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

  const competition = espnGame.competitions?.[0];
  if (!competition) return null;

  const homeCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'home');
  const awayCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'away');

  const espnHomeName = homeCompetitor?.team?.displayName || homeCompetitor?.team?.name;
  const espnAwayName = awayCompetitor?.team?.displayName || awayCompetitor?.team?.name;
  const espnGameTime = new Date(competition.date || espnGame.date).getTime();

  if (!espnHomeName || !espnAwayName || isNaN(espnGameTime)) return null;

  try {
    const oddsApiSlate = await getOddsApiSlate(oddsApiSportKey);

    const matchedEvent = oddsApiSlate.find((event: any) => {
      const eventTime = new Date(event.commence_time).getTime();
      const timeDiffHours = Math.abs(eventTime - espnGameTime) / (1000 * 60 * 60);
      if (timeDiffHours > 18) return false;

      return teamsMatch(espnHomeName, event.home_team) && teamsMatch(espnAwayName, event.away_team);
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
      const homeOutcome = spreadMarket.outcomes.find((o: any) => o.name === matchedEvent.home_team);
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
      const homeH2h = h2hMarket.outcomes.find((o: any) => o.name === matchedEvent.home_team);
      const awayH2h = h2hMarket.outcomes.find((o: any) => o.name === matchedEvent.away_team);
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
