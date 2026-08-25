import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cleanTeamName, teamsMatch, ESPN_TO_ODDS_API_SPORT, ESPN_TO_SHARP_API_LEAGUE } from '../utils/sportMapping';
import { extractEspnOdds } from './espnParser';
import { matchAndFetchOddsApiFallback, clearOddsApiCache } from './oddsApiFallback';
import { matchAndFetchSharpApiFallback, clearSharpApiCache } from './sharpApiFallback';
import { resolveGameOdds, syncActiveSlate } from './oddsResolver';

describe('Sport Mapping & Name Normalizer', () => {
  it('cleanTeamName should normalize team names properly', () => {
    expect(cleanTeamName('Kansas City Chiefs')).toBe('kansas city chiefs');
    expect(cleanTeamName('LA Lakers')).toBe('lakers');
    expect(cleanTeamName('N.Y. Yankees')).toBe('yankees');
    expect(cleanTeamName('St. Louis Cardinals')).toBe('louis cardinals');
    expect(cleanTeamName('Saint Mary\'s')).toBe('marys');
    expect(cleanTeamName('Ft. Lauderdale')).toBe('lauderdale');
  });

  it('teamsMatch should fuzzy match equivalent team names', () => {
    expect(teamsMatch('Kansas City Chiefs', 'Chiefs')).toBe(true);
    expect(teamsMatch('LA Lakers', 'Los Angeles Lakers')).toBe(true);
    expect(teamsMatch('Boston Celtics', 'Miami Heat')).toBe(false);
    expect(teamsMatch('', 'Boston Celtics')).toBe(false);
  });

  it('contains expected league mappings', () => {
    expect(ESPN_TO_ODDS_API_SPORT['nfl']).toBe('americanfootball_nfl');
    expect(ESPN_TO_ODDS_API_SPORT['nba']).toBe('basketball_nba');
    expect(ESPN_TO_SHARP_API_LEAGUE['nfl']).toBe('nfl');
    expect(ESPN_TO_SHARP_API_LEAGUE['epl']).toBe('epl');
  });
});

describe('Tier 1: ESPN Odds Parser', () => {
  it('extracts embedded ESPN spread, favorite, overUnder and moneyline', () => {
    const competition = {
      competitors: [
        { id: '1', homeAway: 'home', team: { abbreviation: 'KC' }, odds: { moneyline: -180 } },
        { id: '2', homeAway: 'away', team: { abbreviation: 'BAL' }, odds: { moneyline: +150 } },
      ],
      odds: [
        {
          details: 'KC -3.5',
          overUnder: 47.5,
        },
      ],
    };

    const parsed = extractEspnOdds(competition);
    expect(parsed).toEqual({
      spread: -3.5,
      favoriteTeamId: '1',
      overUnder: 47.5,
      homeMoneyline: -180,
      awayMoneyline: +150,
      lineSummary: 'KC -3.5',
      provider: 'espn',
    });
  });

  it('handles PK or EVEN spreads', () => {
    const competition = {
      competitors: [
        { id: '10', homeAway: 'home', team: { abbreviation: 'PHI' } },
        { id: '20', homeAway: 'away', team: { abbreviation: 'DAL' } },
      ],
      odds: [
        {
          details: 'EVEN',
          overUnder: 44.0,
        },
      ],
    };

    const parsed = extractEspnOdds(competition);
    expect(parsed?.spread).toBe(0);
    expect(parsed?.provider).toBe('espn');
  });

  it('returns null if odds array is missing or empty', () => {
    expect(extractEspnOdds({})).toBeNull();
    expect(extractEspnOdds({ odds: [] })).toBeNull();
  });
});

describe('Tier 2: The Odds API Fallback', () => {
  beforeEach(() => {
    clearOddsApiCache();
    delete process.env.THE_ODDS_API_KEY;
  });

  it('returns null if THE_ODDS_API_KEY is not configured', async () => {
    const game = {
      date: '2025-09-10T20:00:00Z',
      competitions: [{
        date: '2025-09-10T20:00:00Z',
        competitors: [
          { homeAway: 'home', id: '1', team: { displayName: 'Kansas City Chiefs' } },
          { homeAway: 'away', id: '2', team: { displayName: 'Baltimore Ravens' } },
        ]
      }]
    };
    const result = await matchAndFetchOddsApiFallback(game, 'nfl');
    expect(result).toBeNull();
  });

  it('fetches and matches game odds when API key is provided', async () => {
    process.env.THE_ODDS_API_KEY = 'test-key';

    const mockSlate = [
      {
        commence_time: '2025-09-10T20:00:00Z',
        home_team: 'Kansas City Chiefs',
        away_team: 'Baltimore Ravens',
        bookmakers: [
          {
            key: 'draftkings',
            markets: [
              {
                key: 'spreads',
                outcomes: [
                  { name: 'Kansas City Chiefs', point: -3.5 },
                  { name: 'Baltimore Ravens', point: +3.5 },
                ],
              },
              {
                key: 'totals',
                outcomes: [{ name: 'Over', point: 48.5 }],
              },
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Kansas City Chiefs', price: -175 },
                  { name: 'Baltimore Ravens', price: +145 },
                ],
              },
            ],
          },
        ],
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockSlate,
    } as Response);

    const game = {
      date: '2025-09-10T20:00:00Z',
      competitions: [{
        date: '2025-09-10T20:00:00Z',
        competitors: [
          { homeAway: 'home', id: '1', team: { displayName: 'Kansas City Chiefs' } },
          { homeAway: 'away', id: '2', team: { displayName: 'Baltimore Ravens' } },
        ]
      }]
    };

    const result = await matchAndFetchOddsApiFallback(game, 'nfl');
    expect(result).toEqual({
      spread: -3.5,
      favoriteTeamId: '1',
      overUnder: 48.5,
      homeMoneyline: -175,
      awayMoneyline: +145,
      provider: 'the-odds-api',
      lineSummary: '-3.5',
    });

    vi.restoreAllMocks();
  });
});

