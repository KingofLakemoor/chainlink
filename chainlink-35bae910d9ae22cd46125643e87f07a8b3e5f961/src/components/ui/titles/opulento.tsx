export const OpulentoTitle = ({ className = "" }) => (
  <svg
    viewBox="0 0 600 140"
    className={`w-full h-auto ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="opulentoGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff7d6" />
        <stop offset="40%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>

      <filter id="opulentoBevel" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
        <feOffset dx="0" dy="2" result="offsetBlur" />
        <feSpecularLighting
          in="blur"
          surfaceScale="4"
          specularConstant="0.75"
          specularExponent="20"
          lighting-color="#ffffff"
          result="specOut"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite in="specOut" in2="SourceAlpha" operator="in" />
        <feComposite in="SourceGraphic" />
      </filter>
    </defs>

    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily="Cinzel, serif"
      fontSize="72"
      fill="url(#opulentoGold)"
      filter="url(#opulentoBevel)"
      className="drop-shadow-[0_0_12px_rgba(250,204,21,0.6)] animate-opulento-sparkle"
    >
      OPULENTO
    </text>
  </svg>
);
