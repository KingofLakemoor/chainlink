import React from 'react';

export const EdgeLedgerTitle = ({ className = "" }: { className?: string; isStatic?: boolean }) => (
  <div className={`relative inline-block ${className}`}>
    <div className="absolute inset-0 blur-xl bg-[radial-gradient(circle,_rgba(234,179,8,0.4),_transparent_70%)]" />
    <div className="relative font-sans text-[14px] sm:text-[18px] md:text-[22px] tracking-[0.3em] uppercase
      text-amber-200 drop-shadow-[0_0_12px_rgba(234,179,8,0.9)]
      animate-ledger-title-glow">
      EDGE LEDGER
    </div>
    <div className="absolute left-0 right-0 -bottom-1 h-[2px]
      bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 opacity-80" />
  </div>
);
