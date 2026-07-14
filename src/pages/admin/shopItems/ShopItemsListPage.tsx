import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import shopItemsData from '../../../../shop_items.json';

export default function ShopItemsListPage() {
  const navigate = useNavigate();
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'shopItems'));
      setShopItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  
  const seedShopItems = async () => {
    if (!confirm('Seed default shop items? This will overwrite existing items with the same ID.')) return;
    setLoading(true);
    try {
      for (const item of shopItemsData) {
        await setDoc(doc(db, 'shopItems', item.id), item);
      }
      await fetchData();
      alert('Seeded successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to seed items');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to archive/delete this shop item?")) return;
    await deleteDoc(doc(db, 'shopItems', id));
    fetchData();
  };

  const handleToggle = async (id: string, field: string, currentValue: boolean) => {
    try {
      // Optimistic update
      setShopItems(prev => prev.map(item => item.id === id ? { ...item, [field]: !currentValue } : item));
      await updateDoc(doc(db, 'shopItems', id), {
        [field]: !currentValue,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(`Error toggling ${field} for item ${id}:`, e);
      // Revert on failure
      fetchData();
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading shop items...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg capitalize">Shop Items ({shopItems.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
          <Button variant="outline" size="sm" onClick={seedShopItems}>Seed Defaults</Button>
        </div>
      </div>

      {shopItems.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No records found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Premium Only</th>
                <th className="px-4 py-3 font-medium">For Sale</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {[...shopItems]
                .sort((a, b) => {
                  if (a.active !== b.active) return a.active ? -1 : 1;
                  return (a.order || 0) - (b.order || 0);
                })
                .map((item) => (
                <tr key={item.id} className={`hover:bg-zinc-800/20 transition-colors ${!item.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={() => navigate(`/admin/shopItems/edit/${item.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{item.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.category || 'N/A'}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.type}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.cost || 0}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={item.premiumOnly || false}
                      onChange={() => handleToggle(item.id, 'premiumOnly', item.premiumOnly || false)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500/20 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={item.forSale !== false}
                      onChange={() => handleToggle(item.id, 'forSale', item.forSale !== false)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer w-max">
                        <input
                          type="checkbox"
                          checked={item.active !== false}
                          onChange={() => handleToggle(item.id, 'active', item.active !== false)}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20"
                        />
                        <span className="text-zinc-400 text-xs">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer w-max">
                        <input
                          type="checkbox"
                          checked={item.featured || false}
                          onChange={() => handleToggle(item.id, 'featured', item.featured || false)}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-yellow-500 focus:ring-yellow-500/20"
                        />
                        <span className="text-zinc-400 text-xs">Featured</span>
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
