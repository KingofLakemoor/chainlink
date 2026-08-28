import { extractEspnOdds } from './espnParser';
import { matchAndFetchOddsApiFallback } from './oddsApiFallback';
import { matchAndFetchSharpApiFallback } from './sharpApiFallback';
import { NormalizedOdds, StandardGame } from '../types/odds';

export async function resolveGameOdds(espnGame: any, sportKey: string): Promise<NormalizedOdds> {
  const competition = espnGame.competitions?.[0] || espnGame;

  // 1. Primary: Embedded ESPN Scoreboard Line (Free, Zero API Quota)
  const espnOdds = extractEspnOdds(competition);
  if (espnOdds && (espnOdds.spread !== null || espnOdds.homeMoneyline !== null)) {
    return espnOdds;
  }

  // 2. Secondary Fallback: The Odds API
  try {
    const oddsApiResult = await matchAndFetchOddsApiFallback(espnGame, sportKey);
    if (oddsApiResult && (oddsApiResult.spread !== null || oddsApiResult.homeMoneyline !== null)) {
      return oddsApiResult;
    }
  } catch (error) {
    console.warn(`[Odds Fallback] The Odds API failed for ${espnGame.name || espnGame.id}:`, error);
  }

  // 3. Tertiary Fallback: SharpAPI
  try {
    const sharpApiResult = await matchAndFetchSharpApiFallback(espnGame, sportKey);
    if (sharpApiResult && (sharpApiResult.spread !== null || sharpApiResult.homeMoneyline !== null)) {
      return sharpApiResult;
    }
  } catch (error) {
    console.warn(`[Odds Fallback] SharpAPI failed for ${espnGame.name || espnGame.id}:`, error);
  }

  // 4. Baseline if no bookmaker lines exist anywhere
  return {
    spread: null,
    overUnder: null,
    homeMoneyline: null,
    awayMoneyline: null,
    provider: 'none',
  };
}

function getEspnPath(sport: string): string {
  const lower = sport.toLowerCase();
  switch (lower) {
    case 'nfl': return 'football/nfl';
    case 'ncaaf': case 'cfb': return 'football/college-football';
    case 'nba': return 'basketball/nba';
    case 'ncaab': case 'mbb': return 'basketball/mens-college-basketball';
    case 'wnba': return 'basketball/wnba';
    case 'mlb': return 'baseball/mlb';
    case 'nhl': return 'hockey/nhl';
    case 'mls': return 'soccer/usa.1';
    case 'epl': return 'soccer/eng.1';
    case 'atp': return 'tennis/atp';
    case 'wta': return 'tennis/wta';
    default: return `${sport}/${sport}`;
  }
}

export async function syncActiveSlate(sport: string): Promise<StandardGame[]> {
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${getEspnPath(sport)}/scoreboard`;
  const response = await fetch(espnUrl);
  const data = await response.json();

  const games: StandardGame[] = [];

  for (const event of data.events || []) {
    const competitionsToProcess: any[] = [];

    // Tennis events embed individual match competitions inside groupings
    if (event.groupings && Array.isArray(event.groupings)) {
      for (const grouping of event.groupings) {
        if (sport.toLowerCase() === 'atp' && grouping.grouping?.slug !== 'mens-singles') continue;
        if (sport.toLowerCase() === 'wta' && grouping.grouping?.slug !== 'womens-singles') continue;
        if (grouping.competitions) {
          competitionsToProcess.push(...grouping.competitions);
        }
      }
    } else if (event.competitions) {
      competitionsToProcess.push(...event.competitions);
    }

    for (const comp of competitionsToProcess) {
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home') || comp?.competitors?.[0];
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away') || comp?.competitors?.[1];

      const homeName = home?.athlete?.displayName || home?.athlete?.shortName || home?.team?.displayName || home?.team?.name || 'Home';
      const awayName = away?.athlete?.displayName || away?.athlete?.shortName || away?.team?.displayName || away?.team?.name || 'Away';
      const homeAbbr = home?.athlete?.shortName || home?.team?.abbreviation || 'HM';
      const awayAbbr = away?.athlete?.shortName || away?.team?.abbreviation || 'AW';

      const odds = await resolveGameOdds(comp, sport);

      const state = comp.status?.type?.state || event.status?.type?.state;
      const status: 'pre' | 'in' | 'post' = state === 'in' ? 'in' : (state === 'post' ? 'post' : 'pre');

      const gameName = comp.name || (event.competitions?.length === 1 && event.name ? event.name : `${awayName} @ ${homeName}`);

      games.push({
        id: String(comp.id || event.id),
        sport,
        name: gameName,
        startTime: comp.date || event.date,
        status,
        homeTeam: {
          id: String(home?.id || ''),
          name: homeName,
          abbreviation: homeAbbr,
          score: parseInt(home?.score || '0', 10),
        },
        awayTeam: {
          id: String(away?.id || ''),
          name: awayName,
          abbreviation: awayAbbr,
          score: parseInt(away?.score || '0', 10),
        },
        odds,
      });
    }
  }

  return games;
}
