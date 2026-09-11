import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc, setDoc, documentId, addDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import {
  CheckCircle2, Flag, UserPlus, Search, RefreshCw, Plus, Edit, Trash2, X, Layers, Clock, Flame
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { FirebaseImage } from '../../../components/ui/FirebaseImage';

import PGABuilderPage from '../pga/PGABuilderPage';
import PlayerPropBuilderPage from './PlayerPropBuilderPage';
import CreateMatchupPage from './CreateMatchupPage';

export default function MatchupsAdminHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active Tab: 'matchups' | 'pga' | 'prop'
  const activeTab = searchParams.get('tab') || 'matchups';

  // Drawer Actions: 'create' | 'edit' | 'pga-drawer' | 'prop-drawer' | null
  const activeAction = searchParams.get('action');
  const selectedMatchupId = searchParams.get('id');

  // Matchups List State
  const [matchups, setMatchups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [leagueFilter, setLeagueFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeFilter, setActiveFilter] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Metrics State
  const [metrics, setMetrics] = useState({
    activeCount: 0,
    scheduledCount: 0,
    pendingPicksCount: 0,
    activeLeaguesCount: 0
  });

  // Selected Edit Matchup State for Drawer
  const [editMatchupData, setEditMatchupData] = useState<any | null>(null);
  const [editPicks, setEditPicks] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loadingEditMatchup, setLoadingEditMatchup] = useState(false);

  // Edit Pick Drawer inside Edit Matchup Drawer
  const [editingPick, setEditingPick] = useState<any | null>(null);
  const [savingPick, setSavingPick] = useState(false);

  const fetchMatchupsData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'matchups'),
          where('status', 'in', ['STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_POSTPONED'])
        )
      );
      const matchupIds = snap.docs.map(d => d.id);
      const pickCounts: Record<string, number> = {};
      let totalPendingPicks = 0;

      if (matchupIds.length > 0) {
        const chunkArray = (arr: string[], size: number) =>
          arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
        const chunks = chunkArray(matchupIds, 30);

        await Promise.all(
          chunks.map(async (chunk) => {
            try {
              const [pSnap, peSnap] = await Promise.all([
                getDocs(query(collection(db, 'picks'), where('matchupId', 'in', chunk), where('status', '==', 'PENDING'))),
                getDocs(query(collection(db, 'pickemPicks'), where('matchupId', 'in', chunk), where('status', '==', 'PENDING')))
              ]);
              pSnap.forEach(d => {
                const matchId = d.data().matchupId;
                if (matchId) {
                  pickCounts[matchId] = (pickCounts[matchId] || 0) + 1;
                  totalPendingPicks++;
                }
              });
              peSnap.forEach(d => {
                const matchId = d.data().matchupId;
                if (matchId) {
                  pickCounts[matchId] = (pickCounts[matchId] || 0) + 1;
                  totalPendingPicks++;
                }
              });
            } catch (chunkErr) {
              console.warn("Chunk pick count fetch warning:", chunkErr);
            }
          })
        );
      }

      const docsData = snap.docs.map(d => ({ id: d.id, ...(d.data() as any), pickCount: pickCounts[d.id] || 0 }));
      setMatchups(docsData);

      // Compute metrics
      const active = docsData.filter(m => m.active).length;
      const scheduled = docsData.filter(m => m.status === 'STATUS_SCHEDULED').length;
      const activeLeagues = new Set(docsData.map(m => m.league).filter(Boolean)).size;

      setMetrics({
        activeCount: active,
        scheduledCount: scheduled,
        pendingPicksCount: totalPendingPicks,
        activeLeaguesCount: activeLeagues
      });
    } catch (e) {
      console.error("Error fetching matchups in Hub:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchupsData();
  }, []);

  // Fetch Edit Matchup Data when drawer is opened with selectedMatchupId
  useEffect(() => {
    if (activeAction === 'edit' && selectedMatchupId) {
      const loadMatchupDetails = async () => {
        setLoadingEditMatchup(true);
        try {
          const docSnap = await getDocs(query(collection(db, 'matchups'), where('__name__', '==', selectedMatchupId)));
          if (!docSnap.empty) {
            const mData = docSnap.docs[0].data();
            let formattedDate = "";
            if (mData.startTime) {
              const date = new Date(mData.startTime);
              const tzOffset = date.getTimezoneOffset() * 60000;
              formattedDate = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
            }
            setEditMatchupData({ ...mData, id: docSnap.docs[0].id, formStartTime: formattedDate });
          }

          // Fetch active sponsors
          const sponsorsSnap = await getDocs(query(collection(db, 'sponsors'), where('active', '==', true)));
          if (!sponsorsSnap.empty) {
            setSponsors(sponsorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }

          // Fetch picks for this matchup
          const picksSnap = await getDocs(query(collection(db, 'picks'), where('matchupId', '==', selectedMatchupId)));
          const rawPicks = picksSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

          const userMap = new Map<string, { name: string; image: string }>();
          const userIds = Array.from(new Set(rawPicks.map(p => p.userId).filter(Boolean)));

          if (userIds.length > 0) {
            const chunkArray = (arr: any[], size: number): any[][] =>
              arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];

            const userChunks = chunkArray(userIds, 30);
            for (const chunk of userChunks) {
              const uSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
              uSnap.forEach(uDoc => {
                const u = uDoc.data();
                userMap.set(uDoc.id, {
                  name: u.username || u.name || uDoc.id,
                  image: u.image || ""
                });
              });
            }
          }

          const picksData = rawPicks.map((p) => {
            const userData = userMap.get(p.userId);
            return {
              ...p,
              userName: userData?.name || p.userId,
              userImage: userData?.image || ""
            };
          });

          setEditPicks(picksData);
        } catch (e) {
          console.error("Error loading matchup details for edit drawer:", e);
        } finally {
          setLoadingEditMatchup(false);
        }
      };
      loadMatchupDetails();
    } else {
      setEditMatchupData(null);
      setEditPicks([]);
    }
  }, [activeAction, selectedMatchupId]);

  const handleTabChange = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    newParams.delete('action');
    newParams.delete('id');
    setSearchParams(newParams);
  };

  const handleOpenDrawer = (action: string, id?: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('action', action);
    if (id) newParams.set('id', id);
    else newParams.delete('id');
    setSearchParams(newParams);
  };

  const handleCloseDrawer = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('action');
    newParams.delete('id');
    setSearchParams(newParams);
    fetchMatchupsData();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/sync-schedules-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const resultData = await res.json();
      if (resultData.success) {
        const totalImported = (resultData.result?.new || 0) + (resultData.result?.updated || 0);
        await fetchMatchupsData();
        alert(`ESPN Sync Complete! Processed ${totalImported} new/updated matchups.`);
      } else {
        alert("Sync failed: " + (resultData.error || "Unknown error"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Sync failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this matchup?")) return;
    await deleteDoc(doc(db, 'matchups', id));
    fetchMatchupsData();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const newActive = !currentActive;
      await updateDoc(doc(db, 'matchups', id), {
        active: newActive,
        manuallyActivated: newActive,
        updatedAt: Date.now()
      });
      setMatchups(prev => prev.map(m => m.id === id ? { ...m, active: newActive, manuallyActivated: newActive } : m));
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
      setMatchups(prev => prev.map(m => m.id === id ? { ...m, link4Excluded: !currentExcluded } : m));
    } catch (e) {
      console.error("Error toggling Link4 excluded status", e);
      alert("Failed to toggle Link4 excluded status");
    }
  };

  // Edit Matchup Form Handlers
  const handleEditChange = (field: string, value: any) => {
    setEditMatchupData((prev: any) => {
      if (!prev) return prev;
      const newData = { ...prev };
      const keys = field.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      if (field === 'type' && value === 'SPREAD') {
        const awayName = newData.awayTeam?.name || 'Away';
        const homeName = newData.homeTeam?.name || 'Home';
        newData.title = `${awayName} @ ${homeName} - ATS`;
        newData.hasCustomTitle = true;
      }

      if (field === 'type' && value === 'OVER_UNDER') {
        const awayName = newData.awayTeam?.name || 'Away';
        const homeName = newData.homeTeam?.name || 'Home';
        newData.title = `${awayName} @ ${homeName} - O/U ${newData.metadata?.overUnder ?? ''}`.trim();
        newData.hasCustomTitle = true;
      }

      if (field === 'type' && value === 'SOCCER_SCORE') {
        const awayName = newData.awayTeam?.name || 'Away';
        const homeName = newData.homeTeam?.name || 'Home';
        newData.title = `${awayName} @ ${homeName}`.trim();
        newData.hasCustomTitle = true;
      }

      if (field === 'metadata.overUnder' && newData.type === 'OVER_UNDER') {
        const awayName = newData.awayTeam?.name || 'Away';
        const homeName = newData.homeTeam?.name || 'Home';
        newData.title = `${awayName} @ ${homeName} - O/U ${value}`.trim();
      }

      return newData;
    });
  };

  const handleUpdateMatchup = async () => {
    if (!selectedMatchupId || !editMatchupData) return;
    try {
      const updateData = { ...editMatchupData };
      delete updateData.id;
      delete updateData.formStartTime;

      if (editMatchupData.formStartTime) {
        updateData.startTime = new Date(editMatchupData.formStartTime).getTime();
      }

      updateData.cost = Number(updateData.cost);
      updateData.reward = Number(updateData.reward ?? 10);
      if (updateData.homeTeam) updateData.homeTeam.score = Number(updateData.homeTeam.score || 0);
      if (updateData.awayTeam) updateData.awayTeam.score = Number(updateData.awayTeam.score || 0);

      updateData.manuallyActivated = Boolean(updateData.active);
      updateData.updatedAt = Date.now();
      await updateDoc(doc(db, 'matchups', selectedMatchupId), updateData);
      alert('Matchup updated successfully!');
      handleCloseDrawer();
    } catch (e) {
      console.error(e);
      alert('Failed to update matchup');
    }
  };

  const handleReleasePicks = async () => {
    if (!editMatchupData) return;
    try {
      const res = await fetch('/api/admin/release-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ gameId: editMatchupData.gameId })
      });
      const data = await res.json();
      if (data.success) {
        alert('Matchup abandoned and picks refunded successfully!');
        handleEditChange('status', 'STATUS_POSTPONED');
        handleEditChange('abandoned', true);
      } else {
        alert('Failed to release picks: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      console.error('Error releasing picks:', e);
      alert(`Failed to contact server for release. Error: ${e.message}`);
    }
  };

  const handleFinalizeMatchup = async () => {
    if (!editMatchupData) return;
    handleEditChange('status', 'STATUS_FINAL');

    try {
      const res = await fetch('/api/admin/grade-matchup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ gameId: editMatchupData.gameId })
      });

      const data = await res.json();
      if (data.success) {
        alert('Matchup finalized and picks graded successfully!');
      } else {
        alert('Failed to grade picks: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      console.error('Error finalizing matchup:', e);
      alert(`Failed to contact server for grading. Error: ${e.message}`);
    }
  };

  const statuses = Array.from(new Set(matchups.map(m => m.status))).filter(Boolean);

  const filteredMatchups = matchups.filter(row => {
    if (row.abandoned || row.status === 'STATUS_FINAL' || row.status === 'STATUS_POSTPONED' || row.status === 'STATUS_CANCELED') return false;
    if (leagueFilter !== 'All' && row.league !== leagueFilter) return false;
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;
    if (activeFilter !== 'All') {
      const isActive = activeFilter === 'ACTIVE';
      if (row.active !== isActive) return false;
    }
    if (searchQuery) {
      const queryStr = searchQuery.toLowerCase();
      const matchesTitle = row.title?.toLowerCase().includes(queryStr);
      const matchesLeague = row.league?.toLowerCase().includes(queryStr);
      if (!matchesTitle && !matchesLeague) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Active Matchups</span>
              <span className="text-2xl font-bold font-display text-emerald-400 mt-1 block">{metrics.activeCount}</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Scheduled Games</span>
              <span className="text-2xl font-bold font-display text-cyan-400 mt-1 block">{metrics.scheduledCount}</span>
            </div>
            <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Pending Picks</span>
              <span className="text-2xl font-bold font-display text-amber-400 mt-1 block">{metrics.pendingPicksCount}</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Active Leagues</span>
              <span className="text-2xl font-bold font-display text-indigo-400 mt-1 block">{metrics.activeLeaguesCount}</span>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Header & Actions Bar */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-lg">
        <div className="flex items-center bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 self-start md:self-auto">
          <button
            onClick={() => handleTabChange('matchups')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'matchups'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            All Matchups
          </button>
          <button
            onClick={() => handleTabChange('pga')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'pga'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flag className="w-4 h-4 text-green-400" />
            PGA Builder
          </button>
          <button
            onClick={() => handleTabChange('prop')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'prop'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-4 h-4 text-blue-400" />
            Prop Builder
          </button>
        </div>

        {/* Quick Builder Drawers Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleOpenDrawer('create')}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Matchup
          </Button>
          <Button
            onClick={() => handleOpenDrawer('pga-drawer')}
            size="sm"
            className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs gap-1.5"
          >
            <Flag className="w-4 h-4" />
            PGA Builder
          </Button>
          <Button
            onClick={() => handleOpenDrawer('prop-drawer')}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Prop Builder
          </Button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'matchups' && (
        <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl flex flex-col overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
            <h3 className="font-bold text-lg text-white">Matchups Management ({filteredMatchups.length})</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="text-cyan-400 border-cyan-800 hover:bg-cyan-900/30 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? "Syncing..." : "Sync ESPN APIs"}
              </Button>
              <select
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
              >
                <option value="All">All Leagues</option>
                {["MLB", "LLWS", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "LMX", "ARG", "BRA", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
              >
                <option value="All">All Statuses</option>
                {statuses.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
              >
                <option value="All">All Active States</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Matchups..."
                  className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-zinc-700 w-64 text-white"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={fetchMatchupsData} className="text-xs">Refresh</Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-zinc-500 font-medium">Loading matchups...</div>
          ) : matchups.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 font-medium">No matchups found. Run Sync.</div>
          ) : (
            <div className="overflow-x-auto max-h-[65vh] custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10 text-xs uppercase tracking-wider">
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
                  {filteredMatchups.sort((a, b) => (a.startTime || 0) - (b.startTime || 0)).map(row => (
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
                      <td className="px-4 py-3 text-zinc-300 font-mono font-bold">
                        {row.pickCount > 0 ? (
                          <span className="text-cyan-400">{row.pickCount}</span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenDrawer('edit', row.id)}
                          className="text-zinc-400 hover:text-white mr-3 inline-block"
                          title="Edit Matchup"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="text-red-500/70 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pga' && (
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl">
          <PGABuilderPage />
        </div>
      )}

      {activeTab === 'prop' && (
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 shadow-xl">
          <PlayerPropBuilderPage />
        </div>
      )}

      {/* --- Drawer: Create Custom Matchup --- */}
      {activeAction === 'create' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-2xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <CheckCircle2 className="text-indigo-500 w-5 h-5" />
                Create Matchup
              </h3>
              <button onClick={handleCloseDrawer} className="text-zinc-500 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              <CreateMatchupPage />
            </div>
          </div>
        </div>
      )}

      {/* --- Drawer: PGA Builder Drawer --- */}
      {activeAction === 'pga-drawer' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-3xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Flag className="text-green-500 w-5 h-5" />
                PGA Builder
              </h3>
              <button onClick={handleCloseDrawer} className="text-zinc-500 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              <PGABuilderPage />
            </div>
          </div>
        </div>
      )}

      {/* --- Drawer: Prop Builder Drawer --- */}
      {activeAction === 'prop-drawer' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-3xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <UserPlus className="text-blue-500 w-5 h-5" />
                Player Prop Builder
              </h3>
              <button onClick={handleCloseDrawer} className="text-zinc-500 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1">
              <PlayerPropBuilderPage />
            </div>
          </div>
        </div>
      )}

      {/* --- Drawer: Edit Matchup Drawer --- */}
      {activeAction === 'edit' && selectedMatchupId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-3xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Edit Matchup</h3>
                <p className="text-xs text-zinc-400">{editMatchupData?.title || selectedMatchupId}</p>
              </div>
              <button onClick={handleCloseDrawer} className="text-zinc-500 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingEditMatchup || !editMatchupData ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Loading matchup details...</div>
            ) : (
              <div className="space-y-6 flex-1">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</label>
                    <input
                      type="text"
                      value={editMatchupData.title || ''}
                      onChange={(e) => handleEditChange('title', e.target.value)}
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        checked={editMatchupData.hasCustomTitle || false}
                        onChange={(e) => handleEditChange('hasCustomTitle', e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20"
                      />
                      <label className="text-xs text-zinc-400">Lock Custom Title</label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">League</label>
                    <select
                      value={editMatchupData.league || ''}
                      onChange={(e) => handleEditChange('league', e.target.value)}
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                      {["MLB", "LLWS", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "WBB", "MBB", "MLS", "LMX", "ARG", "BRA", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</label>
                    <select
                      value={editMatchupData.status || ''}
                      onChange={(e) => handleEditChange('status', e.target.value)}
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                      <option value="STATUS_SCHEDULED">STATUS_SCHEDULED</option>
                      <option value="STATUS_IN_PROGRESS">STATUS_IN_PROGRESS</option>
                      <option value="STATUS_FINAL">STATUS_FINAL</option>
                      <option value="STATUS_POSTPONED">STATUS_POSTPONED</option>
                      <option value="STATUS_CANCELED">STATUS_CANCELED</option>
                    </select>
                  </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800/80 pt-4">
                  {/* Away Team */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Away Team Name</label>
                      <input type="text" value={editMatchupData.awayTeam?.name || ''} onChange={(e) => handleEditChange('awayTeam.name', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                    <div className="flex gap-3 items-center">
                      {editMatchupData.awayTeam?.image && <FirebaseImage src={editMatchupData.awayTeam.image} alt="Away" className="w-8 h-8 object-contain bg-white rounded p-0.5" loading="lazy" />}
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Away Team Image URL</label>
                        <input type="text" value={editMatchupData.awayTeam?.image || ''} onChange={(e) => handleEditChange('awayTeam.image', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Away Team Score</label>
                      <input type="number" value={editMatchupData.awayTeam?.score || 0} onChange={(e) => handleEditChange('awayTeam.score', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                  </div>

                  {/* Home Team */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Home Team Name</label>
                      <input type="text" value={editMatchupData.homeTeam?.name || ''} onChange={(e) => handleEditChange('homeTeam.name', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                    <div className="flex gap-3 items-center">
                      {editMatchupData.homeTeam?.image && <FirebaseImage src={editMatchupData.homeTeam.image} alt="Home" className="w-8 h-8 object-contain bg-white rounded p-0.5" loading="lazy" />}
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Home Team Image URL</label>
                        <input type="text" value={editMatchupData.homeTeam?.image || ''} onChange={(e) => handleEditChange('homeTeam.image', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Home Team Score</label>
                      <input type="number" value={editMatchupData.homeTeam?.score || 0} onChange={(e) => handleEditChange('homeTeam.score', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                  </div>
                </div>

                {/* Matchup Type & Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-800/80 pt-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Type</label>
                    <select
                      value={editMatchupData.type || 'SCORE'}
                      onChange={(e) => handleEditChange('type', e.target.value)}
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                      <option value="SCORE">SCORE</option>
                      <option value="MONEYLINE">MONEYLINE</option>
                      <option value="SPREAD">SPREAD</option>
                      <option value="OVER_UNDER">OVER_UNDER</option>
                      <option value="SOCCER_SCORE">SOCCER_SCORE</option>
                      <option value="STATS">STATS</option>
                      <option value="LEADERS">LEADERS</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="CUSTOM">CUSTOM</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Type Details</label>
                    <input
                      type="text"
                      value={editMatchupData.typeDetails || ''}
                      onChange={(e) => handleEditChange('typeDetails', e.target.value)}
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                      placeholder="e.g. GREATER_THAN"
                    />
                  </div>

                  {editMatchupData.type === 'SPREAD' && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Spread</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editMatchupData.metadata?.spread ?? ''}
                        onChange={(e) => handleEditChange('metadata.spread', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                        placeholder="e.g. -3.5 or 3.5"
                      />
                    </div>
                  )}

                  {editMatchupData.type === 'OVER_UNDER' && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total (Over/Under)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editMatchupData.metadata?.overUnder ?? ''}
                        onChange={(e) => handleEditChange('metadata.overUnder', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                        placeholder="e.g. 48.5"
                      />
                    </div>
                  )}

                  {editMatchupData.type === 'SOCCER_SCORE' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Away Team Score Type</label>
                        <select
                          value={editMatchupData.metadata?.awayScoreType || 'WIN_BY'}
                          onChange={(e) => handleEditChange('metadata.awayScoreType', e.target.value)}
                          className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                        >
                          <option value="WIN_BY">Win By x+</option>
                          <option value="WIN_DRAW_LOSE">Win, Draw, or Lose by x</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Home Team Score Type</label>
                        <select
                          value={editMatchupData.metadata?.homeScoreType || 'WIN_DRAW_LOSE'}
                          onChange={(e) => handleEditChange('metadata.homeScoreType', e.target.value)}
                          className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                        >
                          <option value="WIN_BY">Win By x+</option>
                          <option value="WIN_DRAW_LOSE">Win, Draw, or Lose by x</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Away Score Value</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editMatchupData.metadata?.awayScoreValue ?? ''}
                          onChange={(e) => handleEditChange('metadata.awayScoreValue', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Home Score Value</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editMatchupData.metadata?.homeScoreValue ?? ''}
                          onChange={(e) => handleEditChange('metadata.homeScoreValue', e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  )}

                  {editMatchupData.type === 'STATS' && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stat Category</label>
                        <input
                          type="text"
                          value={editMatchupData.metadata?.statCategory || ''}
                          onChange={(e) => handleEditChange('metadata.statCategory', e.target.value)}
                          className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                          placeholder="e.g. passing"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stat Key</label>
                        <input
                          type="text"
                          value={editMatchupData.metadata?.statKey || ''}
                          onChange={(e) => handleEditChange('metadata.statKey', e.target.value)}
                          className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                          placeholder="e.g. passingYards"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cost (Wager)</label>
                    <input type="number" value={editMatchupData.cost || 0} onChange={(e) => handleEditChange('cost', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Reward</label>
                    <input type="number" value={editMatchupData.reward ?? 10} onChange={(e) => handleEditChange('reward', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Time</label>
                    <input type="datetime-local" value={editMatchupData.formStartTime || ''} onChange={(e) => handleEditChange('formStartTime', e.target.value)} className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 [color-scheme:dark]" />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-6 border-t border-zinc-800/80 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editMatchupData.active || false} onChange={(e) => handleEditChange('active', e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                    <span className="text-sm font-medium text-zinc-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editMatchupData.featured || false} onChange={(e) => handleEditChange('featured', e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                    <span className="text-sm font-medium text-zinc-300">Featured</span>
                  </label>
                </div>

                {/* In Progress Actions */}
                <div className="border-t border-zinc-800/80 pt-4 space-y-3">
                  <h4 className="font-bold text-sm text-white uppercase tracking-wider">In Progress Actions</h4>
                  <div className="flex gap-3">
                    <button onClick={handleFinalizeMatchup} className="flex-1 bg-red-900/40 hover:bg-red-800/60 text-red-100 font-bold py-2.5 rounded-lg text-xs transition-colors border border-red-900/50">Finalize Matchup</button>
                    <button onClick={handleReleasePicks} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2.5 rounded-lg text-xs transition-colors">Release Picks</button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button onClick={handleUpdateMatchup} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Update Matchup</Button>
                </div>

                {/* Picks Section */}
                <div className="border-t border-zinc-800 pt-6">
                  <h4 className="font-bold text-sm text-white mb-3 uppercase tracking-wider">User Picks ({editPicks.length})</h4>
                  <div className="overflow-x-auto max-h-48 custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="text-zinc-500 border-b border-zinc-800">
                        <tr>
                          <th className="pb-2 font-medium">User</th>
                          <th className="pb-2 font-medium">Pick</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {editPicks.map(p => (
                          <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2.5 text-zinc-300 font-medium">{p.userName}</td>
                            <td className="py-2.5 text-zinc-300">{p.team?.name || JSON.stringify(p.pick)}</td>
                            <td className="py-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400">
                                {p.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button onClick={() => setEditingPick(p)} className="text-zinc-500 hover:text-white inline-block">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {editPicks.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-zinc-500">No picks found for this matchup.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Pick Modal overlay inside hub */}
      {editingPick && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-base">Edit Pick</h3>
              <button onClick={() => setEditingPick(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Status</label>
                <select
                  value={editingPick.status || 'PENDING'}
                  onChange={(e) => setEditingPick({ ...editingPick, status: e.target.value })}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="WIN">WIN</option>
                  <option value="LOSS">LOSS</option>
                  <option value="PUSH">PUSH</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Links</label>
                <input
                  type="number"
                  value={editingPick.links || 0}
                  onChange={(e) => setEditingPick({ ...editingPick, links: Number(e.target.value) })}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setEditingPick(null)}>Cancel</Button>
              <Button
                size="sm"
                disabled={savingPick}
                onClick={async () => {
                  setSavingPick(true);
                  try {
                    const { id, userName, userImage, ...updateData } = editingPick;
                    await updateDoc(doc(db, 'picks', id), updateData);
                    setEditingPick(null);
                    if (selectedMatchupId) {
                      const pSnap = await getDocs(query(collection(db, 'picks'), where('matchupId', '==', selectedMatchupId)));
                      setEditPicks(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }
                  } catch (e) {
                    console.error("Failed to update pick in modal:", e);
                    alert("Failed to save pick");
                  } finally {
                    setSavingPick(false);
                  }
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                {savingPick ? 'Saving...' : 'Save Pick'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
