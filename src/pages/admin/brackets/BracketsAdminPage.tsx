import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, addDoc, getDoc, updateDoc, query, where, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { GitMerge, Plus, Search, Edit, Trash2, Users, RefreshCw, X, Shield, Lock, Unlock } from 'lucide-react';

interface Bracket {
  id: string;
  name: string;
  sport: string;
  isPublic: boolean;
  maxEntries: number;
  cost: number;
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

  // Create Form State
  const [createData, setCreateData] = useState({
    name: '',
    sport: 'World Cup 2026',
    isPublic: true,
    maxEntries: 0,
    cost: 10,
    openDateStr: '',
    lockDateStr: '',
    teamList: '',
    pointValues: {
      'Round 1': 10,
      'Round 2': 20,
      'Round 3': 40,
      'Round 4': 80,
      'Round 5': 160,
      'Round 6': 320
    }
  });

  const handleCreateSportChange = (newSport: string) => {
    if (newSport === 'MLB') {
      setCreateData(prev => ({
        ...prev,
        sport: newSport,
        name: prev.name || '2026 MLB Postseason Bracket',
        teamList: [
          "AL Seed 1", "BYE",
          "AL Seed 4", "AL Seed 5",
          "AL Seed 3", "AL Seed 6",
          "AL Seed 2", "BYE",
          "NL Seed 1", "BYE",
          "NL Seed 4", "NL Seed 5",
          "NL Seed 3", "NL Seed 6",
          "NL Seed 2", "BYE"
        ].join(', '),
        pointValues: {
          'Wild Card Series': 10,
          'Division Series': 20,
          'League Championship Series': 40,
          'World Series': 80
        }
      }));
    } else {
      setCreateData(prev => ({ ...prev, sport: newSport }));
    }
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
