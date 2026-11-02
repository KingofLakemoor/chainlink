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

    it('deactivates MBB game when odds are completely missing (not added to active board)', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'mbb_game_no_odds',
            date: '2026-11-15T23:00:00Z',
            competitions: [
              {
                id: 'mbb_game_no_odds',
                date: '2026-11-15T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EST' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Duke Blue Devils', displayName: 'Duke Blue Devils', shortDisplayName: 'DUKE' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Maine Black Bears', displayName: 'Maine Black Bears', shortDisplayName: 'MAINE' }, score: '0' }
                ],
                odds: []
              }
            ]
          }
        ]
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockScoreboardData
      } as Response);

      const res = await scrapeLeagueSchedules('MBB', true, { maxMoneylineOdds: 300 }, ['20261115']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(false);
      expect(game.type).toBe('SCORE');
    });

    it('activates MBB game when moneyline is within threshold', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'mbb_game_valid_ml',
            date: '2026-11-15T23:00:00Z',
            competitions: [
              {
                id: 'mbb_game_valid_ml',
                date: '2026-11-15T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EST' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Kansas Jayhawks', displayName: 'Kansas Jayhawks', shortDisplayName: 'KU' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Kentucky Wildcats', displayName: 'Kentucky Wildcats', shortDisplayName: 'UK' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-145' } },
                      away: { close: { odds: '+125' } }
                    },
                    spread: '-2.5'
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

      const res = await scrapeLeagueSchedules('MBB', true, { maxMoneylineOdds: 300 }, ['20261115']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(true);
      expect(game.type).toBe('SCORE');
    });

    it('converts MBB game to SPREAD (ATS) when moneyline exceeds threshold but spread <= 9.5', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'mbb_game_spread_fallback',
            date: '2026-11-15T23:00:00Z',
            competitions: [
              {
                id: 'mbb_game_spread_fallback',
                date: '2026-11-15T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EST' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Gonzaga Bulldogs', displayName: 'Gonzaga Bulldogs', shortDisplayName: 'GONZ' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Santa Clara Broncos', displayName: 'Santa Clara Broncos', shortDisplayName: 'SCU' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-450' } },
                      away: { close: { odds: '+340' } }
                    },
                    spread: '-7.5'
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

      const res = await scrapeLeagueSchedules('MBB', true, { maxMoneylineOdds: 300 }, ['20261115']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(true);
      expect(game.type).toBe('SPREAD');
      expect(game.metadata.spread).toBe('-7.5');
      expect(game.title).toContain('ATS');
    });

    it('deactivates MBB game when moneyline exceeds threshold and spread > 9.5', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'mbb_game_blowout',
            date: '2026-11-15T23:00:00Z',
            competitions: [
              {
                id: 'mbb_game_blowout',
                date: '2026-11-15T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EST' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'Purdue Boilermakers', displayName: 'Purdue Boilermakers', shortDisplayName: 'PUR' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Chicago State Cougars', displayName: 'Chicago State Cougars', shortDisplayName: 'CSU' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-2500' } },
                      away: { close: { odds: '+1400' } }
                    },
                    spread: '-24.5'
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

      const res = await scrapeLeagueSchedules('MBB', true, { maxMoneylineOdds: 300 }, ['20261115']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(false);
      expect(game.type).toBe('SCORE');
    });

    it('deactivates WBB game when odds are completely missing (not added to active board)', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'wbb_game_no_odds',
            date: '2026-11-15T23:00:00Z',
            competitions: [
              {
                id: 'wbb_game_no_odds',
                date: '2026-11-15T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EST' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'South Carolina Gamecocks', displayName: 'South Carolina Gamecocks', shortDisplayName: 'SC' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Coppin State Eagles', displayName: 'Coppin State Eagles', shortDisplayName: 'COPP' }, score: '0' }
                ],
                odds: []
              }
            ]
          }
        ]
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockScoreboardData
      } as Response);

      const res = await scrapeLeagueSchedules('WBB', true, { maxMoneylineOdds: 300 }, ['20261115']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(false);
      expect(game.type).toBe('SCORE');
    });

    it('converts WBB game to SPREAD (ATS) when moneyline exceeds threshold but spread <= 9.5', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'wbb_game_spread_fallback',
            date: '2026-11-15T23:00:00Z',
            competitions: [
              {
                id: 'wbb_game_spread_fallback',
                date: '2026-11-15T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EST' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'UConn Huskies', displayName: 'UConn Huskies', shortDisplayName: 'CONN' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Notre Dame Fighting Irish', displayName: 'Notre Dame Fighting Irish', shortDisplayName: 'ND' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-380' } },
                      away: { close: { odds: '+290' } }
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

      const res = await scrapeLeagueSchedules('WBB', true, { maxMoneylineOdds: 300 }, ['20261115']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(true);
      expect(game.type).toBe('SPREAD');
      expect(game.metadata.spread).toBe('-6.5');
      expect(game.title).toContain('ATS');
    });

    it('activates WBB game when moneyline is within threshold', async () => {
      const mockScoreboardData = {
        events: [
          {
            id: 'wbb_game_ml_pass',
            date: '2026-11-15T23:00:00Z',
            competitions: [
              {
                id: 'wbb_game_ml_pass',
                date: '2026-11-15T23:00:00Z',
                status: { type: { name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM EST' } },
                competitors: [
                  { homeAway: 'home', team: { name: 'LSU Tigers', displayName: 'LSU Tigers', shortDisplayName: 'LSU' }, score: '0' },
                  { homeAway: 'away', team: { name: 'Texas Longhorns', displayName: 'Texas Longhorns', shortDisplayName: 'TEX' }, score: '0' }
                ],
                odds: [
                  {
                    moneyline: {
                      home: { close: { odds: '-135' } },
                      away: { close: { odds: '+115' } }
                    },
                    spread: '-2.0'
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

      const res = await scrapeLeagueSchedules('WBB', true, { maxMoneylineOdds: 300 }, ['20261115']);
      expect(res.data).toHaveLength(1);
      const game = res.data[0];
      expect(game.active).toBe(true);
      expect(game.type).toBe('SCORE');
    });
  });
});
