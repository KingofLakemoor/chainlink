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

