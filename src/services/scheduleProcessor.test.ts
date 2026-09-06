import { describe, it, expect } from 'vitest';

describe('scheduleProcessor manual activation logic', () => {
  it('preserves active state when manuallyActivated is true on non-final games', () => {
    const existingData = {
      active: true,
      manuallyActivated: true,
      status: 'STATUS_SCHEDULED',
      metadata: {}
    };

    const scrapedMatchup = {
      active: false, // Scraper says inactive (e.g., missing moneyline or past threshold)
      status: 'STATUS_SCHEDULED',
      league: 'CFB'
    };

    const scoreboardOnly = false;
    const hasPicks = false;
    const thirdPartyLeagues = ['ATP', 'WTA', 'RPL', 'TUR', 'ARG', 'BRA', 'LMX'];
    const hasValidMlOdds = existingData.metadata?.mlHome !== undefined && existingData.metadata?.mlHome !== null &&
                           existingData.metadata?.mlAway !== undefined && existingData.metadata?.mlAway !== null;

    let finalActive = existingData.active;
    let scraperActive = scrapedMatchup.active;

    if (!scoreboardOnly) {
      if (hasPicks) {
        finalActive = true;
      } else if (existingData.manuallyActivated) {
        finalActive = true;
      } else if (existingData.active && !scraperActive) {
        if (thirdPartyLeagues.includes(scrapedMatchup.league) || hasValidMlOdds) {
          finalActive = true;
        } else {
          finalActive = false;
        }
      }
    }

    const newStatus = scrapedMatchup.status;
    if ((hasPicks || existingData.manuallyActivated) && newStatus !== 'STATUS_FINAL' && newStatus !== 'STATUS_POSTPONED') {
      finalActive = true;
    } else if (newStatus === 'STATUS_FINAL' || newStatus === 'STATUS_POSTPONED') {
      finalActive = false;
    }

    expect(finalActive).toBe(true);
  });

  it('marks game inactive once final even if manuallyActivated is true', () => {
    const existingData = {
      active: true,
      manuallyActivated: true,
      status: 'STATUS_SCHEDULED',
      metadata: {}
    };

    const scrapedMatchup = {
      active: false,
      status: 'STATUS_FINAL',
      league: 'CFB'
    };

    const scoreboardOnly = false;
    const hasPicks = false;

    let finalActive = existingData.active;

    if (!scoreboardOnly) {
      if (hasPicks) {
        finalActive = true;
      } else if (existingData.manuallyActivated) {
        finalActive = true;
      }
    }

    const newStatus = scrapedMatchup.status;
    if ((hasPicks || existingData.manuallyActivated) && newStatus !== 'STATUS_FINAL' && newStatus !== 'STATUS_POSTPONED') {
      finalActive = true;
    } else if (newStatus === 'STATUS_FINAL' || newStatus === 'STATUS_POSTPONED') {
      finalActive = false;
    }

    expect(finalActive).toBe(false);
  });
});
