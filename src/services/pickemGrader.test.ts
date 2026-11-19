import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradeSinglePickemMatchup, setAdminDbMock } from './pickemGrader';

function createMockDb(options: {
  campaignDocs?: Record<string, any>;
  picks?: Array<{ id: string; data: any }>;
}) {
  const campaignDocs = options.campaignDocs || {};
  const picks = options.picks || [];
  const matchupUpdates: Array<{ id: string; data: any }> = [];
  const pickUpdates: Array<{ id: string; data: any }> = [];

  const mockDb: any = {
    collection: (name: string) => {
      if (name === 'pickemCampaigns') {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(campaignDocs[id]),
              data: () => campaignDocs[id],
            }),
          }),
        };
      }

      if (name === 'pickemMatchups') {
        return {
          doc: (id: string) => ({
            update: async (data: any) => {
              matchupUpdates.push({ id, data });
            },
          }),
        };
      }

      if (name === 'pickemPicks') {
        return {
          where: (_field: string, _op: string, values: string[]) => ({
            get: async () => ({
              docs: picks
                .filter((p) => values.includes(p.data.matchupId))
                .map((p) => ({
                  id: p.id,
                  ref: { id: p.id },
                  data: () => p.data,
                })),
            }),
          }),
        };
      }

      return {
        doc: () => ({ get: async () => ({ exists: false }) }),
      };
    },
    batch: () => {
      const ops: Array<() => void> = [];
      return {
        update: (ref: { id: string }, data: any) => {
          ops.push(() => pickUpdates.push({ id: ref.id, data }));
        },
        commit: async () => {
          ops.forEach((fn) => fn());
        },
      };
    },
  };

  return { mockDb, matchupUpdates, pickUpdates };
}

