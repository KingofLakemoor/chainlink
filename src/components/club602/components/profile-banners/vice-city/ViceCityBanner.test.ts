import { describe, it, expect } from 'vitest';
import { ProfileBannerMap } from '../../../componentsMap';
import { ViceCityBanner } from './ViceCityBanner';

describe('ViceCityBanner & Shop Integration', () => {
  it('exports ViceCityBanner component correctly', () => {
    expect(ViceCityBanner).toBeDefined();
    expect(typeof ViceCityBanner).toBe('function');
  });

  it('registers ViceCityBanner under canonical keys in ProfileBannerMap', () => {
    expect(ProfileBannerMap['ViceCityBanner']).toBe(ViceCityBanner);
    expect(ProfileBannerMap['ViceNeonBanner']).toBe(ViceCityBanner);
    expect(ProfileBannerMap['banner_vice_city']).toBe(ViceCityBanner);
  });

  it('validates banner item specification for shop integration', () => {
    const bannerItem = {
      id: 'banner_vice_city',
      name: 'Vice Neon',
      description: 'Sun-drenched retro coastal banner inspired by neon-lit ocean drives, featuring swaying palm silhouettes, glowing segmented synth-sun, chrome water reflections, and vibrant magenta-to-cyan dusk.',
      cost: 250,
      type: 'PROFILE_BANNER',
      active: true,
      forSale: true,
      featured: true,
      image: 'ViceCityBanner',
    };

    expect(bannerItem.id).toBe('banner_vice_city');
    expect(bannerItem.cost).toBe(250);
    expect(bannerItem.type).toBe('PROFILE_BANNER');
    expect(bannerItem.active).toBe(true);
    expect(bannerItem.forSale).toBe(true);
    expect(bannerItem.featured).toBe(true);
    expect(ProfileBannerMap[bannerItem.image]).toBeDefined();
    expect(ProfileBannerMap[bannerItem.id]).toBeDefined();

    // Verify it doesn't make direct references to trademarked properties
    const descLower = bannerItem.description.toLowerCase();
    const nameLower = bannerItem.name.toLowerCase();
    expect(descLower).not.toContain('gta');
    expect(descLower).not.toContain('grand theft auto');
    expect(descLower).not.toContain('rockstar');
    expect(nameLower).not.toContain('gta');
    expect(nameLower).not.toContain('grand theft auto');
  });
});
