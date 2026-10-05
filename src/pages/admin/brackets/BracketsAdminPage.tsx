import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, getDoc, updateDoc, query, where, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { GitMerge, Plus, Search, Edit, Trash2, Users, RefreshCw, X, Shield, Lock, Unlock } from 'lucide-react';
import { getRoundNamesForBracket, getOrderedPointValues, formatPointValuesInOrder } from '../../../utils/bracketUtils';

interface Bracket {
  id: string;
  name: string;
  sport: string;
  isPublic: boolean;
  maxEntries: number;
  cost: number;
  prizePotPercent?: number;
  payoutSplit?: { first: number; second: number; third: number };
  status: string;
  openDate?: number;
  lockDate?: number;
  teams?: string[];
  pointValues?: Record<string, number>;
}

export default function BracketsAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('ALL');

  // Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBracketId, setEditingBracketId] = useState<string | null>(null);
  const [entriesBracketId, setEntriesBracketId] = useState<string | null>(null);
  const [gradingBracketId, setGradingBracketId] = useState<string | null>(null);

  const [purgingLegacy, setPurgingLegacy] = useState(false);

  // Create Form State
  const [createData, setCreateData] = useState<{
    name: string;
    sport: string;
    isPublic: boolean;
    maxEntries: number;
    cost: number;
    prizePotPercent: number;
    payoutSplit: { first: number; second: number; third: number };
    openDateStr: string;
    lockDateStr: string;
    teamList: string;
    pointValues: Record<string, number>;
  }>({
    name: '',
    sport: 'NBA',
    isPublic: true,
    maxEntries: 0,
    cost: 10,
    prizePotPercent: 65,
    payoutSplit: { first: 70, second: 20, third: 10 },
    openDateStr: '',
    lockDateStr: '',
    teamList: '',
    pointValues: {
      'Round 1': 10,
      'Round 2': 20,
      'Round 3': 40,
      'Round 4': 80
    }
  });

  const handlePurgeLegacy = async () => {
    if (!window.confirm("Are you sure you want to purge all old/legacy brackets (2026 World Cup Bracket & 2026 MLB Postseason Bracket)?")) return;
    setPurgingLegacy(true);
    try {
      const auth = (await import('firebase/auth')).getAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/brackets/purge-legacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Legacy brackets successfully purged.');
        fetchBrackets();
      } else {
        alert(`Error: ${data.error || 'Failed to purge legacy brackets'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to purge legacy brackets: ' + err.message);
    } finally {
      setPurgingLegacy(false);
    }
  };

  const handleCreateSportChange = (newSport: string) => {
    setCreateData(prev => ({ ...prev, sport: newSport }));
  };
  const [creating, setCreating] = useState(false);

  // Edit Form State
  const [editBracket, setEditBracket] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Entries State
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const fetchBrackets = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'brackets'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bracket[];
      setBrackets(data);
    } catch (err) {
      console.error('Failed to fetch brackets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrackets();
  }, []);

  // Check URL paths for deep links
  useEffect(() => {
    if (location.pathname.includes('/brackets/create')) {
      setIsCreateOpen(true);
      setEditingBracketId(null);
      setEntriesBracketId(null);
    } else {
      const editMatch = location.pathname.match(/\/brackets\/edit\/([^/]+)/);
      if (editMatch && editMatch[1]) {
        setEditingBracketId(editMatch[1]);
        setIsCreateOpen(false);
        setEntriesBracketId(null);
      }
      const entriesMatch = location.pathname.match(/\/brackets\/entries\/([^/]+)/);
      if (entriesMatch && entriesMatch[1]) {
        setEntriesBracketId(entriesMatch[1]);
        setIsCreateOpen(false);
        setEditingBracketId(null);
      }
    }
  }, [location.pathname]);

  // Grading Bracket State
  const [gradingBracket, setGradingBracket] = useState<any | null>(null);
  const [updatingWinnerMatchId, setUpdatingWinnerMatchId] = useState<string | null>(null);

  // Load Grading Bracket
  useEffect(() => {
    if (!gradingBracketId) {
      setGradingBracket(null);
      return;
    }
    const loadGradingBracket = async () => {
      try {
        const docRef = doc(db, 'brackets', gradingBracketId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGradingBracket({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (e) {
        console.error("Error loading bracket for grading:", e);
      }
    };
    loadGradingBracket();
  }, [gradingBracketId]);

  const handleSetMatchWinner = async (bracketId: string, matchId: string, winningTeam: string | null) => {
    setUpdatingWinnerMatchId(matchId);
    try {
      const auth = (await import('firebase/auth')).getAuth();
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch('/api/admin/brackets/set-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bracketId, matchId, winningTeam })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGradingBracket((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            results: data.results,
            eliminatedTeams: data.eliminatedTeams
          };
        });
        fetchBrackets();
      } else {
        alert(`Error: ${data.error || 'Failed to set winner'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error setting winner: ' + err.message);
    } finally {
      setUpdatingWinnerMatchId(null);
    }
  };

  // Load Edit Bracket
  useEffect(() => {
    if (!editingBracketId) {
      setEditBracket(null);
      return;
    }
    const loadBracket = async () => {
      try {
        const docRef = doc(db, 'brackets', editingBracketId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEditBracket({
            id: docSnap.id,
            name: data.name || '',
            sport: data.sport || 'NBA',
            isPublic: data.isPublic !== false,
            maxEntries: data.maxEntries || 0,
            cost: data.cost ?? 10,
            prizePotPercent: data.prizePotPercent !== undefined ? Math.round(data.prizePotPercent * 100) : 65,
            payoutSplit: data.payoutSplit || { first: 70, second: 20, third: 10 },
            status: data.status || 'OPEN',
            teams: Array.isArray(data.teams) ? data.teams.join(', ') : '',
            pointValues: data.pointValues || {
              'Round 1': 10,
              'Round 2': 20,
              'Round 3': 40,
              'Round 4': 80,
              'Round 5': 160,
              'Round 6': 320
            }
          });
        }
      } catch (e) {
        console.error("Error loading bracket:", e);
      }
    };
    loadBracket();
  }, [editingBracketId]);

  // Load Entries
  useEffect(() => {
    if (!entriesBracketId) {
      setEntries([]);
      return;
    }
    const loadEntries = async () => {
      setEntriesLoading(true);
      try {
        const q = query(
          collection(db, 'bracketGamePredictions'),
          where('bracketId', '==', entriesBracketId)
        );
        const snap = await getDocs(q);
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error loading bracket entries:", e);
      } finally {
        setEntriesLoading(false);
      }
    };
    loadEntries();
  }, [entriesBracketId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bracket?')) return;
    try {
      await deleteDoc(doc(db, 'brackets', id));
      fetchBrackets();
    } catch (err) {
      console.error('Failed to delete bracket', err);
      alert('Error deleting bracket');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.name.trim()) return;

    setCreating(true);
    try {
      const teamsArray = createData.teamList.split(',').map(t => t.trim()).filter(t => t.length > 0);

      await addDoc(collection(db, 'brackets'), {
        name: createData.name.trim(),
        sport: createData.sport,
        isPublic: createData.isPublic,
        maxEntries: Number(createData.maxEntries),
        cost: Number(createData.cost),
        prizePotPercent: Number(createData.prizePotPercent) / 100,
        payoutSplit: {
          first: Number(createData.payoutSplit.first),
          second: Number(createData.payoutSplit.second),
          third: Number(createData.payoutSplit.third)
        },
        openDate: createData.openDateStr ? new Date(createData.openDateStr).getTime() : Date.now(),
        lockDate: createData.lockDateStr ? new Date(createData.lockDateStr).getTime() : Date.now() + 86400000 * 7,
        teams: teamsArray,
        pointValues: createData.pointValues,
        status: 'OPEN',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      setIsCreateOpen(false);
      navigate('/admin/brackets');
      fetchBrackets();
    } catch (err) {
      console.error(err);
      alert('Failed to create bracket');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBracket || !editingBracketId) return;

    setSavingEdit(true);
    try {
      const teamsArray = typeof editBracket.teams === 'string'
        ? editBracket.teams.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
        : editBracket.teams;

      await updateDoc(doc(db, 'brackets', editingBracketId), {
        name: editBracket.name.trim(),
        sport: editBracket.sport,
        isPublic: editBracket.isPublic,
        maxEntries: Number(editBracket.maxEntries),
        cost: Number(editBracket.cost),
        prizePotPercent: Number(editBracket.prizePotPercent) / 100,
        payoutSplit: {
          first: Number(editBracket.payoutSplit?.first ?? 70),
          second: Number(editBracket.payoutSplit?.second ?? 20),
          third: Number(editBracket.payoutSplit?.third ?? 10)
        },
        status: editBracket.status,
        teams: teamsArray,
        pointValues: editBracket.pointValues,
        updatedAt: Date.now()
      });

      setEditingBracketId(null);
      navigate('/admin/brackets');
      fetchBrackets();
    } catch (e) {
      console.error("Error updating bracket:", e);
      alert("Failed to save bracket");
    } finally {
      setSavingEdit(false);
    }
  };

  // Metrics
  const totalBrackets = brackets.length;
  const publicBrackets = brackets.filter(b => b.isPublic).length;
  const privateBrackets = brackets.filter(b => !b.isPublic).length;

  const filteredBrackets = brackets.filter(b => {
    if (sportFilter !== 'ALL' && b.sport !== sportFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!b.name?.toLowerCase().includes(q) && !b.sport?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Brackets</span>
              <span className="text-2xl font-bold font-display text-white mt-1 block">{totalBrackets}</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <GitMerge className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Public Brackets</span>
              <span className="text-2xl font-bold font-display text-emerald-400 mt-1 block">{publicBrackets}</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Unlock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Private Brackets</span>
              <span className="text-2xl font-bold font-display text-purple-400 mt-1 block">{privateBrackets}</span>
            </div>
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#18181A]">
          <h3 className="font-bold text-lg text-white">Brackets Management ({filteredBrackets.length})</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
            >
              <option value="ALL">All Sports</option>
              <option value="World Cup 2026">World Cup 2026</option>
              <option value="NBA">NBA</option>
              <option value="NFL">NFL</option>
              <option value="MLB">MLB</option>
              <option value="NCAA">NCAA</option>
            </select>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brackets..."
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-zinc-700 w-52 text-white"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePurgeLegacy}
              disabled={purgingLegacy}
              className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              {purgingLegacy ? 'Purging...' : 'Purge Legacy Brackets'}
            </Button>

            <Button variant="secondary" size="sm" onClick={fetchBrackets} className="text-xs">Refresh</Button>

            <Button
              onClick={() => {
                setIsCreateOpen(true);
                navigate('/admin/brackets/create');
              }}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs gap-1"
            >
              <Plus className="w-4 h-4" /> Create Bracket
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading brackets...</div>
        ) : filteredBrackets.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No brackets found.</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Sport</th>
                  <th className="px-6 py-3 font-medium">Visibility</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Max Entries</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredBrackets.map(bracket => (
                  <tr key={bracket.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3 text-zinc-100 font-bold">{bracket.name}</td>
                    <td className="px-6 py-3 text-zinc-300">{bracket.sport}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${
                        bracket.isPublic ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {bracket.isPublic ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-300 font-mono">{bracket.cost ? `${bracket.cost} Links` : 'Free'}</td>
                    <td className="px-6 py-3 text-zinc-400">
                      {bracket.maxEntries > 0 ? bracket.maxEntries : 'Unlimited'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setGradingBracketId(bracket.id)}
                          className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                          title="Set Winners / Grade Matchups"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEntriesBracketId(bracket.id);
                            navigate(`/admin/brackets/entries/${bracket.id}`);
                          }}
                          className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                          title="View Entries"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBracketId(bracket.id);
                            navigate(`/admin/brackets/edit/${bracket.id}`);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                          title="Edit Bracket"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bracket.id)}
                          className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete Bracket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Drawer: Create Bracket --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <h3 className="font-bold text-lg text-white">Create Bracket</h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  navigate('/admin/brackets');
                }}
                className="text-zinc-500 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5 flex-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Bracket Name *</label>
                <input
                  type="text"
                  required
                  value={createData.name}
                  onChange={e => setCreateData({ ...createData, name: e.target.value })}
                  placeholder="e.g. 2026 World Cup Bracket"
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Sport / Tournament</label>
                  <select
                    value={createData.sport}
                    onChange={e => handleCreateSportChange(e.target.value)}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="World Cup 2026">World Cup 2026</option>
                    <option value="NBA">NBA</option>
                    <option value="NFL">NFL</option>
                    <option value="NHL">NHL</option>
                    <option value="MLB">MLB</option>
                    <option value="NCAA">NCAA Basketball</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Visibility</label>
                  <select
                    value={createData.isPublic ? 'true' : 'false'}
                    onChange={e => setCreateData({ ...createData, isPublic: e.target.value === 'true' })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="true">Public</option>
                    <option value="false">Private</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Entry Fee (Links)</label>
                  <input
                    type="number"
                    min="0"
                    value={createData.cost}
                    onChange={e => setCreateData({ ...createData, cost: Number(e.target.value) })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Max Entries (0 = Unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={createData.maxEntries}
                    onChange={e => setCreateData({ ...createData, maxEntries: Number(e.target.value) })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Points Per Round Settings */}
              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Points Per Round</h4>
                <div className="grid grid-cols-2 gap-3">
                  {getRoundNamesForBracket({ sport: createData.sport, teams: createData.teamList ? createData.teamList.split(',').map(t=>t.trim()).filter(Boolean) : Array(16).fill('Team') }).map(roundName => (
                    <div key={roundName} className="flex items-center justify-between bg-[#18181A] border border-zinc-800 rounded-lg p-2">
                      <span className="text-xs font-medium text-zinc-300">{roundName}</span>
                      <input
                        type="number"
                        min="0"
                        value={createData.pointValues[roundName] ?? 10}
                        onChange={e => setCreateData(prev => ({
                          ...prev,
                          pointValues: { ...prev.pointValues, [roundName]: Number(e.target.value) }
                        }))}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Points Per Round Settings */}
              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Points Per Round</h4>
                <div className="grid grid-cols-2 gap-3">
                  {getRoundNamesForBracket({
                    sport: editBracket.sport,
                    teams: typeof editBracket.teams === 'string' ? editBracket.teams.split(',').map((t: string) => t.trim()).filter(Boolean) : editBracket.teams
                  }).map(roundName => (
                    <div key={roundName} className="flex items-center justify-between bg-[#18181A] border border-zinc-800 rounded-lg p-2">
                      <span className="text-xs font-medium text-zinc-300">{roundName}</span>
                      <input
                        type="number"
                        min="0"
                        value={editBracket.pointValues?.[roundName] ?? 10}
                        onChange={e => setEditBracket((prev: any) => ({
                          ...prev,
                          pointValues: { ...(prev?.pointValues || {}), [roundName]: Number(e.target.value) }
                        }))}
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Payout Settings */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Payout Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Total Prize Pot (% of Entry Fees)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={createData.prizePotPercent}
                      onChange={e => setCreateData({ ...createData, prizePotPercent: Number(e.target.value) })}
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">1st, 2nd & 3rd Place Distribution (% of Prize Pot)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">1st Place (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={createData.payoutSplit.first}
                        onChange={e => setCreateData({ ...createData, payoutSplit: { ...createData.payoutSplit, first: Number(e.target.value) } })}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">2nd Place (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={createData.payoutSplit.second}
                        onChange={e => setCreateData({ ...createData, payoutSplit: { ...createData.payoutSplit, second: Number(e.target.value) } })}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">3rd Place (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={createData.payoutSplit.third}
                        onChange={e => setCreateData({ ...createData, payoutSplit: { ...createData.payoutSplit, third: Number(e.target.value) } })}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Seeded Team List (Comma separated)</label>
                <textarea
                  value={createData.teamList}
                  onChange={e => setCreateData({ ...createData, teamList: e.target.value })}
                  placeholder="Team A, Team B, Team C, Team D..."
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-28 resize-none font-mono"
                />
              </div>

              <div className="pt-6 border-t border-zinc-800 flex items-center justify-end gap-3 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    navigate('/admin/brackets');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold">
                  {creating ? 'Creating...' : 'Create Bracket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Drawer: Edit Bracket --- */}
      {editingBracketId && editBracket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-bold text-lg text-white">Edit Bracket</h3>
                <p className="text-xs text-zinc-400 font-mono">ID: {editingBracketId}</p>
              </div>
              <button
                onClick={() => {
                  setEditingBracketId(null);
                  navigate('/admin/brackets');
                }}
                className="text-zinc-500 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5 flex-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Bracket Name</label>
                <input
                  type="text"
                  required
                  value={editBracket.name}
                  onChange={e => setEditBracket({ ...editBracket, name: e.target.value })}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Status</label>
                  <select
                    value={editBracket.status}
                    onChange={e => setEditBracket({ ...editBracket, status: e.target.value })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="LOCKED">LOCKED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Entry Price (Links)</label>
                  <input
                    type="number"
                    min="0"
                    value={editBracket.cost}
                    onChange={e => setEditBracket({ ...editBracket, cost: Number(e.target.value) })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Payout Settings */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Payout Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Total Prize Pot (% of Entry Fees)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editBracket.prizePotPercent ?? 65}
                      onChange={e => setEditBracket({ ...editBracket, prizePotPercent: Number(e.target.value) })}
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">1st, 2nd & 3rd Place Distribution (% of Prize Pot)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">1st Place (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editBracket.payoutSplit?.first ?? 70}
                        onChange={e => setEditBracket({ ...editBracket, payoutSplit: { ...(editBracket.payoutSplit || { first: 70, second: 20, third: 10 }), first: Number(e.target.value) } })}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">2nd Place (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editBracket.payoutSplit?.second ?? 20}
                        onChange={e => setEditBracket({ ...editBracket, payoutSplit: { ...(editBracket.payoutSplit || { first: 70, second: 20, third: 10 }), second: Number(e.target.value) } })}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 block mb-1">3rd Place (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editBracket.payoutSplit?.third ?? 10}
                        onChange={e => setEditBracket({ ...editBracket, payoutSplit: { ...(editBracket.payoutSplit || { first: 70, second: 20, third: 10 }), third: Number(e.target.value) } })}
                        className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Seeded Teams</label>
                <textarea
                  value={editBracket.teams}
                  onChange={e => setEditBracket({ ...editBracket, teams: e.target.value })}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 h-28 resize-none font-mono"
                />
              </div>

              <div className="pt-6 border-t border-zinc-800 flex items-center justify-end gap-3 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingBracketId(null);
                    navigate('/admin/brackets');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit} className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold">
                  {savingEdit ? 'Saving...' : 'Save Bracket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Drawer: Set Winners / Grade Matchups --- */}
      {gradingBracketId && gradingBracket && (() => {
        const roundNamesList = getRoundNamesForBracket(gradingBracket);
        const totalRounds = roundNamesList.length;
        const baseTeams: string[] = gradingBracket.teams || [];
        const results = gradingBracket.results || {};

        const getWinner = (rIdx: number, mIdx: number): string | null => {
          const mId = `r${rIdx}-m${mIdx}`;
          if (results[mId]) return results[mId];
          if (rIdx === 0) {
            const t1 = baseTeams[mIdx * 2] || null;
            const t2 = baseTeams[mIdx * 2 + 1] || null;
            if (t1 === "BYE" && t2 && t2 !== "BYE") return t2;
            if (t2 === "BYE" && t1 && t1 !== "BYE") return t1;
          }
          return null;
        };

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
            <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-5xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                <div>
                  <h3 className="font-bold text-lg text-white">Grade Bracket Matchups</h3>
                  <p className="text-xs text-zinc-400 font-mono">{gradingBracket.name} (ID: {gradingBracketId})</p>
                </div>
                <button
                  onClick={() => setGradingBracketId(null)}
                  className="text-zinc-500 hover:text-white p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                {roundNamesList.map((rName, rIdx) => {
                  const matchesInRound = Math.pow(2, totalRounds - 1 - rIdx);
                  const roundMatches = [];

                  for (let m = 0; m < matchesInRound; m++) {
                    const matchId = `r${rIdx}-m${m}`;
                    let t1: string | null = null;
                    let t2: string | null = null;

                    if (rIdx === 0) {
                      t1 = baseTeams[m * 2] || null;
                      t2 = baseTeams[m * 2 + 1] || null;
                    } else {
                      t1 = getWinner(rIdx - 1, m * 2);
                      t2 = getWinner(rIdx - 1, m * 2 + 1);
                    }

                    const currentWinner = results[matchId] || null;
                    const isUpdating = updatingWinnerMatchId === matchId;

                    roundMatches.push({
                      matchId,
                      team1: t1,
                      team2: t2,
                      currentWinner,
                      isUpdating
                    });
                  }

                  return (
                    <div key={rName} className="bg-[#18181A] border border-zinc-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-emerald-400">
                          {rName}
                        </h4>
                        <span className="text-xs font-mono text-zinc-400">
                          {roundMatches.filter(m => m.currentWinner).length} / {matchesInRound} Decided
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roundMatches.map(match => (
                          <div key={match.matchId} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 space-y-3">
                            <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400">
                              <span>Match {match.matchId}</span>
                              {match.currentWinner && (
                                <span className="text-emerald-400 font-bold uppercase">Winner: {match.currentWinner}</span>
                              )}
                            </div>

                            <div className="space-y-2">
                              {/* Team 1 Button */}
                              <button
                                disabled={!match.team1 || match.team1 === 'BYE' || match.isUpdating}
                                onClick={() => handleSetMatchWinner(gradingBracketId, match.matchId, match.team1)}
                                className={`w-full p-2 rounded text-xs font-bold transition-all flex items-center justify-between border ${
                                  match.currentWinner === match.team1
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800'
                                } ${(!match.team1 || match.team1 === 'BYE') ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span className="truncate">{match.team1 || 'TBD'}</span>
                                {match.currentWinner === match.team1 && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
                              </button>

                              {/* Team 2 Button */}
                              <button
                                disabled={!match.team2 || match.team2 === 'BYE' || match.isUpdating}
                                onClick={() => handleSetMatchWinner(gradingBracketId, match.matchId, match.team2)}
                                className={`w-full p-2 rounded text-xs font-bold transition-all flex items-center justify-between border ${
                                  match.currentWinner === match.team2
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800'
                                } ${(!match.team2 || match.team2 === 'BYE') ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span className="truncate">{match.team2 || 'TBD'}</span>
                                {match.currentWinner === match.team2 && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
                              </button>
                            </div>

                            {match.currentWinner && (
                              <button
                                disabled={match.isUpdating}
                                onClick={() => handleSetMatchWinner(gradingBracketId, match.matchId, 'CLEAR')}
                                className="w-full py-1 text-[11px] text-zinc-400 hover:text-red-400 transition-colors text-center font-medium"
                              >
                                Clear Winner
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- Drawer: View Bracket Entries --- */}
      {entriesBracketId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-2xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Bracket Entries ({entries.length})</h3>
                <p className="text-xs text-zinc-400 font-mono">Bracket ID: {entriesBracketId}</p>
              </div>
              <button
                onClick={() => {
                  setEntriesBracketId(null);
                  navigate('/admin/brackets');
                }}
                className="text-zinc-500 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {entriesLoading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Loading bracket predictions...</div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm font-medium">No user entries submitted for this bracket yet.</div>
            ) : (
              <div className="space-y-4 flex-1">
                {entries.map(ent => (
                  <div key={ent.id} className="bg-[#18181A] border border-zinc-800 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex justify-between items-center text-zinc-300 font-semibold border-b border-zinc-800 pb-2">
                      <span>User ID: {ent.userId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${ent.paid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                        {ent.paid ? 'PAID ENTRY' : 'UNPAID'}
                      </span>
                    </div>
                    <div className="text-zinc-400 font-mono text-[11px] overflow-x-auto">
                      <pre className="bg-zinc-950 p-2 rounded">{JSON.stringify(ent.selections || {}, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
