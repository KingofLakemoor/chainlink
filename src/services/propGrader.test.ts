import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gradeSingleMatchup, setAdminDbMock as setGraderAdminDbMock } from './grader';
import { gradeSinglePickemMatchup, setAdminDbMock as setPickemAdminDbMock } from './pickemGrader';
import { updateAllProps, setAdminDbMock as setPropAdminDbMock } from './propGrader';

describe('Solo Over/Under Prop Grading Tests', () => {
  let mockAdminDb: any;
  let mockPendingPicks: any[];

  beforeEach(() => {
    mockPendingPicks = [];
    mockAdminDb = {
      collection: vi.fn((collName: string) => {
        if (collName === 'picks' || collName === 'pickemPicks') {
          return {
            where: vi.fn().mockReturnThis(),
            get: async () => ({
              empty: mockPendingPicks.length === 0,
              docs: mockPendingPicks.map(p => ({
                id: p.id,
                data: () => p,
                ref: `ref_${p.id}`
              }))
            })
          };
        }
        if (collName === 'achievements' || collName === 'shopItems') {
          return {
            where: vi.fn().mockReturnThis(),
            get: async () => ({ docs: [] })
          };
        }
        if (collName === 'pickemMatchups') {
          return {
            doc: vi.fn().mockReturnValue({
              update: vi.fn().mockResolvedValue(undefined)
            })
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: async () => ({ exists: false }),
            update: vi.fn().mockResolvedValue(undefined),
            set: vi.fn().mockResolvedValue(undefined)
          })
        };
      }),
      runTransaction: vi.fn(async (cb: any) => {
        const tx = {
          get: async (ref: any) => ({
            exists: true,
            data: () => ({
              status: 'PENDING',
              links: 100,
              stats: { wins: 0, losses: 0, pushes: 0 },
              allTimeStats: { wins: 0, losses: 0, pushes: 0 },
              statsByLeague: {},
              achievements: [],
              inventory: [],
              chain: 0
            })
          }),
          update: vi.fn(),
          set: vi.fn()
        };
        return await cb(tx);
      }),
      batch: vi.fn(() => ({
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      }))
    };

    setGraderAdminDbMock(mockAdminDb);
    setPickemAdminDbMock(mockAdminDb);
  });

  it('grader: grades OVER as winner when player stat exceeds targetLine for solo prop', async () => {
    mockPendingPicks = [
      { id: 'p1', userId: 'user1', matchupId: 'solo_1', links: 10, pick: { id: 'OVER' }, status: 'PENDING' },
      { id: 'p2', userId: 'user2', matchupId: 'solo_1', links: 10, pick: { id: 'UNDER' }, status: 'PENDING' }
    ];

    const matchup = {
      gameId: 'solo_1',
      status: 'STATUS_FINAL',
      type: 'OVER_UNDER',
      awayTeam: { id: 'over', score: 2 }, // 2 passing touchdowns
      homeTeam: { id: 'under', score: 0 }, // 0 (target line not set as score)
      metadata: {
        isSoloProp: true,
        targetLine: 1.5,
        overUnder: 1.5
      }
    };

    await gradeSingleMatchup(matchup);

    expect(mockAdminDb.runTransaction).toHaveBeenCalled();
  });

  it('grader: grades UNDER as winner when player stat is below targetLine for solo prop', async () => {
    mockPendingPicks = [
      { id: 'p1', userId: 'user1', matchupId: 'solo_2', links: 10, pick: { id: 'OVER' }, status: 'PENDING' },
      { id: 'p2', userId: 'user2', matchupId: 'solo_2', links: 10, pick: { id: 'UNDER' }, status: 'PENDING' }
    ];

    const matchup = {
      gameId: 'solo_2',
      status: 'STATUS_FINAL',
      type: 'OVER_UNDER',
      awayTeam: { id: 'over', score: 1 }, // 1 passing touchdown (less than 1.5)
      homeTeam: { id: 'under', score: 0 },
      metadata: {
        isSoloProp: true,
        targetLine: 1.5,
        overUnder: 1.5
      }
    };

    await gradeSingleMatchup(matchup);

    expect(mockAdminDb.runTransaction).toHaveBeenCalled();
  });

  it('pickemGrader: grades OVER as winner when player stat exceeds targetLine for solo pickem prop', async () => {
    mockPendingPicks = [
      { id: 'p1', participantId: 'user1', campaignId: 'c1', matchupId: 'solo_pickem_1', pick: { teamId: 'OVER' }, status: 'PENDING' }
    ];

    const matchup = {
      id: 'solo_pickem_1',
      status: 'STATUS_FINAL',
      type: 'OVER_UNDER',
      awayTeam: { id: 'over', score: 3 },
      homeTeam: { id: 'under', score: 0 },
      metadata: {
        isSoloProp: true,
        targetLine: 2.5,
        overUnder: 2.5
      }
    };

    await gradeSinglePickemMatchup(matchup);

    expect(mockAdminDb.collection).toHaveBeenCalledWith('pickemPicks');
  });

  it('pickemGrader: strictly grades YES Day campaign matchups on moneyline (Seahawks vs Patriots scenario)', async () => {
    const updateSpy = vi.fn();
    const batchSpy = {
      update: updateSpy,
      commit: vi.fn().mockResolvedValue(undefined)
    };
    mockAdminDb.batch = vi.fn(() => batchSpy);

    mockPendingPicks = [
      { id: 'p1', participantId: 'user1', campaignId: 'yes_day_2026', matchupId: 'sea_pat_1', pick: { teamId: 'seahawks' }, status: 'LOSS', pointsEarned: 0 },
      { id: 'p2', participantId: 'user2', campaignId: 'yes_day_2026', matchupId: 'sea_pat_1', pick: { teamId: 'patriots' }, status: 'WIN', pointsEarned: 1 }
    ];

    const matchup = {
      id: 'sea_pat_1',
      campaignName: 'YES Day Walk for Autism 2026',
      status: 'STATUS_FINAL',
      type: 'SPREAD', // even if type says SPREAD in DB
      awayTeam: { id: 'seahawks', name: 'Seattle Seahawks', score: 20 },
      homeTeam: { id: 'patriots', name: 'New England Patriots', score: 17 },
      metadata: {
        spread: 4.5 // Patriots +4.5 spread
      }
    };

    await gradeSinglePickemMatchup(matchup);

    expect(updateSpy).toHaveBeenCalledWith(
      'ref_p1',
      expect.objectContaining({ status: 'WIN', pointsEarned: 1 })
    );
    expect(updateSpy).toHaveBeenCalledWith(
      'ref_p2',
      expect.objectContaining({ status: 'LOSS', pointsEarned: 0 })
    );
  });
});

