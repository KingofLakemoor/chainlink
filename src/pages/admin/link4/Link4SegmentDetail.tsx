import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, updateDoc, writeBatch, where } from "firebase/firestore";
import { db } from '../../../lib/firebase';
import { Button } from '../../../components/ui/button';
import { Loader2, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { SUPPORTED_LEAGUES, scrapeLeagueSchedules } from '../../../services/espnScraper';

export default function Link4SegmentDetail({ segmentId, onBack }: { segmentId: string, onBack: () => void }) {
  const [segment, setSegment] = useState<any>(null);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchupsLoading, setMatchupsLoading] = useState(false);

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
    try {
      const q = query(
        collection(db, 'link4Matchups'),
        where('segmentId', '==', segmentId)
      );
      const snap = await getDocs(q);
      setMatchups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setMatchupsLoading(false);
    }
  };

  const handleSyncMatchups = async () => {
    if (!segment || !segmentId) return;
    const leaguesToSync = segment.allowedSports && segment.allowedSports.length > 0
      ? segment.allowedSports
      : [];

    if (leaguesToSync.length === 0) {
      alert("No sports configured for this segment.");
      return;
    }

    setMatchupsLoading(true);
    try {
      let count = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const lg of leaguesToSync) {
        let effectiveBeginDate = segment.startTime ? new Date(segment.startTime).getTime() : undefined;
        let effectiveEndDate = segment.endTime ? new Date(segment.endTime).getTime() : undefined;

        if (effectiveBeginDate && !effectiveEndDate) {
            effectiveEndDate = effectiveBeginDate + (14 * 86400000);
        } else if (!effectiveBeginDate && effectiveEndDate) {
            effectiveBeginDate = effectiveEndDate - (14 * 86400000);
        }

        let specificDates: string[] | undefined = undefined;
        if (effectiveBeginDate && effectiveEndDate) {
           specificDates = [];
           let curr = new Date(effectiveBeginDate);
           const end = new Date(effectiveEndDate);
           let days = 0;
           // Cap at 35 days (5 weeks)
           while (curr <= end && days <= 35) {
              const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
              const [month, day, year] = str.split("/");
              specificDates.push(`${year}${month}${day}`);
              curr = new Date(curr.getTime() + 86400000);
              days++;
           }
        }

        const res = await scrapeLeagueSchedules(lg, false, undefined, specificDates);
        console.log('API returned games:', res.data?.length);
        if (res.data) res.data.forEach(m => console.log('Game', m.title, new Date(m.startTime).toLocaleString(), m.startTime, 'vs bounds:', effectiveBeginDate, effectiveEndDate));
        if (!res.data || res.data.length === 0) {
          console.log('No data returned for', lg);
          continue;
        }

        for (const m of res.data) {
          // Verify it fits in the time window (using segment startTime/endTime)
          if (effectiveBeginDate && m.startTime < effectiveBeginDate) continue;
          if (effectiveEndDate && m.startTime > effectiveEndDate) continue;
          
          // FOR LINK4: We force the type to STANDARD (moneyline)
          m.type = 'STANDARD';

          const link4MatchupId = `${segmentId}_${m.gameId}`;
          const docRef = doc(db, 'link4Matchups', link4MatchupId);
          
          batch.set(docRef, {
            segmentId: segmentId,
            ...m,
            updatedAt: Date.now()
          });

          count++;
          batchCount++;
          if (batchCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      fetchMatchups();
      alert(`Synced ${count} matchups successfully for Link4! (Total processed from API: ${batchCount + count})`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to sync matchups: ' + (err.message || String(err)));
    } finally {
      setMatchupsLoading(false);
    }
  };

  const handleDeleteMatchup = async (matchupId: string) => {
    try {
      await deleteDoc(doc(db, 'link4Matchups', matchupId));
      setMatchups(prev => prev.filter(m => m.id !== matchupId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove matchup');
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
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg capitalize">Included Matchups ({matchups.length})</h3>
          <Button onClick={handleSyncMatchups} size="sm" className="gap-2" disabled={matchupsLoading}>
             <RefreshCw className={`w-4 h-4 ${matchupsLoading ? 'animate-spin' : ''}`} />
             {matchupsLoading ? 'Syncing...' : 'Sync Matchups (ESPN)'}
          </Button>
        </div>

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
                {matchups.sort((a,b) => a.startTime - b.startTime).map(m => (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(m.startTime).toLocaleString()}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
