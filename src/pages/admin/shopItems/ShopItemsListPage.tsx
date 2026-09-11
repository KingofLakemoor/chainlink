import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';
import { ProfileBannerMap, AvatarRingMap } from '../../../lib/cosmetics';
import { TitleMap } from '../../../components/ui/titles';
import shopItemsData from '../../../../shop_items.json';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  ShoppingBag, Search, Plus, RefreshCw, Database, Edit3, Trash2,
  Coins, Crown, Tag, CheckCircle, Eye, SlidersHorizontal, Sparkles,
  Download, UploadCloud, Upload, DollarSign, Percent, X, FileCode,
  AlertCircle, ArrowUpDown, Save, Check, HelpCircle
} from 'lucide-react';

export const shopItemCategories = [
  "Banners (static)",
  "Banners (Dynamic)",
  "Avatar background (static)",
  "Avatar background (dynamic)",
  "Title regular",
  "Title glow",
  "Merch",
  "Gift Card",
  "Uncategorized"
] as const;

export const shopItemTypes = [
  "PROFILE_BANNER",
  "AVATAR_RING",
  "TITLE",
  "MERCH",
  "GIFT_CARD"
] as const;

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(shopItemTypes),
  category: z.string().min(1, "Category is required"),
  cost: z.coerce.number().min(0, "Cost must be a positive number"),
  active: z.boolean().default(true),
  forSale: z.boolean().default(true),
  premiumOnly: z.boolean().default(false),
  featured: z.boolean().default(false),
  requiresShipping: z.boolean().default(false),
  image: z.string().optional().default(""),
  thumbnail: z.string().optional().default(""),
  preview: z.string().optional().default(""),
  order: z.coerce.number().optional().default(1),
  collectionId: z.string().optional().default("")
});

