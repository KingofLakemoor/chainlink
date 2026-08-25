import { NormalizedOdds } from '../types/odds';

export function extractEspnOdds(competition: any): NormalizedOdds | null {
  const oddsArray = competition?.odds;
  if (!oddsArray || !oddsArray.length) return null;

  const oddsData = oddsArray[0];
  const details = oddsData.details?.trim(); // e.g., "KC -3.5", "EVEN", "PK"
  const overUnder = typeof oddsData.overUnder === 'number' ? oddsData.overUnder : null;

  if (!details && overUnder === null) return null;

  let spread: number | null = null;
  let favoriteTeamId: string | undefined;

  if (details === 'PK' || details === 'EVEN') {
    spread = 0;
  } else if (details) {
    const match = details.match(/^([A-Za-z]+)\s*([+-]?\d+\.?\d*)$/);
    if (match) {
      const [_, teamAbbr, spreadVal] = match;
      spread = parseFloat(spreadVal);

      const matchingCompetitor = competition.competitors?.find(
        (c: any) => c.team?.abbreviation?.toUpperCase() === teamAbbr.toUpperCase()
      );
      if (matchingCompetitor) {
        favoriteTeamId = matchingCompetitor.id;
      }
    }
  }

  const homeCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'home');
  const awayCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'away');

  return {
    spread: spread !== null ? spread : oddsData.spread ?? null,
    favoriteTeamId,
    overUnder,
    homeMoneyline: homeCompetitor?.odds?.moneyline ?? oddsData.homeTeamOdds?.moneyLine ?? null,
    awayMoneyline: awayCompetitor?.odds?.moneyline ?? oddsData.awayTeamOdds?.moneyLine ?? null,
    lineSummary: details || (oddsData.spread ? `${oddsData.spread}` : undefined),
    provider: 'espn',
  };
}
