import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { Search, Link2, Plus, Minus, RefreshCw, Users, Shield, Sparkles, Diamond, ArrowRight } from 'lucide-react';

export default function AddLinksAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(300));
      const snap = await getDocs(q);
      const userList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(userList);
      if (userList.length > 0 && !selectedUser) {
        setSelectedUser(userList[0]);
      }
    } catch (e) {
      console.error("Error fetching users for link adjustment:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateLinks = async () => {
    if (!selectedUser || amount === 0) return;
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/update-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: selectedUser.id, amount })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update links");
      }

      const newLinks = data.newLinks;

      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, links: newLinks } : u));
      setSelectedUser({ ...selectedUser, links: newLinks });
      setAmount(0);
      alert(`Successfully updated links for @${selectedUser.username || selectedUser.name}. New Balance: ${newLinks.toLocaleString()} Links.`);
    } catch (e: any) {
      console.error("Error updating links:", e);
      alert("Failed to update links: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreset = (delta: number) => {
    setAmount(prev => prev + delta);
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLoadedUsers = users.length;
  const totalCumulativeLinks = users.reduce((sum, u) => sum + (u.links || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
            <Link2 className="w-8 h-8 text-cyan-400" />
            Manage User Links
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Explicitly credit or deduct Links from individual user balances.
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Accounts Loaded</span>
              <span className="text-3xl font-black font-display text-white mt-1 block">{totalLoadedUsers.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/40 text-zinc-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Registry user documents</p>
        </div>

        <div className="bg-[#18181A] border border-cyan-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-cyan-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">Cumulative Links In Circulation</span>
              <span className="text-3xl font-black font-display text-cyan-300 mt-1 block">{totalCumulativeLinks.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <Link2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-3">Across loaded registry accounts</p>
        </div>

        <div className="bg-[#18181A] border border-emerald-500/30 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-emerald-950/20 via-[#18181A] to-[#18181A]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Selected User Balance</span>
              <span className="text-3xl font-black font-display text-emerald-300 mt-1 block">
                {selectedUser ? (selectedUser.links || 0).toLocaleString() : '0'}
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-3">
            {selectedUser ? `@${selectedUser.username || selectedUser.name}` : 'No user selected'}
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Selection Sidebar */}
        <div className="lg:col-span-1 bg-[#18181A] border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col h-[650px] shadow-xl">
          <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/60">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No users found.</div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left p-4 hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-3 ${
                      isSelected ? 'bg-cyan-950/30 border-l-4 border-cyan-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FirebaseImage
                        fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                        src={user.image || ""}
                        alt=""
                        className="w-10 h-10 rounded-full bg-zinc-800 object-cover shrink-0 border border-zinc-700/40"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                          {user.name || user.username || 'Anonymous'}
                          {user.premium && (
                            <Diamond className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">@{user.username || 'user'}</div>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-cyan-400 shrink-0 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                      {(user.links || 0).toLocaleString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Link Adjustment Workspace */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Selected User Header Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                  <FirebaseImage
                    fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`}
                    src={selectedUser.image || ""}
                    alt=""
                    className="w-16 h-16 rounded-full bg-zinc-800 object-cover shrink-0 border-2 border-cyan-500/40"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {selectedUser.name || selectedUser.username || selectedUser.id}
                      {selectedUser.premium && (
                        <span className="inline-flex items-center gap-1 text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Diamond className="w-3 h-3 fill-amber-300" /> PRO
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-zinc-400">@{selectedUser.username || 'user'}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{selectedUser.email || selectedUser.id}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Role</span>
                  <span className="text-sm font-bold text-purple-300 font-mono">{selectedUser.role || 'USER'}</span>
                </div>
              </div>

              {/* Balance & Projection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Current Links Balance</span>
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-cyan-400" />
                    <span className="text-2xl font-black font-display text-white">
                      {(selectedUser.links || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Projected New Balance</span>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-emerald-400" />
                    <span className="text-2xl font-black font-display text-emerald-400">
                      {((selectedUser.links || 0) + amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preset Adjustment Controls */}
              <div className="space-y-4 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Quick Preset Adjustments
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePreset(100)}
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40 font-bold text-xs"
                  >
                    +100 Links
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePreset(500)}
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40 font-bold text-xs"
                  >
                    +500 Links
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePreset(1000)}
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40 font-bold text-xs"
                  >
                    +1,000 Links
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePreset(5000)}
                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40 font-bold text-xs"
                  >
                    +5,000 Links
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePreset(-100)}
                    className="border-red-500/30 text-red-400 hover:bg-red-950/40 font-bold text-xs"
                  >
                    -100 Links
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePreset(-500)}
                    className="border-red-500/30 text-red-400 hover:bg-red-950/40 font-bold text-xs"
                  >
                    -500 Links
                  </Button>
                </div>

                {/* Custom Amount Input */}
                <div className="pt-2 space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Custom Adjustment Amount (Positive to add, Negative to subtract)
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. 250 or -150"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAmount(0)}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-3">
                  <Button
                    onClick={handleUpdateLinks}
                    disabled={saving || amount === 0}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-11 text-sm shadow-lg"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    {saving
                      ? 'Processing Update...'
                      : `Confirm Adjustment (${amount >= 0 ? '+' : ''}${amount.toLocaleString()} Links)`
                    }
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <Link2 className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-bold text-zinc-200 mb-2">Select an Account</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Search and select a user account from the left column to view and adjust their Links balance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
