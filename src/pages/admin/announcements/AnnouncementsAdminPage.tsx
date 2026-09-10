import React, { useState, useEffect } from 'react';
import { collection, getDocs, limit, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, Plus, X, Megaphone, CheckCircle2, AlertCircle, Search, Flame } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  active: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: any;
}

export default function AnnouncementsAdminPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Slide-over Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    active: true,
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    } catch (e) {
      console.error(e);
      try {
        const snap = await getDocs(collection(db, 'announcements'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setAnnouncements(docs);
      } catch (innerE) {
        console.error("Failed to fetch announcements:", innerE);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenNew = () => {
    setFormData({ title: '', content: '', active: true, priority: 'MEDIUM' });
    setEditingId(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      active: announcement.active !== false,
      priority: announcement.priority || 'MEDIUM',
    });
    setEditingId(announcement.id);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      fetchAnnouncements();
    } catch (e) {
      console.error(e);
      alert('Failed to delete announcement');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...formData,
          createdAt: serverTimestamp(),
        });
      }
      setIsDrawerOpen(false);
      fetchAnnouncements();
    } catch (e) {
      console.error(e);
      alert('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const totalCount = announcements.length;
  const activeCount = announcements.filter(a => a.active !== false).length;
  const inactiveCount = announcements.filter(a => a.active === false).length;
  const highPriorityCount = announcements.filter(a => a.priority === 'HIGH').length;

  const filteredAnnouncements = announcements.filter(ann => {
    if (priorityFilter !== 'ALL' && ann.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ann.title?.toLowerCase().includes(q);
      const matchContent = ann.content?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Announcements</span>
              <span className="text-2xl font-bold font-display text-white mt-1 block">{totalCount}</span>
            </div>
            <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Megaphone className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Active & Published</span>
              <span className="text-2xl font-bold font-display text-emerald-400 mt-1 block">{activeCount}</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Inactive / Drafts</span>
              <span className="text-2xl font-bold font-display text-zinc-400 mt-1 block">{inactiveCount}</span>
            </div>
            <div className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">High Priority</span>
              <span className="text-2xl font-bold font-display text-orange-400 mt-1 block">{highPriorityCount}</span>
            </div>
            <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Table & Header */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#18181A]">
          <h3 className="font-bold text-lg text-white">Announcements ({filteredAnnouncements.length})</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements..."
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-zinc-700 w-52 text-white"
              />
            </div>

            <Button variant="secondary" size="sm" onClick={fetchAnnouncements} className="text-xs">Refresh</Button>

            <Button
              onClick={handleOpenNew}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1"
            >
              <Plus className="w-4 h-4" /> Create Announcement
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading announcements...</div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No announcements found.</div>
        ) : (
          <div className="p-4 grid gap-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {filteredAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className={`p-4 rounded-xl border flex justify-between items-start gap-4 transition-colors ${
                  ann.active ? 'bg-[#18181A] border-zinc-800' : 'bg-zinc-900/40 border-zinc-800/50 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h4 className="font-bold text-zinc-100 text-base">{ann.title}</h4>
                    {!ann.active ? (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                        Inactive
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                    {ann.priority === 'HIGH' && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        High Priority
                      </span>
                    )}
                    {ann.priority === 'MEDIUM' && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Medium Priority
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEdit(ann)}
                    className="p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800/60 hover:bg-zinc-800 rounded-lg"
                    title="Edit Announcement"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-2 text-red-500/70 hover:text-red-500 transition-colors bg-red-500/10 hover:bg-red-500/20 rounded-lg"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over Modal Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <h3 className="font-bold text-lg text-white">{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="text-zinc-500 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 flex-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. New Pick 'Em Campaign Season Begins!"
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Announcement Body Content *</label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter announcement text for community members..."
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <span className="text-sm font-semibold text-zinc-200">Active (Visible to Users)</span>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800 flex items-center justify-end gap-3 mt-auto">
                <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                  {saving ? 'Saving...' : editingId ? 'Update Announcement' : 'Create Announcement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
