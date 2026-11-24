import React from 'react';
import { Sparkles, Trophy, Crown, Gift } from 'lucide-react';
import { AVAILABLE_COSMETICS, ProfileBannerMap, AvatarRingMap } from '../../lib/cosmetics';
import { TitleMap } from '../ui/titles';

interface CampaignPrizeTeaserProps {
  cosmeticId?: string;
  cosmeticName?: string;
  variant?: 'banner' | 'card' | 'compact';
  className?: string;
}

export function CampaignPrizeTeaser({
  cosmeticId,
  cosmeticName,
  variant = 'card',
  className = ''
}: CampaignPrizeTeaserProps) {
  if (!cosmeticId && !cosmeticName) return null;

  const found = AVAILABLE_COSMETICS.find(c => c.id === cosmeticId || c.key === cosmeticId);
  const displayName = cosmeticName || found?.name || 'Exclusive Champion Cosmetic';
  const category = found?.category || (cosmeticId?.includes('ring') ? 'ring' : cosmeticId?.includes('title') ? 'title' : 'banner');
  const key = found?.key || cosmeticId || '';

  const BannerComp = category === 'banner' ? (ProfileBannerMap[key] || ProfileBannerMap[cosmeticId || '']) : null;
  const RingComp = category === 'ring' ? (AvatarRingMap[key] || AvatarRingMap[cosmeticId || '']) : null;
  const TitleComp = category === 'title' ? (TitleMap[key] || TitleMap[cosmeticId || '']) : null;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate">Prize: <strong className="text-white">{displayName}</strong></span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/20 p-4 shadow-lg ${className}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-md">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  1st Place Cosmetic Award
                </span>
                <span className="text-xs text-zinc-400">Exclusive Champion Prize</span>
              </div>
              <h4 className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
                {displayName}
              </h4>
            </div>
          </div>

          <div className="w-full sm:w-64 h-16 rounded-lg overflow-hidden border border-amber-500/30 shadow-inner bg-black/60 relative flex items-center justify-center">
            {BannerComp ? (
              <div className="absolute inset-0 w-full h-full">
                {React.createElement(BannerComp, { isStatic: false })}
              </div>
            ) : RingComp ? (
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 transform scale-[1.2]">
                  {React.createElement(RingComp, { isStatic: false })}
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-black/50" />
              </div>
            ) : TitleComp ? (
              <div className="transform scale-90">
                {React.createElement(TitleComp, { isStatic: false })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Gift className="w-4 h-4 text-amber-400" />
                <span>{displayName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default 'card' variant
  return (
    <div className={`bg-gradient-to-b from-amber-500/10 via-[#18181A] to-[#121212] border border-amber-500/30 rounded-xl p-4 shadow-xl overflow-hidden relative ${className}`}>
      <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2.5">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" /> 1st Place Cosmetic Prize
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">
          Exclusive Reward
        </span>
      </div>

      <div className="space-y-3">
        <div className="h-20 sm:h-24 w-full rounded-lg overflow-hidden border border-amber-500/30 shadow-inner bg-black/80 relative flex items-center justify-center">
          {BannerComp ? (
            <div className="absolute inset-0 w-full h-full">
              {React.createElement(BannerComp, { isStatic: false })}
            </div>
          ) : RingComp ? (
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 transform scale-[1.25]">
                {React.createElement(RingComp, { isStatic: false })}
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-black/50" />
            </div>
          ) : TitleComp ? (
            <div className="transform scale-95">
              {React.createElement(TitleComp, { isStatic: false })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>{displayName}</span>
            </div>
          )}
        </div>

        <div>
          <h5 className="text-white font-bold text-sm tracking-tight">{displayName}</h5>
          <p className="text-xs text-zinc-400 mt-0.5">
            Awarded automatically to the 1st place champion when campaign payouts finalize.
          </p>
        </div>
      </div>
    </div>
  );
}
