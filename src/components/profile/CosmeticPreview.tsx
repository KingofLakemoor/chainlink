import React from 'react';
import { FirebaseImage } from '../ui/FirebaseImage';
import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../ui/titles';

class PreviewErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };
  constructor(props: any) {
    super(props);
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("CosmeticPreview shader component crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

interface CosmeticPreviewProps {
  item: {
    id: string;
    name: string;
    type: string;
    image?: string;
    preview?: string;
    thumbnail?: string;
    [key: string]: any;
  };
  isStatic?: boolean;
  userImage?: string;
  username?: string;
  className?: string;
}

export function CosmeticPreview({
  item,
  isStatic = true,
  userImage,
  username,
  className = ''
}: CosmeticPreviewProps) {
  if (!item) return null;

  const itemType = item.type;
  const imageKey = item.image || item.preview || item.id;

  // 1. Profile Banners
  if (itemType === 'PROFILE_BANNER') {
    const BannerComponent = ProfileBannerMap[item.id] || ProfileBannerMap[imageKey];

    return (
      <div className={`w-full h-full relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center ${className}`}>
        {BannerComponent ? (
          <div className="absolute inset-0 w-full h-full">
            <PreviewErrorBoundary fallback={<div className="w-full h-full bg-gradient-to-r from-zinc-800 to-zinc-900" />}>
              {React.createElement(BannerComponent, { isStatic })}
            </PreviewErrorBoundary>
          </div>
        ) : item.thumbnail ? (
          <FirebaseImage src={item.thumbnail} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (imageKey?.startsWith('/') || imageKey?.startsWith('http') || imageKey?.startsWith('gs://')) ? (
          <FirebaseImage
            src={imageKey}
            fallback={`https://placehold.co/600x200/18181b/ffffff?text=${encodeURIComponent(item.name)}`}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 w-full h-full ${imageKey || 'bg-gradient-to-r from-zinc-800 to-zinc-900'}`} />
        )}

        <div className="relative z-10 text-center px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
          <span className="text-xs font-bold text-white tracking-wide truncate max-w-[160px] inline-block drop-shadow">
            {item.name}
          </span>
        </div>
      </div>
    );
  }

  // 1b. Roster & Leaderboard Banners
  if (itemType === 'ROSTER_BANNER') {
    const bannerClass = item.renderValue || item.image || item.preview || '';

    return (
      <div className={`w-full h-full relative overflow-hidden rounded-xl border flex items-center justify-center p-3 ${bannerClass || 'bg-zinc-900 border-zinc-800'} ${className}`}>
        <div className="relative z-10 text-center px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
          <span className="text-xs font-bold text-white tracking-wide truncate max-w-[160px] inline-block drop-shadow">
            {item.name}
          </span>
        </div>
      </div>
    );
  }

  // 2. Avatar Rings
  if (itemType === 'AVATAR_RING') {
    const RingComponent = AvatarRingMap[item.id] || AvatarRingMap[imageKey];

    return (
      <div className={`w-full h-full relative rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center p-3 overflow-hidden ${className}`}>
        <div className="relative w-16 h-16 flex items-center justify-center z-10">
          {RingComponent ? (
            <>
              <div className="absolute inset-0 transform scale-[1.35] pointer-events-none z-0">
                <PreviewErrorBoundary fallback={null}>
                  {React.createElement(RingComponent, { isStatic })}
                </PreviewErrorBoundary>
              </div>
              <div className="relative z-10 w-11 h-11 rounded-full overflow-hidden border border-black/60 bg-zinc-800 flex items-center justify-center shadow-inner">
                {userImage ? (
                  <FirebaseImage src={userImage} fallback="/logo.png" alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-zinc-300">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
            </>
          ) : item.thumbnail ? (
            <FirebaseImage src={item.thumbnail} alt={item.name} className="w-full h-full object-contain rounded-full" />
          ) : (
            <div className={`w-14 h-14 rounded-full border-4 ${imageKey || 'border-cyan-400'} bg-zinc-800 flex items-center justify-center shadow-md`}>
              {userImage ? (
                <FirebaseImage src={userImage} fallback="/logo.png" alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-sm font-bold text-zinc-300">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Titles
  if (itemType === 'TITLE') {
    const TitleComponent = TitleMap[item.id] || TitleMap[imageKey] || TitleMap[item.preview];

    return (
      <div className={`w-full h-full rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center p-3 text-center ${className}`}>
        {TitleComponent ? (
          <div className="inline-block transform scale-95">
            <PreviewErrorBoundary fallback={
              <span className="text-xs font-bold text-[#22c55e] px-3 py-1 rounded-md bg-black/60 border border-[#22c55e]/30 shadow-sm font-display tracking-wide uppercase">
                {item.name}
              </span>
            }>
              {React.createElement(TitleComponent, { isStatic })}
            </PreviewErrorBoundary>
          </div>
        ) : item.thumbnail ? (
          <FirebaseImage src={item.thumbnail} alt={item.name} className="max-h-12 max-w-full object-contain" />
        ) : (
          <span className="text-xs font-bold text-[#22c55e] px-3 py-1 rounded-md bg-black/60 border border-[#22c55e]/30 shadow-sm font-display tracking-wide uppercase">
            {item.name}
          </span>
        )}
      </div>
    );
  }

  // 4. Default / Merch / Custom items
  return (
    <div className={`w-full h-full rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center p-2 ${className}`}>
      {item.image ? (
        <FirebaseImage src={item.image} alt={item.name} className="max-h-16 max-w-full object-contain" />
      ) : (
        <span className="text-xs font-bold text-zinc-300 text-center">{item.name}</span>
      )}
    </div>
  );
}
