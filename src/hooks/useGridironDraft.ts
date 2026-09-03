import { useState, useMemo, useEffect } from 'react';
import { GridironPick, Gridiron3x3Game } from '../types/gridiron';

export function useGridironDraft(initialPicks: GridironPick[] = []) {
  const [picks, setPicks] = useState<GridironPick[]>(initialPicks);

  const initialKey = useMemo(() => {
    return (initialPicks || []).map(p => `${p.gameId}_${p.selection}_${p.value}`).sort().join('|');
  }, [initialPicks]);

  useEffect(() => {
    if (initialPicks && initialPicks.length > 0) {
      setPicks(initialPicks);
    }
  }, [initialKey]);

  const nflCount = useMemo(() => picks.filter(p => p.league === "NFL").length, [picks]);
  const cfbCount = useMemo(() => picks.filter(p => p.league === "CFB").length, [picks]);

  const togglePick = (
    game: Gridiron3x3Game,
    pickType: "spread" | "total",
    selection: "away_spread" | "home_spread" | "over" | "under",
    value: number
  ) => {
    const now = Date.now();
    const kickoffMs = typeof game.kickoffTime === 'number'
      ? game.kickoffTime
      : (game.kickoffTime?.toMillis ? game.kickoffTime.toMillis() : new Date(game.kickoffTime).getTime());

    // Lock check: cannot pick if game already kicked off
    if (now >= kickoffMs) return;

    setPicks(prev => {
      const existingIdx = prev.findIndex(p => p.gameId === game.gameId);

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        // If clicking the exact same option => deselect it
        if (existing.selection === selection) {
          return prev.filter(p => p.gameId !== game.gameId);
        }

        // Replacing selection on the same game (mutual exclusion)
        const updated = [...prev];
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
        // Enforce max 3 picks per league
        const currentLeagueCount = prev.filter(p => p.league === game.league).length;
        if (currentLeagueCount >= 3) {
          return prev; // Reached 3 picks limit for this league
        }

        return [
          ...prev,
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
    });
  };

  const getPickForGame = (gameId: string): GridironPick | undefined => {
    return picks.find(p => p.gameId === gameId);
  };

  const canSubmit = useMemo(() => {
    return nflCount === 3 && cfbCount === 3 && picks.length === 6;
  }, [nflCount, cfbCount, picks]);

  return {
    picks,
    setPicks,
    nflCount,
    cfbCount,
    togglePick,
    getPickForGame,
    canSubmit
  };
}
