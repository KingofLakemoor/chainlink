import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Edit, Trash2, Plus, Archive, ArchiveRestore, Lock, Unlock, RefreshCw } from 'lucide-react';
import { updateDoc, writeBatch } from 'firebase/firestore';

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

  const handleToggleOpen = async (id: string, currentIsOpen: boolean) => {
    await updateDoc(doc(db, "pickemCampaigns", id), { isOpen: !currentIsOpen });
    fetchData();
  };

  const handleResetCampaigns = async () => {
    if (!confirm("This will un-archive and reset all current non-archived campaigns to OPEN and PUBLIC so users can see and join them. Continue?")) return;
    try {
      const snap = await getDocs(collection(db, 'pickemCampaigns'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, {
          isOpen: true,
          isPrivate: false,
          isArchived: false,
          archived: false
        });
      });
      await batch.commit();
      alert("All campaigns have been reset to Open & Public!");
      fetchData();
    } catch (err: any) {
      console.error("Reset campaigns error:", err);
      alert("Failed to reset campaigns: " + (err.message || String(err)));
    }
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
          <Button variant="outline" size="sm" onClick={handleResetCampaigns} className="gap-1 text-xs">
             <RefreshCw className="w-3.5 h-3.5" /> Reset & Open Campaigns
          </Button>
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
              {campaigns.map((camp) => {
                const isArch = camp.isArchived || camp.archived;
                const isOpen = camp.isOpen !== false;
                const isPriv = !!camp.isPrivate;

                return (
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
                          title={isOpen ? "Close Campaign" : "Open Campaign"}
                          className={`h-8 w-8 ${isOpen ? "text-green-400 hover:text-red-400" : "text-red-400 hover:text-green-400"}`}
                          onClick={() => handleToggleOpen(camp.id, isOpen)}
                        >
                          {isOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={isArch ? "Unarchive" : "Archive"}
                          className="h-8 w-8 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                          onClick={() => handleToggleArchive(camp.id, isArch)}
                        >
                          {isArch ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
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
                      <div className="flex items-center gap-1.5">
                        {isArch ? (
                          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium border border-yellow-500/20">Archived</span>
                        ) : isOpen ? (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs font-medium border border-green-500/20">Open</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs font-medium border border-red-500/20">Closed</span>
                        )}
                        {isPriv && (
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs font-medium border border-purple-500/20">Private</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{camp.leagues && camp.leagues.length > 0 ? camp.leagues.join(', ') : camp.league}</td>
                    <td className="px-4 py-3 text-zinc-400">{camp.currentWeek ?? 1}</td>
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
