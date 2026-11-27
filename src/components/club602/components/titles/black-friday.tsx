import React from 'react';

export interface BlackFridayTitleProps {
  className?: string;
  isStatic?: boolean;
}

export const BlackFridayTitle: React.FC<BlackFridayTitleProps> = ({
  className = '',
  isStatic = false,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Background stealth obsidian ambient glow with subtle gold halo */}
      <div
        className={`absolute inset-0 -m-1 rounded-lg bg-gradient-to-r from-amber-500/20 via-zinc-800/40 to-yellow-500/20 blur-md pointer-events-none ${
          !isStatic ? 'animate-pulse' : ''
        }`}
      />

      {/* Outer framing container with ultra-black matte carbon styling & gold chamfer */}
      <div className="relative px-3.5 py-1 rounded-md bg-zinc-950/95 border border-amber-500/40 shadow-[0_0_16px_rgba(0,0,0,0.9),0_0_8px_rgba(245,158,11,0.25)] backdrop-blur-md flex items-center gap-2 overflow-hidden">
        {/* Sleek subtle angled matte carbon fiber weave */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 2px, transparent 2px, transparent 6px)',
          }}
        />

        {/* Fine gold edge light sweep on hover / animation */}
        {!isStatic && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen animate-pulse"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.25) 50%, transparent 100%)',
            }}
          />
        )}

        {/* Left mini icon: Minimalist Wishbone & Black Diamond */}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 shrink-0 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)] ${
            !isStatic ? 'animate-pulse' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Wishbone shape */}
          <path d="M7 21 C7 14 10 9 12 9 C14 9 17 14 17 21" />
          <path d="M12 9 L12 3" />
          <circle cx="12" cy="3" r="1.5" fill="currentColor" />
        </svg>

        {/* Title text with high-contrast BFBS Platinum & Stealth Gold typography */}
        <div className="relative flex flex-col items-center">
          <span
            className="text-xs sm:text-sm font-black italic tracking-[0.24em] uppercase font-display bg-gradient-to-r from-zinc-100 via-amber-200 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
            style={{
              textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 16px rgba(245,158,11,0.3)',
            }}
          >
            BLACK FRIDAY
          </span>
          {/* Micro subline badge */}
          <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-zinc-500 -mt-0.5">
            BFBS EDITION
          </span>
        </div>

        {/* Right mini icon: Price Tag / Diamond Money Symbol */}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)] ${
            !isStatic ? 'animate-pulse' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Sleek diamond tag */}
          <path d="M12 2 L22 12 L12 22 L2 12 Z" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
};
