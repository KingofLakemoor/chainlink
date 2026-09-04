/**
 * Calculates the exact date range (Wednesday 00:00:00 to Tuesday 23:59:59) for a given NFL season & week.
 * Week 1 Wednesday is 2 days after Labor Day (the first Monday of September).
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
  // First Monday + 2 days = Wednesday of Week 1
  const week1Wed = new Date(d);
  week1Wed.setDate(d.getDate() + 2);
  week1Wed.setHours(0, 0, 0, 0);

  // Week N Wednesday start
  const start = new Date(week1Wed);
  start.setDate(week1Wed.getDate() + (weekNumber - 1) * 7);

  // Week N Tuesday end (6 days later at 23:59:59.999)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // Date strings (YYYYMMDD) for all 7 days in this week (Wed through Tue)
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
  const monEnd = new Date(start);
  monEnd.setDate(start.getDate() + 5);
  const endStr = monEnd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedRange = `${startStr} - ${endStr}`;

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    startDate: start,
    endDate: end,
    dateStrings,
    formattedRange
  };
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
