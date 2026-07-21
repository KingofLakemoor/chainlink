import React from "react";

export const EdgeLedgerAvatarRing = ({ className = "", isStatic = false }) => (
  <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
    {/* Outer glow */}
    <div className={`absolute inset-0 rounded-full
      bg-[radial-gradient(circle,_rgba(234,179,8,0.35),_transparent_70%)]
      blur-2xl ${isStatic ? '' : 'animate-ledger-ring-glow'}`} />
    
    <svg viewBox="0 0 260 260" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="ledgerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>
      {/* Outer gold ring */}
      <circle
        cx="130"
        cy="130"
        r="118"
        stroke="url(#ledgerGrad)"
        strokeWidth="10"
        fill="none"
        className="drop-shadow-[0_0_18px_rgba(234,179,8,0.9)]"
      />
      {/* Inner PnL tick ring */}
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(148,163,184,0.9)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="4 10"
        className="opacity-85"
      />
      {/* Ledger tabs */}
      {[
        { angle: -Math.PI / 2, width: 32 },
        { angle: (Math.PI / 2), width: 24 },
        { angle: Math.PI, width: 24 },
      ].map((tab, i) => {
        const r = 118;
        const x = 130 + Math.cos(tab.angle) * r;
        const y = 130 + Math.sin(tab.angle) * r;
        return (
          <rect
            key={i}
            x={x - tab.width / 2}
            y={y - 10}
            width={tab.width}
            height={20}
            rx={4}
            fill="rgba(15,23,42,0.96)"
            stroke="rgba(234,179,8,0.9)"
            strokeWidth={2}
          />
        );
      })}
      {/* Tiny green micro-ticks */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const r = 96;
        const x = 130 + Math.cos(angle) * r;
        const y = 130 + Math.sin(angle) * r;
        return (
          <rect
            key={i}
            x={x - 1.5}
            y={y - 4}
            width={3}
            height={8}
            rx={1}
            fill="#22c55e"
            opacity={i % 3 === 0 ? 0.9 : 0.4}
          />
        );
      })}
    </svg>
    {/* Avatar slot */}
    <div className="absolute inset-[22%] rounded-full overflow-hidden bg-slate-950/75 backdrop-blur-sm -z-10" />
  </div>
);
