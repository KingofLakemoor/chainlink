import { CosmeticItem, CosmeticCategory, SpokeOrigin, UserEquippedCosmetics } from './types';
import rawCatalog from './catalog.json';

export * from './types';
export * from './components/badgeIcons';
export * from './components/Club602Avatar';
export * from './components/Club602Banner';
export * from './components/Club602Nameplate';
export * from './components/CosmeticOriginBadge';
export * from './componentsMap';

/**
 * Authoritative Club 602 Canonical Cosmetics Catalog
 */
export const COSMETICS_CATALOG: CosmeticItem[] = rawCatalog as CosmeticItem[];

/**
 * Lookup cosmetic item by unique identifier
 */
export function getCosmeticById(id: string): CosmeticItem | undefined {
  return COSMETICS_CATALOG.find((item) => item.id === id);
}

/**
 * Filter cosmetics by category (e.g. 'AVATAR_RING', 'TITLE', 'BADGE')
 */
export function getCosmeticsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return COSMETICS_CATALOG.filter((item) => item.category === category);
}

/**
 * Filter cosmetics by spoke origin (e.g. 'chainlink', 'scriptless', 'darts')
 */
export function getCosmeticsByOrigin(origin: SpokeOrigin): CosmeticItem[] {
  return COSMETICS_CATALOG.filter((item) => item.originSpoke === origin);
}

/**
 * Filter cosmetics currently available for purchase in the central shop
 */
export function getForSaleCosmetics(): CosmeticItem[] {
  return COSMETICS_CATALOG.filter((item) => item.forSale && item.active);
}

/**
 * Filter exclusive gameplay achievement rewards (not purchasable directly)
 */
export function getAchievementCosmetics(): CosmeticItem[] {
  return COSMETICS_CATALOG.filter((item) => !item.forSale && item.active);
}

/**
 * Resolves equipped cosmetics for a given spoke context.
 * Precedence order:
 * 1. user.spokeCosmetics[spokeId][slot] (Spoke-specific override)
 * 2. user.equippedCosmetics[slot] (Global Network Look)
 * 3. Legacy flat profile fields (e.g. title, badge, avatarFrame, profileBanner, nameGradient)
 */
export function resolveSpokeCosmetics(
  user: any | null | undefined,
  spokeId?: SpokeOrigin
): UserEquippedCosmetics {
  if (!user) return {};

  const globalEquipped = user.equippedCosmetics || {};
  const spokeOverrides = (spokeId && user.spokeCosmetics?.[spokeId]) || {};

  return {
    TITLE: spokeOverrides.TITLE ?? globalEquipped.TITLE ?? user.title,
    NAME_GRADIENT: spokeOverrides.NAME_GRADIENT ?? globalEquipped.NAME_GRADIENT ?? user.nameGradient,
    BADGE: spokeOverrides.BADGE ?? globalEquipped.BADGE ?? user.badge,
    AVATAR_RING: spokeOverrides.AVATAR_RING ?? globalEquipped.AVATAR_RING ?? user.avatarFrame,
    PROFILE_BANNER: spokeOverrides.PROFILE_BANNER ?? globalEquipped.PROFILE_BANNER ?? user.profileBanner,
    ROSTER_BANNER: spokeOverrides.ROSTER_BANNER ?? globalEquipped.ROSTER_BANNER ?? user.rosterBanner,
    BANNER_VARIANT: spokeOverrides.BANNER_VARIANT ?? globalEquipped.BANNER_VARIANT,
  };
}

/**
 * Returns all cosmetic IDs unlocked by a given user across all spokes.
 * Normalizes between user.unlockedCosmetics, user.inventory, and auto-unlocked default items.
 */
