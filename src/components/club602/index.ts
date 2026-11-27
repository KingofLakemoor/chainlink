import { CosmeticItem, CosmeticCategory, SpokeOrigin, UserEquippedCosmetics } from './types';
import rawCatalog from './catalog.json';

export * from './types';
export * from './components/badgeIcons';
export * from './components/Club602Avatar';
export * from './components/Club602Banner';
export * from './components/Club602Nameplate';
export * from './components/CosmeticOriginBadge';
export * from './components/Club602LockerModal';
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
 * Checks whether a cosmetic item ID or item requires an active ChainLink Pro membership.
 */
export function isProCosmeticItem(itemOrId?: CosmeticItem | string | null): boolean {
  if (!itemOrId) return false;
  if (typeof itemOrId === 'string') {
    const item = COSMETICS_CATALOG.find(c => c.id === itemOrId);
    if (item?.premiumOnly) return true;
    return itemOrId.includes('chainlink_pro') ||
      itemOrId.includes('pro_syndicate') ||
      itemOrId.includes('signal_floor') ||
      itemOrId.includes('edge_ledger') ||
      itemOrId === 'ChainLinkProBanner' ||
      itemOrId === 'ProSyndicateBanner' ||
      itemOrId === 'ChainLinkProAvatarRing' ||
      itemOrId === 'ChainLinkProRing' ||
      itemOrId === 'SyndicateAvatarRing' ||
      itemOrId === 'ProSyndicateRing' ||
      itemOrId === 'ChainLinkProMemberTitle' ||
      itemOrId === 'SyndicateSyndicTitle';
  }
  return Boolean(itemOrId.premiumOnly);
}

/**
 * Checks whether user has an active Pro membership.
 */
export function isProMember(user?: any | null): boolean {
  if (!user) return false;
  return Boolean(
    user.isPremium ||
    user.premium ||
    user.chainlinkPremium ||
    user.scriptlessPremium ||
    user.membershipTier === 'PRO' ||
    user.membershipTier === 'VIP_FOUNDER' ||
    user.membershipTier === 'FOUNDER'
  );
}

/**
 * Resolves equipped cosmetics for a given spoke context.
 * Precedence order:
 * 1. user.spokeCosmetics[spokeId][slot] (Spoke-specific override)
 * 2. user.equippedCosmetics[slot] (Global Network Look)
 * 3. Legacy flat profile fields (e.g. title, badge, avatarFrame, profileBanner, nameGradient)
 *
 * Enforces active Pro membership: If user is not an active Pro member, any equipped Pro-exclusive
 * cosmetics are suppressed / stripped so they are only displayed while membership is active.
 */
export function resolveSpokeCosmetics(
  user: any | null | undefined,
  spokeId?: SpokeOrigin
): UserEquippedCosmetics {
  if (!user) return {};

  const globalEquipped = user.equippedCosmetics || {};
  const spokeOverrides = (spokeId && user.spokeCosmetics?.[spokeId]) || {};
  const hasActivePro = isProMember(user);

  const rawTitle = spokeOverrides.TITLE ?? globalEquipped.TITLE ?? user.title;
  const rawGradient = spokeOverrides.NAME_GRADIENT ?? globalEquipped.NAME_GRADIENT ?? user.nameGradient;
  const rawBadge = spokeOverrides.BADGE ?? globalEquipped.BADGE ?? user.badge;
  const rawRing = spokeOverrides.AVATAR_RING ?? globalEquipped.AVATAR_RING ?? user.avatarFrame;
  const rawProfileBanner = spokeOverrides.PROFILE_BANNER ?? globalEquipped.PROFILE_BANNER ?? user.profileBanner;
  const rawRosterBanner = spokeOverrides.ROSTER_BANNER ?? globalEquipped.ROSTER_BANNER ?? user.rosterBanner;
  const rawBannerVariant = spokeOverrides.BANNER_VARIANT ?? globalEquipped.BANNER_VARIANT;

  return {
    TITLE: !hasActivePro && isProCosmeticItem(rawTitle) ? undefined : rawTitle,
    NAME_GRADIENT: !hasActivePro && isProCosmeticItem(rawGradient) ? undefined : rawGradient,
    BADGE: !hasActivePro && isProCosmeticItem(rawBadge) ? undefined : rawBadge,
    AVATAR_RING: !hasActivePro && isProCosmeticItem(rawRing) ? undefined : rawRing,
    PROFILE_BANNER: !hasActivePro && isProCosmeticItem(rawProfileBanner) ? undefined : rawProfileBanner,
    ROSTER_BANNER: !hasActivePro && isProCosmeticItem(rawRosterBanner) ? undefined : rawRosterBanner,
    BANNER_VARIANT: rawBannerVariant,
  };
}

