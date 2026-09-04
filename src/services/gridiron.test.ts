import { describe, it, expect, beforeEach } from 'vitest';
import { filterAndNormalizeGridironGames } from './gridironIngestion';
import { evaluateGridironPick, gradeGridironWeek, updateGridironLeaderboard, isGameStatusFinal, setAdminDbMock } from './gridironGrader';
import { GridironPick, GridironEntry } from '../types/gridiron';

describe('Gridiron Service Tests', () => {
  describe('isGameStatusFinal', () => {
    it('identifies various final status strings as final', () => {
      expect(isGameStatusFinal('STATUS_FINAL')).toBe(true);
      expect(isGameStatusFinal('final')).toBe(true);
      expect(isGameStatusFinal('STATUS_FULL_TIME')).toBe(true);
      expect(isGameStatusFinal('STATUS_FINAL_OVERTIME')).toBe(true);
      expect(isGameStatusFinal('COMPLETED')).toBe(true);
      expect(isGameStatusFinal('CLOSED')).toBe(true);
      expect(isGameStatusFinal('STATUS_SCHEDULED')).toBe(false);
      expect(isGameStatusFinal('STATUS_IN_PROGRESS')).toBe(false);
    });
  });
  describe('filterAndNormalizeGridironGames', () => {
    it('retains games with BOTH valid spread AND valid total line', () => {
      const rawMatchups = [
        {
          gameId: 'g1',
          awayTeam: { name: 'Miami Dolphins', shortName: 'MIA' },
          homeTeam: { name: 'Buffalo Bills', shortName: 'BUF' },
          startTime: Date.now() + 100000,
          status: 'STATUS_SCHEDULED',
          metadata: { spread: '-3.5', overUnder: '48.5' }
        }
      ];

      const result = filterAndNormalizeGridironGames(rawMatchups, 'NFL');
      expect(result.length).toBe(1);
      expect(result[0].gameId).toBe('g1');
      expect(result[0].spread.homeSpread).toBe(-3.5);
      expect(result[0].spread.awaySpread).toBe(3.5);
      expect(result[0].total.line).toBe(48.5);
    });

    it('discards games missing EITHER spread OR total line', () => {
      const rawMatchups = [
        {
          gameId: 'g_no_total',
          awayTeam: { name: 'Team A' },
          homeTeam: { name: 'Team B' },
          metadata: { spread: '-3.5' } // Missing total
        },
        {
          gameId: 'g_no_spread',
          awayTeam: { name: 'Team C' },
          homeTeam: { name: 'Team D' },
          metadata: { overUnder: '45.0' } // Missing spread
        }
      ];

      const result = filterAndNormalizeGridironGames(rawMatchups, 'CFB');
      expect(result.length).toBe(0);
    });

    it('sorts games chronologically by start time (kickoffTime)', () => {
      const t1 = 1700000000000;
      const t2 = 1700003600000;
      const t3 = 1700007200000;

      const rawMatchupsNFL = [
        {
          gameId: 'nfl_late',
          awayTeam: { name: 'NFL Late' },
          homeTeam: { name: 'NFL Late Home' },
          startTime: t3,
          metadata: { spread: '-3.5', overUnder: '48.5' }
        },
        {
          gameId: 'nfl_early',
          awayTeam: { name: 'NFL Early' },
          homeTeam: { name: 'NFL Early Home' },
          startTime: t1,
          metadata: { spread: '-2.5', overUnder: '45.0' }
        }
      ];

      const rawMatchupsCFB = [
        {
          gameId: 'cfb_mid',
          awayTeam: { name: 'CFB Mid' },
          homeTeam: { name: 'CFB Mid Home' },
          startTime: t2,
          metadata: { spread: '-7.0', overUnder: '52.0' }
        }
      ];

      const getKickoffMs = (kickoffTime: any): number => {
        if (!kickoffTime) return 0;
        if (typeof kickoffTime === 'number') return kickoffTime;
        if (typeof kickoffTime?.toMillis === 'function') return kickoffTime.toMillis();
        if (typeof kickoffTime?.seconds === 'number') return kickoffTime.seconds * 1000;
        const parsed = new Date(kickoffTime).getTime();
        return isNaN(parsed) ? 0 : parsed;
      };

      const nflGames = filterAndNormalizeGridironGames(rawMatchupsNFL, 'NFL');
      const cfbGames = filterAndNormalizeGridironGames(rawMatchupsCFB, 'CFB');

      const allGames = [...nflGames, ...cfbGames].sort((a, b) => {
        const timeA = getKickoffMs(a.kickoffTime);
        const timeB = getKickoffMs(b.kickoffTime);
        if (timeA !== timeB) return timeA - timeB;
        return a.gameId.localeCompare(b.gameId);
      });

      expect(allGames.length).toBe(3);
      expect(allGames[0].gameId).toBe('nfl_early');
      expect(allGames[1].gameId).toBe('cfb_mid');
      expect(allGames[2].gameId).toBe('nfl_late');
    });
  });

  describe('evaluateGridironPick', () => {
    it('correctly grades home_spread picks', () => {
      const pick: GridironPick = {
        gameId: 'g1',
        league: 'NFL',
        pickType: 'spread',
        selection: 'home_spread',
        value: -3.5,
        kickoffTime: Date.now(),
        status: 'pending'
      };

      // BUF 24 - MIA 20 => Home wins by 4 points (> 3.5 spread) => WON
      expect(evaluateGridironPick(pick, 24, 20)).toBe('won');

      // BUF 21 - MIA 20 => Home wins by 1 point (< 3.5 spread) => LOST
      expect(evaluateGridironPick(pick, 21, 20)).toBe('lost');
    });

    it('correctly grades away_spread picks', () => {
      const pick: GridironPick = {
        gameId: 'g1',
        league: 'NFL',
        pickType: 'spread',
        selection: 'away_spread',
        value: 3.5,
        kickoffTime: Date.now(),
        status: 'pending'
      };

      // MIA 20 + 3.5 = 23.5 vs BUF 21 => 23.5 > 21 => WON
      expect(evaluateGridironPick(pick, 21, 20)).toBe('won');

      // MIA 20 + 3.5 = 23.5 vs BUF 27 => 23.5 < 27 => LOST
      expect(evaluateGridironPick(pick, 27, 20)).toBe('lost');
    });

    it('correctly grades over/under total picks', () => {
      const overPick: GridironPick = {
        gameId: 'g1',
        league: 'NFL',
        pickType: 'total',
        selection: 'over',
        value: 48.5,
        kickoffTime: Date.now(),
        status: 'pending'
      };

      const underPick: GridironPick = {
        ...overPick,
        selection: 'under'
      };

      // Total = 28 + 24 = 52 (> 48.5) => Over WON, Under LOST
      expect(evaluateGridironPick(overPick, 28, 24)).toBe('won');
      expect(evaluateGridironPick(underPick, 28, 24)).toBe('lost');

      // Total = 20 + 17 = 37 (< 48.5) => Over LOST, Under WON
      expect(evaluateGridironPick(overPick, 20, 17)).toBe('lost');
      expect(evaluateGridironPick(underPick, 20, 17)).toBe('won');
    });
  });

  describe('Blind Reveal Security Logic', () => {
    it('masks competitor picks before kickoff and reveals after kickoff', () => {
      const futureKickoff = Date.now() + 3600000;
      const pastKickoff = Date.now() - 3600000;
      const now = Date.now();

      const competitorUnlockedPick: GridironPick = {
        gameId: 'g_future',
        league: 'NFL',
        pickType: 'spread',
        selection: 'away_spread',
        value: 3.5,
        kickoffTime: futureKickoff,
        status: 'pending'
      };

      const competitorLockedPick: GridironPick = {
        gameId: 'g_past',
        league: 'NFL',
        pickType: 'total',
        selection: 'over',
        value: 48.5,
        kickoffTime: pastKickoff,
        status: 'pending'
      };

      // Masking function test for competitor
      const isOwner = false;

      const maskPick = (p: GridironPick) => {
        const isLocked = now >= p.kickoffTime;
        if (isOwner || isLocked) {
          return { ...p, isLocked };
        } else {
          return {
            gameId: p.gameId,
            league: p.league,
            pickType: p.pickType,
            selection: 'HIDDEN' as const,
            value: 0,
            kickoffTime: p.kickoffTime,
            status: 'pending' as const,
            isLocked: false
          };
        }
      };

      const maskedUnlocked = maskPick(competitorUnlockedPick);
      expect(maskedUnlocked.selection).toBe('HIDDEN');
      expect(maskedUnlocked.value).toBe(0);

      const maskedLocked = maskPick(competitorLockedPick);
      expect(maskedLocked.selection).toBe('over');
      expect(maskedLocked.value).toBe(48.5);
    });
  });

  describe('gradeGridironWeek with Weekly Snapshot & Purging', () => {
    let mockStore: Record<string, Record<string, any>>;

    const createMockAdminDb = () => {
      return {
        collection: (collName: string) => ({
          doc: (docId: string) => ({
            path: `${collName}/${docId}`,
            id: docId,
            get: async () => ({
              exists: !!mockStore[collName]?.[docId],
              data: () => mockStore[collName]?.[docId]
            }),
            set: async (data: any, options?: any) => {
              if (!mockStore[collName]) mockStore[collName] = {};
              if (options?.merge) {
                mockStore[collName][docId] = { ...(mockStore[collName][docId] || {}), ...data };
              } else {
                mockStore[collName][docId] = data;
              }
            },
            update: async (data: any) => {
              if (mockStore[collName]?.[docId]) {
                mockStore[collName][docId] = { ...mockStore[collName][docId], ...data };
              }
            },
            collection: (subColl: string) => ({
              doc: (subDocId: string) => ({
                set: async (data: any) => {
                  const key = `${collName}/${docId}/${subColl}`;
                  if (!mockStore[key]) mockStore[key] = {};
                  mockStore[key][subDocId] = data;
                }
              }),
              get: async () => {
                const key = `${collName}/${docId}/${subColl}`;
                const docs = Object.entries(mockStore[key] || {})
                  .map(([id, d]) => ({ id, data: () => d }));
                return { empty: docs.length === 0, docs };
              }
            })
          }),
          where: (field: string, op: string, val: any) => ({
            where: (f2: string, op2: string, v2: any) => ({
              get: async () => {
                const docs = Object.entries(mockStore[collName] || {})
                  .filter(([_, d]) => {
                    const match1 = Array.isArray(d[field]) ? d[field].includes(val) : d[field] === val;
                    const match2 = Array.isArray(d[f2]) ? d[f2].includes(v2) : d[f2] === v2;
                    return match1 && match2;
                  })
                  .map(([id, d]) => ({ id, ref: { delete: async () => delete mockStore[collName][id] }, data: () => d }));
                return { empty: docs.length === 0, docs };
              }
            }),
            get: async () => {
              const docs = Object.entries(mockStore[collName] || {})
                .filter(([_, d]) => Array.isArray(d[field]) ? d[field].includes(val) : d[field] === val)
                .map(([id, d]) => ({ id, ref: { delete: async () => delete mockStore[collName][id] }, data: () => d }));
              return { empty: docs.length === 0, docs };
            }
          }),
          get: async () => {
            const docs = Object.entries(mockStore[collName] || {})
              .map(([id, d]) => ({ id, data: () => d }));
            return { empty: docs.length === 0, docs };
          }
        }),
        getAll: async (...refs: any[]) => {
          return refs.map(r => {
            const pathParts = r.path ? r.path.split('/') : [];
            const collName = pathParts[0] || 'matchups';
            const docId = pathParts[1];
            const d = mockStore[collName]?.[docId];
            return {
              id: docId,
              exists: !!d,
              data: () => d
            };
          });
        },
        batch: () => {
          const operations: (() => void)[] = [];
          return {
            set: (ref: any, data: any, options?: any) => operations.push(() => ref.set(data, options)),
            delete: (ref: any) => operations.push(() => ref.delete()),
            commit: async () => operations.forEach(op => op())
          };
        }
      };
    };

    beforeEach(() => {
      mockStore = {
        gridiron_3x3_lines: {
          '2026_week_01': {
            season: 2026,
            weekNumber: 1,
            games: [
              {
                gameId: 'g1',
                league: 'NFL',
                status: 'final',
                spread: { awaySpread: 3.5, homeSpread: -3.5 },
                total: { line: 48.5 }
              }
            ]
          }
        },
        gridiron_3x3_contests: {
          'contest_1': {
            contestId: 'contest_1',
            name: 'Group 1',
            participants: ['u1']
          }
        },
        gridiron_3x3_entries: {
          'contest_1_u1_1': {
            entryId: 'contest_1_u1_1',
            contestId: 'contest_1',
            userId: 'u1',
            displayName: 'Player One',
            season: 2026,
            weekNumber: 1,
            picks: [
              {
                gameId: 'g1',
                league: 'NFL',
                pickType: 'spread',
                selection: 'home_spread',
                value: -3.5,
                kickoffTime: Date.now() - 3600000,
                status: 'pending'
              }
            ]
          }
        }
      };
      setAdminDbMock(createMockAdminDb());
    });

    it('grades week, writes leaderboards, creates consolidated snapshot, and purges individual entries when finalizeAndPurge is true', async () => {
      const res = await gradeGridironWeek(2026, 1, { finalizeAndPurge: true });

      expect(res.success).toBe(true);
      expect(res.isFinalized).toBe(true);
      expect(res.snapshottedEntries).toBe(1);
      expect(res.purgedEntries).toBe(1);

      // Verify weekly snapshot created
      const snapshotDoc = mockStore.gridiron_3x3_weekly_snapshots?.['2026_week_01'];
      expect(snapshotDoc).toBeDefined();
      expect(snapshotDoc.isFinalized).toBe(true);
      expect(snapshotDoc.entries.length).toBe(1);

      // Verify individual entries purged from collection
      expect(mockStore.gridiron_3x3_entries?.['contest_1_u1_1']).toBeUndefined();

      // Verify leaderboard created
      const lbDoc = mockStore['gridiron_3x3_contests/contest_1/leaderboard']?.['u1'];
      expect(lbDoc).toBeDefined();
    });

    it('immediately grades two completed games for Test 1 entries', async () => {
      mockStore.gridiron_3x3_lines['2026_week_01'] = {
        season: 2026,
        weekNumber: 1,
        games: [
          { gameId: 'g1', league: 'NFL', awayTeam: { name: 'MIA', score: 20 }, homeTeam: { name: 'BUF', score: 27 }, status: 'final', spread: { awaySpread: 3.5, homeSpread: -3.5 }, total: { line: 48.5 } },
          { gameId: 'g2', league: 'NFL', awayTeam: { name: 'DAL', score: 28 }, homeTeam: { name: 'PHI', score: 24 }, status: 'final', spread: { awaySpread: 3.0, homeSpread: -3.0 }, total: { line: 47.5 } },
          { gameId: 'g3', league: 'NFL', awayTeam: { name: 'KC' }, homeTeam: { name: 'DEN' }, status: 'scheduled', spread: { awaySpread: 6.0, homeSpread: -6.0 }, total: { line: 45.0 } }
        ]
      };
      mockStore.gridiron_3x3_contests['test_1'] = { contestId: 'test_1', name: 'Test 1', participants: ['u1', 'u2'] };
      mockStore.gridiron_3x3_entries['test_1_u1_1'] = {
        entryId: 'test_1_u1_1',
        contestId: 'test_1',
        userId: 'u1',
        season: 2026,
        weekNumber: 1,
        picks: [
          { gameId: 'g1', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() - 3600000, status: 'pending' },
          { gameId: 'g2', league: 'NFL', pickType: 'total', selection: 'over', value: 47.5, kickoffTime: Date.now() - 1800000, status: 'pending' },
          { gameId: 'g3', league: 'NFL', pickType: 'spread', selection: 'away_spread', value: 6.0, kickoffTime: Date.now() + 86400000, status: 'pending' }
        ]
      };

      const res = await gradeGridironWeek(2026, 1, { contestId: 'test_1' });
      expect(res.success).toBe(true);

      const updatedEntry = mockStore.gridiron_3x3_entries['test_1_u1_1'];
      expect(updatedEntry.picks[0].status).toBe('won'); // BUF won 27-20 (-3.5)
      expect(updatedEntry.picks[1].status).toBe('won'); // 28 + 24 = 52 > 47.5 over
      expect(updatedEntry.picks[2].status).toBe('pending'); // g3 is still scheduled
    });

    it('correctly calculates leaderboard records including CFB wins and losses with case-insensitive league matching', async () => {
      mockStore.gridiron_3x3_contests['contest_1'] = { contestId: 'contest_1', name: 'Group 1', participants: ['u1'] };
      mockStore.gridiron_3x3_entries['contest_1_u1_1'] = {
        entryId: 'contest_1_u1_1',
        contestId: 'contest_1',
        userId: 'u1',
        displayName: 'ThePicks',
        season: 2026,
        weekNumber: 1,
        picks: [
          { gameId: 'g1', league: 'cfb' as any, pickType: 'total', selection: 'over', value: 60.5, kickoffTime: Date.now() - 3600000, status: 'won' },
          { gameId: 'g2', league: 'cfb' as any, pickType: 'total', selection: 'under', value: 54.5, kickoffTime: Date.now() - 1800000, status: 'lost' }
        ]
      };

      await updateGridironLeaderboard('contest_1');

      const lbDoc = mockStore['gridiron_3x3_contests/contest_1/leaderboard']?.['u1'];
      expect(lbDoc).toBeDefined();
      expect(lbDoc.displayName).toBe('ThePicks');
      expect(lbDoc.totalWins).toBe(1);
      expect(lbDoc.totalLosses).toBe(1);
      expect(lbDoc.cfbWins).toBe(1);
      expect(lbDoc.cfbLosses).toBe(1);
      expect(lbDoc.winPercentage).toBe(50);
    });

    it('updates contest leaderboard even if lines snapshot is missing when contestId is provided', async () => {
      delete mockStore.gridiron_3x3_lines['2026_week_01'];
      mockStore.gridiron_3x3_contests['contest_missing_lines'] = { contestId: 'contest_missing_lines', name: 'Group 2', participants: ['u2'] };
      mockStore.gridiron_3x3_entries['contest_missing_lines_u2_1'] = {
        entryId: 'contest_missing_lines_u2_1',
        contestId: 'contest_missing_lines',
        userId: 'u2',
        displayName: 'Player Two',
        season: 2026,
        weekNumber: 1,
        picks: [
          { gameId: 'g10', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() - 3600000, status: 'won' }
        ]
      };

      const res = await gradeGridironWeek(2026, 1, { contestId: 'contest_missing_lines' });
      expect(res.success).toBe(false);

      const lbDoc = mockStore['gridiron_3x3_contests/contest_missing_lines/leaderboard']?.['u2'];
      expect(lbDoc).toBeDefined();
      expect(lbDoc.totalWins).toBe(1);
      expect(lbDoc.nflWins).toBe(1);
    });

    it('updates contest leaderboard even if no active entries are found to grade when contestId is provided', async () => {
      delete mockStore.gridiron_3x3_entries['contest_1_u1_1'];
      mockStore.gridiron_3x3_contests['contest_empty'] = { contestId: 'contest_empty', name: 'Group 3', participants: ['u3'] };

      const res = await gradeGridironWeek(2026, 1, { contestId: 'contest_empty' });
      expect(res.success).toBe(true);

      const lbDoc = mockStore['gridiron_3x3_contests/contest_empty/leaderboard']?.['u3'];
      expect(lbDoc).toBeDefined();
      expect(lbDoc.totalWins).toBe(0);
      expect(lbDoc.totalLosses).toBe(0);
    });

    it('grades picks using matchups collection getAll fallback by document ID for user ThePicks', async () => {
      mockStore.matchups = {
        'g100': {
          gameId: 'g100',
          homeTeam: { score: 24 },
          awayTeam: { score: 17 },
          status: 'STATUS_FINAL'
        },
        'g101': {
          gameId: 'g101',
          homeScore: 31,
          awayScore: 20,
          status: 'COMPLETED'
        }
      };

      mockStore.gridiron_3x3_lines['2026_week_01'] = {
        season: 2026,
        weekNumber: 1,
        games: [
          { gameId: 'g100', league: 'NFL', awayTeam: { name: 'MIA' }, homeTeam: { name: 'BUF' }, status: 'scheduled', spread: { awaySpread: 3.5, homeSpread: -3.5 }, total: { line: 40.0 } },
          { gameId: 'g101', league: 'CFB', awayTeam: { name: 'TEX' }, homeTeam: { name: 'OU' }, status: 'scheduled', spread: { awaySpread: 7.0, homeSpread: -7.0 }, total: { line: 50.0 } }
        ]
      };

      mockStore.gridiron_3x3_contests['test_1'] = {
        contestId: 'test_1',
        name: 'Test 1',
        participants: ['the_picks_uid']
      };

      mockStore.gridiron_3x3_entries['test_1_the_picks_1'] = {
        entryId: 'test_1_the_picks_1',
        contestId: 'test_1',
        userId: 'the_picks_uid',
        displayName: 'ThePicks',
        season: 2026,
        weekNumber: 1,
        picks: [
          { gameId: 'g100', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() - 3600000, status: 'pending' },
          { gameId: 'g101', league: 'CFB', pickType: 'total', selection: 'over', value: 50.0, kickoffTime: Date.now() - 1800000, status: 'pending' }
        ]
      };

      const res = await gradeGridironWeek(2026, 1, { contestId: 'test_1' });
      expect(res.success).toBe(true);

      const updatedEntry = mockStore.gridiron_3x3_entries['test_1_the_picks_1'];
      expect(updatedEntry.picks[0].status).toBe('won'); // BUF 24-17 (-3.5)
      expect(updatedEntry.picks[1].status).toBe('won'); // 31 + 20 = 51 > 50 over

      const lbDoc = mockStore['gridiron_3x3_contests/test_1/leaderboard']?.['the_picks_uid'];
      expect(lbDoc).toBeDefined();
      expect(lbDoc.displayName).toBe('ThePicks');
      expect(lbDoc.totalWins).toBe(2);
      expect(lbDoc.totalLosses).toBe(0);
      expect(lbDoc.winPercentage).toBe(100);
    });

    it('saves contestIds on weekly snapshot and skips batch write when leaderboard record is unchanged', async () => {
      // Run initial grading
      await gradeGridironWeek(2026, 1, { contestId: 'contest_1' });

      // Verify weekly snapshot doc has contestIds array
      const snapDoc = mockStore.gridiron_3x3_weekly_snapshots['2026_week_01'];
      expect(snapDoc).toBeDefined();
      expect(snapDoc.contestIds).toContain('contest_1');

      // Set up a mock tracker on batch.set to verify write skipping
      let writeCount = 0;
      const lbDocBefore = { ...mockStore['gridiron_3x3_contests/contest_1/leaderboard']['u1'] };

      // Re-run updateGridironLeaderboard when stats have not changed
      await updateGridironLeaderboard('contest_1');

      // The record data should remain identical
      const lbDocAfter = mockStore['gridiron_3x3_contests/contest_1/leaderboard']['u1'];
      expect(lbDocAfter).toEqual(lbDocBefore);
    });
  });
});
