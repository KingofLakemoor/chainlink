import { describe, it, expect } from 'vitest';
import { StandaloneCosmeticsProvider, StandaloneWalletProvider } from './standaloneProviders';
import { GenericCosmeticItem, UserCosmeticProfile } from '../types/providers';

describe('StandaloneProviders (Open-Source Separation)', () => {
  describe('StandaloneCosmeticsProvider', () => {
    const mockItems: GenericCosmeticItem[] = [
      { id: 'ring_free', name: 'Free Ring', description: 'Free item', cost: 0, type: 'AVATAR_RING' },
      { id: 'ring_milestone', name: 'Milestone Ring', description: 'Milestone item', cost: 0, type: 'AVATAR_RING', unlockedByMilestone: true, unlockRequirementText: 'Win 5 games' },
      { id: 'ring_paid', name: 'Paid Ring', description: 'Store item', cost: 500, type: 'AVATAR_RING' },
      { id: 'title_champ', name: 'Champion', description: 'Exclusive Title', cost: 1000, type: 'TITLE' },
    ];

    const provider = new StandaloneCosmeticsProvider(mockItems);

    it('returns catalog items', async () => {
      const items = await provider.getCatalogItems();
      expect(items).toHaveLength(4);
    });

    it('unlocks free items by default', () => {
      const user: UserCosmeticProfile = { uid: 'u1', unlockedCosmetics: [] };
      expect(provider.isUnlocked(user, 'ring_free')).toBe(true);
      expect(provider.isUnlocked(user, 'ring_milestone')).toBe(false);
      expect(provider.isUnlocked(user, 'ring_paid')).toBe(false);
    });

    it('unlocks all items for VIP_FOUNDER tier', () => {
      const vipUser: UserCosmeticProfile = { uid: 'u_vip', unlockedCosmetics: [], membershipTier: 'VIP_FOUNDER' };
      expect(provider.isUnlocked(vipUser, 'ring_paid')).toBe(true);
      expect(provider.isUnlocked(vipUser, 'title_champ')).toBe(true);
    });

    it('respects explicitly owned items in unlockedCosmetics', () => {
      const user: UserCosmeticProfile = { uid: 'u2', unlockedCosmetics: ['ring_paid'] };
      expect(provider.isUnlocked(user, 'ring_paid')).toBe(true);
    });

    it('resolves spoke override over global equipped cosmetic', () => {
      const user: UserCosmeticProfile = {
        uid: 'u3',
        unlockedCosmetics: [],
        equippedCosmetics: { AVATAR_RING: 'ring_free' },
        spokeCosmetics: {
          chainlink: { AVATAR_RING: 'ring_paid' }
        }
      };
      // ChainLink spoke override takes precedence
      expect(provider.getEquippedCosmeticId(user, 'AVATAR_RING', 'chainlink')).toBe('ring_paid');
      // Other spoke falls back to global equipped
      expect(provider.getEquippedCosmeticId(user, 'AVATAR_RING', 'putting')).toBe('ring_free');
    });

    it('provides user-facing unlock requirements', () => {
      expect(provider.getUnlockRequirement('ring_milestone')).toBe('Win 5 games');
      expect(provider.getUnlockRequirement('ring_paid')).toBe('500 Points');
      expect(provider.getUnlockRequirement('ring_free')).toBe('Unlocked');
    });
  });

  describe('StandaloneWalletProvider', () => {
    it('initializes and reports balances', async () => {
      const wallet = new StandaloneWalletProvider({ user_1: 2500 });
      expect(await wallet.getBalance('user_1')).toBe(2500);
      expect(await wallet.getBalance('user_new')).toBe(1000); // default mock balance
    });

    it('executes direct debit successfully when sufficient funds', async () => {
      const wallet = new StandaloneWalletProvider({ user_1: 500 });
      const res = await wallet.debit('user_1', 200, 'Test item purchase');
      expect(res.success).toBe(true);
      expect(res.newBalance).toBe(300);
      expect(await wallet.getBalance('user_1')).toBe(300);
    });

    it('rejects direct debit when insufficient funds', async () => {
      const wallet = new StandaloneWalletProvider({ user_1: 100 });
      const res = await wallet.debit('user_1', 250, 'Too expensive');
      expect(res.success).toBe(false);
      expect(res.error).toBe('INSUFFICIENT_FUNDS');
    });

    it('supports two-phase hold and capture pattern', async () => {
      const wallet = new StandaloneWalletProvider({ user_1: 1000 });
      const holdRes = await wallet.createHold('user_1', 400, 'item_123');
      expect(holdRes.success).toBe(true);
      expect(holdRes.holdId).toBeDefined();

      // Balance is tentatively held
      expect(await wallet.getBalance('user_1')).toBe(600);

      // Capture hold
      const captureRes = await wallet.captureHold(holdRes.holdId!, 'order_abc');
      expect(captureRes.success).toBe(true);
      expect(captureRes.newBalance).toBe(600);
    });
  });
});
