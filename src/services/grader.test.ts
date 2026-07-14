import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradeSingleMatchup, setAdminDbMock } from './grader';

const createMockTransaction = (updates: any = {}, gets: any = {}) => {
  return {
    get: vi.fn().mockImplementation((ref) => {
      const path = ref.path || ref.id;
      if (gets[path]) {
        return Promise.resolve({ exists: true, data: () => gets[path], ref });
      }
      return Promise.resolve({ exists: false, data: () => null, ref });
    }),
    update: vi.fn((ref, data) => {
      updates[ref.path || ref.id] = data;
    }),
    set: vi.fn((ref, data, opts) => {
      updates[ref.path || ref.id] = data;
    }),
  };
};

describe('grader additional edge cases', () => {
  let mockAdminDb: any;
  let updates: any = {};
  let pickData: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    updates = {};

    pickData = {
      userId: 'user1',
      links: 10,
      status: 'PENDING',
      pick: { id: 'away' }
    };

    mockAdminDb = {
      collection: vi.fn((colName) => {
        if (colName === 'picks') {
          return {
            where: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: [
                {
                  id: 'pick1',
                  ref: { id: 'pick1', path: 'picks/pick1' },
                  data: () => pickData
                }
              ]
            })
          };
        }
        if (colName === 'achievements' || colName === 'shopItems') {
           return {
             where: vi.fn().mockReturnThis(),
             get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
           };
        }
        return {
          doc: vi.fn((docId) => ({ id: docId, path: `${colName}/${docId}` })),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
        };
      }),
      runTransaction: vi.fn(async (cb) => {
        const gets = {
          'picks/pick1': pickData,
          'users/user1': {
            links: 100,
            stats: { wins: 0, losses: 0, pushes: 0 }
          },
          'chains/user1_current': {
            chain: 0, wins: 0, losses: 0, best: 0, allTimeBest: 0
          }
        };
        const t = createMockTransaction(updates, gets);
        await cb(t);
      }),
    };

    setAdminDbMock(mockAdminDb);
  });

  it('should ignore if pick is no longer PENDING', async () => {
    pickData.status = 'CANCELLED';
    const matchup = {
      gameId: 'game1',
      status: 'STATUS_FINAL',
      type: 'MONEYLINE',
      homeTeam: { id: 'home', score: 10 },
      awayTeam: { id: 'away', score: 20 },
      reward: 10
    };

    await gradeSingleMatchup(matchup);

    expect(updates['picks/pick1']).toBeUndefined();
  });

  it('should ignore if user does not exist', async () => {
    mockAdminDb.runTransaction = vi.fn(async (cb: any) => {
      const gets = {
        'picks/pick1': pickData,
      }; // user1 not in gets
      const t = createMockTransaction(updates, gets);
      await cb(t);
    });

    const matchup = {
      gameId: 'game1',
      status: 'STATUS_FINAL',
      type: 'MONEYLINE',
      homeTeam: { id: 'home', score: 10 },
      awayTeam: { id: 'away', score: 20 },
      reward: 10
    };

    await gradeSingleMatchup(matchup);

    expect(updates['users/user1']).toBeUndefined();
  });

  it('should handle lowerScoreWins', async () => {
    pickData.pick.id = 'home';
    const matchup = {
      gameId: 'game1',
      status: 'STATUS_FINAL',
      type: 'MONEYLINE',
      metadata: { lowerScoreWins: true },
      homeTeam: { id: 'home', score: 68 },
      awayTeam: { id: 'away', score: 72 },
      reward: 10
    };

    await gradeSingleMatchup(matchup);

    expect(updates['picks/pick1'].status).toBe('WIN'); // Home has lower score, so home wins. User picked home.
  });

});
