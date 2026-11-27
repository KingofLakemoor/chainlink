import React from 'react';

export interface ChainLinkProAvatarRingProps {
  className?: string;
  isStatic?: boolean;
}

export const ChainLinkProAvatarRing: React.FC<ChainLinkProAvatarRingProps> = ({
  className = '',
  isStatic = false,
}) => {
  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none ${className}`}>
      {/* Background ambient purple bloom */}
      <div
        className={`absolute inset-0 rounded-full blur-xl pointer-events-none opacity-85 ${
          isStatic ? '' : 'animate-pulse'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.45) 20%, rgba(99,102,241,0.25) 55%, transparent 75%)',
        }}
      />

      {/* SVG Ring Structure */}
      <svg
        viewBox="0 0 260 260"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Royal Purple Gradient */}
          <linearGradient id="proRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Neon Purple Glow Filter */}
          <filter id="proRingGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feGaussianBlur stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Rotating Ring */}
        <g
          className={isStatic ? '' : 'animate-spin'}
          style={{ transformOrigin: '130px 130px', animationDuration: '18s' }}
        >
          {/* Outer continuous purple neon guide */}
          <circle
            cx="130"
            cy="130"
            r="120"
            stroke="url(#proRingGrad)"
            strokeWidth="3.5"
            fill="none"
            opacity="0.9"
            filter="url(#proRingGlow)"
          />

          {/* Segmented dashed orbit */}
          <circle
            cx="130"
            cy="130"
            r="124"
            stroke="#c084fc"
            strokeWidth="1.5"
            strokeDasharray="16 12"
            fill="none"
            opacity="0.75"
          />

          {/* 4 Orbiting Beacons */}
          <circle cx="130" cy="6" r="4.5" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2" filter="url(#proRingGlow)" />
          <circle cx="254" cy="130" r="4.5" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2" filter="url(#proRingGlow)" />
          <circle cx="130" cy="254" r="4.5" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2" filter="url(#proRingGlow)" />
          <circle cx="6" cy="130" r="4.5" fill="#f3e8ff" stroke="#a855f7" strokeWidth="2" filter="url(#proRingGlow)" />
        </g>

        {/* Inner Counter-Rotating Precision Ring */}
        <g
          className={isStatic ? '' : 'animate-spin'}
          style={{ transformOrigin: '130px 130px', animationDuration: '24s', animationDirection: 'reverse' }}
        >
          <circle
            cx="130"
            cy="130"
            r="112"
            stroke="#818cf8"
            strokeWidth="1.5"
            strokeDasharray="6 8"
            fill="none"
            opacity="0.6"
          />
        </g>

        {/* Bottom PRO Crown Emblem Badge */}
        <g transform="translate(130, 240)">
          <rect
            x="-20"
            y="-10"
            width="40"
            height="18"
            rx="4"
            fill="#09090b"
            stroke="#a855f7"
            strokeWidth="1.5"
            filter="url(#proRingGlow)"
          />
          <text
            x="0"
            y="3"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Oswald, system-ui, sans-serif"
            fontWeight="bold"
            fontSize="10"
            letterSpacing="1.5"
            fill="#f3e8ff"
          >
            PRO
          </text>
        </g>
      </svg>
    </div>
  );
};
