import { describe, it, expect } from 'vitest';
import {
  executeRollover,
  compareBestChain,
  compareCurrentChain,
  compareMostWins,
  compareWinRate,
  compareLeaderboardStanding,
  getOrBuildMonthlySnapshot,
  ParticipantRecord,
} from './monthlyRollover';

describe('Monthly Rollover Logic & Cemented Snapshots', () => {
  it('resets monthly stats, archives historicalStats, and cements permanent snapshot with tiebreakers', async () => {
    const userUpdates: Array<{ id: string; data: any }> = [];
    const chainUpdates: Array<{ id: string; data: any }> = [];
    let notificationCreated: any = null;
    let savedSnapshotDoc: any = null;

    const mockUserData1 = {
      id: 'user1',
      username: 'Alice',
      stats: { wins: 15, losses: 5, pushes: 1 },
      allTimeStats: { wins: 50, losses: 20, pushes: 5 },
      allTimeBest: 8,
      historicalStats: {},
    };

    const mockUserData2 = {
      id: 'user2',
      username: 'Bob',
      stats: { wins: 10, losses: 5, pushes: 0 },
      allTimeStats: { wins: 30, losses: 15, pushes: 2 },
      allTimeBest: 8,
      historicalStats: {},
    };

    const chainsMap: Record<string, any> = {
      user1: {
        id: 'user1_current',
        userId: 'user1',
        chain: 4,
        best: 8,
        allTimeBest: 8,
      },
      user2: {
        id: 'user2_current',
        userId: 'user2',
        chain: 2,
        best: 8,
        allTimeBest: 8,
      },
    };

    const createQueryMock = () => ({
      limit: () => createQueryMock(),
      startAfter: () => createQueryMock(),
      get: async () => ({
        empty: false,
        docs: [
          {
            id: mockUserData1.id,
            ref: { id: mockUserData1.id },
            data: () => mockUserData1,
          },
          {
            id: mockUserData2.id,
            ref: { id: mockUserData2.id },
            data: () => mockUserData2,
          },
        ],
      }),
    });

    const mockAdminDb: any = {
      collection: (collName: string) => {
        if (collName === 'users') {
          return {
            orderBy: () => createQueryMock(),
            doc: (id: string) => ({ id }),
          };
        }
        if (collName === 'chains') {
          return {
            where: (_field: string, op: string, val: any) => ({
              get: async () => {
                if (op === 'in' && Array.isArray(val)) {
                  const docs = val
                    .map(uid => chainsMap[uid])
                    .filter(Boolean)
                    .map(chain => ({ id: chain.id, ref: { id: chain.id }, data: () => chain }));
                  return { docs };
                }
                const chain = chainsMap[val];
                return {
                  docs: chain ? [{ id: chain.id, ref: { id: chain.id }, data: () => chain }] : [],
                };
              },
            }),
            doc: (id: string) => ({ id }),
          };
        }
        if (collName === 'notifications') {
          return {
            doc: () => ({
              set: async (data: any) => {
                notificationCreated = data;
              },
            }),
          };
        }
        if (collName === 'monthlyResults') {
          return {
            doc: (id: string) => ({
              id,
              set: async (data: any) => {
                savedSnapshotDoc = { id, data };
              },
              get: async () => ({
                exists: !!savedSnapshotDoc,
                data: () => savedSnapshotDoc?.data,
              }),
            }),
          };
        }
        return {};
      },
      batch: () => ({
        update: (ref: any, data: any) => {
          if (ref.id === 'user1' || ref.id === 'user2') {
            userUpdates.push({ id: ref.id, data });
          } else if (ref.id === 'user1_current' || ref.id === 'user2_current') {
            chainUpdates.push({ id: ref.id, data });
          }
        },
        commit: async () => {},
      }),
    };

    const result = await executeRollover(mockAdminDb, '2026-08');

    expect(result).toBeDefined();
    expect(result.monthKey).toBe('2026-08');
    expect(result.totalParticipants).toBe(2);

    // Verify snapshot was created in monthlyResults
    expect(savedSnapshotDoc).not.toBeNull();
    expect(savedSnapshotDoc.id).toBe('2026-08');
    const snapshot = savedSnapshotDoc.data;
    expect(snapshot.monthKey).toBe('2026-08');
    expect(snapshot.monthLabel).toBe('August 2026');
    expect(snapshot.totalParticipants).toBe(2);
    expect(snapshot.totalWins).toBe(25);
    expect(snapshot.totalLosses).toBe(10);
    expect(snapshot.globalWinRate).toBeCloseTo((25 / 35) * 100, 1);

    // Longest Chain Tiebreaker: both bestChain = 8.
    // Alice has 15 wins vs Bob with 10 wins.
    // Therefore Alice should win topBestChain on tiebreaker!
    expect(snapshot.winners.topBestChain).not.toBeNull();
    expect(snapshot.winners.topBestChain.userId).toBe('user1');
    expect(snapshot.winners.topBestChain.displayName).toBe('Alice');
    expect(snapshot.winners.topBestChain.bestChain).toBe(8);
    expect(snapshot.winners.topBestChain.tiebreakerNote).toContain('15 Wins');

    // Standings should place Alice first, Bob second
    expect(snapshot.rankings.length).toBe(2);
    expect(snapshot.rankings[0].userId).toBe('user1');
    expect(snapshot.rankings[0].rank).toBe(1);
    expect(snapshot.rankings[1].userId).toBe('user2');
    expect(snapshot.rankings[1].rank).toBe(2);

    // Verify user historicalStats has cemented rank and chain
    const aliceUpdate = userUpdates.find(u => u.id === 'user1')?.data;
    expect(aliceUpdate.historicalStats['2026-08'].rank).toBe(1);
    expect(aliceUpdate.historicalStats['2026-08'].longestWinChain).toBe(8);
    expect(aliceUpdate.historicalStats['2026-08'].endOfMonthChain).toBe(4);

    // Chains reset to 0
    expect(chainUpdates.length).toBe(2);
    expect(chainUpdates[0].data.chain).toBe(0);
    expect(chainUpdates[0].data.best).toBe(0);

    // Notification created
    expect(notificationCreated).not.toBeNull();
    expect(notificationCreated.title).toBe('Monthly Winners! 🏅');

    // Test getOrBuildMonthlySnapshot retrieves the cemented snapshot
    const fetched = await getOrBuildMonthlySnapshot(mockAdminDb, '2026-08');
    expect(fetched).not.toBeNull();
    expect(fetched?.winners.topBestChain.userId).toBe('user1');
  });

  describe('Tiebreaker Comparators', () => {
    it('breaks best chain tie by wins, winRate, currentChain, and fewer losses', () => {
      const p1: ParticipantRecord = {
        userId: 'p1',
        displayName: 'P1',
        bestChain: 10,
        currentChain: 5,
        wins: 20,
        losses: 5,
        pushes: 0,
        stats: { wins: 20, losses: 5, pushes: 0 },
        winRate: 80,
        totalDecisions: 25,
      };

      const p2: ParticipantRecord = {
        userId: 'p2',
        displayName: 'P2',
        bestChain: 10,
        currentChain: 6,
        wins: 18,
        losses: 2,
        pushes: 0,
        stats: { wins: 18, losses: 2, pushes: 0 },
        winRate: 90,
        totalDecisions: 20,
      };

      // p1 has more wins (20 vs 18) -> p1 sorts before p2 (negative diff)
      const diff1 = compareBestChain(p1, p2);
      expect(diff1).toBeLessThan(0);

      // If wins are equal, higher winRate wins
      const p3: ParticipantRecord = {
        ...p2,
        wins: 20,
        stats: { wins: 20, losses: 2, pushes: 0 },
        winRate: 90.9,
        totalDecisions: 22,
      };
      const diff2 = compareBestChain(p1, p3);
      expect(diff2).toBeGreaterThan(0); // p3 (90.9%) sorts before p1 (80%)
    });

    it('breaks current chain tie by bestChain and wins', () => {
      const p1: ParticipantRecord = {
        userId: 'p1',
        displayName: 'P1',
        bestChain: 12,
        currentChain: 7,
        wins: 15,
        losses: 5,
        pushes: 0,
        stats: { wins: 15, losses: 5, pushes: 0 },
        winRate: 75,
        totalDecisions: 20,
      };

      const p2: ParticipantRecord = {
        userId: 'p2',
        displayName: 'P2',
        bestChain: 9,
        currentChain: 7,
        wins: 15,
        losses: 5,
        pushes: 0,
        stats: { wins: 15, losses: 5, pushes: 0 },
        winRate: 75,
        totalDecisions: 20,
      };

      const diff = compareCurrentChain(p1, p2);
      expect(diff).toBeLessThan(0); // p1 has better bestChain (12 vs 9)
    });

    it('breaks most wins tie by winRate and longest chain', () => {
      const p1: ParticipantRecord = {
        userId: 'p1',
        displayName: 'P1',
        bestChain: 8,
        currentChain: 4,
        wins: 25,
        losses: 3,
        pushes: 0,
        stats: { wins: 25, losses: 3, pushes: 0 },
        winRate: 89.3,
        totalDecisions: 28,
      };

      const p2: ParticipantRecord = {
        userId: 'p2',
        displayName: 'P2',
        bestChain: 10,
        currentChain: 2,
        wins: 25,
        losses: 7,
        pushes: 0,
        stats: { wins: 25, losses: 7, pushes: 0 },
        winRate: 78.1,
        totalDecisions: 32,
      };

      const diff = compareMostWins(p1, p2);
      expect(diff).toBeLessThan(0); // p1 has higher winRate (89.3% vs 78.1%)
    });

    it('sorts standings correctly via compareLeaderboardStanding', () => {
      const p1: ParticipantRecord = {
        userId: 'p1',
        displayName: 'P1',
        bestChain: 8,
        currentChain: 4,
        wins: 20,
        losses: 5,
        pushes: 0,
        stats: { wins: 20, losses: 5, pushes: 0 },
        winRate: 80,
        totalDecisions: 25,
      };

      const p2: ParticipantRecord = {
        userId: 'p2',
        displayName: 'P2',
        bestChain: 10,
        currentChain: 4,
        wins: 20,
        losses: 5,
        pushes: 0,
        stats: { wins: 20, losses: 5, pushes: 0 },
        winRate: 80,
        totalDecisions: 25,
      };

      const sortResult = compareLeaderboardStanding(p1, p2);
      expect(sortResult).toBeGreaterThan(0); // p2 (bestChain 10) comes before p1 (bestChain 8)
    });
  });
});
