import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, limit } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { ProfileBannerMap, AvatarRingMap } from '../../../lib/cosmetics';
import { Search, Tag, Sparkles, RefreshCw, ShoppingBag, Users, CheckCircle2, XCircle, ChevronLeft, ShieldAlert } from 'lucide-react';
import shopItemsData from '../../../../shop_items.json';

export default function UserCosmeticsAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>(shopItemsData);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cosmeticSearchTerm, setCosmeticSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const fetchUsersAndItems = async () => {
    setLoading(true);
    try {
      const [usersSnap, shopSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), limit(300))),
        getDocs(collection(db, 'shopItems'))
      ]);

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (!shopSnap.empty) {
        const liveItems = shopSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        liveItems.sort((a: any, b: any) => (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id));
        setShopItems(liveItems);
      }
    } catch (e) {
      console.error("Error fetching users or shop items for cosmetics admin:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndItems();
  }, []);

  const handleToggleCosmetic = async (targetUserId: string, cosmeticId: string, hasCosmetic: boolean) => {
    const user = users.find(u => u.id === targetUserId);
    if (!user) return;

    setUpdatingItemId(cosmeticId);

    let newInventory: string[];
    if (hasCosmetic) {
      newInventory = (user.inventory || []).filter((id: string) => id !== cosmeticId);
    } else {
      newInventory = Array.from(new Set([...(user.inventory || []), cosmeticId]));
    }

    try {
      let updated = false;

      // Try backend admin endpoint first
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch('/api/admin/users/update-cosmetics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetUserId, inventory: newInventory })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            updated = true;
          }
        } catch (apiErr) {
          console.warn("Backend API update-cosmetics failed, falling back to direct Firestore:", apiErr);
        }
      }

      // Fallback to direct client Firestore SDK
      if (!updated) {
        const userRef = doc(db, 'users', targetUserId);
        await updateDoc(userRef, { inventory: newInventory, updatedAt: Date.now() });
      }

      // Update state
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, inventory: newInventory } : u));
      if (selectedUser && selectedUser.id === targetUserId) {
        setSelectedUser((prev: any) => prev ? { ...prev, inventory: newInventory } : null);
      }
    } catch (e: any) {
      console.error("Failed to update user cosmetics:", e);
      alert('Failed to update cosmetics: ' + e.message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredShopItems = shopItems.filter(item => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase()) ||
      (item.type || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'PROFILE_BANNER') return item.type === 'PROFILE_BANNER';
    if (categoryFilter === 'AVATAR_RING') return item.type === 'AVATAR_RING';
    if (categoryFilter === 'TITLE') return item.type === 'TITLE';
    if (categoryFilter === 'MERCH') return item.type === 'MERCH';
    return true;
  });

  const totalUsersCount = users.length;
  const usersWithCosmetics = users.filter(u => (u.inventory || []).length > 0).length;
  const totalAssignedCosmetics = users.reduce((sum, u) => sum + ((u.inventory || []).length), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
            <Tag className="w-8 h-8 text-emerald-400" />
            User Cosmetics Admin
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Directly assign or revoke shop cosmetics (Banners, Avatar Rings, Titles, Merch) for users.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchUsersAndItems}
          disabled={loading}
          className="border-zinc-800 bg-[#18181A] hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Accounts</span>
              <span className="text-3xl font-black font-display text-white mt-1 block">{totalUsersCount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/40 text-zinc-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Loaded user documents</p>
        </div>

        <div className="bg-[#18181A] border border-emerald-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-emerald-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Users with Cosmetics</span>
              <span className="text-3xl font-black font-display text-emerald-300 mt-1 block">{usersWithCosmetics.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-3">Has items in inventory</p>
        </div>

        <div className="bg-[#18181A] border border-cyan-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-cyan-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">Assigned Items</span>
              <span className="text-3xl font-black font-display text-cyan-300 mt-1 block">{totalAssignedCosmetics.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-3">Total items across all users</p>
        </div>

        <div className="bg-[#18181A] border border-amber-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-amber-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Active Shop Catalog</span>
              <span className="text-3xl font-black font-display text-amber-300 mt-1 block">{shopItems.length}</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-3">Items available in shop catalog</p>
        </div>
      </div>

      {!selectedUser ? (
        /* Users List View */
        <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 md:p-6 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-zinc-900/40">
            <div>
              <h3 className="text-lg font-bold text-white">Accounts Registry</h3>
              <p className="text-xs text-zinc-400">Select a user account to view and manage assigned cosmetics.</p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name, @username, email, or UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span>Loading account inventory data...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No accounts match your search.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4 font-mono">Inventory Count</th>
                    <th className="py-3.5 px-4 font-mono">Links</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-sm">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <FirebaseImage
                            fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                            src={user.image || ''}
                            alt=""
                            className="w-10 h-10 rounded-full bg-zinc-800 object-cover shrink-0 border border-zinc-700/40"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-2 truncate">
                              <span>{user.name || user.username || 'Anonymous'}</span>
                              {user.premium && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  PRO
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 truncate">
                              @{user.username || 'user'} • <span className="text-zinc-500 font-mono text-[11px]">{user.email || user.id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {user.role || 'USER'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          {user.inventory?.length || 0} item(s)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        {(user.links || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <Button
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                        >
                          <Tag className="w-3.5 h-3.5 mr-1.5" /> Manage Cosmetics
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Selected User Cosmetic Management View */
        <div className="space-y-6">
          {/* User Details Header Card */}
          <div className="bg-[#18181A] border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-950/20 via-[#18181A] to-[#18181A]">
            <div className="flex items-center gap-4">
              <FirebaseImage
                fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`}
                src={selectedUser.image || ''}
                alt=""
                className="w-14 h-14 rounded-full bg-zinc-800 object-cover shrink-0 border-2 border-emerald-500/40"
              />
              <div>
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Managing Inventory For</div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {selectedUser.name || selectedUser.username || selectedUser.id}
                  {selectedUser.premium && (
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PRO
                    </span>
                  )}
                </h2>
                <p className="text-xs text-zinc-400">
                  @{selectedUser.username || 'user'} • <span className="font-mono text-zinc-500">{selectedUser.email || selectedUser.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                Owned Items: <strong className="text-emerald-400 font-mono">{selectedUser.inventory?.length || 0}</strong>
              </span>

              <Button
                variant="outline"
                onClick={() => setSelectedUser(null)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Users List
              </Button>
            </div>
          </div>

          {/* Cosmetics Search and Filters Bar */}
          <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
              {/* Category Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All Items ({shopItems.length})
                </button>
                <button
                  onClick={() => setCategoryFilter('PROFILE_BANNER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === 'PROFILE_BANNER'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Banners ({shopItems.filter(i => i.type === 'PROFILE_BANNER').length})
                </button>
                <button
                  onClick={() => setCategoryFilter('AVATAR_RING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === 'AVATAR_RING'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Rings ({shopItems.filter(i => i.type === 'AVATAR_RING').length})
                </button>
                <button
                  onClick={() => setCategoryFilter('TITLE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === 'TITLE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Titles ({shopItems.filter(i => i.type === 'TITLE').length})
                </button>
                <button
                  onClick={() => setCategoryFilter('MERCH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === 'MERCH'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Merch ({shopItems.filter(i => i.type === 'MERCH').length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter cosmetics catalog..."
                  value={cosmeticSearchTerm}
                  onChange={(e) => setCosmeticSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Cosmetics Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShopItems.map((item: any) => {
              const hasCosmetic = selectedUser.inventory?.includes(item.id);
              const isPurchased = selectedUser.purchasedItems?.includes(item.id);
              const isUpdating = updatingItemId === item.id;

              const BannerComponent = ProfileBannerMap[item.id];
              const RingComponent = AvatarRingMap[item.id];

              return (
                <div
                  key={item.id}
                  className={`bg-[#18181A] border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-lg ${
                    hasCosmetic
                      ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-[#18181A] to-[#18181A]'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-white text-base leading-snug">{item.name}</h4>
                        <span className="text-xs text-zinc-500 font-mono block mt-0.5">{item.id}</span>
                      </div>

                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                        {item.type?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Preview Box */}
                    <div className="h-20 bg-zinc-900 rounded-xl border border-zinc-800/80 overflow-hidden relative flex items-center justify-center p-2">
                      {item.type === 'PROFILE_BANNER' && BannerComponent ? (
                        <div className="w-full h-full relative rounded-lg overflow-hidden">
                          <BannerComponent isStatic={true} />
                        </div>
                      ) : item.type === 'AVATAR_RING' && RingComponent ? (
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <RingComponent />
                          <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                            <img src={selectedUser.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`} alt="" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      ) : item.type === 'TITLE' ? (
                        <div className="px-3 py-1 bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30 rounded-lg text-xs tracking-wide uppercase">
                          🏆 Title: {item.name}
                        </div>
                      ) : item.image ? (
                        <FirebaseImage src={item.image} alt={item.name} className="max-h-16 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-zinc-600 font-mono">No visual preview</span>
                      )}
                    </div>

                    {/* Status badge */}
                    <div>
                      {isPurchased ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Status: Purchased by user
                        </span>
                      ) : hasCosmetic ? (
                        <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Status: Assigned to Inventory
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">Status: Not in Inventory</span>
                      )}
                    </div>
                  </div>

                  {/* Grant / Revoke Action Button */}
                  <div className="pt-4 mt-3 border-t border-zinc-800/60 flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-mono font-medium">
                      {(item.cost || 0).toLocaleString()} Links
                    </span>

                    <Button
                      size="sm"
                      disabled={isUpdating}
                      variant={hasCosmetic ? 'outline' : 'default'}
                      onClick={() => handleToggleCosmetic(selectedUser.id, item.id, hasCosmetic)}
                      className={hasCosmetic
                        ? 'border-red-500/40 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs font-semibold'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md'
                      }
                    >
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : hasCosmetic ? (
                        'Revoke Item'
                      ) : (
                        'Grant Item'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
