import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Search, Edit, Trash2 } from 'lucide-react';

export default function AchievementsListPage() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const achSnap = await getDocs(collection(db, 'achievements'));
      setAchievements(achSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const userSnap = await getDocs(collection(db, 'users'));
      setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    if (!confirm("Are you sure you want to archive/delete this achievement?")) return;
    await deleteDoc(doc(db, 'achievements', id));
    fetchData();
  };

  const calculateStats = (achievementId: string) => {
    if (users.length === 0) return { count: 0, percentage: 0 };

    let count = 0;
    users.forEach(u => {
      if (u.achievements && u.achievements.some((a: any) => a.achievementId === achievementId)) {
        count++;
      }
    });

    return {
      count,
      percentage: ((count / users.length) * 100).toFixed(1)
    };
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading achievements...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg capitalize">Achievements ({achievements.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No records found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Reward</th>
                <th className="px-4 py-3 font-medium">Awarded (Count)</th>
                <th className="px-4 py-3 font-medium">Awarded (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {achievements.map((ach) => {
                const stats = calculateStats(ach.id);
                return (
                  <tr key={ach.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                          onClick={() => navigate(`/admin/achievements/edit/${ach.id}`)}
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
                    <td className="px-4 py-3 font-medium text-zinc-200">{ach.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{ach.type}</td>
                    <td className="px-4 py-3 text-zinc-400">{ach.links || 0}</td>
                    <td className="px-4 py-3 text-zinc-400">{stats.count}</td>
                    <td className="px-4 py-3 text-zinc-400">{stats.percentage}%</td>
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
