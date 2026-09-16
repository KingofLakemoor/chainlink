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

export async function getSharpApiSlate(leagueSlug: string): Promise<any[]> {
  const apiKey = (process.env.SHARP_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('SHARP_API_KEY is missing or unconfigured.');
  }

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

export function parseSharpApiLines(item: any, espnHomeName?: string, isTennis: boolean = true) {
  const markets = item.markets || [];
  let spread: number | null = null;
  let overUnder: number | null = null;
  let homeMl: number | null = null;
  let awayMl: number | null = null;

  const mlMarket = markets.find((m: any) =>
    (m.market_type === 'moneyline' || m.market_type === 'h2h' || m.market === 'moneyline' || m.market === 'h2h') &&
    !isSetSpecificMarket(m)
  );
  if (mlMarket?.lines?.length) {
    const homeMlObj = mlMarket.lines.find((l: any) => l.is_home || (espnHomeName && teamsMatch(l.team_name, espnHomeName, isTennis)));
    const awayMlObj = mlMarket.lines.find((l: any) => !l.is_home || (espnHomeName && !teamsMatch(l.team_name, espnHomeName, isTennis)));
    if (homeMlObj?.odds !== undefined) homeMl = parseInt(homeMlObj.odds, 10);
    if (awayMlObj?.odds !== undefined) awayMl = parseInt(awayMlObj.odds, 10);
  }

  const spreadMarket = markets.find((m: any) => (m.market_type === 'spread' || m.market === 'spread') && !isSetSpecificMarket(m));
  if (spreadMarket?.lines?.length) {
    const homeLine = spreadMarket.lines.find((l: any) => l.is_home || (espnHomeName && teamsMatch(l.team_name, espnHomeName, isTennis)));
    if (homeLine?.spread !== undefined) spread = parseFloat(homeLine.spread);
  }

  const totalsMarket = markets.find((m: any) => (m.market_type === 'total' || m.market === 'totals') && !isSetSpecificMarket(m));
  if (totalsMarket?.lines?.length) {
    const totalLine = totalsMarket.lines[0];
    if (totalLine?.total !== undefined) overUnder = parseFloat(totalLine.total);
  }

  return { homeMl, awayMl, spread, overUnder };
}

export async function getSharpApiTennisComparison(adminDb: any) {
  const apiKey = (process.env.SHARP_API_KEY || '').trim();
  if (!apiKey) {
    return {
      success: false,
      error: 'SHARP_API_KEY is missing or unconfigured.',
    };
  }

  let atpEvents: any[] = [];
  let wtaEvents: any[] = [];
  let atpError: string | null = null;
  let wtaError: string | null = null;

  try {
    atpEvents = await getSharpApiSlate('atp');
  } catch (err: any) {
    atpError = err.message || 'Failed to fetch ATP events from SharpAPI';
  }

  try {
    wtaEvents = await getSharpApiSlate('wta');
  } catch (err: any) {
    wtaError = err.message || 'Failed to fetch WTA events from SharpAPI';
  }

  let dbMatchups: any[] = [];
  if (adminDb) {
    try {
      const snap = await adminDb.collection('matchups')
        .where('status', '==', 'STATUS_SCHEDULED')
        .where('league', 'in', ['ATP', 'WTA'])
        .get();
      dbMatchups = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (e: any) {
      console.warn('[SharpAPI Comparison] Failed to fetch DB matchups:', e);
    }
  }

  const allSharpEvents = [
    ...atpEvents.map((e: any) => ({ ...e, _league: 'ATP' })),
    ...wtaEvents.map((e: any) => ({ ...e, _league: 'WTA' })),
  ];

  const matched: any[] = [];
  const sharpOnly: any[] = [];
  const matchedDbIds = new Set<string>();

  for (const item of allSharpEvents) {
    const homeName = item.home_team?.name || item.home_team || '';
    const awayName = item.away_team?.name || item.away_team || '';
    const lines = parseSharpApiLines(item, undefined, true);

    let isSwapped = false;
    const dbMatch = dbMatchups.find((m: any) => {
      if (matchedDbIds.has(m.id)) return false;
      const espnHome = m.homeTeam?.name || m.homeTeam?.displayName || '';
      const espnAway = m.awayTeam?.name || m.awayTeam?.displayName || '';
      if (!espnHome || !espnAway) return false;

      if (teamsMatch(espnHome, homeName, true) && teamsMatch(espnAway, awayName, true)) {
        isSwapped = false;
        return true;
      }
      if (teamsMatch(espnHome, awayName, true) && teamsMatch(espnAway, homeName, true)) {
        isSwapped = true;
        return true;
      }
      return false;
    });

    if (dbMatch) {
      matchedDbIds.add(dbMatch.id);
      matched.push({
        sharpApiId: item.id || item.event_id || `${homeName} vs ${awayName}`,
        dbId: dbMatch.id,
        league: item._league,
        sharpApiHome: homeName,
        sharpApiAway: awayName,
        sharpApiHomeMl: isSwapped ? lines.awayMl : lines.homeMl,
        sharpApiAwayMl: isSwapped ? lines.homeMl : lines.awayMl,
        sharpApiSpread: lines.spread,
        sharpApiTotal: lines.overUnder,
        dbHome: dbMatch.homeTeam?.name || dbMatch.homeTeam?.displayName || '',
        dbAway: dbMatch.awayTeam?.name || dbMatch.awayTeam?.displayName || '',
        dbHomeMl: dbMatch.metadata?.mlHome ?? null,
        dbAwayMl: dbMatch.metadata?.mlAway ?? null,
        dbActive: dbMatch.active ?? false,
        dbAbandoned: dbMatch.abandoned ?? false,
        isSwapped,
        startTime: item.start_time || item.commence_time || item.date || dbMatch.startTime,
      });
    } else {
      sharpOnly.push({
        sharpApiId: item.id || item.event_id || `${homeName} vs ${awayName}`,
        league: item._league,
        sharpApiHome: homeName,
        sharpApiAway: awayName,
        sharpApiHomeMl: lines.homeMl,
        sharpApiAwayMl: lines.awayMl,
        sharpApiSpread: lines.spread,
        sharpApiTotal: lines.overUnder,
        startTime: item.start_time || item.commence_time || item.date,
      });
    }
  }

  const dbOnly = dbMatchups
    .filter((m: any) => !matchedDbIds.has(m.id))
    .map((m: any) => ({
      dbId: m.id,
      league: m.league,
      dbHome: m.homeTeam?.name || m.homeTeam?.displayName || '',
      dbAway: m.awayTeam?.name || m.awayTeam?.displayName || '',
      dbHomeMl: m.metadata?.mlHome ?? null,
      dbAwayMl: m.metadata?.mlAway ?? null,
      dbActive: m.active ?? false,
      dbAbandoned: m.abandoned ?? false,
      startTime: m.startTime || m.date,
    }));

  return {
    success: true,
    errors: {
      atp: atpError,
      wta: wtaError,
    },
    summary: {
      totalSharpApiEvents: allSharpEvents.length,
      atpSharpApiEvents: atpEvents.length,
      wtaSharpApiEvents: wtaEvents.length,
      totalDbMatchups: dbMatchups.length,
      matchedCount: matched.length,
      sharpOnlyCount: sharpOnly.length,
      dbOnlyCount: dbOnly.length,
    },
    matched,
    sharpOnly,
    dbOnly,
    rawPayloads: {
      atp: atpEvents,
      wta: wtaEvents,
    },
  };
}

function isSetSpecificMarket(m: any): boolean {
  const name = (m.market_name || m.name || m.market_type || m.market || '').toLowerCase();
  const period = String(m.period || '').toLowerCase();
  return name.includes('set') || name.includes('period') || period.includes('1') || period.includes('2') || period.includes('set');
}

export async function matchAndFetchSharpApiFallback(
  espnGame: any,
  espnSportKey: string
): Promise<NormalizedOdds | null> {
  const leagueSlug = ESPN_TO_SHARP_API_LEAGUE[espnSportKey.toLowerCase()];
  const apiKey = (process.env.SHARP_API_KEY || '').trim();
  if (!leagueSlug || !apiKey) return null;

  const competition = espnGame.competitions?.[0] || espnGame;
  if (!competition) return null;

  const homeCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'home') || competition.competitors?.[0];
  const awayCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'away') || competition.competitors?.[1];

  const espnHomeName = homeCompetitor?.athlete?.displayName || homeCompetitor?.athlete?.fullName || homeCompetitor?.team?.displayName || homeCompetitor?.team?.name;
  const espnAwayName = awayCompetitor?.athlete?.displayName || awayCompetitor?.athlete?.fullName || awayCompetitor?.team?.displayName || awayCompetitor?.team?.name;
  const espnGameTime = new Date(competition.date || espnGame.date).getTime();

  if (!espnHomeName || !espnAwayName || isNaN(espnGameTime)) return null;

  const isTennis = ['atp', 'wta', 'tennis'].includes(espnSportKey.toLowerCase()) || ['atp', 'wta'].includes(leagueSlug.toLowerCase());

  try {
    const sharpEvents = await getSharpApiSlate(leagueSlug);

    let isSwapped = false;

    const matchedEvent = sharpEvents.find((item: any) => {
      const eventTime = new Date(item.start_time || item.commence_time || item.date).getTime();
      const timeDiffHours = Math.abs(eventTime - espnGameTime) / (1000 * 60 * 60);
      if (timeDiffHours > 18) return false;

      const homeName = item.home_team?.name || item.home_team || '';
      const awayName = item.away_team?.name || item.away_team || '';

      if (teamsMatch(espnHomeName, homeName, isTennis) && teamsMatch(espnAwayName, awayName, isTennis)) {
        isSwapped = false;
        return true;
      }
      if (teamsMatch(espnHomeName, awayName, isTennis) && teamsMatch(espnAwayName, homeName, isTennis)) {
        isSwapped = true;
        return true;
      }
      return false;
    });

    if (!matchedEvent) return null;

    let spread: number | null = null;
    let favoriteTeamId: string | undefined;
    let overUnder: number | null = null;
    let homeMoneyline: number | null = null;
    let awayMoneyline: number | null = null;

    const markets = matchedEvent.markets || [];

    const spreadMarket = markets.find((m: any) => (m.market_type === 'spread' || m.market === 'spread') && !isSetSpecificMarket(m));
    if (spreadMarket?.lines?.length) {
      const homeLine = spreadMarket.lines.find((l: any) =>
        teamsMatch(l.team_name, espnHomeName, isTennis) || (!isSwapped && l.is_home) || (isSwapped && !l.is_home)
      );
      if (homeLine?.spread !== undefined) {
        spread = parseFloat(homeLine.spread);
        favoriteTeamId = spread < 0 ? homeCompetitor?.id : (spread > 0 ? awayCompetitor?.id : undefined);
      }
    }

    const totalsMarket = markets.find((m: any) => (m.market_type === 'total' || m.market === 'totals') && !isSetSpecificMarket(m));
    if (totalsMarket?.lines?.length) {
      const totalLine = totalsMarket.lines[0];
      if (totalLine?.total !== undefined) overUnder = parseFloat(totalLine.total);
    }

    const mlMarket = markets.find((m: any) => (m.market_type === 'moneyline' || m.market_type === 'h2h' || m.market === 'moneyline' || m.market === 'h2h') && !isSetSpecificMarket(m));
    if (mlMarket?.lines?.length) {
      const homeMlObj = mlMarket.lines.find((l: any) =>
        teamsMatch(l.team_name, espnHomeName, isTennis) || (!isSwapped && l.is_home) || (isSwapped && !l.is_home)
      );
      const awayMlObj = mlMarket.lines.find((l: any) =>
        teamsMatch(l.team_name, espnAwayName, isTennis) || (!isSwapped && !l.is_home) || (isSwapped && l.is_home)
      );
      if (homeMlObj?.odds !== undefined) homeMoneyline = parseInt(homeMlObj.odds, 10);
      if (awayMlObj?.odds !== undefined) awayMoneyline = parseInt(awayMlObj.odds, 10);
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