/**
 * Returns all cosmetic IDs unlocked by a given user across all spokes.
 * Normalizes between user.unlockedCosmetics, user.inventory, and auto-unlocked default items.
 * If user does not have an active Pro membership, Pro-exclusive cosmetics are excluded.
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

  const hasActivePro = isProMember(user);

  // Unlocked cosmetics array (Scriptless / canonical format)
  if (Array.isArray(user.unlockedCosmetics)) {
    user.unlockedCosmetics.forEach((id: string) => {
      if (hasActivePro || !isProCosmeticItem(id)) unlocked.add(id);
    });
  }

  // Inventory array (ChainLink format)
  if (Array.isArray(user.inventory)) {
    user.inventory.forEach((id: string) => {
      if (hasActivePro || !isProCosmeticItem(id)) unlocked.add(id);
    });
  }

  // Additional purchased/unlocked arrays across spokes
  if (Array.isArray(user.purchasedItems)) {
    user.purchasedItems.forEach((id: string) => {
      if (hasActivePro || !isProCosmeticItem(id)) unlocked.add(id);
    });
  }
  if (Array.isArray(user.titles)) {
    user.titles.forEach((id: string) => {
      if (hasActivePro || !isProCosmeticItem(id)) unlocked.add(id);
    });
  }

  // Cross-spoke paid premium status unlocks all non-milestone / premium catalog items
  if (hasActivePro) {
    COSMETICS_CATALOG.forEach((item) => {
      // Grant cosmetics to premium members (excluding specific achievement-only milestone locks)
      if (!item.metadata?.unlockedByMilestone) {
        unlocked.add(item.id);
      }
    });
  }

  // Currently equipped items are implicitly owned (unless Pro-exclusive without active Pro)
  if (user.equippedCosmetics && typeof user.equippedCosmetics === 'object') {
    Object.values(user.equippedCosmetics).forEach((id: any) => {
      if (typeof id === 'string' && id && (hasActivePro || !isProCosmeticItem(id))) {
        unlocked.add(id);
      }
    });
  }

  // Legacy flat fields
  if (user.title && (hasActivePro || !isProCosmeticItem(user.title))) unlocked.add(user.title);
  if (user.badge && (hasActivePro || !isProCosmeticItem(user.badge))) unlocked.add(user.badge);
  if (user.nameGradient && (hasActivePro || !isProCosmeticItem(user.nameGradient))) unlocked.add(user.nameGradient);
  if (user.avatarFrame && (hasActivePro || !isProCosmeticItem(user.avatarFrame))) unlocked.add(user.avatarFrame);
  if (user.profileBanner && (hasActivePro || !isProCosmeticItem(user.profileBanner))) unlocked.add(user.profileBanner);
  if (user.rosterBanner && (hasActivePro || !isProCosmeticItem(user.rosterBanner))) unlocked.add(user.rosterBanner);

  // Spoke specific overrides
  if (user.spokeCosmetics && typeof user.spokeCosmetics === 'object') {
    Object.values(user.spokeCosmetics).forEach((spokeMap: any) => {
      if (spokeMap && typeof spokeMap === 'object') {
        Object.values(spokeMap).forEach((id: any) => {
          if (typeof id === 'string' && id && (hasActivePro || !isProCosmeticItem(id))) {
            unlocked.add(id);
          }
        });
      }
    });
  }

  return unlocked;
}

/**
 * Checks whether a specific cosmetic item is unlocked for a user.
 * Pro-exclusive cosmetics strictly require an active Pro membership.
 */
export function isCosmeticUnlocked(
  itemOrId: CosmeticItem | string,
  user: any | null | undefined,
  bypassForVip = false
): boolean {
  const hasActivePro = isProMember(user);

  if (bypassForVip && hasActivePro) {
    return true;
  }

  const itemId = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  const item = typeof itemOrId === 'string' ? COSMETICS_CATALOG.find(c => c.id === itemOrId) : itemOrId;

  // Pro-exclusive items strictly require active Pro membership
  if (isProCosmeticItem(item || itemId)) {
    return hasActivePro;
  }

  // Base free items are unlocked for all
  if (item && item.cost === 0 && !item.metadata?.unlockedByMilestone && item.rarity === 'common') {
    return true;
  }

  // Premium subscribers unlock catalog items across all spokes
  if (hasActivePro && (!item || !item.metadata?.unlockedByMilestone)) {
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
