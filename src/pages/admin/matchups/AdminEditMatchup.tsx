import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, query, where, updateDoc, documentId } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Edit } from "lucide-react";
import { FirebaseImage } from "../../../components/ui/FirebaseImage";

export function AdminEditMatchup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matchup, setMatchup] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatchup = async () => {
      setLoading(true);
      try {
        if (!id) return;
        const docRef = doc(db, 'matchups', id);
        const docSnap = await getDocs(query(collection(db, 'matchups'), where('__name__', '==', id)));

        if (!docSnap.empty) {
            const mData = docSnap.docs[0].data();
            // Start time formatting for input type="datetime-local"
            let formattedDate = "";
            if (mData.startTime) {
                const date = new Date(mData.startTime);
                const tzOffset = date.getTimezoneOffset() * 60000;
                formattedDate = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
            }

            setMatchup({ ...mData, id: docSnap.docs[0].id, formStartTime: formattedDate });
        }

        // Fetch active sponsors
        const sponsorsSnap = await getDocs(query(collection(db, 'sponsors'), where('active', '==', true)));
        if (!sponsorsSnap.empty) {
            const activeSponsors = sponsorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSponsors(activeSponsors);
        }

        const picksSnap = await getDocs(query(collection(db, 'picks'), where('matchupId', '==', id)));
        const rawPicks = picksSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

        // Batch fetch users to avoid N+1 query
        const userMap = new Map<string, { name: string, image: string }>();
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

        setPicks(picksData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMatchup();
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setMatchup((prev: any) => {
        const newData = { ...prev };
        const keys = field.split('.');
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            // Need to shallow copy the nested object as well
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

  const handleUpdate = async () => {
    try {
        if (!id) return;
        const updateData = { ...matchup };
        delete updateData.id;
        delete updateData.formStartTime;

        if (matchup.formStartTime) {
            updateData.startTime = new Date(matchup.formStartTime).getTime();
        }

        updateData.cost = Number(updateData.cost);
        updateData.reward = Number(updateData.reward ?? 10);
        if (updateData.homeTeam) updateData.homeTeam.score = Number(updateData.homeTeam.score || 0);
        if (updateData.awayTeam) updateData.awayTeam.score = Number(updateData.awayTeam.score || 0);

        updateData.updatedAt = Date.now();
        await updateDoc(doc(db, 'matchups', id), updateData);
        alert('Matchup updated successfully!');
    } catch (e) {
        console.error(e);
        alert('Failed to update matchup');
    }
  };

  const handleFinalize = async () => {
      handleChange('status', 'STATUS_FINAL');

      try {
          const res = await fetch('/api/admin/grade-matchup', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
              },
              body: JSON.stringify({ gameId: matchup.gameId })
          });

          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const rawText = await res.text();
            throw new Error(`Server returned an invalid response (${res.status}). The backend API may not be running.\nResponse: ${rawText.substring(0, 100)}`);
          }
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

  if (loading) return <div className="p-8 text-zinc-500">Loading matchup details...</div>;
  if (!matchup) return <div className="p-8 text-zinc-500">Matchup not found</div>;

  return (
    <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl flex flex-col h-full max-h-[85vh] overflow-y-auto custom-scrollbar overflow-hidden">
      <div className="p-6 border-b border-zinc-800 bg-[#18181A] sticky top-0 z-10 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
            <h2 className="text-2xl font-bold text-white mb-1">Edit Matchup</h2>
            <p className="text-zinc-400 text-sm">{matchup.title} - {matchup.league}</p>
        </div>
        <Button onClick={() => navigate('/admin/matchups')} variant="outline">Back to Matchups</Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Matchup Title</label>
                <input
                    type="text"
                    value={matchup.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={matchup.hasCustomTitle || false}
                    onChange={(e) => handleChange('hasCustomTitle', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20"
                  />
                  <label className="text-xs text-zinc-400">Lock Custom Title (prevents API overwrites)</label>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">League</label>
                <select
                    value={matchup.league || ''}
                    onChange={(e) => handleChange('league', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                    {["MLB", "NBA", "NBASL", "NHL", "PGA", "WNBA", "NFL", "CFL", "WBB", "MBB", "MLS", "LMX", "EPL", "NWSL", "CFB", "CBASE", "FIFA", "FRA", "TUR", "RPL", "CHN", "ATP", "WTA", "CRICKET"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
            </div>
            <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</label>
                <select
                    value={matchup.status || ''}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-800/50 pt-6">
            {/* Away Team */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Team Name</label>
                    <input type="text" value={matchup.awayTeam?.name || ''} onChange={(e) => handleChange('awayTeam.name', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
                <div className="flex gap-4 items-center">
                    {matchup.awayTeam?.image && <img src={matchup.awayTeam.image} alt="Away" className="w-8 h-8 object-contain bg-white rounded p-0.5" loading="lazy" />}
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Team Image URL</label>
                        <input type="text" value={matchup.awayTeam?.image || ''} onChange={(e) => handleChange('awayTeam.image', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Team Score</label>
                    <input type="number" value={matchup.awayTeam?.score || 0} onChange={(e) => handleChange('awayTeam.score', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
            </div>

            {/* Home Team */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Team Name</label>
                    <input type="text" value={matchup.homeTeam?.name || ''} onChange={(e) => handleChange('homeTeam.name', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
                <div className="flex gap-4 items-center">
                    {matchup.homeTeam?.image && <img src={matchup.homeTeam.image} alt="Home" className="w-8 h-8 object-contain bg-white rounded p-0.5" loading="lazy" />}
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Team Image URL</label>
                        <input type="text" value={matchup.homeTeam?.image || ''} onChange={(e) => handleChange('homeTeam.image', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Team Score</label>
                    <input type="number" value={matchup.homeTeam?.score || 0} onChange={(e) => handleChange('homeTeam.score', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
            </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 border-t border-zinc-800/50 pt-6">
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</label>
                <select value={matchup.type || 'SCORE'} onChange={(e) => handleChange('type', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700">
                    <option value="SCORE">SCORE</option>
                    <option value="STATS">STATS</option>
                    <option value="LEADERS">LEADERS</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="SPREAD">SPREAD</option>
                    <option value="SOCCER_SCORE">SOCCER_SCORE</option>
                    <option value="OVER_UNDER">OVER_UNDER</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Type Details</label>
                <input type="text" value={matchup.typeDetails || ''} onChange={(e) => handleChange('typeDetails', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
            </div>
            {matchup.type === 'STATS' && (
                <div className="space-y-2 col-span-2 grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stat Category</label>
                        <input type="text" value={matchup.metadata?.statCategory || ''} onChange={(e) => handleChange('metadata.statCategory', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stat Key</label>
                        <input type="text" value={matchup.metadata?.statKey || ''} onChange={(e) => handleChange('metadata.statKey', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>

                </div>
            )}
            {matchup.type === 'SPREAD' && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Spread</label>
                    <input type="number" step="0.5" value={matchup.metadata?.spread ?? ''} onChange={(e) => handleChange('metadata.spread', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
            )}
            {matchup.type === 'OVER_UNDER' && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total (Over/Under)</label>
                    <input type="number" step="0.5" value={matchup.metadata?.overUnder ?? ''} onChange={(e) => handleChange('metadata.overUnder', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                </div>
            )}
            {matchup.type === 'SOCCER_SCORE' && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Team Score Type</label>
                        <select value={matchup.metadata?.awayScoreType || 'WIN_BY'} onChange={(e) => handleChange('metadata.awayScoreType', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700">
                            <option value="WIN_BY">Win By x+</option>
                            <option value="WIN_DRAW_LOSE">Win, Draw, or Lose by x</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Team Score Type</label>
                        <select value={matchup.metadata?.homeScoreType || 'WIN_DRAW_LOSE'} onChange={(e) => handleChange('metadata.homeScoreType', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700">
                            <option value="WIN_BY">Win By x+</option>
                            <option value="WIN_DRAW_LOSE">Win, Draw, or Lose by x</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Away Score Value</label>
                        <input type="number" step="0.5" value={matchup.metadata?.awayScoreValue ?? ''} onChange={(e) => handleChange('metadata.awayScoreValue', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Home Score Value</label>
                        <input type="number" step="0.5" value={matchup.metadata?.homeScoreValue ?? ''} onChange={(e) => handleChange('metadata.homeScoreValue', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    </div>
                </div>
            )}
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cost</label>
                <input type="number" value={matchup.cost || 0} onChange={(e) => handleChange('cost', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Reward</label>
                <input type="number" value={matchup.reward ?? 10} onChange={(e) => handleChange('reward', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Start Time</label>
                <input type="datetime-local" value={matchup.formStartTime || ''} onChange={(e) => handleChange('formStartTime', e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 [color-scheme:dark]" />
            </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-8 border-t border-zinc-800/50 pt-6 pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={matchup.active || false} onChange={(e) => handleChange('active', e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                <span className="text-sm font-medium text-zinc-300">Active</span>
            </label>
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={matchup.featured || false} onChange={(e) => handleChange('featured', e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/20" />
                    <span className="text-sm font-medium text-zinc-300">Featured</span>
                </label>
                {matchup.featured && (
                    <select
                        value={matchup.featuredType || 'Featured'}
                        onChange={(e) => handleChange('featuredType', e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    >
                        <option value="Featured">Featured</option>
                        <option value="ChainBuilder">ChainBuilder</option>
                        {sponsors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>
        </div>

        {/* Actions */}
        <div className="border-t border-zinc-800/50 pt-6 space-y-4">
            <h3 className="font-bold text-lg text-white">In Progress Actions</h3>
            <div className="flex flex-col gap-3">
                <button onClick={handleFinalize} className="w-full bg-red-900/40 hover:bg-red-800/60 text-red-100 font-bold py-3 rounded-lg transition-colors border border-red-900/50">Finalize Matchup</button>
                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3 rounded-lg transition-colors">Release Picks</button>
            </div>
        </div>

        <div className="pt-4 flex justify-end">
            <Button onClick={handleUpdate} className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">Update Matchup</Button>
        </div>
      </div>

      {/* Picks Section */}
      <div className="border-t border-zinc-800 bg-[#18181A] p-6">
        <h3 className="font-bold text-lg mb-4 text-white">Picks ({picks.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-zinc-500 border-b border-zinc-800/50">
              <tr>
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Pick</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Links</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
                {picks.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4">
                            <div className="flex items-center gap-3">
                                <FirebaseImage fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} src={p.userImage || ""} className="w-8 h-8 rounded-full bg-zinc-800" loading="lazy" />
                                <span className="font-medium text-zinc-300">{p.userName}</span>
                            </div>
                        </td>
                        <td className="py-4">
                            <div className="flex items-center gap-2">
                                <img src={p.team?.image} className="w-5 h-5 object-contain" loading="lazy" />
                                <span className="text-zinc-300">{p.team?.name}</span>
                            </div>
                        </td>
                        <td className="py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400">
                                {p.status || 'PENDING'}
                            </span>
                        </td>
                        <td className="py-4 text-zinc-400">{p.links || 0}</td>
                        <td className="py-4 text-right">
                            <Link to={`/admin/picks/edit/${p.id}`} className="text-zinc-500 hover:text-white mr-3 inline-block"><Edit className="w-4 h-4" /></Link>
                        </td>
                    </tr>
                ))}
                {picks.length === 0 && (
                    <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">No picks found for this matchup.</td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}