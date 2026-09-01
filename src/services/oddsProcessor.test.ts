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
});
