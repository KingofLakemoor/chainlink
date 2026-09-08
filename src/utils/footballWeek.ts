/**
 * Calculates the exact date range (Tuesday 00:00:00 to Monday 23:59:59) for a given NFL season & week.
 * Week 1 Tuesday is 1 day after Labor Day (the first Monday of September).
 * Covers Tuesday night through Monday Night Football as the last game of the week.
 */
export function getFootballWeekDateRange(season: number = 2026, weekNumber: number = 1): {
  startMs: number;
  endMs: number;
  startDate: Date;
  endDate: Date;
  dateStrings: string[];
  formattedRange: string;
} {
  // Find first Monday in September of `season` (Labor Day)
  const d = new Date(season, 8, 1, 0, 0, 0, 0); // Sept 1
  while (d.getDay() !== 1) { // 1 = Monday
    d.setDate(d.getDate() + 1);
  }
  // First Monday + 1 day = Tuesday of Week 1
  const week1Tue = new Date(d);
  week1Tue.setDate(d.getDate() + 1);
  week1Tue.setHours(0, 0, 0, 0);

  // Week N Tuesday start
  const start = new Date(week1Tue);
  start.setDate(week1Tue.getDate() + (weekNumber - 1) * 7);

  // Week N Monday end (6 days later at 23:59:59.999)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // Date strings (YYYYMMDD) for all 7 days in this week (Tue through Mon)
  const dateStrings: string[] = [];
  const curr = new Date(start);
  for (let i = 0; i < 7; i++) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    dateStrings.push(`${yyyy}${mm}${dd}`);
    curr.setDate(curr.getDate() + 1);
  }

  const startStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedRange = `${startStr} - ${endStr}`;

  // Start boundary: Tuesday 00:00:00 Eastern Time
  const startY = start.getFullYear();
  const startM = String(start.getMonth() + 1).padStart(2, '0');
  const startD = String(start.getDate()).padStart(2, '0');
  const isStartEDT = new Date(`${startY}-${startM}-${startD}T00:00:00Z`).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }).includes('EDT');
  const startMs = new Date(`${startY}-${startM}-${startD}T00:00:00${isStartEDT ? '-04:00' : '-05:00'}`).getTime();

  // End boundary: Monday 23:59:59.999 Eastern Time + 4 hours buffer (03:59:59.999 UTC Tuesday morning) to cover Monday Night Football
  const endY = end.getFullYear();
  const endM = String(end.getMonth() + 1).padStart(2, '0');
  const endD = String(end.getDate()).padStart(2, '0');
  const isEndEDT = new Date(`${endY}-${endM}-${endD}T23:59:59Z`).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }).includes('EDT');
  const endMs = new Date(`${endY}-${endM}-${endD}T23:59:59.999${isEndEDT ? '-04:00' : '-05:00'}`).getTime() + 4 * 3600000;

  return {
    startMs,
    endMs,
    startDate: start,
    endDate: end,
    dateStrings,
    formattedRange
  };
}

/**
 * Calculates the Tuesday 12:00 PM Eastern Time timestamp when snapshot lines release / pick window opens for a week.
 * This is 12 hours after Week N Tuesday 00:00:00 Eastern Time (startMs).
 */
export function getGridironLinesLockTime(season: number = 2026, weekNumber: number = 1): number {
  const weekRange = getFootballWeekDateRange(season, weekNumber);
  return weekRange.startMs + 12 * 3600 * 1000;
}

/**
 * Calculates current football season and week number based on active NFL week dates.
 */
export function getCurrentFootballWeek(now: Date = new Date()): { season: number; weekNumber: number } {
  const season = now.getFullYear();
  const week1Range = getFootballWeekDateRange(season, 1);

  if (now.getTime() < week1Range.startMs) {
    return { season, weekNumber: 1 };
  }

  const diffMs = now.getTime() - week1Range.startMs;
  const weekNumber = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { season, weekNumber: Math.max(1, Math.min(weekNumber, 20)) };
}
