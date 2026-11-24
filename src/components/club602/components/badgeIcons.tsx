import React from 'react';
import {
  Star,
  Shield,
  Flame,
  Zap,
  Diamond,
  Crown,
  Palmtree,
  Heart,
  Martini,
  Gem,
  Skull,
  Ghost,
  Sword,
  Scissors,
  Shirt,
  Eye,
  Key,
  Target,
  Trophy,
  Medal,
  Sparkles,
  Axe,
  Compass,
} from 'lucide-react';

/**
 * Standard registry of badge icons supported across Club 602 spokes
 */
export const BADGE_ICONS: Record<string, React.ReactNode> = {
  // Scriptless / Core Badges
  Star: <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />,
  Shield: <Shield className="w-4 h-4 text-blue-400" />,
  Flame: <Flame className="w-4 h-4 text-red-500 fill-red-500" />,
  Zap: <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />,
  Diamond: <Diamond className="w-4 h-4 text-cyan-300 fill-cyan-300" />,
  Crown: <Crown className="w-4 h-4 text-[#bf953f] fill-[#bf953f]" />,
  Palmtree: <Palmtree className="w-4 h-4 text-emerald-400" />,
  Heart: <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />,
  Martini: <Martini className="w-4 h-4 text-emerald-300" />,
  Lips: (
    <span className="text-[14px] leading-none inline-flex items-center justify-center">
      💋
    </span>
  ),
  Gem: <Gem className="w-4 h-4 text-purple-500 fill-purple-500" />,
  FaithfulShield: (
    <Shield className="w-4 h-4 text-slate-300 fill-slate-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
  ),
  Dagger: (
    <Sword className="w-4 h-4 text-[#ff2056] fill-[#ff2056] rotate-45 drop-shadow-[0_0_6px_rgba(255,32,86,0.8)]" />
  ),
  Skull: (
    <Skull className="w-4 h-4 text-purple-500 fill-purple-950/40 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
  ),
  Ghost: (
    <Ghost className="w-4 h-4 text-slate-400 fill-slate-800/40 drop-shadow-[0_0_6px_rgba(200,200,200,0.5)]" />
  ),
  CrownGold: (
    <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
  ),
  Scissors: (
    <Scissors className="w-4 h-4 text-zinc-400 drop-shadow-[0_0_6px_rgba(161,161,170,0.5)]" />
  ),
  Shirt: (
    <Shirt className="w-4 h-4 text-pink-400 fill-pink-900/40 drop-shadow-[0_0_6px_rgba(244,114,182,0.8)]" />
  ),
  Eye: (
    <Eye className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
  ),
  Key: (
    <Key className="w-4 h-4 text-yellow-500 fill-yellow-600/40 drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
  ),

  // Darts / Putting / Competition Badges
  Target: <Target className="w-4 h-4 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />,
  Trophy: <Trophy className="w-4 h-4 text-amber-400 fill-amber-400/30 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />,
  Medal: <Medal className="w-4 h-4 text-yellow-500" />,
  Sparkles: <Sparkles className="w-4 h-4 text-cyan-400" />,

  // Gridiron Exotics Badges
  Axe: <Axe className="w-4 h-4 text-[#C83E7D] drop-shadow-[0_0_6px_rgba(200,62,125,0.8)]" />,
  Compass: <Compass className="w-4 h-4 text-[#3DA2A5] drop-shadow-[0_0_6px_rgba(61,162,165,0.8)]" />,
};

export function getBadgeNode(badgeKey?: string): React.ReactNode | null {
  if (!badgeKey || badgeKey === 'None' || badgeKey === 'badge_none') return null;
  return BADGE_ICONS[badgeKey] || null;
}
