/**
 * Club 602 Central Hub API Client for ChainLink
 *
 * Connects ChainLink to the central Identity, Cosmetics, and Central Wallet Hub at api.club602.com.
 * Non-blocking by design: all network operations have silent, graceful fallbacks
 * so that live pick submissions, in-progress matchup views, and grading loops are never affected.
 */

export interface HubUserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  customClaims?: {
    userId?: string;
    roles?: string[];
    membershipTier?: 'STANDARD' | 'PRO' | 'VIP_FOUNDER' | 'FOUNDER';
    walletId?: string;
  };
}

export interface HubWalletBalance {
  walletId: string;
  availableBalance: number;
  pendingHoldBalance: number;
  totalEarned: number;
}

export class ChainlinkHubClient {
  private gatewayUrl: string;

  constructor() {
    this.gatewayUrl = (import.meta as any).env?.VITE_CLUB602_API_URL || 'https://api.club602.com';
  }

  /**
   * Fetches the user profile and custom claims from the Identity Hub.
   * Safe and non-blocking: returns null on network failure or if offline.
   */
  async getProfile(token: string): Promise<HubUserProfile | null> {
    try {
      const res = await fetch(`${this.gatewayUrl}/v1/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches live wallet balance from the Central Ledger.
   * Queries with userEmail and x-user-email header to resolve canonical wallet.
   * Safe and non-blocking: returns null if Hub is unreachable.
   */
  async getWalletBalance(walletId: string, token: string, userEmail?: string): Promise<HubWalletBalance | null> {
    try {
      const url = userEmail 
        ? `${this.gatewayUrl}/v1/wallet/${walletId}?email=${encodeURIComponent(userEmail)}` 
        : `${this.gatewayUrl}/v1/wallet/${walletId}`;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      if (userEmail) headers['x-user-email'] = userEmail;
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  /**
   * Pre-authorizes a Links hold for wagers or cosmetic checkout.
   */
  async holdLinks(params: {
    walletId: string;
    amount: number;
    ttlSeconds?: number;
    referenceId?: string;
    token: string;
    userId: string;
    userEmail?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; holdId?: string; remainingAvailable?: number; error?: string }> {
    try {
      const holdKey = `chainlink_hold_${params.userId}_${params.referenceId || 'tx'}_${Date.now()}`;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${params.token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': holdKey
      };
      if (params.userEmail) headers['x-user-email'] = params.userEmail;

      const res = await fetch(`${this.gatewayUrl}/v1/wallet/hold`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          walletId: params.walletId,
          amount: params.amount,
          ttlSeconds: params.ttlSeconds || 86400,
          referenceId: params.referenceId,
          metadata: {
            originSpoke: 'chainlink',
            userEmail: params.userEmail,
            ...params.metadata
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, holdId: data.holdId, remainingAvailable: data.remainingAvailable };
      }
      return { success: false, error: data.error || 'Failed to hold Links' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Credits Links reward for pick victory, streak milestone, or campaign payout.
   */
  async creditLinksReward(params: {
    walletId: string;
    amount: number;
    reason: string;
    idempotencyKey?: string;
    token?: string;
    userEmail?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      const key = params.idempotencyKey || `chainlink_credit_${params.walletId}_${Date.now()}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': key
      };
      if (params.token) headers['Authorization'] = `Bearer ${params.token}`;
      if (params.userEmail) headers['x-user-email'] = params.userEmail;

      const res = await fetch(`${this.gatewayUrl}/v1/wallet/credit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          walletId: params.walletId,
          amount: params.amount,
          reason: params.reason,
          spokeId: 'chainlink',
          metadata: {
            userEmail: params.userEmail,
            ...params.metadata
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, newBalance: data.newBalance };
      }
      return { success: false, error: data.error || 'Failed to credit Links' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const chainlinkHubClient = new ChainlinkHubClient();
