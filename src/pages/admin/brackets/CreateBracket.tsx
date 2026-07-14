import React from 'react';
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function CreateBracket() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [sport, setSport] = useState('NBA');
  const [isPublic, setIsPublic] = useState(true);
  const [maxEntries, setMaxEntries] = useState(0);
  const [openDate, setOpenDate] = useState('');
  const [lockDate, setLockDate] = useState('');
  const [teamList, setTeamList] = useState('');
  const [cost, setCost] = useState(10);
  const [loading, setLoading] = useState(false);
  const [pointValues, setPointValues] = useState<{ [key: string]: number }>({
    'Round 1': 10,
    'Round 2': 20,
    'Round 3': 40,
    'Round 4': 80,
    'Round 5': 160,
    'Round 6': 320
  });

  const handlePointChange = (round: string, value: number) => {
    setPointValues(prev => ({ ...prev, [round]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const teamsArray = teamList.split(',').map(t => t.trim()).filter(t => t.length > 0);

      await addDoc(collection(db, 'brackets'), {
        name: name.trim(),
        sport,
        isPublic,
        maxEntries: Number(maxEntries),
        cost: Number(cost),
        openDate: openDate ? new Date(openDate).getTime() : Date.now(),
        lockDate: lockDate ? new Date(lockDate).getTime() : Date.now() + 86400000 * 7,
        teams: teamsArray,
        pointValues,
        status: 'OPEN',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      navigate('/admin/brackets');
    } catch (err) {
      console.error(err);
      alert('Failed to create bracket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Create Bracket</h2>
        <Button variant="ghost" onClick={() => navigate('/admin/brackets')}>Cancel</Button>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Bracket Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. 2026 World Cup Bracket"
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Sport / Tournament Type</label>
              <select
                value={sport}
                onChange={e => setSport(e.target.value)}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              >
                <option value="World Cup 2026">World Cup 2026</option>
                <option value="NBA">NBA</option>
                <option value="NFL">NFL</option>
                <option value="NHL">NHL</option>
                <option value="MLB">MLB</option>
                <option value="ATP">ATP</option>
                <option value="WTA">WTA</option>
                <option value="NCAA">NCAA Basketball</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Visibility</label>
              <select
                value={isPublic ? 'true' : 'false'}
                onChange={e => setIsPublic(e.target.value === 'true')}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              >
                <option value="true">Public</option>
                <option value="false">Private</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Max Entries (0 for unlimited)</label>
              <input
                type="number"
                value={maxEntries}
                onChange={e => setMaxEntries(Number(e.target.value))}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Entry Price (Links)</label>
              <input
                type="number"
                value={cost}
                onChange={e => setCost(Number(e.target.value))}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Open Date (Entries start)</label>
              <input
                type="datetime-local"
                value={openDate}
                onChange={e => setOpenDate(e.target.value)}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Lock Date (First matchup starts)</label>
              <input
                type="datetime-local"
                value={lockDate}
                onChange={e => setLockDate(e.target.value)}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Teams (Comma separated, ordered top-to-bottom for seeding)</label>
            <textarea
              value={teamList}
              onChange={e => setTeamList(e.target.value)}
              placeholder="Team A, Team B, Team C..."
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white h-32"
            />
            <p className="text-xs text-zinc-500 mt-1">Number of teams should ideally be a power of 2 (e.g., 4, 8, 16, 32, 64).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Points per Round</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(pointValues)
                .sort(([roundA], [roundB]) => roundA.localeCompare(roundB, undefined, { numeric: true }))
                .map(([round, points]) => (
                <div key={round} className="flex items-center gap-2">
                  <span className="text-sm text-zinc-300 w-20">{round}</span>
                  <input
                    type="number"
                    value={points}
                    onChange={e => handlePointChange(round, Number(e.target.value))}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3">
            {loading ? 'Creating...' : 'Create Bracket'}
          </Button>
        </form>
      </div>
    </div>
  );
}
