import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradeSinglePickemMatchup, payoutPickemCampaign, finalizePickemCampaign, setAdminDbMock } from './pickemGrader';

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

  it('correctly grades OVER_UNDER matchup when overUnder is in title but null in metadata (e.g. Colts @ Texans - O/U 44.5)', async () => {
    // 26 + 3 = 29, O/U is 44.5 -> UNDER wins
    const matchup = {
      id: 'pickem_401873066',
      gameId: '401873066',
      title: 'Colts @ Texans - O/U 44.5',
      type: 'OVER_UNDER',
      status: 'STATUS_FINAL',
      homeTeam: { id: '34', name: 'Texans', score: 26 },
      awayTeam: { id: '11', name: 'Colts', score: 3 },
      metadata: { overUnder: null },
    };

    const { mockDb, matchupUpdates, pickUpdates } = createMockDb({
      picks: [
        {
          id: 'pick_over',
          data: {
            matchupId: 'pickem_401873066',
            pick: { teamId: 'OVER' },
            status: 'PENDING',
          },
        },
        {
          id: 'pick_under',
          data: {
            matchupId: 'pickem_401873066',
            pick: { teamId: 'UNDER' },
            status: 'PENDING',
          },
        },
      ],
    });

    setAdminDbMock(mockDb);
    await gradeSinglePickemMatchup(matchup);

    expect(matchupUpdates[0].data.winnerId).toBe('UNDER');
    const overPick = pickUpdates.find((p) => p.id === 'pick_over');
    const underPick = pickUpdates.find((p) => p.id === 'pick_under');

    expect(underPick?.data.status).toBe('WIN');
    expect(underPick?.data.pointsEarned).toBe(1);
    expect(overPick?.data.status).toBe('LOSS');
    expect(overPick?.data.pointsEarned).toBe(0);
  });
});

