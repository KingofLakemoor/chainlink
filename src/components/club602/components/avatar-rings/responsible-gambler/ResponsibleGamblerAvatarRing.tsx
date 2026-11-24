import React from 'react';

export const ResponsibleGamblerAvatarRing = ({ isStatic = false }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className={`absolute inset-0 rounded-full
      bg-[radial-gradient(circle,_rgba(94,234,212,0.35),_transparent_70%)]
      blur-2xl ${isStatic ? '' : 'animate-responsible-ring-pulse'}`} />
      
    <svg viewBox="0 0 260 260" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="respGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <circle
        cx="130"
        cy="130"
        r="118"
        stroke="url(#respGrad)"
        strokeWidth="10"
        fill="none"
        className="drop-shadow-[0_0_18px_rgba(94,234,212,0.9)]"
      />
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(94,234,212,0.9)"
        strokeWidth="4"
        fill="none"
        strokeDasharray="10 14"
      />
    </svg>
    <div className="absolute inset-[22%] rounded-full overflow-hidden
      bg-slate-950/70 backdrop-blur-sm -z-10" />
  </div>
);
