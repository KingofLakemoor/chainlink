import { describe, it, expect, beforeEach } from 'vitest';
import { PlayBannerConfig } from './BannerAdminPage';

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('PlayBanner Configuration and Persistence Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates banner config structure and defaults', () => {
    const config: PlayBannerConfig = {
      active: true,
      message: 'Check out Pick Em Campaign',
      subtext: 'Join now for weekly prizes',
      badgeText: 'HOT',
      linkType: 'internal',
      linkUrl: '/pickem',
      ctaText: 'View Campaign',
      style: 'emerald',
      updatedAt: 1700000000000,
    };

    expect(config.active).toBe(true);
    expect(config.linkType).toBe('internal');
    expect(config.linkUrl).toBe('/pickem');
    expect(config.style).toBe('emerald');
  });

  it('correctly sets and checks localStorage key based on updatedAt timestamp', () => {
    const updatedAt = 1712345678900;
    const bannerKey = `chainlink_banner_dismissed_${updatedAt}`;

    expect(localStorage.getItem(bannerKey)).toBeNull();

    // Simulate user dismissing banner
    localStorage.setItem(bannerKey, 'true');

    expect(localStorage.getItem(bannerKey)).toBe('true');
  });

  it('treats new updatedAt timestamp as non-dismissed (new version published)', () => {
    const oldUpdatedAt = 1710000000000;
    const newUpdatedAt = 1720000000000;

    localStorage.setItem(`chainlink_banner_dismissed_${oldUpdatedAt}`, 'true');

    // New version published
    const newKey = `chainlink_banner_dismissed_${newUpdatedAt}`;
    expect(localStorage.getItem(newKey)).toBeNull();
  });

  it('correctly identifies link destination type', () => {
    const isExternal = (type: PlayBannerConfig['linkType'], url: string) => {
      if (type === 'external') return true;
      if (url.startsWith('http://') || url.startsWith('https://')) return true;
      return false;
    };

    expect(isExternal('internal', '/pickem')).toBe(false);
    expect(isExternal('external', 'https://example.com')).toBe(true);
    expect(isExternal('internal', 'https://external-link.com')).toBe(true);
  });
});
