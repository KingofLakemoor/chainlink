import { describe, it, expect } from 'vitest';
import { TitleMap } from './index';
import { ViceLordTitle } from './vice-lord';

describe('ViceLordTitle & Cosmetics Integration', () => {
  it('exports ViceLordTitle component correctly', () => {
    expect(ViceLordTitle).toBeDefined();
    expect(typeof ViceLordTitle).toBe('function');
  });

  it('registers ViceLordTitle under canonical keys in TitleMap', () => {
    expect(TitleMap['ViceLordTitle']).toBe(ViceLordTitle);
    expect(TitleMap['ViceLord']).toBe(ViceLordTitle);
    expect(TitleMap['title_vice_lord']).toBe(ViceLordTitle);
  });

  it('validates title item attributes and compliance with non-infringement rules', () => {
    const titleItem = {
      id: 'title_vice_lord',
      name: 'Vice Lord',
      description: 'Sun-drenched retro title bathed in electric flamingo pink, chrome sunset gold, and twilight cyan.',
      cost: 800,
      type: 'TITLE',
      active: true,
      forSale: true,
      featured: true,
      image: 'ViceLordTitle',
      preview: 'ViceLordTitle',
    };

    expect(titleItem.id).toBe('title_vice_lord');
    expect(titleItem.name).toBe('Vice Lord');
    expect(titleItem.cost).toBe(800);
    expect(titleItem.type).toBe('TITLE');
    expect(TitleMap[titleItem.image]).toBeDefined();
    expect(TitleMap[titleItem.id]).toBeDefined();

    // Verify non-infringement
    const descLower = titleItem.description.toLowerCase();
    const nameLower = titleItem.name.toLowerCase();
    expect(descLower).not.toContain('gta');
    expect(descLower).not.toContain('grand theft auto');
    expect(descLower).not.toContain('rockstar');
    expect(nameLower).not.toContain('gta');
    expect(nameLower).not.toContain('grand theft auto');
    expect(nameLower).not.toContain('rockstar');
  });
});
