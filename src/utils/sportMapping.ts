export const ESPN_TO_ODDS_API_SPORT: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  ncaaf: 'americanfootball_ncaaf',
  nba: 'basketball_nba',
  ncaab: 'basketball_ncaab',
  mlb: 'baseball_mlb',
  nhl: 'icehockey_nhl',
  wnba: 'basketball_wnba',
  mls: 'soccer_usa_mls',
  epl: 'soccer_epl',
};

export const ESPN_TO_SHARP_API_LEAGUE: Record<string, string> = {
  nfl: 'nfl',
  ncaaf: 'ncaaf',
  nba: 'nba',
  ncaab: 'ncaab',
  mlb: 'mlb',
  nhl: 'nhl',
  wnba: 'wnba',
  mls: 'mls',
  epl: 'epl',
};

/**
 * Normalizes team names across providers by stripping punctuation,
 * common stop words, and city prefixes for fuzzy matching.
 */
export function cleanTeamName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[.'-]/g, '')
    .replace(/\b(la|ny|st|saint|ft|fort)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two team names are equivalent.
 */
export function teamsMatch(nameA: string, nameB: string): boolean {
  const cleanA = cleanTeamName(nameA);
  const cleanB = cleanTeamName(nameB);

  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;
  return cleanA.includes(cleanB) || cleanB.includes(cleanA);
}
