import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradeSinglePickemMatchup, setAdminDbMock } from './pickemGrader';

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

describe('pickemGrader', () => {
  let mockAdminDb: any;
  let updates: any = {};
  let pickData: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    updates = {};

    pickData = {
      userId: 'user1',
      status: 'PENDING',
      pick: { teamId: 'home' } // Note pickem uses pick.teamId
    };

    mockAdminDb = {
      collection: vi.fn((colName) => {
        if (colName === 'pickemPicks') {
          return {
            where: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: [
                {
                  id: 'pick1',
                  ref: { id: 'pick1', path: 'pickemPicks/pick1' },
                  data: () => pickData
                }
              ]
            })
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
          'pickemPicks/pick1': pickData,
        };
        const t = createMockTransaction(updates, gets);
        await cb(t);
      }),
    };

    setAdminDbMock(mockAdminDb);
  });

  it('should grade a win correctly', async () => {
    const matchup = {
      id: 'game1',
      status: 'STATUS_FINAL',
      type: 'MONEYLINE',
      homeTeam: { id: 'home', score: 20 },
      awayTeam: { id: 'away', score: 10 },
    };

    await gradeSinglePickemMatchup(matchup);

    expect(updates['pickemPicks/pick1']).toBeDefined();
    expect(updates['pickemPicks/pick1'].status).toBe('WIN');
    expect(updates['pickemPicks/pick1'].pointsEarned).toBe(1);
  });

  it('should grade a loss correctly', async () => {
    const matchup = {
      id: 'game1',
      status: 'STATUS_FINAL',
      type: 'MONEYLINE',
      homeTeam: { id: 'home', score: 10 },
      awayTeam: { id: 'away', score: 20 },
    };

    await gradeSinglePickemMatchup(matchup);

    expect(updates['pickemPicks/pick1']).toBeDefined();
    expect(updates['pickemPicks/pick1'].status).toBe('LOSS');
    expect(updates['pickemPicks/pick1'].pointsEarned).toBe(0);
  });

  it('should grade a push correctly on tie', async () => {
    const matchup = {
      id: 'game1',
      status: 'STATUS_FINAL',
      type: 'MONEYLINE',
      homeTeam: { id: 'home', score: 20 },
      awayTeam: { id: 'away', score: 20 },
    };

    await gradeSinglePickemMatchup(matchup);

    expect(updates['pickemPicks/pick1']).toBeDefined();
    expect(updates['pickemPicks/pick1'].status).toBe('PUSH');
    expect(updates['pickemPicks/pick1'].pointsEarned).toBe(0);
  });

  it('should ignore if pick is no longer PENDING', async () => {
    pickData.status = 'CANCELLED';
    const matchup = {
      id: 'game1',
      status: 'STATUS_FINAL',
      type: 'MONEYLINE',
      homeTeam: { id: 'home', score: 10 },
      awayTeam: { id: 'away', score: 20 },
    };

    await gradeSinglePickemMatchup(matchup);

    expect(updates['pickemPicks/pick1']).toBeUndefined();
  });

});
