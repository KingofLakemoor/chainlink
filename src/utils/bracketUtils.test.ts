import { describe, it, expect } from 'vitest';
import { getRoundNamesForBracket, getOrderedPointValues, formatPointValuesInOrder, isBracketLocked } from './bracketUtils';

describe('bracketUtils', () => {
  it('returns round names in chronological order for 16 team bracket', () => {
    const bracket = {
      teams: Array(16).fill('Team'),
      pointValues: {
        'Finals': 80,
        'Round of 16': 10,
        'Quarter Finals': 20,
        'Semi Finals': 40
      }
    };

    const roundNames = getRoundNamesForBracket(bracket);
    expect(roundNames).toEqual(["Round of 16", "Quarter Finals", "Semi Finals", "Finals"]);

    const ordered = getOrderedPointValues(bracket);
    expect(ordered).toEqual([
      { roundName: "Round of 16", points: 10 },
      { roundName: "Quarter Finals", points: 20 },
      { roundName: "Semi Finals", points: 40 },
      { roundName: "Finals", points: 80 }
    ]);

    expect(formatPointValuesInOrder(bracket)).toBe("10 / 20 / 40 / 80");
  });

  it('returns round names in chronological order for 8 team bracket', () => {
    const bracket = {
      teams: Array(8).fill('Team'),
      pointValues: {
        'Finals': 40,
        'Quarter Finals': 10,
        'Semi Finals': 20
      }
    };

    expect(getRoundNamesForBracket(bracket)).toEqual(["Quarter Finals", "Semi Finals", "Finals"]);
    expect(formatPointValuesInOrder(bracket)).toBe("10 / 20 / 40");
  });

  it('handles custom round names gracefully', () => {
    const bracket = {
      teams: Array(4).fill('Team'),
      pointValues: {
        'Round 1': 15,
        'Championship': 30
      }
    };

    expect(formatPointValuesInOrder(bracket)).toBe("15 / 30");
  });

  describe('isBracketLocked', () => {
    it('returns false for null or undefined bracket', () => {
      expect(isBracketLocked(null)).toBe(false);
      expect(isBracketLocked(undefined)).toBe(false);
    });

    it('returns true when status is LOCKED or COMPLETED', () => {
      expect(isBracketLocked({ status: 'LOCKED' })).toBe(true);
      expect(isBracketLocked({ status: 'COMPLETED' })).toBe(true);
      expect(isBracketLocked({ payoutComplete: true })).toBe(true);
      expect(isBracketLocked({ locked: true })).toBe(true);
      expect(isBracketLocked({ isLocked: true })).toBe(true);
    });

    it('returns true when lockDate is in the past', () => {
      const now = 1700000000000;
      expect(isBracketLocked({ status: 'OPEN', lockDate: now - 1000 }, now)).toBe(true);
      expect(isBracketLocked({ status: 'OPEN', lockDate: new Date(now - 1000).toISOString() }, now)).toBe(true);
    });

    it('returns false when lockDate is in the future', () => {
      const now = 1700000000000;
      expect(isBracketLocked({ status: 'OPEN', lockDate: now + 10000 }, now)).toBe(false);
    });

    it('returns true when earliest game in matchTimes is in the past', () => {
      const now = 1700000000000;
      const bracket = {
        status: 'OPEN',
        lockDate: now + 100000,
        matchTimes: {
          'r0-m0': now + 50000,
          'r0-m1': now - 500 // Game 2 has started!
        }
      };
      expect(isBracketLocked(bracket, now)).toBe(true);
    });

    it('returns false when all matchTimes are in the future and lockDate is in the future', () => {
      const now = 1700000000000;
      const bracket = {
        status: 'OPEN',
        lockDate: now + 100000,
        matchTimes: {
          'r0-m0': now + 50000,
          'r0-m1': now + 60000
        }
      };
      expect(isBracketLocked(bracket, now)).toBe(false);
    });
  });
});
