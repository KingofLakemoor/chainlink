import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Settings, Download, Coins, Tag, ShoppingCart, Search, Sparkles, Check, X, RefreshCw } from 'lucide-react';
import { getShopItemsCached } from '../../lib/firestore-cache';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { requestNotificationPermission } from '../../hooks/useNotifications';
import { Link } from 'react-router-dom';
import { CosmeticPreview } from './CosmeticPreview';
import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../ui/titles';
import { FirebaseImage } from '../ui/FirebaseImage';

export function ProfileSettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user, profile } = useAuth();
  const { isInstallable, promptInstall } = useInstallPrompt();

  const [activeTab, setActiveTab] = useState<'inventory' | 'settings'>('inventory');

  // Account settings form states
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error', text: React.ReactNode } | null>(null);

  // Inventory & cosmetics states
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [equipLoading, setEquipLoading] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PROFILE_BANNER' | 'AVATAR_RING' | 'TITLE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && profile) {
      setNewUsername(profile.username || '');
      setNewName(profile.name || '');
      setNotificationsEnabled(profile.notificationsEnabled !== false);
    }
  }, [isOpen, profile?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchCatalog = async () => {
      try {
        setInventoryLoading(true);
        const items = await getShopItemsCached();
        setCatalogItems(items);
      } catch (e) {
        console.error("Error fetching cosmetics catalog", e);
      } finally {
        setInventoryLoading(false);
      }
    };
    fetchCatalog();
  }, [isOpen]);

  const handleUpdateInfo = async () => {
    if (!user) return;
    setUpdatingSettings(true);
    setSettingsMessage(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      const trimmedUsername = newUsername.trim();
      const trimmedName = newName.trim();

      if (!trimmedUsername) throw new Error("Username cannot be empty.");
      if (!trimmedName) throw new Error("Display Name cannot be empty.");
      if (trimmedUsername.length < 3) throw new Error("Username must be at least 3 characters.");
      if (trimmedUsername.length > 20) throw new Error("Username must be 20 characters or less.");
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) throw new Error("Username can only contain letters, numbers, and underscores.");

      let token = await auth.currentUser?.getIdToken();
      if (trimmedUsername.toLowerCase() !== profile?.username?.toLowerCase()) {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(trimmedUsername)}&excludeUid=${encodeURIComponent(user.uid)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to check username availability.");
        const data = await res.json();
        if (data.exists) throw new Error("Username is already taken.");
      }

      if (notificationsEnabled) {
        await requestNotificationPermission(user.uid, profile);
      }

      const updateData: any = {
        username: trimmedUsername,
        usernameLower: trimmedUsername.toLowerCase(),
        name: trimmedName,
        notificationsEnabled,
        updatedAt: Date.now()
      };

      if (!notificationsEnabled) {
        updateData.fcmTokens = [];
      }

      await updateDoc(userRef, updateData);
      setSettingsMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || "Failed to update profile." });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSettingsMessage({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || "Failed to send reset email." });
    }
  };

  const handleEquip = async (itemId: string | null, type: string) => {
    if (!user || !profile) return;
    setEquipLoading(type);
    try {
      const updatedCosmetics = { ...(profile.equippedCosmetics || {}) };
      if (itemId === null) {
        delete updatedCosmetics[type];
      } else {
        updatedCosmetics[type] = itemId;
      }
      await updateDoc(doc(db, 'users', user.uid), { equippedCosmetics: updatedCosmetics });
    } catch (err) {
      console.error("Failed to equip item", err);
      alert("Failed to equip item.");
    } finally {
      setEquipLoading(null);
    }
  };

  // Consolidate all owned item IDs across inventory, purchasedItems, and titles arrays
  const ownedIds = Array.from(new Set([
    ...(profile?.inventory || []),
    ...(profile?.purchasedItems || []),
    ...(profile?.titles || [])
  ]));

  // Build complete list of owned item objects with dynamic fallbacks for any unrecognized IDs
  const userInventoryItems = ownedIds.map(invId => {
    let item = catalogItems.find(i => i.id === invId);
    if (!item) {
      let type = 'PROFILE_BANNER';
      if (invId.startsWith('ring_')) type = 'AVATAR_RING';
      else if (invId.startsWith('title_')) type = 'TITLE';
      else if (invId.startsWith('merch_')) type = 'MERCH';

      const formattedName = invId
        .replace(/^(banner_|ring_|title_|merch_)/, '')
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      item = {
        id: invId,
        name: formattedName,
        description: 'Unlocked cosmetic item in your collection',
        type,
        cost: 0,
        image: invId,
        active: true
      };
    }
    return item;
  });

  // Filter items based on category tabs and search keyword
  const filteredInventory = userInventoryItems.filter(item => {
    if (!item) return false;
    const matchesCategory = categoryFilter === 'ALL' || item.type === categoryFilter;
    const matchesSearch =
      !searchTerm ||
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Equipped cosmetic item lookups
  const equippedBannerId = profile?.equippedCosmetics?.PROFILE_BANNER;
  const equippedRingId = profile?.equippedCosmetics?.AVATAR_RING;
  const equippedTitleId = profile?.equippedCosmetics?.TITLE;

  const equippedBannerItem = userInventoryItems.find(i => i.id === equippedBannerId) || (equippedBannerId ? { id: equippedBannerId, type: 'PROFILE_BANNER', image: equippedBannerId, name: 'Banner' } : null);
  const equippedRingItem = userInventoryItems.find(i => i.id === equippedRingId) || (equippedRingId ? { id: equippedRingId, type: 'AVATAR_RING', image: equippedRingId, name: 'Ring' } : null);
  const equippedTitleItem = userInventoryItems.find(i => i.id === equippedTitleId) || (equippedTitleId ? { id: equippedTitleId, type: 'TITLE', image: equippedTitleId, name: 'Title' } : null);

  // Resolution order: evaluate item.id FIRST in component maps so React shader/badge components render properly
  const BannerComp = equippedBannerItem ? (ProfileBannerMap[equippedBannerItem.id] || ProfileBannerMap[equippedBannerItem.image || '']) : null;
  const RingComp = equippedRingItem ? (AvatarRingMap[equippedRingItem.id] || AvatarRingMap[equippedRingItem.image || '']) : null;
  const TitleComp = equippedTitleItem ? (TitleMap[equippedTitleItem.id] || TitleMap[equippedTitleItem.image || ''] || TitleMap[equippedTitleItem.preview || '']) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6 max-h-[82vh] overflow-y-auto custom-scrollbar pr-1">
        
        {/* Top Header & Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'inventory'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Cosmetics & Inventory
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                {userInventoryItems.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-zinc-100 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Account Settings
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs font-bold font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-xl">
              <Coins className="w-3.5 h-3.5" />
              {(profile?.links || 0).toLocaleString()} Links
            </div>
            <Link to="/shop" onClick={onClose}>
              <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40 text-xs font-bold h-7 px-2.5 flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                Store
              </Button>
            </Link>
          </div>
        </div>

        {/* TAB 1: COSMETICS & INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">

            {/* Live Profile Header Preview Box */}
            <div className="bg-[#121212] border border-cyan-500/30 rounded-2xl p-4 relative overflow-hidden shadow-xl bg-gradient-to-r from-cyan-950/20 via-[#121212] to-[#121212]">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Live Equipped Profile Preview
                </span>
                <span className="text-zinc-500 font-normal hidden sm:inline">Click items below to toggle equip status</span>
              </div>

              <div className="relative rounded-xl border border-zinc-800 p-4 flex flex-col sm:flex-row items-center gap-4 overflow-hidden bg-zinc-950/80 min-h-[120px]">
                {/* Banner Layer */}
                {BannerComp ? (
                  <div className="absolute inset-0 z-0">
                    <BannerComp isStatic={true} />
                  </div>
                ) : (equippedBannerItem?.image?.startsWith('/') || equippedBannerItem?.image?.startsWith('http') || equippedBannerItem?.image?.startsWith('gs://')) ? (
                  <FirebaseImage src={equippedBannerItem.image} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
                ) : (
                  <div className={`absolute inset-0 z-0 ${equippedBannerItem?.image || 'bg-gradient-to-r from-zinc-900 to-zinc-950'}`} />
                )}

                {/* Avatar & Ring Layer */}
                <div className="relative z-10 shrink-0">
                  {RingComp && (
                    <div className="absolute inset-0 z-0 transform scale-[1.3] pointer-events-none">
                      <RingComp isStatic={true} />
                    </div>
                  )}
                  <div className={`w-20 h-20 rounded-full shadow-lg z-10 relative flex items-center justify-center overflow-hidden border-2 ${RingComp ? 'border-black/60' : 'border-zinc-700'}`}>
                    {profile?.image ? (
                      <FirebaseImage src={profile.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-300">
                        {(profile?.username || profile?.name)?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info & Equipped Slots */}
                <div className="relative z-10 text-center sm:text-left min-w-0 flex-1">
                  <h4 className="text-2xl font-black text-white drop-shadow-md truncate font-display">
                    {profile?.username || profile?.name}
                  </h4>

                  {TitleComp ? (
                    <div className="mt-1 inline-block">
                      <TitleComp isStatic={true} />
                    </div>
                  ) : equippedTitleItem ? (
                    <div className="mt-1 inline-block">
                      <span className="text-xs font-bold text-[#22c55e] px-2.5 py-0.5 rounded bg-black/60 border border-[#22c55e]/30 shadow-sm font-display">
                        {equippedTitleItem.name}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 italic mt-1">No title equipped</div>
                  )}

                  {/* Active Equipped Slot Badges with 1-click Unequip */}
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {equippedBannerItem && (
                      <button
                        onClick={() => handleEquip(null, 'PROFILE_BANNER')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/40 hover:bg-red-950/60 hover:text-red-300 hover:border-red-500/40 transition-colors flex items-center gap-1 group"
                        title="Click to unequip banner"
                      >
                        <span>Banner: {equippedBannerItem.name}</span>
                        <X className="w-3 h-3 group-hover:scale-110" />
                      </button>
                    )}

                    {equippedRingItem && (
                      <button
                        onClick={() => handleEquip(null, 'AVATAR_RING')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/40 hover:bg-red-950/60 hover:text-red-300 hover:border-red-500/40 transition-colors flex items-center gap-1 group"
                        title="Click to unequip ring"
                      >
                        <span>Ring: {equippedRingItem.name}</span>
                        <X className="w-3 h-3 group-hover:scale-110" />
                      </button>
                    )}

                    {equippedTitleItem && (
                      <button
                        onClick={() => handleEquip(null, 'TITLE')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-emerald-300 border border-emerald-500/40 hover:bg-red-950/60 hover:text-red-300 hover:border-red-500/40 transition-colors flex items-center gap-1 group"
                        title="Click to unequip title"
                      >
                        <span>Title: {equippedTitleItem.name}</span>
                        <X className="w-3 h-3 group-hover:scale-110" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Category Filters & Search Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
              <div className="flex flex-wrap items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    categoryFilter === 'ALL'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({userInventoryItems.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('PROFILE_BANNER')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    categoryFilter === 'PROFILE_BANNER'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Banners ({userInventoryItems.filter(i => i?.type === 'PROFILE_BANNER').length})
                </button>
                <button
                  onClick={() => setCategoryFilter('AVATAR_RING')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    categoryFilter === 'AVATAR_RING'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Rings ({userInventoryItems.filter(i => i?.type === 'AVATAR_RING').length})
                </button>
                <button
                  onClick={() => setCategoryFilter('TITLE')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    categoryFilter === 'TITLE'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Titles ({userInventoryItems.filter(i => i?.type === 'TITLE').length})
                </button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Inventory Items Grid */}
            {inventoryLoading ? (
              <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading your cosmetics collection...</span>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                <Tag className="w-8 h-8 text-zinc-600 mx-auto" />
                <div>
                  <h4 className="text-base font-bold text-zinc-200">No cosmetics found</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                    {searchTerm ? "No inventory items match your filter criteria." : "You haven't unlocked or purchased any cosmetics in this category yet."}
                  </p>
                </div>
                <Link to="/shop" onClick={onClose} className="inline-block pt-1">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Visit Shop to Unlock
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredInventory.map(item => {
                  if (!item) return null;
                  const isEquipped = profile?.equippedCosmetics?.[item.type] === item.id;
                  const isUpdating = equipLoading === item.type;

                  return (
                    <div
                      key={item.id}
                      className={`bg-[#121212] border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-lg ${
                        isEquipped
                          ? 'border-cyan-500/60 bg-gradient-to-br from-cyan-950/30 via-[#121212] to-[#121212] shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                          : 'border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header badge & title */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-white text-base leading-snug">{item.name}</h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                            {item.type?.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Static Image / Shader Preview */}
                        <div className="h-28 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative">
                          <CosmeticPreview
                            item={item}
                            isStatic={true}
                            userImage={profile?.image}
                            username={profile?.username || profile?.name}
                          />
                        </div>

                        {/* Description */}
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                          {item.description || 'Custom unlocked cosmetic.'}
                        </p>
                      </div>

                      {/* Equip / Unequip Toggle Action */}
                      <div className="pt-4 mt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        {isEquipped ? (
                          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-cyan-400" /> Equipped
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Available</span>
                        )}

                        <Button
                          onClick={() => handleEquip(isEquipped ? null : item.id, item.type)}
                          disabled={isUpdating}
                          variant={isEquipped ? "destructive" : "default"}
                          size="sm"
                          className={isEquipped
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold'
                            : 'bg-zinc-800 hover:bg-cyan-600 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-bold'
                          }
                        >
                          {isUpdating ? 'Updating...' : isEquipped ? 'Unequip' : 'Equip Item'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACCOUNT SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Settings className="w-5 h-5 text-zinc-400" /> Account Settings
            </h3>

            <div className="space-y-4">
              {settingsMessage && (
                <div className={`p-3 rounded-lg text-sm font-medium ${settingsMessage.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {settingsMessage.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
                <Input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Display Name</label>
                <Input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div>
                  <h4 className="text-sm font-medium text-zinc-200">Push Notifications</h4>
                  <p className="text-xs text-zinc-500">Receive alerts for picks and payouts.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={handleUpdateInfo} disabled={updatingSettings} className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-white font-bold">
                  {updatingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button onClick={handlePasswordReset} variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                  Reset Password
                </Button>
              </div>

              {isInstallable && (
                <div className="mt-4 p-4 border border-cyan-900/50 bg-cyan-950/20 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-cyan-400">Install App</h4>
                    <p className="text-xs text-zinc-400">Install ChainLink for a better mobile experience.</p>
                  </div>
                  <Button onClick={promptInstall} size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                    <Download className="w-4 h-4 mr-2" /> Install
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
