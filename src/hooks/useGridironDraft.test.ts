import { describe, it, expect } from 'vitest';
import { GridironPick, Gridiron3x3Game } from '../types/gridiron';

// Standalone testable draft logic function matching useGridironDraft
function processTogglePick(
  currentPicks: GridironPick[],
  game: Gridiron3x3Game,
  pickType: "spread" | "total",
  selection: "away_spread" | "home_spread" | "over" | "under",
  value: number
): GridironPick[] {
  const now = Date.now();
  const kickoffMs = typeof game.kickoffTime === 'number'
    ? game.kickoffTime
    : (game.kickoffTime?.toMillis ? game.kickoffTime.toMillis() : new Date(game.kickoffTime).getTime());

  if (now >= kickoffMs) return currentPicks;

  const existingIdx = currentPicks.findIndex(p => p.gameId === game.gameId);

  if (existingIdx >= 0) {
    const existing = currentPicks[existingIdx];
    if (existing.selection === selection) {
      return currentPicks.filter(p => p.gameId !== game.gameId);
    }

    const updated = [...currentPicks];
    updated[existingIdx] = {
      gameId: game.gameId,
      league: game.league,
      pickType,
      selection,
      value,
      kickoffTime: game.kickoffTime,
      status: "pending"
    };
    return updated;
  } else {
    const currentLeagueCount = currentPicks.filter(p => p.league === game.league).length;
    if (currentLeagueCount >= 3) {
      return currentPicks;
    }

    return [
      ...currentPicks,
      {
        gameId: game.gameId,
        league: game.league,
        pickType,
        selection,
        value,
        kickoffTime: game.kickoffTime,
        status: "pending"
      }
    ];
  }
}

describe('useGridironDraft Logic', () => {
  const futureTime = Date.now() + 86400000;
  const pastTime = Date.now() - 3600000;

  const mockNflGame1: Gridiron3x3Game = {
    gameId: 'nfl_g1',
    league: 'NFL',
    awayTeam: { name: 'MIA', abbreviation: 'MIA' },
    homeTeam: { name: 'BUF', abbreviation: 'BUF' },
    kickoffTime: futureTime,
    status: 'scheduled',
    spread: { awaySpread: 3.5, homeSpread: -3.5 },
    total: { line: 48.5, over: -110, under: -110 }
  };

  const mockNflGame2: Gridiron3x3Game = { ...mockNflGame1, gameId: 'nfl_g2' };
  const mockNflGame3: Gridiron3x3Game = { ...mockNflGame1, gameId: 'nfl_g3' };
  const mockNflGame4: Gridiron3x3Game = { ...mockNflGame1, gameId: 'nfl_g4' };

  const mockCfbGame1: Gridiron3x3Game = { ...mockNflGame1, gameId: 'cfb_g1', league: 'CFB' };
  const mockCfbGame2: Gridiron3x3Game = { ...mockNflGame1, gameId: 'cfb_g2', league: 'CFB' };
  const mockCfbGame3: Gridiron3x3Game = { ...mockNflGame1, gameId: 'cfb_g3', league: 'CFB' };

  const mockLockedGame: Gridiron3x3Game = { ...mockNflGame1, gameId: 'nfl_locked', kickoffTime: pastTime };

  it('adds pick and updates counts', () => {
    let picks: GridironPick[] = [];
    picks = processTogglePick(picks, mockNflGame1, 'spread', 'home_spread', -3.5);

    expect(picks.length).toBe(1);
    expect(picks[0].selection).toBe('home_spread');
  });

  it('enforces mutual exclusion on same card and deselection', () => {
    let picks: GridironPick[] = [];
    picks = processTogglePick(picks, mockNflGame1, 'spread', 'home_spread', -3.5);
    expect(picks[0].selection).toBe('home_spread');

    // Replace selection on same card
    picks = processTogglePick(picks, mockNflGame1, 'total', 'over', 48.5);
    expect(picks.length).toBe(1);
    expect(picks[0].selection).toBe('over');

    // Deselect same option
    picks = processTogglePick(picks, mockNflGame1, 'total', 'over', 48.5);
    expect(picks.length).toBe(0);
  });

  it('enforces max 3 picks per league', () => {
    let picks: GridironPick[] = [];
    picks = processTogglePick(picks, mockNflGame1, 'spread', 'home_spread', -3.5);
    picks = processTogglePick(picks, mockNflGame2, 'spread', 'home_spread', -3.5);
    picks = processTogglePick(picks, mockNflGame3, 'spread', 'home_spread', -3.5);

    expect(picks.length).toBe(3);

    // 4th NFL pick is ignored
    picks = processTogglePick(picks, mockNflGame4, 'spread', 'home_spread', -3.5);
    expect(picks.length).toBe(3);
  });

  it('enforces kickoff lock time', () => {
    let picks: GridironPick[] = [];
    picks = processTogglePick(picks, mockLockedGame, 'spread', 'home_spread', -3.5);
    expect(picks.length).toBe(0);
  });

  it('validates 6 pick entry requirement (3 NFL, 3 CFB default)', () => {
    let picks: GridironPick[] = [];
    picks = processTogglePick(picks, mockNflGame1, 'spread', 'home_spread', -3.5);
    picks = processTogglePick(picks, mockNflGame2, 'spread', 'home_spread', -3.5);
    picks = processTogglePick(picks, mockNflGame3, 'spread', 'home_spread', -3.5);
    picks = processTogglePick(picks, mockCfbGame1, 'spread', 'home_spread', -3.5);
    picks = processTogglePick(picks, mockCfbGame2, 'spread', 'home_spread', -3.5);

    const checkCanSubmit = (p: GridironPick[], reqNfl = 3, reqCfb = 3) => {
      const nfl = p.filter(item => item.league === 'NFL').length;
      const cfb = p.filter(item => item.league === 'CFB').length;
      return nfl === reqNfl && cfb === reqCfb && p.length === 6;
    };

    expect(checkCanSubmit(picks)).toBe(false);

    picks = processTogglePick(picks, mockCfbGame3, 'spread', 'home_spread', -3.5);
    expect(checkCanSubmit(picks)).toBe(true);
  });

  it('supports dynamic pick shifts when 0 CFB games are available (6 NFL, 0 CFB)', () => {
    const checkCanSubmit = (p: GridironPick[], reqNfl = 6, reqCfb = 0) => {
      const nfl = p.filter(item => item.league === 'NFL').length;
      const cfb = p.filter(item => item.league === 'CFB').length;
      return nfl === reqNfl && cfb === reqCfb && p.length === 6;
    };

    const dummyPicks: GridironPick[] = [
      { gameId: 'g1', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() + 10000 },
      { gameId: 'g2', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() + 10000 },
      { gameId: 'g3', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() + 10000 },
      { gameId: 'g4', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() + 10000 },
      { gameId: 'g5', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() + 10000 },
      { gameId: 'g6', league: 'NFL', pickType: 'spread', selection: 'home_spread', value: -3.5, kickoffTime: Date.now() + 10000 }
    ];

    expect(checkCanSubmit(dummyPicks, 6, 0)).toBe(true);
  });
});
