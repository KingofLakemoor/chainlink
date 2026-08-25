import { ESPN_TO_SHARP_API_LEAGUE, teamsMatch } from '../utils/sportMapping';
import { NormalizedOdds } from '../types/odds';

const SHARP_BASE_URL = 'https://api.sharpapi.io/api/v1';

const sharpSlateCache: Record<string, { timestamp: number; data: any[] }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000;

export function clearSharpApiCache() {
  for (const key of Object.keys(sharpSlateCache)) {
    delete sharpSlateCache[key];
  }
}

async function getSharpApiSlate(leagueSlug: string): Promise<any[]> {
  const apiKey = process.env.SHARP_API_KEY || '';
  const now = Date.now();
  if (sharpSlateCache[leagueSlug] && now - sharpSlateCache[leagueSlug].timestamp < CACHE_TTL_MS) {
    return sharpSlateCache[leagueSlug].data;
  }

  const res = await fetch(`${SHARP_BASE_URL}/odds?league=${leagueSlug}`, {
    headers: { 'X-API-Key': apiKey },
  });

  if (!res.ok) {
    throw new Error(`SharpAPI HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const events = json.data || json || [];
  sharpSlateCache[leagueSlug] = { timestamp: now, data: events };
  return events;
}

export async function matchAndFetchSharpApiFallback(
  espnGame: any,
  espnSportKey: string
): Promise<NormalizedOdds | null> {
  const leagueSlug = ESPN_TO_SHARP_API_LEAGUE[espnSportKey.toLowerCase()];
  const apiKey = process.env.SHARP_API_KEY || '';
  if (!leagueSlug || !apiKey) return null;

  const competition = espnGame.competitions?.[0];
  if (!competition) return null;

  const homeCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'home');
  const awayCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'away');

  const espnHomeName = homeCompetitor?.team?.displayName || homeCompetitor?.team?.name;
  const espnAwayName = awayCompetitor?.team?.displayName || awayCompetitor?.team?.name;
  const espnGameTime = new Date(competition.date || espnGame.date).getTime();

  if (!espnHomeName || !espnAwayName || isNaN(espnGameTime)) return null;

  try {
    const sharpEvents = await getSharpApiSlate(leagueSlug);

    const matchedEvent = sharpEvents.find((item: any) => {
      const eventTime = new Date(item.start_time || item.commence_time || item.date).getTime();
      const timeDiffHours = Math.abs(eventTime - espnGameTime) / (1000 * 60 * 60);
      if (timeDiffHours > 18) return false;

      const homeName = item.home_team?.name || item.home_team || '';
      const awayName = item.away_team?.name || item.away_team || '';
      return teamsMatch(espnHomeName, homeName) && teamsMatch(espnAwayName, awayName);
    });

    if (!matchedEvent) return null;

    let spread: number | null = null;
    let favoriteTeamId: string | undefined;
    let overUnder: number | null = null;
    let homeMoneyline: number | null = null;
    let awayMoneyline: number | null = null;

    const markets = matchedEvent.markets || [];
    const spreadMarket = markets.find((m: any) => m.market_type === 'spread' || m.market === 'spread');
    if (spreadMarket?.lines?.length) {
      const homeLine = spreadMarket.lines.find((l: any) => l.is_home || teamsMatch(l.team_name, matchedEvent.home_team?.name || matchedEvent.home_team));
      if (homeLine?.spread !== undefined) {
        spread = parseFloat(homeLine.spread);
        favoriteTeamId = spread < 0 ? homeCompetitor?.id : awayCompetitor?.id;
      }
    }

    const totalsMarket = markets.find((m: any) => m.market_type === 'total' || m.market === 'totals');
    if (totalsMarket?.lines?.length) {
      const totalLine = totalsMarket.lines[0];
      if (totalLine?.total !== undefined) overUnder = parseFloat(totalLine.total);
    }

    const mlMarket = markets.find((m: any) => m.market_type === 'moneyline' || m.market === 'h2h');
    if (mlMarket?.lines?.length) {
      const homeMl = mlMarket.lines.find((l: any) => l.is_home || teamsMatch(l.team_name, matchedEvent.home_team?.name || matchedEvent.home_team));
      const awayMl = mlMarket.lines.find((l: any) => !l.is_home || teamsMatch(l.team_name, matchedEvent.away_team?.name || matchedEvent.away_team));
      if (homeMl?.odds !== undefined) homeMoneyline = parseInt(homeMl.odds, 10);
      if (awayMl?.odds !== undefined) awayMoneyline = parseInt(awayMl.odds, 10);
    }

    return {
      spread,
      favoriteTeamId,
      overUnder,
      homeMoneyline,
      awayMoneyline,
      provider: 'sharp-api',
      lineSummary: spread !== null ? `${spread > 0 ? '+' : ''}${spread}` : undefined,
    };
  } catch (err) {
    console.error('Failed to resolve odds from SharpAPI fallback:', err);
    return null;
  }
}
