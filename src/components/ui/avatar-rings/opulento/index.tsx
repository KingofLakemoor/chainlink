export const OpulentoAvatarRing = ({ className = "" }) => (
  <svg
    viewBox="0 0 260 260"
    className={`w-full h-full ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient id="vaultRingGold" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff7d6" />
        <stop offset="40%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>

      <linearGradient id="vaultEtch" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>

    {/* Outer forged ring */}
    <circle
      cx="130"
      cy="130"
      r="120"
      stroke="url(#vaultRingGold)"
      strokeWidth="14"
      fill="none"
      className="animate-vault-ring-rotate drop-shadow-[0_0_16px_rgba(250,204,21,0.6)]"
    />

    {/* Engraved inner etching */}
    <circle
      cx="130"
      cy="130"
      r="95"
      stroke="url(#vaultEtch)"
      strokeWidth="4"
      fill="none"
      strokeDasharray="12 18"
      className="opacity-70"
    />

    {/* Tiny vault emblem at 6 o'clock */}
    <g transform="translate(130,130)">
      <circle
        cx="0"
        cy="92"
        r="14"
        fill="rgba(0,0,0,0.7)"
        stroke="url(#vaultRingGold)"
        strokeWidth="3"
      />
      <circle
        cx="0"
        cy="92"
        r="6"
        fill="url(#vaultRingGold)"
        className="animate-vault-lock-pulse"
      />
    </g>
  </svg>
);
