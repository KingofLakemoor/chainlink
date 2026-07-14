import React from 'react';

export const ZeroZeroAvatarRing = ({ className = "" }) => (
  <>
    <svg
      viewBox="0 0 260 260"
      className={`w-full h-full absolute inset-0 animate-zero-ring-rotate ${className}`}
    >
      <defs>
        <linearGradient id="zeroRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4d4d" />
          <stop offset="50%" stopColor="#ff1a1a" />
          <stop offset="100%" stopColor="#b30000" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle
        cx="130"
        cy="130"
        r="118"
        stroke="url(#zeroRed)"
        strokeWidth="10"
        fill="none"
        className="drop-shadow-[0_0_16px_rgba(255,0,0,0.9)]"
      />

      {/* Inner dashed ring */}
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(255,0,0,0.9)"
        strokeWidth="4"
        fill="none"
        strokeDasharray="12 18"
        className="opacity-80"
      />

      {/* Buzzer node at 6 o'clock */}
      <circle
        cx="130"
        cy="226"
        r="10"
        fill="#ff1a1a"
        className="drop-shadow-[0_0_12px_rgba(255,0,0,1)] animate-zero-buzzer-node"
      />
    </svg>

    {/* Avatar slot */}
    <div className="absolute inset-[22%] rounded-full overflow-hidden bg-black/60 backdrop-blur-sm -z-10" />
  </>
);
