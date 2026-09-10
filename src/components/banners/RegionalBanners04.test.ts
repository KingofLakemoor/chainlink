import { describe, it, expect } from 'vitest';
import { AlpineSurgeBanner } from './AlpineSurgeBanner';
import { CrimsonKingdomBanner } from './CrimsonKingdomBanner';
import { ProfileBannerMap } from '../../lib/cosmetics';
import shopItems from '../../../shop_items.json';

describe('Regional Banners Drop 04', () => {
  it('exports AlpineSurgeBanner and CrimsonKingdomBanner components', () => {
    expect(AlpineSurgeBanner).toBeDefined();
    expect(typeof AlpineSurgeBanner).toBe('function');

    expect(CrimsonKingdomBanner).toBeDefined();
    expect(typeof CrimsonKingdomBanner).toBe('function');
  });

  it('registers Drop 04 banners in ProfileBannerMap', () => {
    expect(ProfileBannerMap['AlpineSurgeBanner']).toBe(AlpineSurgeBanner);
    expect(ProfileBannerMap['CrimsonKingdomBanner']).toBe(CrimsonKingdomBanner);
  });

  it('includes banner_alpine_surge in shop_items.json catalog', () => {
    const item = shopItems.find((i: any) => i.id === 'banner_alpine_surge');
    expect(item).toBeDefined();
    expect(item?.name).toBe('The Alpine Surge');
    expect(item?.image).toBe('AlpineSurgeBanner');
    expect(item?.cost).toBe(250);
    expect(item?.type).toBe('PROFILE_BANNER');
  });

  it('includes banner_crimson_kingdom in shop_items.json catalog', () => {
    const item = shopItems.find((i: any) => i.id === 'banner_crimson_kingdom');
    expect(item).toBeDefined();
    expect(item?.name).toBe('The Crimson Kingdom');
    expect(item?.image).toBe('CrimsonKingdomBanner');
    expect(item?.cost).toBe(250);
    expect(item?.type).toBe('PROFILE_BANNER');
  });
});
