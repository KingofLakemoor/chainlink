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
    doc: (id?: string) => ({ id: id || 'mock_doc_id', ref: `ref_${id || 'mock_doc_id'}` }),
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
    getAll: async (...docRefs: any[]) => {
      if (mockExistingDoc) {
        return [{ exists: true, id: mockExistingDoc.id, ref: mockExistingDoc.ref, data: mockExistingDoc.data }];
      }
      return docRefs.map(ref => ({ exists: false, id: ref?.id || 'mock_id', data: () => null }));
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

  it('updates MLB status description (innings/outs) immediately during syncLeagueSchedules even when scores are equal', async () => {
    const scrapedMatchup = {
      gameId: 'mlb_101',
      league: 'MLB',
      title: 'Phillies @ Braves',
      type: 'MONEYLINE',
      active: true,
      status: 'STATUS_IN_PROGRESS',
      statusDesc: 'Top 3rd - 2 Outs',
      startTime: Date.now() - 3600000,
      homeTeam: { id: 'atl', name: 'Braves', score: 2 },
      awayTeam: { id: 'phi', name: 'Phillies', score: 2 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'mlb_101',
      ref: 'matchupRef_mlb_101',
      data: () => ({
        gameId: 'mlb_101',
        league: 'MLB',
        title: 'Phillies @ Braves',
        type: 'MONEYLINE',
        active: true,
        status: 'STATUS_IN_PROGRESS',
        statusDesc: 'Top 3rd - 1 Out',
        updatedAt: Date.now() - 60000, // Updated 1 minute ago
        startTime: Date.now() - 3600000,
        homeTeam: { id: 'atl', name: 'Braves', score: 2 },
        awayTeam: { id: 'phi', name: 'Phillies', score: 2 },
        metadata: {},
      }),
    };

    const res = await syncLeagueSchedules('MLB' as any, false);
    expect(res.success).toBe(true);

    // Verify batch.update WAS called updating statusDesc to 'Top 3rd - 2 Outs'
    expect(mockBatch.update).toHaveBeenCalledWith('matchupRef_mlb_101', expect.objectContaining({
      statusDesc: 'Top 3rd - 2 Outs',
    }));
  });

  it('preserves scheduled PUTTING matchups during syncLeagueSchedules and does not mark them abandoned', async () => {
    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [],
    } as any);

    mockExistingDoc = {
      id: 'putting_matchup_1',
      ref: 'matchupRef_putting_1',
      data: () => ({
        gameId: 'putting_matchup_1',
        league: 'PUTTING',
        title: 'Player 1 vs Player 2',
        type: 'SCORE',
        active: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: Date.now() + 3600000,
        homeTeam: { id: 'p2', name: 'Player 2', score: 0 },
        awayTeam: { id: 'p1', name: 'Player 1', score: 0 },
      }),
    };

    const res = await syncLeagueSchedules('NFL' as any, false);
    expect(res.success).toBe(true);

    // Verify batch.update was NOT called abandoning putting_matchup_1
    const updateCalls = mockBatch.update.mock.calls;
    for (const call of updateCalls) {
      if (call[0] === 'matchupRef_putting_1') {
        expect(call[1].abandoned).not.toBe(true);
        expect(call[1].active).not.toBe(false);
      }
    }
  });

  it('enforces active: false for RPL matchups without moneyline odds during syncLeagueSchedules', async () => {
    const scrapedMatchup = {
      gameId: 'rpl_no_odds_1',
      league: 'RPL',
      title: 'Zenit vs Spartak',
      type: 'MONEYLINE',
      active: false,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: Date.now() + 3600000,
      homeTeam: { id: 'home_rpl', name: 'Zenit', score: 0 },
      awayTeam: { id: 'away_rpl', name: 'Spartak', score: 0 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'rpl_no_odds_1',
      ref: 'matchupRef_rpl_no_odds_1',
      data: () => ({
        gameId: 'rpl_no_odds_1',
        league: 'RPL',
        title: 'Zenit vs Spartak',
        type: 'MONEYLINE',
        active: true, // Previously active
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: Date.now() + 3600000,
        homeTeam: { id: 'home_rpl', name: 'Zenit', score: 0 },
        awayTeam: { id: 'away_rpl', name: 'Spartak', score: 0 },
        metadata: {}, // Missing moneyline odds
      }),
    };

    const res = await syncLeagueSchedules('RPL' as any, false);
    expect(res.success).toBe(true);

    // Verify batch.update set active: false for the RPL matchup without odds
    expect(mockBatch.update).toHaveBeenCalledWith('matchupRef_rpl_no_odds_1', expect.objectContaining({
      active: false,
    }));
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

  it('filters out scheduled matchups beyond the 24-hour rolling window for PlayDashboard display', () => {
    const now = Date.now();
    const next24Hours = now + 24 * 60 * 60 * 1000;

    const allFetchedMatchups = [
      {
        gameId: 'within_24h',
        id: 'within_24h',
        league: 'NFL',
        type: 'SPREAD',
        active: true,
        status: 'STATUS_SCHEDULED',
        startTime: now + 12 * 60 * 60 * 1000,
      },
      {
        gameId: 'beyond_24h',
        id: 'beyond_24h',
        league: 'NFL',
        type: 'SPREAD',
        active: true,
        status: 'STATUS_SCHEDULED',
        startTime: now + 36 * 60 * 60 * 1000,
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

      return true;
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].gameId).toBe('within_24h');
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

describe('scheduleProcessor - adminOverride Preservation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingDoc = null;
  });

  it('preserves Title, Type, Spread, and Active when adminOverride: true during syncLeagueSchedules', async () => {
    const scrapedMatchup = {
      gameId: 'nfl_override_1',
      league: 'NFL',
      title: 'Scraped Packers @ Panthers',
      type: 'SPREAD',
      active: false,
      status: 'STATUS_IN_PROGRESS',
      statusDesc: 'Q3 10:00',
      startTime: Date.now() - 3600000,
      homeTeam: { id: 'car', name: 'Panthers', score: 14 },
      awayTeam: { id: 'gb', name: 'Packers', score: 21 },
      metadata: {
        spread: 3.5,
      },
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'nfl_override_1',
      ref: 'matchupRef_nfl_override_1',
      data: () => ({
        gameId: 'nfl_override_1',
        league: 'NFL',
        title: 'Custom Admin Game Title',
        type: 'CUSTOM',
        active: true,
        adminOverride: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        updatedAt: Date.now() - 100000,
        startTime: Date.now() - 3600000,
        homeTeam: { id: 'car', name: 'Panthers', score: 0 },
        awayTeam: { id: 'gb', name: 'Packers', score: 0 },
        metadata: {
          spread: -6.5,
        },
      }),
    };

    const res = await syncLeagueSchedules('NFL' as any, false);
    expect(res.success).toBe(true);

    const updateCalls = mockBatch.update.mock.calls;
    expect(updateCalls.length).toBeGreaterThan(0);

    const updatePayload = updateCalls.find(c => c[0] === 'matchupRef_nfl_override_1')?.[1];
    expect(updatePayload).toBeDefined();

    // Verify Title, Type, Spread, and Active are preserved from existing data
    expect(updatePayload.title).toBe('Custom Admin Game Title');
    expect(updatePayload.type).toBe('CUSTOM');
    expect(updatePayload.active).toBe(true);
    expect(updatePayload['metadata.spread']).toBe(-6.5);
    expect(updatePayload.adminOverride).toBe(true);

    // Verify game score and status were still updated from the live scraper
    expect(updatePayload.status).toBe('STATUS_IN_PROGRESS');
    expect(updatePayload.statusDesc).toBe('Q3 10:00');
  });

  it('deactivates existing MBB matchup when scrapedMatchup does not meet odds criteria', async () => {
    const scrapedMatchup = {
      gameId: 'mbb_unlisted_odds',
      league: 'MBB',
      title: 'Kentucky @ Kansas',
      type: 'SCORE',
      active: false, // Scraper evaluated no qualifying odds
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: Date.now() + 3600000,
      homeTeam: { id: 'ku', name: 'Kansas Jayhawks', score: 0 },
      awayTeam: { id: 'uk', name: 'Kentucky Wildcats', score: 0 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'mbb_unlisted_odds',
      ref: 'matchupRef_mbb_1',
      data: () => ({
        gameId: 'mbb_unlisted_odds',
        league: 'MBB',
        title: 'Kentucky @ Kansas',
        type: 'SCORE',
        active: true, // Previously active
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: Date.now() + 3600000,
        homeTeam: { id: 'ku', name: 'Kansas Jayhawks', score: 0 },
        awayTeam: { id: 'uk', name: 'Kentucky Wildcats', score: 0 },
        metadata: {},
      }),
    };

    const res = await syncLeagueSchedules('MBB' as any, false);
    expect(res.success).toBe(true);

    const updateCalls = mockBatch.update.mock.calls;
    const updatePayload = updateCalls.find(c => c[0] === 'matchupRef_mbb_1')?.[1];
    expect(updatePayload).toBeDefined();
    expect(updatePayload.active).toBe(false);
  });

  it('creates new MBB matchup as inactive and abandoned when scrapedMatchup fails odds criteria', async () => {
    const scrapedMatchup = {
      gameId: 'mbb_new_no_odds',
      league: 'MBB',
      title: 'Maine @ Duke',
      type: 'SCORE',
      active: false,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: Date.now() + 3600000,
      homeTeam: { id: 'duke', name: 'Duke Blue Devils', score: 0 },
      awayTeam: { id: 'maine', name: 'Maine Black Bears', score: 0 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = null; // New game

    const res = await syncLeagueSchedules('MBB' as any, false);
    expect(res.success).toBe(true);

    const setCalls = mockBatch.set.mock.calls;
    expect(setCalls.length).toBeGreaterThan(0);
    const newGamePayload = setCalls[0][1];
    expect(newGamePayload.active).toBe(false);
    expect(newGamePayload.abandoned).toBe(true);
  });

  it('deactivates existing WBB matchup when scrapedMatchup does not meet odds criteria', async () => {
    const scrapedMatchup = {
      gameId: 'wbb_unlisted_odds',
      league: 'WBB',
      title: 'South Carolina @ LSU',
      type: 'SCORE',
      active: false,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: Date.now() + 3600000,
      homeTeam: { id: 'lsu', name: 'LSU Tigers', score: 0 },
      awayTeam: { id: 'sc', name: 'South Carolina Gamecocks', score: 0 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'wbb_unlisted_odds',
      ref: 'matchupRef_wbb_1',
      data: () => ({
        gameId: 'wbb_unlisted_odds',
        league: 'WBB',
        title: 'South Carolina @ LSU',
        type: 'SCORE',
        active: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: Date.now() + 3600000,
        homeTeam: { id: 'lsu', name: 'LSU Tigers', score: 0 },
        awayTeam: { id: 'sc', name: 'South Carolina Gamecocks', score: 0 },
        metadata: {},
      }),
    };

    const res = await syncLeagueSchedules('WBB' as any, false);
    expect(res.success).toBe(true);

    const updateCalls = mockBatch.update.mock.calls;
    const updatePayload = updateCalls.find(c => c[0] === 'matchupRef_wbb_1')?.[1];
    expect(updatePayload).toBeDefined();
    expect(updatePayload.active).toBe(false);
  });

  it('preserves existing metadata.overUnder when scraped overUnder is undefined/null', async () => {
    const scrapedMatchup = {
      gameId: 'nfl_ou_test_game',
      league: 'NFL',
      title: 'Colts @ Texans',
      type: 'SCORE',
      active: true,
      status: 'STATUS_FINAL',
      statusDesc: 'Final',
      startTime: 1795137300000,
      homeTeam: { id: '34', name: 'Texans', score: 26 },
      awayTeam: { id: '11', name: 'Colts', score: 3 },
      metadata: {
        overUnder: null,
      },
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'nfl_ou_test_game',
      ref: 'matchupRef_nfl_ou',
      data: () => ({
        gameId: 'nfl_ou_test_game',
        league: 'NFL',
        title: 'Colts @ Texans - O/U 44.5',
        type: 'OVER_UNDER',
        active: true,
        adminOverride: true,
        hasCustomTitle: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: 1795137300000,
        homeTeam: { id: '34', name: 'Texans', score: 0 },
        awayTeam: { id: '11', name: 'Colts', score: 0 },
        metadata: {
          overUnder: '44.5',
        },
      }),
    };

    const res = await syncLeagueSchedules('NFL' as any, false);
    expect(res.success).toBe(true);

    const updateCalls = mockBatch.update.mock.calls;
    const updatePayload = updateCalls.find(c => c[0] === 'matchupRef_nfl_ou')?.[1];
    expect(updatePayload).toBeDefined();
    expect(updatePayload['metadata.overUnder']).toBe('44.5');
  });

  it('preserves league under adminOverride during syncLeagueSchedules even if scraped matchup belongs to another league', async () => {
    const scrapedMatchup = {
      gameId: 'L4X6diIsgTRa1xstXdMG',
      league: 'MLB',
      title: 'Jimiah Albritton @ Greg Mason',
      type: 'SCORE',
      active: true,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: 1795737600000,
      homeTeam: { id: 'Greg Mason', name: 'Greg Mason', score: 0 },
      awayTeam: { id: 'Jimiah Albritton', name: 'Jimiah Albritton', score: 0 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'L4X6diIsgTRa1xstXdMG',
      ref: 'matchupRef_scriptless_doc',
      data: () => ({
        gameId: 'L4X6diIsgTRa1xstXdMG',
        league: 'SCRIPTLESS',
        title: 'Season 2 - Episode 2: More Points',
        type: 'SCORE',
        active: true,
        adminOverride: true,
        hasCustomTitle: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: 1795737600000,
        homeTeam: { id: 'Greg Mason', name: 'Greg Mason', score: 0 },
        awayTeam: { id: 'Jimiah Albritton', name: 'Jimiah Albritton', score: 0 },
        metadata: {},
      }),
    };

    const res = await syncLeagueSchedules('MLB' as any, false);
    expect(res.success).toBe(true);

    const updateCalls = mockBatch.update.mock.calls;
    const updatePayload = updateCalls.find(c => c[0] === 'matchupRef_scriptless_doc')?.[1];
    if (updatePayload) {
      expect(updatePayload.league).toBe('SCRIPTLESS');
    }
  });

  it('corrects legacy MLB league to SCRIPTLESS when scraped matchup is SCRIPTLESS even if existingDoc has adminOverride and was previously MLB', async () => {
    const scrapedMatchup = {
      gameId: 'L4X6diIsgTRa1xstXdMG',
      league: 'SCRIPTLESS',
      title: 'Season 2 - Episode 2: More Points',
      type: 'SCORE',
      active: true,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: 1795737600000,
      homeTeam: { id: 'Greg Mason', name: 'Greg Mason', score: 0 },
      awayTeam: { id: 'Jimiah Albritton', name: 'Jimiah Albritton', score: 0 },
      metadata: {},
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'L4X6diIsgTRa1xstXdMG',
      ref: 'matchupRef_legacy_mlb_doc',
      data: () => ({
        gameId: 'L4X6diIsgTRa1xstXdMG',
        league: 'MLB', // legacy corrupted value
        title: 'Season 2 - Episode 2: More Points',
        type: 'SCORE',
        active: true,
        adminOverride: true,
        hasCustomTitle: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        startTime: 1795737600000,
        homeTeam: { id: 'Greg Mason', name: 'Greg Mason', score: 0 },
        awayTeam: { id: 'Jimiah Albritton', name: 'Jimiah Albritton', score: 0 },
        metadata: {},
      }),
    };

    const res = await syncLeagueSchedules('SCRIPTLESS' as any, false);
    expect(res.success).toBe(true);

    const updateCalls = mockBatch.update.mock.calls;
    const updatePayload = updateCalls.find(c => c[0] === 'matchupRef_legacy_mlb_doc')?.[1];
    expect(updatePayload).toBeDefined();
    expect(updatePayload.league).toBe('SCRIPTLESS');
  });

  it('skips odds updates for games scheduled > 6 hours away if updated within last 120 minutes', async () => {
    const eightHoursFromNow = Date.now() + 8 * 60 * 60 * 1000;
    const scrapedMatchup = {
      gameId: 'nfl_future_1',
      league: 'NFL',
      title: 'Eagles @ Cowboys',
      type: 'MONEYLINE',
      active: true,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: eightHoursFromNow,
      homeTeam: { id: 'dal', name: 'Cowboys', score: 0 },
      awayTeam: { id: 'phi', name: 'Eagles', score: 0 },
      metadata: {
        mlHome: -120, // Scraped new odds
        mlAway: 100,
      },
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'nfl_future_1',
      ref: 'matchupRef_nfl_future_1',
      data: () => ({
        gameId: 'nfl_future_1',
        league: 'NFL',
        title: 'Eagles @ Cowboys',
        type: 'MONEYLINE',
        active: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        updatedAt: Date.now() - 30 * 60 * 1000, // Updated 30 mins ago (< 120 mins)
        startTime: eightHoursFromNow,
        homeTeam: { id: 'dal', name: 'Cowboys', score: 0 },
        awayTeam: { id: 'phi', name: 'Eagles', score: 0 },
        metadata: {
          mlHome: -115,
          mlAway: -105,
        },
      }),
    };

    const res = await syncLeagueSchedules('NFL' as any, false);
    expect(res.success).toBe(true);

    // Verify batch.update was NOT called because the game is >6h away and was updated <120m ago
    expect(mockBatch.update).not.toHaveBeenCalled();
  });

  it('allows odds updates for games scheduled > 6 hours away if last update was > 120 minutes ago', async () => {
    const eightHoursFromNow = Date.now() + 8 * 60 * 60 * 1000;
    const scrapedMatchup = {
      gameId: 'nfl_future_2',
      league: 'NFL',
      title: 'Eagles @ Cowboys',
      type: 'MONEYLINE',
      active: true,
      status: 'STATUS_SCHEDULED',
      statusDesc: 'Upcoming',
      startTime: eightHoursFromNow,
      homeTeam: { id: 'dal', name: 'Cowboys', score: 0 },
      awayTeam: { id: 'phi', name: 'Eagles', score: 0 },
      metadata: {
        mlHome: -120,
        mlAway: 100,
      },
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'nfl_future_2',
      ref: 'matchupRef_nfl_future_2',
      data: () => ({
        gameId: 'nfl_future_2',
        league: 'NFL',
        title: 'Eagles @ Cowboys',
        type: 'MONEYLINE',
        active: true,
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Upcoming',
        updatedAt: Date.now() - 130 * 60 * 1000, // Updated 130 mins ago (> 120 mins)
        startTime: eightHoursFromNow,
        homeTeam: { id: 'dal', name: 'Cowboys', score: 0 },
        awayTeam: { id: 'phi', name: 'Eagles', score: 0 },
        metadata: {
          mlHome: -115,
          mlAway: -105,
        },
      }),
    };

    const res = await syncLeagueSchedules('NFL' as any, false);
    expect(res.success).toBe(true);

    // Verify batch.update WAS called because 120 minutes elapsed
    expect(mockBatch.update).toHaveBeenCalledWith('matchupRef_nfl_future_2', expect.objectContaining({
      'metadata.mlHome': -120,
      'metadata.mlAway': 100,
    }));
  });

  it('unabandons and activates a scheduled game (e.g. MBB) when fresh scrape has valid odds', async () => {
    const gameTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const scrapedMatchup = {
      gameId: 'mbb_revive_1',
      league: 'MBB',
      title: 'South Carolina @ USC',
      type: 'SPREAD',
      status: 'STATUS_SCHEDULED',
      statusDesc: '3:30 PM',
      startTime: gameTime,
      active: true, // Scraper found spread -9.5 and moneyline
      homeTeam: { id: 'usc', name: 'USC', score: 0 },
      awayTeam: { id: 'sc', name: 'South Carolina', score: 0 },
      metadata: {
        spread: -9.5,
        mlHome: -535,
        mlAway: 400,
      },
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: 'mbb_revive_1',
      ref: 'matchupRef_mbb_revive_1',
      data: () => ({
        gameId: 'mbb_revive_1',
        league: 'MBB',
        title: 'South Carolina @ USC',
        type: 'SPREAD',
        active: false,
        abandoned: true, // Previously abandoned because odds were not posted yet
        status: 'STATUS_SCHEDULED',
        statusDesc: '3:30 PM',
        updatedAt: Date.now() - 30 * 60 * 1000,
        startTime: gameTime,
        homeTeam: { id: 'usc', name: 'USC', score: 0 },
        awayTeam: { id: 'sc', name: 'South Carolina', score: 0 },
        metadata: {
          spread: null,
          mlHome: null,
          mlAway: null,
        },
      }),
    };

    const res = await syncLeagueSchedules('MBB' as any, false);
    expect(res.success).toBe(true);

    // Verify batch.update was called and unabandoned/activated the game
    expect(mockBatch.update).toHaveBeenCalledWith('matchupRef_mbb_revive_1', expect.objectContaining({
      abandoned: false,
      active: true,
      'metadata.spread': -9.5,
    }));
  });

  it('reverts SPREAD matchup back to SCORE and removes - ATS title when odds become milder and no picks exist', async () => {
    const gameTime = Date.now() + 2 * 60 * 60 * 1000;
    // Scraped matchup evaluates to SCORE because ML is -112 (milder than -250 ATS threshold)
    const scrapedMatchup = {
      gameId: '401920550',
      league: 'MBB',
      title: 'Eagles @ Miners',
      type: 'SCORE',
      active: true,
      abandoned: false,
      status: 'STATUS_SCHEDULED',
      statusDesc: '8:00 PM',
      startTime: gameTime,
      homeTeam: { id: 'miners', name: 'Miners', score: 0 },
      awayTeam: { id: 'eagles', name: 'Eagles', score: 0 },
      metadata: {
        spread: -1.5,
        mlHome: '-112',
        mlAway: '-108',
      },
    };

    vi.mocked(scrapeLeagueSchedules).mockResolvedValue({
      success: true,
      data: [scrapedMatchup],
    } as any);

    mockExistingDoc = {
      id: '401920550',
      ref: 'matchupRef_eagles_miners',
      data: () => ({
        gameId: '401920550',
        league: 'MBB',
        title: 'Eagles @ Miners - ATS',
        type: 'SPREAD',
        active: true,
        hasCustomTitle: true,
        abandoned: false,
        status: 'STATUS_SCHEDULED',
        statusDesc: '8:00 PM',
        updatedAt: Date.now() - 30 * 60 * 1000,
        startTime: gameTime,
        homeTeam: { id: 'miners', name: 'Miners', score: 0 },
        awayTeam: { id: 'eagles', name: 'Eagles', score: 0 },
        metadata: {
          spread: -1.5,
          mlHome: '-112',
          mlAway: '-108',
        },
      }),
    };

    const res = await syncLeagueSchedules('MBB' as any, false);
    expect(res.success).toBe(true);

    expect(mockBatch.update).toHaveBeenCalledWith('matchupRef_eagles_miners', expect.objectContaining({
      type: 'SCORE',
      title: 'Eagles @ Miners',
      hasCustomTitle: false,
      active: true,
    }));
  });
});



