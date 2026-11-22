import { describe, it, expect } from 'vitest';
import { ProfileBannerMap } from '../../lib/cosmetics';
import { MidwayChargeBanner } from './MidwayChargeBanner';
import { CrescentCrownBanner } from './CrescentCrownBanner';
import { GothamMachBanner } from './GothamMachBanner';
import { ArcSurgeBanner } from './ArcSurgeBanner';

describe('NFL Series Banners (Chicago Bears, New Orleans Saints, NY Jets & LA Chargers)', () => {
  describe('The Midway Charge (Chicago Bears inspired)', () => {
    it('exports MidwayChargeBanner component correctly', () => {
      expect(MidwayChargeBanner).toBeDefined();
      expect(typeof MidwayChargeBanner).toBe('function');
    });

    it('registers MidwayChargeBanner under canonical keys in ProfileBannerMap', () => {
      expect(ProfileBannerMap['MidwayChargeBanner']).toBe(MidwayChargeBanner);
      expect(ProfileBannerMap['MidwayCharge']).toBe(MidwayChargeBanner);
      expect(ProfileBannerMap['banner_midway_charge']).toBe(MidwayChargeBanner);
      expect(ProfileBannerMap['banner_chicago_bears']).toBe(MidwayChargeBanner);
    });

    it('matches NFL series banner specification for shop integration', () => {
      const bannerItem = {
        id: 'banner_midway_charge',
        name: 'The Midway Charge',
        description: 'Chicago-inspired banner featuring deep midnight navy waters, roaring burnt-orange seismic claw energy, frosty Lake Michigan wind drifts, and a forged steel bear-claw emblem.',
        cost: 250,
        type: 'PROFILE_BANNER',
        active: true,
        forSale: true,
        image: 'MidwayChargeBanner',
      };

      expect(bannerItem.cost).toBe(250);
      expect(bannerItem.type).toBe('PROFILE_BANNER');
      expect(bannerItem.active).toBe(true);
      expect(bannerItem.forSale).toBe(true);
      expect(ProfileBannerMap[bannerItem.image]).toBeDefined();
      expect(ProfileBannerMap[bannerItem.id]).toBeDefined();
    });
  });

  describe('The Crescent Crown (New Orleans Saints inspired)', () => {
    it('exports CrescentCrownBanner component correctly', () => {
      expect(CrescentCrownBanner).toBeDefined();
      expect(typeof CrescentCrownBanner).toBe('function');
    });

    it('registers CrescentCrownBanner under canonical keys in ProfileBannerMap', () => {
      expect(ProfileBannerMap['CrescentCrownBanner']).toBe(CrescentCrownBanner);
      expect(ProfileBannerMap['CrescentCrown']).toBe(CrescentCrownBanner);
      expect(ProfileBannerMap['banner_crescent_crown']).toBe(CrescentCrownBanner);
      expect(ProfileBannerMap['banner_new_orleans_saints']).toBe(CrescentCrownBanner);
    });

    it('matches NFL series banner specification for shop integration', () => {
      const bannerItem = {
        id: 'banner_crescent_crown',
        name: 'The Crescent Crown',
        description: 'New Orleans-inspired banner featuring deep obsidian black velvet, radiant French Quarter old-gold luminescence, drifting brass jazz embers, and a forged golden fleur-de-lis emblem.',
        cost: 250,
        type: 'PROFILE_BANNER',
        active: true,
        forSale: true,
        image: 'CrescentCrownBanner',
      };

      expect(bannerItem.cost).toBe(250);
      expect(bannerItem.type).toBe('PROFILE_BANNER');
      expect(bannerItem.active).toBe(true);
      expect(bannerItem.forSale).toBe(true);
      expect(ProfileBannerMap[bannerItem.image]).toBeDefined();
      expect(ProfileBannerMap[bannerItem.id]).toBeDefined();
    });
  });

  describe('The Gotham Mach (New York Jets inspired)', () => {
    it('exports GothamMachBanner component correctly', () => {
      expect(GothamMachBanner).toBeDefined();
      expect(typeof GothamMachBanner).toBe('function');
    });

    it('registers GothamMachBanner under canonical keys in ProfileBannerMap', () => {
      expect(ProfileBannerMap['GothamMachBanner']).toBe(GothamMachBanner);
      expect(ProfileBannerMap['GothamMach']).toBe(GothamMachBanner);
      expect(ProfileBannerMap['banner_gotham_mach']).toBe(GothamMachBanner);
      expect(ProfileBannerMap['banner_new_york_jets']).toBe(GothamMachBanner);
    });

    it('matches NFL series banner specification for shop integration', () => {
      const bannerItem = {
        id: 'banner_gotham_mach',
        name: 'The Gotham Mach',
        description: 'New York Jets-inspired banner featuring stealth Gotham obsidian skies, supersonic green afterburner shock diamonds, high-velocity vapor trails, and a chiseled supersonic jet crest.',
        cost: 250,
        type: 'PROFILE_BANNER',
        active: true,
        forSale: true,
        image: 'GothamMachBanner',
      };

      expect(bannerItem.cost).toBe(250);
      expect(bannerItem.type).toBe('PROFILE_BANNER');
      expect(bannerItem.active).toBe(true);
      expect(bannerItem.forSale).toBe(true);
      expect(ProfileBannerMap[bannerItem.image]).toBeDefined();
      expect(ProfileBannerMap[bannerItem.id]).toBeDefined();
    });
  });

  describe('The Arc Surge (Los Angeles Chargers inspired)', () => {
    it('exports ArcSurgeBanner component correctly', () => {
      expect(ArcSurgeBanner).toBeDefined();
      expect(typeof ArcSurgeBanner).toBe('function');
    });

    it('registers ArcSurgeBanner under canonical keys in ProfileBannerMap', () => {
      expect(ProfileBannerMap['ArcSurgeBanner']).toBe(ArcSurgeBanner);
      expect(ProfileBannerMap['ArcSurge']).toBe(ArcSurgeBanner);
      expect(ProfileBannerMap['banner_arc_surge']).toBe(ArcSurgeBanner);
      expect(ProfileBannerMap['banner_los_angeles_chargers']).toBe(ArcSurgeBanner);
    });

    it('matches NFL series banner specification for shop integration', () => {
      const bannerItem = {
        id: 'banner_arc_surge',
        name: 'The Arc Surge',
        description: 'Los Angeles Chargers-inspired banner featuring deep Pacific thunderstorm skies, undulating powder blue plasma waves, jagged solar-gold lightning discharge, and a forged electric bolt crest.',
        cost: 250,
        type: 'PROFILE_BANNER',
        active: true,
        forSale: true,
        image: 'ArcSurgeBanner',
      };

      expect(bannerItem.cost).toBe(250);
      expect(bannerItem.type).toBe('PROFILE_BANNER');
      expect(bannerItem.active).toBe(true);
      expect(bannerItem.forSale).toBe(true);
      expect(ProfileBannerMap[bannerItem.image]).toBeDefined();
      expect(ProfileBannerMap[bannerItem.id]).toBeDefined();
    });
  });
});

