import React from 'react';
import { COSMETICS_CATALOG } from '../index';
import { getBadgeNode } from './badgeIcons';
import { PresentationContext } from '../types';

import { TitleMap } from '../componentsMap';

export interface Club602NameplateProps {
  user?: {
    displayName?: string;
    name?: string;
    username?: string;
    title?: string;
    badge?: string;
    nameGradient?: string;
    equippedCosmetics?: {
      TITLE?: string;
      BADGE?: string;
      NAME_GRADIENT?: string;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
  /** Custom fallback display name */
  fallbackName?: string;
  /** Spoke context for spoke-specific cosmetic overrides */
  spokeId?: 'chainlink' | 'scriptless' | 'darts' | 'putting' | 'bingo' | 'flip' | 'core';
  /** Presentation context: 'micro' (dense leaderboard/ticker: hides subtitle unless explicit), 'card', 'hero' */
  presentationContext?: PresentationContext;
  /** Size scale */
  size?: 'sm' | 'md' | 'lg';
  /** Show the subtitle/flair (defaults to false in 'micro' context, true in 'card' and 'hero') */
  showTitle?: boolean;
  /** Show the badge/icon next to the name */
  showBadge?: boolean;
  /** Extra class names */
  className?: string;
  nameClassName?: string;
  titleClassName?: string;
  /** Whether title renders in static mode */
  isStatic?: boolean;
}

/**
 * Universal Club 602 Nameplate Component
 * Renders the player's name with their equipped Name Gradient, Badge icon, and Title flair.
 * Supports both typography titles and custom animated/styled Title components.
 * Context-aware: cleanly suppresses subtitles in micro rows while preserving gradients and badges.
 */
export const Club602Nameplate: React.FC<Club602NameplateProps> = ({
  user,
  fallbackName = 'Player',
  spokeId,
  presentationContext = 'hero',
  size = 'md',
  showTitle,
  showBadge = true,
  className = '',
  nameClassName = '',
  titleClassName = '',
  isStatic = false
}) => {
  const isMicro = presentationContext === 'micro';
  const shouldShowTitle = showTitle !== undefined ? showTitle : !isMicro;
  const displayName = user?.username || user?.displayName || user?.name || fallbackName;

  const spokeOverrides = spokeId && user?.spokeCosmetics?.[spokeId];

  // Resolve equipped cosmetic keys with spoke overrides
  const gradientId = spokeOverrides?.NAME_GRADIENT || user?.equippedCosmetics?.NAME_GRADIENT || user?.nameGradient;
  const badgeId = spokeOverrides?.BADGE || user?.equippedCosmetics?.BADGE || user?.badge;
  const titleId = spokeOverrides?.TITLE || user?.equippedCosmetics?.TITLE || user?.title;

  // 1. Name Gradient
  const gradientItem = gradientId ? COSMETICS_CATALOG.find((c) => c.id === gradientId) : null;
  const gradientClass = gradientItem?.renderValue || 'text-white';

  // 2. Badge Icon
  const badgeItem = badgeId ? COSMETICS_CATALOG.find((c) => c.id === badgeId) : null;
  const badgeIconKey = badgeItem?.renderValue || (badgeId ? badgeId.replace('badge_', '') : '');
  const badgeNode = showBadge ? getBadgeNode(badgeIconKey) : null;

  // 3. Title / Flair
  const titleItem = titleId ? COSMETICS_CATALOG.find((c) => c.id === titleId) : null;
  const titleStr = titleItem?.name || user?.title || '';
  const TitleComponent = titleId
    ? (TitleMap[titleId] || (titleItem?.renderValue ? TitleMap[titleItem.renderValue] : null))
    : null;

  const sizeTypography = {
    sm: { name: 'text-xs font-semibold', title: 'text-[10px]', badgeSize: 'scale-75' },
    md: { name: 'text-sm font-bold', title: 'text-xs', badgeSize: 'scale-90' },
    lg: { name: 'text-lg font-black', title: 'text-sm', badgeSize: 'scale-100' },
  }[size];

  return (
    <div className={`flex flex-col justify-center ${className}`}>
      {/* Name and Badge Line */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {badgeNode && (
          <span
            className={`inline-flex items-center justify-center flex-shrink-0 ${sizeTypography.badgeSize}`}
            title={badgeItem ? `${badgeItem.name} (${badgeItem.originSpoke})` : undefined}
          >
            {badgeNode}
          </span>
        )}
        <span
          className={`tracking-wide font-display ${sizeTypography.name} ${gradientClass} ${nameClassName}`}
        >
          {displayName}
        </span>
      </div>

      {/* Title Subtitle */}
      {shouldShowTitle && (TitleComponent || titleStr) && (
        <div className="mt-0.5">
          {TitleComponent ? (
            <div className="inline-block" title={titleItem ? `Title: ${titleItem.name} (${titleItem.originSpoke})` : undefined}>
              {React.createElement(TitleComponent, { isStatic })}
            </div>
          ) : (
            <span
              className={`text-zinc-400 font-mono uppercase tracking-wider ${sizeTypography.title} ${titleClassName}`}
              title={titleItem ? `Title: ${titleItem.name} (${titleItem.originSpoke})` : undefined}
            >
              {titleStr}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

