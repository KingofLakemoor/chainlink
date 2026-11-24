import React from 'react';

export interface ViceNeonAvatarRingProps {
  className?: string;
  isStatic?: boolean;
}

export const ViceNeonAvatarRing: React.FC<ViceNeonAvatarRingProps> = ({
  className = '',
  isStatic = false,
}) => {
  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none ${className}`}>
      {/* Background ambient neon bloom */}
      <div
        className={`absolute inset-0 rounded-full blur-xl pointer-events-none opacity-85 ${
          isStatic ? '' : 'animate-vice-ring-pulse'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(255,42,133,0.45) 15%, rgba(0,240,255,0.3) 50%, transparent 72%)',
        }}
      />

      {/* SVG Ring Structure */}
      <svg
        viewBox="0 0 260 260"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Sunset / Vice Neon Gradient */}
          <linearGradient id="viceNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff2a85" />
            <stop offset="40%" stopColor="#ff7b00" />
            <stop offset="70%" stopColor="#ffd000" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>

          {/* Cyan to Magenta Reverse Gradient */}
          <linearGradient id="viceCyanPinkGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#ff2a85" />
          </linearGradient>

          {/* Neon Bloom Glow Filter */}
          <filter id="viceNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feGaussianBlur stdDeviation="6" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Clockwise Rotating Orbit with Segmented Arcs and Beacons */}
        <g
          className={isStatic ? '' : 'animate-vice-ring-rotate'}
          style={{ transformOrigin: '130px 130px' }}
        >
          {/* Outer continuous vibrant neon guide */}
          <circle
            cx="130"
            cy="130"
            r="120"
            stroke="url(#viceNeonGrad)"
            strokeWidth="3.5"
            fill="none"
            opacity="0.9"
            filter="url(#viceNeonGlow)"
          />

          {/* Segmented dashed laser orbit */}
          <circle
            cx="130"
            cy="130"
            r="124"
            stroke="#00f0ff"
            strokeWidth="2"
            fill="none"
            strokeDasharray="6 26"
            opacity="0.9"
          />

          {/* Cardinal Neon Diamond Beacons */}
          <g transform="translate(130, 10)">
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#00f0ff" className="drop-shadow-[0_0_8px_#00f0ff]" />
          </g>
          <g transform="translate(250, 130)">
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#ff2a85" className="drop-shadow-[0_0_8px_#ff2a85]" />
          </g>
          <g transform="translate(130, 250)">
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#ffd000" className="drop-shadow-[0_0_8px_#ffd000]" />
          </g>
          <g transform="translate(10, 130)">
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#d946ef" className="drop-shadow-[0_0_8px_#d946ef]" />
          </g>
        </g>

        {/* Counter-Clockwise Inner Orbit Ring */}
        <g
          className={isStatic ? '' : 'animate-vice-ring-rotate-reverse'}
          style={{ transformOrigin: '130px 130px' }}
        >
          {/* Secondary glowing arc track */}
          <circle
            cx="130"
            cy="130"
            r="108"
            stroke="url(#viceCyanPinkGrad)"
            strokeWidth="4"
            fill="none"
            strokeDasharray="50 30 15 25"
            strokeLinecap="round"
            filter="url(#viceNeonGlow)"
          />

          {/* Inner retro tick marks */}
          <circle
            cx="130"
            cy="130"
            r="98"
            stroke="rgba(255, 42, 133, 0.75)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 14"
          />
        </g>

        {/* Horizon Anchor Line Accent */}
        <g transform="translate(130, 240)">
          <path
            d="M -24 0 L 24 0"
            stroke="#ff2a85"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_6px_#ff2a85]"
          />
        </g>
      </svg>

      {/* Inner circular safety mask so avatar image shines through cleanly */}
      <div className="absolute inset-[15%] rounded-full overflow-hidden bg-zinc-950/40 -z-10" />
    </div>
  );
};
