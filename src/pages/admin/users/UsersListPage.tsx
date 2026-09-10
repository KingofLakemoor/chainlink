import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import {
  Users, Search, Shield, UserCheck, Link2, RefreshCw, X,
  Crown, TestTube, Filter
} from 'lucide-react';

interface UserRecord {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: 'USER' | 'ADMIN' | string;
  isTestAccount?: boolean;
  links?: number;
  isPremium?: boolean;
  premiumTier?: string;
  image?: string;
  createdAt?: number | string;
  stats?: {
    wins?: number;
    losses?: number;
    pushes?: number;
  };
  [key: string]: any;
}

export default function UsersListPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'REAL' | 'TEST'>('ALL');
  const [premiumFilter, setPremiumFilter] = useState<'ALL' | 'PREMIUM' | 'STANDARD'>('ALL');

  // Link adjustment modal state
  const [adjustModalUser, setAdjustModalUser] = useState<UserRecord | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjusting, setAdjusting] = useState(false);

  // Role updating inline state
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      let fetchedUsers: UserRecord[] = [];

      if (token) {
        try {
          const res = await fetch('/api/admin/users?limit=500', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.users)) {
            fetchedUsers = data.users;
          }
        } catch (err) {
          console.warn('API fetch error, falling back to Firestore client SDK:', err);
        }
      }

      if (fetchedUsers.length === 0) {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(300));
        const snap = await getDocs(q);
        fetchedUsers = snap.docs.map(d => ({ id: d.id, ...(d.data() as UserRecord) }));
      }

      setUsers(fetchedUsers);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (targetUser: UserRecord) => {
    const currentRole = targetUser.role || 'USER';
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change role of @${targetUser.username || targetUser.name || targetUser.id} to ${newRole}?`)) return;

    setUpdatingRoleId(targetUser.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: targetUser.id, role: newRole })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user role');
      }

      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u));
    } catch (e: any) {
      console.error('Update role error:', e);
      alert('Error: ' + e.message);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleAdjustLinks = async () => {
    if (!adjustModalUser || adjustAmount === 0) return;
    setAdjusting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/update-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: adjustModalUser.id, amount: adjustAmount })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update links balance');
      }

      const updatedNewLinks = data.newLinks;
      setUsers(prev => prev.map(u => u.id === adjustModalUser.id ? { ...u, links: updatedNewLinks } : u));
      setAdjustModalUser(null);
      setAdjustAmount(0);
    } catch (e: any) {
      console.error('Adjust links error:', e);
      alert('Error: ' + e.message);
    } finally {
      setAdjusting(false);
    }
  };

  // Metrics calculations
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const testAccountCount = users.filter(u => u.isTestAccount).length;
  const totalLinksCirculation = users.reduce((acc, u) => acc + (u.links || 0), 0);

  // Filtered users list
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (typeFilter === 'REAL' && u.isTestAccount) return false;
    if (typeFilter === 'TEST' && !u.isTestAccount) return false;
    if (premiumFilter === 'PREMIUM' && !u.isPremium) return false;
    if (premiumFilter === 'STANDARD' && u.isPremium) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = (u.name || '').toLowerCase().includes(term);
      const matchesUsername = (u.username || '').toLowerCase().includes(term);
      const matchesEmail = (u.email || '').toLowerCase().includes(term);
      const matchesId = u.id.toLowerCase().includes(term);
      return matchesName || matchesUsername || matchesEmail || matchesId;
    }

    return true;
  });

  const formatDate = (val?: number | string) => {
    if (!val) return 'Unknown';
    if (typeof val === 'number') return new Date(val).toLocaleDateString();
    return new Date(val).toLocaleDateString();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Users Directory</h2>
          <p className="text-zinc-400 text-sm">Manage user accounts, admin roles, and Links balances.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="text-zinc-300 border-zinc-700">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Users</div>
            <div className="text-2xl font-bold text-white font-display">{totalUsers}</div>
          </div>
        </div>

        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Admins</div>
            <div className="text-2xl font-bold text-white font-display">{adminCount}</div>
          </div>
        </div>

        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <TestTube className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Test Accounts</div>
            <div className="text-2xl font-bold text-white font-display">{testAccountCount}</div>
          </div>
        </div>

        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Links</div>
            <div className="text-2xl font-bold text-white font-display">{totalLinksCirculation.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, @username, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
          >
            <option value="ALL">All Roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
          >
            <option value="ALL">All Accounts</option>
            <option value="REAL">Real Accounts</option>
            <option value="TEST">Test Accounts</option>
          </select>

          <select
            value={premiumFilter}
            onChange={(e) => setPremiumFilter(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
          >
            <option value="ALL">All Memberships</option>
            <option value="PREMIUM">Premium</option>
            <option value="STANDARD">Standard</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#18181A] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading user profiles...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No users match the current criteria.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/60 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Links Balance</th>
                  <th className="py-3.5 px-4">Status / Membership</th>
                  <th className="py-3.5 px-4">Record (W-L-P)</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <FirebaseImage
                          fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                          src={u.image || ''}
                          alt=""
                          className="w-9 h-9 rounded-full bg-zinc-800 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate flex items-center gap-2">
                            <span>{u.name || 'Anonymous'}</span>
                            {u.isTestAccount && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                TEST
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            @{u.username || 'user'} • <span className="text-zinc-500">{u.email || u.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {u.role || 'USER'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      <div className="flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                        {(u.links || 0).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {u.isPremium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Crown className="w-3 h-3 text-amber-400" />
                          {u.premiumTier || 'PRO'}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">Standard</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-zinc-400">
                      {u.stats?.wins || 0} - {u.stats?.losses || 0} - {u.stats?.pushes || 0}
                    </td>

                    <td className="py-3 px-4 text-xs text-zinc-500">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAdjustModalUser(u);
                            setAdjustAmount(0);
                          }}
                          className="text-xs text-cyan-400 hover:bg-cyan-950/30"
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1" />
                          Adjust Links
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updatingRoleId === u.id}
                          onClick={() => handleToggleRole(u)}
                          className="text-xs text-zinc-400 hover:text-white"
                        >
                          Toggle Role
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Links Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181A] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setAdjustModalUser(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <FirebaseImage
                fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${adjustModalUser.id}`}
                src={adjustModalUser.image || ''}
                alt=""
                className="w-12 h-12 rounded-full bg-zinc-800"
              />
              <div>
                <h3 className="text-lg font-bold text-white">{adjustModalUser.name || 'Anonymous'}</h3>
                <p className="text-xs text-zinc-400">@{adjustModalUser.username || 'user'}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between items-center text-sm">
              <span className="text-zinc-400">Current Balance:</span>
              <span className="font-mono font-bold text-cyan-400">{(adjustModalUser.links || 0).toLocaleString()} Links</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Amount to Add or Subtract
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  placeholder="e.g. 100 or -50"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Use positive numbers to award links or negative numbers to deduct.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAdjustModalUser(null)}
                  className="border-zinc-700 text-zinc-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdjustLinks}
                  disabled={adjusting || adjustAmount === 0}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                >
                  {adjusting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {adjusting ? 'Saving...' : 'Update Balance'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
