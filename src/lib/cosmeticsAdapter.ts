import {
  ICosmeticsProvider,
  GenericCosmeticItem,
  UserCosmeticProfile,
  CosmeticSlot
} from '../types/providers';
import { StandaloneCosmeticsProvider } from '../services/standaloneProviders';
import { AvatarRingMap, ProfileBannerMap } from './cosmetics';
import { TitleMap } from '../components/ui/titles';

/**
 * Adapter that provides a unified, pluggable cosmetics contract for ChainLink.
 *
 * In Open-Source / Standalone mode:
 * Resolves item definitions from local registries and handles unlocks/equips using standard rules.
 *
 * In Club 602 Proprietary mode:
 * Can wrap or delegate to `@club602/cosmetics` to reconcile the full 221-item multi-spoke catalog,
 * cross-spoke ownership, and spoke overrides (`spokeCosmetics.chainlink`).
 */
export class ChainLinkCosmeticsAdapter implements ICosmeticsProvider {
  private fallbackProvider: StandaloneCosmeticsProvider;
  private delegateProvider?: ICosmeticsProvider;

  constructor(items: GenericCosmeticItem[] = [], delegate?: ICosmeticsProvider) {
    this.fallbackProvider = new StandaloneCosmeticsProvider(items);
    this.delegateProvider = delegate;
  }

  /**
   * Set or swap the underlying provider at runtime (e.g. when connecting to Club 602 central hub).
   */
  setDelegate(provider: ICosmeticsProvider) {
    this.delegateProvider = provider;
  }

  async getCatalogItems(): Promise<GenericCosmeticItem[]> {
    if (this.delegateProvider) {
      try {
        return await this.delegateProvider.getCatalogItems();
      } catch (err) {
        console.warn('[ChainLinkCosmeticsAdapter] Failed fetching from delegate provider, falling back to local catalog:', err);
      }
    }
    return this.fallbackProvider.getCatalogItems();
  }

  isUnlocked(user: UserCosmeticProfile, itemId: string): boolean {
    if (this.delegateProvider) {
      return this.delegateProvider.isUnlocked(user, itemId);
    }
    return this.fallbackProvider.isUnlocked(user, itemId);
  }

  getEquippedCosmeticId(user: UserCosmeticProfile, slot: CosmeticSlot, spokeKey: string = 'chainlink'): string | null {
    if (this.delegateProvider) {
      return this.delegateProvider.getEquippedCosmeticId(user, slot, spokeKey);
    }
    return this.fallbackProvider.getEquippedCosmeticId(user, slot, spokeKey);
  }

  getUnlockRequirement(itemId: string): string | null {
    if (this.delegateProvider) {
      return this.delegateProvider.getUnlockRequirement(itemId);
    }
    return this.fallbackProvider.getUnlockRequirement(itemId);
  }

  /**
   * Resolves the React component render function for an avatar ring key or ID.
   */
  resolveAvatarRingComponent(keyOrId?: string | null): React.FC<any> | null {
    if (!keyOrId) return null;
    return AvatarRingMap[keyOrId] || null;
  }

  /**
   * Resolves the React component render function for a profile banner key or ID.
   */
  resolveProfileBannerComponent(keyOrId?: string | null): React.FC<any> | null {
    if (!keyOrId) return null;
    return ProfileBannerMap[keyOrId] || null;
  }

  /**
   * Resolves the React component render function for a title key or ID.
   */
  resolveTitleComponent(keyOrId?: string | null): React.FC<any> | null {
    if (!keyOrId) return null;
    return TitleMap[keyOrId] || null;
  }
}

/** Singleton default cosmetics adapter instance */
export const defaultCosmeticsAdapter = new ChainLinkCosmeticsAdapter();
