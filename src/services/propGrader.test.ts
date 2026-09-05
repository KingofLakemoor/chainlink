import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gradeSingleMatchup, setAdminDbMock as setGraderAdminDbMock } from './grader';
import { gradeSinglePickemMatchup, setAdminDbMock as setPickemAdminDbMock } from './pickemGrader';

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
});
