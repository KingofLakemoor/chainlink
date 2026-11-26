import React from 'react';
import { COSMETICS_CATALOG } from '../index';
import { CosmeticItem, PresentationContext } from '../types';

import { AvatarRingMap } from '../componentsMap';

export interface Club602AvatarProps {
  /** User object or profile data */
  user?: {
    displayName?: string;
    name?: string;
    username?: string;
    photoURL?: string;
    avatarUrl?: string;
    avatarFrame?: string;
    equippedCosmetics?: {
      AVATAR_RING?: string;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
  /** Explicit avatar ring ID (overrides user data) */
  ringId?: string;
  /** Spoke context for spoke-specific cosmetic overrides */
  spokeId?: 'chainlink' | 'scriptless' | 'darts' | 'putting' | 'bingo' | 'flip' | 'core';
  /** Avatar size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Presentation context: 'micro' enforces static mode and CSS fallback for 60fps leaderboard performance */
  presentationContext?: PresentationContext;
  /** Custom outer wrapper className */
  className?: string;
  /** Custom image className */
  imageClassName?: string;
  /** Fallback name if no image */
  fallbackName?: string;
  /** Whether dynamic canvas/shader avatar rings render in static mode */
  isStatic?: boolean;
}

const SIZE_MAP = {
  xs: { wrapper: 'w-6 h-6', img: 'w-6 h-6', text: 'text-[10px]' },
  sm: { wrapper: 'w-8 h-8', img: 'w-8 h-8', text: 'text-xs' },
  md: { wrapper: 'w-10 h-10', img: 'w-10 h-10', text: 'text-sm' },
  lg: { wrapper: 'w-16 h-16', img: 'w-16 h-16', text: 'text-lg' },
  xl: { wrapper: 'w-24 h-24 sm:w-28 sm:h-28', img: 'w-24 h-24 sm:w-28 sm:h-28', text: 'text-2xl' },
};

/**
 * Universal Club 602 Avatar Component
 * Displays user photo with their equipped avatar frame/ring across any spoke app.
 * Supports CSS border rings as well as rich React/Canvas animated rings from ChainLink & spokes.
 * Context-aware: automatically down-scales to static/CSS performance mode on 'micro' surfaces.
 */
class AvatarRingErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };
  constructor(props: any) {
    super(props);
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("Avatar ring failed to render:", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

export const Club602Avatar: React.FC<Club602AvatarProps> = ({
  user,
  ringId,
  spokeId,
  size = 'md',
  presentationContext,
  className = '',
  imageClassName = '',
  fallbackName,
  isStatic = false
}) => {
  // Enforce static mode on micro surfaces (e.g. dense leaderboards) or xs/sm sizes
  const forceStatic = isStatic || presentationContext === 'micro' || size === 'xs' || size === 'sm';
  const spokeOverrides = spokeId && user?.spokeCosmetics?.[spokeId];
  const chosenRingId = ringId || spokeOverrides?.AVATAR_RING || user?.equippedCosmetics?.AVATAR_RING || user?.avatarFrame;
  const cosmeticItem: CosmeticItem | undefined = chosenRingId
    ? COSMETICS_CATALOG.find((c) => c.id === chosenRingId)
    : undefined;

  const displayName = user?.username || user?.displayName || user?.name || fallbackName || 'Player';
  const photoUrl = user?.photoURL || user?.avatarUrl || user?.image || 
    (user?.id ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.id)}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`);

  const sizeStyles = SIZE_MAP[size] || SIZE_MAP.md;

  // Check if there is an animated / Canvas AvatarRing component
  const RingComponent = chosenRingId
    ? (AvatarRingMap[chosenRingId] || (cosmeticItem?.renderValue ? AvatarRingMap[cosmeticItem.renderValue] : null))
    : null;

  // Derive frame style class if not using custom component
  let frameClass = '';
  if (!RingComponent && cosmeticItem) {
    if (cosmeticItem.renderType === 'css') {
      frameClass = cosmeticItem.renderValue.startsWith('ring-') || cosmeticItem.renderValue.startsWith('af-')
        ? cosmeticItem.renderValue
        : `ring-2 sm:ring-4 ${cosmeticItem.renderValue} shadow-[0_0_8px_rgba(255,255,255,0.2)]`;
    } else {
      // Component-based fallback
      frameClass = 'ring-2 sm:ring-4 ring-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    }
  }

  return (
    <div
      className={`relative rounded-full flex items-center justify-center flex-shrink-0 transition-transform ${sizeStyles.wrapper} ${frameClass} ${className}`}
      title={cosmeticItem ? `${cosmeticItem.name} (${cosmeticItem.originSpoke})` : undefined}
    >
      {RingComponent && (
        <div className="absolute inset-0 transform scale-[1.35] pointer-events-none z-0 flex items-center justify-center">
          <AvatarRingErrorBoundary fallback={null}>
            {React.createElement(RingComponent, { isStatic: forceStatic })}
          </AvatarRingErrorBoundary>
        </div>
      )}
      <img
        src={photoUrl}
        alt={displayName}
        referrerPolicy="no-referrer"
        className={`w-full h-full rounded-full object-cover relative z-10 border border-zinc-900/60 ${imageClassName}`}
      />
    </div>
  );
};

