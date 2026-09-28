import { describe, it, expect } from 'vitest';
import { getRoundNamesForBracket, getOrderedPointValues, formatPointValuesInOrder } from './bracketUtils';

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
});
