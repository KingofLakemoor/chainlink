import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSharpApiTennisComparison, clearSharpApiCache } from './sharpApiFallback';

describe('SharpAPI Tennis Comparison Service', () => {
  beforeEach(() => {
    clearSharpApiCache();
    delete process.env.SHARP_API_KEY;
  });

  it('returns error when SHARP_API_KEY is not configured', async () => {
    const mockDb = null;
    const result = await getSharpApiTennisComparison(mockDb);
    expect(result).toEqual({
      success: false,
      error: 'SHARP_API_KEY is missing or unconfigured.',
    });
  });

  it('fetches ATP & WTA slates, matches DB matchups, and categorizes matched, sharpOnly, and dbOnly items', async () => {
    process.env.SHARP_API_KEY = 'test-sharp-key';

    const mockAtpData = [
      {
        id: 'atp_event_1',
        home_team: { name: 'Jannik Sinner' },
        away_team: { name: 'Carlos Alcaraz' },
        start_time: '2025-09-10T20:00:00Z',
        markets: [
          {
            market_type: 'moneyline',
            lines: [
              { is_home: true, team_name: 'Jannik Sinner', odds: '-150' },
              { is_home: false, team_name: 'Carlos Alcaraz', odds: '+125' },
            ],
          },
        ],
      },
      {
        id: 'atp_event_2',
        home_team: { name: 'Novak Djokovic' },
        away_team: { name: 'Daniil Medvedev' },
        start_time: '2025-09-10T22:00:00Z',
        markets: [
          {
            market_type: 'moneyline',
            lines: [
              { is_home: true, team_name: 'Novak Djokovic', odds: '-200' },
              { is_home: false, team_name: 'Daniil Medvedev', odds: '+160' },
            ],
          },
        ],
      },
    ];

    const mockWtaData = [
      {
        id: 'wta_event_1',
        home_team: { name: 'Iga Swiatek' },
        away_team: { name: 'Aryna Sabalenka' },
        start_time: '2025-09-10T21:00:00Z',
        markets: [
          {
            market_type: 'moneyline',
            lines: [
              { is_home: true, team_name: 'Iga Swiatek', odds: '-140' },
              { is_home: false, team_name: 'Aryna Sabalenka', odds: '+115' },
            ],
          },
        ],
      },
    ];

    // Mock fetch responses for ATP and WTA calls
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/odds?league=atp')) {
        return { ok: true, json: async () => ({ data: mockAtpData }) } as Response;
      }
      if (urlStr.includes('/odds?league=wta')) {
        return { ok: true, json: async () => ({ data: mockWtaData }) } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    // Mock DB with 2 ATP matchups:
    // Match 1: Jannik Sinner vs Carlos Alcaraz (Matches atp_event_1)
    // Match 2: Alexander Zverev vs Stefanos Tsitsipas (DB only)
    const mockDbMatchups = [
      {
        id: 'db_match_1',
        league: 'ATP',
        homeTeam: { name: 'J. Sinner' },
        awayTeam: { name: 'C. Alcaraz' },
        metadata: { mlHome: -145, mlAway: +120 },
        active: true,
        abandoned: false,
        startTime: '2025-09-10T20:00:00Z',
      },
      {
        id: 'db_match_2',
        league: 'ATP',
        homeTeam: { name: 'Alexander Zverev' },
        awayTeam: { name: 'Stefanos Tsitsipas' },
        metadata: { mlHome: -110, mlAway: -110 },
        active: true,
        abandoned: false,
        startTime: '2025-09-10T23:00:00Z',
      },
    ];

    const mockAdminDb = {
      collection: (colName: string) => {
        if (colName === 'matchups') {
          return {
            where: () => ({
              where: () => ({
                get: async () => ({
                  docs: mockDbMatchups.map(m => ({
                    id: m.id,
                    data: () => m,
                  })),
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const comparison = await getSharpApiTennisComparison(mockAdminDb);

    expect(comparison.success).toBe(true);
    expect(comparison.summary).toEqual({
      totalSharpApiEvents: 3,
      atpSharpApiEvents: 2,
      wtaSharpApiEvents: 1,
      totalDbMatchups: 2,
      matchedCount: 1,
      sharpOnlyCount: 2,
      dbOnlyCount: 1,
    });

    // Check matched items
    expect(comparison.matched.length).toBe(1);
    expect(comparison.matched[0].sharpApiId).toBe('atp_event_1');
    expect(comparison.matched[0].dbId).toBe('db_match_1');
    expect(comparison.matched[0].sharpApiHomeMl).toBe(-150);
    expect(comparison.matched[0].sharpApiAwayMl).toBe(125);
    expect(comparison.matched[0].dbHomeMl).toBe(-145);
    expect(comparison.matched[0].dbAwayMl).toBe(120);

    // Check sharpOnly items (Djokovic vs Medvedev & Swiatek vs Sabalenka)
    expect(comparison.sharpOnly.length).toBe(2);

    // Check dbOnly items (Zverev vs Tsitsipas)
    expect(comparison.dbOnly.length).toBe(1);
    expect(comparison.dbOnly[0].dbId).toBe('db_match_2');

    // Check raw payloads
    expect(comparison.rawPayloads.atp).toEqual(mockAtpData);
    expect(comparison.rawPayloads.wta).toEqual(mockWtaData);

    vi.restoreAllMocks();
  });
});
