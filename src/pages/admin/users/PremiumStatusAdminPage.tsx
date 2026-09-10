import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, limit } from "firebase/firestore";
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { Search, Diamond, Users, CheckCircle2, ShieldAlert, Sparkles, RefreshCw, Filter } from 'lucide-react';

export default function PremiumStatusAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PREMIUM' | 'STANDARD'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(300));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching users for premium management:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    const targetStatus = !currentStatus;
    setUpdatingId(userId);

    try {
      let updated = false;

      // Try backend admin endpoint first
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch('/api/admin/users/update-premium', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ targetUserId: userId, premium: targetStatus })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            updated = true;
          }
        } catch (apiErr) {
          console.warn("Backend API update-premium failed, falling back to direct Firestore:", apiErr);
        }
      }

      // Fallback to client Firestore SDK if API failed or unauthenticated
      if (!updated) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { premium: targetStatus, updatedAt: Date.now() });
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, premium: targetStatus } : u));
    } catch (e: any) {
      console.error("Error toggling premium status:", e);
      alert("Failed to update premium status: " + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'PREMIUM') return !!u.premium;
    if (statusFilter === 'STANDARD') return !u.premium;
    return true;
  });

  const totalUsersCount = users.length;
  const premiumCount = users.filter(u => !!u.premium).length;
  const standardCount = totalUsersCount - premiumCount;
  const conversionRate = totalUsersCount > 0 ? ((premiumCount / totalUsersCount) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
            <Diamond className="w-8 h-8 text-amber-400 animate-pulse" />
            Pro & Premium Status
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Grant or revoke ChainLink Pro memberships and view membership analytics across the userbase.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchUsers}
          disabled={loading}
          className="border-zinc-800 bg-[#18181A] hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      {/* Metrics Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Accounts</span>
              <span className="text-3xl font-black font-display text-white mt-1 block">{totalUsersCount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/40 text-zinc-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Active registry snapshot</p>
        </div>

        <div className="bg-[#18181A] border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden bg-gradient-to-br from-amber-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">ChainLink Pro Members</span>
              <span className="text-3xl font-black font-display text-amber-300 mt-1 block">{premiumCount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
              <Diamond className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-3">Unlocked full Pro perks</p>
        </div>

        <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Standard Accounts</span>
              <span className="text-3xl font-black font-display text-zinc-200 mt-1 block">{standardCount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/40 text-zinc-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Free tier users</p>
        </div>

        <div className="bg-[#18181A] border border-cyan-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden bg-gradient-to-br from-cyan-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">Pro Conversion Rate</span>
              <span className="text-3xl font-black font-display text-cyan-300 mt-1 block">{conversionRate}%</span>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-3">% of userbase on Pro tier</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Controls Header Bar */}
        <div className="p-4 md:p-6 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-zinc-900/40">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({totalUsersCount})
            </button>
            <button
              onClick={() => setStatusFilter('PREMIUM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'PREMIUM'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              ChainLink Pro ({premiumCount})
            </button>
            <button
              onClick={() => setStatusFilter('STANDARD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'STANDARD'
                  ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Standard ({standardCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, @username, email, or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span>Loading user membership status...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
              <Filter className="w-8 h-8 text-zinc-600 mb-1" />
              <p className="font-semibold text-zinc-300">No matching accounts found</p>
              <p className="text-xs text-zinc-500">Try adjusting your search criteria or filter tab.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">User Account</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Membership Status</th>
                  <th className="py-3.5 px-4 font-mono">Links Balance</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {filteredUsers.map(user => {
                  const isUpdating = updatingId === user.id;
                  const isPro = !!user.premium;

                  return (
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
                              {user.isTestAccount && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Test
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
                        {isPro ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                            <Diamond className="w-3.5 h-3.5 fill-amber-400" />
                            ChainLink Pro
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Standard
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                        {(user.links || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <Button
                          size="sm"
                          disabled={isUpdating}
                          variant={isPro ? 'destructive' : 'default'}
                          onClick={() => handleTogglePremium(user.id, isPro)}
                          className={isPro
                            ? 'bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-semibold'
                            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-extrabold text-xs shadow-md'
                          }
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : isPro ? (
                            'Revoke Pro'
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 mr-1" /> Grant Pro Access
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
