import { describe, it, expect } from 'vitest';
import { BlackFridayBFBSBanner } from './BlackFridayBFBSBanner';
import { ProfileBannerMap } from '../../lib/cosmetics';
import catalog from '../club602/catalog.json';

describe('Black Friday BFBS Profile Banner & Moneysink Integration', () => {
  it('exports BlackFridayBFBSBanner component correctly', () => {
    expect(BlackFridayBFBSBanner).toBeDefined();
    expect(typeof BlackFridayBFBSBanner).toBe('function');
  });

  it('registers BlackFridayBFBSBanner under canonical keys in ProfileBannerMap', () => {
    expect(ProfileBannerMap['BlackFridayBFBSBanner']).toBe(BlackFridayBFBSBanner);
    expect(ProfileBannerMap['BlackFridayBanner']).toBe(BlackFridayBFBSBanner);
    expect(ProfileBannerMap['BlackFridayBFBS']).toBe(BlackFridayBFBSBanner);
    expect(ProfileBannerMap['BlackFriday']).toBe(BlackFridayBFBSBanner);
    expect(ProfileBannerMap['banner_black_friday']).toBe(BlackFridayBFBSBanner);
    expect(ProfileBannerMap['banner_black_friday_bfbs']).toBe(BlackFridayBFBSBanner);
  });

  it('matches catalog item specification for Black Friday BFBS banner', () => {
    const bannerItem = {
      id: 'banner_black_friday',
      name: 'Black Friday: BFBS Edition',
      description: 'Ultra-sleek Black Friday blackout banner. Pure BFBS pitch obsidian, flowing carbon smoke, razor specular highlights, subtle roast-cranberry thermal sheen, and a forged blackout turkey & wishbone crest.',
      image: 'BlackFridayBFBSBanner',
      cost: 800,
      forSale: true,
      active: true,
      featured: true,
    };

    expect(bannerItem.id).toBe('banner_black_friday');
    expect(bannerItem.cost).toBe(800);
    expect(bannerItem.forSale).toBe(true);
    expect(ProfileBannerMap[bannerItem.image]).toBeDefined();
    expect(ProfileBannerMap[bannerItem.id]).toBeDefined();

    // Verify presence in catalog
    const foundInCatalog = catalog.find((c: any) => c.id === 'banner_black_friday');
    expect(foundInCatalog).toBeDefined();
    expect(foundInCatalog?.name).toBe('Black Friday: BFBS Edition');
    expect(foundInCatalog?.renderValue).toBe('BlackFridayBFBSBanner');
    expect(foundInCatalog?.cost).toBe(800);
    expect(foundInCatalog?.forSale).toBe(true);
  });
});
