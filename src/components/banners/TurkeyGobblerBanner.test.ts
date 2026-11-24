import { describe, it, expect } from 'vitest';
import { ProfileBannerMap } from '../../lib/cosmetics';
import { TurkeyGobblerBanner } from './TurkeyGobblerBanner';

describe('1st Annual Turkey Day Gobbler Series Banner', () => {
  it('exports TurkeyGobblerBanner component correctly', () => {
    expect(TurkeyGobblerBanner).toBeDefined();
    expect(typeof TurkeyGobblerBanner).toBe('function');
  });

  it('registers TurkeyGobblerBanner under canonical keys in ProfileBannerMap', () => {
    expect(ProfileBannerMap['TurkeyGobblerBanner']).toBe(TurkeyGobblerBanner);
    expect(ProfileBannerMap['TurkeyGobbler']).toBe(TurkeyGobblerBanner);
    expect(ProfileBannerMap['banner_turkey_gobbler']).toBe(TurkeyGobblerBanner);
    expect(ProfileBannerMap['banner_turkey_day_gobbler']).toBe(TurkeyGobblerBanner);
  });

  it('matches catalog item specification for Turkey Day Gobbler award banner', () => {
    const bannerItem = {
      id: 'banner_turkey_gobbler',
      name: 'The Turkey Day Gobbler',
      description: "Exclusive trophy banner awarded to the champion of the 1st Annual Turkey Day Gobbler Pick 'Em Campaign. Features roasting dusk embers, majestic harvest-gold feather rays, and a forged champion turkey crest.",
      cost: 500,
      type: 'PROFILE_BANNER',
      active: true,
      forSale: false,
      image: 'TurkeyGobblerBanner',
    };

    expect(bannerItem.type).toBe('PROFILE_BANNER');
    expect(bannerItem.active).toBe(true);
    expect(bannerItem.forSale).toBe(false); // Exclusive award banner
    expect(ProfileBannerMap[bannerItem.image]).toBeDefined();
    expect(ProfileBannerMap[bannerItem.id]).toBeDefined();
  });
});
