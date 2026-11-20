/**
 * Generic open-source interface contracts for pluggable provider extensions.
 * These interfaces decouple core game mechanics (streaks, matchups, leaderboards)
 * from proprietary or external platform implementations (e.g. Club 602 core wallet,
 * cross-spoke cosmetics catalogs, or private grassroots odds scrapers).
 */

export type CosmeticSlot =
  | 'TITLE'
  | 'AVATAR_RING'
  | 'BADGE'
  | 'NAME_GRADIENT'
  | 'PROFILE_BANNER'
  | 'ROSTER_BANNER'
  | 'MERCH';

export interface GenericCosmeticItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: CosmeticSlot | string;
  active?: boolean;
  forSale?: boolean;
  featured?: boolean;
  image?: string;
  preview?: string;
  order?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedByMilestone?: boolean;
  unlockRequirementText?: string;
}

export interface UserCosmeticProfile {
  uid: string;
  unlockedCosmetics: string[];
  equippedCosmetics?: Partial<Record<CosmeticSlot, string | null>>;
  spokeCosmetics?: Record<string, Partial<Record<CosmeticSlot, string | null>>>;
  membershipTier?: 'STANDARD' | 'PRO' | 'VIP_FOUNDER' | string;
}

/**
 * Cosmetics Provider Interface.
 * Allows ChainLink to resolve item availability, ownership, and rendering
 * whether backed by an open-source local catalog or the Club 602 221-item multi-spoke catalog.
 */
export interface ICosmeticsProvider {
  /** Returns all catalog items available for display/sale */
  getCatalogItems(): Promise<GenericCosmeticItem[]>;

  /** Checks if a user has unlocked a specific cosmetic item */
  isUnlocked(user: UserCosmeticProfile, itemId: string): boolean;

  /** Resolves equipped cosmetic ID for a slot, respecting spoke overrides */
  getEquippedCosmeticId(user: UserCosmeticProfile, slot: CosmeticSlot, spokeKey?: string): string | null;

  /** Resolves user-facing unlock requirement or pricing label */
  getUnlockRequirement(itemId: string): string | null;
}

/**
 * Wallet Provider Interface.
 * Encapsulates currency debit, credit, balance retrieval, and hold-and-capture flows.
 * Supports standalone local point mocks as well as the central Club 602 Links wallet service.
 */
export interface WalletHoldResult {
  success: boolean;
  holdId?: string;
  error?: string;
}

export interface WalletCaptureResult {
  success: boolean;
  newBalance?: number;
  transactionId?: string;
  error?: string;
}

export interface IWalletProvider {
  /** Retrieves current balance for a user */
  getBalance(userId: string): Promise<number>;

  /** Two-phase hold: reserves funds for a pending order/cosmetic unlock */
  createHold(userId: string, amount: number, referenceId: string, ttlSeconds?: number): Promise<WalletHoldResult>;

  /** Two-phase capture: executes the transaction against an active hold */
  captureHold(holdId: string, orderId: string): Promise<WalletCaptureResult>;

  /** Direct debit (for single-step checkout or standalone mock) */
  debit(userId: string, amount: number, reason: string): Promise<{ success: boolean; newBalance?: number; error?: string }>;
}
