import React from 'react';

export const BadBeatAvatarRing = ({ isStatic = false }: { isStatic?: boolean }) => (
  <div className="relative flex items-center justify-center w-full h-full">
    <div className={`absolute inset-0 rounded-full
      bg-[radial-gradient(circle,_rgba(239,68,68,0.4),_transparent_70%)]
      blur-2xl ${!isStatic ? 'animate-badbeat-ring-pulse' : ''}`} />
      
    <svg viewBox="0 0 260 260" className={`absolute inset-0 w-full h-full ${!isStatic ? 'animate-badbeat-ring-rotate' : ''}`}>
      <defs>
        <linearGradient id="badBeatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
      <circle
        cx="130"
        cy="130"
        r="118"
        stroke="url(#badBeatGrad)"
        strokeWidth="10"
        fill="none"
        className="drop-shadow-[0_0_18px_rgba(239,68,68,0.9)]"
      />
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(239,68,68,0.9)"
        strokeWidth="4"
        fill="none"
        strokeDasharray="6 14"
        className="opacity-85"
      />
      {/* Collapse nodes */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const x = 130 + Math.cos(angle) * 96;
        const y = 130 + Math.sin(angle) * 96;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i % 4 === 0 ? 6 : 3}
            fill={i % 4 === 0 ? "#ef4444" : "#7f1d1d"}
            opacity={0.9}
          />
        );
      })}
    </svg>
    <div className="absolute inset-[22%] rounded-full overflow-hidden bg-black/70 backdrop-blur-sm -z-10" />
  </div>
);
