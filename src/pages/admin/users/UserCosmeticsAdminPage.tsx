import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Search, Tag } from 'lucide-react';
import shopItemsData from '../../../../shop_items.json';

export default function UserCosmeticsAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>(shopItemsData);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cosmeticSearchTerm, setCosmeticSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchUsersAndItems = async () => {
    setLoading(true);
    try {
      const [usersSnap, shopSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), limit(200))),
        getDocs(collection(db, 'shopItems'))
      ]);

      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (!shopSnap.empty) {
        const liveItems = shopSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        liveItems.sort((a: any, b: any) => (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id));
        setShopItems(liveItems);
      }
    } catch (e) {
      console.error("Error fetching users or shop items:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndItems();
  }, []);

  const handleToggleCosmetic = async (userId: string, cosmeticId: string, hasCosmetic: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      const user = users.find(u => u.id === userId);
      let newInventory = user?.inventory || [];
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

  const filteredShopItems = shopItems.filter(item =>
    (item.name || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase()) ||
    (item.id || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase()) ||
    (item.type || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(cosmeticSearchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" /> User Cosmetics Administration
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Grant or revoke profile banners, avatar rings, and titles directly for users.</p>
        </div>
        <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 font-mono">
          Live Shop Items: {shopItems.length}
        </div>
      </div>

      {!selectedUser ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users by username, display name, or UID..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Inventory Count</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-bold text-zinc-200">{user.username || user.displayName || user.id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-cyan-400">{user.inventory?.length || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setSelectedUser(user)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs">
                        Manage Cosmetics
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div>
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Managing Cosmetics For</span>
              <h3 className="text-lg font-bold text-zinc-100">{selectedUser.username || selectedUser.displayName || selectedUser.id}</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Back to Users List
            </Button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search cosmetics by item name, ID, type, or collection..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 w-full"
              value={cosmeticSearchTerm}
              onChange={(e) => setCosmeticSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
            {filteredShopItems.map((item: any) => {
              const hasCosmetic = selectedUser.inventory?.includes(item.id);
              const isPurchased = selectedUser.purchasedItems?.includes(item.id);

              return (
                <div key={item.id} className="bg-[#18181A] border border-zinc-800 p-4 rounded-xl flex justify-between items-center hover:border-zinc-700 transition-colors">
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-zinc-100">{item.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{item.id}</div>
                    <div className="text-[10px] text-cyan-400 font-semibold uppercase">{item.type?.replace('_', ' ')}</div>
                    {isPurchased ? (
                      <div className="text-[10px] font-bold text-emerald-400 mt-1">Status: Purchased</div>
                    ) : hasCosmetic ? (
                      <div className="text-[10px] font-bold text-cyan-400 mt-1">Status: Admin Assigned</div>
                    ) : null}
                  </div>
                  <Button
                    variant={hasCosmetic ? 'outline' : 'default'}
                    size="sm"
                    className={hasCosmetic ? 'border-red-500/50 hover:bg-red-950/40 text-red-400 text-xs' : 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs'}
                    onClick={() => handleToggleCosmetic(selectedUser.id, item.id, hasCosmetic)}
                  >
                    {hasCosmetic ? 'Remove' : 'Grant'}
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
