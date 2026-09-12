import { describe, it, expect, beforeEach } from 'vitest';
import { isTeamMatch } from '../lib/teamUtils.js';
import { gradeLink4Matchups, aggregateAndPurgeLink4Segment, purgeCompletedLink4Segments, setAdminDbMock } from './link4Grader.js';

describe('isTeamMatch helper', () => {
  it('matches exact full team names', () => {
    expect(isTeamMatch('Los Angeles Rams', { name: 'Los Angeles Rams' })).toBe(true);
    expect(isTeamMatch('San Francisco 49ers', { name: 'San Francisco 49ers' })).toBe(true);
  });

  it('matches team full name when pick is team mascot/nickname or vice versa', () => {
    expect(isTeamMatch('Los Angeles Rams', { name: 'Rams' })).toBe(true);
    expect(isTeamMatch('Rams', { name: 'Los Angeles Rams' })).toBe(true);
    expect(isTeamMatch('San Francisco 49ers', { name: '49ers' })).toBe(true);
    expect(isTeamMatch('49ers', { name: 'San Francisco 49ers' })).toBe(true);
  });

  it('matches team short name or id or abbreviation', () => {
    expect(isTeamMatch('Rams', { name: 'Los Angeles', shortName: 'Rams' })).toBe(true);
    expect(isTeamMatch('LAR', { name: 'Los Angeles Rams', abbreviation: 'LAR' })).toBe(true);
    expect(isTeamMatch('rams', { name: 'Los Angeles Rams', id: 'rams' })).toBe(true);
  });

  it('returns false for non-matching teams', () => {
    expect(isTeamMatch('Los Angeles Rams', { name: 'San Francisco 49ers' })).toBe(false);
    expect(isTeamMatch('49ers', { name: 'Rams' })).toBe(false);
    expect(isTeamMatch('San Francisco 49ers', { name: 'Los Angeles Rams', id: 'rams', abbreviation: 'LAR' })).toBe(false);
  });
});

describe('gradeLink4Matchups', () => {
  let mockDb: any;
  let mockSegmentsDocs: any[];
  let mockPicksDocs: any[];

  beforeEach(() => {
    mockPicksDocs = [
      {
        id: 'pick_doc_1',
        data: () => ({
          userId: 'user1',
          segmentId: 'seg1',
          hasLoss: false,
          picks: [
            {
              id: 'pick-game1',
              name: 'Los Angeles Rams',
              sport: 'NFL',
              status: 'PENDING',
              score: 0,
            },
          ],
        }),
      },
    ];

    mockSegmentsDocs = [
      {
        id: 'seg1',
        data: () => ({ payoutComplete: false }),
      },
    ];

    mockDb = {
      collection: (colName: string) => {
        if (colName === 'link4Segments') {
          return {
            get: async () => ({
              empty: mockSegmentsDocs.length === 0,
              docs: mockSegmentsDocs,
            }),
          };
        }
        if (colName === 'link4Picks') {
          return {
            where: (_field: string, _op: string, _val: any) => ({
              get: async () => ({
                empty: mockPicksDocs.length === 0,
                docs: mockPicksDocs,
              }),
            }),
            doc: (id: string) => ({ id }),
          };
        }
        return {
          doc: (id: string) => ({ id }),
        };
      },
      batch: () => {
        return {
          update: (_docRef: any, updates: any) => {
            mockPicksDocs[0].updatedData = updates;
          },
          commit: async () => {},
        };
      },
    };

    setAdminDbMock(mockDb);
  });

  it('correctly grades Rams pick as WIN when Rams (home team) win game', async () => {
    const finalMatchups = [
      {
        gameId: 'game1',
        status: 'STATUS_FINAL',
        type: 'MONEYLINE',
        homeTeam: { name: 'Rams', score: 24 },
        awayTeam: { name: '49ers', score: 17 },
        metadata: { mlHome: -192, mlAway: 160 },
      },
    ];

    await gradeLink4Matchups(finalMatchups);

    const updatedPicks = mockPicksDocs[0].updatedData;
    expect(updatedPicks).toBeDefined();
    expect(updatedPicks.hasLoss).toBe(false);
    expect(updatedPicks.picks[0].status).toBe('WIN');
    expect(updatedPicks.picks[0].score).toBe(-192);
  });

  it('correctly grades Rams pick as LOSS and cancels remaining pending picks when Rams lose', async () => {
    mockPicksDocs[0] = {
      id: 'pick_doc_1',
      data: () => ({
        userId: 'user1',
        segmentId: 'seg1',
        hasLoss: false,
        picks: [
          {
            id: 'pick-game1',
            name: 'Los Angeles Rams',
            sport: 'NFL',
            status: 'PENDING',
            score: 0,
          },
          {
            id: 'pick-game2',
            name: 'Chiefs',
            sport: 'NFL',
            status: 'PENDING',
            score: 0,
          },
        ],
      }),
    };

    const finalMatchups = [
      {
        gameId: 'game1',
        status: 'STATUS_FINAL',
        type: 'MONEYLINE',
        homeTeam: { name: 'Rams', score: 17 },
        awayTeam: { name: '49ers', score: 24 },
        metadata: { mlHome: -192, mlAway: 160 },
      },
    ];

    await gradeLink4Matchups(finalMatchups);

    const updatedPicks = mockPicksDocs[0].updatedData;
    expect(updatedPicks).toBeDefined();
    expect(updatedPicks.hasLoss).toBe(true);
    expect(updatedPicks.picks[0].status).toBe('LOSS');
    expect(updatedPicks.picks[1].status).toBe('CANCELLED');
  });
});

