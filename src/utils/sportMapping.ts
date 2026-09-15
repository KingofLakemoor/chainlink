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
  fra: 'soccer_france_ligue_one',
  rpl: 'soccer_russia_premier_league',
  tur: 'soccer_turkey_super_league',
  arg: 'soccer_argentina_primera_division',
  bra: 'soccer_brazil_campeonato',
  lmx: 'soccer_mexico_ligamx',
  nwsl: 'soccer_usa_nwsl',
  atp: 'tennis_atp',
  wta: 'tennis_wta',
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
  fra: 'fra',
  rpl: 'rpl',
  tur: 'tur',
  arg: 'arg',
  bra: 'bra',
  lmx: 'lmx',
  nwsl: 'nwsl',
  atp: 'atp',
  wta: 'wta',
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

export interface ParsedPlayerName {
  firstName: string;
  lastName: string;
  initial: string | null;
}

/**
 * Strips diacritics and special characters to normalize player names.
 */
export function stripAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/Đ/g, 'Dj')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'O')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss');
}

/**
 * Parses a tennis player's name into components (firstName, lastName, initial).
 * Handles formats like "J. Sinner", "Jannik Sinner", "Sinner, Jannik", "Sinner J.", and "Carlos Alcaraz Garfia".
 */
export function parsePlayerName(name: string): ParsedPlayerName {
  if (!name) return { firstName: '', lastName: '', initial: null };
  const normalized = stripAccents(name);
  const cleaned = normalized.trim().replace(/\s+/g, ' ');

  // 1. Check comma format e.g. "Sinner, Jannik" or "Sinner, J."
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(' ').trim();
    const initial = firstName.length > 0 ? firstName[0].toLowerCase() : null;
    return { firstName, lastName, initial };
  }

  // 2. Check initial prefix format e.g. "J. Sinner" or "J.-P. Smith" or "A. de Minaur"
  const initialPrefixMatch = cleaned.match(/^(([a-z]\.)+)\s+(.+)$/i);
  if (initialPrefixMatch) {
    const initialsStr = initialPrefixMatch[1].replace(/\./g, '').trim();
    const lastName = initialPrefixMatch[3].trim();
    const initial = initialsStr.length > 0 ? initialsStr[0].toLowerCase() : null;
    return { firstName: initialPrefixMatch[1], lastName, initial };
  }

  // 3. Check initial suffix format e.g. "Sinner J." or "Alcaraz C."
  const initialSuffixMatch = cleaned.match(/^(.+)\s+(([a-z]\.)+)$/i);
  if (initialSuffixMatch) {
    const lastName = initialSuffixMatch[1].trim();
    const initialsStr = initialSuffixMatch[2].replace(/\./g, '').trim();
    const initial = initialsStr.length > 0 ? initialsStr[0].toLowerCase() : null;
    return { firstName: initialSuffixMatch[2], lastName, initial };
  }

  // 4. Standard "First Last" or "First Middle Last" or compound name format
  const tokens = cleaned.split(' ');
  if (tokens.length === 1) {
    return { firstName: '', lastName: tokens[0], initial: null };
  }

  const initial = tokens[0].length > 0 ? tokens[0][0].toLowerCase() : null;

  // Compound last name prefixes (e.g. Alex de Minaur)
  const compoundPrefixes = ['de', 'del', 'van', 'der', 'di', 'da', 'dos', 'san', 'von'];
  if (tokens.length >= 3 && compoundPrefixes.includes(tokens[1].toLowerCase())) {
    const lastName = tokens.slice(1).join(' ');
    return { firstName: tokens[0], lastName, initial };
  }

  const lastName = tokens.slice(1).join(' ');
  const firstName = tokens[0];
  return { firstName, lastName, initial };
}

/**
 * Checks if two tennis player names refer to the same player based on last name
 * and first initial consistency.
 */
export function tennisPlayersMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const cleanA = stripAccents(nameA).toLowerCase().replace(/[.'-]/g, '').replace(/\s+/g, ' ').trim();
  const cleanB = stripAccents(nameB).toLowerCase().replace(/[.'-]/g, '').replace(/\s+/g, ' ').trim();

  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const parsedA = parsePlayerName(nameA);
  const parsedB = parsePlayerName(nameB);

  const lastA = parsedA.lastName.toLowerCase().replace(/[.'-]/g, '').trim();
  const lastB = parsedB.lastName.toLowerCase().replace(/[.'-]/g, '').trim();

  if (!lastA || !lastB) return false;

  // Check if last names match or one contains the other (e.g., "alcaraz" vs "alcaraz garfia")
  const lastNamesMatch = lastA === lastB || lastA.includes(lastB) || lastB.includes(lastA);
  if (!lastNamesMatch) return false;

  // If both have initials available, verify they don't conflict (e.g., A. Zverev vs M. Zverev)
  if (parsedA.initial && parsedB.initial && parsedA.initial !== parsedB.initial) {
    return false;
  }

  return true;
}

/**
 * Checks if two team or player names are equivalent.
 */
export function teamsMatch(nameA: string, nameB: string, isTennis: boolean = false): boolean {
  if (!nameA || !nameB) return false;

  if (isTennis) {
    return tennisPlayersMatch(nameA, nameB);
  }

  const cleanA = cleanTeamName(nameA);
  const cleanB = cleanTeamName(nameB);

  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

  return tennisPlayersMatch(nameA, nameB);
}
