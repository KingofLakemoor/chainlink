/**
 * Open-source standalone mock implementations of pluggable providers.
 * Allows running and developing ChainLink completely decoupled from external proprietary services.
 */

import {
  ICosmeticsProvider,
  IWalletProvider,
  GenericCosmeticItem,
  UserCosmeticProfile,
  CosmeticSlot,
  WalletHoldResult,
  WalletCaptureResult
} from '../types/providers';

export class StandaloneCosmeticsProvider implements ICosmeticsProvider {
  private items: GenericCosmeticItem[];

  constructor(items: GenericCosmeticItem[] = []) {
    this.items = items;
  }

  async getCatalogItems(): Promise<GenericCosmeticItem[]> {
    return this.items;
  }

  isUnlocked(user: UserCosmeticProfile, itemId: string): boolean {
    if (user.membershipTier === 'VIP_FOUNDER') return true;

    // Free items are unlocked by default
    const item = this.items.find(i => i.id === itemId);
    if (item && item.cost === 0 && !item.unlockedByMilestone) {
      return true;
    }

    if (user.unlockedCosmetics && user.unlockedCosmetics.includes(itemId)) {
      return true;
    }

    // Grandfather equipped items as unlocked
    if (user.equippedCosmetics && Object.values(user.equippedCosmetics).includes(itemId)) {
      return true;
    }

    return false;
  }

  getEquippedCosmeticId(user: UserCosmeticProfile, slot: CosmeticSlot, spokeKey: string = 'chainlink'): string | null {
    if (user.spokeCosmetics?.[spokeKey]?.[slot] !== undefined) {
      return user.spokeCosmetics[spokeKey][slot] || null;
    }
    return user.equippedCosmetics?.[slot] || null;
  }

  getUnlockRequirement(itemId: string): string | null {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return null;
    if (item.unlockRequirementText) return item.unlockRequirementText;
    if (item.cost > 0) return `${item.cost.toLocaleString()} Points`;
    return 'Unlocked';
  }
}

export class StandaloneWalletProvider implements IWalletProvider {
  private balances: Map<string, number> = new Map();
  private holds: Map<string, { userId: string; amount: number; expiresAt: number }> = new Map();

  constructor(initialBalances?: Record<string, number>) {
    if (initialBalances) {
      for (const [k, v] of Object.entries(initialBalances)) {
        this.balances.set(k, v);
      }
    }
  }

  async getBalance(userId: string): Promise<number> {
    return this.balances.get(userId) ?? 1000; // Default simulated starter points
  }

  async createHold(userId: string, amount: number, referenceId: string, ttlSeconds: number = 300): Promise<WalletHoldResult> {
    const current = await this.getBalance(userId);
    if (current < amount) {
      return { success: false, error: 'INSUFFICIENT_FUNDS' };
    }

    const holdId = `mock_hld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.holds.set(holdId, {
      userId,
      amount,
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    // Tentatively reserve funds
    this.balances.set(userId, current - amount);
    return { success: true, holdId };
  }

  async captureHold(holdId: string, orderId: string): Promise<WalletCaptureResult> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      return { success: false, error: 'HOLD_NOT_FOUND' };
    }

    if (Date.now() > hold.expiresAt) {
      // Refund expired hold
      const cur = this.balances.get(hold.userId) || 0;
      this.balances.set(hold.userId, cur + hold.amount);
      this.holds.delete(holdId);
      return { success: false, error: 'HOLD_EXPIRED' };
    }

    this.holds.delete(holdId);
    const remainingBalance = this.balances.get(hold.userId) || 0;
    return {
      success: true,
      newBalance: remainingBalance,
      transactionId: `mock_tx_${orderId}`
    };
  }

  async debit(userId: string, amount: number, reason: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const current = await this.getBalance(userId);
    if (current < amount) {
      return { success: false, error: 'INSUFFICIENT_FUNDS' };
    }
    const newBal = current - amount;
    this.balances.set(userId, newBal);
    return { success: true, newBalance: newBal };
  }
}