describe('aggregateAndPurgeLink4Segment and purgeCompletedLink4Segments', () => {
  let mockDb: any;
  let mockUsers: Record<string, any>;
  let mockSegments: Record<string, any>;
  let mockPicks: Record<string, any>;
  let mockMatchups: Record<string, any>;
  let mockTransactions: Record<string, any>;

  beforeEach(() => {
    mockUsers = {
      user1: {
        username: 'UserOne',
        link4Stats: {
          totalPlayed: 1,
          totalWins: 0,
          totalLosses: 1,
          totalPicksSubmitted: 2,
          totalPicksWon: 1,
          totalLinksWon: 0,
          lastPlayedAt: 1000
        }
      }
    };

    mockSegments = {
      seg_completed: {
        payoutComplete: true,
        endTime: '2026-09-01T00:00:00.000Z'
      },
      seg_unpaid: {
        payoutComplete: false,
        endTime: '2026-09-10T00:00:00.000Z'
      }
    };

    mockPicks = {
      'seg_completed_user1': {
        segmentId: 'seg_completed',
        userId: 'user1',
        hasLoss: false,
        picks: [
          { id: 'pick-m1', name: 'Rams', status: 'WIN' },
          { id: 'pick-m2', name: 'Chiefs', status: 'WIN' },
          { id: 'pick-m3', name: 'Eagles', status: 'WIN' },
          { id: 'pick-m4', name: 'Bills', status: 'WIN' }
        ]
      }
    };

    mockMatchups = {
      'seg_completed_m1': {
        segmentId: 'seg_completed',
        gameId: 'm1'
      }
    };

    mockTransactions = {
      tx1: {
        userId: 'user1',
        type: 'LINK4_WIN',
        amount: 65,
        description: 'Won Link4 Segment seg_completed'
      }
    };

    mockDb = {
      collection: (colName: string) => ({
        doc: (docId: string) => ({
          get: async () => ({
            exists: !!(colName === 'link4Segments' ? mockSegments[docId] : colName === 'users' ? mockUsers[docId] : null),
            data: () => colName === 'link4Segments' ? mockSegments[docId] : colName === 'users' ? mockUsers[docId] : null,
            ref: { id: docId }
          }),
          set: async (data: any, opts: any) => {
            if (colName === 'users') {
              mockUsers[docId] = opts?.merge ? { ...mockUsers[docId], ...data } : data;
            }
          },
          delete: async () => {
            if (colName === 'link4Segments') delete mockSegments[docId];
          }
        }),
        where: (field: string, _op: string, val: any) => ({
          where: (_f2: string, _op2: string, _v2: any) => ({
            get: async () => {
              const matched = Object.entries(mockTransactions).filter(([_, tx]) => tx.userId === val);
              return {
                empty: matched.length === 0,
                docs: matched.map(([id, data]) => ({ id, data: () => data }))
              };
            }
          }),
          get: async () => {
            let matched: [string, any][] = [];
            if (colName === 'link4Picks') {
              matched = Object.entries(mockPicks).filter(([_, p]) => p[field] === val);
            } else if (colName === 'link4Matchups') {
              matched = Object.entries(mockMatchups).filter(([_, m]) => m[field] === val);
            } else if (colName === 'link4Segments') {
              matched = Object.entries(mockSegments).filter(([_, s]) => s[field] === val);
            }
            return {
              empty: matched.length === 0,
              docs: matched.map(([id, data]) => ({
                id,
                data: () => data,
                ref: { id }
              }))
            };
          }
        })
      }),
      batch: () => ({
        delete: (docRef: any) => {
          delete mockPicks[docRef.id];
          delete mockMatchups[docRef.id];
        },
        commit: async () => {}
      })
    };

    setAdminDbMock(mockDb);
  });

  it('aggregateAndPurgeLink4Segment aggregates stats into user master profile and purges docs', async () => {
    const result = await aggregateAndPurgeLink4Segment('seg_completed');

    expect(result.picksPurged).toBe(1);
    expect(result.matchupsPurged).toBe(1);
    expect(result.usersAggregated).toBe(1);

    // Verify user master profile stats were incremented
    const updatedUser = mockUsers.user1;
    expect(updatedUser.link4Stats.totalPlayed).toBe(2);
    expect(updatedUser.link4Stats.totalWins).toBe(1);
    expect(updatedUser.link4Stats.totalPicksSubmitted).toBe(6);
    expect(updatedUser.link4Stats.totalPicksWon).toBe(5);
    expect(updatedUser.link4Stats.totalLinksWon).toBe(65);

    // Verify docs deleted
    expect(mockPicks['seg_completed_user1']).toBeUndefined();
    expect(mockMatchups['seg_completed_m1']).toBeUndefined();
    expect(mockSegments['seg_completed']).toBeUndefined();
  });

  it('aggregateAndPurgeLink4Segment throws error if payout is incomplete and force is false', async () => {
    await expect(aggregateAndPurgeLink4Segment('seg_unpaid')).rejects.toThrow('payout is not complete yet');
  });

  it('purgeCompletedLink4Segments purges all completed segments', async () => {
    const res = await purgeCompletedLink4Segments();

    expect(res.purgedSegmentsCount).toBe(1);
    expect(mockSegments['seg_completed']).toBeUndefined();
    expect(mockSegments['seg_unpaid']).toBeDefined();
  });
});
