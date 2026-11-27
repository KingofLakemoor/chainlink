import React from 'react';

export interface SyndicateAvatarRingProps {
  className?: string;
  isStatic?: boolean;
}

export const SyndicateAvatarRing: React.FC<SyndicateAvatarRingProps> = ({
  className = '',
  isStatic = false,
}) => {
  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none ${className}`}>
      {/* Background ambient gold halo */}
      <div
        className={`absolute inset-0 rounded-full blur-xl pointer-events-none opacity-85 ${
          isStatic ? '' : 'animate-pulse'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.45) 20%, rgba(147,51,234,0.3) 55%, transparent 75%)',
        }}
      />

      {/* SVG Ring Structure */}
      <svg
        viewBox="0 0 260 260"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Imperial Gold Gradient */}
          <linearGradient id="syndicateGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Golden Glow Filter */}
          <filter id="syndicateGoldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feGaussianBlur stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Clockwise Rotating Gear & Segment Arcs */}
        <g
          className={isStatic ? '' : 'animate-spin'}
          style={{ transformOrigin: '130px 130px', animationDuration: '22s' }}
        >
          {/* Heavy gold forged ring */}
          <circle
            cx="130"
            cy="130"
            r="120"
            stroke="url(#syndicateGoldGrad)"
            strokeWidth="4"
            fill="none"
            opacity="0.95"
            filter="url(#syndicateGoldGlow)"
          />

          {/* Segmented heavy chain notches */}
          <circle
            cx="130"
            cy="130"
            r="125"
            stroke="#facc15"
            strokeWidth="2"
            strokeDasharray="8 14"
            fill="none"
            opacity="0.8"
          />

          {/* 6 Syndicate Star Diamonds */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 130 130)`}>
              <polygon
                points="130,5 133,10 130,15 127,10"
                fill="#fef08a"
                filter="url(#syndicateGoldGlow)"
              />
            </g>
          ))}
        </g>

        {/* Inner Counter-Rotating Hex Tech Ring */}
        <g
          className={isStatic ? '' : 'animate-spin'}
          style={{ transformOrigin: '130px 130px', animationDuration: '28s', animationDirection: 'reverse' }}
        >
          <circle
            cx="130"
            cy="130"
            r="111"
            stroke="#c084fc"
            strokeWidth="1.5"
            strokeDasharray="18 10"
            fill="none"
            opacity="0.7"
          />
        </g>

        {/* Bottom SYNDICATE Ingot Crest */}
        <g transform="translate(130, 240)">
          <rect
            x="-26"
            y="-10"
            width="52"
            height="18"
            rx="4"
            fill="#09090b"
            stroke="#eab308"
            strokeWidth="1.5"
            filter="url(#syndicateGoldGlow)"
          />
          <text
            x="0"
            y="3"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Oswald, system-ui, sans-serif"
            fontWeight="bold"
            fontSize="9"
            letterSpacing="1.8"
            fill="#fef08a"
          >
            SYNDICATE
          </text>
        </g>
      </svg>
    </div>
  );
};
