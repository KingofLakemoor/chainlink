import { FirebaseImage } from "../ui/FirebaseImage";
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Link2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface DashboardPickProps {
  activePick: any;
  activeMatchup: any;
  sponsors?: any[];
}

export const DashboardPick = React.memo(function DashboardPick({ activePick, activeMatchup, sponsors = [] }: DashboardPickProps) {
  let featuredColor = "";
  let featuredName = "Featured Sponsor";
  let glowStyle = {};
  let currentSponsor: any = null;

  if (activeMatchup?.featured) {
      if (activeMatchup.featuredType === 'ChainBuilder') {
          featuredColor = "#25D55F";
          featuredName = "Chain Builder";
      } else {
          currentSponsor = sponsors.find((s: any) => s.id === activeMatchup.featuredType);
          featuredColor = currentSponsor?.color || "#06b6d4";
          featuredName = currentSponsor?.name || "Featured Sponsor";
      }
      glowStyle = {
          boxShadow: `0 0 0 2px ${featuredColor}, 0 0 15px ${featuredColor}4d`,
          borderColor: featuredColor
      };
  }

  const renderFeaturedTag = () => {
      if (!activeMatchup?.featured) return null;

      const content = (
          <>
              {currentSponsor?.image && (
                  <FirebaseImage src={currentSponsor.image} fallback="/logo.png" alt={featuredName} className="h-5 w-5 rounded object-contain" loading="lazy" />
              )}
              <span>{featuredName}</span>
          </>
      );

      const TagType = currentSponsor?.url ? 'a' : 'span';
      const tagProps = currentSponsor?.url ? { href: currentSponsor.url.startsWith('http') ? currentSponsor.url : `https://${currentSponsor.url}`, target: '_blank', rel: 'noopener noreferrer' } : {};

      return (
          <TagType
              {...tagProps}
              className="ml-2 pl-1 pr-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              style={{ backgroundColor: `${featuredColor}33`, color: featuredColor }}
          >
              {content}
          </TagType>
      );
  };

  return (
    <div className={cn("bg-[#121212] border border-zinc-800 rounded-2xl p-6 h-full transition-colors relative group", activeMatchup?.featured && "border-transparent")} style={glowStyle}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-cyan-400" /> My Active Pick
        </h2>
        <Link to="/play" className="text-sm text-cyan-500 hover:text-cyan-400 font-medium flex items-center gap-1">
          View Games <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {activeMatchup ? (
        <div className="bg-[#112316] rounded-xl border border-[#27272a] overflow-hidden bg-gradient-to-r from-[#0f2c16] to-[#121212]">
          <div className="p-5 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{activeMatchup.league}</span>
                {renderFeaturedTag()}
            </div>
            <div className="text-lg font-bold text-zinc-100 mb-6">
              {activeMatchup.type === 'SOCCER_SCORE' ? `${activeMatchup.awayTeam.name} @ ${activeMatchup.homeTeam.name}` : activeMatchup.title}
            </div>

            <div className="flex items-center justify-center gap-8 w-full">
              <div className={cn("flex flex-col items-center gap-3 p-4 rounded-xl border relative", activePick?.pick?.id === (activeMatchup.type === 'OVER_UNDER' ? 'OVER' : activeMatchup.awayTeam.id) ? 'border-green-500 bg-green-500/10' : 'border-zinc-800 opacity-50')}>
                <FirebaseImage src={activeMatchup.type === 'OVER_UNDER' ? '/images/over.png' : activeMatchup.awayTeam.image} fallback="/logo.png" className="w-16 h-16 object-contain" alt={activeMatchup.type === 'OVER_UNDER' ? 'OVER' : activeMatchup.awayTeam.name} loading="lazy" />
                <span className="text-sm font-bold text-zinc-200">{activeMatchup.type === 'OVER_UNDER' ? 'OVER' : activeMatchup.awayTeam.name}</span>
                {activePick?.pick?.id === (activeMatchup.type === 'OVER_UNDER' ? 'OVER' : activeMatchup.awayTeam.id) && <span className="text-xs bg-green-500 text-green-950 px-2 py-0.5 rounded font-bold mt-1">YOUR PICK</span>}
                {activeMatchup.type === 'SPREAD' && activeMatchup.metadata?.spread !== undefined && (
                   <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm">
                     {activeMatchup.metadata.spread > 0 ? `-${activeMatchup.metadata.spread}` : `+${Math.abs(activeMatchup.metadata.spread)}`}
                   </div>
                 )}
                 {activeMatchup.type === 'SOCCER_SCORE' && (() => {
                   const type = activeMatchup.metadata?.awayScoreType || 'WIN_BY';
                   const val = activeMatchup.metadata?.awayScoreValue;
                   const hasVal = val !== undefined && val !== null && val !== '';
                   return (
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm whitespace-nowrap z-10">
                       {type === 'WIN_BY' ? (hasVal ? `Win by ${val}+` : 'Win') : (hasVal ? `W/D/Lose by ${val}` : 'W/D/Lose')}
                     </div>
                   );
                 })()}
              </div>
              <div className="text-zinc-500 font-bold text-xl">VS</div>
              <div className={cn("flex flex-col items-center gap-3 p-4 rounded-xl border relative", activePick?.pick?.id === (activeMatchup.type === 'OVER_UNDER' ? 'UNDER' : activeMatchup.homeTeam.id) ? 'border-green-500 bg-green-500/10' : 'border-zinc-800 opacity-50')}>
                <FirebaseImage src={activeMatchup.type === 'OVER_UNDER' ? '/images/under.png' : activeMatchup.homeTeam.image} fallback="/logo.png" className="w-16 h-16 object-contain" alt={activeMatchup.type === 'OVER_UNDER' ? 'UNDER' : activeMatchup.homeTeam.name} loading="lazy" />
                <span className="text-sm font-bold text-zinc-200">{activeMatchup.type === 'OVER_UNDER' ? 'UNDER' : activeMatchup.homeTeam.name}</span>
                {activePick?.pick?.id === (activeMatchup.type === 'OVER_UNDER' ? 'UNDER' : activeMatchup.homeTeam.id) && <span className="text-xs bg-green-500 text-green-950 px-2 py-0.5 rounded font-bold mt-1">YOUR PICK</span>}
                {activeMatchup.type === 'SPREAD' && activeMatchup.metadata?.spread !== undefined && (
                   <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm">
                     {activeMatchup.metadata.spread > 0 ? `+${activeMatchup.metadata.spread}` : `-${Math.abs(activeMatchup.metadata.spread)}`}
                   </div>
                 )}
                 {activeMatchup.type === 'SOCCER_SCORE' && (() => {
                   const type = activeMatchup.metadata?.homeScoreType || 'WIN_DRAW_LOSE';
                   const val = activeMatchup.metadata?.homeScoreValue;
                   const hasVal = val !== undefined && val !== null && val !== '';
                   return (
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm whitespace-nowrap z-10">
                       {type === 'WIN_BY' ? (hasVal ? `Win by ${val}+` : 'Win') : (hasVal ? `W/D/Lose by ${val}` : 'W/D/Lose')}
                     </div>
                   );
                 })()}
              </div>
            </div>
          </div>
          <div className="bg-[#111111] px-5 py-3 border-t border-[#27272a] flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-medium">{activeMatchup.status === 'STATUS_SCHEDULED' ? 'Upcoming' : 'In Progress'}</span>
            <span className="text-zinc-300 flex items-center gap-1 font-medium">Reward: <Link2 className="w-4 h-4 text-cyan-400" /> <span className="text-cyan-400 font-bold">{activeMatchup.reward ?? 10}</span></span>
          </div>
          {activeMatchup.featured && activeMatchup.featuredType !== 'ChainBuilder' && currentSponsor && (
             <div className="px-5 py-4 border-t border-[#27272a] bg-[#0f0f11] flex items-center justify-center">
                <a href={currentSponsor.url ? (currentSponsor.url.startsWith('http') ? currentSponsor.url : `https://${currentSponsor.url}`) : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                   {currentSponsor.image ? (
                     <div className="text-sm font-medium text-zinc-300 flex items-center gap-3">
                         <FirebaseImage src={currentSponsor.image} fallback="/logo.png" alt={currentSponsor.name} className="h-6 object-contain" loading="lazy" />
                         {currentSponsor.description || "Your Brand & Link Here"}
                     </div>
                   ) : (
                     <div className="text-sm font-medium text-zinc-300">{currentSponsor.description || "Your Brand & Link Here"}</div>
                   )}
                   <div className="bg-white text-black font-bold text-xs py-1.5 px-3 rounded-full flex items-center shadow-lg hover:bg-zinc-200 transition-colors">
                     Click Me
                   </div>
                </a>
             </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-[#18181a] rounded-xl border border-zinc-800 border-dashed">
          <Link2 className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 mb-4 font-medium">You don't have an active pick right now.</p>
          <Link to="/play">
            <Button className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              Make a Pick
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
});

export function DashboardPickSkeleton() {
  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 h-full animate-pulse flex flex-col">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-zinc-800 rounded-md" />
          <div className="h-5 w-32 bg-zinc-800 rounded-md" />
        </div>
        <div className="h-4 w-24 bg-zinc-800 rounded-md" />
      </div>

      {/* Main Content Skeleton */}
      <div className="bg-[#112316] rounded-xl border border-[#27272a] overflow-hidden bg-gradient-to-r from-[#0f2c16] to-[#121212] flex-1 flex flex-col">
        <div className="p-5 flex flex-col items-center text-center flex-1 justify-center">
          <div className="h-3 w-16 bg-zinc-800 rounded-full mb-4" />
          <div className="h-6 w-3/4 bg-zinc-800 rounded-md mb-8" />

          <div className="flex items-center justify-center gap-8 w-full">
            {/* Team 1 */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-800">
              <div className="w-16 h-16 bg-zinc-800 rounded-lg" />
              <div className="h-4 w-20 bg-zinc-800 rounded-md" />
            </div>

            <div className="text-zinc-800 font-bold text-xl">VS</div>

            {/* Team 2 */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-800">
              <div className="w-16 h-16 bg-zinc-800 rounded-lg" />
              <div className="h-4 w-20 bg-zinc-800 rounded-md" />
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="bg-[#111111] px-5 py-3 border-t border-[#27272a] flex justify-between items-center">
          <div className="h-4 w-20 bg-zinc-800 rounded-md" />
          <div className="h-4 w-24 bg-zinc-800 rounded-md" />
        </div>
      </div>
    </div>
  );
}
