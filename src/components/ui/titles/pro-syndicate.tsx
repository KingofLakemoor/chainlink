import React from 'react';

export interface SyndicateSyndicTitleProps {
  className?: string;
  isStatic?: boolean;
}

export const SyndicateSyndicTitle: React.FC<SyndicateSyndicTitleProps> = ({
  className = '',
  isStatic = false,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Background ambient gold & deep purple glow */}
      <div
        className={`absolute inset-0 -m-1 rounded-lg bg-gradient-to-r from-amber-500/35 via-yellow-500/20 to-purple-600/30 blur-md pointer-events-none ${
          !isStatic ? 'animate-pulse' : ''
        }`}
      />

      {/* Outer framing container with brushed dark bronze / platinum edge */}
      <div className="relative px-3.5 py-1 rounded-md bg-zinc-950/95 border border-amber-500/50 shadow-[0_0_16px_rgba(245,158,11,0.3)] backdrop-blur-md flex items-center gap-2 overflow-hidden">
        {/* Subtle geometric grid weave */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245, 158, 11, 0.15) 2px, rgba(245, 158, 11, 0.15) 4px)',
          }}
        />

        {/* Left mini icon: Interlinked chain / seal */}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 shrink-0 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.85)] ${
            !isStatic ? 'animate-pulse' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>

        {/* Title typography */}
        <div className="relative flex flex-col items-center">
          <span
            className="text-xs sm:text-sm font-black italic tracking-[0.24em] uppercase font-display bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]"
            style={{
              textShadow: '0 0 12px rgba(245,158,11,0.4)',
            }}
          >
            PRO SYNDICATE
          </span>
          {/* Micro subline badge */}
          <span className="text-[7px] font-bold tracking-[0.32em] uppercase text-amber-400/80 -mt-0.5">
            HIGH TIER INNER CIRCLE
          </span>
        </div>

        {/* Right mini icon: Forged Diamond */}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 shrink-0 text-purple-400 drop-shadow-[0_0_6px_rgba(192,132,252,0.8)] ${
            !isStatic ? 'animate-pulse' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12l4 6-10 12L2 9z" />
          <path d="M2 9h20" />
          <path d="m10 3 2 6 2-6" />
        </svg>
      </div>
    </div>
  );
};
