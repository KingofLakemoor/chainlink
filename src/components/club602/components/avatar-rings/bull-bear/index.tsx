import React from 'react';

export const BullBearAvatarRing = ({ className = "", isStatic = false }) => (
  <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
    <div className={`absolute inset-0 rounded-full
      bg-[radial-gradient(circle,_rgba(34,197,94,0.35),_transparent_70%)]
      blur-2xl ${isStatic ? '' : 'animate-signal-ring-pulse'}`} />
      
    <svg viewBox="0 0 260 260" className={`absolute inset-0 w-full h-full ${isStatic ? '' : 'animate-signal-ring-rotate'}`}>
      <defs>
        <linearGradient id="signalGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
        <linearGradient id="signalRed" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
      
      {/* Base Grid Ring */}
      <circle
        cx="130"
        cy="130"
        r="118"
        stroke="rgba(30,41,59,0.9)"
        strokeWidth="10"
        fill="none"
      />
      
      {/* Bullish Arc */}
      <path
        d="M 130 12 A 118 118 0 0 1 248 130"
        stroke="url(#signalGreen)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        className="drop-shadow-[0_0_12px_rgba(34,197,94,0.8)]"
      />
      
      {/* Bearish Arc */}
      <path
        d="M 130 248 A 118 118 0 0 1 12 130"
        stroke="url(#signalRed)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        className="drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
      />

      {/* Ticks */}
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(148,163,184,0.8)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="2 12"
      />
      
      {/* Market Nodes */}
      <circle cx="130" cy="12" r="6" fill="#86efac" className="drop-shadow-[0_0_8px_#22c55e]" />
      <circle cx="248" cy="130" r="4" fill="#86efac" />
      <circle cx="130" cy="248" r="6" fill="#fca5a5" className="drop-shadow-[0_0_8px_#ef4444]" />
      <circle cx="12" cy="130" r="4" fill="#fca5a5" />
      
    </svg>
    <div className="absolute inset-[22%] rounded-full overflow-hidden bg-slate-950/70 backdrop-blur-sm -z-10" />
  </div>
);
