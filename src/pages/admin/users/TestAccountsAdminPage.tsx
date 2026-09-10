import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth-context';
import { Button } from '../../../components/ui/button';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { Search, UserPlus, Trash2, Shield, UserCheck, AlertTriangle, RefreshCw, Eye, EyeOff, Users, Sparkles, Filter } from 'lucide-react';

export default function TestAccountsAdminPage() {
  const { profile, spoofedRole, setSpoofedRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TEST' | 'REAL'>('ALL');
  const [creating, setCreating] = useState(false);
  const [purging, setPurging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Form states for creating custom test user
  const [count, setCount] = useState<number>(1);
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [links, setLinks] = useState<number>(100);
  const [customUsername, setCustomUsername] = useState<string>('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(300));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching users for test account admin:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateTestUser = async () => {
    setCreating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/create-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          count,
          role,
          links,
          username: customUsername.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create test user(s)');
      }

      setCustomUsername('');
      await fetchUsers();
      alert(`Successfully generated ${data.count} test account(s)!`);
    } catch (e: any) {
      console.error('Create test user error:', e);
      alert('Error: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTestUser = async (targetUserId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete test account @${username}?`)) return;
    setDeletingId(targetUserId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/delete-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete test user');
      }

      setUsers(prev => prev.filter(u => u.id !== targetUserId));
    } catch (e: any) {
      console.error('Delete test user error:', e);
      alert('Error: ' + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePurgeAllTestUsers = async () => {
    if (!window.confirm('WARNING: Are you sure you want to PURGE ALL test accounts? This action cannot be undone.')) return;
    setPurging(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/purge-test-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to purge test users');
      }

      await fetchUsers();
      alert(`Purged ${data.purgedCount} test account(s).`);
    } catch (e: any) {
      console.error('Purge test users error:', e);
      alert('Error: ' + e.message);
    } finally {
      setPurging(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change role of this user to ${newRole}?`)) return;

    setUpdatingRoleId(targetUserId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, role: newRole })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user role');
      }

      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
    } catch (e: any) {
      console.error('Update role error:', e);
      alert('Error: ' + e.message);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'TEST') return !!u.isTestAccount;
    if (typeFilter === 'REAL') return !u.isTestAccount;
    return true;
  });

  const totalLoadedCount = users.length;
  const testUsersCount = users.filter(u => u.isTestAccount).length;
  const realUsersCount = totalLoadedCount - testUsersCount;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-emerald-400" />
            Test Accounts & Role Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Spin up bogus test accounts, purge test data, and preview app behavior via role spoofing.
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

      {/* Role Spoofing Control Card */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-[#18181A] to-zinc-900 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold font-display text-white">Role & Permission Spoofing</h2>
            </div>
            <p className="text-sm text-zinc-400">
              Active profile role: <span className="font-semibold text-cyan-400">{profile?.role}</span>
              {profile?.realRole && profile.realRole !== profile.role && (
                <span className="ml-2 text-xs text-amber-400">(Actual DB Role: {profile.realRole})</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {spoofedRole ? (
              <Button
                variant="outline"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-950/40 text-xs font-bold"
                onClick={() => setSpoofedRole(null)}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Stop Spoofing (Reset to ADMIN)
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/40 text-xs font-bold"
                onClick={() => setSpoofedRole('USER')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Spoof as Regular USER
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Creation & Purge Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Box */}
        <div className="lg:col-span-2 bg-[#18181A] border border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Spin Up Bogus Test Accounts
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-bold">
              {testUsersCount} test account(s) active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Batch Count</label>
              <input
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Initial Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'USER' | 'ADMIN')}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Starting Links</label>
              <input
                type="number"
                value={links}
                onChange={(e) => setLinks(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Custom Username (Optional)</label>
              <input
                type="text"
                placeholder="e.g. TestTester"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleCreateTestUser}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
            >
              {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {creating ? 'Generating Accounts...' : `Create ${count} Test Account(s)`}
            </Button>
          </div>
        </div>

        {/* Purge Box */}
        <div className="bg-[#18181A] border border-red-500/30 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl bg-gradient-to-br from-red-950/20 via-[#18181A] to-[#18181A]">
          <div>
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Purge All Test Accounts
            </h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Instantly delete all accounts marked with <code className="text-red-300 font-mono">isTestAccount: true</code> along with their picks and chain data.
            </p>
          </div>

          <Button
            onClick={handlePurgeAllTestUsers}
            disabled={purging || testUsersCount === 0}
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md"
          >
            {purging ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {purging ? 'Purging All Test Accounts...' : `Purge All Test Accounts (${testUsersCount})`}
          </Button>
        </div>
      </div>

      {/* Account Registry Table */}
      <div className="bg-[#18181A] border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 md:p-6 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-zinc-900/40">
          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'ALL'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({totalLoadedCount})
            </button>
            <button
              onClick={() => setTypeFilter('TEST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'TEST'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              Test Accounts ({testUsersCount})
            </button>
            <button
              onClick={() => setTypeFilter('REAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'REAL'
                  ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Real Users ({realUsersCount})
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by username, email, or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Loading account registry...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-1">
              <Filter className="w-8 h-8 text-zinc-600 mb-1" />
              <p className="font-semibold text-zinc-300">No matching accounts found</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">User Account</th>
                  <th className="py-3.5 px-4">Account Type</th>
                  <th className="py-3.5 px-4">Role</th>
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
                            {user.isTestAccount && (
                              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Test Account
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
                      {user.isTestAccount ? (
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          BOGUS TEST
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-800/50 px-2.5 py-1 rounded-lg border border-zinc-700/40">
                          REAL USER
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700/50'
                      }`}>
                        {user.role === 'ADMIN' ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {user.role || 'USER'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {(user.links || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updatingRoleId === user.id}
                          onClick={() => handleUpdateRole(user.id, user.role || 'USER')}
                          className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          {updatingRoleId === user.id ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                          Toggle Role
                        </Button>

                        {user.isTestAccount && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deletingId === user.id}
                            onClick={() => handleDeleteTestUser(user.id, user.username || user.name)}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
