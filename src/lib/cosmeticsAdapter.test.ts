import { describe, it, expect } from 'vitest';
import { ChainLinkCosmeticsAdapter } from './cosmeticsAdapter';
import { GenericCosmeticItem, UserCosmeticProfile, ICosmeticsProvider } from '../types/providers';

describe('ChainLinkCosmeticsAdapter', () => {
  const sampleItems: GenericCosmeticItem[] = [
    { id: 'ring_sample', name: 'Sample Ring', description: 'Test ring', cost: 100, type: 'AVATAR_RING' },
    { id: 'banner_sample', name: 'Sample Banner', description: 'Test banner', cost: 200, type: 'PROFILE_BANNER' }
  ];

  it('delegates to fallback provider when no external delegate is attached', async () => {
    const adapter = new ChainLinkCosmeticsAdapter(sampleItems);
    const catalog = await adapter.getCatalogItems();
    expect(catalog).toHaveLength(2);
    expect(catalog[0].id).toBe('ring_sample');
  });

  it('resolves component mappings for registered avatar rings, banners, and titles', () => {
    const adapter = new ChainLinkCosmeticsAdapter();
    expect(adapter.resolveAvatarRingComponent('Hexagons')).toBeDefined();
    expect(adapter.resolveAvatarRingComponent('ViceNeonAvatarRing')).toBeDefined();
    expect(adapter.resolveAvatarRingComponent('non_existent_ring')).toBeNull();

    expect(adapter.resolveProfileBannerComponent('InfernoBanner')).toBeDefined();
    expect(adapter.resolveProfileBannerComponent('ViceCityBanner')).toBeDefined();
    expect(adapter.resolveProfileBannerComponent('unknown_banner')).toBeNull();

    expect(adapter.resolveTitleComponent('ViceLordTitle')).toBeDefined();
    expect(adapter.resolveTitleComponent('unknown_title')).toBeNull();
  });

  it('allows attaching and prioritizing a delegate provider (e.g. Club 602 Core)', async () => {
    const adapter = new ChainLinkCosmeticsAdapter(sampleItems);

    const mock602Delegate: ICosmeticsProvider = {
      getCatalogItems: async () => [
        { id: 'club602_exclusive_ring', name: '602 Exclusive', description: 'Special', cost: 0, type: 'AVATAR_RING' }
      ],
      isUnlocked: (_user, itemId) => itemId === 'club602_exclusive_ring',
      getEquippedCosmeticId: (_user, _slot) => 'club602_exclusive_ring',
      getUnlockRequirement: (_id) => 'Club 602 Member Only'
    };

    adapter.setDelegate(mock602Delegate);

    const catalog = await adapter.getCatalogItems();
    expect(catalog).toHaveLength(1);
    expect(catalog[0].id).toBe('club602_exclusive_ring');

    const user: UserCosmeticProfile = { uid: 'u_test', unlockedCosmetics: [] };
    expect(adapter.isUnlocked(user, 'club602_exclusive_ring')).toBe(true);
    expect(adapter.isUnlocked(user, 'ring_sample')).toBe(false);
    expect(adapter.getUnlockRequirement('any')).toBe('Club 602 Member Only');
  });
});
