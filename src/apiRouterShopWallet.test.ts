import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { apiRouter } from './apiRouter';
import { defaultWalletAdapter } from './integrations/club602/walletAdapter';

// Mock Firebase Admin modules so apiRouter can be tested in isolation
vi.mock('./lib/firebase-admin.js', () => {
  let mockUser = {
    links: 1000,
    inventory: [] as string[],
    unlockedCosmetics: [] as string[],
    purchasedItems: [] as string[],
    premium: true,
  };

  const mockShopItems: Record<string, any> = {
    ring_vice_neon: {
      name: 'Vice Neon Ring',
      cost: 500,
      active: true,
      forSale: true,
      type: 'AVATAR_RING',
    },
    merch_cap: {
      name: 'Club 602 Trucker Cap',
      cost: 300,
      active: true,
      forSale: true,
      type: 'MERCH',
    },
    item_expensive: {
      name: 'Diamond Trophy',
      cost: 50000,
      active: true,
      forSale: true,
      type: 'AVATAR_RING',
    },
  };

  return {
    adminAuth: {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-user-123' }),
    },
    adminDb: {
      collection: vi.fn((collName: string) => {
        if (collName === 'users') {
          return {
            doc: vi.fn((uid: string) => ({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ ...mockUser }),
              }),
            })),
          };
        }
        if (collName === 'shopItems') {
          return {
            doc: vi.fn((itemId: string) => ({
              get: vi.fn().mockResolvedValue({
                exists: Boolean(mockShopItems[itemId]),
                data: () => mockShopItems[itemId],
              }),
            })),
          };
        }
        return {
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ exists: false }),
            set: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
          })),
        };
      }),
      runTransaction: vi.fn(async (cb: any) => {
        const tx = {
          get: vi.fn(async (ref: any) => ({
            exists: true,
            data: () => ({ ...mockUser }),
          })),
          update: vi.fn((ref: any, data: any) => {
            mockUser = { ...mockUser, ...data };
          }),
          set: vi.fn(),
        };
        return cb(tx);
      }),
    },
  };
});

describe('Option F: Shop Wallet Hold & Capture Integration (/api/shop/buy & /api/shop/buy-merch)', () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeEach(async () => {
    vi.restoreAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  it('rejects unauthenticated requests to /api/shop/buy', async () => {
    const res = await fetch(`${baseUrl}/api/shop/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'ring_vice_neon' }),
    });

    expect(res.status).toBe(401);
  });

  it('successfully purchases cosmetic item and updates balance via hold & capture', async () => {
    const createHoldSpy = vi.spyOn(defaultWalletAdapter, 'createHold');
    const captureHoldSpy = vi.spyOn(defaultWalletAdapter, 'captureHold');

    const res = await fetch(`${baseUrl}/api/shop/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_mock_token',
      },
      body: JSON.stringify({ itemId: 'ring_vice_neon' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.newBalance).toBe('number');

    expect(createHoldSpy).toHaveBeenCalledWith('test-user-123', 500, 'ring_vice_neon', 300);
    expect(captureHoldSpy).toHaveBeenCalled();
  });

  it('rejects purchase when user has insufficient balance in wallet provider', async () => {
    vi.spyOn(defaultWalletAdapter, 'createHold').mockResolvedValueOnce({
      success: false,
      error: 'INSUFFICIENT_FUNDS',
    });

    const res = await fetch(`${baseUrl}/api/shop/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_mock_token',
      },
      body: JSON.stringify({ itemId: 'item_expensive' }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('INSUFFICIENT_FUNDS');
  });

  it('successfully purchases merch item via hold & capture', async () => {
    const createHoldSpy = vi.spyOn(defaultWalletAdapter, 'createHold');
    const captureHoldSpy = vi.spyOn(defaultWalletAdapter, 'captureHold');

    const res = await fetch(`${baseUrl}/api/shop/buy-merch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_mock_token',
      },
      body: JSON.stringify({
        itemId: 'merch_cap',
        shippingInfo: { fullName: 'John Doe', city: 'Austin' },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(createHoldSpy).toHaveBeenCalledWith('test-user-123', 300, 'merch_cap', 300);
    expect(captureHoldSpy).toHaveBeenCalled();
  });
});
