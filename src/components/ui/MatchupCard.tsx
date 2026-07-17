import React from 'react';
import { Trophy, Link2, X, Star } from 'lucide-react';
import { cn, formatUpcomingTime } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { FirebaseImage } from './FirebaseImage';
import { useAuth } from '../../lib/auth-context';

interface MatchupCardProps {
  m: any;
  user: any;
  pickData?: any;
  profile?: any;
  hasActivePickAnywhere: boolean | any[];
  mCounts?: { total: number; away: number; home: number };
  sponsors: any[];
  onMakePick: (matchup: any, team: any) => void;
  onCancelPick: (matchup: any) => void;
  onForfeitPick?: (matchup: any) => void;
  onShareMatchup: (gameId: string) => void;
  sharingMatchupId: string | null;
  isMyPick?: boolean;
  isLink4?: boolean;
}

export const MatchupCard = React.memo(function MatchupCard({
  m,
  user,
  pickData,
  profile,
  hasActivePickAnywhere,
  mCounts = { total: 0, away: 0, home: 0 },
  sponsors,
  onMakePick,
  onCancelPick,
  onForfeitPick,
  onShareMatchup,
  sharingMatchupId,
  isMyPick = false,
  isLink4 = false
}: MatchupCardProps) {
  const { profile: authProfile } = useAuth();
  const activeProfile = profile || authProfile;

  const hasPicked = !!pickData;
  const hasActivePicksArray = Array.isArray(hasActivePickAnywhere);
  const activePicksCount = hasActivePicksArray ? hasActivePickAnywhere.length : (hasActivePickAnywhere ? 1 : 0);

  const isPickDisabled = !user || hasPicked || activePicksCount >= (activeProfile?.premium ? 2 : 1);
  const isQueueState = !hasPicked && activeProfile?.premium && activePicksCount === 1;
  const awayHotPct = mCounts.total > 0 ? Math.round(((mCounts.away || 0) / mCounts.total) * 100) : 0;
  const homeHotPct = mCounts.total > 0 ? Math.round(((mCounts.home || 0) / mCounts.total) * 100) : 0;
  const isScheduled = m.status === 'STATUS_SCHEDULED' && (!m.metadata?.homeLinescores || m.metadata?.homeLinescores.length === 0) && (!m.metadata?.awayLinescores || m.metadata?.awayLinescores.length === 0) && (m.homeTeam.score === 0 && m.awayTeam.score === 0);

  const hasMoneyline = m.metadata?.mlAway !== undefined && m.metadata?.mlHome !== undefined && m.metadata?.mlAway !== null && m.metadata?.mlHome !== null;
  const isAwayFavorite = hasMoneyline
    ? m.metadata.mlAway < m.metadata.mlHome
    : (m.metadata?.spread !== undefined ? m.metadata.spread > 0 : false);
  const isHomeFavorite = hasMoneyline
    ? m.metadata.mlHome < m.metadata.mlAway
    : (m.metadata?.spread !== undefined ? m.metadata.spread < 0 : false);

  let featuredColor = "";
  let featuredName = "Featured Sponsor";
  let featuredSponsorObj: any = null;
  let glowStyle = {};
  if (m.featured) {
      if (m.featuredType === 'ChainBuilder') {
          featuredColor = "#25D55F";
          featuredName = "Chain Builder";
      } else {
          const sponsor = sponsors.find(s => s.id === m.featuredType);
          featuredSponsorObj = sponsor;
          featuredColor = sponsor?.color || "#06b6d4";
          featuredName = sponsor?.name || "Featured Sponsor";
      }
      glowStyle = {
          boxShadow: `0 0 0 2px ${featuredColor}, 0 0 15px ${featuredColor}4d`,
          borderColor: featuredColor
      };
  }

  const renderFeaturedTag = () => {
      if (!m.featured) return null;

      const content = (
          <>
              {featuredSponsorObj?.image && (
                  <FirebaseImage src={featuredSponsorObj.image} fallback="/logo.png" alt={featuredName} className="h-5 w-5 rounded object-contain" />
              )}
              <span>{featuredName}</span>
          </>
      );

      const TagType = featuredSponsorObj?.url ? 'a' : 'span';
      const tagProps = featuredSponsorObj?.url ? { href: featuredSponsorObj.url.startsWith('http') ? featuredSponsorObj.url : `https://${featuredSponsorObj.url}`, target: '_blank', rel: 'noopener noreferrer' } : {};

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
    <div id={`matchup-card-${m.gameId}`} key={isMyPick ? `my-pick-${m.gameId}` : m.gameId} className={cn("bg-[#131415] border border-[#27272a] hover:border-zinc-700 rounded-xl overflow-hidden transition-colors relative group")} style={glowStyle}>
      {/* Header info */}
      <div className="bg-[#112316] px-4 py-2 border-b border-[#27272a] flex justify-between items-center bg-gradient-to-r from-[#0f2c16] to-[#121212]">
        <div className="flex items-center gap-2 font-bold text-sm text-zinc-200 tracking-tight">
           <Trophy className="w-3.5 h-3.5" /> {m.league}
           {renderFeaturedTag()}
        </div>
        <div className="flex flex-col items-end">
          {m.status !== 'STATUS_SCHEDULED' && m.statusDesc !== 'Upcoming' && <span className="text-[10px] text-zinc-500 uppercase">last update:</span>}
          <span className="text-xs text-zinc-300 font-medium">
            {m.status === 'STATUS_SCHEDULED' ? formatUpcomingTime(m.startTime) : (m.statusDesc || 'Upcoming')}
          </span>
        </div>
      </div>

      {/* Matchup content */}
      <div className="p-3 sm:p-5">
        <div className="text-base font-bold text-zinc-100 mb-6">
          {m.type === 'SOCCER_SCORE' ? `${m.awayTeam.name} @ ${m.homeTeam.name}` : m.title}
        </div>

        <div className="flex items-center justify-between">
           <div className="flex flex-col items-center gap-2 sm:gap-3 w-[100px] sm:w-[140px]">
             <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate w-full text-center px-1">{m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.name}</span>
             <div className="relative">
               <button
                 disabled={isPickDisabled && !isQueueState}
                 onClick={() => (!isPickDisabled || isQueueState) && onMakePick(m, m.type === 'OVER_UNDER' ? { id: 'OVER', name: 'OVER', image: '/images/over.png' } : m.awayTeam)}
                 className={cn("w-20 h-20 sm:w-28 sm:h-28 rounded-xl border flex items-center justify-center p-1.5 bg-[#1a1a1a] transition-all", pickData?.pick?.id === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]' : (!isPickDisabled ? 'border-[#3f3f46] hover:border-[#22c55e] cursor-pointer' : (isQueueState ? 'border-[#3f3f46] opacity-80 cursor-pointer' : 'border-[#3f3f46] cursor-default opacity-50')))}
               >
                  <FirebaseImage fallback={m.league === 'SCRIPTLESS' ? '/images/scriptless.png' : undefined} fallbackIcon={m.league === 'SCRIPTLESS' ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === 'OVER_UNDER' ? '/images/over.png' : m.awayTeam.image} className="w-full h-full object-contain drop-shadow-md flex items-center justify-center" alt={m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.name} />
               </button>
               {pickData?.pick?.id === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) && (
                 <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center shadow-lg z-10">
                   <Link2 className="w-3 h-3 text-zinc-950 stroke-[3]" />
                 </div>
               )}
               {activeProfile?.premium && isAwayFavorite && m.type !== 'OVER_UNDER' && (
                 <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-lg border border-[#131415] z-10" title="Betting Favorite">
                   <Star className="w-3 h-3 text-white fill-current" />
                 </div>
               )}
               {m.type === 'SPREAD' && m.metadata?.spread !== undefined && (
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm">
                   {m.metadata.spread > 0 ? `-${m.metadata.spread}` : `+${Math.abs(m.metadata.spread)}`}
                 </div>
               )}
               {isLink4 && m.metadata?.mlAway !== undefined && m.metadata?.mlAway !== null && (
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm">
                   {isNaN(m.metadata.mlAway) ? 0 : (m.metadata.mlAway > 0 ? `+${m.metadata.mlAway}` : m.metadata.mlAway)}
                 </div>
               )}
               {m.type === 'SOCCER_SCORE' && !isLink4 && (() => {
                 const type = m.metadata?.awayScoreType || 'WIN_BY';
                 const val = m.metadata?.awayScoreValue;
                 const hasVal = val !== undefined && val !== null && val !== '';
                 return (
                   <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm whitespace-nowrap z-10">
                     {type === 'WIN_BY' ? (hasVal ? `Win by ${val}+` : 'Win') : (hasVal ? `W/D/Lose by ${val}` : 'W/D/Lose')}
                   </div>
                 );
               })()}
             </div>
           </div>

           <div className="flex items-center gap-2">
              {isScheduled ? (
                <div className="flex items-center justify-center gap-2 w-[100px] sm:w-[140px]">
                  <div className="flex-1 flex justify-end">
                     <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex justify-end">
                       <div className="h-full bg-blue-500 rounded-full" style={{ width: `${awayHotPct}%` }}></div>
                     </div>
                  </div>
                  <div className="flex-1 flex justify-start">
                     <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 rounded-full" style={{ width: `${homeHotPct}%` }}></div>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center gap-1.5 w-auto min-w-[3rem] sm:min-w-[4rem]">
                    <div className={cn("w-full h-10 px-1 sm:px-2 rounded flex items-center justify-center font-mono font-bold text-sm sm:text-lg shadow-inner relative overflow-hidden gap-1 sm:gap-2",
                      m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                      (m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                    )}>
                       {(m.metadata?.lowerScoreWins ? m.awayTeam.score < m.homeTeam.score : m.awayTeam.score > m.homeTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                       {(m.league === 'ATP' || m.league === 'WTA') && m.metadata?.awayLinescores && m.metadata.awayLinescores.length > 0 ? (
                         m.metadata.awayLinescores.map((score: number, i: number) => (
                           <React.Fragment key={i}>
                             {i > 0 && <div className="w-px h-3 sm:h-4 bg-zinc-600 mx-0.5 sm:mx-1"></div>}
                             <span>{isNaN(Number(score)) ? 0 : score}</span>
                           </React.Fragment>
                         ))
                       ) : (
                         (typeof m.awayTeam.score === "number" && !isNaN(m.awayTeam.score) ? m.awayTeam.score : 0)
                       )}
                    </div>

                    {/* Away Hot Bar */}
                    {mCounts.total > 0 && (
                      <div className="w-full flex flex-col items-center relative -mt-0.5">
                        <div className="w-10 sm:w-12 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden flex justify-end shadow-sm">
                           <div className={cn("h-full rounded-full transition-all duration-500", awayHotPct >= 50 ? "bg-gradient-to-l from-red-500 to-red-500" : "bg-zinc-700")} style={{ width: `${awayHotPct}%` }}></div>
                        </div>
                        {awayHotPct >= 50 && (
                           <div className="absolute top-2 w-full flex justify-center">
                             <div className="text-[10px] font-bold text-red-500 flex items-center justify-center tracking-wider gap-0.5 drop-shadow-md">Hot <span className="text-xs">🔥</span></div>
                           </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-start min-w-[40px] pt-1">
                    {m.status === 'STATUS_IN_PROGRESS' && (
                      <>
                        <span className="relative flex h-2.5 w-2.5 mb-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        { (m.league === 'ATP' || m.league === 'WTA') && m.statusDesc ? (
                          <span className="text-[9px] font-bold text-red-500 tracking-wider whitespace-nowrap">{m.statusDesc.toUpperCase()}</span>
                        ) : (
                          <span className="text-[9px] font-bold text-red-500 tracking-wider">LIVE</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1.5 w-auto min-w-[3rem] sm:min-w-[4rem]">
                    <div className={cn("w-full h-10 px-1 sm:px-2 rounded flex items-center justify-center font-mono font-bold text-sm sm:text-lg shadow-inner relative overflow-hidden gap-1 sm:gap-2",
                      m.status === 'STATUS_IN_PROGRESS' ? "bg-[#27272a] text-white ring-1 ring-zinc-700" : "bg-[#1a1a1a]",
                      (m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) ? "text-zinc-100" : (m.status === 'STATUS_IN_PROGRESS' ? "text-zinc-200" : "text-zinc-500")
                    )}>
                       {(m.metadata?.lowerScoreWins ? m.homeTeam.score < m.awayTeam.score : m.homeTeam.score > m.awayTeam.score) && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-300"></div>}
                       {(m.league === 'ATP' || m.league === 'WTA') && m.metadata?.homeLinescores && m.metadata.homeLinescores.length > 0 ? (
                         m.metadata.homeLinescores.map((score: number, i: number) => (
                           <React.Fragment key={i}>
                             {i > 0 && <div className="w-px h-3 sm:h-4 bg-zinc-600 mx-0.5 sm:mx-1"></div>}
                             <span>{isNaN(Number(score)) ? 0 : score}</span>
                           </React.Fragment>
                         ))
                       ) : (
                         (typeof m.homeTeam.score === "number" && !isNaN(m.homeTeam.score) ? m.homeTeam.score : 0)
                       )}
                    </div>

                    {/* Home Hot Bar */}
                    {mCounts.total > 0 && (
                      <div className="w-full flex flex-col items-center relative -mt-0.5">
                        <div className="w-10 sm:w-12 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden flex justify-start shadow-sm">
                           <div className={cn("h-full rounded-full transition-all duration-500", homeHotPct >= 50 ? "bg-gradient-to-r from-red-500 to-red-500" : "bg-zinc-700")} style={{ width: `${homeHotPct}%` }}></div>
                        </div>
                        {homeHotPct >= 50 && (
                           <div className="absolute top-2 w-full flex justify-center">
                              <div className="text-[10px] font-bold text-red-500 flex items-center justify-center tracking-wider gap-0.5 drop-shadow-md">Hot <span className="text-xs">🔥</span></div>
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
           </div>

           <div className="flex flex-col items-center gap-2 sm:gap-3 w-[100px] sm:w-[140px]">
             <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate w-full text-center px-1">{m.type === 'OVER_UNDER' ? 'UNDER' : `@${m.homeTeam.name}`}</span>
             <div className="relative">
               <button
                 disabled={isPickDisabled && !isQueueState}
                 onClick={() => (!isPickDisabled || isQueueState) && onMakePick(m, m.type === 'OVER_UNDER' ? { id: 'UNDER', name: 'UNDER', image: '/images/under.png' } : m.homeTeam)}
                 className={cn("w-20 h-20 sm:w-28 sm:h-28 rounded-xl border flex items-center justify-center p-1.5 bg-[#1a1a1a] transition-all", pickData?.pick?.id === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) ? 'border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]' : (!isPickDisabled ? 'border-[#3f3f46] hover:border-[#22c55e] cursor-pointer' : (isQueueState ? 'border-[#3f3f46] opacity-80 cursor-pointer' : 'border-[#3f3f46] cursor-default opacity-50')))}
               >
                  <FirebaseImage fallback={m.league === 'SCRIPTLESS' ? '/images/scriptless.png' : undefined} fallbackIcon={m.league === 'SCRIPTLESS' ? undefined : <Link2 className="w-10 h-10 text-zinc-600" />} src={m.type === 'OVER_UNDER' ? '/images/under.png' : m.homeTeam.image} className="w-full h-full object-contain drop-shadow-md flex items-center justify-center" alt={m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.name} />
               </button>
               {pickData?.pick?.id === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) && (
                 <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center shadow-lg z-10">
                   <Link2 className="w-3 h-3 text-zinc-950 stroke-[3]" />
                 </div>
               )}
               {activeProfile?.premium && isHomeFavorite && m.type !== 'OVER_UNDER' && (
                 <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-lg border border-[#131415] z-10" title="Betting Favorite">
                   <Star className="w-3 h-3 text-white fill-current" />
                 </div>
               )}
               {m.type === 'SPREAD' && m.metadata?.spread !== undefined && (
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm">
                   {m.metadata.spread > 0 ? `+${m.metadata.spread}` : `-${Math.abs(m.metadata.spread)}`}
                 </div>
               )}
               {isLink4 && m.metadata?.mlHome !== undefined && m.metadata?.mlHome !== null && (
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1f1f22] text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#3f3f46] shadow-sm">
                   {isNaN(m.metadata.mlHome) ? 0 : (m.metadata.mlHome > 0 ? `+${m.metadata.mlHome}` : m.metadata.mlHome)}
                 </div>
               )}
               {m.type === 'SOCCER_SCORE' && !isLink4 && (() => {
                 const type = m.metadata?.homeScoreType || 'WIN_DRAW_LOSE';
                 const val = m.metadata?.homeScoreValue;
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
      </div>

      {/* Footer */}
      {sharingMatchupId === m.gameId ? (
        <div className="px-5 py-3 border-t border-[#27272a] flex items-center justify-center bg-[#111111] h-[52px]">
          <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">ChainLink</span>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-[#27272a] flex items-center justify-between bg-[#111111] min-h-[52px]">
           <button onClick={() => onShareMatchup(m.gameId)} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1">
             <span className="text-[10px]">↓</span> Share Matchup
           </button>

           <div className="flex flex-col items-center">
             {m.cost > 0 && (
               <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                 Wager: <Link2 className="w-3.5 h-3.5 text-cyan-400 ml-0.5" /> <span className="text-cyan-400 font-mono tracking-wide">{m.cost}</span>
               </span>
             )}
             <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
               Reward: <Link2 className="w-3.5 h-3.5 text-cyan-400 ml-0.5" /> <span className="text-cyan-400 font-mono tracking-wide">{m.reward ?? 10}</span>
             </span>
           </div>

           {hasPicked ? (
              pickData?.pick?.id === m.awayTeam.id || pickData?.pick?.id === m.homeTeam.id || (m.type === 'OVER_UNDER' && (pickData?.pick?.id === 'OVER' || pickData?.pick?.id === 'UNDER')) ? (
                isScheduled || (m.league === 'PGA' && m.status === 'STATUS_IN_PROGRESS' && (m.statusDesc === 'In Progress' || m.statusDesc === 'Delayed')) ? (
                  <button onClick={() => onCancelPick(m)} className="text-xs font-bold text-red-500 uppercase tracking-wide flex items-center gap-1 hover:text-red-400">
                     <X className="w-3 h-3" /> Cancel
                  </button>
                ) : activeProfile?.premium && onForfeitPick && m.status !== 'STATUS_FINAL' && m.status !== 'STATUS_CANCELED' && m.status !== 'STATUS_POSTPONED' && !m.statusDesc?.toLowerCase().includes('final') ? (
                  <button onClick={() => onForfeitPick(m)} className="text-xs font-bold text-orange-500 uppercase tracking-wide flex items-center gap-1 hover:text-orange-400">
                     <X className="w-3 h-3" /> Forfeit
                  </button>
                ) : (
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
                )
              ) : (
                <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
              )
           ) : (
              !user ? (
                <Link to="/login" className="text-xs font-bold text-zinc-500 uppercase tracking-wide hover:text-zinc-300">Sign Up / Sign In</Link>
              ) : isQueueState ? (
                <span className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-wide border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(217,70,239,0.2)]">Queue Pick</span>
              ) : !isPickDisabled ? (
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">Select Team</span>
              ) : (
                <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Locked</span>
              )
           )}
        </div>
      )}
    </div>
  );
});
