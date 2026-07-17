import React from 'react';
import { Trophy, Check, X, Link2 } from 'lucide-react';
import { cn, formatUpcomingTime } from '../../lib/utils';
import { FirebaseImage } from './FirebaseImage';

interface BracketMatchupCardProps {
  matchId: string;
  round: number;
  team1Slot: any;
  team2Slot: any;
  matchResult: string | null;
  selectedTeam: string | null;
  formattedTime: string | null;
  locked: boolean;
  primaryColor: string;
  onSelect: (matchId: string, team: string, locked: boolean) => void;
  liveMatchup?: any; // The live matchup data from ESPN scraper (from matchups collection)
}

export const BracketMatchupCard = React.memo(function BracketMatchupCard({
  matchId,
  round,
  team1Slot,
  team2Slot,
  matchResult,
  selectedTeam,
  formattedTime,
  locked,
  primaryColor,
  onSelect,
  liveMatchup
}: BracketMatchupCardProps) {

  const renderButton = (slot: any, isTop: boolean) => {
    const { display, predicted, predictedWrong } = slot;

    // Use liveMatchup data if available
    let teamName = display;
    let liveScore = null;
    let teamLogo = null;

    if (liveMatchup && teamName) {
      if (liveMatchup.homeTeam && liveMatchup.homeTeam.name === teamName) {
          teamLogo = liveMatchup.homeTeam.image;
          liveScore = liveMatchup.homeTeam.score;
      } else if (liveMatchup.awayTeam && liveMatchup.awayTeam.name === teamName) {
          teamLogo = liveMatchup.awayTeam.image;
          liveScore = liveMatchup.awayTeam.score;
      }
    }

    const isSelected = selectedTeam && selectedTeam === teamName;
    const isEliminatedHere = matchResult && teamName && matchResult !== teamName;
    const isPickWrongHere = isEliminatedHere && isSelected;
    const isPickCorrectHere = matchResult && teamName && matchResult === teamName && isSelected;

    return (
      <button
        onClick={() => teamName && onSelect(matchId, teamName, locked)}
        disabled={!teamName || locked}
        className={cn(
          "px-2 py-1.5 text-left hover:bg-zinc-800 transition-colors relative flex flex-col justify-center min-h-[40px] w-full",
          isTop ? "border-b border-[#27272a]" : "",
          isSelected ? "bg-zinc-800 font-bold" : "text-zinc-300",
          (!teamName || locked) && "cursor-not-allowed"
        )}
        style={isSelected && !isPickWrongHere ? { color: primaryColor } : undefined}
        title={teamName || 'TBD'}
      >
        {predictedWrong && predicted && (
          <span className="text-[10px] text-red-500 line-through leading-none mb-0.5 opacity-80 truncate w-full block">
            {predicted}
          </span>
        )}
        <div className="flex justify-between items-center w-full gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
             {teamLogo && (
               <FirebaseImage src={teamLogo} fallback={liveMatchup?.league === 'SCRIPTLESS' ? '/images/scriptless.png' : undefined} fallbackIcon={liveMatchup?.league === 'SCRIPTLESS' ? undefined : <Link2 className="w-4 h-4 text-zinc-600" />} className="w-4 h-4 object-contain rounded-sm flex-shrink-0 flex items-center justify-center" />
             )}
             <span className={cn(
               "truncate block text-sm",
               !teamName ? "text-zinc-600" : "",
               isPickWrongHere ? "line-through text-red-500 opacity-80" : isEliminatedHere ? "line-through text-zinc-500" : ""
             )}>
               {teamName || 'TBD'}
             </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
             {liveScore !== null && liveScore !== undefined && !Number.isNaN(liveScore) && (
                 <span className={cn("text-xs font-mono", isEliminatedHere ? "text-zinc-600" : "text-zinc-300")}>{liveScore}</span>
             )}
             {isPickCorrectHere && <Check className="w-3.5 h-3.5 text-green-500" />}
             {isPickWrongHere && <X className="w-3.5 h-3.5 text-red-500" />}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={cn("flex flex-col mb-4 bg-[#131415] border border-[#27272a] hover:border-zinc-700 rounded-xl overflow-hidden w-[180px] shadow-sm transition-colors", locked && "opacity-80 hover:opacity-100")}>
      <div className="bg-[#112316] px-2 py-1.5 border-b border-[#27272a] flex justify-between items-center bg-gradient-to-r from-[#0f2c16] to-[#121212]">
         <div className="flex items-center gap-1.5 font-bold text-[10px] text-zinc-300 tracking-tight">
           <Trophy className="w-3 h-3 text-zinc-400" />
           {liveMatchup ? (liveMatchup.status === 'STATUS_SCHEDULED' ? formatUpcomingTime(liveMatchup.startTime) : liveMatchup.statusDesc) : formattedTime || "TBD"}
         </div>
         {matchResult && <span className="text-[10px] font-black text-zinc-300 tracking-widest uppercase">Final</span>}
      </div>
      {renderButton(team1Slot, true)}
      {renderButton(team2Slot, false)}
    </div>
  );
});
