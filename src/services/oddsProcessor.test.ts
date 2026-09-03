import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncTennisOdds, syncSoccerOdds, setAdminDbMock } from './oddsProcessor';
import fetch from 'node-fetch';

vi.mock('node-fetch', async () => {
  const actual = await vi.importActual<any>('node-fetch');
  return {
    ...actual,
    default: vi.fn(),
  };
});

describe('OddsProcessor Optimization Tests', () => {
  let mockAdminDb: any;

  beforeEach(() => {
    delete process.env.ODDS_API_KEY;
    mockAdminDb = {
      collection: vi.fn(),
      batch: vi.fn(),
    };
    setAdminDbMock(mockAdminDb);
  });

  it('syncTennisOdds skips if ODDS_API_KEY is missing', async () => {
    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, message: 'ODDS_API_KEY missing, skipping.' });
  });

  it('syncSoccerOdds skips if ODDS_API_KEY is missing', async () => {
    const res = await syncSoccerOdds();
    expect(res).toEqual({ success: true, message: 'ODDS_API_KEY missing, skipping.' });
  });

  it('syncTennisOdds skips external calls when DB matchups are empty', async () => {
    process.env.ODDS_API_KEY = 'test-key';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (collName === 'matchups') {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({ empty: true, docs: [] }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, message: 'No scheduled tennis matches in DB.' });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('syncSoccerOdds skips API fetch for leagues with no scheduled matchups', async () => {
    process.env.ODDS_API_KEY = 'test-key';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (collName === 'matchups') {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({ empty: true, docs: [] }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await syncSoccerOdds();
    expect(res).toEqual({ success: true, updated: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('syncTennisOdds marks unmatched tennis matchups as active: false and abandoned: true when no picks exist', async () => {
    process.env.ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'match1',
      data: () => ({
        league: 'ATP',
        active: true,
        homeTeam: { name: 'Player A' },
        awayTeam: { name: 'Player B' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (collName === 'matchups') {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({ empty: false, docs: [mockMatchupDoc] }),
            }),
          }),
          doc: () => 'match1Ref',
        };
      }
      if (collName === 'picks' || collName === 'pickemPicks') {
        return {
          where: () => ({
            limit: () => ({
              get: async () => ({ empty: true }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/v4/sports/?')) {
        return {
          ok: true,
          json: async () => [{ key: 'tennis_atp_test', active: true }],
        } as any;
      }
      if (urlStr.includes('/v4/sports/tennis_atp_test/odds/?')) {
        return {
          ok: true,
          json: async () => [],
        } as any;
      }
      return { ok: false, text: async () => 'error' } as any;
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, updatedCount: 0 });
    expect(mockBatch.update).toHaveBeenCalledWith('match1Ref', {
      active: false,
      abandoned: true,
      updatedAt: expect.any(Number),
    });
  });

  it('syncTennisOdds activates valid matched odds and resets abandoned: false', async () => {
    process.env.ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'match1',
      data: () => ({
        gameId: 'game123',
        league: 'ATP',
        active: false,
        abandoned: true,
        homeTeam: { name: 'Taylor Fritz' },
        awayTeam: { name: 'Mattia Bellucci' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (collName === 'matchups') {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({ empty: false, docs: [mockMatchupDoc] }),
            }),
          }),
          doc: () => 'match1Ref',
        };
      }
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/v4/sports/?')) {
        return {
          ok: true,
          json: async () => [{ key: 'tennis_atp_us_open', active: true }],
        } as any;
      }
      if (urlStr.includes('/v4/sports/tennis_atp_us_open/odds/?')) {
        return {
          ok: true,
          json: async () => [
            {
              home_team: 'Taylor Fritz',
              away_team: 'Mattia Bellucci',
              bookmakers: [
                {
                  key: 'draftkings',
                  markets: [
                    {
                      key: 'h2h',
                      outcomes: [
                        { name: 'Taylor Fritz', price: -200 },
                        { name: 'Mattia Bellucci', price: 160 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        } as any;
      }
      return { ok: false, text: async () => 'error' } as any;
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, updatedCount: 1 });
    expect(mockBatch.update).toHaveBeenCalledWith('match1Ref', {
      'metadata.mlHome': -200,
      'metadata.mlAway': 160,
      active: true,
      abandoned: false,
      updatedAt: expect.any(Number),
    });
  });

  it('syncTennisOdds preserves active state when picks exist under gameId', async () => {
    process.env.ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'docId123',
      data: () => ({
        gameId: 'gameId456',
        league: 'ATP',
        active: true,
        homeTeam: { name: 'Player A' },
        awayTeam: { name: 'Player B' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') {
        return {
          doc: () => ({
            get: async () => ({ exists: false }),
          }),
        };
      }
      if (collName === 'matchups') {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({ empty: false, docs: [mockMatchupDoc] }),
            }),
          }),
          doc: () => 'doc1Ref',
        };
      }
      if (collName === 'picks') {
        return {
          where: (field: string, op: string, val: any) => ({
            limit: () => ({
              get: async () => {
                // If val contains gameId456 or docId123, return pick doc
                if (Array.isArray(val) && (val.includes('gameId456') || val.includes('docId123'))) {
                  return { empty: false, docs: [{ id: 'pick1' }] };
                }
                return { empty: true };
              },
            }),
          }),
        };
      }
      if (collName === 'pickemPicks') {
        return {
          where: () => ({
            limit: () => ({
              get: async () => ({ empty: true }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/v4/sports/?')) {
        return {
          ok: true,
          json: async () => [{ key: 'tennis_atp_test', active: true }],
        } as any;
      }
      if (urlStr.includes('/v4/sports/tennis_atp_test/odds/?')) {
        return {
          ok: true,
          json: async () => [], // No Odds API match found
        } as any;
      }
      return { ok: false, text: async () => 'error' } as any;
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, updatedCount: 0 });
    // Should NOT mark doc1Ref as inactive because a pick exists under gameId456
    expect(mockBatch.update).not.toHaveBeenCalledWith('doc1Ref', expect.objectContaining({ active: false }));
  });
});
