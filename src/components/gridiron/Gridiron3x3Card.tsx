import React from 'react';
import { Gridiron3x3Game, GridironPick } from '../../types/gridiron';
import { Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Gridiron3x3CardProps {
  game: Gridiron3x3Game;
  activePick?: GridironPick;
  onTogglePick: (
    game: Gridiron3x3Game,
    pickType: "spread" | "total",
    selection: "away_spread" | "home_spread" | "over" | "under",
    value: number
  ) => void;
}

export const Gridiron3x3Card: React.FC<Gridiron3x3CardProps> = ({
  game,
  activePick,
  onTogglePick
}) => {
  const now = Date.now();
  const kickoffMs = typeof game.kickoffTime === 'number'
    ? game.kickoffTime
    : (game.kickoffTime?.toMillis ? game.kickoffTime.toMillis() : new Date(game.kickoffTime).getTime());

  const isLocked = now >= kickoffMs;

  const awaySpreadFormatted = game.spread.awaySpread > 0 ? `+${game.spread.awaySpread}` : `${game.spread.awaySpread}`;
  const homeSpreadFormatted = game.spread.homeSpread > 0 ? `+${game.spread.homeSpread}` : `${game.spread.homeSpread}`;

  const kickoffDateStr = new Date(kickoffMs).toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const activeSelection = activePick?.selection;
  const hasPick = !!activeSelection;

  // Helper function to check button interactive / disabled states
  const getButtonState = (selectionKey: "away_spread" | "home_spread" | "over" | "under") => {
    const isSelected = activeSelection === selectionKey;
    // If card has a pick and this button is NOT the selected one, disable it (mutual exclusion)
    const isExcluded = hasPick && !isSelected;

    return {
      isSelected,
      isDisabled: isLocked || isExcluded,
      isExcluded
    };
  };

  const awaySpreadState = getButtonState("away_spread");
  const homeSpreadState = getButtonState("home_spread");
  const overState = getButtonState("over");
  const underState = getButtonState("under");

  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-xl p-4 shadow-md transition-all hover:border-[#3f3f46] relative overflow-hidden">
      {/* Top Banner: League & Kickoff Lock Time */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#27272a] text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase",
            game.league === "NFL" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          )}>
            {game.league}
          </span>
          <span className="text-zinc-400 font-mono">{kickoffDateStr}</span>
        </div>

        {isLocked && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Locked</span>
          </div>
        )}
      </div>

      {/* 3-Column Action Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Column 1: Teams */}
        <div className="flex flex-col gap-2.5 pr-2 md:border-r md:border-[#27272a]">
          {/* Away Team */}
          <div className="flex items-center gap-2.5">
            {game.awayTeam.logoUrl ? (
              <img src={game.awayTeam.logoUrl} alt={game.awayTeam.name} className="w-6 h-6 object-contain shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                {game.awayTeam.abbreviation.slice(0, 2)}
              </div>
            )}
            <span className="text-sm font-semibold text-zinc-100 truncate">{game.awayTeam.name}</span>
          </div>

          {/* Home Team */}
          <div className="flex items-center gap-2.5">
            {game.homeTeam.logoUrl ? (
              <img src={game.homeTeam.logoUrl} alt={game.homeTeam.name} className="w-6 h-6 object-contain shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                {game.homeTeam.abbreviation.slice(0, 2)}
              </div>
            )}
            <span className="text-sm font-semibold text-zinc-100 truncate">{game.homeTeam.name}</span>
          </div>
        </div>

        {/* Column 2: Point Spread Buttons */}
        <div className="flex flex-col gap-2 md:border-r md:border-[#27272a] md:pr-2">
          {/* Away Spread */}
          <button
            type="button"
            disabled={awaySpreadState.isDisabled}
            onClick={() => onTogglePick(game, "spread", "away_spread", game.spread.awaySpread)}
            className={cn(
              "w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all",
              awaySpreadState.isSelected
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                : "bg-zinc-900/80 border-[#27272a] text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700",
              awaySpreadState.isExcluded && "opacity-30 pointer-events-none cursor-not-allowed border-zinc-800",
              isLocked && "cursor-not-allowed opacity-60"
            )}
          >
            <span className="text-zinc-400 font-medium">{game.awayTeam.abbreviation}</span>
            <span className="font-bold">{awaySpreadFormatted}</span>
          </button>

          {/* Home Spread */}
          <button
            type="button"
            disabled={homeSpreadState.isDisabled}
            onClick={() => onTogglePick(game, "spread", "home_spread", game.spread.homeSpread)}
            className={cn(
              "w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all",
              homeSpreadState.isSelected
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                : "bg-zinc-900/80 border-[#27272a] text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700",
              homeSpreadState.isExcluded && "opacity-30 pointer-events-none cursor-not-allowed border-zinc-800",
              isLocked && "cursor-not-allowed opacity-60"
            )}
          >
            <span className="text-zinc-400 font-medium">{game.homeTeam.abbreviation}</span>
            <span className="font-bold">{homeSpreadFormatted}</span>
          </button>
        </div>

        {/* Column 3: Total Over/Under Buttons */}
        <div className="flex flex-col gap-2">
          {/* Over */}
          <button
            type="button"
            disabled={overState.isDisabled}
            onClick={() => onTogglePick(game, "total", "over", game.total.line)}
            className={cn(
              "w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all",
              overState.isSelected
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                : "bg-zinc-900/80 border-[#27272a] text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700",
              overState.isExcluded && "opacity-30 pointer-events-none cursor-not-allowed border-zinc-800",
              isLocked && "cursor-not-allowed opacity-60"
            )}
          >
            <span className="text-zinc-400 font-medium">Over</span>
            <span className="font-bold">O {game.total.line}</span>
          </button>

          {/* Under */}
          <button
            type="button"
            disabled={underState.isDisabled}
            onClick={() => onTogglePick(game, "total", "under", game.total.line)}
            className={cn(
              "w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all",
              underState.isSelected
                ? "bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                : "bg-zinc-900/80 border-[#27272a] text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700",
              underState.isExcluded && "opacity-30 pointer-events-none cursor-not-allowed border-zinc-800",
              isLocked && "cursor-not-allowed opacity-60"
            )}
          >
            <span className="text-zinc-400 font-medium">Under</span>
            <span className="font-bold">U {game.total.line}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
