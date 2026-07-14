import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, Plus, X } from 'lucide-react';

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

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    active: true,
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    } catch (e) {
      console.error(e);
      // Fallback in case index is missing
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
    setCurrentId(null);
    setIsEditing(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      active: announcement.active !== false, // default true
      priority: announcement.priority || 'MEDIUM',
    });
    setCurrentId(announcement.id);
    setIsEditing(true);
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
    try {
      if (currentId) {
        await updateDoc(doc(db, 'announcements', currentId), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...formData,
          createdAt: serverTimestamp(),
        });
      }
      setIsEditing(false);
      fetchAnnouncements();
    } catch (e) {
      console.error(e);
      alert('Failed to save announcement');
    }
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-zinc-100">Manage Announcements</h2>
        {!isEditing && (
          <Button onClick={handleOpenNew} className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-[#18181A] border border-zinc-800 rounded-lg p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-zinc-200">{currentId ? 'Edit Announcement' : 'New Announcement'}</h3>
            <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                placeholder="Announcement Title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Content</label>
              <textarea
                required
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none"
                placeholder="Announcement Content..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20"
                  />
                  <span className="text-sm font-medium text-zinc-300">Active (Visible to users)</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">
                {currentId ? 'Update' : 'Create'} Announcement
              </Button>
            </div>
          </form>
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-zinc-500">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium bg-[#18181A] rounded-lg border border-zinc-800/50">
          No announcements found. Create one to get started.
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid gap-4">
            {announcements.map((ann) => (
              <div key={ann.id} className={`p-4 rounded-lg border flex justify-between items-start gap-4 ${ann.active ? 'bg-[#18181A] border-zinc-800' : 'bg-zinc-900/50 border-zinc-800/50 opacity-70'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-zinc-200 text-lg">{ann.title}</h3>
                    {!ann.active && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-500/20 text-red-400">Inactive</span>}
                    {ann.priority === 'HIGH' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-orange-500/20 text-orange-400">High Priority</span>}
                  </div>
                  <p className="text-zinc-400 text-sm whitespace-pre-wrap">{ann.content}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(ann)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 rounded-md">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ann.id)} className="p-2 text-red-500/70 hover:text-red-500 transition-colors bg-red-500/10 hover:bg-red-500/20 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
