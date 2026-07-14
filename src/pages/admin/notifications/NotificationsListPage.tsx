import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Search, Edit, Trash2, Plus } from 'lucide-react';

export default function NotificationsListPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users for mapping targetUserId to username
      const usersSnap = await getDocs(collection(db, 'users'));
      const mapping: Record<string, string> = {};
      usersSnap.docs.forEach(d => {
        mapping[d.id] = d.data().username || d.data().email || d.id;
      });
      setUserMap(mapping);

      const snap = await getDocs(collection(db, 'notifications'));
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    await deleteDoc(doc(db, 'notifications', id));
    fetchData();
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading notifications...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg capitalize">Notifications ({notifications.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
          <Button size="sm" onClick={() => navigate('/admin/notifications/create')} className="bg-emerald-500 hover:bg-emerald-600 text-white border-none gap-2">
            <Plus className="w-4 h-4" />
            Create Notification
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No records found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Body</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Scheduled Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {notifications.sort((a, b) => b.scheduledTime - a.scheduledTime).map((notif) => {
                return (
                  <tr key={notif.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => navigate(`/admin/notifications/edit/${notif.id}`)}
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
                    <td className="px-4 py-3 font-medium text-zinc-200">{notif.title}</td>
                    <td className="px-4 py-3 text-zinc-400 truncate max-w-xs" title={notif.body}>{notif.body}</td>
                    <td className="px-4 py-3 text-zinc-400">
                        {notif.audience} {notif.targetUserId ? `(${userMap[notif.targetUserId] || notif.targetUserId})` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${notif.status === 'SENT' ? 'bg-green-500/10 text-green-400' : notif.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {notif.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(notif.scheduledTime).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
