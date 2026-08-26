import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, Plus, Archive, ArchiveRestore } from 'lucide-react';
import { updateDoc } from 'firebase/firestore';

export default function PickEmCampaignsList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'pickemCampaigns'), limit(100)));
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    await updateDoc(doc(db, "pickemCampaigns", id), { isArchived: !isArchived });
    fetchData();
  };
  const handleDelete = async (id: string) => {
    
    await deleteDoc(doc(db, 'pickemCampaigns', id));
    fetchData();
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading campaigns...</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
        <h3 className="font-bold text-lg capitalize">Pick'em Campaigns ({campaigns.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
          <Button size="sm" onClick={() => navigate('/admin/pickem/create')} className="gap-1">
             <Plus className="w-4 h-4" /> Create
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No campaigns found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Name</th>
<th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">League</th>
                <th className="px-4 py-3 font-medium">Current Week</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={() => navigate(`/admin/pickem/campaign/${camp.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={camp.isArchived ? "Unarchive" : "Archive"}
                        className="h-8 w-8 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                        onClick={() => handleToggleArchive(camp.id, !!camp.isArchived)}
                      >
                        {camp.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(camp.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{camp.name}</td>
<td className="px-4 py-3">
  {camp.isArchived ? (
    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium border border-yellow-500/20">Archived</span>
  ) : (
    <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium border border-green-500/20">Active</span>
  )}
</td>
                  <td className="px-4 py-3 text-zinc-400">{camp.league}</td>
                  <td className="px-4 py-3 text-zinc-400">{camp.currentWeek ?? 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
