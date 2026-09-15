import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncTennisOdds, syncSoccerOdds, setAdminDbMock } from './oddsProcessor';

describe('OddsProcessor Optimization Tests', () => {
  let mockAdminDb: any;

  let fetchSpy: any;

  beforeEach(() => {
    delete process.env.ODDS_API_KEY;
    delete process.env.THE_ODDS_API_KEY;
    delete process.env.SHARP_API_KEY;
    mockAdminDb = {
      collection: vi.fn(),
      batch: vi.fn(),
    };
    setAdminDbMock(mockAdminDb);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('syncTennisOdds matches games using SHARP_API_KEY when Odds API is unconfigured', async () => {
    process.env.SHARP_API_KEY = 'test-sharp-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'matchSharp1',
      data: () => ({
        gameId: 'gameSharp123',
        league: 'ATP',
        active: false,
        abandoned: true,
        homeTeam: { name: 'Jannik Sinner' },
        awayTeam: { name: 'Carlos Alcaraz' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return { where: () => ({ where: () => ({ get: async () => ({ empty: false, docs: [mockMatchupDoc] }) }) }), doc: () => 'matchSharpRef' };
      return {};
    });

    fetchSpy.mockImplementation(async (url: any, opts: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('api.sharpapi.io/api/v1/odds?league=atp')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                home_team: 'Jannik Sinner',
                away_team: 'Carlos Alcaraz',
                markets: [
                  {
                    market_type: 'moneyline',
                    lines: [
                      { is_home: true, team_name: 'Jannik Sinner', odds: '-140' },
                      { is_home: false, team_name: 'Carlos Alcaraz', odds: '+115' },
                    ],
                  },
                ],
              },
            ],
          }),
        } as any;
      }
      return { ok: true, json: async () => [] } as any;
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, updatedCount: 1 });
    expect(mockBatch.update).toHaveBeenCalledWith('matchSharpRef', {
      'metadata.mlHome': -140,
      'metadata.mlAway': 115,
      active: true,
      abandoned: false,
      updatedAt: expect.any(Number),
    });
  });

  it('syncSoccerOdds matches games using SHARP_API_KEY when Odds API is unconfigured', async () => {
    process.env.SHARP_API_KEY = 'test-sharp-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'soccerSharp1',
      data: () => ({
        gameId: 'gameSoccerSharp123',
        league: 'RPL',
        active: false,
        abandoned: true,
        homeTeam: { name: 'Zenit St Petersburg' },
        awayTeam: { name: 'Spartak Moscow' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return {
        where: () => ({
          where: () => ({
            get: async () => ({ empty: false, docs: [mockMatchupDoc] })
          })
        }),
        doc: () => 'soccerSharpRef'
      };
      if (collName === 'picks' || collName === 'pickemPicks') {
        return { where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }) };
      }
      return {};
    });

    fetchSpy.mockImplementation(async (url: any, opts: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('api.sharpapi.io/api/v1/odds?league=rpl')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                home_team: 'Zenit St Petersburg',
                away_team: 'Spartak Moscow',
                markets: [
                  {
                    market_type: 'moneyline',
                    lines: [
                      { is_home: true, odds: '-130' },
                      { is_home: false, odds: '+105' },
                    ],
                  },
                ],
              },
            ],
          }),
        } as any;
      }
      return { ok: true, json: async () => [] } as any;
    });

    const res = await syncSoccerOdds();
    expect(res).toEqual({ success: true, updated: 1 });
    expect(mockBatch.update).toHaveBeenCalledWith('soccerSharpRef', {
      'metadata.mlHome': -130,
      'metadata.mlAway': 105,
      active: true,
      abandoned: false,
      updatedAt: expect.any(Number),
    });
  });

  it('syncTennisOdds returns error if ODDS_API_KEY, THE_ODDS_API_KEY, and SHARP_API_KEY are missing', async () => {
    const res = await syncTennisOdds();
    expect(res).toEqual({ success: false, error: 'No odds API keys configured (THE_ODDS_API_KEY, ODDS_API_KEY, or SHARP_API_KEY missing).' });
  });

  it('syncTennisOdds accepts THE_ODDS_API_KEY if ODDS_API_KEY is missing', async () => {
    process.env.THE_ODDS_API_KEY = 'the-odds-key';

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return { where: () => ({ where: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) };
      return {};
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, message: 'No scheduled tennis matches in DB.' });
  });

  it('syncSoccerOdds returns error if ODDS_API_KEY, THE_ODDS_API_KEY, and SHARP_API_KEY are missing', async () => {
    const res = await syncSoccerOdds();
    expect(res).toEqual({ success: false, error: 'No odds API keys configured (THE_ODDS_API_KEY, ODDS_API_KEY, or SHARP_API_KEY missing).' });
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

    fetchSpy.mockImplementation(async (url: any) => {
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

  it('syncTennisOdds preserves active state when manuallyActivated is true', async () => {
    process.env.ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'docIdManual',
      data: () => ({
        gameId: 'gameIdManual',
        league: 'ATP',
        active: true,
        manuallyActivated: true,
        homeTeam: { name: 'Player M' },
        awayTeam: { name: 'Player N' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return { where: () => ({ where: () => ({ get: async () => ({ empty: false, docs: [mockMatchupDoc] }) }) }), doc: () => 'docManualRef' };
      if (collName === 'picks' || collName === 'pickemPicks') {
        return { where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }) };
      }
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/v4/sports/?')) {
        return { ok: true, json: async () => [{ key: 'tennis_atp_test', active: true }] } as any;
      }
      if (urlStr.includes('/v4/sports/tennis_atp_test/odds/?')) {
        return { ok: true, json: async () => [] } as any;
      }
      return { ok: false, text: async () => 'error' } as any;
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: true, updatedCount: 0 });
    expect(mockBatch.update).not.toHaveBeenCalledWith('docManualRef', expect.objectContaining({ active: false }));
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

  it('syncTennisOdds matches player initial formats (e.g., J. Sinner vs Jannik Sinner)', async () => {
    process.env.THE_ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'matchInitial1',
      data: () => ({
        gameId: 'gameInitial123',
        league: 'ATP',
        active: false,
        abandoned: true,
        homeTeam: { name: 'J. Sinner' },
        awayTeam: { name: 'C. Alcaraz' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return { where: () => ({ where: () => ({ get: async () => ({ empty: false, docs: [mockMatchupDoc] }) }) }), doc: () => 'matchInitialRef' };
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/v4/sports/?')) {
        return { ok: true, json: async () => [{ key: 'tennis_atp_test', active: true }] } as any;
      }
      if (urlStr.includes('/v4/sports/tennis_atp_test/odds/?')) {
        return {
          ok: true,
          json: async () => [
            {
              home_team: 'Jannik Sinner',
              away_team: 'Carlos Alcaraz',
              bookmakers: [
                {
                  key: 'draftkings',
                  markets: [
                    {
                      key: 'h2h',
                      outcomes: [
                        { name: 'Jannik Sinner', price: -110 },
                        { name: 'Carlos Alcaraz', price: -110 },
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
    expect(mockBatch.update).toHaveBeenCalledWith('matchInitialRef', {
      'metadata.mlHome': -110,
      'metadata.mlAway': -110,
      active: true,
      abandoned: false,
      updatedAt: expect.any(Number),
    });
  });

  it('syncTennisOdds returns error and does not abandon matchups when odds fetch fails for all sports', async () => {
    process.env.THE_ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockMatchupDoc = {
      id: 'matchErr1',
      data: () => ({
        gameId: 'gameErr123',
        league: 'ATP',
        active: true,
        abandoned: false,
        homeTeam: { name: 'Player X' },
        awayTeam: { name: 'Player Y' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return { where: () => ({ where: () => ({ get: async () => ({ empty: false, docs: [mockMatchupDoc] }) }) }), doc: () => 'matchErrRef' };
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/v4/sports/?')) {
        return { ok: true, json: async () => [{ key: 'tennis_atp_test', active: true }] } as any;
      }
      if (urlStr.includes('/v4/sports/tennis_atp_test/odds/?')) {
        return { ok: false, status: 500, text: async () => 'Internal Error' } as any;
      }
      return { ok: false, text: async () => 'error' } as any;
    });

    const res = await syncTennisOdds();
    expect(res).toEqual({ success: false, error: 'Could not fetch odds for any tennis sport' });
    expect(mockBatch.update).not.toHaveBeenCalled();
  });

  it('syncSoccerOdds matches RPL games, populates odds, and checks threshold', async () => {
    process.env.THE_ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockRplDoc = {
      id: 'rpl1',
      data: () => ({
        gameId: 'rpl123',
        league: 'RPL',
        active: false,
        abandoned: false,
        homeTeam: { name: 'Zenit St Petersburg' },
        awayTeam: { name: 'Spartak Moscow' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return {
        where: () => ({
          where: () => ({
            get: async () => ({ empty: false, docs: [mockRplDoc] })
          })
        }),
        doc: () => 'rpl1Ref'
      };
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('soccer_russia_premier_league')) {
        return {
          ok: true,
          json: async () => [
            {
              home_team: 'Zenit St Petersburg',
              away_team: 'Spartak Moscow',
              bookmakers: [
                {
                  key: 'draftkings',
                  markets: [
                    {
                      key: 'h2h',
                      outcomes: [
                        { name: 'Zenit St Petersburg', price: -150 },
                        { name: 'Spartak Moscow', price: 220 },
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

    const res = await syncSoccerOdds();
    expect(res).toEqual({ success: true, updated: 1 });
    expect(mockBatch.update).toHaveBeenCalledWith('rpl1Ref', {
      'metadata.mlHome': -150,
      'metadata.mlAway': 220,
      active: true,
      abandoned: false,
      updatedAt: expect.any(Number),
    });
  });

  it('syncSoccerOdds sets unmatched RPL games to active: false and abandoned: true', async () => {
    process.env.THE_ODDS_API_KEY = 'test-key';

    const mockBatch = {
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockAdminDb.batch.mockReturnValue(mockBatch);

    const mockUnmatchedRplDoc = {
      id: 'rpl_unmatched',
      data: () => ({
        gameId: 'rpl456',
        league: 'RPL',
        active: true,
        abandoned: false,
        homeTeam: { name: 'CSKA Moscow' },
        awayTeam: { name: 'FC Krasnodar' },
      }),
    };

    mockAdminDb.collection.mockImplementation((collName: string) => {
      if (collName === 'systemSettings') return { doc: () => ({ get: async () => ({ exists: false }) }) };
      if (collName === 'matchups') return {
        where: () => ({
          where: () => ({
            get: async () => ({ empty: false, docs: [mockUnmatchedRplDoc] })
          })
        }),
        doc: () => 'rplUnmatchedRef'
      };
      if (collName === 'picks' || collName === 'pickemPicks') {
        return { where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }) };
      }
      return {};
    });

    vi.mocked(fetch).mockImplementation(async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('soccer_russia_premier_league')) {
        return {
          ok: true,
          json: async () => [], // No matches returned from Odds API
        } as any;
      }
      return { ok: false, text: async () => 'error' } as any;
    });

    const res = await syncSoccerOdds();
    expect(res).toEqual({ success: true, updated: 0 });
    expect(mockBatch.update).toHaveBeenCalledWith('rplUnmatchedRef', {
      active: false,
      abandoned: true,
      updatedAt: expect.any(Number),
    });
  });
});
