import React from "react";

export const BetaTesterTitle = ({ isStatic }: { isStatic?: boolean }) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 blur-sm rounded" />
      <div className="relative px-2 py-0.5 rounded bg-black/40 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] backdrop-blur-sm flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full bg-amber-400 ${!isStatic ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent uppercase tracking-wider">
          Beta Tester
        </span>
      </div>
    </div>
  );
};
