import React from 'react';

export const SignalFloorAvatarRing = ({ size = 256 }) => (
  <div
    className="relative flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    {/* Outer glow */}
    <div className="absolute inset-0 rounded-full
      bg-[radial-gradient(circle,_rgba(16,185,129,0.4),_transparent_70%)]
      blur-2xl animate-signal-ring-pulse" />

    {/* Ring */}
    <svg
      viewBox="0 0 260 260"
      className="absolute inset-0 animate-signal-ring-rotate"
    >
      <defs>
        <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle
        cx="130"
        cy="130"
        r="118"
        stroke="url(#signalGrad)"
        strokeWidth="10"
        fill="none"
        className="drop-shadow-[0_0_18px_rgba(16,185,129,0.9)]"
      />

      {/* Inner segmented feed ring */}
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(45,212,191,0.95)"
        strokeWidth="4"
        fill="none"
        strokeDasharray="8 10"
        className="opacity-85"
      />

      {/* Feed nodes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = 130 + Math.cos(angle) * 96;
        const y = 130 + Math.sin(angle) * 96;
        const isMajor = i % 3 === 0;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isMajor ? 6 : 3}
            fill={isMajor ? "#22c55e" : "#0f766e"}
            opacity={0.95}
          />
        );
      })}
    </svg>

    {/* Avatar slot */}
    <div className="absolute inset-[22%] rounded-full overflow-hidden
      bg-slate-950/70 backdrop-blur-sm" />
  </div>
);
