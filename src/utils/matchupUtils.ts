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
    const trimmed = startTime.trim();
    if (!trimmed) return 0;

    // Check if numeric string
    const parsedNum = Number(trimmed);
    if (!isNaN(parsedNum)) {
      return parsedNum;
    }

    // Try standard Date parsing (e.g., ISO string "2026-09-27T17:05:00Z" or "09/27/2026 5:05 PM")
    const parsedDate = new Date(trimmed).getTime();
    if (!isNaN(parsedDate)) return parsedDate;

    // Handle time strings like "7:05 PM", "7:05 PM EDT", "7:05 PM ET", "1:10 PM EST"
    const cleaned = trimmed.replace(/\s*(ET|EDT|EST|CT|CDT|CST|PT|PDT|PST)$/i, '');
    const todayDateStr = new Date().toISOString().split('T')[0];
    const combined = new Date(`${todayDateStr} ${cleaned}`).getTime();
    if (!isNaN(combined)) return combined;
  }

  return 0;
}

/**
 * Determines whether a matchup is locked based on its status, start time, and active flag.
 * A matchup is locked if:
 * 1) Its status is NOT 'STATUS_SCHEDULED' (e.g. IN_PROGRESS, FINAL, POSTPONED, DELAYED)
 * 2) OR its active flag is explicitly set to false (unless manually activated or has exception)
 * 3) OR its valid numeric startTime has arrived or passed relative to `now` (defaulting to Date.now()).
 */
export function isMatchupLocked(matchup: any, now: number = Date.now()): boolean {
  if (!matchup) return false;

  const status = matchup.status || 'STATUS_SCHEDULED';
  if (status !== 'STATUS_SCHEDULED') {
    return true;
  }

  if (matchup.locked === true || matchup.isLocked === true) {
    return true;
  }

  const startTime = getMatchupStartTime(matchup.startTime);
  if (startTime > 0 && now >= startTime) {
    return true;
  }

  return false;
}
