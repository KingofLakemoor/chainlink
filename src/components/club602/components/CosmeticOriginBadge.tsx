import React from 'react';
import { SpokeOrigin } from '../types';

export interface CosmeticOriginBadgeProps {
  origin?: SpokeOrigin | string;
  className?: string;
  showIcon?: boolean;
}

const ORIGIN_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  chainlink: { label: 'ChainLink', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  scriptless: { label: 'Scriptless', bg: 'bg-[#CCFF00]/10', text: 'text-[#CCFF00]', border: 'border-[#CCFF00]/30' },
  darts: { label: 'Dart Club', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  putting: { label: 'Putting League', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  flip: { label: 'Flip Cup', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  bingo: { label: 'Bingo', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  gridiron: { label: 'Gridiron', bg: 'bg-[#C83E7D]/10', text: 'text-[#C83E7D]', border: 'border-[#C83E7D]/30' },
  core: { label: 'Club 602 Core', bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' },
};

/**
 * Origin Badge indicating which spoke app a cosmetic was earned in
 */
export const CosmeticOriginBadge: React.FC<CosmeticOriginBadgeProps> = ({
  origin = 'core',
  className = ''
}) => {
  const meta = ORIGIN_META[origin] || ORIGIN_META.core;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border} ${className}`}
    >
      {meta.label}
    </span>
  );
};
