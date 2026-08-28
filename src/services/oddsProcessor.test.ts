import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncTennisOdds, syncSoccerOdds, setAdminDbMock } from './oddsProcessor';

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
});
