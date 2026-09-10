import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { UserDetailModal, UserRecord } from './UserDetailModal';
import {
  Users, Search, Shield, UserCheck, Link2, RefreshCw,
  Crown, TestTube, Filter, Settings2, Sparkles
} from 'lucide-react';

const DEV_MOCK_USERS: UserRecord[] = [
  {
    id: 'mock-user-123',
    name: 'Mock Admin',
    username: 'mockadmin',
    email: 'mockadmin@chainlink.app',
    role: 'ADMIN',
    isTestAccount: false,
    links: 10000,
    isPremium: true,
    premiumTier: 'PRO',
    inventory: ['banner_inferno', 'ring_inferno', 'title_whale'],
    createdAt: Date.now() - 86400000 * 30,
    stats: { wins: 18, losses: 5, pushes: 2 }
  },
  {
    id: 'test-account-001',
    name: 'Test Account Alpha',
    username: 'test_alpha',
    email: 'alpha@test.local',
    role: 'USER',
    isTestAccount: true,
    links: 1250,
    isPremium: false,
    inventory: ['ring_hexagons'],
    createdAt: Date.now() - 86400000 * 10,
    stats: { wins: 8, losses: 12, pushes: 0 }
  },
  {
    id: 'user-vip-999',
    name: 'High Roller VIP',
    username: 'highroller',
    email: 'vip@chainlink.app',
    role: 'USER',
    isTestAccount: false,
    links: 50000,
    isPremium: true,
    premiumTier: 'VIP',
    inventory: ['banner_boardroom', 'title_legend'],
    createdAt: Date.now() - 86400000 * 60,
    stats: { wins: 42, losses: 15, pushes: 3 }
  }
];

export default function UsersListPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'REAL' | 'TEST'>('ALL');
  const [premiumFilter, setPremiumFilter] = useState<'ALL' | 'PREMIUM' | 'STANDARD'>('ALL');

  // Selected User Modal state
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

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
        try {
          const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(300));
          const snap = await getDocs(q);
          fetchedUsers = snap.docs.map(d => ({ id: d.id, ...(d.data() as UserRecord) }));
        } catch (err) {
          console.warn('Firestore fetch empty or failed:', err);
        }
      }

      if (fetchedUsers.length === 0) {
        fetchedUsers = DEV_MOCK_USERS;
      }

      setUsers(fetchedUsers);
    } catch (e) {
      console.error('Error fetching users:', e);
      setUsers(DEV_MOCK_USERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserUpdated = (updatedUser: UserRecord) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
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
          <h2 className="text-2xl font-bold font-display text-white">Users Directory & Management</h2>
          <p className="text-zinc-400 text-sm">Unified user admin portal — inspect accounts, edit roles, adjust Links, grant Pro status, and manage cosmetics.</p>
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
                  <th className="py-3.5 px-4">Cosmetics</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {filteredUsers.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
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

                    <td className="py-3 px-4 text-xs font-medium text-purple-400">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        {Array.isArray(u.inventory) ? u.inventory.length : 0} items
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs text-zinc-500">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedUser(u)}
                        className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800"
                      >
                        <Settings2 className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                        Manage User
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