export default function ShopItemsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('ORDER');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostValue, setEditingCostValue] = useState<number | string>('');

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importOverwrite, setImportOverwrite] = useState(true);
  const [parsedImportItems, setParsedImportItems] = useState<any[]>([]);
  const [importParseError, setImportParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Manifest Push State
  const [isPushingManifest, setIsPushingManifest] = useState(false);

  // Bulk Pricing Modal State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingScope, setPricingScope] = useState<'ALL' | 'FILTERED'>('FILTERED');
  const [pricingAction, setPricingAction] = useState<'INC_PCT' | 'DEC_PCT' | 'INC_FIXED' | 'DEC_FIXED' | 'SET_FIXED'>('INC_PCT');
  const [pricingValue, setPricingValue] = useState<number | string>(10);
  const [isApplyingPricing, setIsPricingApplying] = useState(false);

  // Slide-Over Drawer Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      id: "",
      name: "",
      description: "",
      type: "PROFILE_BANNER",
      category: "Banners (Dynamic)",
      cost: 1000,
      active: true,
      forSale: true,
      premiumOnly: false,
      featured: false,
      requiresShipping: false,
      image: "",
      thumbnail: "",
      preview: "",
      order: 1,
      collectionId: ""
    },
  });

  const watchAll = form.watch();

  const registeredBanners = Object.keys(ProfileBannerMap);
  const registeredRings = Object.keys(AvatarRingMap);
  const registeredTitles = Object.keys(TitleMap);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

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

  // Sync Drawer state with URL parameters
  useEffect(() => {
    const action = searchParams.get('action');
    const editId = searchParams.get('edit');

    if (action === 'create') {
      openCreateDrawer();
    } else if (editId) {
      openEditDrawer(editId);
    }
  }, [searchParams]);

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setEditingItemId(null);
    form.reset({
      id: "",
      name: "",
      description: "",
      type: "PROFILE_BANNER",
      category: "Banners (Dynamic)",
      cost: 1000,
      active: true,
      forSale: true,
      premiumOnly: false,
      featured: false,
      requiresShipping: false,
      image: "",
      thumbnail: "",
      preview: "",
      order: shopItems.length ? (Math.max(...shopItems.map(i => i.order || 0)) + 1) : 1,
      collectionId: ""
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (id: string) => {
    setDrawerMode('edit');
    setEditingItemId(id);

    const existing = shopItems.find(i => i.id === id);
    if (existing) {
      form.reset({
        id: existing.id,
        name: existing.name || "",
        description: existing.description || "",
        type: existing.type || "PROFILE_BANNER",
        category: existing.category || "Uncategorized",
        cost: existing.cost ?? 0,
        active: existing.active ?? true,
        forSale: existing.forSale ?? true,
        premiumOnly: existing.premiumOnly ?? false,
        featured: existing.featured ?? false,
        requiresShipping: existing.requiresShipping ?? false,
        image: existing.image || "",
        thumbnail: existing.thumbnail || "",
        preview: existing.preview || "",
        order: existing.order ?? 1,
        collectionId: existing.collectionId || ""
      });
      setIsDrawerOpen(true);
    } else {
      // If not loaded yet in local state, fetch directly
      getDoc(doc(db, "shopItems", id)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          form.reset({
            id: snap.id,
            name: data.name || "",
            description: data.description || "",
            type: data.type || "PROFILE_BANNER",
            category: data.category || "Uncategorized",
            cost: data.cost ?? 0,
            active: data.active ?? true,
            forSale: data.forSale ?? true,
            premiumOnly: data.premiumOnly ?? false,
            featured: data.featured ?? false,
            requiresShipping: data.requiresShipping ?? false,
            image: data.image || "",
            thumbnail: data.thumbnail || "",
            preview: data.preview || "",
            order: data.order ?? 1,
            collectionId: data.collectionId || ""
          });
          setIsDrawerOpen(true);
        }
      });
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingItemId(null);
    if (searchParams.has('action') || searchParams.has('edit')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      newParams.delete('edit');
      setSearchParams(newParams);
    }
  };

  const handleSaveItem = async (values: z.infer<typeof formSchema>) => {
    setIsSavingItem(true);
    try {
      if (drawerMode === 'create') {
        const docId = (values.id && values.id.trim())
          ? values.id.trim().toLowerCase().replace(/\s+/g, '_')
          : values.name.trim().toLowerCase().replace(/\s+/g, '_');

        if (!docId) {
          alert('Please enter a valid Item Document ID or Name');
          setIsSavingItem(false);
          return;
        }

        const payload = {
          ...values,
          id: docId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await setDoc(doc(db, "shopItems", docId), payload);
        showToast(`Created shop item "${docId}" successfully!`);
      } else {
        if (!editingItemId) return;
        const payload = {
          name: values.name,
          description: values.description,
          type: values.type,
          category: values.category,
          cost: values.cost,
          active: values.active,
          forSale: values.forSale,
          premiumOnly: values.premiumOnly,
          featured: values.featured,
          requiresShipping: values.requiresShipping,
          image: values.image || "",
          thumbnail: values.thumbnail || "",
          preview: values.preview || "",
          order: values.order || 1,
          collectionId: values.collectionId || "",
          updatedAt: Date.now()
        };

        await updateDoc(doc(db, "shopItems", editingItemId), payload);
        showToast(`Updated shop item "${editingItemId}" successfully!`);
      }

      closeDrawer();
      await fetchData();
    } catch (e: any) {
      console.error('Error saving shop item:', e);
      alert(`Failed to save item: ${e.message}`);
    } finally {
      setIsSavingItem(false);
    }
  };

  // Smart Seed via Backend API
  const seedShopItems = async () => {
    if (!confirm('Seed default shop items from shop_items.json? This will add missing default items and merge missing properties while preserving custom pricing and status edits.')) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/shop/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ force: false })
      });

      const data = await res.json();
      if (data.success) {
        await fetchData();
        showToast(`Seeded defaults successfully! Created: ${data.createdCount}, Updated: ${data.updatedCount}`);
      } else {
        alert(`Failed to seed default items: ${data.error}`);
        setLoading(false);
      }
    } catch (e: any) {
      console.error('Error seeding shop items:', e);
      alert(`Failed to seed default items: ${e.message}`);
      setLoading(false);
    }
  };

  // Push Live Items to shop_items.json
  const pushToManifest = async () => {
    if (!confirm(`Push all ${shopItems.length} live shop items to shop_items.json manifest? This will update the local manifest file permanently.`)) return;
    setIsPushingManifest(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/shop/export-manifest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Manifest updated permanently! Saved ${data.count} items to shop_items.json.`);
      } else {
        alert(`Failed to push to manifest: ${data.error}`);
      }
    } catch (e: any) {
      console.error('Error pushing manifest:', e);
      alert(`Failed to update manifest: ${e.message}`);
    } finally {
      setIsPushingManifest(false);
    }
  };

  // Download Manifest JSON Backup
  const downloadManifestJson = () => {
    const sorted = [...shopItems].sort((a, b) => (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id));
    const jsonStr = JSON.stringify(sorted, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shop_items_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${sorted.length} shop items as JSON backup!`);
  };

  // Live JSON Parse Effect for Import Modal
  useEffect(() => {
    if (!importJsonText.trim()) {
      setParsedImportItems([]);
      setImportParseError(null);
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);
      const itemsArray = Array.isArray(parsed) ? parsed : [parsed];
      setParsedImportItems(itemsArray);
      setImportParseError(null);
    } catch (e: any) {
      setParsedImportItems([]);
      setImportParseError(`Invalid JSON syntax: ${e.message}`);
    }
  }, [importJsonText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content || '');
    };
    reader.readAsText(file);
  };

  // Submit Import
  const handleExecuteImport = async () => {
    if (parsedImportItems.length === 0) return;
    setIsImporting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/shop/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: parsedImportItems,
          overwrite: importOverwrite
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsImportModalOpen(false);
        setImportJsonText('');
        setParsedImportItems([]);
        await fetchData();
        showToast(`Imported items successfully! Created: ${data.createdCount}, Updated: ${data.updatedCount}, Skipped: ${data.skippedCount}`);
      } else {
        alert(`Failed to import items: ${data.error}`);
      }
    } catch (e: any) {
      console.error('Error importing items:', e);
      alert(`Error importing items: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete/archive shop item "${id}"?`)) return;
    try {
      await deleteDoc(doc(db, 'shopItems', id));
      setShopItems(prev => prev.filter(item => item.id !== id));
      showToast(`Deleted shop item "${id}"`);
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
      showToast(`Updated ${field} for "${id}"`);
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
      showToast(`Updated price to ${numCost.toLocaleString()} Links for "${id}"`);
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
    if (sortOption === 'COST_ASC') return (a.cost || 0) - (b.cost || 0);
    if (sortOption === 'COST_DESC') return (b.cost || 0) - (a.cost || 0);
    if (sortOption === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
    if (sortOption === 'TYPE') return (a.type || '').localeCompare(b.type || '');

    // Default: Sort Order Index
    if ((a.active !== false) !== (b.active !== false)) return a.active !== false ? -1 : 1;
    return (a.order || 0) - (b.order || 0);
  });

  // Apply Bulk Pricing Adjustment
  const handleApplyBulkPricing = async () => {
    const itemsToUpdate = pricingScope === 'ALL' ? shopItems : filteredItems;
    if (itemsToUpdate.length === 0) return;

    const val = Number(pricingValue) || 0;
    if (!confirm(`Apply pricing adjustment (${pricingAction}) to ${itemsToUpdate.length} item(s)?`)) return;

    setIsPricingApplying(true);
    try {
      for (const item of itemsToUpdate) {
        let currentCost = item.cost || 0;
        let newCost = currentCost;

        if (pricingAction === 'INC_PCT') newCost = Math.round(currentCost * (1 + val / 100));
        else if (pricingAction === 'DEC_PCT') newCost = Math.max(0, Math.round(currentCost * (1 - val / 100)));
        else if (pricingAction === 'INC_FIXED') newCost = Math.round(currentCost + val);
        else if (pricingAction === 'DEC_FIXED') newCost = Math.max(0, Math.round(currentCost - val));
        else if (pricingAction === 'SET_FIXED') newCost = Math.max(0, val);

        if (newCost !== currentCost) {
          await updateDoc(doc(db, 'shopItems', item.id), {
            cost: newCost,
            updatedAt: Date.now()
          });
        }
      }
      setIsPricingModalOpen(false);
      await fetchData();
      showToast(`Updated pricing for ${itemsToUpdate.length} items!`);
    } catch (e: any) {
      console.error('Error applying bulk pricing:', e);
      alert(`Failed to apply bulk pricing: ${e.message}`);
    } finally {
      setIsPricingApplying(false);
    }
  };

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

  const renderLiveDrawerPreview = () => {
    const { name, description, cost, type, category, premiumOnly, image, thumbnail, preview } = watchAll;
    const imageKey = image || '';
    const previewKey = preview || imageKey;

    return (
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Banner / Visual Stage */}
        <div className="h-40 bg-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
          {type === 'PROFILE_BANNER' && (
            thumbnail ? (
              <FirebaseImage src={thumbnail} alt={name || 'Preview'} className="absolute inset-0 w-full h-full object-cover" />
            ) : ProfileBannerMap[imageKey] ? (
              <div className="absolute inset-0">
                {React.createElement(ProfileBannerMap[imageKey], { isStatic: false })}
              </div>
            ) : (imageKey.startsWith('/') || imageKey.startsWith('http') || imageKey.startsWith('gs://')) ? (
              <FirebaseImage src={imageKey} alt={name || 'Preview'} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className={`absolute inset-0 ${imageKey || 'bg-gradient-to-r from-zinc-800 to-zinc-900'}`} />
            )
          )}

          {type === 'AVATAR_RING' && (
            <div className="relative w-20 h-20 flex items-center justify-center z-10">
              {thumbnail ? (
                <FirebaseImage src={thumbnail} alt={name || 'Preview'} className="absolute inset-0 w-full h-full object-cover rounded-full" />
              ) : AvatarRingMap[imageKey] ? (
                <>
                  <div className="absolute inset-0 transform scale-[1.35]">
                    {React.createElement(AvatarRingMap[imageKey], { isStatic: false })}
                  </div>
                  <div className="relative w-full h-full p-2">
                    <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-medium">Avatar</div>
                  </div>
                </>
              ) : (
                <div className={`w-20 h-20 rounded-full border-4 ${imageKey || 'border-zinc-600'} bg-zinc-900 flex items-center justify-center text-xs text-zinc-400 font-semibold`}>
                  Avatar
                </div>
              )}
            </div>
          )}

          {type === 'TITLE' && (
            <div className="z-10 px-4">
              {TitleMap[previewKey || imageKey] ? (
                React.createElement(TitleMap[previewKey || imageKey], { isStatic: false })
              ) : (
                <div className={`text-lg font-bold text-zinc-200 px-4 py-2 bg-black/60 rounded-lg border border-zinc-700/80 ${imageKey || ''}`}>
                  {name || 'Title Preview'}
                </div>
              )}
            </div>
          )}

          {(type === 'MERCH' || type === 'GIFT_CARD') && (
            <div className="w-full h-full relative flex items-center justify-center">
              {imageKey ? (
                <FirebaseImage src={imageKey} alt={name || 'Merch'} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag className="w-12 h-12 text-zinc-600" />
              )}
            </div>
          )}
        </div>

        {/* Details Card Preview */}
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-bold text-zinc-100">{name || 'Item Name'}</h4>
              {premiumOnly && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-purple-400 mt-0.5">
                  <Crown className="w-3 h-3 text-purple-400" /> Pro Exclusive
                </span>
              )}
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">
              {category || type}
            </span>
          </div>

          <p className="text-xs text-zinc-400 min-h-[32px] line-clamp-2">
            {description || 'Item description will appear here in the shop storefront card.'}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="font-mono font-bold text-cyan-400 flex items-center gap-1 text-sm">
              <Coins className="w-4 h-4 text-cyan-400" /> {(cost || 0).toLocaleString()}
            </div>
            <Button
              disabled
              className="bg-[#22c55e] opacity-80 text-white font-semibold text-xs px-3 h-7"
            >
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto relative">
      {/* Toast Banner Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 font-display flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-[#22c55e]" />
            Shop & Catalog Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Manage cosmetic shop items, bulk pricing, JSON imports, and permanent manifest synchronization.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            className="gap-1.5 border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPricingModalOpen(true)}
            className="gap-1.5 border-zinc-700 hover:bg-zinc-800 text-cyan-400 text-xs"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Adjust Pricing
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-1.5 border-zinc-700 hover:bg-zinc-800 text-emerald-400 text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={pushToManifest}
            disabled={isPushingManifest}
            className="gap-1.5 border-emerald-500/40 hover:bg-emerald-950/50 text-emerald-300 text-xs font-semibold"
            title="Update shop_items.json permanently on server"
          >
            <Save className={`w-3.5 h-3.5 ${isPushingManifest ? 'animate-spin' : ''}`} />
            Push to Manifest
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={downloadManifestJson}
            className="gap-1.5 border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs"
            title="Download local JSON copy"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={seedShopItems}
            className="gap-1.5 border-zinc-700 hover:bg-zinc-800 text-amber-400 text-xs"
            title="Seed defaults while preserving custom edits"
          >
            <Database className="w-3.5 h-3.5" />
            Seed Defaults
          </Button>

          <Button
            size="sm"
            onClick={openCreateDrawer}
            className="gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Item
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total Catalog</p>
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

            {/* Sort Order Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent text-zinc-200 focus:outline-none text-xs"
              >
                <option value="ORDER">Order Index</option>
                <option value="COST_ASC">Price: Low to High</option>
                <option value="COST_DESC">Price: High to Low</option>
                <option value="NAME_ASC">Name A-Z</option>
                <option value="TYPE">Type</option>
              </select>
            </div>
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
                            onClick={() => openEditDrawer(item.id)}
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

      {/* Slide-Over Drawer Modal for Item Creation & Editing */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#18181A]">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-base">
                {drawerMode === 'create' ? (
                  <>
                    <Plus className="w-5 h-5 text-emerald-400" />
                    Create New Shop Item
                  </>
                ) : (
                  <>
                    <Edit3 className="w-5 h-5 text-emerald-400" />
                    Edit Shop Item: <span className="font-mono text-cyan-400">{editingItemId}</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeDrawer}
                className="text-zinc-400 hover:text-white h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {/* Quick Component Key Mapping Helper Box */}
              <div className="bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-cyan-950/30 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <HelpCircle className="w-3.5 h-3.5" /> Mapping Guide for Shop Cosmetics
                </div>
                <div className="text-zinc-300 text-[11px] space-y-1">
                  <p><strong className="text-cyan-400">Shader Key:</strong> Set <code className="text-emerald-300">image</code> to registered key (e.g. <code className="text-zinc-200">EmeraldStormBanner</code>, <code className="text-zinc-200">BullBearAvatarRing</code>).</p>
                  <p><strong className="text-cyan-400">Image Asset:</strong> Set <code className="text-emerald-300">image</code> or <code className="text-emerald-300">thumbnail</code> to URL or path (e.g. <code className="text-zinc-200">/images/item.png</code>).</p>
                </div>
              </div>

              {/* Live Cosmetic Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" /> Live Storefront Card Preview
                </label>
                {renderLiveDrawerPreview()}
              </div>

              {/* Item Form Fields */}
              <form onSubmit={form.handleSubmit(handleSaveItem)} className="space-y-4 pt-2">
                {drawerMode === 'create' && (
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Item Document ID <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="e.g. banner_emerald_storm or ring_gold"
                      value={form.watch('id')}
                      onChange={(e) => form.setValue('id', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Unique identifier in Firestore `shopItems` collection. (Auto-generated from Name if left blank)
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Display Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g. The Emerald Storm"
                    value={form.watch('name')}
                    onChange={(e) => form.setValue('name', e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs focus:border-emerald-500"
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-400 text-[11px] mt-0.5">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Item Type (System)</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                      value={watchAll.type}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        form.setValue('type', val);
                        if (val === 'PROFILE_BANNER') form.setValue('category', 'Banners (Dynamic)');
                        else if (val === 'AVATAR_RING') form.setValue('category', 'Avatar background (dynamic)');
                        else if (val === 'TITLE') form.setValue('category', 'Title regular');
                        else if (val === 'MERCH') form.setValue('category', 'Merch');
                      }}
                    >
                      {shopItemTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Display Category</label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                      value={watchAll.category}
                      onChange={(e) => form.setValue('category', e.target.value)}
                    >
                      {shopItemCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">Description</label>
                  <Textarea
                    placeholder="Detailed description shown in shop modal and card..."
                    value={watchAll.description}
                    onChange={(e) => form.setValue('description', e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs min-h-[70px] focus:border-emerald-500"
                  />
                  {form.formState.errors.description && (
                    <p className="text-red-400 text-[11px] mt-0.5">{form.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Cost (Links)</label>
                    <Input
                      type="number"
                      min="0"
                      value={watchAll.cost}
                      onChange={(e) => form.setValue('cost', Number(e.target.value))}
                      className="bg-zinc-900 border-zinc-800 text-cyan-400 font-mono font-bold text-xs focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">Sort Order Index</label>
                    <Input
                      type="number"
                      value={watchAll.order}
                      onChange={(e) => form.setValue('order', Number(e.target.value))}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Status Switches */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watchAll.active}
                      onChange={(e) => form.setValue('active', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="font-semibold text-zinc-300">Active in DB</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watchAll.forSale}
                      onChange={(e) => form.setValue('forSale', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="font-semibold text-zinc-300">For Sale in Shop</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watchAll.premiumOnly}
                      onChange={(e) => form.setValue('premiumOnly', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-500/20"
                    />
                    <span className="font-semibold text-zinc-300">Pro Exclusive</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watchAll.featured}
                      onChange={(e) => form.setValue('featured', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/20"
                    />
                    <span className="font-semibold text-zinc-300">Featured Item</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={watchAll.requiresShipping}
                      onChange={(e) => form.setValue('requiresShipping', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500/20"
                    />
                    <span className="font-semibold text-zinc-300">Requires Physical Shipping Info (Merch)</span>
                  </label>
                </div>

                {/* Registered Asset Key Selectors */}
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  {watchAll.type === 'PROFILE_BANNER' && (
                    <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg space-y-1">
                      <label className="text-[11px] font-bold text-cyan-400 block">
                        Select Registered Banner Component Key:
                      </label>
                      <select
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:border-emerald-500"
                        value={registeredBanners.includes(watchAll.image || '') ? watchAll.image : ''}
                        onChange={(e) => {
                          if (e.target.value) form.setValue('image', e.target.value);
                        }}
                      >
                        <option value="">-- Choose registered banner key --</option>
                        {registeredBanners.map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {watchAll.type === 'AVATAR_RING' && (
                    <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg space-y-1">
                      <label className="text-[11px] font-bold text-cyan-400 block">
                        Select Registered Avatar Ring Key:
                      </label>
                      <select
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:border-emerald-500"
                        value={registeredRings.includes(watchAll.image || '') ? watchAll.image : ''}
                        onChange={(e) => {
                          if (e.target.value) form.setValue('image', e.target.value);
                        }}
                      >
                        <option value="">-- Choose registered ring key --</option>
                        {registeredRings.map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {watchAll.type === 'TITLE' && (
                    <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-lg space-y-1">
                      <label className="text-[11px] font-bold text-cyan-400 block">
                        Select Registered Title Component Key:
                      </label>
                      <select
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:border-emerald-500"
                        value={registeredTitles.includes(watchAll.image || '') ? watchAll.image : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            form.setValue('image', e.target.value);
                            form.setValue('preview', e.target.value);
                          }
                        }}
                      >
                        <option value="">-- Choose registered title key --</option>
                        {registeredTitles.map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Component Key / Image URL / Class
                    </label>
                    <Input
                      placeholder="e.g. EmeraldStormBanner, BullBearAvatarRing, or /images/item.jpg"
                      value={watchAll.image}
                      onChange={(e) => form.setValue('image', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Static Thumbnail Image URL (Optional Override)
                    </label>
                    <Input
                      placeholder="e.g. /images/merch/tee-black.jpg"
                      value={watchAll.thumbnail}
                      onChange={(e) => form.setValue('thumbnail', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Set / Collection ID Tag
                    </label>
                    <Input
                      placeholder="e.g. opulento, inferno, ocean, xenon"
                      value={watchAll.collectionId}
                      onChange={(e) => form.setValue('collectionId', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-cyan-400 font-mono text-xs focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800 sticky bottom-0 bg-[#121212] py-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDrawer}
                    className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingItem}
                    className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-xs gap-1.5"
                  >
                    {isSavingItem ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        {drawerMode === 'create' ? 'Create Shop Item' : 'Update Shop Item'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 max-w-3xl w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-lg">
                <Upload className="w-5 h-5 text-emerald-400" />
                Import Shop Items (JSON)
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-400 hover:text-white h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-zinc-400">
              Paste item JSON array or upload a <code className="text-emerald-400">.json</code> file to batch import items into Firestore.
            </p>

            {/* File Upload Box */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-dashed border-zinc-700 p-3 rounded-xl">
              <UploadCloud className="w-6 h-6 text-zinc-400 shrink-0" />
              <div className="flex-1 text-xs">
                <span className="font-semibold text-zinc-200">Upload JSON File</span>
                <p className="text-zinc-500">Select a local JSON catalog or backup file</p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="text-xs text-zinc-300 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
              />
            </div>

            {/* Paste Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 block">
                Paste JSON Payload:
              </label>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='[{"id": "banner_example", "name": "Example Banner", "type": "PROFILE_BANNER", "cost": 1000}]'
                className="w-full h-44 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 custom-scrollbar"
              />
            </div>

            {/* Parsing Validation Feedback */}
            {importParseError ? (
              <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-lg flex items-center gap-2 text-red-300 text-xs font-mono">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{importParseError}</span>
              </div>
            ) : parsedImportItems.length > 0 ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-lg flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Found {parsedImportItems.length} valid item(s) ready to import.
                </span>
                <label className="inline-flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importOverwrite}
                    onChange={(e) => setImportOverwrite(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Overwrite existing matching IDs</span>
                </label>
              </div>
            ) : null}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteImport}
                disabled={parsedImportItems.length === 0 || isImporting}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Import {parsedImportItems.length} Item(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Pricing Adjustment Modal */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-lg">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                Batch Price Adjustment
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPricingModalOpen(false)}
                className="text-zinc-400 hover:text-white h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Target Item Scope:</label>
                <select
                  value={pricingScope}
                  onChange={(e) => setPricingScope(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="FILTERED">Currently Filtered Items ({filteredItems.length} items)</option>
                  <option value="ALL">Entire Catalog ({shopItems.length} items)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Adjustment Action:</label>
                <select
                  value={pricingAction}
                  onChange={(e) => setPricingAction(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="INC_PCT">Increase Price by Percentage (%)</option>
                  <option value="DEC_PCT">Decrease Price by Percentage (%)</option>
                  <option value="INC_FIXED">Increase Price by Fixed Links Amount (+ Links)</option>
                  <option value="DEC_FIXED">Decrease Price by Fixed Links Amount (- Links)</option>
                  <option value="SET_FIXED">Set Fixed Price for All Selected Items</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Adjustment Value {pricingAction.includes('PCT') ? '(Percentage)' : '(Links)'}:
                </label>
                <Input
                  type="number"
                  min="0"
                  value={pricingValue}
                  onChange={(e) => setPricingValue(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-cyan-400 font-mono font-bold"
                />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-zinc-400 space-y-1">
                <span className="font-semibold text-zinc-200 block">Preview Example:</span>
                <p>An item currently costing 1,000 Links will become:</p>
                <p className="font-mono text-cyan-300 font-bold text-sm pt-1">
                  {(() => {
                    const v = Number(pricingValue) || 0;
                    if (pricingAction === 'INC_PCT') return `${Math.round(1000 * (1 + v / 100)).toLocaleString()} Links`;
                    if (pricingAction === 'DEC_PCT') return `${Math.max(0, Math.round(1000 * (1 - v / 100))).toLocaleString()} Links`;
                    if (pricingAction === 'INC_FIXED') return `${Math.round(1000 + v).toLocaleString()} Links`;
                    if (pricingAction === 'DEC_FIXED') return `${Math.max(0, Math.round(1000 - v)).toLocaleString()} Links`;
                    return `${Math.max(0, v).toLocaleString()} Links`;
                  })()}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPricingModalOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyBulkPricing}
                disabled={isApplyingPricing}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold gap-2 text-xs"
              >
                {isApplyingPricing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Apply Adjustment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
