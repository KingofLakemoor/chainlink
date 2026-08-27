import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Loader2, ArrowLeft, RefreshCw, Trash2, Plus, Check } from 'lucide-react';

export default function Link4SegmentDetail({ segmentId, onBack }: { segmentId: string, onBack: () => void }) {
  const [segment, setSegment] = useState<any>(null);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchupsLoading, setMatchupsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pool Slotting state
  const [showPool, setShowPool] = useState(false);
  const [poolMatchups, setPoolMatchups] = useState<any[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [slottingLoading, setSlottingLoading] = useState(false);

  useEffect(() => {
    const fetchSegment = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'link4Segments', segmentId));
        if (docSnap.exists()) {
          setSegment({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSegment();
  }, [segmentId]);

  useEffect(() => {
    if (segmentId) {
      fetchMatchups();
    }
  }, [segmentId]);

  const fetchMatchups = async () => {
    if (!segmentId) return;
    setMatchupsLoading(true);
    setFetchError(null);
    try {
      const docsMap = new Map<string, any>();

      try {
        const q = query(
          collection(db, 'link4Matchups'),
          where('segmentId', '==', segmentId)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          docsMap.set(d.id, { id: d.id, ...d.data() });
        });
      } catch (primaryErr: any) {
        console.warn('Primary link4Matchups query failed:', primaryErr);
      }

      try {
        const fallbackSnap = await getDocs(collection(db, 'link4Matchups'));
        fallbackSnap.docs.forEach(d => {
          const m = d.data();
          if (m.segmentId === segmentId || d.id.startsWith(`${segmentId}_`)) {
            docsMap.set(d.id, { id: d.id, ...m });
          }
        });
            } catch (fallbackErr: any) {
        console.warn('Fallback link4Matchups query failed:', fallbackErr);
        try {
          const res = await fetch(`/api/link4/matchups/${segmentId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.matchups) {
              data.matchups.forEach((m: any) => docsMap.set(m.id, m));
            }
          }
        } catch (apiErr) {
          console.error("API fetch fallback also failed", apiErr);
        }
      }

      setMatchups(Array.from(docsMap.values()));
    } catch (err: any) {
      console.error('Error fetching Link4 matchups:', err);
      setFetchError(err.message || String(err));
    } finally {
      setMatchupsLoading(false);
    }
  };

  const fetchPoolMatchups = async () => {
    setPoolLoading(true);
    try {
      const snap = await getDocs(collection(db, 'matchups'));
      const existingGameIds = new Set<string>();
      matchups.forEach(m => {
        if (m.gameId) existingGameIds.add(String(m.gameId));
        if (m.id) {
          existingGameIds.add(String(m.id));
          existingGameIds.add(String(m.id).replace(new RegExp(`^${segmentId}_`), ''));
        }
      });

      let allowedSports = segment?.allowedSports || [];
      if (allowedSports.length === 0) {
        const nameLower = (segment?.name || '').toLowerCase();
        if (nameLower.includes('college football') || nameLower.includes('cfb') || nameLower.includes('ncaa football')) {
          allowedSports = ['CFB'];
        } else if (nameLower.includes('nfl')) {
          allowedSports = ['NFL'];
        } else if (nameLower.includes('nba')) {
          allowedSports = ['NBA'];
        } else if (nameLower.includes('mlb')) {
          allowedSports = ['MLB'];
        } else if (nameLower.includes('nhl')) {
          allowedSports = ['NHL'];
        }
      }

      let available = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((m: any) => {
          const gId = String(m.gameId || m.id);
          if (!gId) return false;
          if (allowedSports.length > 0 && !allowedSports.includes(m.league)) return false;
          if (existingGameIds.has(gId)) return false;
          return true;
        })
        .sort((a: any, b: any) => (a.startTime || 0) - (b.startTime || 0));

      // If no games found in main matchups collection, scrape ESPN for allowed sports
      if (available.length === 0 && allowedSports.length > 0) {
        try {
          const { scrapeLeagueSchedules } = await import('../../../services/espnScraper');
          for (const lg of allowedSports) {
            const res = await scrapeLeagueSchedules(lg, false, undefined, undefined);
            if (res.data) {
              res.data.forEach((m: any) => {
                const gId = String(m.gameId || m.id);
                if (gId && !existingGameIds.has(gId)) {
                  if (!available.some((a: any) => String(a.gameId || a.id) === gId)) {
                    available.push(m);
                  }
                }
              });
            }
          }
          available.sort((a: any, b: any) => (a.startTime || 0) - (b.startTime || 0));
        } catch (scrapeErr) {
          console.warn('Failed fallback ESPN scrape for pool matchups:', scrapeErr);
        }
      }

      setPoolMatchups(available);
    } catch (err) {
      console.error('Failed to fetch main matchups pool:', err);
    } finally {
      setPoolLoading(false);
    }
  };

  const handleOpenPool = () => {
    setShowPool(!showPool);
    if (!showPool) {
      fetchPoolMatchups();
    }
  };

  const toggleSelectPoolMatchup = (gameId: string) => {
    setSelectedPoolIds(prev =>
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  const handleSlotSelected = async () => {
    if (selectedPoolIds.length === 0) return;
    setSlottingLoading(true);
    try {
      const matchupsToSlot = poolMatchups.filter(m => selectedPoolIds.includes(String(m.gameId || m.id)));
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch('/api/admin/link4/add-matchups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          segmentId,
          matchups: matchupsToSlot
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to slot matchups');
      }

      alert(`Slotted ${data.count ?? matchupsToSlot.length} matchups into Link4!`);
      setSelectedPoolIds([]);
      setShowPool(false);
      await fetchMatchups();
    } catch (err: any) {
      console.error(err);
      alert('Failed to slot matchups: ' + (err.message || String(err)));
    } finally {
      setSlottingLoading(false);
    }
  };

  const handleSyncMatchups = async () => {
    if (!segment || !segmentId) return;

    setMatchupsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/link4/sync-matchups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ segmentId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync matchups');
      }

      await fetchMatchups();
      alert(`Synced ${data.count ?? 0} matchups successfully for Link4!`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to sync matchups: ' + (err.message || String(err)));
    } finally {
      setMatchupsLoading(false);
    }
  };

  const handleDeleteMatchup = async (matchupId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/link4/delete-matchup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchupId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete matchup');
      }

      setMatchups(prev => prev.filter(m => m.id !== matchupId));
    } catch (err: any) {
      console.error(err);
      alert('Failed to remove matchup: ' + (err.message || String(err)));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-4" />
        <p className="text-zinc-400">Loading Segment Details...</p>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Segments
        </Button>
        <p className="text-zinc-500">Segment not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h3 className="text-2xl text-zinc-100 font-bold">
          {segment.name} Matchups
        </h3>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-lg p-6 flex flex-col min-h-[500px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-bold text-lg capitalize">Included Matchups ({matchups.length})</h3>
          <div className="flex items-center gap-2">
            <Button onClick={handleOpenPool} variant="outline" size="sm" className="gap-2 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
               <Plus className="w-4 h-4 text-green-400" />
               {showPool ? 'Hide Available Pool' : 'Slot Available Games'}
            </Button>
            <Button onClick={handleSyncMatchups} size="sm" className="gap-2" disabled={matchupsLoading}>
               <RefreshCw className={`w-4 h-4 ${matchupsLoading ? 'animate-spin' : ''}`} />
               {matchupsLoading ? 'Syncing...' : 'Sync Matchups (ESPN)'}
            </Button>
          </div>
        </div>

        {/* Pool Slotting Interface */}
        {showPool && (
          <div className="mb-6 p-4 bg-[#1a1a1a] border border-zinc-700 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-md">Slot Games from Main Matchups Pool</h4>
                <p className="text-xs text-zinc-400">Select scheduled games from main database to include in this Link4 segment.</p>
              </div>
              {selectedPoolIds.length > 0 && (
                <Button onClick={handleSlotSelected} size="sm" disabled={slottingLoading} className="gap-2 bg-green-600 hover:bg-green-500">
                  {slottingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Slot {selectedPoolIds.length} Selected
                </Button>
              )}
            </div>

            {poolLoading ? (
              <div className="p-6 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-500" /> Loading available pool...
              </div>
            ) : poolMatchups.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                No un-slotted matchups found in database for segment sports.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {poolMatchups.map(m => {
                  const gameIdStr = String(m.gameId || m.id);
                  const isSelected = selectedPoolIds.includes(gameIdStr);

                  return (
                    <div
                      key={gameIdStr}
                      onClick={() => toggleSelectPoolMatchup(gameIdStr)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-green-500/10 border-green-500/50 text-white'
                          : 'bg-[#222225] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-green-500 bg-green-500 text-black' : 'border-zinc-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-white">{m.awayTeam?.name || 'Away'} @ {m.homeTeam?.name || 'Home'}</span>
                          <span className="ml-2 text-xs text-zinc-400">({m.league})</span>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {new Date(m.startTime).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {fetchError && (
          <div className="p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium">
            Error loading matchups: {fetchError}
          </div>
        )}

        {matchupsLoading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading matchups...</div>
        ) : matchups.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No matchups found for this segment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-[#1a1a1a] text-zinc-300 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-lg">Start Time</th>
                  <th className="px-4 py-3 font-medium">League</th>
                  <th className="px-4 py-3 font-medium">Matchup</th>
                  <th className="px-4 py-3 font-medium">Away ML</th>
                  <th className="px-4 py-3 font-medium">Home ML</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {matchups.sort((a,b) => {
                  const timeA = typeof a.startTime === 'number' ? a.startTime : (a.startTime ? new Date(a.startTime).getTime() : 0);
                  const timeB = typeof b.startTime === 'number' ? b.startTime : (b.startTime ? new Date(b.startTime).getTime() : 0);
                  return timeA - timeB;
                }).map(m => {
                  const validTime = typeof m.startTime === 'number' ? m.startTime : (m.startTime ? new Date(m.startTime).getTime() : 0);
                  return (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {validTime ? new Date(validTime).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium">{m.league}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{m.awayTeam.name} @ {m.homeTeam.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.metadata?.mlAway !== undefined ? m.metadata.mlAway : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {m.metadata?.mlHome !== undefined ? m.metadata.mlHome : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.status === 'STATUS_FINAL' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        m.status === 'STATUS_IN_PROGRESS' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                        'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {m.status.replace('STATUS_', '')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteMatchup(m.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="Remove from Segment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