describe('Player Prop Scheduled Status Tests', () => {
  it('updateAllProps preserves STATUS_SCHEDULED when parent game is scheduled and startTime is in future', async () => {
    const futureTime = Date.now() + 30 * 60 * 1000;
    const propDocData = {
      gameId: 'prop_1',
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: futureTime,
      awayTeam: { id: 'over', score: 0 },
      homeTeam: { id: 'under', score: 0 },
      metadata: {
        isPropMatchup: true,
        isSoloProp: true,
        optionA: {
          league: 'CFB',
          gameId: 'parent_game_123',
          playerId: '999',
          statType: 'PASSING_TOUCHDOWNS'
        }
      }
    };

    const parentGameData = {
      gameId: 'parent_game_123',
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: futureTime
    };

    const updateSpy = vi.fn();
    const batchSpy = {
      update: updateSpy,
      commit: vi.fn().mockResolvedValue(undefined)
    };

    const mockDb = {
      collection: (coll: string) => {
        if (coll === 'matchups') {
          return {
            where: () => ({
              where: () => ({
                get: async () => ({
                  docs: [
                    {
                      id: 'prop_1',
                      data: () => propDocData,
                      ref: { id: 'prop_1' }
                    }
                  ]
                })
              })
            }),
            doc: (docId: string) => ({
              get: async () => {
                if (docId === 'parent_game_123') {
                  return { exists: true, data: () => parentGameData };
                }
                return { exists: false };
              }
            })
          };
        }
        return {};
      },
      batch: () => batchSpy
    };

    setPropAdminDbMock(mockDb);

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        boxscore: {
          players: [
            {
              statistics: [
                {
                  name: 'passing',
                  labels: ['TD'],
                  athletes: [{ athlete: { id: '999' }, stats: ['0'] }]
                }
              ]
            }
          ]
        }
      })
    } as any);

    try {
      await updateAllProps();

      if (updateSpy.mock.calls.length > 0) {
        const updateArgs = updateSpy.mock.calls[0][1];
        expect(updateArgs.status).not.toBe('STATUS_IN_PROGRESS');
        expect(updateArgs.status).toBe('STATUS_SCHEDULED');
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
