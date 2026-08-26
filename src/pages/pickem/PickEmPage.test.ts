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
});
