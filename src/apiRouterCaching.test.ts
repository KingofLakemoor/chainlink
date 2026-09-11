import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { apiRouter } from './apiRouter';

// Mock Firebase Admin modules so apiRouter can be imported without real DB connection
vi.mock('./lib/firebase-admin.js', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    collection: vi.fn((collName: string) => {
      if (collName === 'systemSettings') {
        return {
          doc: vi.fn((docId: string) => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ active: true, message: 'Test Banner', updatedAt: 12345 }),
            }),
          })),
        };
      }
      if (collName === 'matchups') {
        return {
          where: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              docs: [
                {
                  id: 'game-1',
                  data: () => ({ gameId: 'game-1', title: 'Team A vs Team B', status: 'STATUS_SCHEDULED' }),
                },
                {
                  id: 'game-2',
                  data: () => ({ gameId: 'game-2', title: 'Team C vs Team D', status: 'STATUS_IN_PROGRESS' }),
                },
              ],
            }),
          })),
        };
      }
      if (collName === 'link4Matchups') {
        return {
          where: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              docs: [
                {
                  id: 'seg1_game-1',
                  data: () => ({ segmentId: 'seg1', gameId: 'game-1', title: 'Team A vs Team B' }),
                },
              ],
            }),
          })),
        };
      }
      return {
        get: vi.fn().mockResolvedValue({ docs: [] }),
        where: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ docs: [] }) })),
      };
    }),
  },
}));

describe('apiRouter Server-Side Caching Endpoints', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
  });

  it('GET /api/system-settings/play-banner returns play banner data and caches it', async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const res1 = await fetch(`${baseUrl}/api/system-settings/play-banner`);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.success).toBe(true);
      expect(data1.banner.message).toBe('Test Banner');

      // Second call should hit the server cache
      const res2 = await fetch(`${baseUrl}/api/system-settings/play-banner`);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.banner.message).toBe('Test Banner');
    } finally {
      server.close();
    }
  });

  it('GET /api/matchups/active returns active matchups', async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${baseUrl}/api/matchups/active`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.matchups)).toBe(true);
      expect(data.matchups.length).toBe(2);
    } finally {
      server.close();
    }
  });

  it('GET /api/matchups/by-ids fetches matchups by gameId', async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${baseUrl}/api/matchups/by-ids?ids=game-1,game-2`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.matchups.length).toBe(2);
    } finally {
      server.close();
    }
  });

  it('GET /api/link4/matchups/:segmentId returns cached segment matchups', async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const res = await fetch(`${baseUrl}/api/link4/matchups/seg1`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.matchups.length).toBe(1);
      expect(data.matchups[0].segmentId).toBe('seg1');
    } finally {
      server.close();
    }
  });

  it('supports single-flight request coalescing for concurrent requests on active matchups', async () => {
    const server = app.listen(0);
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const promises = [
        fetch(`${baseUrl}/api/matchups/active`),
        fetch(`${baseUrl}/api/matchups/active`),
        fetch(`${baseUrl}/api/matchups/active`),
      ];
      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.matchups.length).toBe(2);
      }
    } finally {
      server.close();
    }
  });

  it('invalidateMatchupCaches flushes active matchups, matchups by id, and link4 matchups caches', async () => {
    const { invalidateMatchupCaches } = await import('./apiRouter');
    const server = app.listen(0);
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const res1 = await fetch(`${baseUrl}/api/matchups/active`);
      expect(res1.status).toBe(200);

      invalidateMatchupCaches();

      const res2 = await fetch(`${baseUrl}/api/matchups/active`);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.success).toBe(true);
    } finally {
      server.close();
    }
  });
});
