import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, documentId, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Link } from 'react-router-dom';
import { Search, Trash2, Edit } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function AdminPicksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPending, setFilterPending] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = filterPending ? query(collection(db, 'picks'), where('status', '==', 'PENDING')) : collection(db, 'picks');
      const snap = await getDocs(q);

      const rawPicks = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      const userIds = Array.from(new Set(rawPicks.map(p => p.userId).filter(Boolean)));
      const matchupIds = Array.from(new Set(rawPicks.map(p => p.matchupId).filter(Boolean)));

      const userMap = new Map<string, {name: string, image: string}>();
      const matchupMap = new Map<string, {title: string, league: string, startTime: number}>();

      // Fetch users in chunks of 10 to avoid 'in' query limits (limit is 30, but we'll do individual or chunked getDocs)
      // Since 'in' allows max 30, we chunk array to 30.
      const chunkArray = (arr: any[], size: number): any[][] =>
        arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];

      if (userIds.length > 0) {
        const userChunks = chunkArray(userIds, 30);
        for (const chunk of userChunks) {
           const uSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
           uSnap.forEach(doc => {
              const u = doc.data();
              userMap.set(doc.id, { name: u.username || u.name || doc.id, image: u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}` });
           });
        }
      }

      if (matchupIds.length > 0) {
        const matchupChunks = chunkArray(matchupIds, 30);
        for (const chunk of matchupChunks) {
           const mSnap = await getDocs(query(collection(db, 'matchups'), where(documentId(), 'in', chunk)));
           mSnap.forEach(doc => {
              const m = doc.data();
              matchupMap.set(doc.id, { title: m.title || doc.id, league: m.league || '', startTime: m.startTime || 0 });
           });
        }
      }

      const picksData = rawPicks.map(p => ({
         ...p,
         userName: userMap.get(p.userId)?.name || p.userId,
         userImage: userMap.get(p.userId)?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`,
         matchupTitle: matchupMap.get(p.matchupId)?.title || p.matchupId,
         matchupLeague: matchupMap.get(p.matchupId)?.league || '',
         matchupStartTime: matchupMap.get(p.matchupId)?.startTime || 0,
      }));

      picksData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setData(picksData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPending]);

  const handleDelete = async (row: any) => {
    if (!confirm("Are you sure?")) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        title: 'Pick Deleted',
        body: `Your pick for ${row.matchupTitle} was deleted by an admin.`,
        audience: 'USER',
        targetUserId: row.userId,
        status: 'PENDING',
        scheduledTime: Date.now(),
        createdAt: Date.now()
      });
    } catch (e) {
      console.error("Failed to add notification", e);
    }
    await deleteDoc(doc(db, 'picks', row.id));
    fetchData();
  };

  const filteredData = data.filter(row => {
     if (!searchTerm) return true;
     const lower = searchTerm.toLowerCase();
     return (row.userName?.toLowerCase().includes(lower) ||
             row.matchupTitle?.toLowerCase().includes(lower) ||
             row.id.toLowerCase().includes(lower));
  });

  const formatTimeUntil = (timestamp: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = timestamp - now;

    if (diff < 0) return 'Started';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `in about ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in about ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes > 0) {
        return `in about ${minutes} min`;
      } else {
        return 'Starts soon';
      }
    }
  };

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A] flex-wrap gap-4">
        <h3 className="font-bold text-lg capitalize">Picks ({filteredData.length})</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filterPending}
              onChange={(e) => setFilterPending(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-emerald-500/20"
            />
            Only Pending
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
               type="text"
               placeholder="Search..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-zinc-700 w-64 text-zinc-300"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading picks...</div>
      ) : filteredData.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No records found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Matchup</th>
                <th className="px-4 py-3 font-medium">Pick</th>
                <th className="px-4 py-3 font-medium">League</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredData.map(row => {
                let pickDisplay = "";
                let pickImage = "";
                try {
                   const pObj = typeof row.pick === 'string' ? JSON.parse(row.pick) : row.pick;
                   pickDisplay = pObj?.name || JSON.stringify(pObj);
                   pickImage = pObj?.image || "";
                } catch (e) {
                   pickDisplay = String(row.pick);
                }

                return (
                  <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-300 font-medium">
                      <div className="flex items-center gap-3">
                        <img src={row.userImage} alt={row.userName} className="w-8 h-8 rounded-full bg-zinc-800" loading="lazy" />
                        <span>{row.userName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{row.matchupTitle}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-center gap-2">
                        {pickImage && <img src={pickImage} alt={pickDisplay} className="w-6 h-6 object-contain" loading="lazy" />}
                        <span className="truncate max-w-[150px]" title={pickDisplay}>{pickDisplay}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-300">
                        {row.matchupLeague}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatTimeUntil(row.matchupStartTime)}</td>
                    <td className="px-4 py-3">
                       <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${row.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' : row.status === 'WIN' ? 'bg-green-500/10 text-green-400' : row.status === 'LOSS' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {row.status}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/picks/edit/${row.id}`} className="text-zinc-500 hover:text-white mr-3 inline-block">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(row)} className="text-red-500/70 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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
