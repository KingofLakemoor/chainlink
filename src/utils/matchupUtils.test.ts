import { describe, it, expect } from 'vitest';
import { getMatchupStartTime, isMatchupLocked } from './matchupUtils';

describe('matchupUtils - getMatchupStartTime', () => {
  it('parses numeric timestamps directly', () => {
    const now = 1700000000000;
    expect(getMatchupStartTime(now)).toBe(now);
  });

  it('parses stringified numeric timestamps', () => {
    expect(getMatchupStartTime('1700000000000')).toBe(1700000000000);
  });

  it('parses ISO date strings', () => {
    const isoStr = '2026-09-27T17:05:00.000Z';
    expect(getMatchupStartTime(isoStr)).toBe(new Date(isoStr).getTime());
  });

  it('parses Firestore Timestamp objects with toMillis or seconds', () => {
    const tsWithMethod = { toMillis: () => 1700000000000 };
    expect(getMatchupStartTime(tsWithMethod)).toBe(1700000000000);

    const tsWithSeconds = { seconds: 1700000000, nanoseconds: 0 };
    expect(getMatchupStartTime(tsWithSeconds)).toBe(1700000000000);

    const tsWithUnderscoreSeconds = { _seconds: 1700000000, _nanoseconds: 0 };
    expect(getMatchupStartTime(tsWithUnderscoreSeconds)).toBe(1700000000000);
  });

  it('parses time strings like "7:05 PM EDT" or "7:05 PM"', () => {
    const parsed1 = getMatchupStartTime('7:05 PM EDT');
    expect(parsed1).toBeGreaterThan(0);

    const parsed2 = getMatchupStartTime('7:05 PM ET');
    expect(parsed2).toBeGreaterThan(0);

    const parsed3 = getMatchupStartTime('7:05 PM');
    expect(parsed3).toBeGreaterThan(0);
  });

  it('returns 0 for null, undefined, or empty/unparseable values', () => {
    expect(getMatchupStartTime(null)).toBe(0);
    expect(getMatchupStartTime(undefined)).toBe(0);
    expect(getMatchupStartTime('')).toBe(0);
    expect(getMatchupStartTime('invalid_date')).toBe(0);
  });
});

describe('matchupUtils - isMatchupLocked', () => {
  const futureTime = Date.now() + 3600000;
  const pastTime = Date.now() - 3600000;

  it('returns false for scheduled matchup with future start time', () => {
    const matchup = { status: 'STATUS_SCHEDULED', startTime: futureTime };
    expect(isMatchupLocked(matchup)).toBe(false);
  });

  it('returns true for scheduled matchup with past start time', () => {
    const matchup = { status: 'STATUS_SCHEDULED', startTime: pastTime };
    expect(isMatchupLocked(matchup)).toBe(true);
  });

  it('returns true for non-STATUS_SCHEDULED status (e.g. STATUS_IN_PROGRESS, STATUS_FINAL)', () => {
    expect(isMatchupLocked({ status: 'STATUS_IN_PROGRESS', startTime: futureTime })).toBe(true);
    expect(isMatchupLocked({ status: 'STATUS_FINAL', startTime: futureTime })).toBe(true);
    expect(isMatchupLocked({ status: 'STATUS_POSTPONED', startTime: futureTime })).toBe(true);
  });

  it('returns true when locked or isLocked flag is true', () => {
    expect(isMatchupLocked({ status: 'STATUS_SCHEDULED', startTime: futureTime, locked: true })).toBe(true);
    expect(isMatchupLocked({ status: 'STATUS_SCHEDULED', startTime: futureTime, isLocked: true })).toBe(true);
  });

  it('evaluates lock correctly when a custom "now" parameter is passed', () => {
    const startTime = 1790533800000; // Sept 27 2026
    const matchup = { status: 'STATUS_SCHEDULED', startTime };

    // Before start time
    expect(isMatchupLocked(matchup, startTime - 1000)).toBe(false);

    // At or after start time
    expect(isMatchupLocked(matchup, startTime)).toBe(true);
    expect(isMatchupLocked(matchup, startTime + 1000)).toBe(true);
  });
});
