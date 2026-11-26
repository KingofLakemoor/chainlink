/**
 * Safely parses any startTime representation (number, stringified number, ISO date string, or Firestore Timestamp object)
 * into a numeric millisecond timestamp. Returns 0 if invalid or unparseable.
 */
export function getMatchupStartTime(startTime: any): number {
  if (!startTime && startTime !== 0) return 0;

  if (typeof startTime === 'number') {
    return isNaN(startTime) ? 0 : startTime;
  }

  // Handle Firestore Timestamp object ({ seconds, nanoseconds } or toMillis method)
  if (typeof startTime === 'object' && startTime !== null) {
    if (typeof startTime.toMillis === 'function') {
      return startTime.toMillis();
    }
    if (typeof startTime.seconds === 'number') {
      return startTime.seconds * 1000 + Math.floor((startTime.nanoseconds || 0) / 1000000);
    }
    if (typeof startTime._seconds === 'number') {
      return startTime._seconds * 1000 + Math.floor((startTime._nanoseconds || 0) / 1000000);
    }
  }

  if (typeof startTime === 'string') {
    // Check if numeric string
    const parsedNum = Number(startTime);
    if (!isNaN(parsedNum) && startTime.trim() !== '') {
      return parsedNum;
    }
    // Try Date parsing (e.g., ISO string)
    const parsedDate = new Date(startTime).getTime();
    return isNaN(parsedDate) ? 0 : parsedDate;
  }

  return 0;
}

/**
 * Determines whether a matchup is locked based on its status and start time.
 * A matchup is locked if:
 * 1) Its status is NOT 'STATUS_SCHEDULED' (e.g. IN_PROGRESS, FINAL, POSTPONED, DELAYED)
 * 2) OR its valid numeric startTime has arrived or passed relative to `now` (defaulting to Date.now()).
 */
export function isMatchupLocked(matchup: any, now: number = Date.now()): boolean {
  if (!matchup) return false;

  const status = matchup.status || 'STATUS_SCHEDULED';
  if (status !== 'STATUS_SCHEDULED') {
    return true;
  }

  const startTime = getMatchupStartTime(matchup.startTime);
  if (startTime > 0 && now >= startTime) {
    return true;
  }

  // Check parent game statuses and start times for player prop matchups
  if (matchup.metadata?.isPropMatchup || matchup.metadata?.isSinglePlayerProp || matchup.metadata?.isSoloProp) {
    const lockedStatuses = ['STATUS_IN_PROGRESS', 'STATUS_FINAL', 'STATUS_POSTPONED', 'STATUS_SUSPENDED', 'STATUS_CANCELED', 'STATUS_DELAYED'];
    if (matchup.metadata?.optionAStatus && lockedStatuses.includes(matchup.metadata.optionAStatus)) {
      return true;
    }
    if (matchup.metadata?.optionBStatus && lockedStatuses.includes(matchup.metadata.optionBStatus)) {
      return true;
    }

    const optAStart = getMatchupStartTime(matchup.metadata?.optionA?.startTime);
    if (optAStart > 0 && now >= optAStart) {
      return true;
    }
    const optBStart = getMatchupStartTime(matchup.metadata?.optionB?.startTime);
    if (optBStart > 0 && now >= optBStart) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts the over/under total target line from matchup metadata or parses it from the matchup title.
 * Examples:
 *   "Colts @ Texans - O/U 44.5" -> 44.5
 *   "Colts @ Texans - Over/Under 44.5" -> 44.5
 *   metadata: { overUnder: "44.5" } -> 44.5
 */
export function extractOverUnderLine(matchup: any): number | null {
  if (!matchup) return null;

  if (matchup.metadata?.overUnder !== undefined && matchup.metadata?.overUnder !== null && matchup.metadata?.overUnder !== '') {
    const parsed = Number(matchup.metadata.overUnder);
    if (!isNaN(parsed)) return parsed;
  }

  if (matchup.metadata?.targetLine !== undefined && matchup.metadata?.targetLine !== null && matchup.metadata?.targetLine !== '') {
    const parsed = Number(matchup.metadata.targetLine);
    if (!isNaN(parsed)) return parsed;
  }

  const title = matchup.title;
  if (typeof title === 'string') {
    const match = title.match(/(?:O\/U|Over\/Under|Total)[^\d]*(\d+(?:\.\d+)?)/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed)) return parsed;
    }
  }

  return null;
}

