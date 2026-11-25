import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCached, setCached, clearCached, getGlobalPendingPicksCached, getSponsorsCached, getMatchupsByIdsCached } from './firestore-cache';

// Mock firebase
vi.mock('./firebase', () => ({
  db: {
    app: {
      options: {
        apiKey: 'real_key'
      }
    }
  }
}));

// Mock firestore functions
const mockGetDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => `collection_${name}`),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => args),
  orderBy: vi.fn((...args) => args),
  limit: vi.fn((...args) => args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
}));

describe('firestore-cache Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCached();
  });

  it('getCached returns null when nothing is cached', () => {
    expect(getCached('nonexistent_key')).toBeNull();
  });

  it('setCached and getCached store and retrieve data in memory', () => {
    const data = [{ id: 'item_1', name: 'Item One' }];
    setCached('test_items', data);
    expect(getCached('test_items')).toEqual(data);
  });

  it('getCached respects TTL expiration', async () => {
    const data = { foo: 'bar' };
    setCached('expiring_key', data);
    expect(getCached('expiring_key', 1000)).toEqual(data);
    // Passing 0ms TTL indicates it has expired
    expect(getCached('expiring_key', 0)).toBeNull();
  });

  it('getGlobalPendingPicksCached queries firestore on first call and returns cached data on second call', async () => {
    const mockPicks = [
      { id: 'pick_1', userId: 'user_1', status: 'PENDING', matchupId: 'm_1' },
      { id: 'pick_2', userId: 'user_2', status: 'PENDING', matchupId: 'm_2' },
    ];
    mockGetDocs.mockResolvedValueOnce({
      docs: mockPicks.map(p => ({ id: p.id, data: () => p }))
    });

    // First call -> queries Firestore
    const result1 = await getGlobalPendingPicksCached();
    expect(result1.length).toBe(2);
    expect(result1[0].id).toBe('pick_1');
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    // Second call within TTL -> returns cached without calling getDocs again
    const result2 = await getGlobalPendingPicksCached();
    expect(result2.length).toBe(2);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('getSponsorsCached queries firestore on first call and caches result', async () => {
    const mockSponsors = [
      { id: 'spon_1', name: 'Sponsor One', active: true }
    ];
    mockGetDocs.mockResolvedValueOnce({
      docs: mockSponsors.map(s => ({ id: s.id, data: () => s }))
    });

    const result1 = await getSponsorsCached();
    expect(result1.length).toBe(1);
    expect(result1[0].id).toBe('spon_1');
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    const result2 = await getSponsorsCached();
    expect(result2.length).toBe(1);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('getMatchupsByIdsCached fetches uncached matchups and serves subsequent calls from cache', async () => {
    const mockMatchups = [
      { id: 'game_101', gameId: 'game_101', homeTeam: { name: 'Eagles' } },
      { id: 'game_102', gameId: 'game_102', homeTeam: { name: 'Chiefs' } },
    ];
    mockGetDocs.mockResolvedValueOnce({
      docs: mockMatchups.map(m => ({ id: m.id, data: () => m }))
    });

    const res1 = await getMatchupsByIdsCached(['game_101', 'game_102']);
    expect(res1.length).toBe(2);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    // Call again with same IDs -> should return from cache without additional Firestore call
    const res2 = await getMatchupsByIdsCached(['game_101', 'game_102']);
    expect(res2.length).toBe(2);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});
