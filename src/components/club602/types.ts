/**
 * Canonical Club 602 Cosmetic Definitions & Type Contracts
 * Shared across central Hub and all Spoke apps (Scriptless, Darts, Bingo, Flip, Putting, ChainLink)
 */

export type CosmeticCategory =
  | 'TITLE'            // Subtitle displayed below username / handle
  | 'NAME_GRADIENT'   // Color gradient or animated text style applied to username
  | 'BADGE'           // Icon/pin rendered next to username
  | 'AVATAR_RING'     // Avatar border ring or frame (CSS class or canvas animation component)
  | 'PROFILE_BANNER'  // Profile card/modal hero header banner
  | 'ROSTER_BANNER'   // Backdrop banner for lineup/draft/player match cards
  | 'MERCH';          // Physical merchandise redeemable via central links ledger

export type SpokeOrigin =
  | 'chainlink'
  | 'scriptless'
  | 'darts'
  | 'putting'
  | 'bingo'
  | 'flip'
  | 'gridiron'
  | 'core';

/**
 * Universal Presentation Context
 * Governs visual density, animation performance, and fallback degradation
 * - 'micro': Leaderboards, chat feeds, ticker rows, compact header pills (60fps, CSS rings, static canvas, suppressed banners)
 * - 'card': Matchup cards, roster cards, contestant lineup cards (mid-tier visuals, roster banner backdrops)
 * - 'hero': Profile modals, player hub profile pages, championship cards (full animation, WebGL/shader rings, full-bleed hero banners)
 */
export type PresentationContext = 'micro' | 'card' | 'hero';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type CosmeticRenderType =
  | 'css'        // Tailwind / CSS classes applied to element (e.g. text-transparent bg-clip-text ...)
  | 'lucide'     // Standard Lucide icon identifier (e.g. 'Star', 'Flame', 'Crown')
  | 'component'  // Custom React/WebGL component key (e.g. 'Hexagons', 'InfernoBanner')
  | 'image';     // Firebase Storage URL or image asset path

export interface CosmeticItem {
  /** Unique ID matching Firestore document key, e.g. 'ring_bull_bear', 'title_bb_hoh' */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Broad category slot */
  category: CosmeticCategory;

  /** Spoke app where this cosmetic originated or is earned */
  originSpoke: SpokeOrigin;

  /** Flavor text or unlock milestone requirement */
  description: string;

  /** Cost in Links if available in general shop; 0 or undefined for milestone-only unlocks */
  cost?: number;

  /** Whether the item can be bought via Links store; if false, must be unlocked via gameplay */
  forSale: boolean;

  /** Whether the item is active and valid in the ecosystem */
  active: boolean;

  /** Whether featured in store highlights */
  featured?: boolean;

  /** Rarity tier */
  rarity?: CosmeticRarity;

  /** Visual rendering specification */
  renderType: CosmeticRenderType;

  /** The rendering value (CSS class string, Lucide icon name, component map key, or image URL) */
  renderValue: string;

  /** Secondary / static preview image or fallback CSS */
  preview?: string;

  /** Display sort order */
  order?: number;

  /** Optional collection or theme group (e.g. 'traitors', 'novatrix', 'opulento') */
  collectionId?: string;

  /** Optional metadata: physical merchandise flag, shipping requirements, etc. */
  metadata?: {
    requiresShipping?: boolean;
    unlockedByMilestone?: string;
    [key: string]: any;
  };

  /** Whether this cosmetic requires an active Pro membership to equip and display */
  premiumOnly?: boolean;
}

/**
 * User's Equipped Cosmetics across all spokes.
 * Compatible with ChainLink's equippedCosmetics structure.
 */
export interface UserEquippedCosmetics {
  TITLE?: string;
  NAME_GRADIENT?: string;
  BADGE?: string;
  AVATAR_RING?: string;
  PROFILE_BANNER?: string;
  ROSTER_BANNER?: string;
  BANNER_VARIANT?: string; // Optional variant key (e.g. for dynamic banners like Responsible Gambler)
}

/**
 * Standard user cosmetics profile block stored on the central /users/{uid} document.
 */
export interface UserCosmeticsProfile {
  uid: string;
  /** Complete array of all cosmetic IDs owned by the user across all spokes */
  unlockedCosmetics: string[];
  /** Equipped cosmetic slots (Global Default) */
  equippedCosmetics: UserEquippedCosmetics;
  /**
   * Optional spoke-specific overrides (e.g. `spokeCosmetics.darts = { TITLE: 'title_bullseye' }`).
   * If a slot is undefined in a spoke's map, it cleanly falls back to `equippedCosmetics.*`.
   */
  spokeCosmetics?: Partial<Record<SpokeOrigin, Partial<UserEquippedCosmetics>>>;
  /** Links wallet ID link */
  walletId?: string;
  updatedAt?: number;
}
