import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Club602WalletAdapter } from './walletAdapter';

describe('Club602WalletAdapter (Open-Source Separation)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.CLUB602_CORE_URL;
    delete process.env.CLUB602_CORE_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('Standalone / Open-Source Fallback Mode', () => {
    it('initializes in standalone mode when remote config is missing', () => {
      const adapter = new Club602WalletAdapter();
      expect(adapter.isRemoteConfigured()).toBe(false);
    });

    it('uses local in-memory ledger for getBalance in standalone mode', async () => {
      const adapter = new Club602WalletAdapter({}, { test_user: 750 });
      expect(await adapter.getBalance('test_user')).toBe(750);
      expect(await adapter.getBalance('unknown_user')).toBe(1000); // default simulated starter points
    });

    it('performs two-phase hold & capture using standalone provider', async () => {
      const adapter = new Club602WalletAdapter({}, { test_user: 1200 });
      const holdRes = await adapter.createHold('test_user', 300, 'item_cosmetic');
      expect(holdRes.success).toBe(true);
      expect(holdRes.holdId).toBeDefined();

      const captureRes = await adapter.captureHold(holdRes.holdId!, 'order_123');
      expect(captureRes.success).toBe(true);
      expect(captureRes.newBalance).toBe(900);
      expect(await adapter.getBalance('test_user')).toBe(900);
    });

    it('handles direct debit in standalone mode', async () => {
      const adapter = new Club602WalletAdapter({}, { test_user: 500 });
      const res = await adapter.debit('test_user', 200, 'item purchase');
      expect(res.success).toBe(true);
      expect(res.newBalance).toBe(300);
      expect(await adapter.getBalance('test_user')).toBe(300);
    });
  });

  describe('Remote Club 602 Core Mode', () => {
    const remoteConfig = {
      baseUrl: 'https://core.club602.com',
      apiKey: 'test_core_api_key'
    };

    it('identifies as remote configured when baseUrl and apiKey are provided', () => {
      const adapter = new Club602WalletAdapter(remoteConfig);
      expect(adapter.isRemoteConfigured()).toBe(true);
    });

    it('fetches balance from remote core endpoint', async () => {
      const adapter = new Club602WalletAdapter(remoteConfig);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, balance: 3450 })
      });
      globalThis.fetch = mockFetch;

      const balance = await adapter.getBalance('remote_user');
      expect(balance).toBe(3450);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://core.club602.com/v1/wallet/balance/remote_user',
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-api-key': 'test_core_api_key' })
        })
      );
    });

    it('falls back to local balance if remote core getBalance fails', async () => {
      const adapter = new Club602WalletAdapter(remoteConfig, { fallback_user: 800 });

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const balance = await adapter.getBalance('fallback_user');
      expect(balance).toBe(800);
    });

    it('executes remote hold and capture sequence', async () => {
      const adapter = new Club602WalletAdapter(remoteConfig);

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, holdId: 'hld_core_789' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, newBalance: 2200, transactionId: 'tx_core_001' })
        });
      globalThis.fetch = mockFetch;

      const holdRes = await adapter.createHold('remote_user', 500, 'cosmetic_inferno');
      expect(holdRes.success).toBe(true);
      expect(holdRes.holdId).toBe('hld_core_789');

      const captureRes = await adapter.captureHold(holdRes.holdId!, 'order_core_99');
      expect(captureRes.success).toBe(true);
      expect(captureRes.newBalance).toBe(2200);
      expect(captureRes.transactionId).toBe('tx_core_001');
    });

    it('returns error when remote hold fails due to insufficient funds', async () => {
      const adapter = new Club602WalletAdapter(remoteConfig);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'INSUFFICIENT_FUNDS' })
      });

      const holdRes = await adapter.createHold('broke_user', 5000, 'expensive_item');
      expect(holdRes.success).toBe(false);
      expect(holdRes.error).toBe('INSUFFICIENT_FUNDS');
    });
  });
});
