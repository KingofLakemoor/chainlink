import React from 'react';
import { COSMETICS_CATALOG } from '../index';
import { CosmeticItem, PresentationContext } from '../types';

import { ProfileBannerMap } from '../componentsMap';

export interface Club602BannerProps {
  /** User object or profile document */
  user?: {
    displayName?: string;
    name?: string;
    profileBanner?: string;
    rosterBanner?: string;
    equippedCosmetics?: {
      PROFILE_BANNER?: string;
      ROSTER_BANNER?: string;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
  /** Explicit banner ID (overrides user data) */
  bannerId?: string;
  /** Type of banner to resolve from user cosmetics: 'PROFILE_BANNER' (default) or 'ROSTER_BANNER' */
  bannerType?: 'PROFILE_BANNER' | 'ROSTER_BANNER';
  /** Presentation context: 'micro' converts banner to a subtle accent line / border glow; 'card' optimizes height; 'hero' provides full bleed */
  presentationContext?: PresentationContext;
  /** Spoke context for spoke-specific cosmetic overrides */
  spokeId?: 'chainlink' | 'scriptless' | 'darts' | 'putting' | 'bingo' | 'flip' | 'core';
  /** Banner container height preset or custom className */
  height?: 'sm' | 'md' | 'lg' | 'auto';
  /** Additional custom class */
  className?: string;
  /** Children to render inside the banner (e.g. badges, overlay buttons) */
  children?: React.ReactNode;
  /** Whether dynamic canvas/shader banners render in static mode */
  isStatic?: boolean;
}

const HEIGHT_MAP = {
  sm: 'h-24 sm:h-28',
  md: 'h-32 sm:h-40',
  lg: 'h-48 sm:h-56',
  auto: 'h-full',
};

/**
 * Universal Club 602 Banner Component (Profile Banners & Matchup Roster Banners)
 * Handles CSS gradient classes, WebGL/Canvas shader components, image URLs, and fallback styles.
 * Presentation-aware: adapts rendering between dense micro cards, lineup cards, and hero profile banners.
 */
export const Club602Banner: React.FC<Club602BannerProps> = ({
  user,
  bannerId,
  bannerType = 'PROFILE_BANNER',
  presentationContext = 'hero',
  spokeId,
  height = 'md',
  className = '',
  children,
  isStatic = false
}) => {
  // If rendering in micro context (e.g. dense leaderboard or compact item pill), render minimal accent container
  const isMicro = presentationContext === 'micro';
  const forceStatic = isStatic || isMicro;
  const spokeOverrides = spokeId && user?.spokeCosmetics?.[spokeId];
  const chosenBannerId = bannerId || (
    bannerType === 'ROSTER_BANNER'
      ? (spokeOverrides?.ROSTER_BANNER || user?.equippedCosmetics?.ROSTER_BANNER || user?.rosterBanner)
      : (spokeOverrides?.PROFILE_BANNER || user?.equippedCosmetics?.PROFILE_BANNER || user?.profileBanner)
  );
  const cosmeticItem: CosmeticItem | undefined = chosenBannerId
    ? COSMETICS_CATALOG.find((c) => c.id === chosenBannerId)
    : undefined;

  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.md;

  // Check if there is a specialized Banner component (ChainLink WebGL shader, SVG canvas, etc.)
  const BannerComponent = chosenBannerId
    ? (ProfileBannerMap[chosenBannerId] || (cosmeticItem?.renderValue ? ProfileBannerMap[cosmeticItem.renderValue] : null))
    : null;

  // Determine background style
  let customStyle: React.CSSProperties = {};
  let bgClasses = 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950';

  if (!BannerComponent && cosmeticItem) {
    if (cosmeticItem.renderType === 'image') {
      if (cosmeticItem.renderValue.startsWith('http') || cosmeticItem.renderValue.startsWith('gs://') || cosmeticItem.renderValue.startsWith('/')) {
        // Resolve google storage URL or standard URL
        const imgUrl = cosmeticItem.renderValue.startsWith('gs://')
          ? cosmeticItem.renderValue.replace('gs://chainlink-2-72590.firebasestorage.app/', 'https://firebasestorage.googleapis.com/v0/b/chainlink-2-72590.firebasestorage.app/o/') + '?alt=media'
          : cosmeticItem.renderValue;
        customStyle = {
          backgroundImage: `url("${imgUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      } else {
        // Scriptless CSS class name like 'pb-traitors-base'
        bgClasses = cosmeticItem.renderValue;
      }
    } else if (cosmeticItem.renderType === 'css') {
      bgClasses = cosmeticItem.renderValue;
    } else if (cosmeticItem.renderType === 'component') {
      // Fallback CSS styling for component types if not found in ProfileBannerMap
      if (cosmeticItem.renderValue.toLowerCase().includes('inferno')) {
        bgClasses = 'bg-gradient-to-r from-amber-900 via-red-950 to-orange-900 border-b border-orange-500/30';
      } else if (cosmeticItem.renderValue.toLowerCase().includes('opulento')) {
        bgClasses = 'bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-950 border-b border-yellow-400/30';
      } else if (cosmeticItem.renderValue.toLowerCase().includes('novatrix') || cosmeticItem.renderValue.toLowerCase().includes('xenon')) {
        bgClasses = 'bg-gradient-to-r from-purple-950 via-indigo-950 to-blue-950 border-b border-indigo-500/30';
      } else {
        bgClasses = 'bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 border-b border-cyan-500/30';
      }
    }
  }

  const finalHeightClass = isMicro ? 'h-1.5' : heightClass;

  return (
    <div
      style={customStyle}
      className={`w-full relative overflow-hidden transition-all duration-300 ${finalHeightClass} ${bgClasses} ${className}`}
      title={cosmeticItem ? `${cosmeticItem.name} (${cosmeticItem.originSpoke})` : undefined}
    >
      {BannerComponent && !isMicro && (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {React.createElement(BannerComponent, { isStatic: forceStatic })}
        </div>
      )}
      {/* Subtle sheen highlight */}
      {!isMicro && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-[1]" />
      )}
      <div className="relative z-[2] w-full h-full">
        {children}
      </div>
    </div>
  );
};

