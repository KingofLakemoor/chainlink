import {
  IWalletProvider,
  WalletHoldResult,
  WalletCaptureResult
} from '../../types/providers';
import { StandaloneWalletProvider } from '../../services/standaloneProviders';

export interface Club602WalletConfig {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

/**
 * Club602WalletAdapter implements IWalletProvider.
 *
 * In Standalone / Open-Source mode (or when baseUrl/apiKey are absent):
 * Falls back seamlessly to StandaloneWalletProvider (in-memory / local simulated ledger).
 *
 * In Club 602 Core mode:
 * Connects to the central wallet service (/v1/wallet/*) using two-phase hold & capture:
 * - POST /v1/wallet/hold
 * - POST /v1/wallet/capture
 * - GET  /v1/wallet/balance/:userId
 */
export class Club602WalletAdapter implements IWalletProvider {
  private config: Club602WalletConfig;
  private fallbackProvider: StandaloneWalletProvider;

  constructor(config: Club602WalletConfig = {}, initialFallbackBalances?: Record<string, number>) {
    this.config = {
      baseUrl: config.baseUrl || process.env.CLUB602_CORE_URL,
      apiKey: config.apiKey || process.env.CLUB602_CORE_API_KEY || process.env.SCRIPTLESS_API_KEY,
      timeoutMs: config.timeoutMs || 5000,
    };
    this.fallbackProvider = new StandaloneWalletProvider(initialFallbackBalances);
  }

  /** Checks if remote central wallet connection is configured */
  public isRemoteConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.config.apiKey);
  }

  public updateConfig(newConfig: Partial<Club602WalletConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  async getBalance(userId: string): Promise<number> {
    if (!this.isRemoteConfigured()) {
      return this.fallbackProvider.getBalance(userId);
    }

    try {
      const url = `${this.config.baseUrl!.replace(/\/$/, '')}/v1/wallet/balance/${encodeURIComponent(userId)}`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': this.config.apiKey!,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.timeoutMs!)
      });

      if (!res.ok) {
        console.warn(`[Club602WalletAdapter] Remote getBalance returned status ${res.status}, falling back.`);
        return this.fallbackProvider.getBalance(userId);
      }

      const data = await res.json();
      return typeof data.balance === 'number' ? data.balance : (data.links ?? 0);
    } catch (err) {
      console.warn('[Club602WalletAdapter] Remote getBalance failed, falling back:', err);
      return this.fallbackProvider.getBalance(userId);
    }
  }

  async createHold(userId: string, amount: number, referenceId: string, ttlSeconds: number = 300): Promise<WalletHoldResult> {
    if (!this.isRemoteConfigured()) {
      return this.fallbackProvider.createHold(userId, amount, referenceId, ttlSeconds);
    }

    try {
      const url = `${this.config.baseUrl!.replace(/\/$/, '')}/v1/wallet/hold`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          amount,
          referenceId,
          spoke: 'chainlink',
          ttlSeconds
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs!)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || (res.status === 400 ? 'INSUFFICIENT_FUNDS' : 'HOLD_FAILED')
        };
      }

      return {
        success: true,
        holdId: data.holdId || data.id
      };
    } catch (err: any) {
      console.error('[Club602WalletAdapter] Remote createHold error:', err);
      return { success: false, error: err.message || 'REMOTE_WALLET_ERROR' };
    }
  }

  async captureHold(holdId: string, orderId: string): Promise<WalletCaptureResult> {
    if (!this.isRemoteConfigured()) {
      return this.fallbackProvider.captureHold(holdId, orderId);
    }

    try {
      const url = `${this.config.baseUrl!.replace(/\/$/, '')}/v1/wallet/capture`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          holdId,
          orderId,
          spoke: 'chainlink'
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs!)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'CAPTURE_FAILED'
        };
      }

      return {
        success: true,
        newBalance: data.newBalance ?? data.balance,
        transactionId: data.transactionId || data.id
      };
    } catch (err: any) {
      console.error('[Club602WalletAdapter] Remote captureHold error:', err);
      return { success: false, error: err.message || 'REMOTE_WALLET_ERROR' };
    }
  }

  async debit(userId: string, amount: number, reason: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (!this.isRemoteConfigured()) {
      return this.fallbackProvider.debit(userId, amount, reason);
    }

    // Remote execute 2-phase hold and capture atomically
    const holdRes = await this.createHold(userId, amount, reason);
    if (!holdRes.success || !holdRes.holdId) {
      return { success: false, error: holdRes.error || 'INSUFFICIENT_FUNDS' };
    }

    const captureRes = await this.captureHold(holdRes.holdId, `direct_debit_${Date.now()}`);
    if (!captureRes.success) {
      return { success: false, error: captureRes.error || 'DEBIT_CAPTURE_FAILED' };
    }

    return {
      success: true,
      newBalance: captureRes.newBalance
    };
  }
}

/** Global default wallet adapter instance */
export const defaultWalletAdapter = new Club602WalletAdapter();
