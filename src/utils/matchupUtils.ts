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

  return false;
}
