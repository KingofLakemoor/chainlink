import React from 'react';

export interface ChainLinkProMemberTitleProps {
  className?: string;
  isStatic?: boolean;
}

export const ChainLinkProMemberTitle: React.FC<ChainLinkProMemberTitleProps> = ({
  className = '',
  isStatic = false,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Background ambient purple / violet glow */}
      <div
        className={`absolute inset-0 -m-1 rounded-lg bg-gradient-to-r from-purple-600/35 via-violet-500/25 to-indigo-500/35 blur-md pointer-events-none ${
          !isStatic ? 'animate-pulse' : ''
        }`}
      />

      {/* Outer framing container with sleek obsidian glass & royal purple border */}
      <div className="relative px-3.5 py-1 rounded-md bg-zinc-950/90 border border-purple-500/50 shadow-[0_0_14px_rgba(168,85,247,0.35)] backdrop-blur-md flex items-center gap-2 overflow-hidden">
        {/* Subtle holographic sheen overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.08) 0px, rgba(255, 255, 255, 0.08) 2px, transparent 2px, transparent 6px)',
          }}
        />

        {/* Left mini icon: Pro Crown */}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 shrink-0 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.85)] ${
            !isStatic ? 'animate-pulse' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.201a4 4 0 0 1-3.86 2.929H8.713a4 4 0 0 1-3.86-2.929L2.019 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
          <path d="M5 21h14" />
        </svg>

        {/* Title typography */}
        <div className="relative flex flex-col items-center">
          <span
            className="text-xs sm:text-sm font-black italic tracking-[0.2em] uppercase font-display bg-gradient-to-r from-purple-200 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]"
            style={{
              textShadow: '0 0 12px rgba(168,85,247,0.5)',
            }}
          >
            PRO MEMBER
          </span>
          {/* Micro subline badge */}
          <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-purple-400/80 -mt-0.5">
            CHAINLINK EXCLUSIVE
          </span>
        </div>

        {/* Right mini icon: Sparkle / Diamond */}
        <div
          className={`w-1.5 h-1.5 rotate-45 bg-purple-400 shadow-[0_0_6px_#c084fc] shrink-0 ${
            !isStatic ? 'animate-ping' : ''
          }`}
        />
      </div>
    </div>
  );
};
