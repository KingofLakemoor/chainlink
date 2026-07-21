import React from 'react';

export const BadBeatTitle = ({ className = "", isStatic = false }: { className?: string, isStatic?: boolean }) => (
  <div className={`relative inline-block ${className}`}>
    <div className="absolute inset-0 blur-xl bg-[radial-gradient(circle,_rgba(239,68,68,0.4),_transparent_70%)]" />
    <div className={`relative font-mono text-[14px] sm:text-[18px] md:text-[22px] tracking-[0.35em] uppercase
      text-red-300 drop-shadow-[0_0_14px_rgba(239,68,68,0.9)]
      ${!isStatic ? 'animate-badbeat-title-glow' : ''}`}>
      BAD BEAT
    </div>
    <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen
      bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)]
      bg-[length:100%_3px]" />
  </div>
);
