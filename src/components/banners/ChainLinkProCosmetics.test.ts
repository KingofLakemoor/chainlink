import { describe, it, expect } from 'vitest';
import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../ui/titles';
import { ChainLinkProBanner } from './ChainLinkProBanner';
import { ProSyndicateBanner } from './ProSyndicateBanner';
import { ChainLinkProAvatarRing } from '../ui/avatar-rings/chainlink-pro';
import { SyndicateAvatarRing } from '../ui/avatar-rings/syndicate';
import { ChainLinkProMemberTitle } from '../ui/titles/chainlink-pro-member';
import { SyndicateSyndicTitle } from '../ui/titles/pro-syndicate';
import shopItems from '../../../shop_items.json';

describe('ChainLink Pro Exclusive Cosmetics Integration', () => {
  describe('Component Exports', () => {
    it('exports all 6 pro cosmetics components correctly', () => {
      expect(typeof ChainLinkProBanner).toBe('function');
      expect(typeof ProSyndicateBanner).toBe('function');
      expect(typeof ChainLinkProAvatarRing).toBe('function');
      expect(typeof SyndicateAvatarRing).toBe('function');
      expect(typeof ChainLinkProMemberTitle).toBe('function');
      expect(typeof SyndicateSyndicTitle).toBe('function');
    });
  });

  describe('Component Registries', () => {
    it('registers banners in ProfileBannerMap', () => {
      expect(ProfileBannerMap['ChainLinkProBanner']).toBe(ChainLinkProBanner);
      expect(ProfileBannerMap['banner_chainlink_pro']).toBe(ChainLinkProBanner);
      expect(ProfileBannerMap['ProSyndicateBanner']).toBe(ProSyndicateBanner);
      expect(ProfileBannerMap['banner_pro_syndicate']).toBe(ProSyndicateBanner);
    });

    it('registers avatar rings in AvatarRingMap', () => {
      expect(AvatarRingMap['ChainLinkProAvatarRing']).toBe(ChainLinkProAvatarRing);
      expect(AvatarRingMap['ring_chainlink_pro']).toBe(ChainLinkProAvatarRing);
      expect(AvatarRingMap['SyndicateAvatarRing']).toBe(SyndicateAvatarRing);
      expect(AvatarRingMap['ring_pro_syndicate']).toBe(SyndicateAvatarRing);
    });

    it('registers titles in TitleMap', () => {
      expect(TitleMap['ChainLinkProMemberTitle']).toBe(ChainLinkProMemberTitle);
      expect(TitleMap['title_chainlink_pro_member']).toBe(ChainLinkProMemberTitle);
      expect(TitleMap['SyndicateSyndicTitle']).toBe(SyndicateSyndicTitle);
      expect(TitleMap['title_pro_syndicate']).toBe(SyndicateSyndicTitle);
    });
  });

  describe('Shop Items Specifications', () => {
    const proShopItems = shopItems.filter((i: any) => i.collectionId === 'chainlink_pro' && i.premiumOnly);

    it('contains exactly 6 Pro exclusive cosmetics in shop_items.json', () => {
      expect(proShopItems).toHaveLength(6);
    });

    it('has 1 free banner (0 links) and 1 paid banner (300 links)', () => {
      const banners = proShopItems.filter((i: any) => i.type === 'PROFILE_BANNER');
      expect(banners).toHaveLength(2);
      const freeBanner = banners.find((b: any) => b.cost === 0);
      const paidBanner = banners.find((b: any) => b.cost === 300);
      expect(freeBanner).toBeDefined();
      expect(freeBanner?.id).toBe('banner_chainlink_pro');
      expect(freeBanner?.forSale).toBe(true);
      expect(paidBanner).toBeDefined();
      expect(paidBanner?.id).toBe('banner_pro_syndicate');
      expect(paidBanner?.forSale).toBe(true);
    });

    it('has 1 free avatar ring (0 links) and 1 paid avatar ring (300 links)', () => {
      const rings = proShopItems.filter((i: any) => i.type === 'AVATAR_RING');
      expect(rings).toHaveLength(2);
      const freeRing = rings.find((r: any) => r.cost === 0);
      const paidRing = rings.find((r: any) => r.cost === 300);
      expect(freeRing).toBeDefined();
      expect(freeRing?.id).toBe('ring_chainlink_pro');
      expect(freeRing?.forSale).toBe(true);
      expect(paidRing).toBeDefined();
      expect(paidRing?.id).toBe('ring_pro_syndicate');
      expect(paidRing?.forSale).toBe(true);
    });

    it('has 1 free title (0 links) and 1 paid title (300 links)', () => {
      const titles = proShopItems.filter((i: any) => i.type === 'TITLE');
      expect(titles).toHaveLength(2);
      const freeTitle = titles.find((t: any) => t.cost === 0);
      const paidTitle = titles.find((t: any) => t.cost === 300);
      expect(freeTitle).toBeDefined();
      expect(freeTitle?.id).toBe('title_chainlink_pro_member');
      expect(freeTitle?.forSale).toBe(true);
      expect(paidTitle).toBeDefined();
      expect(paidTitle?.id).toBe('title_pro_syndicate');
      expect(paidTitle?.forSale).toBe(true);
    });

    it('all 6 items are marked active, forSale, and premiumOnly', () => {
      proShopItems.forEach((item: any) => {
        expect(item.active).toBe(true);
        expect(item.forSale).toBe(true);
        expect(item.premiumOnly).toBe(true);
      });
    });
  });
});
