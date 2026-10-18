import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApifyToken,
  parseRacePostTime,
  parseMorningLineOdds,
  calculateImpliedProbability,
  parseEquibaseItems,
  generateBalancedHorseRacingMatchups,
  fetchEquibaseScraperData,
  syncEquibaseRacesToMatchups,
  purgeUnpickedHorseMatchups,
  runDailyHorseRacingScheduleSync,
  EQUIBASE_ACTOR_ID
} from './apifyHorseRacingService';

describe('Apify Equibase US Horse Racing Scraper Service', () => {
  beforeEach(() => {
    delete process.env.APIFY_API_TOKEN;
    delete process.env.APIFY_TOKEN;
    vi.restoreAllMocks();
  });

  describe('getApifyToken', () => {
    it('returns empty string when no environment variables are set', () => {
      expect(getApifyToken()).toBe('');
    });

    it('returns APIFY_API_TOKEN when set', () => {
      process.env.APIFY_API_TOKEN = 'test_token_123';
      expect(getApifyToken()).toBe('test_token_123');
    });

    it('falls back to APIFY_TOKEN if APIFY_API_TOKEN is missing', () => {
      process.env.APIFY_TOKEN = 'fallback_token_456';
      expect(getApifyToken()).toBe('fallback_token_456');
    });
  });

  describe('parseRacePostTime', () => {
    it('returns timestamp if passed a valid positive number', () => {
      const ts = 1750000000000;
      expect(parseRacePostTime(ts)).toBe(ts);
    });

    it('parses valid ISO string date', () => {
      const isoStr = '2026-09-10T18:30:00Z';
      const expected = Date.parse(isoStr);
      expect(parseRacePostTime(isoStr)).toBe(expected);
    });

    it('parses time with dateStr', () => {
      const timeStr = '3:45 PM EDT';
      const dateStr = '2026-09-10';
      const parsed = parseRacePostTime(timeStr, dateStr);
      expect(parsed).toBeGreaterThan(0);
      expect(isNaN(parsed)).toBe(false);
    });
  });

  describe('parseMorningLineOdds & calculateImpliedProbability', () => {
    it('parses fractional odds like 3/1, 5/2, 9/5', () => {
      expect(parseMorningLineOdds('3/1')).toBe(3);
      expect(parseMorningLineOdds('5/2')).toBe(2.5);
      expect(parseMorningLineOdds('9/5')).toBe(1.8);
    });

    it('calculates implied probability correctly from fractional morning lines', () => {
      expect(calculateImpliedProbability('1/1')).toBeCloseTo(0.50, 2);
      expect(calculateImpliedProbability('2/1')).toBeCloseTo(0.333, 2);
      expect(calculateImpliedProbability('3/1')).toBeCloseTo(0.25, 2);
      expect(calculateImpliedProbability('5/2')).toBeCloseTo(0.2857, 2);
      expect(calculateImpliedProbability('1/2')).toBeCloseTo(0.667, 2);
    });
  });

  describe('generateBalancedHorseRacingMatchups', () => {
    it('generates Horse vs Field and Horse vs Horse Better Finish matchups', () => {
      const card = parseEquibaseItems([
        {
          trackName: 'Saratoga',
          trackCode: 'SAR',
          raceNumber: 4,
          date: '2026-09-10',
          winningHorse: 'Fierceness',
          runners: [
            { programNumber: '1', horseName: 'Fierceness', morningLineOdds: '1/1', finishPosition: 1 },
            { programNumber: '2', horseName: 'Sierra Leone', morningLineOdds: '5/2', finishPosition: 2 },
            { programNumber: '3', horseName: 'Muth', morningLineOdds: '8/1', finishPosition: 3 }
          ]
        }
      ])[0];

      const balanced = generateBalancedHorseRacingMatchups(card);
      expect(balanced.length).toBe(2);

      // Horse vs Field
      const hvf = balanced.find(m => m.metadata.matchupType === 'HORSE_VS_FIELD');
      expect(hvf).toBeDefined();
      expect(hvf.title).toContain('Fierceness vs The Field');
      expect(hvf.homeTeam.name).toContain('Fierceness');
      expect(hvf.awayTeam.name).toContain('The Field');
      expect(hvf.winnerId).toBe('horse_1');

      // Horse vs Horse Head-to-Head
      const h2h = balanced.find(m => m.metadata.matchupType === 'HORSE_VS_HORSE');
      expect(h2h).toBeDefined();
      expect(h2h.title).toContain('Sierra Leone vs Muth');
      expect(h2h.winnerId).toBe('horse_2');
    });
  });

  describe('purgeUnpickedHorseMatchups', () => {
    it('purges unpicked horse racing matchups when post time has passed', async () => {
      const mockHorseDocs = [
        {
          id: 'equibase_SAR_1',
          ref: { update: vi.fn() },
          data: () => ({
            gameId: 'equibase_SAR_1',
            league: 'HORSE_RACING',
            active: true,
            startTime: Date.now() - 10 * 60 * 1000 // 10 minutes ago
          })
        }
      ];

      const mockDb = {
        collection: (colName: string) => {
          if (colName === 'matchups') {
            return {
              where: () => ({
                where: () => ({
                  get: async () => ({ docs: mockHorseDocs })
                })
              })
            };
          }
          if (colName === 'picks' || colName === 'pickemPicks') {
            return {
              where: () => ({
                limit: () => ({
                  get: async () => ({ empty: true })
                })
              })
            };
          }
          return {};
        }
      };

      const result = await purgeUnpickedHorseMatchups(mockDb);
      expect(result.purgedCount).toBe(1);
      expect(mockHorseDocs[0].ref.update).toHaveBeenCalledWith(expect.objectContaining({
        active: false,
        abandoned: true
      }));
    });
  });

  describe('parseEquibaseItems', () => {
    it('normalizes pre-grouped race card objects with nested runners', () => {
      const rawInput = [
        {
          trackName: 'Saratoga',
          trackCode: 'SAR',
          raceNumber: 1,
          date: '2026-09-10',
          postTime: '2026-09-10T17:00:00Z',
          distance: '1 Mile',
          surface: 'Dirt',
          purse: '$100,000',
          runners: [
            {
              programNumber: '1',
              horseName: 'Fierceness',
              jockey: 'J. Velazquez',
              trainer: 'T. Pletcher',
              morningLineOdds: '2/1',
              finishPosition: 1,
              status: 'WINNER'
            },
            {
              programNumber: '2',
              horseName: 'Sierra Leone',
              jockey: 'T. Gaffalione',
              trainer: 'C. Brown',
              morningLineOdds: '5/2',
              finishPosition: 2
            }
          ]
        }
      ];

      const cards = parseEquibaseItems(rawInput);
      expect(cards.length).toBe(1);

      const card = cards[0];
      expect(card.raceId).toBe('SAR_20260910_R1');
      expect(card.trackName).toBe('Saratoga');
      expect(card.trackCode).toBe('SAR');
      expect(card.raceNumber).toBe(1);
      expect(card.status).toBe('STATUS_FINAL');
      expect(card.winningHorse).toBe('Fierceness');
      expect(card.runners.length).toBe(2);
      expect(card.runners[0].horseName).toBe('Fierceness');
      expect(card.runners[0].mlOddsNumber).toBe(2);
    });
  });

  describe('fetchEquibaseScraperData & runDailyHorseRacingScheduleSync', () => {
    it('returns error if APIFY_API_TOKEN is missing', async () => {
      const result = await fetchEquibaseScraperData();
      expect(result.success).toBe(false);
      expect(result.error).toContain('APIFY_API_TOKEN is missing');
    });

    it('sends sp_intended_usage in POST body payload to Apify API', async () => {
      process.env.APIFY_API_TOKEN = 'mock_token_789';

      let capturedBody: any = null;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, opts: any) => {
        if (opts?.body) {
          capturedBody = JSON.parse(opts.body);
        }
        return {
          ok: true,
          json: async () => []
        } as Response;
      });

      await fetchEquibaseScraperData({ date: '2026-09-10' });
      expect(capturedBody).toBeDefined();
      expect(capturedBody.sp_intended_usage).toBe('GENERAL');

      // Test custom spIntendedUsage
      await fetchEquibaseScraperData({ date: '2026-09-10', spIntendedUsage: 'SERP' });
      expect(capturedBody.sp_intended_usage).toBe('SERP');
    });

    it('executes runDailyHorseRacingScheduleSync when token is configured', async () => {
      process.env.APIFY_API_TOKEN = 'mock_token_789';

      const mockResponseData = [
        {
          trackName: 'Churchill Downs',
          trackCode: 'CD',
          raceNumber: 8,
          date: '2026-09-10',
          runners: [
            { programNumber: '1', horseName: 'Mystik Dan', morningLineOdds: '2/1' },
            { programNumber: '2', horseName: 'Forever Young', morningLineOdds: '5/2' }
          ]
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => mockResponseData
        } as Response;
      });

      const storedDocs = new Map<string, any>();
      const mockDb = {
        collection: (colName: string) => ({
          doc: (docId: string) => ({
            get: async () => ({ exists: storedDocs.has(docId), data: () => storedDocs.get(docId) }),
            set: async (data: any, opts?: any) => {
              storedDocs.set(docId, opts?.merge && storedDocs.has(docId) ? { ...storedDocs.get(docId), ...data } : data);
            }
          }),
          where: () => ({
            where: () => ({
              get: async () => ({ docs: [] })
            })
          })
        })
      };

      const syncResult = await runDailyHorseRacingScheduleSync(mockDb, { date: '2026-09-10' });
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBeGreaterThan(0);
      expect(storedDocs.size).toBeGreaterThan(0);
    });
  });
});