/**
 * Extracts the player name or entity subject for props (e.g. "Dak Prescott" or "D'Andre Swift vs Jahmyr Gibbs").
 * Returns null if this is a standard team vs team game or ATS game.
 */
export function getPropPlayerOrSubject(matchup: any): { playerName?: string; playerImage?: string; subject?: string } | null {
  if (!matchup) return null;
  // If standard spread or moneyline game between two teams, not a prop
  if (matchup.type === 'SPREAD' || matchup.type === 'STANDARD') {
    return null;
  }
  const meta = matchup.metadata || {};

  // 1. Explicit playerName in metadata or optionA
  const explicitPlayer = meta.optionA?.playerName || meta.playerName;
  const explicitImage = meta.optionA?.playerImage || meta.playerImage || (matchup.awayTeam?.image && !matchup.awayTeam.image.includes('/images/over.png') ? matchup.awayTeam.image : undefined);

  if (explicitPlayer && typeof explicitPlayer === 'string' && explicitPlayer.trim()) {
    return { playerName: explicitPlayer.trim(), playerImage: explicitImage };
  }

  // 2. Solo prop or Over/Under where awayTeam has the player name (and homeTeam is "under")
  if (meta.isSoloProp || meta.propType === 'OVER_UNDER' || matchup.type === 'OVER_UNDER') {
    if (matchup.awayTeam?.name && !/^over/i.test(matchup.awayTeam.name)) {
      return { playerName: matchup.awayTeam.name, playerImage: matchup.awayTeam.image };
    }
  }

  // 3. Extract player name from matchup title (e.g. "Dak Prescott - PASSING_YARDS (250.5)")
  if (typeof matchup.title === 'string') {
    const title = matchup.title.trim();
    if (title.includes(' - ')) {
      const candidate = title.split(' - ')[0].trim();
      // Ensure candidate is not just a team or generic term, and title is not an ATS / game title
      if (candidate && !/@/.test(candidate) && !/\bvs\b/i.test(candidate) && !/ - ATS$/i.test(title)) {
        return { playerName: candidate, playerImage: explicitImage || (matchup.awayTeam?.image && !matchup.awayTeam.image.includes('/images/over.png') ? matchup.awayTeam.image : undefined) };
      }
    } else if (title.includes(' vs ') && (meta.isPropMatchup || matchup.type === 'PROP' || matchup.type === 'STATS')) {
      // H2H prop
      return { subject: title };
    }
  }

  return null;
}

/**
 * Extracts target line for Over/Under props (e.g. 250.5 or 0.5).
 * Only applies to props and OVER_UNDER matchups, NOT standard ATS / spread games.
 */
export function getPropTargetLine(matchup: any): number | null {
  if (!matchup) return null;
  // Standard spread games are not Over/Under props
  if (matchup.type === 'SPREAD' || matchup.type === 'STANDARD') {
    return null;
  }
  const meta = matchup.metadata || {};
  const isProp = meta.isPropMatchup || meta.isSoloProp || meta.propType === 'OVER_UNDER' || matchup.type === 'OVER_UNDER' || matchup.type === 'PROP' || matchup.type === 'STATS';
  if (!isProp) {
    return null;
  }

  if (meta.targetLine !== undefined && meta.targetLine !== null && !isNaN(Number(meta.targetLine))) {
    return Number(meta.targetLine);
  }
  if (meta.overUnder !== undefined && meta.overUnder !== null && !isNaN(Number(meta.overUnder))) {
    return Number(meta.overUnder);
  }
  // Try parsing from awayTeam.name if it says "Over 250.5"
  if (typeof matchup.awayTeam?.name === 'string') {
    const match = matchup.awayTeam.name.match(/over\s+([0-9.]+)/i);
    if (match && match[1]) return parseFloat(match[1]);
  }
  // Try parsing from title e.g. "Dak Prescott - PASSING_YARDS (250.5)"
  if (typeof matchup.title === 'string') {
    const match = matchup.title.match(/\(([0-9.]+)\)/);
    if (match && match[1]) return parseFloat(match[1]);
  }
  return null;
}

/**
 * Extracts the scoring category / prop metric label for player props and custom league props (e.g. NFL props and ScriptLess props).
 * Returns a human-friendly string (e.g. "Passing Yards", "Rushing Yards", "Total Points", "Anytime Touchdown") or null if standard game.
 */
