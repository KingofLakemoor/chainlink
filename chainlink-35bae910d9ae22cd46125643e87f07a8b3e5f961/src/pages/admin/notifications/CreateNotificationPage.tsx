import React from 'react';
import { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function CreateNotificationPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    audience: 'GLOBAL',
    targetUsername: '',
    scheduledTime: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.body) {
      alert('Title and Body are required');
      return;
    }

    setLoading(true);
    try {
      let resolvedUserId = null;
      if (formData.audience === 'USER') {
        if (!formData.targetUsername) {
          alert('Target Username is required for USER audience');
          setLoading(false);
          return;
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', formData.targetUsername));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          alert(`User with username '${formData.targetUsername}' not found`);
          setLoading(false);
          return;
        }

        resolvedUserId = querySnapshot.docs[0].id;
      }

      await addDoc(collection(db, 'notifications'), {
        title: formData.title,
        body: formData.body,
        audience: formData.audience,
        targetUserId: resolvedUserId,
        scheduledTime: new Date(formData.scheduledTime).getTime(),
        status: 'PENDING',
        createdAt: Date.now()
      });
      alert('Notification created successfully!');
      navigate('/admin/notifications');
    } catch (e) {
      console.error(e);
      alert('Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl max-w-3xl mx-auto">
      <div className="p-6 border-b border-zinc-800 bg-[#18181A] flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">Create Notification</h2>
            <p className="text-zinc-400 text-sm">Schedule a new push notification</p>
        </div>
        <Button onClick={() => navigate('/admin/notifications')} variant="outline">Cancel</Button>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title *</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    placeholder="e.g. Free Links!"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Body *</label>
                <textarea
                    value={formData.body}
                    onChange={(e) => handleChange('body', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 min-h-[100px]"
                    placeholder="e.g. Log in today to claim your 500 free links."
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Audience</label>
                  <select
                      value={formData.audience}
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
                        value={formData.targetUsername}
                        onChange={(e) => handleChange('targetUsername', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                        placeholder="Username"
                    />
                </div>
              )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Scheduled Time</label>
                <input
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => handleChange('scheduledTime', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
                />
            </div>
        </div>

        <div className="pt-4 flex justify-end">
            <Button onClick={handleCreate} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white border-none min-w-[120px]">
              {loading ? 'Creating...' : 'Create'}
            </Button>
        </div>
      </div>
    </div>
  );
}
