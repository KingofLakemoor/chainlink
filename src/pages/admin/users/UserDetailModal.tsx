import React, { useState, useEffect } from 'react';
import { auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { ProfileBannerMap, AvatarRingMap } from '../../../lib/cosmetics';
import { TitleMap } from '../../../components/ui/titles';
import {
  X, Shield, UserCheck, Link2, Crown, Sparkles, RefreshCw,
  Plus, Trash2, Check, Coins, User, Shirt, Award, Eye, Flame, RotateCcw
} from 'lucide-react';

export interface UserRecord {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: 'USER' | 'ADMIN' | string;
  isTestAccount?: boolean;
  links?: number;
  isPremium?: boolean;
  premiumTier?: string;
  inventory?: string[];
  image?: string;
  createdAt?: number | string;
  stats?: {
    wins?: number;
    losses?: number;
    pushes?: number;
  };
  [key: string]: any;
}

interface UserDetailModalProps {
  user: UserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: UserRecord) => void;
}

type TabType = 'OVERVIEW' | 'CHAIN' | 'LINKS' | 'PREMIUM' | 'COSMETICS';

// Popular cosmetics inventory catalog for admin assignment
export const AVAILABLE_COSMETICS = [
  // Banners
  { id: 'banner_inferno', name: 'Inferno Banner', category: 'banner', key: 'InfernoBanner' },
  { id: 'banner_boardroom', name: 'Board Room Banner', category: 'banner', key: 'BoardRoomBanner' },
  { id: 'banner_phantom', name: 'Phantom Star Banner', category: 'banner', key: 'PhantomStarBanner' },
  { id: 'banner_emerald', name: 'Emerald Storm Banner', category: 'banner', key: 'EmeraldStormBanner' },
  { id: 'banner_opulento', name: 'Opulento Vault Banner', category: 'banner', key: 'OpulentoVaultBanner' },
  { id: 'banner_xenon', name: 'Xenon Terminal Banner', category: 'banner', key: 'XenonTerminalBanner' },
  { id: 'banner_pinktober', name: 'Pinktober', category: 'banner', key: 'PinktoberBanner' },
  { id: 'banner_task_force_camo', name: 'Task Force Camo', category: 'banner', key: 'TaskForceCamoBanner' },
  { id: 'banner_vice_city', name: 'Vice Neon', category: 'banner', key: 'ViceCityBanner' },
  { id: 'banner_midway_charge', name: 'The Midway Charge', category: 'banner', key: 'MidwayChargeBanner' },
  { id: 'banner_crescent_crown', name: 'The Crescent Crown', category: 'banner', key: 'CrescentCrownBanner' },
  { id: 'banner_gotham_mach', name: 'The Gotham Mach', category: 'banner', key: 'GothamMachBanner' },
  { id: 'banner_arc_surge', name: 'The Arc Surge', category: 'banner', key: 'ArcSurgeBanner' },
  { id: 'banner_turkey_gobbler', name: 'The Turkey Day Gobbler', category: 'banner', key: 'TurkeyGobblerBanner' },

  // Avatar Rings
  { id: 'ring_inferno', name: 'Inferno Ring', category: 'ring', key: 'Inferno' },
  { id: 'ring_hexagons', name: 'Hexagons Ring', category: 'ring', key: 'Hexagons' },
  { id: 'ring_ocean', name: 'Ocean Ring', category: 'ring', key: 'Ocean' },
  { id: 'ring_opulento', name: 'Opulento Ring', category: 'ring', key: 'OpulentoAvatarRing' },
  { id: 'ring_vice_neon', name: 'Vice Neon Ring', category: 'ring', key: 'ViceNeonAvatarRing' },

  // Titles
  { id: 'title_whale', name: 'High Roller', category: 'title', titleText: 'HIGH ROLLER' },
  { id: 'title_legend', name: 'Gridiron Legend', category: 'title', titleText: 'GRIDIRON LEGEND' },
  { id: 'title_champ', name: 'Weekly Champion', category: 'title', titleText: 'WEEKLY CHAMP' },
  { id: 'title_vip', name: 'ChainLink VIP', category: 'title', titleText: 'CHAINLINK VIP' },
  { id: 'title_vice_lord', name: 'Vice Lord', category: 'title', titleText: 'VICE LORD', key: 'ViceLordTitle' },
];

