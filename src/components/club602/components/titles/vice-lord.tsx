import React from 'react';

export interface ViceLordTitleProps {
  className?: string;
  isStatic?: boolean;
}

export const ViceLordTitle: React.FC<ViceLordTitleProps> = ({
  className = '',
  isStatic = false,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Background ambient neon bloom */}
      <div
        className={`absolute inset-0 -m-1 rounded-lg bg-gradient-to-r from-pink-500/30 via-purple-600/20 to-cyan-400/30 blur-md pointer-events-none ${
          !isStatic ? 'animate-pulse' : ''
        }`}
      />

      {/* Outer framing container with dark glass and neon border */}
      <div className="relative px-3 py-1 rounded-md bg-zinc-950/85 border border-pink-500/40 shadow-[0_0_14px_rgba(255,42,133,0.35)] backdrop-blur-md flex items-center gap-2 overflow-hidden">
        {/* Subtle retro scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.15) 2px, rgba(255, 255, 255, 0.15) 4px)',
          }}
        />

        {/* Left mini neon palm flourish */}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 shrink-0 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)] ${
            !isStatic ? 'animate-pulse' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h11Z" />
          <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-9" />
          <path d="M5.89 15.55c1.43-.87 2.9-2.05 4.11-3.55" />
          <path d="M12 12c.5 3 2.5 9 5 10" />
          <path d="M12 12c-1.5 3-4 8.5-7 10" />
        </svg>

        {/* Title text with vibrant Vice gradient */}
        <div className="relative flex flex-col items-center">
          <span
            className="text-xs sm:text-sm font-black italic tracking-[0.22em] uppercase font-display bg-gradient-to-r from-[#ff2a85] via-[#ff7b00] to-[#00f0ff] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,42,133,0.7)]"
            style={{
              textShadow: '0 0 12px rgba(255,42,133,0.5), 0 0 20px rgba(0,240,255,0.3)',
            }}
          >
            VICE LORD
          </span>

          {/* Bottom neon baseline divider */}
          <div className="w-full h-[1.5px] mt-0.5 rounded-full bg-gradient-to-r from-[#00f0ff] via-[#ff2a85] to-[#ffd000] opacity-80 shadow-[0_0_6px_rgba(255,42,133,0.8)]" />
        </div>

        {/* Right mini neon star/diamond */}
        <div
          className={`w-1.5 h-1.5 rotate-45 bg-[#ff2a85] shadow-[0_0_6px_#ff2a85] shrink-0 ${
            !isStatic ? 'animate-ping' : ''
          }`}
        />
      </div>
    </div>
  );
};