export function getUserUnlockedCosmetics(user: any | null | undefined): Set<string> {
  const unlocked = new Set<string>();

  // Always unlocked base defaults
  unlocked.add('badge_none');
  unlocked.add('ring_default');
  unlocked.add('pb_default');
  unlocked.add('rb_default');
  unlocked.add('grad_white');

  if (!user) return unlocked;

  // Unlocked cosmetics array (Scriptless / canonical format)
  if (Array.isArray(user.unlockedCosmetics)) {
    user.unlockedCosmetics.forEach((id: string) => unlocked.add(id));
  }

  // Inventory array (ChainLink format)
  if (Array.isArray(user.inventory)) {
    user.inventory.forEach((id: string) => unlocked.add(id));
  }

  // Currently equipped items are implicitly owned
  if (user.equippedCosmetics && typeof user.equippedCosmetics === 'object') {
    Object.values(user.equippedCosmetics).forEach((id: any) => {
      if (typeof id === 'string' && id) unlocked.add(id);
    });
  }

  // Legacy flat fields
  if (user.title) unlocked.add(user.title);
  if (user.badge) unlocked.add(user.badge);
  if (user.nameGradient) unlocked.add(user.nameGradient);
  if (user.avatarFrame) unlocked.add(user.avatarFrame);
  if (user.profileBanner) unlocked.add(user.profileBanner);
  if (user.rosterBanner) unlocked.add(user.rosterBanner);

  // Spoke specific overrides
  if (user.spokeCosmetics && typeof user.spokeCosmetics === 'object') {
    Object.values(user.spokeCosmetics).forEach((spokeMap: any) => {
      if (spokeMap && typeof spokeMap === 'object') {
        Object.values(spokeMap).forEach((id: any) => {
          if (typeof id === 'string' && id) unlocked.add(id);
        });
      }
    });
  }

  return unlocked;
}

/**
 * Checks whether a specific cosmetic item is unlocked for a user.
 * VIP/Founders or Premium members may have all items unlocked if configured.
 */
export function isCosmeticUnlocked(
  itemOrId: CosmeticItem | string,
  user: any | null | undefined,
  bypassForVip = false
): boolean {
  if (bypassForVip && (user?.isPremium || user?.membershipTier === 'VIP_FOUNDER' || user?.membershipTier === 'FOUNDER')) {
    return true;
  }

  const itemId = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  const item = typeof itemOrId === 'string' ? COSMETICS_CATALOG.find(c => c.id === itemOrId) : itemOrId;

  // Base free items are unlocked for all
  if (item && item.cost === 0 && !item.metadata?.unlockedByMilestone && item.rarity === 'common') {
    return true;
  }

  const userUnlocks = getUserUnlockedCosmetics(user);
  return userUnlocks.has(itemId);
}

/**
 * Returns a user-friendly requirement description for unlocking a cosmetic item.
 */
export function getCosmeticUnlockRequirement(itemOrId: CosmeticItem | string): string {
  const item = typeof itemOrId === 'string' ? COSMETICS_CATALOG.find(c => c.id === itemOrId) : itemOrId;
  if (!item) return 'Available in Club 602';

  if (item.metadata?.unlockedByMilestone) {
    return item.metadata.unlockedByMilestone;
  }

  if (item.forSale) {
    return `Available for ${item.cost?.toLocaleString() ?? 0} Links in the 602 Shop`;
  }

  switch (item.originSpoke) {
    case 'darts':
      return 'Exclusive Darts League Achievement';
    case 'putting':
      return 'Exclusive Putting League Milestone';
    case 'flip':
      return 'Exclusive Flip Cup Tournament Reward';
    case 'bingo':
      return 'Exclusive Bingo Championship Reward';
    case 'gridiron':
      return 'Exclusive Gridiron Exotics Fantasy League Reward';
    case 'scriptless':
      return 'Exclusive Scriptless Reality Season Reward';
    default:
      return 'Exclusive Club 602 Reward';
  }
}

/**
 * Determines whether a cosmetic item can be purchased directly with Links.
 */
export function isCosmeticPurchasable(itemOrId: CosmeticItem | string): boolean {
  const item = typeof itemOrId === 'string' ? COSMETICS_CATALOG.find(c => c.id === itemOrId) : itemOrId;
  return Boolean(item && (item.forSale || (item.cost !== undefined && item.cost > 0)));
}

/**
 * Gets the numeric cost in Links for a cosmetic item (or 0 if free/not purchasable).
 */
export function getCosmeticCost(itemOrId: CosmeticItem | string): number {
  const item = typeof itemOrId === 'string' ? COSMETICS_CATALOG.find(c => c.id === itemOrId) : itemOrId;
  return item?.cost || 0;
}