describe('pickemGrader - payoutPickemCampaign & finalizePickemCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createPayoutMockDb(options: {
    campaignDocs?: Record<string, any>;
    leaderboardDocs?: Record<string, any>;
    users?: Record<string, any>;
    participants?: Array<{ id: string; data: any }>;
    picks?: Array<{ id: string; data: any }>;
  }) {
    const campaignDocs = options.campaignDocs || {};
    const leaderboardDocs = options.leaderboardDocs || {};
    const users = options.users || {};
    const participants = options.participants || [];
    const picks = options.picks || [];

    const linkTransactions: any[] = [];
    const notifications: any[] = [];
    const userUpdates: Record<string, any> = {};
    const campaignUpdates: Record<string, any> = {};

    const mockDb: any = {
      collection: (name: string) => {
        if (name === 'pickemCampaigns') {
          return {
            doc: (id: string) => ({
              get: async () => ({
                exists: Boolean(campaignDocs[id]),
                id,
                data: () => campaignDocs[id],
              }),
              update: async (data: any) => {
                campaignUpdates[id] = { ...campaignDocs[id], ...data };
                campaignDocs[id] = campaignUpdates[id];
              },
            }),
            get: async () => ({
              docs: Object.keys(campaignDocs).map((id) => ({
                id,
                data: () => campaignDocs[id],
              })),
            }),
          };
        }

        if (name === 'pickemLeaderboards') {
          return {
            doc: (id: string) => ({
              get: async () => ({
                exists: Boolean(leaderboardDocs[id]),
                id,
                data: () => leaderboardDocs[id],
              }),
              set: async (data: any) => {
                leaderboardDocs[id] = data;
              },
            }),
          };
        }

        if (name === 'users') {
          return {
            doc: (id: string) => ({
              get: async () => ({
                exists: Boolean(users[id]),
                id,
                data: () => users[id],
              }),
              update: async (data: any) => {
                userUpdates[id] = { ...users[id], ...data };
                users[id] = userUpdates[id];
              },
            }),
          };
        }

        if (name === 'pickemParticipants') {
          return {
            where: (field: string, op: string, val: any) => ({
              get: async () => ({
                docs: participants
                  .filter((p) => (op === 'in' ? val.includes(p.data[field]) : p.data[field] === val))
                  .map((p) => ({ id: p.id, data: () => p.data })),
              }),
            }),
          };
        }

        if (name === 'pickemPicks') {
          return {
            where: (field: string, op: string, val: any) => ({
              get: async () => ({
                docs: picks
                  .filter((p) => (op === 'in' ? val.includes(p.data[field]) : p.data[field] === val))
                  .map((p) => ({ id: p.id, data: () => p.data })),
              }),
            }),
          };
        }

        if (name === 'linkTransactions') {
          return {
            doc: () => ({
              set: async (data: any) => {
                linkTransactions.push(data);
              },
            }),
          };
        }

        if (name === 'notifications') {
          return {
            doc: () => ({
              set: async (data: any) => {
                notifications.push(data);
              },
            }),
          };
        }

        return {
          doc: () => ({ get: async () => ({ exists: false }), set: async () => {}, update: async () => {} }),
          where: () => ({ get: async () => ({ docs: [] }) }),
        };
      },
      runTransaction: async (cb: any) => {
        const tx = {
          get: async (ref: any) => ref.get(),
          update: async (ref: any, data: any) => ref.update(data),
          set: async (ref: any, data: any) => ref.set(data),
        };
        return cb(tx);
      },
    };

    return {
      mockDb,
      campaignDocs,
      users,
      userUpdates,
      campaignUpdates,
      linkTransactions,
      notifications,
    };
  }

  it('correctly calculates Turkey Day Gobbler payout from prizePot, splits ties, awards Links and exclusive banner', async () => {
    const { mockDb, users, userUpdates, linkTransactions, campaignUpdates } = createPayoutMockDb({
      campaignDocs: {
        turkey_gobbler_2026: {
          name: '1st Annual Turkey Day Gobbler',
          entryFee: 0,
          prizePot: 1000,
          payoutSplit: { first: 70, second: 20, third: 10 },
          awardBannerId: 'banner_turkey_gobbler',
          payoutComplete: false,
        },
      },
      leaderboardDocs: {
        turkey_gobbler_2026: {
          campaignId: 'turkey_gobbler_2026',
          season: [
            { uid: 'user_turkey_champ', points: 10, rank: 1 },
            { uid: 'user_runner_up', points: 8, rank: 2 },
            { uid: 'user_third', points: 7, rank: 3 },
          ],
        },
      },
      users: {
        user_turkey_champ: { username: 'PilgrimKing', links: 50, inventory: [] },
        user_runner_up: { username: 'CranberrySauce', links: 20, inventory: [] },
        user_third: { username: 'StuffingLover', links: 10, inventory: [] },
      },
    });

    setAdminDbMock(mockDb);

    await payoutPickemCampaign('turkey_gobbler_2026');

    // 1st gets 70% of 1000 = 700 links
    expect(users['user_turkey_champ'].links).toBe(50 + 700);
    // 1st gets banner_turkey_gobbler in inventory
    expect(users['user_turkey_champ'].inventory).toContain('banner_turkey_gobbler');

    // 2nd gets 20% of 1000 = 200 links
    expect(users['user_runner_up'].links).toBe(20 + 200);

    // 3rd gets 10% of 1000 = 100 links
    expect(users['user_third'].links).toBe(10 + 100);

    // Campaign marked payoutComplete
    expect(campaignUpdates['turkey_gobbler_2026'].payoutComplete).toBe(true);

    // Link transactions recorded
    expect(linkTransactions).toHaveLength(3);
    const champTx = linkTransactions.find((tx) => tx.userId === 'user_turkey_champ');
    expect(champTx?.amount).toBe(700);
    expect(champTx?.type).toBe('PICKEM_WIN');
  });

  it('allows re-running payout with force: true if previous payout completed prematurely with 0 links', async () => {
    const { mockDb, users, campaignUpdates, linkTransactions } = createPayoutMockDb({
      campaignDocs: {
        turkey_day_campaign: {
          name: 'Turkey Day Pick Em',
          entryFee: 0,
          fixedPrizePot: 500,
          payoutComplete: true, // Marked complete before fix
        },
      },
      leaderboardDocs: {
        turkey_day_campaign: {
          campaignId: 'turkey_day_campaign',
          season: [
            { uid: 'winner_1', points: 9, rank: 1 },
          ],
        },
      },
      users: {
        winner_1: { username: 'WinnerOne', links: 100, inventory: [] },
      },
    });

    setAdminDbMock(mockDb);

    // Calling without force throws
    await expect(payoutPickemCampaign('turkey_day_campaign')).rejects.toThrow('Payout already completed');

    // Calling with force: true succeeds and distributes correct links and banner
    await payoutPickemCampaign('turkey_day_campaign', { force: true });

    // 70% of 500 = 350 Links
    expect(users['winner_1'].links).toBe(100 + 350);
    expect(users['winner_1'].inventory).toContain('banner_turkey_gobbler');
    expect(linkTransactions).toHaveLength(1);
    expect(linkTransactions[0].amount).toBe(350);
  });

  it('correctly splits pot evenly between two tied 1st place winners and awards 3rd to next tier', async () => {
    const { mockDb, users, linkTransactions } = createPayoutMockDb({
      campaignDocs: {
        turkey_pot_split: {
          name: 'Turkey Day Gobbler Championship',
          entryFee: 0,
          prizePot: 900,
          payoutSplit: { first: 70, second: 20, third: 10 },
          awardBannerId: 'banner_turkey_gobbler',
          payoutComplete: false,
        },
      },
      leaderboardDocs: {
        turkey_pot_split: {
          campaignId: 'turkey_pot_split',
          season: [
            { uid: 'tie_user_1', points: 15, rank: 1 },
            { uid: 'tie_user_2', points: 15, rank: 1 },
            { uid: 'third_user', points: 12, rank: 3 },
          ],
        },
      },
      users: {
        tie_user_1: { username: 'TomTurkey', links: 0, inventory: [] },
        tie_user_2: { username: 'GravyBoat', links: 0, inventory: [] },
        third_user: { username: 'PumpkinPie', links: 0, inventory: [] },
      },
    });

    setAdminDbMock(mockDb);
    await payoutPickemCampaign('turkey_pot_split');

    // Total pot = 900
    // 1st pot = 70% (630), 2nd pot = 20% (180), 3rd pot = 10% (90)
    // 2-way tie for 1st pools 1st + 2nd pot = 630 + 180 = 810. Each gets floor(810 / 2) = 405 Links.
    expect(users['tie_user_1'].links).toBe(405);
    expect(users['tie_user_2'].links).toBe(405);
    // Both 1st place winners receive the champion banner!
    expect(users['tie_user_1'].inventory).toContain('banner_turkey_gobbler');
    expect(users['tie_user_2'].inventory).toContain('banner_turkey_gobbler');

    // 3rd place gets 3rd pot (90 links)
    expect(users['third_user'].links).toBe(90);
    expect(users['third_user'].inventory).not.toContain('banner_turkey_gobbler');

    expect(linkTransactions).toHaveLength(3);
  });
});




