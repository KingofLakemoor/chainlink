import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, deleteDoc, doc, updateDoc, addDoc, query, orderBy, limit, where, documentId, getDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import {
  Search, Edit, Trash2, Plus, Bell, Send, Clock, Filter, RefreshCw, X, User, CheckCircle2, AlertCircle, Users
} from 'lucide-react';

export default function NotificationsListPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal / Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    audience: 'GLOBAL',
    status: 'PENDING',
    scheduledTimeStr: new Date().toISOString().slice(0, 16),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User Lookup for Target USER audience
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedTargetUser, setSelectedTargetUser] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), orderBy('scheduledTime', 'desc'), limit(150)));
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setNotifications(notifs);

      // Resolve usernames for targeted notifications
      const targetUids = [...new Set(notifs.filter(n => n.targetUserId).map(n => n.targetUserId))];
      const mapping: Record<string, string> = {};

      const chunkArray = (arr: any[], size: number): any[][] =>
        arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];

      if (targetUids.length > 0) {
        const userChunks = chunkArray(targetUids, 30);
        for (const chunk of userChunks) {
          const uSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
          uSnap.forEach(uDoc => {
            const u = uDoc.data();
            mapping[uDoc.id] = u.username || u.name || u.email || uDoc.id;
          });
        }
      }
      setUserMap(mapping);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced User Search
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
    if (!confirm('Are you sure you want to delete this notification?')) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      fetchData();
    } catch (e) {
      console.error('Error deleting notification:', e);
      alert('Failed to delete notification');
    }
  };

  const handleOpenCreateDrawer = () => {
    setEditingNotif(null);
    setFormData({
      title: '',
      body: '',
      audience: 'GLOBAL',
      status: 'PENDING',
      scheduledTimeStr: new Date().toISOString().slice(0, 16),
    });
    setSelectedTargetUser(null);
    setUserQuery('');
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = async (notif: any) => {
    setEditingNotif(notif);

    let formattedDate = '';
    if (notif.scheduledTime) {
      const date = new Date(notif.scheduledTime);
      const tzOffset = date.getTimezoneOffset() * 60000;
      formattedDate = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    } else {
      formattedDate = new Date().toISOString().slice(0, 16);
    }

    setFormData({
      title: notif.title || '',
      body: notif.body || '',
      audience: notif.audience || 'GLOBAL',
      status: notif.status || 'PENDING',
      scheduledTimeStr: formattedDate,
    });

    if (notif.audience === 'USER' && notif.targetUserId) {
      try {
        const uSnap = await getDoc(doc(db, 'users', notif.targetUserId));
        if (uSnap.exists()) {
          setSelectedTargetUser({ id: uSnap.id, ...uSnap.data() });
        } else {
          setSelectedTargetUser({ id: notif.targetUserId, username: notif.targetUserId });
        }
      } catch (e) {
        setSelectedTargetUser({ id: notif.targetUserId, username: notif.targetUserId });
      }
    } else {
      setSelectedTargetUser(null);
    }

    setUserQuery('');
    setIsDrawerOpen(true);
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      alert('Title and body are required');
      return;
    }

    if (formData.audience === 'USER' && !selectedTargetUser) {
      alert('Target user is required for USER audience');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledTimeMs = new Date(formData.scheduledTimeStr).getTime();
      const payload: any = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        audience: formData.audience,
        status: formData.status,
        scheduledTime: scheduledTimeMs,
        targetUserId: formData.audience === 'USER' ? selectedTargetUser.id : null,
      };

      if (editingNotif) {
        await updateDoc(doc(db, 'notifications', editingNotif.id), {
          ...payload,
          updatedAt: Date.now(),
        });
      } else {
        await addDoc(collection(db, 'notifications'), {
          ...payload,
          createdAt: Date.now(),
        });
      }

      setIsDrawerOpen(false);
      fetchData();
    } catch (e) {
      console.error('Error saving notification:', e);
      alert('Failed to save notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch =
      (notif.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (notif.body || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (notif.targetUserId && (userMap[notif.targetUserId] || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAudience = selectedAudience === 'ALL' || notif.audience === selectedAudience;
    const matchesStatus = selectedStatus === 'ALL' || notif.status === selectedStatus;

    return matchesSearch && matchesAudience && matchesStatus;
  });

  // Summary Metrics
  const totalNotifs = notifications.length;
  const pendingNotifs = notifications.filter(n => n.status === 'PENDING').length;
  const sentNotifs = notifications.filter(n => n.status === 'SENT').length;
  const globalCount = notifications.filter(n => n.audience === 'GLOBAL').length;

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{totalNotifs}</div>
            <div className="text-xs text-zinc-400">Total Notifications</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{pendingNotifs}</div>
            <div className="text-xs text-zinc-400">Pending Scheduled</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{sentNotifs}</div>
            <div className="text-xs text-zinc-400">Sent / Dispatched</div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{globalCount} / {totalNotifs - globalCount}</div>
            <div className="text-xs text-zinc-400">Global vs User Targeted</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <h3 className="font-bold text-lg text-zinc-100">Notifications ({filteredNotifications.length})</h3>
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
            {/* Search Bar */}
            <div className="relative flex-1 md:w-52">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search title, body..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Audience Filter */}
            <select
              value={selectedAudience}
              onChange={e => setSelectedAudience(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Audiences</option>
              <option value="GLOBAL">Global</option>
              <option value="USER">User Targeted</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
            </select>

            <Button
              size="sm"
              onClick={handleOpenCreateDrawer}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Notification
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No notifications found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Actions</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Body</th>
                  <th className="px-4 py-3 font-medium">Audience / Target</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Scheduled Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => handleOpenEditDrawer(notif)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(notif.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-100">{notif.title}</td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs truncate" title={notif.body}>
                      {notif.body}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${notif.audience === 'GLOBAL' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                          {notif.audience}
                        </span>
                        {notif.targetUserId && (
                          <span className="text-xs text-zinc-300 font-medium">
                            @{userMap[notif.targetUserId] || notif.targetUserId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        notif.status === 'SENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : notif.status === 'FAILED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {notif.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono">
                      {notif.scheduledTime ? new Date(notif.scheduledTime).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Drawer / Modal for Create & Edit */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-lg h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-zinc-100">
                  {editingNotif ? 'Edit Notification' : 'Create Notification'}
                </h3>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotification} className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Notification Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Free Links Bonus Available!"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Body Content *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.body}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                  placeholder="e.g. Log in today to claim your 500 links reward."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Audience</label>
                  <select
                    value={formData.audience}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, audience: val });
                      if (val === 'GLOBAL') {
                        setSelectedTargetUser(null);
                      }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="GLOBAL">GLOBAL (All Users)</option>
                    <option value="USER">USER (Specific User)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="SENT">SENT</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>

              {/* Target User Search Lookup (when Audience === USER) */}
              {formData.audience === 'USER' && (
                <div className="space-y-1.5 relative border-t border-zinc-800/80 pt-4">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Target User *</label>

                  {selectedTargetUser ? (
                    <div className="flex items-center justify-between p-3 bg-zinc-900 border border-cyan-500/40 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold">
                          {(selectedTargetUser.username || selectedTargetUser.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-100">
                            @{selectedTargetUser.username || selectedTargetUser.name || selectedTargetUser.id}
                          </div>
                          {selectedTargetUser.email && (
                            <div className="text-xs text-zinc-400">{selectedTargetUser.email}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTargetUser(null)}
                        className="text-zinc-400 hover:text-white text-xs"
                      >
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
                          placeholder="Type username or email to lookup..."
                          className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                        />
                      </div>

                      {searchingUsers && (
                        <div className="text-xs text-zinc-500 py-2 text-center">Searching users...</div>
                      )}

                      {searchResults.length > 0 && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden max-h-44 overflow-y-auto divide-y divide-zinc-800/50">
                          {searchResults.map(u => (
                            <div
                              key={u.id}
                              onClick={() => setSelectedTargetUser(u)}
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
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-400">Scheduled Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledTimeStr}
                  onChange={e => setFormData({ ...formData, scheduledTimeStr: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
                />
              </div>

              <div className="pt-6 border-t border-zinc-800 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white min-w-[120px]">
                  {isSubmitting ? 'Saving...' : editingNotif ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
