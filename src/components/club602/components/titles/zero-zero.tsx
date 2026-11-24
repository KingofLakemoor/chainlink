import React from 'react';

export const ZeroZeroTitle = ({ className = "" }) => (
  <div className={`relative ${className}`}>
    {/* Main LED text */}
    <div className="relative font-mono text-[24px] sm:text-[32px] md:text-[40px] tracking-widest text-red-400 drop-shadow-[0_0_12px_rgba(255,0,0,0.9)] animate-zero-title-flicker">
      0:00
    </div>

    {/* Glitch layers */}
    <div className="absolute inset-0 font-mono text-[24px] sm:text-[32px] md:text-[40px] tracking-widest text-red-300/40 animate-zero-title-glitch-1 pointer-events-none">
      0:00
    </div>

    <div className="absolute inset-0 font-mono text-[24px] sm:text-[32px] md:text-[40px] tracking-widest text-red-500/40 animate-zero-title-glitch-2 pointer-events-none">
      0:00
    </div>
  </div>
);