export function getPropScoringCategory(matchup: any): string | null {
  if (!matchup) return null;
  // If it's a standard SPREAD or standard game between teams, do not return a prop scoring category
  if (matchup.type === 'SPREAD' || (matchup.type === 'STANDARD' && matchup.league !== 'SCRIPTLESS' && !matchup.metadata?.isPropMatchup)) {
    return null;
  }
  const meta = matchup.metadata || {};

  // 1. Explicit metric in metadata (e.g. ScriptLess props: metric: "Total Points", metric: "Baking Time")
  if (meta.metric && typeof meta.metric === 'string' && meta.metric.trim()) {
    return meta.metric.trim();
  }

  // 2. Yes-Only label (e.g. "Anytime Touchdown Scorer")
  if (meta.yesOnlyLabel && typeof meta.yesOnlyLabel === 'string' && meta.yesOnlyLabel.trim()) {
    return meta.yesOnlyLabel.trim();
  }

  // 3. Stat type from optionA / optionB (H2H or Solo Player Props)
  const statA = meta.optionA?.statType || meta.statTypeA || meta.statType;
  const statB = meta.optionB?.statType || meta.statTypeB;
  if (statA || statB) {
    const rawStat = statA || statB;
    const formatted = String(rawStat)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
    
    // If timeframe is specified and not FULL_GAME, append e.g. " (1st Half)"
    const timeframe = meta.timeframe;
    if (timeframe && timeframe !== 'FULL_GAME') {
      const tfFormatted = String(timeframe)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
      return `${formatted} (${tfFormatted})`;
    }
    return formatted;
  }

  // 4. Over/Under target line or stat label from solo prop
  if (meta.isSoloProp || meta.propType === 'OVER_UNDER') {
    const targetLine = meta.targetLine ?? meta.overUnder;
    if (targetLine !== undefined && targetLine !== null) {
      return `O/U ${targetLine}`;
    }
  }

  // 5. Title inspection for props with parenthesized stat e.g. "D'Andre Swift (RUSHING_YARDS) vs Jahmyr Gibbs"
  // or hyphenated stat e.g. "Dak Prescott - PASSING_YARDS (250.5)"
  if (typeof matchup.title === 'string') {
    const title = matchup.title;
    if (title.includes(' - ') && !title.endsWith(' - ATS')) {
      const parts = title.split(' - ');
      if (parts[1]) {
        const candidate = parts[1].split('(')[0].trim();
        if (/^[A-Z_]{3,30}$/.test(candidate) || /yards|touchdown|points|rebounds|assists|strikeouts|hits/i.test(candidate)) {
          return candidate.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        }
      }
    }
    const parenMatch = title.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      const candidate = parenMatch[1].trim();
      // If it looks like a stat type (e.g., RUSHING_YARDS, PASSING_YARDS, POINTS, REBOUNDS)
      if (/^[A-Z_]{3,30}$/.test(candidate) || /yards|touchdown|points|rebounds|assists|strikeouts|hits/i.test(candidate)) {
        return candidate.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      }
    }
  }

  // 6. ScriptLess default metric fallback
  if (matchup.league === 'SCRIPTLESS') {
    return 'Total Points';
  }

  return null;
}

/**
 * Checks if a matchup is a prop (player prop, H2H prop, solo prop, yes-only, ScriptLess, etc.).
 */
export function isPropMatchup(matchup: any): boolean {
  if (!matchup) return false;
  const meta = matchup.metadata || {};
  return Boolean(
    meta.isPropMatchup ||
    meta.isSoloProp ||
    meta.isSinglePlayerProp ||
    meta.isYesOnly ||
    meta.propType ||
    matchup.type === 'PROP' ||
    matchup.type === 'STATS' ||
    matchup.typeDetails === 'PLAYER_STAT' ||
    matchup.league === 'PROP' ||
    matchup.league === 'SCRIPTLESS' ||
    (typeof matchup.gameId === 'string' && matchup.gameId.startsWith('prop_')) ||
    getPropPlayerOrSubject(matchup) !== null ||
    getPropScoringCategory(matchup) !== null
  );
}

/**
 * Checks if a matchup is a game total (Over/Under game total, excluding player/solo props).
 */
export function isTotalMatchup(matchup: any): boolean {
  if (!matchup) return false;
  if (isPropMatchup(matchup)) return false;
  return (
    matchup.type === 'OVER_UNDER' ||
    matchup.metadata?.isOverUnder === true ||
    extractOverUnderLine(matchup) !== null
  );
}

