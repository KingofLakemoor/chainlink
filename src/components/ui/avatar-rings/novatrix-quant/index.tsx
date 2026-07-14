import React from 'react';

export const NovatrixQuantAvatarRing = ({ className = "", isStatic = false }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className={`absolute inset-0 rounded-full
      bg-[radial-gradient(circle,_rgba(94,234,212,0.4),_transparent_70%)]
      blur-2xl ${isStatic ? '' : 'animate-novatrix-ring-pulse'} ${className}`} />
      
    <svg
      viewBox="0 0 260 260"
      className={`absolute inset-0 w-full h-full ${isStatic ? '' : 'animate-novatrix-ring-rotate'} ${className}`}
    >
      <defs>
        <linearGradient id="novatrixQuantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <circle
        cx="130"
        cy="130"
        r="118"
        stroke="url(#novatrixQuantGrad)"
        strokeWidth="10"
        fill="none"
        className="drop-shadow-[0_0_18px_rgba(94,234,212,0.9)]"
      />
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(94,234,212,0.95)"
        strokeWidth="4"
        fill="none"
        strokeDasharray="10 14"
        className="opacity-85"
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = 130 + Math.cos(angle) * 96;
        const y = 130 + Math.sin(angle) * 96;
        return (
          <rect
            key={i}
            x={x - 4}
            y={y - 4}
            width={8}
            height={8}
            rx={2}
            fill={i % 2 === 0 ? "#22d3ee" : "#e0e7ff"}
            opacity={0.9}
          />
        );
      })}
    </svg>
    <div className="absolute inset-[22%] rounded-full overflow-hidden bg-slate-950/70 backdrop-blur-sm -z-10" />
  </div>
);