export function UserDetailModal({ user, isOpen, onClose, onUserUpdated }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(user);

  // Overview / Role state
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Links state
  const [linkAdjustment, setLinkAdjustment] = useState<number>(0);
  const [updatingLinks, setUpdatingLinks] = useState(false);

  // Premium state
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [premiumTier, setPremiumTier] = useState<string>('PRO');
  const [updatingPremium, setUpdatingPremium] = useState(false);

  // Cosmetics state
  const [inventory, setInventory] = useState<string[]>([]);
  const [cosmeticCategory, setCosmeticCategory] = useState<'all' | 'banner' | 'ring' | 'title'>('all');
  const [updatingCosmetics, setUpdatingCosmetics] = useState(false);

  // Chain state
  const [chainData, setChainData] = useState<any | null>(null);
  const [simulatedChain, setSimulatedChain] = useState<any | null>(null);
  const [allTimeSimulatedChain, setAllTimeSimulatedChain] = useState<any | null>(null);
  const [recentPicks, setRecentPicks] = useState<any[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);
  const [updatingChain, setUpdatingChain] = useState(false);
  const [editChainVal, setEditChainVal] = useState<number>(0);
  const [editBestVal, setEditBestVal] = useState<number>(0);
  const [editAllTimeBestVal, setEditAllTimeBestVal] = useState<number>(0);

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchChainDetail = async (userId: string) => {
    setLoadingChain(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/users/chain-detail?targetUserId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChainData(data.currentChain || {});
        setSimulatedChain(data.simulatedChain || {});
        setAllTimeSimulatedChain(data.allTimeSimulatedChain || {});
        setRecentPicks(data.recentPicks || []);
        setEditChainVal(data.currentChain?.chain ?? 0);
        setEditBestVal(data.currentChain?.best ?? 0);
        setEditAllTimeBestVal(data.currentChain?.allTimeBest ?? 0);
      }
    } catch (e) {
      console.error("Error loading chain detail:", e);
    } finally {
      setLoadingChain(false);
    }
  };

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setRole((user.role as 'ADMIN' | 'USER') || 'USER');
      setIsPremium(!!user.isPremium);
      setPremiumTier(user.premiumTier || 'PRO');
      setInventory(Array.isArray(user.inventory) ? user.inventory : []);
      setLinkAdjustment(0);
      setFeedback(null);
      fetchChainDetail(user.id);
    }
  }, [user]);

  if (!isOpen || !currentUser) return null;

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Role Update
  const handleRoleSave = async () => {
    if (role === currentUser.role) return;
    setUpdatingRole(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: currentUser.id, role })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update user role');

      const updated = { ...currentUser, role };
      setCurrentUser(updated);
      onUserUpdated(updated);
      showFeedback(`Role updated to ${role} successfully`, 'success');
    } catch (e: any) {
      showFeedback(e.message || 'Error updating role', 'error');
    } finally {
      setUpdatingRole(false);
    }
  };

  // 2. Links Update
  const handleLinksSave = async () => {
    if (linkAdjustment === 0) return;
    setUpdatingLinks(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/update-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: currentUser.id, amount: linkAdjustment })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update links balance');

      const updated = { ...currentUser, links: data.newLinks };
      setCurrentUser(updated);
      onUserUpdated(updated);
      setLinkAdjustment(0);
      showFeedback(`Links balance updated to ${data.newLinks.toLocaleString()}`, 'success');
    } catch (e: any) {
      showFeedback(e.message || 'Error updating links balance', 'error');
    } finally {
      setUpdatingLinks(false);
    }
  };

  // 3. Premium Status Update
  const handlePremiumSave = async () => {
    setUpdatingPremium(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/update-premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: currentUser.id,
          isPremium,
          premiumTier: isPremium ? premiumTier : undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update premium status');

      const updated = { ...currentUser, isPremium, premiumTier: isPremium ? premiumTier : undefined };
      setCurrentUser(updated);
      onUserUpdated(updated);
      showFeedback(`Premium status updated to ${isPremium ? premiumTier : 'Standard'}`, 'success');
    } catch (e: any) {
      showFeedback(e.message || 'Error updating premium status', 'error');
    } finally {
      setUpdatingPremium(false);
    }
  };

  // 4. Cosmetics Toggle / Save
  const handleToggleCosmeticItem = (itemId: string) => {
    if (inventory.includes(itemId)) {
      setInventory(prev => prev.filter(id => id !== itemId));
    } else {
      setInventory(prev => [...prev, itemId]);
    }
  };

  const handleCosmeticsSave = async () => {
    setUpdatingCosmetics(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/update-cosmetics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: currentUser.id,
          inventory
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update cosmetics inventory');

      const updated = { ...currentUser, inventory };
      setCurrentUser(updated);
      onUserUpdated(updated);
      showFeedback(`User inventory updated (${inventory.length} items)`, 'success');
    } catch (e: any) {
      showFeedback(e.message || 'Error updating cosmetics', 'error');
    } finally {
      setUpdatingCosmetics(false);
    }
  };

  const handleRebuildChain = async (scope: 'currentMonth' | 'allTime' = 'currentMonth') => {
    const scopeLabel = scope === 'currentMonth' ? 'Current Month (Active Season)' : 'All-Time Lifetime Picks';
    if (!confirm(`Rebuild chain from ${scopeLabel} for @${currentUser.username || currentUser.name}? This will replay resolved picks chronologically.`)) {
      return;
    }
    setUpdatingChain(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/rebuild-chain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: currentUser.id, scope })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to rebuild chain');

      setChainData(data.updatedChain);
      setEditChainVal(data.updatedChain.chain);
      setEditBestVal(data.updatedChain.best);
      setEditAllTimeBestVal(data.updatedChain.allTimeBest);
      showFeedback(`Chain recalculated (${scope}): Current ${data.updatedChain.chain > 0 ? 'W' + data.updatedChain.chain : data.updatedChain.chain < 0 ? 'L' + Math.abs(data.updatedChain.chain) : '0'}, Best ${data.updatedChain.best}`, 'success');
      fetchChainDetail(currentUser.id);
    } catch (e: any) {
      showFeedback(e.message || 'Error rebuilding chain', 'error');
    } finally {
      setUpdatingChain(false);
    }
  };

  const handleChainSave = async () => {
    setUpdatingChain(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/update-chain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: currentUser.id,
          chain: editChainVal,
          best: editBestVal,
          allTimeBest: editAllTimeBestVal
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update chain');

      setChainData(data.updatedChain);
      showFeedback(`Chain updated successfully: ${editChainVal > 0 ? 'W' + editChainVal : editChainVal < 0 ? 'L' + Math.abs(editChainVal) : '0'}`, 'success');
    } catch (e: any) {
      showFeedback(e.message || 'Error saving chain', 'error');
    } finally {
      setUpdatingChain(false);
    }
  };

  const formatDate = (val?: number | string) => {
    if (!val) return 'N/A';
    return new Date(val).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const currentLinks = currentUser.links || 0;
  const projectedLinks = currentLinks + linkAdjustment;

  const filteredCosmeticsCatalog = AVAILABLE_COSMETICS.filter(c => {
    if (cosmeticCategory === 'all') return true;
    return c.category === cosmeticCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto custom-scrollbar">
      <div className="bg-[#18181A] border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 bg-zinc-900/80 border-b border-zinc-800 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <FirebaseImage
                fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
                src={currentUser.image || ''}
                alt=""
                className="w-14 h-14 rounded-full bg-zinc-800 object-cover border-2 border-zinc-700"
              />
              {currentUser.isPremium && (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-black p-1 rounded-full shadow">
                  <Crown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-display text-white">{currentUser.name || 'Anonymous User'}</h3>
                {currentUser.isTestAccount && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    TEST ACCOUNT
                  </span>
                )}
              </div>
              <div className="text-sm text-zinc-400 flex items-center gap-2 mt-0.5">
                <span>@{currentUser.username || 'user'}</span>
                <span>•</span>
                <span className="font-mono text-xs text-zinc-500">{currentUser.id}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 bg-zinc-900/40 border-b border-zinc-800 flex gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'OVERVIEW'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-4 h-4" /> Overview & Role
          </button>

          <button
            onClick={() => setActiveTab('CHAIN')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'CHAIN'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-4 h-4" /> Chain & Streaks
          </button>

          <button
            onClick={() => setActiveTab('LINKS')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'LINKS'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Link2 className="w-4 h-4" /> Links & Balance
          </button>

          <button
            onClick={() => setActiveTab('PREMIUM')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'PREMIUM'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-4 h-4" /> Premium / Pro
          </button>

          <button
            onClick={() => setActiveTab('COSMETICS')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'COSMETICS'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Cosmetics Inventory
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">

          {/* TAB 1: OVERVIEW & ROLE */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Email Address</span>
                  <div className="text-sm font-semibold text-white truncate">{currentUser.email || 'No email associated'}</div>
                </div>

                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Account Created</span>
                  <div className="text-sm font-semibold text-white">{formatDate(currentUser.createdAt)}</div>
                </div>

                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Pick 'Em Record (W-L-P)</span>
                  <div className="text-sm font-mono font-bold text-cyan-400">
                    {currentUser.stats?.wins || 0} Wins • {currentUser.stats?.losses || 0} Losses • {currentUser.stats?.pushes || 0} Pushes
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Inventory Count</span>
                  <div className="text-sm font-semibold text-purple-400">
                    {inventory.length} cosmetic items unlocked
                  </div>
                </div>
              </div>

              {/* Role Configuration */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" /> Administrative Role
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Admins receive unrestricted access to all admin tools, match controls, and contest settings.
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    role === 'ADMIN'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {role}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
                  >
                    <option value="USER">USER (Standard Member)</option>
                    <option value="ADMIN">ADMIN (Full Control)</option>
                  </select>

                  <Button
                    onClick={handleRoleSave}
                    disabled={updatingRole || role === currentUser.role}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-2"
                  >
                    {updatingRole ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    Save Role Change
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHAIN & STREAKS */}
          {activeTab === 'CHAIN' && (
            <div className="space-y-6">
              {loadingChain ? (
                <div className="flex items-center justify-center p-12 text-zinc-400 gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                  <span>Loading streak and pick history...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Live Firestore Chain */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-medium">Live Active Streak</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">Current DB State</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-mono font-black ${
                          (chainData?.chain || 0) > 0 ? 'text-emerald-400' : (chainData?.chain || 0) < 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {(chainData?.chain || 0) > 0 ? `W${chainData.chain}` : (chainData?.chain || 0) < 0 ? `L${Math.abs(chainData.chain)}` : '0'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">({chainData?.chain || 0})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs">
                        <div>
                          <div className="text-zinc-500">Season Best</div>
                          <div className="font-mono font-bold text-amber-400">W{chainData?.best || 0}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">All-Time Best</div>
                          <div className="font-mono font-bold text-amber-300">W{chainData?.allTimeBest || 0}</div>
                        </div>
                      </div>
                    </div>

                    {/* Current Month Simulated */}
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-5 space-y-3 bg-amber-500/[0.02]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400 font-medium">Current Month Streak</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Active Contest
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-mono font-black ${
                          (simulatedChain?.chain || 0) > 0 ? 'text-emerald-400' : (simulatedChain?.chain || 0) < 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {(simulatedChain?.chain || 0) > 0 ? `W${simulatedChain.chain}` : (simulatedChain?.chain || 0) < 0 ? `L${Math.abs(simulatedChain.chain)}` : '0'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">({simulatedChain?.chain || 0})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs">
                        <div>
                          <div className="text-zinc-500">Month Best</div>
                          <div className="font-mono font-bold text-amber-400">W{simulatedChain?.best || 0}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Picks (W/L)</div>
                          <div className="font-mono font-bold text-zinc-300">{simulatedChain?.wins || 0}W - {simulatedChain?.losses || 0}L</div>
                        </div>
                      </div>
                    </div>

                    {/* All-Time Lifetime Simulated */}
                    <div className="bg-zinc-900 border border-cyan-500/30 rounded-xl p-5 space-y-3 bg-cyan-500/[0.02]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-cyan-400 font-medium">All-Time Lifetime Streak</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          All History
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-mono font-black ${
                          (allTimeSimulatedChain?.chain || 0) > 0 ? 'text-emerald-400' : (allTimeSimulatedChain?.chain || 0) < 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {(allTimeSimulatedChain?.chain || 0) > 0 ? `W${allTimeSimulatedChain.chain}` : (allTimeSimulatedChain?.chain || 0) < 0 ? `L${Math.abs(allTimeSimulatedChain.chain)}` : '0'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">({allTimeSimulatedChain?.chain || 0})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs">
                        <div>
                          <div className="text-zinc-500">Lifetime Best</div>
                          <div className="font-mono font-bold text-amber-400">W{allTimeSimulatedChain?.best || 0}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Lifetime Picks</div>
                          <div className="font-mono font-bold text-zinc-300">{allTimeSimulatedChain?.wins || 0}W - {allTimeSimulatedChain?.losses || 0}L</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rebuild Actions (Current Month vs All-Time) */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" /> Rebuild Chain from Pick History
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Re-evaluates picks in exact chronological sequence. Choose whether to rebuild for the current monthly season (standard leaderboard streak) or lifetime history.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => handleRebuildChain('currentMonth')}
                        disabled={updatingChain}
                        className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs px-4 py-2"
                      >
                        {updatingChain ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        Rebuild Current Month
                      </Button>
                      <Button
                        onClick={() => handleRebuildChain('allTime')}
                        disabled={updatingChain}
                        variant="outline"
                        className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs px-3 py-2"
                      >
                        Rebuild All-Time
                      </Button>
                    </div>
                  </div>

                  {/* Recent Resolved Picks Timeline */}
                  {recentPicks && recentPicks.length > 0 && (
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          Recent Resolved Picks Timeline (Most Recent First)
                        </h5>
                        <span className="text-[10px] text-zinc-500 font-mono">Showing last {recentPicks.length} picks</span>
                      </div>
                      <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto custom-scrollbar">
                        {recentPicks.map((p, idx) => (
                          <div key={p.id || idx} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded font-black font-mono text-[10px] ${
                                p.status === 'WIN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                p.status === 'LOSS' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {p.status}
                              </span>
                              <span className="font-medium text-white">{p.pickName}</span>
                            </div>
                            <span className="text-zinc-500 font-mono text-[11px]">
                              {p.createdAt ? new Date(p.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Adjustment Form */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" /> Manual Streak Adjustment
                    </h4>
                    <p className="text-xs text-zinc-400">
                      If needed, you can explicitly set the streak integers (e.g. positive 3 for W3, negative 2 for L2).
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1 font-medium">
                          Current Chain (+W / -L)
                        </label>
                        <input
                          type="number"
                          value={editChainVal}
                          onChange={(e) => setEditChainVal(parseInt(e.target.value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-zinc-700"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-1 font-medium">
                          Season Best (Win Streak)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editBestVal}
                          onChange={(e) => setEditBestVal(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-zinc-700"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 block mb-1 font-medium">
                          All-Time Best
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editAllTimeBestVal}
                          onChange={(e) => setEditAllTimeBestVal(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleChainSave}
                        disabled={updatingChain}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-2"
                      >
                        {updatingChain ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        Save Streak Values
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: LINKS & BALANCE */}
          {activeTab === 'LINKS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="text-xs text-zinc-400 font-medium">Current Links Balance</div>
                  <div className="text-3xl font-mono font-extrabold text-cyan-400 mt-1 flex items-center gap-2">
                    <Coins className="w-6 h-6" />
                    {currentLinks.toLocaleString()}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="text-xs text-zinc-400 font-medium">Projected New Balance</div>
                  <div className={`text-3xl font-mono font-extrabold mt-1 ${
                    projectedLinks < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {projectedLinks.toLocaleString()} Links
                  </div>
                </div>
              </div>

              {/* Adjust Presets */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-cyan-400" /> Quick Preset Adjustments
                </h4>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[100, 500, 1000, 5000, -100, -500].map(val => (
                    <button
                      key={val}
                      onClick={() => setLinkAdjustment(prev => prev + val)}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        val > 0
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      {val > 0 ? `+${val.toLocaleString()}` : val.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs text-zinc-400 mb-1">Custom Adjustment Amount</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={linkAdjustment}
                      onChange={(e) => setLinkAdjustment(Number(e.target.value))}
                      placeholder="e.g. +500 or -250"
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setLinkAdjustment(0)}
                      className="border-zinc-800 text-zinc-400 hover:text-white text-xs"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleLinksSave}
                      disabled={updatingLinks || linkAdjustment === 0}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs px-5"
                    >
                      {updatingLinks ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                      Apply Adjustment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREMIUM / PRO STATUS */}
          {activeTab === 'PREMIUM' && (
            <div className="space-y-6">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" /> Membership Tier
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Pro members receive premium badge highlights, custom cosmetic shop items, and bonus links multipliers.
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    isPremium
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {isPremium ? premiumTier : 'STANDARD MEMBER'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={isPremium}
                      onChange={(e) => setIsPremium(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-zinc-800 border-zinc-700"
                    />
                    <span className="font-semibold">Enable Pro Membership</span>
                  </label>

                  {isPremium && (
                    <select
                      value={premiumTier}
                      onChange={(e) => setPremiumTier(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
                    >
                      <option value="PRO">Pro Member</option>
                      <option value="VIP">VIP Founding Member</option>
                      <option value="ELITE">Elite Tier</option>
                    </select>
                  )}

                  <Button
                    onClick={handlePremiumSave}
                    disabled={updatingPremium}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2.5"
                  >
                    {updatingPremium ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    Save Premium Status
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COSMETICS INVENTORY */}
          {activeTab === 'COSMETICS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase">Category:</span>
                  {(['all', 'banner', 'ring', 'title'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCosmeticCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                        cosmeticCategory === cat
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleCosmeticsSave}
                  disabled={updatingCosmetics}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2"
                >
                  {updatingCosmetics ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Save Cosmetics Inventory ({inventory.length})
                </Button>
              </div>

              {/* Catalog Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredCosmeticsCatalog.map(item => {
                  const isUnlocked = inventory.includes(item.id);
                  const BannerComponent = item.category === 'banner' && item.key ? ProfileBannerMap[item.key] : null;
                  const RingComponent = item.category === 'ring' && item.key ? AvatarRingMap[item.key] : null;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isUnlocked
                          ? 'bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/10'
                          : 'bg-zinc-900/60 border-zinc-800 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-purple-400">{item.category}</div>
                          <div className="text-sm font-bold text-white">{item.name}</div>
                        </div>

                        <button
                          onClick={() => handleToggleCosmeticItem(item.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            isUnlocked
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {isUnlocked ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                          {isUnlocked ? 'Unlocked' : 'Grant Item'}
                        </button>
                      </div>

                      {/* Visual Preview */}
                      <div className="h-16 bg-zinc-950 rounded-lg border border-zinc-800/80 overflow-hidden flex items-center justify-center relative p-2">
                        {item.category === 'banner' && BannerComponent && (
                          <div className="w-full h-full relative rounded overflow-hidden">
                            <BannerComponent isStatic={true} />
                          </div>
                        )}

                        {item.category === 'ring' && RingComponent && (
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            <RingComponent className="w-12 h-12 absolute inset-0" />
                            <div className="w-8 h-8 rounded-full bg-zinc-800" />
                          </div>
                        )}

                        {item.category === 'title' && (
                          (item.key && TitleMap[item.key]) || TitleMap[item.id] ? (
                            <div className="transform scale-90">
                              {React.createElement((item.key && TitleMap[item.key]) || TitleMap[item.id], { isStatic: true })}
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black tracking-widest font-display">
                              {item.titleText || item.name}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
