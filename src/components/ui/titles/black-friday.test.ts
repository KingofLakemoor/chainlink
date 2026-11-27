import { describe, it, expect } from 'vitest';
import { TitleMap } from './index';
import { BlackFridayTitle } from './black-friday';
import catalog from '../../club602/catalog.json';

describe('BlackFridayTitle & Cosmetics Integration', () => {
  it('exports BlackFridayTitle component correctly', () => {
    expect(BlackFridayTitle).toBeDefined();
    expect(typeof BlackFridayTitle).toBe('function');
  });

  it('registers BlackFridayTitle under canonical keys in TitleMap', () => {
    expect(TitleMap['BlackFridayTitle']).toBe(BlackFridayTitle);
    expect(TitleMap['BlackFriday']).toBe(BlackFridayTitle);
    expect(TitleMap['title_black_friday']).toBe(BlackFridayTitle);
    expect(TitleMap['title_black_friday_bfbs']).toBe(BlackFridayTitle);
  });

  it('validates title item attributes and catalog entry', () => {
    const titleItem = {
      id: 'title_black_friday',
      name: 'Black Friday: BFBS',
      description: 'Prestige blackout title forged for big spenders. Features BFBS matte carbon weave, platinum-to-gold typography, and a minimalist wishbone emblem.',
      cost: 1000,
      type: 'TITLE',
      active: true,
      forSale: true,
      featured: true,
      image: 'BlackFridayTitle',
      preview: 'BlackFridayTitle',
    };

    expect(titleItem.id).toBe('title_black_friday');
    expect(titleItem.name).toBe('Black Friday: BFBS');
    expect(titleItem.cost).toBe(1000);
    expect(titleItem.type).toBe('TITLE');
    expect(TitleMap[titleItem.image]).toBeDefined();
    expect(TitleMap[titleItem.id]).toBeDefined();

    // Verify catalog JSON
    const foundInCatalog = catalog.find((c: any) => c.id === 'title_black_friday');
    expect(foundInCatalog).toBeDefined();
    expect(foundInCatalog?.name).toBe('Black Friday: BFBS');
    expect(foundInCatalog?.renderValue).toBe('BlackFridayTitle');
    expect(foundInCatalog?.cost).toBe(1000);
    expect(foundInCatalog?.forSale).toBe(true);
  });
});
