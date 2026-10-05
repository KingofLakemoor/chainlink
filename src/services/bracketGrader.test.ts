import { describe, it, expect, beforeEach } from 'vitest';
import { gradeBrackets, setBracketWinner, setAdminDbMock } from './bracketGrader.js';

describe('bracketGrader', () => {
  let mockDocs: Record<string, any> = {};

  const createMockDb = () => {
    return {
      collection: (colName: string) => {
        return {
          get: async () => {
            const docsInCol = Object.entries(mockDocs)
              .filter(([path]) => path.startsWith(`${colName}/`))
              .map(([path, data]) => ({
                id: path.replace(`${colName}/`, ''),
                data: () => data
              }));
            return {
              empty: docsInCol.length === 0,
              docs: docsInCol,
              size: docsInCol.length
            };
          },
          doc: (docId?: string) => {
            const path = docId ? `${colName}/${docId}` : `${colName}/gen_${Math.random()}`;
            return {
              id: path.replace(`${colName}/`, ''),
              get: async () => ({
                exists: !!mockDocs[path],
                data: () => mockDocs[path]
              }),
              update: async (data: any) => {
                mockDocs[path] = { ...(mockDocs[path] || {}), ...data };
              }
            };
          },
          where: (field: string, op: string, val: any) => {
            return {
              get: async () => {
                const docsInCol = Object.entries(mockDocs)
                  .filter(([path]) => path.startsWith(`${colName}/`))
                  .map(([path, data]) => ({
                    id: path.replace(`${colName}/`, ''),
                    data: () => data
                  }))
                  .filter(doc => {
                    const data = doc.data();
                    if (op === '==') return data[field] === val;
                    return true;
                  });
                return {
                  empty: docsInCol.length === 0,
                  docs: docsInCol,
                  size: docsInCol.length
                };
              }
            };
          }
        };
      },
      runTransaction: async (updateFunction: any) => {
        const transaction = {
          get: async (ref: any) => {
            return ref.get();
          },
          update: (ref: any, data: any) => {
            ref.update(data);
          },
          set: (ref: any, data: any) => {
            mockDocs[`col_${Math.random()}`] = data;
          }
        };
        return updateFunction(transaction);
      }
    };
  };

  beforeEach(() => {
    mockDocs = {};
    setAdminDbMock(createMockDb());
  });

  it('grades brackets and pays out 1st, 2nd, and 3rd place with default 65% pot', async () => {
    // Set up bracket
    mockDocs['brackets/b1'] = {
      name: 'Test Bracket',
      sport: 'World Cup 2026',
      teams: ['USA', 'Canada', 'Mexico', 'Brazil'],
      cost: 100,
      prizePotPercent: 0.65,
      payoutSplit: { first: 70, second: 20, third: 10 },
      payoutComplete: false,
      results: {},
      matchIds: { 'r1-m0': 'game_final' } // Finals match
    };

    // Set up 3 predictions: u1 gets 40 pts, u2 gets 20 pts, u3 gets 10 pts
    mockDocs['bracketGamePredictions/b1_u1'] = {
      bracketId: 'b1',
      userId: 'u1',
      selections: { 'r0-m0': 'USA', 'r0-m1': 'Mexico', 'r1-m0': 'USA' }
    };
    mockDocs['bracketGamePredictions/b1_u2'] = {
      bracketId: 'b1',
      userId: 'u2',
      selections: { 'r0-m0': 'USA', 'r0-m1': 'Mexico', 'r1-m0': 'Mexico' }
    };
    mockDocs['bracketGamePredictions/b1_u3'] = {
      bracketId: 'b1',
      userId: 'u3',
      selections: { 'r0-m0': 'USA', 'r0-m1': 'Brazil', 'r1-m0': 'Mexico' }
    };

    mockDocs['users/u1'] = { links: 0, username: 'User 1' };
    mockDocs['users/u2'] = { links: 0, username: 'User 2' };
    mockDocs['users/u3'] = { links: 0, username: 'User 3' };

    const finalMatchups = [
      {
        gameId: 'game_semi1',
        league: 'FIFA',
        status: 'STATUS_FINAL',
        homeTeam: { name: 'USA', score: 2 },
        awayTeam: { name: 'Canada', score: 1 }
      },
      {
        gameId: 'game_semi2',
        league: 'FIFA',
        status: 'STATUS_FINAL',
        homeTeam: { name: 'Mexico', score: 3 },
        awayTeam: { name: 'Brazil', score: 0 }
      },
      {
        gameId: 'game_final',
        league: 'FIFA',
        status: 'STATUS_FINAL',
        homeTeam: { name: 'USA', score: 2 },
        awayTeam: { name: 'Mexico', score: 1 }
      }
    ];

    await gradeBrackets(finalMatchups);

    // Total pot = 3 entries * 100 Links = 300 Links. Total Prize Pot @ 65% = 195 Links.
    // 1st Place (70% of 195) = 136 Links.
    // 2nd Place (20% of 195) = 39 Links.
    // 3rd Place (10% of 195) = 19 Links.
    expect(mockDocs['users/u1'].links).toBe(136);
    expect(mockDocs['users/u2'].links).toBe(39);
    expect(mockDocs['users/u3'].links).toBe(19);
    expect(mockDocs['brackets/b1'].payoutComplete).toBe(true);
  });

  it('ignores round 0 BYE matchups during payout scoring', async () => {
    mockDocs['brackets/b_mlb'] = {
      name: 'MLB Playoffs Bracket',
      sport: 'MLB',
      teams: ['AL Seed 1', 'BYE', 'AL Seed 4', 'AL Seed 5'],
      cost: 10,
      prizePotPercent: 0.65,
      payoutSplit: { first: 100, second: 0, third: 0 },
      payoutComplete: false,
      results: { 'r1-m0': 'AL Seed 1' },
      pointValues: { 'Wild Card Series': 10, 'Division Series': 20 },
      matchIds: { 'r1-m0': 'game_mlb_final' }
    };

    // u1 picked r0-m0 (BYE matchup) and r1-m0
    // u2 only picked r1-m0
    mockDocs['bracketGamePredictions/b_mlb_u1'] = {
      bracketId: 'b_mlb',
      userId: 'u1',
      selections: { 'r0-m0': 'AL Seed 1', 'r1-m0': 'AL Seed 1' }
    };
    mockDocs['bracketGamePredictions/b_mlb_u2'] = {
      bracketId: 'b_mlb',
      userId: 'u2',
      selections: { 'r1-m0': 'AL Seed 1' }
    };

    mockDocs['users/u1'] = { links: 0, username: 'User 1' };
    mockDocs['users/u2'] = { links: 0, username: 'User 2' };

    const finalMatchups = [
      {
        gameId: 'game_mlb_final',
        league: 'MLB',
        status: 'STATUS_FINAL',
        homeTeam: { name: 'AL Seed 1', score: 5 },
        awayTeam: { name: 'AL Seed 4', score: 2 }
      }
    ];

    await gradeBrackets(finalMatchups);

    // Both u1 and u2 get 20 pts for r1-m0. r0-m0 is ignored for u1 so both tie at 20 pts.
    // Prize pot for 2 entries * 10 Links = 20 Links @ 65% = 13 Links total pot.
    // Tier 1 tied share = Math.floor(13 / 2) = 6 Links each.
    expect(mockDocs['users/u1'].links).toBe(6);
    expect(mockDocs['users/u2'].links).toBe(6);
    expect(mockDocs['brackets/b_mlb'].payoutComplete).toBe(true);
  });

  it('manually sets bracket winners, updates eliminated teams, and triggers payout when final match is set', async () => {
    mockDocs['brackets/b_manual'] = {
      name: 'Manual Bracket',
      sport: 'NBA',
      teams: ['Lakers', 'Celtics', 'Warriors', 'Heat'],
      cost: 50,
      prizePotPercent: 0.65,
      payoutSplit: { first: 100, second: 0, third: 0 },
      payoutComplete: false,
      results: {}
    };

    mockDocs['bracketGamePredictions/b_manual_u1'] = {
      bracketId: 'b_manual',
      userId: 'u1',
      selections: { 'r0-m0': 'Lakers', 'r0-m1': 'Warriors', 'r1-m0': 'Lakers' }
    };

    mockDocs['users/u1'] = { links: 0, username: 'User 1' };

    // 1. Set r0-m0 winner to Lakers
    await setBracketWinner('b_manual', 'r0-m0', 'Lakers');
    expect(mockDocs['brackets/b_manual'].results['r0-m0']).toBe('Lakers');
    expect(mockDocs['brackets/b_manual'].eliminatedTeams).toContain('Celtics');
    expect(mockDocs['brackets/b_manual'].payoutComplete).toBe(false);

    // 2. Set r0-m1 winner to Warriors
    await setBracketWinner('b_manual', 'r0-m1', 'Warriors');
    expect(mockDocs['brackets/b_manual'].results['r0-m1']).toBe('Warriors');
    expect(mockDocs['brackets/b_manual'].eliminatedTeams).toContain('Heat');

    // 3. Set r1-m0 (Finals) winner to Lakers -> triggers payout
    await setBracketWinner('b_manual', 'r1-m0', 'Lakers');
    expect(mockDocs['brackets/b_manual'].results['r1-m0']).toBe('Lakers');
    expect(mockDocs['brackets/b_manual'].eliminatedTeams).toContain('Warriors');
    expect(mockDocs['brackets/b_manual'].payoutComplete).toBe(true);
    // 1 entry * 50 Links * 0.65 = 32 Links payout
    expect(mockDocs['users/u1'].links).toBe(32);
  });
});
