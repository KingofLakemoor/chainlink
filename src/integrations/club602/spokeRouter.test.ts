import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { createClub602SpokeRouter } from './spokeRouter';

describe('Club 602 Spoke Router (Open-Source Separation)', () => {
  const originalApiKey = process.env.SCRIPTLESS_API_KEY;

  beforeEach(() => {
    process.env.SCRIPTLESS_API_KEY = 'test_secret_spoke_key';
  });

  afterEach(() => {
    process.env.SCRIPTLESS_API_KEY = originalApiKey;
    vi.clearAllMocks();
  });

  const mockDeps = {
    adminDb: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
          set: vi.fn().mockResolvedValue(true),
        }),
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: [{ data: () => ({ id: 'm1', active: true }) }] }),
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: [{ data: () => ({ premium: true }) }]
            })
          })
        })
      })
    } as any,
    syncLeagueSchedules: vi.fn().mockResolvedValue({ synced: true }),
    updateAllProps: vi.fn().mockResolvedValue(true),
    processPendingNotifications: vi.fn().mockResolvedValue(true),
    getMatchupStartTime: vi.fn().mockReturnValue(Date.now() + 10000),
    gradeMatchups: vi.fn().mockResolvedValue(true),
    gradeLink4Matchups: vi.fn().mockResolvedValue(true),
    invalidateMatchupCaches: vi.fn(),
  };

  const createTestServer = () => {
    const app = express();
    app.use(express.json());
    app.use('/api', createClub602SpokeRouter(mockDeps));
    const server = app.listen(0);
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    return { server, baseUrl };
  };

  it('rejects requests missing x-api-key', async () => {
    const { server, baseUrl } = createTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/webhooks/scriptless`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    } finally {
      server.close();
    }
  });

  it('rejects requests with invalid x-api-key', async () => {
    const { server, baseUrl } = createTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/webhooks/scriptless`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'wrong_key'
        },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it('processes /webhooks/scriptless with valid x-api-key', async () => {
    const { server, baseUrl } = createTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/webhooks/scriptless`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test_secret_spoke_key'
        },
        body: JSON.stringify({})
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockDeps.syncLeagueSchedules).toHaveBeenCalledWith('SCRIPTLESS', false);
      expect(mockDeps.updateAllProps).toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it('processes /webhooks/putting with valid matchup payload', async () => {
    const { server, baseUrl } = createTestServer();
    try {
      const payload = {
        gameId: 'putting_game_1',
        title: 'Alice vs Bob',
        league: 'PUTTING',
        startTime: Date.now() + 60000,
        homeTeam: { id: 'alice', name: 'Alice', score: 2 },
        awayTeam: { id: 'bob', name: 'Bob', score: 3 },
        status: 'STATUS_FINAL'
      };

      const res = await fetch(`${baseUrl}/api/webhooks/putting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test_secret_spoke_key'
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockDeps.gradeMatchups).toHaveBeenCalled();
      expect(mockDeps.invalidateMatchupCaches).toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it('serves /chainlink/matchups with valid API key', async () => {
    const { server, baseUrl } = createTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/chainlink/matchups`, {
        headers: { 'x-api-key': 'test_secret_spoke_key' }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.matchups).toBeDefined();
    } finally {
      server.close();
    }
  });

  it('checks external premium status for a user email', async () => {
    const { server, baseUrl } = createTestServer();
    try {
      const res = await fetch(`${baseUrl}/api/external/check-premium?email=test@club602.com`, {
        headers: { 'x-api-key': 'test_secret_spoke_key' }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isPremium).toBe(true);
    } finally {
      server.close();
    }
  });
});
