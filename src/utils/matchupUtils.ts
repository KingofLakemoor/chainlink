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
 * Extracts the scoring category / prop metric label for player props and custom league props (e.g. NFL props and ScriptLess props).
 * Returns a human-friendly string (e.g. "Rushing Yards", "Total Points", "Anytime Touchdown") or null if standard game.
 */
export function getPropScoringCategory(matchup: any): string | null {
  if (!matchup) return null;
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
  const statA = meta.optionA?.statType || meta.statTypeA;
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
    if (meta.statType) {
      const formatted = String(meta.statType).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      return targetLine !== undefined && targetLine !== null ? `${formatted} (O/U ${targetLine})` : formatted;
    }
    if (targetLine !== undefined && targetLine !== null) {
      return `O/U ${targetLine}`;
    }
  }

  // 5. Title inspection for props with parenthesized stat e.g. "D'Andre Swift (RUSHING_YARDS) vs Jahmyr Gibbs"
  if (typeof matchup.title === 'string') {
    const title = matchup.title;
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

