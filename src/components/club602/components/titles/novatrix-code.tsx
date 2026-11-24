import React from 'react';

export const NovatrixCodeTitle = ({ className = "" }) => (
  <div className={`relative inline-block ${className}`}>
    <div className="absolute inset-0 blur-xl bg-[radial-gradient(circle,_rgba(168,85,247,0.4),_transparent_70%)]" />
    <div className="relative font-mono text-[14px] sm:text-[18px] md:text-[22px] tracking-[0.35em] uppercase
      text-violet-300 drop-shadow-[0_0_14px_rgba(167,139,250,0.9)]
      animate-novatrix-title-glow">
      NOVATRIX CODE
    </div>
    <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen
      bg-[linear-gradient(to_bottom,rgba(148,163,184,0.35)_1px,transparent_1px)]
      bg-[length:100%_3px]" />
  </div>
);