/**
 * Checks if a matchup is against the spread (ATS / SPREAD).
 */
export function isAtsMatchup(matchup: any): boolean {
  if (!matchup) return false;
  if (isPropMatchup(matchup) || isTotalMatchup(matchup)) return false;
  return (
    matchup.type === 'SPREAD' ||
    (matchup.metadata?.spread !== undefined && matchup.metadata?.spread !== null && matchup.metadata?.spread !== '') ||
    (typeof matchup.title === 'string' && matchup.title.includes(' - ATS'))
  );
}

/**
 * Checks if a matchup is straight up (moneyline / standard score, no spread or total, not a prop).
 */
export function isStraightUpMatchup(matchup: any): boolean {
  if (!matchup) return false;
  return !isAtsMatchup(matchup) && !isTotalMatchup(matchup) && !isPropMatchup(matchup);
}

export type MatchupBetType = 'straight_up' | 'ats' | 'total' | 'prop';

/**
 * Returns the bet classification of a matchup: 'prop' | 'total' | 'ats' | 'straight_up'.
 */
export function getMatchupBetType(matchup: any): MatchupBetType {
  if (isPropMatchup(matchup)) return 'prop';
  if (isTotalMatchup(matchup)) return 'total';
  if (isAtsMatchup(matchup)) return 'ats';
  return 'straight_up';
}

export const SPREAD_ELIGIBLE_LEAGUES = ['NFL', 'CFB', 'NBA', 'MBB', 'WBB'];

export interface EffectiveOddsThresholds {
  maxMoneylineOdds: number; // e.g. 450 (absolute value)
  atsMoneylineOdds: number; // e.g. 250 (absolute value)
  maxPointSpread: number;   // e.g. 9.5
}

/**
 * Resolves the effective thresholds for a given league based on ScraperConfig.
 * Returns absolute values for easier threshold checking.
 */
export function resolveOddsThresholds(config?: any, league?: string): EffectiveOddsThresholds {
  // If maxMoneylineOdds is explicitly passed without atsMoneylineOdds (e.g. legacy { maxMoneylineOdds: 300 }),
  // then the ATS window starts at maxMoneylineOdds (300) and extends up to max(450, maxMoneylineOdds).
  // Otherwise, default globalMaxML is 450 and globalAtsML is 250.
  const hasExplicitMaxML = config?.maxMoneylineOdds !== undefined && config?.maxMoneylineOdds !== null;
  const hasExplicitAtsML = config?.atsMoneylineOdds !== undefined && config?.atsMoneylineOdds !== null;

  let globalMaxML = 450;
  let globalAtsML = 250;

  if (hasExplicitMaxML && !hasExplicitAtsML) {
    const passedML = Math.abs(config.maxMoneylineOdds);
    globalAtsML = passedML; // Odds >= passedML switch to ATS
    globalMaxML = Math.max(passedML, 450); // Up to 450 or passedML
  } else {
    if (hasExplicitMaxML) globalMaxML = Math.abs(config.maxMoneylineOdds);
    if (hasExplicitAtsML) globalAtsML = Math.abs(config.atsMoneylineOdds);
  }

  const globalMaxSpread = Math.abs(config?.maxPointSpread ?? 9.5);

  let leagueMaxML = globalMaxML;
  let leagueAtsML = globalAtsML;
  let leagueMaxSpread = globalMaxSpread;

  // Check sportOddsRules first
  if (league && config?.sportOddsRules && config.sportOddsRules[league]) {
    const rule = config.sportOddsRules[league];
    if (rule.maxMoneylineOdds !== undefined && rule.maxMoneylineOdds !== null) {
      leagueMaxML = Math.abs(rule.maxMoneylineOdds);
    }
    if (rule.atsMoneylineOdds !== undefined && rule.atsMoneylineOdds !== null) {
      leagueAtsML = Math.abs(rule.atsMoneylineOdds);
    }
    if (rule.maxPointSpread !== undefined && rule.maxPointSpread !== null) {
      leagueMaxSpread = Math.abs(rule.maxPointSpread);
    }
  } else if (league && config?.sportOverrides && config.sportOverrides[league] !== undefined && config.sportOverrides[league] !== null) {
    // Backward compatibility with legacy sportOverrides (which mapped league -> maxMoneylineOdds)
    const passedSportML = Math.abs(config.sportOverrides[league]);
    leagueAtsML = passedSportML;
    leagueMaxML = Math.max(passedSportML, globalMaxML);
  }

  // Ensure atsMoneylineOdds does not exceed maxMoneylineOdds
  if (leagueAtsML > leagueMaxML) {
    leagueAtsML = leagueMaxML;
  }

  return {
    maxMoneylineOdds: leagueMaxML,
    atsMoneylineOdds: leagueAtsML,
    maxPointSpread: leagueMaxSpread
  };
}