describe('pickemGrader - YES Day Moneyline Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grades YES Day (aUqhDhT3vKWfkPgSAVzf) as moneyline even if matchup was corrupted to SPREAD with -3.5', async () => {
    const matchup = {
      id: 'aUqhDhT3vKWfkPgSAVzf_10_401873059',
      campaignId: 'aUqhDhT3vKWfkPgSAVzf',
      week: 10,
      gameId: '401873059',
      title: 'Miami Dolphins @ Indianapolis Colts - ATS',
      type: 'SPREAD',
      status: 'STATUS_FINAL',
      homeTeam: { id: '11', name: 'Indianapolis Colts', shortName: 'Colts', abbreviation: 'IND', score: 24 },
      awayTeam: { id: '15', name: 'Miami Dolphins', shortName: 'Dolphins', abbreviation: 'MIA', score: 22 },
      metadata: { spread: -3.5 },
    };

    const { mockDb, matchupUpdates, pickUpdates } = createMockDb({
      campaignDocs: {
        aUqhDhT3vKWfkPgSAVzf: {
          name: 'YES Day Walk for Autism 2026',
          defaultMatchType: 'STANDARD',
        },
      },
      picks: [
        {
          id: 'pick_colts_user',
          data: {
            matchupId: 'aUqhDhT3vKWfkPgSAVzf_10_401873059',
            week: 10,
            pick: { teamId: '11' },
            status: 'LOSS',
            pointsEarned: 0,
          },
        },
        {
          id: 'pick_dolphins_user',
          data: {
            matchupId: 'aUqhDhT3vKWfkPgSAVzf_10_401873059',
            week: 10,
            pick: { teamId: '15' },
            status: 'WIN',
            pointsEarned: 1,
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    // Colts won 24-22 straight up -> winnerId must be '11', normalized to STANDARD, ATS stripped, isGraded true
    expect(matchupUpdates).toHaveLength(1);
    expect(matchupUpdates[0].data).toMatchObject({
      winnerId: '11',
      status: 'STATUS_FINAL',
      isGraded: true,
      type: 'STANDARD',
      manualTypeOverride: false,
      title: 'Miami Dolphins @ Indianapolis Colts',
    });

    const coltsUpdate = pickUpdates.find((u) => u.id === 'pick_colts_user');
    const dolphinsUpdate = pickUpdates.find((u) => u.id === 'pick_dolphins_user');
    expect(coltsUpdate?.data.status).toBe('WIN');
    expect(coltsUpdate?.data.pointsEarned).toBe(1);
    expect(dolphinsUpdate?.data.status).toBe('LOSS');
    expect(dolphinsUpdate?.data.pointsEarned).toBe(0);
  });

  it('grades YES Day by campaignId fallback even when campaign lookup misses or has no name/isCharity on matchup', async () => {
    const matchup = {
      id: 'aUqhDhT3vKWfkPgSAVzf_10_401873099',
      campaignId: 'aUqhDhT3vKWfkPgSAVzf',
      week: 10,
      gameId: '401873099',
      title: 'Away @ Home - ATS',
      type: 'SPREAD',
      manualTypeOverride: true,
      status: 'STATUS_FINAL',
      homeTeam: { id: 'home_1', name: 'Home Team', score: 21 },
      awayTeam: { id: 'away_1', name: 'Away Team', score: 20 },
      metadata: { spread: -7.5 },
    };

    const { mockDb, matchupUpdates, pickUpdates } = createMockDb({
      campaignDocs: {},
      picks: [
        {
          id: 'pick_home',
          data: {
            matchupId: 'aUqhDhT3vKWfkPgSAVzf_10_401873099',
            week: 10,
            pick: { teamId: 'home_1' },
            status: 'PENDING',
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    expect(matchupUpdates[0].data.winnerId).toBe('home_1');
    expect(matchupUpdates[0].data.type).toBe('STANDARD');
    expect(matchupUpdates[0].data.isGraded).toBe(true);
    expect(pickUpdates[0].data.status).toBe('WIN');
    expect(pickUpdates[0].data.pointsEarned).toBe(1);
  });

  it('still grades regular SPREAD campaigns Against The Spread', async () => {
    const matchup = {
      id: 'spread_camp_10_401873059',
      campaignId: 'spread_camp',
      week: 10,
      gameId: '401873059',
      title: 'Miami Dolphins @ Indianapolis Colts - ATS',
      type: 'SPREAD',
      status: 'STATUS_FINAL',
      homeTeam: { id: '11', name: 'Indianapolis Colts', score: 24 },
      awayTeam: { id: '15', name: 'Miami Dolphins', score: 22 },
      metadata: { spread: -3.5 },
    };

    const { mockDb, matchupUpdates, pickUpdates } = createMockDb({
      campaignDocs: {
        spread_camp: {
          name: 'Weekly Spread League',
          defaultMatchType: 'SPREAD',
        },
      },
      picks: [
        {
          id: 'pick_dolphins',
          data: {
            matchupId: 'spread_camp_10_401873059',
            week: 10,
            pick: { teamId: '15' },
            status: 'PENDING',
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    // 24 + (-3.5) = 20.5 < 22 -> Dolphins (15) cover and win ATS
    expect(matchupUpdates[0].data.winnerId).toBe('15');
    expect(matchupUpdates[0].data.isGraded).toBe(true);
    expect(pickUpdates[0].data.status).toBe('WIN');
  });

  it('respects manualTypeOverride on non-YES-Day STANDARD campaigns while enforcing moneyline without override', async () => {
    const matchupManualSpread = {
      id: 'std_camp_10_1',
      campaignId: 'std_camp',
      week: 10,
      gameId: '1',
      title: 'Miami Dolphins @ Indianapolis Colts - ATS',
      type: 'SPREAD',
      manualTypeOverride: true,
      status: 'STATUS_FINAL',
      homeTeam: { id: '11', name: 'Indianapolis Colts', score: 24 },
      awayTeam: { id: '15', name: 'Miami Dolphins', score: 22 },
      metadata: { spread: -3.5 },
    };

    const { mockDb, matchupUpdates } = createMockDb({
      campaignDocs: {
        std_camp: {
          name: 'Standard Picks League',
          defaultMatchType: 'STANDARD',
        },
      },
      picks: [],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchupManualSpread);
    expect(matchupUpdates[0].data.winnerId).toBe('15');
  });

  it('strictly grades YES Day as straight moneyline when identified solely by document ID prefix', async () => {
    // Game where home team wins 21-20, but spread is -3.5.
    // If graded ATS: 21 - 3.5 = 17.5 < 20 (away covers).
    // If straight moneyline: 21 > 20 (home wins straight up).
    const matchup = {
      id: 'yes_day_2026_12_401873111',
      campaignId: 'unknown_raw_id_123',
      week: 12,
      gameId: '401873111',
      title: 'Green Bay Packers @ Detroit Lions - ATS',
      type: 'SPREAD',
      status: 'STATUS_FINAL',
      homeTeam: { id: 'DET', name: 'Detroit Lions', score: 21 },
      awayTeam: { id: 'GB', name: 'Green Bay Packers', score: 20 },
      metadata: { spread: -3.5 },
    };

    const { mockDb, matchupUpdates, pickUpdates } = createMockDb({
      campaignDocs: {}, // Campaign lookup yields nothing
      picks: [
        {
          id: 'pick_lions',
          data: {
            matchupId: 'yes_day_2026_12_401873111',
            week: 12,
            pick: { teamId: 'DET' },
            status: 'PENDING',
          },
        },
        {
          id: 'pick_packers',
          data: {
            matchupId: 'yes_day_2026_12_401873111',
            week: 12,
            pick: { teamId: 'GB' },
            status: 'PENDING',
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    // Straight-up winner is DET ('DET')
    expect(matchupUpdates[0].data.winnerId).toBe('DET');
    expect(matchupUpdates[0].data.type).toBe('STANDARD');
    expect(matchupUpdates[0].data.title).toBe('Green Bay Packers @ Detroit Lions');

    const lionsPick = pickUpdates.find((p) => p.id === 'pick_lions');
    const packersPick = pickUpdates.find((p) => p.id === 'pick_packers');
    expect(lionsPick?.data.status).toBe('WIN');
    expect(lionsPick?.data.pointsEarned).toBe(1);
    expect(packersPick?.data.status).toBe('LOSS');
    expect(packersPick?.data.pointsEarned).toBe(0);
  });

  it('strictly grades underdog straight-up victory as WIN for YES Day even when favorite was given huge spread', async () => {
    // Underdog away team (NYJ) wins outright 17-14 over heavy favorite home team (KC -10.5).
    const matchup = {
      id: 'charity_4_401873200',
      campaignId: 'charity',
      week: 4,
      gameId: '401873200',
      title: 'New York Jets @ Kansas City Chiefs - ATS',
      type: 'SPREAD',
      status: 'STATUS_FINAL',
      homeTeam: { id: 'KC', name: 'Kansas City Chiefs', score: 14 },
      awayTeam: { id: 'NYJ', name: 'New York Jets', score: 17 },
      metadata: { spread: -10.5, isCharity: true },
    };

    const { mockDb, matchupUpdates, pickUpdates } = createMockDb({
      picks: [
        {
          id: 'pick_kc',
          data: {
            matchupId: 'charity_4_401873200',
            week: 4,
            pick: { teamId: 'KC' },
            status: 'PENDING',
            confidence: 10,
          },
        },
        {
          id: 'pick_nyj',
          data: {
            matchupId: 'charity_4_401873200',
            week: 4,
            pick: { teamId: 'NYJ' },
            status: 'PENDING',
            confidence: 8,
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    expect(matchupUpdates[0].data.winnerId).toBe('NYJ');
    expect(matchupUpdates[0].data.type).toBe('STANDARD');

    const kcPick = pickUpdates.find((p) => p.id === 'pick_kc');
    const nyjPick = pickUpdates.find((p) => p.id === 'pick_nyj');
    expect(nyjPick?.data.status).toBe('WIN');
    expect(nyjPick?.data.pointsEarned).toBe(8); // Respects confidence
    expect(kcPick?.data.status).toBe('LOSS');
    expect(kcPick?.data.pointsEarned).toBe(0);
  });

  it('correctly grades tie games in YES Day as PUSH (0 points, PUSH status)', async () => {
    const matchup = {
      id: 'aUqhDhT3vKWfkPgSAVzf_15_401873333',
      campaignId: 'aUqhDhT3vKWfkPgSAVzf',
      week: 15,
      gameId: '401873333',
      title: 'Cincinnati Bengals @ Pittsburgh Steelers',
      type: 'STANDARD',
      status: 'STATUS_FINAL',
      homeTeam: { id: 'PIT', name: 'Pittsburgh Steelers', score: 20 },
      awayTeam: { id: 'CIN', name: 'Cincinnati Bengals', score: 20 },
    };

    const { mockDb, matchupUpdates, pickUpdates } = createMockDb({
      picks: [
        {
          id: 'pick_pit',
          data: {
            matchupId: 'aUqhDhT3vKWfkPgSAVzf_15_401873333',
            week: 15,
            pick: { teamId: 'PIT' },
            status: 'PENDING',
            confidence: 5,
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    expect(matchupUpdates[0].data.winnerId).toBe('PUSH');
    expect(pickUpdates[0].data.status).toBe('PUSH');
    expect(pickUpdates[0].data.pointsEarned).toBe(0);
  });

  it('queries and resolves picks across all YES Day charity alias ID formats', async () => {
    // Picks submitted under different targetId aliases for the same game
    const matchup = {
      id: 'aUqhDhT3vKWfkPgSAVzf_7_401873444',
      campaignId: 'aUqhDhT3vKWfkPgSAVzf',
      week: 7,
      gameId: '401873444',
      title: 'Buffalo Bills @ New England Patriots',
      status: 'STATUS_FINAL',
      homeTeam: { id: 'NE', name: 'New England Patriots', score: 10 },
      awayTeam: { id: 'BUF', name: 'Buffalo Bills', score: 24 },
    };

    const { mockDb, pickUpdates } = createMockDb({
      picks: [
        // Pick stored under charity alias
        {
          id: 'pick_charity_alias',
          data: {
            matchupId: 'charity_7_401873444',
            week: 7,
            pick: { teamId: 'BUF' },
            status: 'PENDING',
          },
        },
        // Pick stored under raw gameId
        {
          id: 'pick_raw_game_id',
          data: {
            matchupId: '401873444',
            week: 7,
            pick: { teamId: 'BUF' },
            status: 'PENDING',
          },
        },
        // Pick stored under canonical matchup id
        {
          id: 'pick_canonical',
          data: {
            matchupId: 'aUqhDhT3vKWfkPgSAVzf_7_401873444',
            week: 7,
            pick: { teamId: 'BUF' },
            status: 'PENDING',
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    // All three alias formats must be found and graded
    expect(pickUpdates).toHaveLength(3);
    pickUpdates.forEach((p) => {
      expect(p.data.status).toBe('WIN');
      expect(p.data.pointsEarned).toBe(1);
    });
  });
});

