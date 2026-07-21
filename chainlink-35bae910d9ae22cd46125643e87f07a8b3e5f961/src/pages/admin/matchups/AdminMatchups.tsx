import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch, query, where, documentId } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Trash2, Search, Edit, RefreshCw } from 'lucide-react';
import { scrapeLeagueSchedules } from '../../../services/espnScraper';
import { useAuth } from '../../../lib/auth-context';

export function AdminMatchups() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const [leagueFilter, setLeagueFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeFilter, setActiveFilter] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'matchups'));
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      const picksSnap = await getDocs(collection(db, 'picks'));
      const counts: Record<string, number> = {};
      picksSnap.docs.forEach(d => {
        const p = d.data();
        counts[p.matchupId] = (counts[p.matchupId] || 0) + 1;
      });
      setPickCounts(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      let scraperConfig: { maxMoneylineOdds?: number, sportOverrides?: Record<string, number> } = {};
      try {
        const scraperSnap = await getDocs(query(collection(db, 'systemSettings')));
        const scraperDoc = scraperSnap.docs.find(d => d.id === 'scraper')?.data();
        if (scraperDoc) {
          scraperConfig = scraperDoc as any;
        }
      } catch (e) {
        console.error("Error fetching system settings", e);
      }

      const leagues = ["MLB", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "CFL", "WBB", "MBB", "MLS", "LMX", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET", "PROP"];

      let totalImported = 0;

      for (const league of leagues) {
        try {
          const token = await user?.getIdToken();
          const res = await fetch('/api/admin/sync-schedules', {
             method: 'POST',
             headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
             },
             body: JSON.stringify({ league })
          });
          const resultData = await res.json();
          if (resultData.success) {
             totalImported += (resultData.result?.new || 0) + (resultData.result?.updated || 0);
          } else {
             console.error(`Sync error for ${league}:`, resultData.error);
          }
        } catch(e) {
          console.error(`Sync error for ${league}:`, e);
        }
      }


      await fetchData();
      alert(`ESPN Sync Complete! Inserted ${totalImported} new matchups.`);
    } catch (e) {
      console.error(e);
      alert("Sync failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await deleteDoc(doc(db, 'matchups', id));
    fetchData();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'matchups', id), {
        active: !currentActive,
        updatedAt: Date.now()
      });
      setData(prev => prev.map(m => m.id === id ? { ...m, active: !currentActive } : m));
    } catch (e) {
      console.error("Error toggling active status", e);
      alert("Failed to toggle active status");
    }
  };

  const handleToggleLink4Excluded = async (id: string, currentExcluded: boolean) => {
    try {
      await updateDoc(doc(db, 'matchups', id), {
        link4Excluded: !currentExcluded,
        updatedAt: Date.now()
      });
      setData(prev => prev.map(m => m.id === id ? { ...m, link4Excluded: !currentExcluded } : m));
    } catch (e) {
      console.error("Error toggling Link4 excluded status", e);
      alert("Failed to toggle Link4 excluded status");
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading matchups...</div>;

  const statuses = Array.from(new Set(data.map(m => m.status))).filter(Boolean);

  const filteredData = data.filter(row => {
    if (row.abandoned || row.status === 'STATUS_FINAL' || row.status === 'STATUS_POSTPONED' || row.status === 'STATUS_CANCELED') return false;
    if (leagueFilter !== 'All' && row.league !== leagueFilter) return false;
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;
    if (activeFilter !== 'All') {
      const isActive = activeFilter === 'ACTIVE';
      if (row.active !== isActive) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = row.title?.toLowerCase().includes(query);
      const matchesLeague = row.league?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesLeague) return false;
    }
    return true;
  });

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl flex flex-col h-full max-h-[85vh] overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
        <h3 className="font-bold text-lg">Matchups Management ({filteredData.length})</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="text-cyan-400 border-cyan-800 hover:bg-cyan-900/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? "Syncing..." : "Sync ESPN APIs"}
          </Button>
          <select value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-300">
            <option value="All">All Leagues</option>
            {["MLB", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "CFL", "WBB", "MBB", "MLS", "LMX", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-300">
            <option value="All">All Statuses</option>
            {statuses.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
          </select>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-300">
            <option value="All">All Active States</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Matchups..." className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-zinc-700 w-64" />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData}>Refresh</Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium">No matchups found. Run Sync.</div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">League</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">ML</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Link4</th>
                <th className="px-4 py-3 font-medium">Start Time</th>
                <th className="px-4 py-3 font-medium">Picks</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredData.sort((a, b) => (a.startTime || 0) - (b.startTime || 0)).map(row => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-300">{row.league}</td>
                  <td className="px-4 py-3 text-zinc-200">{row.title}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">{row.metadata?.mlHome !== undefined && row.metadata?.mlHome !== null ? row.metadata.mlHome : '-'}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${row.status === 'STATUS_SCHEDULED' ? 'bg-zinc-800 text-zinc-300' : 'bg-green-500/10 text-green-400'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(row.id, row.active)}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${row.active ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'}`}
                      title={row.active ? "Mark Inactive" : "Mark Active"}
                    >
                      {row.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleLink4Excluded(row.id, !!row.link4Excluded)}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${!row.link4Excluded ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'}`}
                      title={row.link4Excluded ? "Include in Link4" : "Exclude from Link4"}
                    >
                      {!row.link4Excluded ? 'INCLUDED' : 'EXCLUDED'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(row.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-300 font-mono">{pickCounts[row.id] || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/matchups/${row.id}`} className="text-zinc-500 hover:text-white mr-3 inline-block"><Edit className="w-4 h-4" /></Link>
                    <button onClick={() => handleDelete(row.id)} className="text-red-500/70 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
