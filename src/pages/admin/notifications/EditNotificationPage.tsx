import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function EditNotificationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchNotification = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'notifications', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();

          let targetUsername = '';
          if (data.audience === 'USER' && data.targetUserId) {
            const userDoc = await getDoc(doc(db, 'users', data.targetUserId));
            if (userDoc.exists()) {
              targetUsername = userDoc.data().username || '';
            }
          }

          let formattedDate = "";
          if (data.scheduledTime) {
              const date = new Date(data.scheduledTime);
              const tzOffset = date.getTimezoneOffset() * 60000;
              formattedDate = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
          }

          setFormData({
            ...data,
            scheduledTimeStr: formattedDate,
            targetUsername
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNotification();
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!id || !formData) return;
    if (!formData.title || !formData.body) {
      alert('Title and Body are required');
      return;
    }

    setSaving(true);
    try {
      let resolvedUserId = formData.targetUserId;
      if (formData.audience === 'USER') {
        if (!formData.targetUsername) {
          alert('Target Username is required for USER audience');
          setSaving(false);
          return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', formData.targetUsername));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          alert(`User with username '${formData.targetUsername}' not found`);
          setSaving(false);
          return;
        }

        resolvedUserId = querySnapshot.docs[0].id;
      }

      const updateData = { ...formData };
      delete updateData.scheduledTimeStr;
      delete updateData.targetUsername; // Don't save this to DB

      if (updateData.scheduledTimeStr) { // Use formData.scheduledTimeStr since updateData was deleted
          updateData.scheduledTime = new Date(formData.scheduledTimeStr).getTime();
      }

      if (updateData.audience === 'GLOBAL') {
          updateData.targetUserId = null;
      } else {
          updateData.targetUserId = resolvedUserId;
      }

      await updateDoc(doc(db, 'notifications', id), updateData);
      alert('Notification updated successfully!');
      navigate('/admin/notifications');
    } catch (e) {
      console.error(e);
      alert('Failed to update notification');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading notification...</div>;
  if (!formData) return <div className="p-8 text-zinc-500">Notification not found</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl max-w-3xl mx-auto">
      <div className="p-6 border-b border-zinc-800 bg-[#18181A] flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">Edit Notification</h2>
            <p className="text-zinc-400 text-sm">{formData.title}</p>
        </div>
        <Button onClick={() => navigate('/admin/notifications')} variant="outline">Cancel</Button>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title *</label>
                <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Body *</label>
                <textarea
                    value={formData.body || ''}
                    onChange={(e) => handleChange('body', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 min-h-[100px]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Audience</label>
                  <select
                      value={formData.audience || 'GLOBAL'}
                      onChange={(e) => handleChange('audience', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="USER">USER</option>
                  </select>
              </div>

              {formData.audience === 'USER' && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Target Username</label>
                    <input
                        type="text"
                        value={formData.targetUsername || ''}
                        onChange={(e) => handleChange('targetUsername', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</label>
                    <select
                        value={formData.status || 'PENDING'}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                        <option value="PENDING">PENDING</option>
                        <option value="SENT">SENT</option>
                        <option value="FAILED">FAILED</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Scheduled Time</label>
                    <input
                        type="datetime-local"
                        value={formData.scheduledTimeStr || ''}
                        onChange={(e) => handleChange('scheduledTimeStr', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
                    />
                </div>
            </div>
        </div>

        <div className="pt-4 flex justify-end">
            <Button onClick={handleUpdate} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white border-none min-w-[120px]">
              {saving ? 'Updating...' : 'Update'}
            </Button>
        </div>
      </div>
    </div>
  );
}
