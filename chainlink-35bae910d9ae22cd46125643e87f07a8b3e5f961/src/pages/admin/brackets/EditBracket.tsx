import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export default function EditBracket() {
  const { id } = useParams();
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
  const [fetching, setFetching] = useState(true);
  const [pointValues, setPointValues] = useState<{ [key: string]: number }>({});
  const [results, setResults] = useState<{ [key: string]: string }>({});
  const [eliminatedTeams, setEliminatedTeams] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchBracket = async () => {
      try {
        const docRef = doc(db, 'brackets', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setSport(data.sport || 'NBA');
          setIsPublic(data.isPublic !== false);
          setMaxEntries(data.maxEntries || 0);
          setCost(data.cost ?? 10);

          if (data.openDate) {
            const date = new Date(data.openDate);
            setOpenDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
          if (data.lockDate) {
            const date = new Date(data.lockDate);
            setLockDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }

          if (data.teams && Array.isArray(data.teams)) {
            setTeamList(data.teams.join(', '));
          }

          if (data.pointValues) {
            setPointValues(data.pointValues);
          }

          if (data.results) {
            setResults(data.results);
          }
          if (data.eliminatedTeams) {
            setEliminatedTeams(data.eliminatedTeams);
          }
        }
      } catch (err) {
        console.error('Failed to fetch bracket:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchBracket();
  }, [id]);

  const handlePointChange = (round: string, value: number) => {
    setPointValues(prev => ({ ...prev, [round]: value }));
  };

  const handleResultChange = (matchId: string, winner: string) => {
    setResults(prev => ({ ...prev, [matchId]: winner }));
  };

  const getMatchTeams = (round: number, matchIndex: number) => {
    const teams = teamList.split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (round === 0) {
      const team1 = teams[matchIndex * 2] || null;
      const team2 = teams[matchIndex * 2 + 1] || null;
      return [team1, team2];
    } else {
      const prevRound = round - 1;
      const prevMatch1Index = matchIndex * 2;
      const prevMatch2Index = matchIndex * 2 + 1;

      const prevMatch1Id = `r${prevRound}-m${prevMatch1Index}`;
      const prevMatch2Id = `r${prevRound}-m${prevMatch2Index}`;

      const team1 = results[prevMatch1Id] || null;
      const team2 = results[prevMatch2Id] || null;

      return [team1, team2];
    }
  };

  const renderManualProgression = () => {
    const teams = teamList.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (teams.length < 2) return null;

    const totalRounds = Math.ceil(Math.log2(teams.length));

    return (
      <div className="mt-8 border-t border-zinc-800 pt-6">
        <h3 className="text-lg font-bold text-white mb-4">Manual Bracket Progression</h3>
        <p className="text-sm text-zinc-400 mb-6">Select the winner for each matchup to manually advance the bracket.</p>

        <div className="space-y-8">
          {Array.from({ length: totalRounds }).map((_, round) => {
            const matchesInRound = Math.ceil(teams.length / Math.pow(2, round + 1));
            return (
              <div key={round} className="bg-zinc-800/30 p-4 rounded-lg">
                <h4 className="font-bold text-zinc-300 mb-4 uppercase text-xs tracking-wider">Round {round + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: matchesInRound }).map((_, matchIndex) => {
                    const matchId = `r${round}-m${matchIndex}`;
                    const [team1, team2] = getMatchTeams(round, matchIndex);
                    const hasBothTeams = team1 && team2;
                    const currentValue = results[matchId] || '';

                    return (
                      <div key={matchId} className="bg-[#18181A] border border-zinc-800 p-3 rounded-md">
                        <div className="text-xs text-zinc-500 mb-2 font-mono">{matchId}</div>
                        <select
                          value={currentValue}
                          onChange={(e) => handleResultChange(matchId, e.target.value)}
                          disabled={!hasBothTeams}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Winner...</option>
                          {team1 && <option value={team1}>{team1}</option>}
                          {team2 && <option value={team2}>{team2}</option>}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id) return;

    setLoading(true);
    try {
      const teamsArray = teamList.split(',').map(t => t.trim()).filter(t => t.length > 0);

      // Re-compute eliminated teams based on the finalized results
      const newEliminatedTeams: string[] = [];
      const totalRounds = Math.ceil(Math.log2(teamsArray.length));

      for (let round = 0; round < totalRounds; round++) {
        const matchesInRound = Math.ceil(teamsArray.length / Math.pow(2, round + 1));
        for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
           const matchId = `r${round}-m${matchIndex}`;
           const winner = results[matchId];
           if (winner) {
             const [team1, team2] = getMatchTeams(round, matchIndex);
             if (team1 && team2) {
               const loser = team1 === winner ? team2 : team1;
               if (loser && !newEliminatedTeams.includes(loser)) {
                 newEliminatedTeams.push(loser);
               }
             }
           }
        }
      }

      await updateDoc(doc(db, 'brackets', id), {
        name: name.trim(),
        sport,
        isPublic,
        maxEntries: Number(maxEntries),
        cost: Number(cost),
        openDate: openDate ? new Date(openDate).getTime() : Date.now(),
        lockDate: lockDate ? new Date(lockDate).getTime() : Date.now() + 86400000 * 7,
        teams: teamsArray,
        pointValues,
        results,
        eliminatedTeams: newEliminatedTeams,
        updatedAt: Date.now()
      });
      navigate('/admin/brackets');
    } catch (err) {
      console.error(err);
      alert('Failed to update bracket');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-6 text-zinc-400">Loading bracket data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Edit Bracket</h2>
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

          {renderManualProgression()}

          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
