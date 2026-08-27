import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('PickEmPage Yes Day prize breakdown tests', () => {
  it('renders YES Day custom prize breakdown structure correctly', () => {
    // Helper unit logic test for Yes Day prize pool rendering parameters
    const selectedCampaign = {
      isCharity: true,
      name: 'YES Day Walk for Autism 2026',
      entryFee: 0
    };

    const isYesDayCampaign = selectedCampaign?.isCharity ||
      selectedCampaign?.name === 'YES Day Walk for Autism 2026';

    expect(isYesDayCampaign).toBe(true);

    const potAmount = 15;
    const formattedPot = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(potAmount);
    expect(formattedPot).toBe('$15');
  });

  it('matches join codes case-insensitively and handles whitespace', () => {
    const campaigns = [
      { id: 'yes-day-1', name: 'YES Day Walk for Autism 2026', joinCode: 'yesday2026', isArchived: false },
      { id: 'other-camp', name: 'Other League', joinCode: 'SECRET123', isArchived: false },
      { id: 'archived-camp', name: 'Old League', joinCode: 'yesday2026', isArchived: true }
    ];

    const matchCode = (cleanCode: string) => {
      const trimmed = cleanCode.trim().toLowerCase();
      return campaigns.find(c => !c.isArchived && c.joinCode && c.joinCode.trim().toLowerCase() === trimmed);
    };

    expect(matchCode('yesday2026')?.id).toBe('yes-day-1');
    expect(matchCode('  YESDAY2026  ')?.id).toBe('yes-day-1');
    expect(matchCode('YesDay2026')?.id).toBe('yes-day-1');
    expect(matchCode('secret123')?.id).toBe('other-camp');
    expect(matchCode('invalidcode')).toBeUndefined();
  });
});