describe('Tier 3: SharpAPI Fallback', () => {
  beforeEach(() => {
    clearSharpApiCache();
    delete process.env.SHARP_API_KEY;
  });

  it('returns null if SHARP_API_KEY is missing', async () => {
    const game = {
      date: '2025-09-10T20:00:00Z',
      competitions: [{
        date: '2025-09-10T20:00:00Z',
        competitors: [
          { homeAway: 'home', id: '1', team: { displayName: 'Kansas City Chiefs' } },
          { homeAway: 'away', id: '2', team: { displayName: 'Baltimore Ravens' } },
        ]
      }]
    };
    const result = await matchAndFetchSharpApiFallback(game, 'nfl');
    expect(result).toBeNull();
  });

  it('fetches and matches SharpAPI game lines', async () => {
    process.env.SHARP_API_KEY = 'sharp-key';

    const mockSharpData = {
      data: [
        {
          start_time: '2025-09-10T20:00:00Z',
          home_team: { name: 'Kansas City Chiefs' },
          away_team: { name: 'Baltimore Ravens' },
          markets: [
            {
              market_type: 'spread',
              lines: [
                { is_home: true, team_name: 'Kansas City Chiefs', spread: '-3.0' },
                { is_home: false, team_name: 'Baltimore Ravens', spread: '+3.0' },
              ],
            },
            {
              market_type: 'total',
              lines: [{ total: '47.0' }],
            },
            {
              market_type: 'moneyline',
              lines: [
                { is_home: true, odds: '-165' },
                { is_home: false, odds: '+140' },
              ],
            },
          ],
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockSharpData,
    } as Response);

    const game = {
      date: '2025-09-10T20:00:00Z',
      competitions: [{
        date: '2025-09-10T20:00:00Z',
        competitors: [
          { homeAway: 'home', id: '1', team: { displayName: 'Kansas City Chiefs' } },
          { homeAway: 'away', id: '2', team: { displayName: 'Baltimore Ravens' } },
        ]
      }]
    };

    const result = await matchAndFetchSharpApiFallback(game, 'nfl');
    expect(result).toEqual({
      spread: -3,
      favoriteTeamId: '1',
      overUnder: 47,
      homeMoneyline: -165,
      awayMoneyline: 140,
      provider: 'sharp-api',
      lineSummary: '-3',
    });

    vi.restoreAllMocks();
  });
});

describe('Master Fallback Controller (oddsResolver)', () => {
  beforeEach(() => {
    delete process.env.THE_ODDS_API_KEY;
    delete process.env.SHARP_API_KEY;
  });

  it('uses ESPN odds if present (Tier 1)', async () => {
    const game = {
      competitions: [{
        competitors: [
          { id: '1', homeAway: 'home', team: { abbreviation: 'KC' }, odds: { moneyline: -150 } },
          { id: '2', homeAway: 'away', team: { abbreviation: 'BUF' }, odds: { moneyline: +130 } },
        ],
        odds: [{ details: 'KC -2.5', overUnder: 50.5 }],
      }]
    };

    const odds = await resolveGameOdds(game, 'nfl');
    expect(odds.provider).toBe('espn');
    expect(odds.spread).toBe(-2.5);
  });

  it('falls back to Tier 4 ("none") if no external keys and no ESPN odds', async () => {
    const game = {
      competitions: [{
        competitors: [
          { id: '1', homeAway: 'home', team: { displayName: 'Team A' } },
          { id: '2', homeAway: 'away', team: { displayName: 'Team B' } },
        ],
      }]
    };

    const odds = await resolveGameOdds(game, 'nfl');
    expect(odds.provider).toBe('none');
    expect(odds.spread).toBeNull();
    expect(odds.homeMoneyline).toBeNull();
  });

  it('syncActiveSlate normalizes full scoreboard into StandardGame array', async () => {
    const mockEspnScoreboard = {
      events: [
        {
          id: '1001',
          name: 'Baltimore Ravens at Kansas City Chiefs',
          date: '2025-09-10T20:00:00Z',
          status: { type: { state: 'pre' } },
          competitions: [
            {
              competitors: [
                { id: '1', homeAway: 'home', team: { displayName: 'Kansas City Chiefs', abbreviation: 'KC' }, score: '0' },
                { id: '2', homeAway: 'away', team: { displayName: 'Baltimore Ravens', abbreviation: 'BAL' }, score: '0' },
              ],
              odds: [{ details: 'KC -3.5', overUnder: 47.5 }],
            },
          ],
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockEspnScoreboard,
    } as Response);

    const games = await syncActiveSlate('nfl');
    expect(games.length).toBe(1);
    expect(games[0]).toEqual({
      id: '1001',
      sport: 'nfl',
      name: 'Baltimore Ravens at Kansas City Chiefs',
      startTime: '2025-09-10T20:00:00Z',
      status: 'pre',
      homeTeam: {
        id: '1',
        name: 'Kansas City Chiefs',
        abbreviation: 'KC',
        score: 0,
      },
      awayTeam: {
        id: '2',
        name: 'Baltimore Ravens',
        abbreviation: 'BAL',
        score: 0,
      },
      odds: {
        spread: -3.5,
        favoriteTeamId: '1',
        overUnder: 47.5,
        homeMoneyline: null,
        awayMoneyline: null,
        lineSummary: 'KC -3.5',
        provider: 'espn',
      },
    });

    vi.restoreAllMocks();
  });
});
