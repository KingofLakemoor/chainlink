import { describe, it, expect, vi } from 'vitest';
import { executeRollover } from './monthlyRollover';

describe('Monthly Rollover Logic', () => {
  it('resets monthly stats, archives historicalStats, and creates notification', async () => {
    const userUpdates: Array<{ id: string; data: any }> = [];
    const chainUpdates: Array<{ id: string; data: any }> = [];
    let notificationCreated: any = null;

    const mockUserData = {
      id: 'user1',
      username: 'TestUser',
      stats: { wins: 5, losses: 2, pushes: 1 },
      allTimeStats: { wins: 20, losses: 10, pushes: 4 },
      allTimeBest: 7,
      historicalStats: {},
    };

    const mockChainData = {
      id: 'user1_current',
      userId: 'user1',
      chain: 3,
      best: 5,
      allTimeBest: 6,
    };

    const createQueryMock = () => ({
      limit: () => createQueryMock(),
      startAfter: () => createQueryMock(),
      get: async () => ({
        empty: false,
        docs: [
          {
            id: mockUserData.id,
            data: () => mockUserData,
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
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: mockChainData.id,
                    data: () => mockChainData,
                  },
                ],
              }),
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
        return {};
      },
      batch: () => ({
        update: (ref: any, data: any) => {
          if (ref.id === 'user1') {
            userUpdates.push({ id: ref.id, data });
          } else if (ref.id === 'user1_current') {
            chainUpdates.push({ id: ref.id, data });
          }
        },
        commit: async () => {},
      }),
    };

    await executeRollover(mockAdminDb, '2026-08');

    expect(userUpdates.length).toBe(1);
    const userUpdate = userUpdates[0].data;
    expect(userUpdate.stats).toEqual({ wins: 0, losses: 0, pushes: 0 });
    expect(userUpdate.allTimeStats).toEqual({ wins: 20, losses: 10, pushes: 4 });
    expect(userUpdate.allTimeBest).toBe(7);
    expect(userUpdate.historicalStats['2026-08']).toEqual({
      monthKey: '2026-08',
      monthLabel: 'August 2026',
      wins: 5,
      losses: 2,
      pushes: 1,
      longestWinChain: 5,
      longestLossChain: 0,
      endOfMonthChain: 3,
    });

    expect(chainUpdates.length).toBe(1);
    const chainUpdate = chainUpdates[0].data;
    expect(chainUpdate).toEqual({
      chain: 0,
      best: 0,
      wins: 0,
      losses: 0,
      allTimeBest: 7,
    });

    expect(notificationCreated).not.toBeNull();
    expect(notificationCreated.title).toBe('Monthly Winners! 🏅');
    expect(notificationCreated.audience).toBe('GLOBAL');
  });
});
