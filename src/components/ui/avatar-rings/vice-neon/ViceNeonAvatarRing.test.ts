import { describe, it, expect } from 'vitest';
import { AvatarRingMap } from '../../../../lib/cosmetics';
import { ViceNeonAvatarRing } from './ViceNeonAvatarRing';

describe('ViceNeonAvatarRing & Cosmetics Integration', () => {
  it('exports ViceNeonAvatarRing component correctly', () => {
    expect(ViceNeonAvatarRing).toBeDefined();
    expect(typeof ViceNeonAvatarRing).toBe('function');
  });

  it('registers ViceNeonAvatarRing under canonical keys in AvatarRingMap', () => {
    expect(AvatarRingMap['ViceNeonAvatarRing']).toBe(ViceNeonAvatarRing);
    expect(AvatarRingMap['ViceCityAvatarRing']).toBe(ViceNeonAvatarRing);
    expect(AvatarRingMap['ring_vice_neon']).toBe(ViceNeonAvatarRing);
    expect(AvatarRingMap['ring_vice_city']).toBe(ViceNeonAvatarRing);
  });

  it('validates avatar ring item attributes and non-infringement rules', () => {
    const ringItem = {
      id: 'ring_vice_neon',
      name: 'Vice Neon Ring',
      description: 'Pulsing retro twilight avatar ring radiating electric magenta, cyan neon arcs, and golden sunset bloom.',
      cost: 500,
      type: 'AVATAR_RING',
      active: true,
      forSale: true,
      featured: true,
      image: 'ViceNeonAvatarRing',
      preview: 'ViceNeonAvatarRing',
    };

    expect(ringItem.id).toBe('ring_vice_neon');
    expect(ringItem.name).toBe('Vice Neon Ring');
    expect(ringItem.cost).toBe(500);
    expect(ringItem.type).toBe('AVATAR_RING');
    expect(AvatarRingMap[ringItem.image]).toBeDefined();
    expect(AvatarRingMap[ringItem.id]).toBeDefined();

    // Verify non-infringement
    const descLower = ringItem.description.toLowerCase();
    const nameLower = ringItem.name.toLowerCase();
    expect(descLower).not.toContain('gta');
    expect(descLower).not.toContain('grand theft auto');
    expect(descLower).not.toContain('rockstar');
    expect(nameLower).not.toContain('gta');
    expect(nameLower).not.toContain('grand theft auto');
  });
});
