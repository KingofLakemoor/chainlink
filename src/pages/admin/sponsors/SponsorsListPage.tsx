import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { db, app } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import {
  Search, Edit, Trash2, Plus, Diamond, RefreshCw, X, Upload, ExternalLink, Star, CheckCircle2
} from 'lucide-react';

interface Sponsor {
  id: string;
  name: string;
  description: string;
  url: string;
  image: string;
  color?: string;
  active: boolean;
  featured: boolean;
  tier: string;
  order?: number;
  createdAt?: number;
  updatedAt?: number;
}

export default function SponsorsListPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'FEATURED'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    image: '',
    color: '#3b82f6',
    tier: 'STANDARD',
    active: true,
    featured: false,
    order: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'sponsors'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sponsor));
      docs.sort((a, b) => (a.order || 0) - (b.order || 0));
      setSponsors(docs);
    } catch (e) {
      console.error('Error fetching sponsors:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return;
    try {
      await deleteDoc(doc(db, 'sponsors', id));
      fetchData();
    } catch (e) {
      console.error('Error deleting sponsor:', e);
      alert('Failed to delete sponsor');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSponsor(null);
    setFormData({
      name: '',
      description: '',
      url: '',
      image: '',
      color: '#3b82f6',
      tier: 'STANDARD',
      active: true,
      featured: false,
      order: sponsors.length ? (Math.max(...sponsors.map(s => s.order || 0)) + 1) : 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name || '',
      description: sponsor.description || '',
      url: sponsor.url || '',
      image: sponsor.image || '',
      color: sponsor.color || '#3b82f6',
      tier: sponsor.tier || 'STANDARD',
      active: sponsor.active !== false,
      featured: sponsor.featured || false,
      order: sponsor.order || 0,
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const fileRef = ref(getStorage(app), `sponsors/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      setFormData(prev => ({ ...prev, image: downloadUrl }));
    } catch (e) {
      console.error('Error uploading image:', e);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        image: formData.image.trim(),
        color: formData.color,
        tier: formData.tier.toUpperCase().trim(),
        active: formData.active,
        featured: formData.featured,
        order: Number(formData.order) || 0,
        updatedAt: Date.now(),
      };

      if (editingSponsor) {
        await updateDoc(doc(db, 'sponsors', editingSponsor.id), payload);
      } else {
        await addDoc(collection(db, 'sponsors'), {
          ...payload,
          createdAt: Date.now(),
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      console.error('Error saving sponsor:', e);
      alert('Failed to save sponsor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered
  const filteredSponsors = sponsors.filter(item => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tier || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return item.active === true;
    if (statusFilter === 'INACTIVE') return item.active === false;
    if (statusFilter === 'FEATURED') return item.featured === true;

    return true;
  });

  const activeCount = sponsors.filter(s => s.active).length;
  const featuredCount = sponsors.filter(s => s.featured).length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Diamond className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{sponsors.length}</div>
            <div className="text-xs text-zinc-400">Total Sponsors</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{activeCount}</div>
            <div className="text-xs text-zinc-400">Active Partners</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{featuredCount}</div>
            <div className="text-xs text-zinc-400">Featured Sponsors</div>
          </div>
        </div>
      </div>

      {/* Main List Container */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <h3 className="font-bold text-lg text-zinc-100">Sponsors & Partners ({filteredSponsors.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className="text-zinc-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search sponsors..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="FEATURED">Featured Only</option>
            </select>

            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sponsor
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading sponsors...</div>
        ) : filteredSponsors.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No sponsors found matching filter.</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Actions</th>
                  <th className="px-4 py-3 font-medium">Logo</th>
                  <th className="px-4 py-3 font-medium">Sponsor Name</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Featured</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredSponsors.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => handleOpenEditModal(item)}
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
                    <td className="px-4 py-3">
                      {item.image ? (
                        <div className="w-10 h-10 rounded-lg p-1 bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                          <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-500">
                          <Diamond className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || '#3b82f6' }} />
                        {item.name}
                      </div>
                      <div className="text-xs text-zinc-400 max-w-xs truncate">{item.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                        {item.tier || 'STANDARD'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.featured ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                          <Star className="w-3 h-3 fill-amber-400" /> Featured
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{item.order || 0}</td>
                    <td className="px-4 py-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 max-w-xs truncate"
                      >
                        {item.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Sponsor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
              <h3 className="font-bold text-lg text-zinc-100">
                {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSponsor} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Sponsor Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Website URL</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short summary of sponsorship..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Tier Level</label>
                  <input
                    type="text"
                    required
                    value={formData.tier}
                    onChange={e => setFormData({ ...formData, tier: e.target.value })}
                    placeholder="STANDARD, GOLD, etc."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Display Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={e => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="w-10 h-9 bg-zinc-900 border border-zinc-800 rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono text-zinc-400">{formData.color}</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-zinc-300 font-medium">Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/20"
                    />
                    <span className="text-xs text-zinc-300 font-medium">Featured</span>
                  </label>
                </div>
              </div>

              {/* Logo Image Upload & Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Logo Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                  <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-2 rounded-lg border border-zinc-700 flex items-center gap-1.5 font-medium transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {isUploading ? 'Uploading...' : 'File'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                </div>

                {formData.image && (
                  <div className="pt-2 flex items-center gap-3 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800">
                    <div className="w-12 h-12 p-1 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
                      <img src={formData.image} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="text-xs text-zinc-400">Sponsor Logo Preview</span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-800">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {isSubmitting ? 'Saving...' : editingSponsor ? 'Update Sponsor' : 'Create Sponsor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
