import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradeLink4Matchups, setAdminDbMock } from './link4Grader';

const createMockTransaction = (updates: any = {}, gets: any = {}) => {
  return {
    get: vi.fn().mockImplementation((ref) => {
      const path = ref?.path || ref?.id || (ref as any)?._queryOptions?.collectionId || 'unknown';
      if (gets[path]) {
         return Promise.resolve({ exists: true, data: () => gets[path], ref });
      }
      if (path === 'link4Picks') { // query
         const results = gets['link4Picks_results'] || [];
         return Promise.resolve({ empty: results.length === 0, docs: results });
      }
      if (path === 'matchups') {
         const results = gets['matchups_results'] || [];
         return Promise.resolve({ empty: results.length === 0, docs: results });
      }
      return Promise.resolve({ exists: false, data: () => null, ref });
    }),
    update: vi.fn((ref, data) => {
      updates[ref.path || ref.id] = data;
    }),
    set: vi.fn((ref, data, opts) => {
      updates[ref.path || ref.id] = data;
    }),
  };
};

describe('link4Grader', () => {
  let mockAdminDb: any;
  let updates: any = {};

  beforeEach(() => {
    vi.clearAllMocks();
    updates = {};

    mockAdminDb = {
      collection: vi.fn((colName) => {
        const queryMock = {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn()
        };

        if (colName === 'link4Segments') {
          queryMock.get = vi.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                id: 'seg1',
                data: () => ({ payoutComplete: false, endTime: new Date(Date.now() + 10000).toISOString() })
              }
            ]
          });
        } else if (colName === 'link4Picks') {
          queryMock.get = vi.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                id: 'pickDoc1',
                data: () => ({
                   userId: 'user1',
                   segmentId: 'seg1',
                   picks: [
                     { id: 'matchup1', status: 'PENDING', pick: { id: 'home1' } }
                   ]
                }),
                ref: { id: 'pickDoc1', path: 'link4Picks/pickDoc1' }
              }
            ]
          });
        }

        return {
           doc: vi.fn((docId) => ({ id: docId, path: `${colName}/${docId}` })),
           ...queryMock
        };
      }),
      batch: vi.fn(() => ({
         update: vi.fn((ref, data) => { updates[ref.path || ref.id] = data; }),
         commit: vi.fn()
      })),
      runTransaction: vi.fn(async (cb) => {
         const t = createMockTransaction(updates, {
            'link4Picks_results': [
               {
                 id: 'pickDoc1',
                 ref: { id: 'pickDoc1', path: 'link4Picks/pickDoc1' },
                 data: () => ({
                   userId: 'user1',
                   segmentId: 'seg1',
                   picks: [
                     { id: 'matchup1', status: 'WIN', pick: { id: 'home1' } }
                   ]
                 })
               }
            ]
         });
         await cb(t);
      })
    };

    setAdminDbMock(mockAdminDb);
  });

  it('should grade link4 correctly', async () => {
     const matchups = [
       { id: 'matchup1', gameId: 'matchup1', status: 'STATUS_FINAL', homeTeam: { id: 'home1', score: 20 }, awayTeam: { id: 'away1', score: 10 } }
     ];
     await gradeLink4Matchups(matchups);

     expect(updates['link4Picks/pickDoc1']).toBeDefined();
     // The picks array in the batch update should have the first pick updated to WIN
     expect(updates['link4Picks/pickDoc1'].picks[0].status).toBe('WIN');
  });

  it('should handle tie correctly in link4', async () => {
     const matchups = [
       { id: 'matchup1', gameId: 'matchup1', status: 'STATUS_FINAL', homeTeam: { id: 'home1', score: 10 }, awayTeam: { id: 'away1', score: 10 } }
     ];
     await gradeLink4Matchups(matchups);

     expect(updates['link4Picks/pickDoc1']).toBeDefined();
     expect(updates['link4Picks/pickDoc1'].picks[0].status).toBe('PUSH');
  });

  it('should handle postponed correctly in link4', async () => {
     const matchups = [
       { id: 'matchup1', gameId: 'matchup1', status: 'STATUS_POSTPONED', homeTeam: { id: 'home1', score: 0 }, awayTeam: { id: 'away1', score: 0 } }
     ];
     await gradeLink4Matchups(matchups);

     expect(updates['link4Picks/pickDoc1']).toBeDefined();
     expect(updates['link4Picks/pickDoc1'].picks[0].status).toBe('PUSH');
  });

});
