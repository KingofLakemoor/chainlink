import { extractEspnOdds } from './espnParser';
import { matchAndFetchOddsApiFallback } from './oddsApiFallback';
import { matchAndFetchSharpApiFallback } from './sharpApiFallback';
import { NormalizedOdds, StandardGame } from '../types/odds';

export async function resolveGameOdds(espnGame: any, sportKey: string): Promise<NormalizedOdds> {
  const competition = espnGame.competitions?.[0];

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
    default: return `${sport}/${sport}`;
  }
}

export async function syncActiveSlate(sport: string): Promise<StandardGame[]> {
  const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${getEspnPath(sport)}/scoreboard`;
  const response = await fetch(espnUrl);
  const data = await response.json();

  const games: StandardGame[] = [];

  for (const event of data.events || []) {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');

    // Run through the fallback chain
    const odds = await resolveGameOdds(event, sport);

    const state = event.status?.type?.state;
    const status: 'pre' | 'in' | 'post' = state === 'in' ? 'in' : (state === 'post' ? 'post' : 'pre');

    games.push({
      id: String(event.id),
      sport,
      name: event.name || `${away?.team?.displayName || 'Away'} @ ${home?.team?.displayName || 'Home'}`,
      startTime: event.date,
      status,
      homeTeam: {
        id: String(home?.id || ''),
        name: home?.team?.displayName || '',
        abbreviation: home?.team?.abbreviation || '',
        score: parseInt(home?.score || '0', 10),
      },
      awayTeam: {
        id: String(away?.id || ''),
        name: away?.team?.displayName || '',
        abbreviation: away?.team?.abbreviation || '',
        score: parseInt(away?.score || '0', 10),
      },
      odds,
    });
  }

  return games;
}
