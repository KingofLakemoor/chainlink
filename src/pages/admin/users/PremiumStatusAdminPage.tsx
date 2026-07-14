import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Search, Diamond } from 'lucide-react';

export default function PremiumStatusAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { premium: !currentStatus });

      setUsers(users.map(u => {
        if (u.id === userId) {
          return { ...u, premium: !currentStatus };
        }
        return u;
      }));
    } catch (e) {
      console.error("Error toggling premium status:", e);
      alert("Failed to update premium status.");
    }
  };

  const filteredUsers = users.filter(u =>
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-zinc-500">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Diamond className="w-6 h-6 text-yellow-500" />
            Manage Premium Status
          </h2>
          <p className="text-zinc-400">Grant or revoke premium status for users.</p>
        </div>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 items-center bg-[#18181A]">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Current Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-white">
                    {user.username || user.name || 'Anonymous'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    {user.id}
                  </td>
                  <td className="px-4 py-3">
                    {user.premium ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <Diamond className="w-3.5 h-3.5" />
                        Premium
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={user.premium ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleTogglePremium(user.id, !!user.premium)}
                    >
                      {user.premium ? 'Revoke Premium' : 'Grant Premium'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No users found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
