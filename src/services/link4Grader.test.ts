import { describe, it, expect, beforeEach } from 'vitest';
import { isTeamMatch } from '../lib/teamUtils.js';
import { gradeLink4Matchups, setAdminDbMock } from './link4Grader.js';

describe('isTeamMatch helper', () => {
  it('matches exact full team names', () => {
    expect(isTeamMatch('Los Angeles Rams', { name: 'Los Angeles Rams' })).toBe(true);
    expect(isTeamMatch('San Francisco 49ers', { name: 'San Francisco 49ers' })).toBe(true);
  });

  it('matches team full name when pick is team mascot/nickname or vice versa', () => {
    expect(isTeamMatch('Los Angeles Rams', { name: 'Rams' })).toBe(true);
    expect(isTeamMatch('Rams', { name: 'Los Angeles Rams' })).toBe(true);
    expect(isTeamMatch('San Francisco 49ers', { name: '49ers' })).toBe(true);
    expect(isTeamMatch('49ers', { name: 'San Francisco 49ers' })).toBe(true);
  });

  it('matches team short name or id or abbreviation', () => {
    expect(isTeamMatch('Rams', { name: 'Los Angeles', shortName: 'Rams' })).toBe(true);
    expect(isTeamMatch('LAR', { name: 'Los Angeles Rams', abbreviation: 'LAR' })).toBe(true);
    expect(isTeamMatch('rams', { name: 'Los Angeles Rams', id: 'rams' })).toBe(true);
  });

  it('returns false for non-matching teams', () => {
    expect(isTeamMatch('Los Angeles Rams', { name: 'San Francisco 49ers' })).toBe(false);
    expect(isTeamMatch('49ers', { name: 'Rams' })).toBe(false);
    expect(isTeamMatch('San Francisco 49ers', { name: 'Los Angeles Rams', id: 'rams', abbreviation: 'LAR' })).toBe(false);
  });
});

describe('gradeLink4Matchups', () => {
  let mockDb: any;
  let mockSegmentsDocs: any[];
  let mockPicksDocs: any[];

  beforeEach(() => {
    mockPicksDocs = [
      {
        id: 'pick_doc_1',
        data: () => ({
          userId: 'user1',
          segmentId: 'seg1',
          hasLoss: false,
          picks: [
            {
              id: 'pick-game1',
              name: 'Los Angeles Rams',
              sport: 'NFL',
              status: 'PENDING',
              score: 0,
            },
          ],
        }),
      },
    ];

    mockSegmentsDocs = [
      {
        id: 'seg1',
        data: () => ({ payoutComplete: false }),
      },
    ];

    mockDb = {
      collection: (colName: string) => {
        if (colName === 'link4Segments') {
          return {
            get: async () => ({
              empty: mockSegmentsDocs.length === 0,
              docs: mockSegmentsDocs,
            }),
          };
        }
        if (colName === 'link4Picks') {
          return {
            where: (_field: string, _op: string, _val: any) => ({
              get: async () => ({
                empty: mockPicksDocs.length === 0,
                docs: mockPicksDocs,
              }),
            }),
            doc: (id: string) => ({ id }),
          };
        }
        return {
          doc: (id: string) => ({ id }),
        };
      },
      batch: () => {
        return {
          update: (_docRef: any, updates: any) => {
            mockPicksDocs[0].updatedData = updates;
          },
          commit: async () => {},
        };
      },
    };

    setAdminDbMock(mockDb);
  });

  it('correctly grades Rams pick as WIN when Rams (home team) win game', async () => {
    const finalMatchups = [
      {
        gameId: 'game1',
        status: 'STATUS_FINAL',
        type: 'MONEYLINE',
        homeTeam: { name: 'Rams', score: 24 },
        awayTeam: { name: '49ers', score: 17 },
        metadata: { mlHome: -192, mlAway: 160 },
      },
    ];

    await gradeLink4Matchups(finalMatchups);

    const updatedPicks = mockPicksDocs[0].updatedData;
    expect(updatedPicks).toBeDefined();
    expect(updatedPicks.hasLoss).toBe(false);
    expect(updatedPicks.picks[0].status).toBe('WIN');
    expect(updatedPicks.picks[0].score).toBe(-192);
  });
});
