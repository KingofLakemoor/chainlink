import React from 'react';

export const SignalFloorTitle = ({ className = "" }) => (
  <div className={`relative inline-block ${className}`}>
    <div className="absolute inset-0 blur-xl bg-[radial-gradient(circle,_rgba(34,197,154,0.4),_transparent_70%)]" />
    <div className="relative font-mono text-[14px] sm:text-[18px] md:text-[22px] tracking-[0.35em] uppercase
      text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]
      animate-signal-title-glow">
      SIGNAL FLOOR
    </div>
    <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen
      bg-[linear-gradient(to_bottom,rgba(148,163,184,0.35)_1px,transparent_1px)]
      bg-[length:100%_3px]" />
  </div>
);
