import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApifyToken,
  parseRacePostTime,
  parseMorningLineOdds,
  parseEquibaseItems,
  fetchEquibaseScraperData,
  syncEquibaseRacesToMatchups,
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

  describe('parseMorningLineOdds', () => {
    it('parses fractional odds like 3/1, 5/2, 9/5', () => {
      expect(parseMorningLineOdds('3/1')).toBe(3);
      expect(parseMorningLineOdds('5/2')).toBe(2.5);
      expect(parseMorningLineOdds('9/5')).toBe(1.8);
    });

    it('returns number if passed direct numeric input or numeric string', () => {
      expect(parseMorningLineOdds(4.5)).toBe(4.5);
      expect(parseMorningLineOdds('4.5')).toBe(4.5);
    });

    it('returns undefined for invalid or empty input', () => {
      expect(parseMorningLineOdds(undefined)).toBeUndefined();
      expect(parseMorningLineOdds('N/A')).toBeUndefined();
    });
  });

  describe('parseEquibaseItems', () => {
    it('returns empty array for empty or non-array input', () => {
      expect(parseEquibaseItems([])).toEqual([]);
      expect(parseEquibaseItems(null as any)).toEqual([]);
    });

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

    it('groups flat runner objects into race cards', () => {
      const flatRunners = [
        {
          track: 'Belmont Park',
          trackCode: 'BEL',
          race: 3,
          date: '2026-09-10',
          post_time: '2026-09-10T19:00:00Z',
          horse: 'Seize the Grey',
          program: '1',
          morningLine: '3/1',
          scratched: false
        },
        {
          track: 'Belmont Park',
          trackCode: 'BEL',
          race: 3,
          date: '2026-09-10',
          post_time: '2026-09-10T19:00:00Z',
          horse: 'Muth',
          program: '2',
          morningLine: '4/1',
          scratched: false
        }
      ];

      const cards = parseEquibaseItems(flatRunners);
      expect(cards.length).toBe(1);

      const card = cards[0];
      expect(card.raceId).toBe('BEL_20260910_R3');
      expect(card.trackName).toBe('Belmont Park');
      expect(card.raceNumber).toBe(3);
      expect(card.status).toBe('STATUS_SCHEDULED');
      expect(card.runners.length).toBe(2);
      expect(card.runners[0].horseName).toBe('Seize the Grey');
      expect(card.runners[1].horseName).toBe('Muth');
    });
  });

  describe('fetchEquibaseScraperData', () => {
    it('returns error if APIFY_API_TOKEN is missing', async () => {
      const result = await fetchEquibaseScraperData();
      expect(result.success).toBe(false);
      expect(result.error).toContain('APIFY_API_TOKEN is missing');
    });

    it('calls Apify REST API when APIFY_API_TOKEN is present and parses result', async () => {
      process.env.APIFY_API_TOKEN = 'mock_apify_token';

      const mockResponseData = [
        {
          trackName: 'Del Mar',
          trackCode: 'DMR',
          raceNumber: 5,
          date: '2026-09-10',
          runners: [
            { programNumber: '1', horseName: 'Thorpedo Anna', morningLineOdds: '3/5' }
          ]
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        expect(urlStr).toContain(EQUIBASE_ACTOR_ID);
        expect(urlStr).toContain('token=mock_apify_token');
        return {
          ok: true,
          json: async () => mockResponseData
        } as Response;
      });

      const result = await fetchEquibaseScraperData({ date: '2026-09-10', tracks: ['DMR'] });
      expect(result.success).toBe(true);
      expect(result.cards.length).toBe(1);
      expect(result.cards[0].trackCode).toBe('DMR');
      expect(result.cards[0].runners[0].horseName).toBe('Thorpedo Anna');
    });
  });

  describe('syncEquibaseRacesToMatchups', () => {
    it('persists parsed race cards into mock Firestore matchups collection', async () => {
      const storedDocs = new Map<string, any>();

      const mockDb = {
        collection: (colName: string) => {
          expect(colName).toBe('matchups');
          return {
            doc: (docId: string) => ({
              get: async () => ({
                exists: storedDocs.has(docId),
                data: () => storedDocs.get(docId)
              }),
              set: async (data: any, opts?: any) => {
                if (opts?.merge && storedDocs.has(docId)) {
                  storedDocs.set(docId, { ...storedDocs.get(docId), ...data });
                } else {
                  storedDocs.set(docId, data);
                }
              }
            })
          };
        }
      };

      const parsedCards = parseEquibaseItems([
        {
          trackName: 'Gulfstream Park',
          trackCode: 'GP',
          raceNumber: 2,
          date: '2026-09-10',
          postTime: '2026-09-10T16:00:00Z',
          winningHorse: 'Subsanador',
          runners: [
            { programNumber: '1', horseName: 'Subsanador', finishPosition: 1 },
            { programNumber: '2', horseName: 'National Treasure', finishPosition: 2 }
          ]
        }
      ]);

      const syncResult = await syncEquibaseRacesToMatchups(mockDb, parsedCards);
      expect(syncResult.syncedCount).toBe(1);

      const gameId = 'equibase_GP_20260910_R2';
      expect(storedDocs.has(gameId)).toBe(true);

      const savedMatchup = storedDocs.get(gameId);
      expect(savedMatchup.gameId).toBe(gameId);
      expect(savedMatchup.league).toBe('HORSE_RACING');
      expect(savedMatchup.title).toBe('Gulfstream Park - Race 2');
      expect(savedMatchup.status).toBe('STATUS_FINAL');
      expect(savedMatchup.homeTeam.name).toBe('Subsanador');
      expect(savedMatchup.homeTeam.score).toBe(1);
      expect(savedMatchup.winnerId).toBe('Subsanador');
    });
  });
});
