import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Search } from 'lucide-react';
import shopItemsData from '../../../../shop_items.json';

export default function UserCosmeticsAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
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

  const handleToggleCosmetic = async (userId: string, cosmeticId: string, hasCosmetic: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      const user = users.find(u => u.id === userId);
      let newInventory = user.inventory || [];
      if (hasCosmetic) {
        newInventory = newInventory.filter((id: string) => id !== cosmeticId);
      } else {
        newInventory = [...newInventory, cosmeticId];
      }

      await updateDoc(userRef, { inventory: newInventory });
      setUsers(users.map(u => u.id === userId ? { ...u, inventory: newInventory } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, inventory: newInventory });
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update cosmetics');
    }
  };

  const filteredUsers = users.filter(u =>
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden p-6">
      <h2 className="text-xl font-bold mb-4">User Cosmetics Administration</h2>

      {!selectedUser ? (
        <>
          <div className="mb-4 relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-700 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Cosmetics Count</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3">{user.username || user.displayName || user.id}</td>
                    <td className="px-4 py-3">{user.inventory?.length || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setSelectedUser(user)}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div>
          <Button variant="secondary" size="sm" className="mb-4" onClick={() => setSelectedUser(null)}>Back to Users</Button>
          <h3 className="text-lg font-bold mb-4">Managing: {selectedUser.username || selectedUser.displayName || selectedUser.id}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopItemsData.map((item: any) => {
              const hasCosmetic = selectedUser.inventory?.includes(item.id);
              const isPurchased = selectedUser.purchasedItems?.includes(item.id);

              return (
                <div key={item.id} className="bg-[#18181A] border border-zinc-800 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className="text-xs text-zinc-500">{item.type}</div>
                    {isPurchased ? (
                      <div className="text-xs text-green-500 mt-1">Purchased</div>
                    ) : hasCosmetic ? (
                      <div className="text-xs text-blue-500 mt-1">Assigned</div>
                    ) : null}
                  </div>
                  <Button
                    variant={hasCosmetic ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleToggleCosmetic(selectedUser.id, item.id, hasCosmetic)}
                  >
                    {hasCosmetic ? 'Remove' : 'Add'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
