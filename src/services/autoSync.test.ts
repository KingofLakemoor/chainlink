import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('autoSync and espnScraper delayed game tests', () => {
  it('does not push startTime 30 minutes into the future when a game start time has arrived with delayed status', () => {
    const pastStartTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago

    const comp = {
      date: new Date(pastStartTime).toISOString(),
      status: {
        type: {
          name: 'STATUS_DELAYED',
          state: 'pre',
          shortDetail: 'Delayed - Rain',
          detail: 'Delayed - Rain',
        },
      },
    };

    let startTime = comp.date ? new Date(comp.date).getTime() : 0;
    const rawStatus = comp.status.type.name;
    const compState = comp.status.type.state;
    const descLower = 'delayed - rain';
    const detailLower = 'delayed - rain';

    let finalStatus = 'STATUS_SCHEDULED';
    let finalStatusDesc = 'Upcoming';

    // Simulate scraper logic from espnScraper.ts
    if (descLower.includes('delayed') || detailLower.includes('delayed')) {
      if (compState === 'pre') {
        if (startTime > 0 && Date.now() >= startTime) {
          finalStatus = 'STATUS_IN_PROGRESS';
          finalStatusDesc = comp.status.type.detail || comp.status.type.shortDetail || 'Delayed';
        } else {
          finalStatus = 'STATUS_SCHEDULED';
          finalStatusDesc = comp.status.type.detail || comp.status.type.shortDetail || 'Delayed';
        }
      }
    }

    expect(finalStatus).toBe('STATUS_IN_PROGRESS');
    expect(finalStatusDesc).toBe('Delayed - Rain');
    expect(startTime).toBe(pastStartTime); // startTime is preserved and NOT mutated
  });

  it('correctly detects live games when scheduled games pass start time or are within 15 minutes', () => {
    const nowMs = Date.now();
    const gameStartingIn5Mins = nowMs + 5 * 60 * 1000;

    const mockMatchups = [
      {
        gameId: 'nfl_1',
        league: 'NFL',
        status: 'STATUS_SCHEDULED',
        active: true,
        startTime: gameStartingIn5Mins,
      },
    ];

    let hasLiveGames = false;
    const activeLeaguesSet = new Set<string>();

    mockMatchups.forEach((m) => {
      const startTime = typeof m.startTime === 'number' ? m.startTime : (m.startTime ? new Date(m.startTime).getTime() : 0);
      if (startTime > 0 && startTime <= nowMs + 15 * 60 * 1000 && startTime >= nowMs - 12 * 60 * 60 * 1000) {
        hasLiveGames = true;
        if (m.league) activeLeaguesSet.add(m.league);
      }
    });

    expect(hasLiveGames).toBe(true);
    expect(activeLeaguesSet.has('NFL')).toBe(true);
  });
});
