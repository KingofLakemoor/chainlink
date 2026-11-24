import React from 'react';

export const NovatrixQuantTitle = ({ className = "" }) => (
  <div className={`relative inline-block ${className}`}>
    <div className="absolute inset-0 blur-xl bg-[radial-gradient(circle,_rgba(94,234,212,0.45),_transparent_70%)]" />
    <div className="relative font-mono text-[14px] sm:text-[18px] md:text-[22px] tracking-[0.35em] uppercase
      text-cyan-200 drop-shadow-[0_0_16px_rgba(94,234,212,1)]
      animate-novatrix-title-glow">
      NOVATRIX QUANT
    </div>
  </div>
);
