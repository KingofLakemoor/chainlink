import React from 'react';

export const ResponsibleGamblerTitle = ({ className = "" }) => (
  <div className={`relative inline-block ${className}`}>
    <div className="absolute inset-0 blur-xl bg-[radial-gradient(circle,_rgba(94,234,212,0.4),_transparent_70%)]" />
    <div className="relative font-mono text-[34px] tracking-[0.25em] uppercase
      text-emerald-200 drop-shadow-[0_0_12px_rgba(94,234,212,0.9)]
      animate-responsible-title-glow">
      RESPONSIBLE GAMBLER
    </div>
  </div>
);