export interface OddsEvaluationResult {
  active: boolean;
  matchupType: 'SCORE' | 'SPREAD' | 'MONEYLINE';
  reason?: string;
}

/**
 * Evaluates whether a matchup should be active, and if it switches to ATS (SPREAD).
 */
export function evaluateOddsMatchupStatus(params: {
  league: string;
  mlHome?: number | string | null;
  mlAway?: number | string | null;
  spread?: number | string | null;
  config?: any;
}): OddsEvaluationResult {
  const { league, mlHome, mlAway, spread, config } = params;
  const thresholds = resolveOddsThresholds(config, league);

  const mlH = mlHome !== undefined && mlHome !== null && mlHome !== '' ? parseInt(String(mlHome), 10) : NaN;
  const mlA = mlAway !== undefined && mlAway !== null && mlAway !== '' ? parseInt(String(mlAway), 10) : NaN;

  const isSpreadEligible = SPREAD_ELIGIBLE_LEAGUES.includes(league);
  const thirdPartyLeagues = ['ATP', 'WTA', 'RPL', 'TUR', 'ARG', 'BRA', 'LMX', 'NWSL'];

  // Check if both ML odds are missing
  const hasNoMlOdds = isNaN(mlH) && isNaN(mlA);
  const hasAnyMissingMlOdds = isNaN(mlH) || isNaN(mlA);

  if (thirdPartyLeagues.includes(league) && hasNoMlOdds) {
    return { active: false, matchupType: 'SCORE', reason: 'Missing ML odds for 3rd-party league' };
  }

  // Parse spread
  let spreadNum: number | null = null;
  if (spread !== undefined && spread !== null && spread !== '') {
    const parsed = parseFloat(String(spread));
    if (!isNaN(parsed)) spreadNum = parsed;
  }

  // If spread-eligible league is missing ML odds (NaN), check if valid spread exists
  if (isSpreadEligible && hasAnyMissingMlOdds) {
    if (spreadNum !== null && Math.abs(spreadNum) <= thresholds.maxPointSpread) {
      return { active: true, matchupType: 'SPREAD', reason: 'Missing ML but valid spread within limit' };
    }
    return { active: false, matchupType: 'SCORE', reason: 'Missing ML odds and no valid spread within limit' };
  }

  // Determine favorite odds magnitude
  let favoriteMagnitude = 0;
  if (!isNaN(mlH) && !isNaN(mlA)) {
    favoriteMagnitude = Math.max(Math.abs(mlH), Math.abs(mlA));
  } else if (!isNaN(mlH)) {
    favoriteMagnitude = Math.abs(mlH);
  } else if (!isNaN(mlA)) {
    favoriteMagnitude = Math.abs(mlA);
  }

  // 1. If within standard moneyline threshold (< atsMoneylineOdds): active as standard SCORE
  if (favoriteMagnitude < thresholds.atsMoneylineOdds) {
    return { active: true, matchupType: 'SCORE' };
  }

  // 2. If between atsMoneylineOdds and maxMoneylineOdds:
  // Can switch to ATS if spread-eligible and spread is within maxPointSpread limit
  if (favoriteMagnitude <= thresholds.maxMoneylineOdds) {
    if (isSpreadEligible && spreadNum !== null && Math.abs(spreadNum) <= thresholds.maxPointSpread) {
      return { active: true, matchupType: 'SPREAD' };
    }
    // If not spread-eligible or spread exceeds limit/missing: deactivated
    return { active: false, matchupType: 'SCORE', reason: 'Odds in ATS range but spread ineligible or outside limit' };
  }

  // 3. If favorite odds exceed maxMoneylineOdds (> maxMoneylineOdds): completely off the board
  return { active: false, matchupType: 'SCORE', reason: 'Favorite odds exceed max moneyline odds' };
}

