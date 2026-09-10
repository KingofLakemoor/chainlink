import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, deleteDoc, doc, updateDoc, addDoc, query, where, limit, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { db, app } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import {
  Search, Edit, Trash2, Plus, Trophy, Award, Filter, RefreshCw, X, Upload, CheckCircle2, User, Sparkles
} from 'lucide-react';

export const achievementTypes = [
  "CHAINWIN",
  "CHAINLOSS",
  "CHAINPUSH",
  "CAMPAIGNCHAIN",
  "CAMPAIGNWINS",
  "MONTHLYWIN",
  "MONTHLYLOSS",
  "MONTHLYPUSH",
  "WEEKLYWIN",
  "WEEKLYLOSS",
  "DAILYWIN",
  "DAILYLOSS",
  "WINS",
  "LOSS",
  "PUSH",
  "SQUADWIN",
  "SQUADLOSS",
  "REFERRAL",
  "LINKS",
  "FRIENDS",
  "OTHER",
] as const;

export default function AchievementsListPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<any | null>(null);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'OTHER',
    weight: 0,
    threshold: 1,
    links: 10,
    image: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Award State
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserForAward, setSelectedUserForAward] = useState<any | null>(null);
  const [selectedAchievementForAward, setSelectedAchievementForAward] = useState<string>('');
  const [awardMessage, setAwardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const achSnap = await getDocs(collection(db, 'achievements'));
      setAchievements(achSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching achievements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced User Search for Awarding
  useEffect(() => {
    if (!userQuery.trim() || userQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const qLower = userQuery.toLowerCase().trim();
        const usersRef = collection(db, 'users');
        const snap = await getDocs(
          query(
            usersRef,
            where('usernameLower', '>=', qLower),
            where('usernameLower', '<=', qLower + '\uf8ff'),
            limit(10)
          )
        );
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Fallback: if usernameLower search produced no results, try matching by email
        if (results.length === 0) {
          const emailSnap = await getDocs(
            query(
              usersRef,
              where('email', '>=', qLower),
              where('email', '<=', qLower + '\uf8ff'),
              limit(10)
            )
          );
          setSearchResults(emailSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setSearchResults(results);
        }
      } catch (e) {
        console.error('Error searching users:', e);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;
    try {
      await deleteDoc(doc(db, 'achievements', id));
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to delete achievement');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAchievement(null);
    setFormData({
      name: '',
      description: '',
      type: 'OTHER',
      weight: 0,
      threshold: 1,
      links: 10,
      image: '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (ach: any) => {
    setEditingAchievement(ach);
    setFormData({
      name: ach.name || '',
      description: ach.description || '',
      type: ach.type || 'OTHER',
      weight: ach.weight || 0,
      threshold: ach.threshold || 0,
      links: ach.links || 0,
      image: ach.image || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        weight: Number(formData.weight) || 0,
        threshold: Number(formData.threshold) || 0,
        links: Number(formData.links) || 0,
        image: formData.image.trim() || undefined,
        updatedAt: Date.now(),
      };

      if (editingAchievement) {
        await updateDoc(doc(db, 'achievements', editingAchievement.id), payload);
      } else {
        await addDoc(collection(db, 'achievements'), {
          ...payload,
          createdAt: Date.now(),
        });
      }

      setIsEditModalOpen(false);
      fetchData();
    } catch (e) {
      console.error('Error saving achievement:', e);
      alert('Failed to save achievement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const fileRef = ref(getStorage(app), `Achievements/${Date.now()}_${file.name}`);
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

  const handleOpenAwardModal = () => {
    setUserQuery('');
    setSearchResults([]);
    setSelectedUserForAward(null);
    setSelectedAchievementForAward(achievements[0]?.id || '');
    setAwardMessage(null);
    setIsAwardModalOpen(true);
  };

  const handleAwardAchievement = async () => {
    if (!selectedUserForAward || !selectedAchievementForAward) return;

    setIsAwarding(true);
    setAwardMessage(null);

    try {
      const userRef = doc(db, 'users', selectedUserForAward.id);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setAwardMessage({ type: 'error', text: 'User not found in Firestore' });
        return;
      }

      const userData = userSnap.data();
      const currentAchievements = userData.achievements || [];

      if (currentAchievements.some((a: any) => a.achievementId === selectedAchievementForAward)) {
        setAwardMessage({ type: 'error', text: 'User already has this achievement awarded!' });
        return;
      }

      const achievement = achievements.find(a => a.id === selectedAchievementForAward);

      await updateDoc(userRef, {
        achievements: [
          ...currentAchievements,
          {
            achievementId: selectedAchievementForAward,
            awardedAt: Date.now(),
          },
        ],
        links: (userData.links || 0) + (achievement?.links || 0),
      });

      setAwardMessage({
        type: 'success',
        text: `Successfully awarded "${achievement?.name || 'Achievement'}" to @${userData.username || userData.name || selectedUserForAward.id}!`,
      });
      setSelectedUserForAward(null);
      setUserQuery('');
    } catch (e) {
      console.error('Error awarding achievement:', e);
      setAwardMessage({ type: 'error', text: 'Failed to award achievement. Please try again.' });
    } finally {
      setIsAwarding(false);
    }
  };

  // Filtered List
  const filteredAchievements = achievements.filter(ach => {
    const matchesSearch =
      (ach.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ach.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || ach.type === selectedType;
    return matchesSearch && matchesType;
  });

  const manualCount = achievements.filter(a => a.type === 'OTHER').length;
  const systemCount = achievements.length - manualCount;

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{achievements.length}</div>
            <div className="text-xs text-zinc-400">Total Achievements</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{systemCount}</div>
            <div className="text-xs text-zinc-400">System Automatic</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{manualCount}</div>
            <div className="text-xs text-zinc-400">Manual / Custom</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <h3 className="font-bold text-lg text-zinc-100">Achievements ({filteredAchievements.length})</h3>
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
                placeholder="Search achievements..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Types</option>
              {achievementTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={handleOpenAwardModal}
              className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2 text-xs"
            >
              <Award className="w-3.5 h-3.5" />
              Award User
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading achievements...</div>
        ) : filteredAchievements.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No achievements found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Actions</th>
                  <th className="px-4 py-3 font-medium">Icon</th>
                  <th className="px-4 py-3 font-medium">Name & Description</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Threshold</th>
                  <th className="px-4 py-3 font-medium">Reward (Links)</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredAchievements.map((ach) => (
                  <tr key={ach.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => handleOpenEditModal(ach)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(ach.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {ach.image ? (
                        <img src={ach.image} alt={ach.name} className="w-8 h-8 rounded-lg object-cover bg-zinc-900 border border-zinc-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-amber-400">
                          <Trophy className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100">{ach.name}</div>
                      <div className="text-xs text-zinc-400 max-w-xs truncate" title={ach.description}>{ach.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${ach.type === 'OTHER' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                        {ach.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{ach.threshold || 0}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono font-medium text-xs">🔗 +{ach.links || 0}</td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{ach.weight || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Create / Edit Achievement */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
              <h3 className="font-bold text-lg text-zinc-100">
                {editingAchievement ? 'Edit Achievement' : 'Create New Achievement'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAchievement} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Achievement Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Iron Streaker"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  >
                    {achievementTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Reward (Links 🔗)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.links}
                    onChange={e => setFormData({ ...formData, links: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe how users earn this achievement..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.threshold}
                    onChange={e => setFormData({ ...formData, threshold: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Display Weight</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.weight}
                    onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {/* Image & Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Image Icon URL</label>
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
                    <img src={formData.image} alt="Preview" className="w-10 h-10 rounded-lg object-cover bg-zinc-900 border border-zinc-800" />
                    <span className="text-xs text-zinc-400 truncate">Image Preview Loaded</span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-800">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {isSubmitting ? 'Saving...' : editingAchievement ? 'Update Achievement' : 'Create Achievement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Award Achievement */}
      {isAwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-lg text-zinc-100">Award Achievement to User</h3>
              </div>
              <button onClick={() => setIsAwardModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {awardMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    awardMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {awardMessage.text}
                </div>
              )}

              {/* Select Achievement */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Select Achievement</label>
                <select
                  value={selectedAchievementForAward}
                  onChange={e => setSelectedAchievementForAward(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  {achievements.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type}) - 🔗+{a.links || 0} Links
                    </option>
                  ))}
                </select>
              </div>

              {/* User Lookup */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold uppercase text-zinc-400">Search User to Award</label>

                {selectedUserForAward ? (
                  <div className="flex items-center justify-between p-3 bg-zinc-900 border border-cyan-500/40 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold">
                        {selectedUserForAward.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-100">@{selectedUserForAward.username || selectedUserForAward.name}</div>
                        <div className="text-xs text-zinc-400">{selectedUserForAward.email}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUserForAward(null)} className="text-zinc-400 hover:text-white text-xs">
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                      <input
                        type="text"
                        value={userQuery}
                        onChange={e => setUserQuery(e.target.value)}
                        placeholder="Type username or email to search..."
                        className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                      />
                    </div>

                    {searchingUsers && (
                      <div className="text-xs text-zinc-500 py-2 text-center">Searching user database...</div>
                    )}

                    {searchResults.length > 0 && !selectedUserForAward && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-zinc-800/50">
                        {searchResults.map(u => (
                          <div
                            key={u.id}
                            onClick={() => setSelectedUserForAward(u)}
                            className="p-2.5 hover:bg-zinc-800/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-zinc-400" />
                              <span className="text-xs font-semibold text-zinc-200">@{u.username || u.name}</span>
                            </div>
                            <span className="text-[11px] text-zinc-500">{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-800">
                <Button type="button" variant="ghost" onClick={() => setIsAwardModalOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={handleAwardAchievement}
                  disabled={!selectedUserForAward || !selectedAchievementForAward || isAwarding}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {isAwarding ? 'Awarding...' : 'Grant Achievement'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
