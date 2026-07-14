import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Search, Link2 } from 'lucide-react';

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
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateLinks = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      const newLinks = (selectedUser.links || 0) + amount;
      await updateDoc(userRef, { links: newLinks });
      const logRef = doc(collection(db, 'linkTransactions'));
      await setDoc(logRef, {
        userId: selectedUser.id,
        username: selectedUser.username || selectedUser.name || 'Unknown User',
        type: 'ADMIN_MANUAL',
        amount: amount,
        description: `Admin explicitly added/removed links`,
        createdAt: Date.now()
      });

      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, links: newLinks } : u));
      setSelectedUser({ ...selectedUser, links: newLinks });
      setAmount(0);
      alert(`Successfully updated links for ${selectedUser.username || selectedUser.name}.`);
    } catch (e) {
      console.error("Error updating links:", e);
      alert("Failed to update links.");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Manage User Links</h2>
          <p className="text-zinc-400">Add or subtract links for specific users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-[#18181A] border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-zinc-500">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-zinc-500">No users found.</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left p-4 hover:bg-zinc-800/50 transition-colors flex items-center gap-3 ${selectedUser?.id === user.id ? 'bg-zinc-800/80 border-l-2 border-cyan-500' : ''}`}
                  >
                    <FirebaseImage fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} src={user.image || ""} alt="" className="w-10 h-10 rounded-full bg-zinc-800" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{user.name}</div>
                      <div className="text-xs text-zinc-400 truncate">@{user.username || 'user'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedUser ? (
            <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
                <FirebaseImage fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`} src={selectedUser.image || ""} alt="" className="w-16 h-16 rounded-full bg-zinc-800" loading="lazy" />
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-zinc-400">@{selectedUser.username || 'user'}</p>
                  <p className="text-xs text-zinc-500 mt-1">{selectedUser.email}</p>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-sm font-medium text-zinc-400 mb-4">Current Balance</h4>
                <div className="flex items-center gap-2">
                  <Link2 className="w-6 h-6 text-cyan-400" />
                  <span className="text-3xl font-display font-bold text-white">
                    {selectedUser.links?.toLocaleString() || 0}
                  </span>
                  <span className="text-sm text-zinc-500 ml-2">Links</span>
                </div>
              </div>

              <div className="mb-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <h4 className="text-sm font-medium text-zinc-300 mb-4">Adjust Links</h4>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Amount to Add/Subtract</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. 100 or -50"
                    />
                    <p className="text-xs text-zinc-500 mt-2">Use positive numbers to add links, negative numbers to subtract.</p>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleUpdateLinks}
                      disabled={saving || amount === 0}
                      className="w-full sm:w-auto"
                    >
                      {saving ? 'Updating...' : `Update Links for ${selectedUser.username || selectedUser.name}`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center h-full">
              <Link2 className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-300 mb-2">Select a User</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Search and select a user from the list on the left to view and modify their Links balance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
