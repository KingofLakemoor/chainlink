import React from "react";

export const OpulentoVaultBanner: React.FC<{ className?: string, isStatic?: boolean }> = ({
  className,
  isStatic = false,
}) => {
  return (
    <div
      className={
        "relative w-full h-40 rounded-xl overflow-hidden bg-black " +
        "border border-yellow-700/40 shadow-[0_0_40px_rgba(0,0,0,0.9)] " +
        (className ?? "")
      }
    >
      {/* Obsidian base */}
      <div className="absolute inset-0 bg-neutral-950">
        <div className="absolute inset-0 opacity-[0.15] mix-blend-soft-light bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),_transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[url('/noise.png')]" />
      </div>

      {/* Gold dust */}
      <GoldDust isStatic={isStatic} />

      {/* Vault rings */}
      <VaultRings isStatic={isStatic} />

      {/* Center vault lock */}
      <VaultLock isStatic={isStatic} />
    </div>
  );
};

const GoldDust = ({ isStatic }: { isStatic: boolean }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className={`absolute w-[2px] h-[2px] bg-yellow-300/70 rounded-full ${isStatic ? '' : 'animate-gold-dust'}`}
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 6}s`,
            opacity: 0.4 + Math.random() * 0.6,
          }}
        />
      ))}
    </div>
  );
};

const VaultRings = ({ isStatic }: { isStatic: boolean }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        viewBox="0 0 300 300"
        className={`absolute w-[90%] h-[90%] ${isStatic ? '' : 'animate-vault-rotate'} opacity-90`}
      >
        <defs>
          <radialGradient id="vaultGoldOuter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <circle
          cx="150"
          cy="150"
          r="130"
          stroke="url(#vaultGoldOuter)"
          strokeWidth="10"
          fill="none"
          className="drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]"
          strokeDasharray="4 8"
        />
      </svg>

      <svg
        viewBox="0 0 300 300"
        className={`absolute w-[90%] h-[90%] ${isStatic ? '' : 'animate-vault-ring-rotate'} opacity-90`}
      >
        <defs>
          <radialGradient id="vaultGoldMiddle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <circle
          cx="150"
          cy="150"
          r="95"
          stroke="url(#vaultGoldMiddle)"
          strokeWidth="6"
          fill="none"
          className="opacity-70"
          strokeDasharray="20 10"
        />
      </svg>

      <svg
        viewBox="0 0 300 300"
        className={`absolute w-[90%] h-[90%] ${isStatic ? '' : 'animate-vault-rotate'} opacity-90`}
        style={{ animationDirection: 'reverse' }}
      >
        <defs>
          <radialGradient id="vaultGoldInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <circle
          cx="150"
          cy="150"
          r="60"
          stroke="url(#vaultGoldInner)"
          strokeWidth="4"
          fill="none"
          className="opacity-50"
          strokeDasharray="15 15"
        />
      </svg>
    </div>
  );
};

const VaultLock = ({ isStatic }: { isStatic: boolean }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-24 h-24">
        {/* Glow */}
        <div className={`absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(250,204,21,0.45),_transparent_70%)] blur-xl ${isStatic ? 'opacity-[0.6]' : 'animate-vault-pulse'}`} />

        {/* Lock icon */}
        <svg
          viewBox="0 0 24 24"
          className={`relative w-full h-full text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)] ${isStatic ? '' : 'animate-vault-lock-pulse'}`}
        >
          <path
            d="M12 1a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V6a5 5 0 0 0-5-5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
