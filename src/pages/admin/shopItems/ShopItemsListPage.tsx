import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { ProfileBannerMap } from '../../../lib/cosmetics';
import { AvatarRingMap } from '../../../lib/cosmetics';
import { TitleMap } from '../../../components/ui/titles';
import shopItemsData from '../../../../shop_items.json';
import {
  ShoppingBag, Search, Plus, RefreshCw, Database, Edit3, Trash2,
  Coins, Crown, Tag, CheckCircle, Eye, SlidersHorizontal, Sparkles
} from 'lucide-react';

export default function ShopItemsListPage() {
  const navigate = useNavigate();
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostValue, setEditingCostValue] = useState<number | string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'shopItems'));
      setShopItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching shop items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const seedShopItems = async () => {
    if (!confirm('Seed default shop items? This will overwrite existing items with matching IDs.')) return;
    setLoading(true);
    try {
      for (const item of shopItemsData) {
        await setDoc(doc(db, 'shopItems', item.id), item);
      }
      await fetchData();
      alert('Seeded default shop items successfully!');
    } catch (e) {
      console.error('Error seeding shop items:', e);
      alert('Failed to seed default items');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete/archive shop item "${id}"?`)) return;
    try {
      await deleteDoc(doc(db, 'shopItems', id));
      setShopItems(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error('Error deleting shop item:', e);
      alert('Failed to delete item');
    }
  };

  const handleToggle = async (id: string, field: string, currentValue: boolean) => {
    try {
      const newValue = !currentValue;
      setShopItems(prev => prev.map(item => item.id === id ? { ...item, [field]: newValue } : item));
      await updateDoc(doc(db, 'shopItems', id), {
        [field]: newValue,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(`Error toggling ${field} for item ${id}:`, e);
      fetchData();
    }
  };

  const handleSaveCost = async (id: string) => {
    const numCost = Math.max(0, Number(editingCostValue) || 0);
    try {
      setShopItems(prev => prev.map(item => item.id === id ? { ...item, cost: numCost } : item));
      setEditingCostId(null);
      await updateDoc(doc(db, 'shopItems', id), {
        cost: numCost,
        updatedAt: Date.now()
      });
    } catch (e) {
      console.error(`Error updating cost for item ${id}:`, e);
      fetchData();
    }
  };

  // Metrics
  const totalItemsCount = shopItems.length;
  const activeItemsCount = shopItems.filter(i => i.active !== false).length;
  const forSaleItemsCount = shopItems.filter(i => i.forSale !== false && i.active !== false).length;
  const proItemsCount = shopItems.filter(i => i.premiumOnly).length;

  const categoriesList = Array.from(new Set(shopItems.map(i => i.category || 'Uncategorized'))).filter(Boolean);

  const filteredItems = shopItems.filter(item => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.collectionId || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'ALL' || (item.category || 'Uncategorized') === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = item.active !== false;
    else if (statusFilter === 'INACTIVE') matchesStatus = item.active === false;
    else if (statusFilter === 'FOR_SALE') matchesStatus = item.forSale !== false && item.active !== false;
    else if (statusFilter === 'PRO_ONLY') matchesStatus = !!item.premiumOnly;
    else if (statusFilter === 'FEATURED') matchesStatus = !!item.featured;

    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if ((a.active !== false) !== (b.active !== false)) return a.active !== false ? -1 : 1;
    return (a.order || 0) - (b.order || 0);
  });

  const renderCosmeticPreview = (item: any) => {
    const type = item.type;
    const imageKey = item.image || '';
    const previewKey = item.preview || imageKey;

    if (type === 'PROFILE_BANNER') {
      return (
        <div className="w-32 h-10 bg-zinc-900 rounded-md overflow-hidden relative border border-zinc-800 flex items-center justify-center shrink-0">
          {item.thumbnail ? (
            <FirebaseImage src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
          ) : ProfileBannerMap[imageKey] ? (
            <div className="absolute inset-0 transform scale-75 origin-center">
              {React.createElement(ProfileBannerMap[imageKey], { isStatic: true })}
            </div>
          ) : (imageKey.startsWith('/') || imageKey.startsWith('http') || imageKey.startsWith('gs://')) ? (
            <FirebaseImage src={imageKey} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full ${imageKey || 'bg-zinc-800'}`} />
          )}
        </div>
      );
    }

    if (type === 'AVATAR_RING') {
      return (
        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center relative border border-zinc-800 shrink-0 overflow-hidden">
          {item.thumbnail ? (
            <FirebaseImage src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
          ) : AvatarRingMap[imageKey] ? (
            <div className="absolute inset-0 transform scale-[1.2]">
              {React.createElement(AvatarRingMap[imageKey], { isStatic: true })}
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-full border-2 ${imageKey || 'border-zinc-500'} bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-400`}>
              Ring
            </div>
          )}
        </div>
      );
    }

    if (type === 'TITLE') {
      return (
        <div className="w-32 h-8 bg-zinc-900/80 rounded border border-zinc-800 flex items-center justify-center px-2 shrink-0 overflow-hidden">
          {TitleMap[previewKey || imageKey] ? (
            <div className="transform scale-90">
              {React.createElement(TitleMap[previewKey || imageKey], { isStatic: true })}
            </div>
          ) : (
            <span className="text-xs font-bold text-zinc-300 truncate">{item.name}</span>
          )}
        </div>
      );
    }

    if (type === 'MERCH' || type === 'GIFT_CARD') {
      return (
        <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
          {imageKey ? (
            <FirebaseImage src={imageKey} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
        <Tag className="w-4 h-4 text-zinc-500" />
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 font-display flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-[#22c55e]" />
            Shop & Inventory Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Manage cosmetic shop items, pricing, availability, and Pro exclusives.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            className="gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={seedShopItems}
            className="gap-2 border-zinc-700 hover:bg-zinc-800 text-amber-400"
          >
            <Database className="w-4 h-4" />
            Seed Defaults
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/admin/shopItems/create')}
            className="gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold"
          >
            <Plus className="w-4 h-4" />
            Create Shop Item
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Items</p>
            <h3 className="text-2xl font-bold text-zinc-100 mt-1 font-mono">{totalItemsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-300">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Active Items</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{activeItemsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">For Sale in Shop</p>
            <h3 className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{forSaleItemsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Pro Exclusives</p>
            <h3 className="text-2xl font-bold text-purple-400 mt-1 font-mono">{proItemsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Crown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, ID, description, or collection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Types</option>
              <option value="PROFILE_BANNER">Banners</option>
              <option value="AVATAR_RING">Avatar Rings</option>
              <option value="TITLE">Titles</option>
              <option value="MERCH">Merch</option>
              <option value="GIFT_CARD">Gift Cards</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="FOR_SALE">For Sale</option>
              <option value="PRO_ONLY">Pro Only</option>
              <option value="FEATURED">Featured</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Shop Items List Table */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#22c55e]" /> Loading shop items...
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">
            No shop items found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Name & ID</th>
                  <th className="px-4 py-3">Type & Category</th>
                  <th className="px-4 py-3">Cost (Links)</th>
                  <th className="px-4 py-3 text-center">For Sale</th>
                  <th className="px-4 py-3 text-center">Pro Only</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-center">Featured</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {sortedItems.map((item) => {
                  const isEditingCost = editingCostId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${item.active === false ? 'opacity-40 bg-zinc-950/40' : ''}`}
                    >
                      {/* Visual Preview */}
                      <td className="px-4 py-3">
                        {renderCosmeticPreview(item)}
                      </td>

                      {/* Name & ID */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-100 text-sm">{item.name}</div>
                        <div className="font-mono text-[11px] text-zinc-500">{item.id}</div>
                        {item.collectionId && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                            set: {item.collectionId}
                          </span>
                        )}
                      </td>

                      {/* Type & Category */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-300">{item.type?.replace('_', ' ')}</div>
                        <div className="text-[11px] text-zinc-500">{item.category || 'Uncategorized'}</div>
                      </td>

                      {/* Cost Input / Display */}
                      <td className="px-4 py-3 font-mono font-bold">
                        {isEditingCost ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editingCostValue}
                              onChange={(e) => setEditingCostValue(e.target.value)}
                              className="w-20 h-7 text-xs bg-zinc-900 border-zinc-700 font-mono text-cyan-400 focus:ring-emerald-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCost(item.id);
                                if (e.key === 'Escape') setEditingCostId(null);
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveCost(item.id)}
                              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px]"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCostId(item.id);
                              setEditingCostValue(item.cost || 0);
                            }}
                            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 group cursor-pointer"
                            title="Click to edit cost"
                          >
                            <Coins className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{(item.cost || 0).toLocaleString()}</span>
                            <Edit3 className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors ml-1" />
                          </button>
                        )}
                      </td>

                      {/* Toggle: For Sale */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.forSale !== false}
                            onChange={() => handleToggle(item.id, 'forSale', item.forSale !== false)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                          />
                        </label>
                      </td>

                      {/* Toggle: Premium Only */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.premiumOnly || false}
                            onChange={() => handleToggle(item.id, 'premiumOnly', item.premiumOnly || false)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500/20"
                          />
                        </label>
                      </td>

                      {/* Toggle: Active */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.active !== false}
                            onChange={() => handleToggle(item.id, 'active', item.active !== false)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                          />
                        </label>
                      </td>

                      {/* Toggle: Featured */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.featured || false}
                            onChange={() => handleToggle(item.id, 'featured', item.featured || false)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/20"
                          />
                        </label>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white"
                            onClick={() => navigate(`/admin/shopItems/edit/${item.id}`)}
                            title="Edit Full Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(item.id)}
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
