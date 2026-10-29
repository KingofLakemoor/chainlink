import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getScheduleEndpoints, scrapeLeagueSchedules, fetchMatchups } from './espnScraper';

describe('espnScraper - NBA/NHL Endpoint and NBA ATS Conversion Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getScheduleEndpoints', () => {
    it('returns array of site.api.espn.com scoreboard URLs for NBA and NHL on full syncs', () => {
      const nbaEndpoints = getScheduleEndpoints('NBA', false);
      expect(nbaEndpoints.length).toBeGreaterThan(10);
      expect(nbaEndpoints[0]).toContain('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=');
      expect(nbaEndpoints.some(url => url.includes('cdn.espn.com'))).toBe(false);

      const nhlEndpoints = getScheduleEndpoints('NHL', false);
      expect(nhlEndpoints.length).toBeGreaterThan(10);
      expect(nhlEndpoints[0]).toContain('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=');
      expect(nhlEndpoints.some(url => url.includes('cdn.espn.com'))).toBe(false);
    });

    it('returns 4 dates (-1 to +2) for scoreboardOnly fast syncs', () => {
      const nbaEndpoints = getScheduleEndpoints('NBA', true);
      expect(nbaEndpoints).toHaveLength(4);
      expect(nbaEndpoints[0]).toContain('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=');

      const nhlEndpoints = getScheduleEndpoints('NHL', true);
      expect(nhlEndpoints).toHaveLength(4);
      expect(nhlEndpoints[0]).toContain('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=');
    });
  });

  describe('scrapeLeagueSchedules - NBA ATS spread fallback logic', () => {
    it('activates NBA game as SCORE when moneyline odds meet threshold', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'nba_game_1',
            date: '2026-10-30T23:00:00Z',
            competitions: [
              {
                id: 'nba_game_1',
                date: '2026-10-30T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EDT' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Celtics', displayName: 'Boston Celtics', shortDisplayName: 'BOS' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Knicks', displayName: 'New York Knicks', shortDisplayName: 'NYK' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-150' } },
                      away: { close: { odds: '+130' } }
                    },
                    spread: '-3.5'
                  }
                ]
              }
            ]
          }
        ]
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockScoreboardData
      } as Response);

      const res = await scrapeLeagueSchedules('NBA', true, { maxMoneylineOdds: 300 }, ['20261030']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(true);
      expect(game.type).toBe('SCORE');
      expect(game.gameId).toBe('nba_game_1');
    });

    it('converts NBA game to SPREAD (ATS) when moneyline exceeds threshold but spread <= 9.5', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'nba_game_high_ml',
            date: '2026-10-30T23:00:00Z',
            competitions: [
              {
                id: 'nba_game_high_ml',
                date: '2026-10-30T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EDT' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Lakers', displayName: 'Los Angeles Lakers', shortDisplayName: 'LAL' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Wizards', displayName: 'Washington Wizards', shortDisplayName: 'WAS' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-450' } },
                      away: { close: { odds: '+350' } }
                    },
                    spread: '-6.5'
                  }
                ]
              }
            ]
          }
        ]
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockScoreboardData
      } as Response);

      const res = await scrapeLeagueSchedules('NBA', true, { maxMoneylineOdds: 300 }, ['20261030']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(true);
      expect(game.type).toBe('SPREAD');
      expect(game.metadata.spread).toBe('-6.5');
    });

    it('deactivates NBA game when moneyline exceeds threshold and spread > 9.5', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'nba_game_blowout',
            date: '2026-10-30T23:00:00Z',
            competitions: [
              {
                id: 'nba_game_blowout',
                date: '2026-10-30T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EDT' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Celtics', displayName: 'Boston Celtics', shortDisplayName: 'BOS' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Nets', displayName: 'Brooklyn Nets', shortDisplayName: 'BKN' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-650' } },
                      away: { close: { odds: '+475' } }
                    },
                    spread: '-12.5'
                  }
                ]
              }
            ]
          }
        ]
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockScoreboardData
      } as Response);

      const res = await scrapeLeagueSchedules('NBA', true, { maxMoneylineOdds: 300 }, ['20261030']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(false);
      expect(game.type).toBe('SCORE');
    });

    it('activates NBA game as SPREAD when moneyline is missing (NaN) but spread <= 9.5', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'nba_game_no_ml',
            date: '2026-10-30T23:00:00Z',
            competitions: [
              {
                id: 'nba_game_no_ml',
                date: '2026-10-30T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EDT' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Heat', displayName: 'Miami Heat', shortDisplayName: 'MIA' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Bulls', displayName: 'Chicago Bulls', shortDisplayName: 'CHI' }, score: '0' }
                ],
                odds: [
                  {
                    spread: '-4.5'
                  }
                ]
              }
            ]
          }
        ]
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockScoreboardData
      } as Response);

      const res = await scrapeLeagueSchedules('NBA', true, { maxMoneylineOdds: 300 }, ['20261030']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(true);
      expect(game.type).toBe('SPREAD');
      expect(game.metadata.spread).toBe('-4.5');
    });
  });
});
