import { useState, useMemo, useEffect } from 'react';
import { GridironPick, Gridiron3x3Game } from '../types/gridiron';

export function useGridironDraft(
  initialPicks: GridironPick[] = [],
  requiredNfl: number = 3,
  requiredCfb: number = 3,
  onPickChange?: (updatedPicks: GridironPick[]) => void
) {
  const [picks, setPicks] = useState<GridironPick[]>(initialPicks || []);

  const initialKey = useMemo(() => {
    return (initialPicks || []).map(p => `${p.gameId}_${p.selection}_${p.value}`).sort().join('|');
  }, [initialPicks]);

  useEffect(() => {
    setPicks(initialPicks || []);
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

    let nextPicks: GridironPick[] | null = null;

    const existingIdx = picks.findIndex(p => p.gameId === game.gameId);

    if (existingIdx >= 0) {
      const existing = picks[existingIdx];
      // If clicking the exact same option => deselect it
      if (existing.selection === selection) {
        nextPicks = picks.filter(p => p.gameId !== game.gameId);
      } else {
        // Replacing selection on the same game (mutual exclusion)
        const updated = [...picks];
        updated[existingIdx] = {
          gameId: game.gameId,
          league: game.league,
          pickType,
          selection,
          value,
          kickoffTime: game.kickoffTime,
          status: "pending"
        };
        nextPicks = updated;
      }
    } else {
      // Enforce max picks per league based on required split
      const currentLeagueCount = picks.filter(p => p.league === game.league).length;
      const maxAllowed = game.league === "NFL" ? requiredNfl : requiredCfb;
      if (currentLeagueCount < maxAllowed) {
        nextPicks = [
          ...picks,
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

    if (nextPicks !== null) {
      setPicks(nextPicks);
      if (onPickChange) {
        onPickChange(nextPicks);
      }
    }
  };

  const getPickForGame = (gameId: string): GridironPick | undefined => {
    return picks.find(p => p.gameId === gameId);
  };

  const isComplete = useMemo(() => {
    return nflCount === requiredNfl && cfbCount === requiredCfb && picks.length === 6;
  }, [nflCount, cfbCount, requiredNfl, requiredCfb, picks]);

  const canSubmit = useMemo(() => {
    return picks.length >= 0 && nflCount <= requiredNfl && cfbCount <= requiredCfb;
  }, [nflCount, cfbCount, requiredNfl, requiredCfb, picks]);

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
