import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockBatch = {
  update: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};

const makeChainableQuery = (docs: any[] = []) => {
  const q: any = {
    where: () => q,
    limit: () => q,
    orderBy: () => q,
    get: async () => ({
      empty: docs.length === 0,
      docs,
    }),
  };
  return q;
};

let mockExistingDoc: any = null;

vi.mock('../lib/firebase-admin.js', () => ({
  adminDb: {
    collection: (collName: string) => {
      if (collName === 'systemSettings') {
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      }
      if (collName === 'leagueSettings') {
        return {
          doc: () => ({ get: async () => ({ exists: false }) }),
        };
      }
      if (collName === 'matchups' && mockExistingDoc) {
        return makeChainableQuery([mockExistingDoc]);
      }
      return makeChainableQuery([]);
    },
    batch: () => mockBatch,
  },
}));

vi.mock('./espnScraper', () => ({
  scrapeLeagueSchedules: vi.fn(),
}));

import { syncLeagueSchedules } from './scheduleProcessor';
import { scrapeLeagueSchedules } from './espnScraper';
import { isBeforeThursdaySpreadLock } from '../utils/footballWeek';

describe('scheduleProcessor - manuallyActivated Preservation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingDoc = null;
  });

  it('preserves active: true for manuallyActivated ATP/WTA matchups without moneyline odds during syncLeagueSchedules', async () => {
    const scrapedMatchup = {
      gameId: 'atp_123',
      league: 'ATP',
      title: 'Player A vs Player B',
      type: 'MONEYLINE',
      active: false,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: Date.now() + 3600000,
      homeTeam: { id: 'home_1', name: 'Player A', score: 0 },
      awayTeam: { id: 'away_1', name: 'Player B', score: 0 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'atp_123',
      ref: 'matchupRef_atp_123',
      data: () => ({
        gameId: 'atp_123',
        league: 'ATP',
        title: 'Player A vs Player B',
        type: 'MONEYLINE',
        active: true,
        manuallyActivated: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: Date.now() + 3600000,
        homeTeam: { id: 'home_1', name: 'Player A', score: 0 },
        awayTeam: { id: 'away_1', name: 'Player B', score: 0 },
        metadata: {},
      }),
    };

    const res = await syncLeagueSchedules('ATP' as any, false);
    expect(res.success).toBe(true);

    // Verify batch.update was NOT called setting active: false
    const updateCalls = mockBatch.update.mock.calls;
    for (const call of updateCalls) {
      if (call[0] === 'matchupRef_atp_123') {
        expect(call[1].active).not.toBe(false);
      }
    }
  });

  it('filters manuallyActivated ATP/WTA moneyline matchups correctly for PlayDashboard display', () => {
    const now = Date.now();
    const next24Hours = now + 24 * 60 * 60 * 1000;

    const allFetchedMatchups = [
      {
        gameId: 'atp_manual_1',
        id: 'atp_manual_1',
        league: 'ATP',
        type: 'MONEYLINE',
        active: true,
        manuallyActivated: true,
        status: 'STATUS_SCHEDULED',
        startTime: now + 2 * 60 * 60 * 1000,
        metadata: {}, // Missing mlHome and mlAway
      },
      {
        gameId: 'atp_auto_2',
        id: 'atp_auto_2',
        league: 'ATP',
        type: 'MONEYLINE',
        active: true,
        manuallyActivated: false,
        status: 'STATUS_SCHEDULED',
        startTime: now + 2 * 60 * 60 * 1000,
        metadata: {}, // Missing mlHome and mlAway
      },
    ];

    const userPicks: Record<string, any> = {};
    const matchupPickCounts: Record<string, any> = {};

    const filtered = allFetchedMatchups.filter((m: any) => {
      const hasPicksOnMatchup = Boolean(
        userPicks[m.gameId] || userPicks[m.id] ||
        (matchupPickCounts[m.gameId] && matchupPickCounts[m.gameId].total > 0) ||
        (matchupPickCounts[m.id] && matchupPickCounts[m.id].total > 0)
      );

      if (m.abandoned && !hasPicksOnMatchup) return false;
      if (m.active === false && !hasPicksOnMatchup) return false;

      const isFinal = m.status === 'STATUS_FINAL' || m.statusDesc?.toLowerCase().includes('final');
      const isLive = m.status !== 'STATUS_SCHEDULED' && !isFinal && m.status !== 'STATUS_POSTPONED' && m.status !== 'STATUS_CANCELED';

      let isUpcoming = m.status === 'STATUS_SCHEDULED' && m.startTime <= next24Hours && m.startTime > (now - 24 * 60 * 60 * 1000);
      if ((m.league === 'PGA' || m.manuallyActivated) && m.status === 'STATUS_SCHEDULED') {
        isUpcoming = true;
      }

      if (!((isLive || isUpcoming) && !isFinal)) return false;

      if (m.type === 'MONEYLINE' && !m.manuallyActivated && (m.metadata?.mlHome === undefined || m.metadata?.mlHome === null) && (m.metadata?.mlAway === undefined || m.metadata?.mlAway === null)) {
          return false;
      }

      return true;
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].gameId).toBe('atp_manual_1');
  });
});

describe('isBeforeThursdaySpreadLock helper', () => {
  it('correctly calculates Thursday 2AM AZ time lock window', () => {
    // Saturday Nov 15 2025 at 20:00 UTC
    const gameTime = new Date('2025-11-15T20:00:00Z').getTime();

    // Thursday Nov 13 2025 at 08:00 UTC (1 hour before Thursday 9:00 AM UTC lock)
    const beforeLock = new Date('2025-11-13T08:00:00Z').getTime();
    expect(isBeforeThursdaySpreadLock(gameTime, beforeLock)).toBe(true);

    // Thursday Nov 13 2025 at 10:00 UTC (1 hour after Thursday 9:00 AM UTC lock)
    const afterLock = new Date('2025-11-13T10:00:00Z').getTime();
    expect(isBeforeThursdaySpreadLock(gameTime, afterLock)).toBe(false);
  });
});
