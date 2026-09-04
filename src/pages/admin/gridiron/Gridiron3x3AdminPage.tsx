import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Gridiron3x3LinesDocument, GridironContest, GridironEntry } from '../../../types/gridiron';
import { Button } from '../../../components/ui/button';
import { RefreshCw, CheckCircle2, Trophy, Users, Layers, AlertCircle, Calendar, Shield, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function Gridiron3x3AdminPage() {
  const [season, setSeason] = useState<number>(2026);
  const [weekNumber, setWeekNumber] = useState<number>(1);

  const [linesDoc, setLinesDoc] = useState<Gridiron3x3LinesDocument | null>(null);
  const [contests, setContests] = useState<GridironContest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [entries, setEntries] = useState<GridironEntry[]>([]);

  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingContests, setLoadingContests] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [activeAdminTab, setActiveAdminTab] = useState<'lines' | 'contests' | 'entries'>('lines');

  // Fetch static snapshot lines for season & week
  const fetchLines = async () => {
    setLoadingLines(true);
    try {
      const docId = `${season}_week_${weekNumber.toString().padStart(2, '0')}`;
      const snap = await getDoc(doc(db, 'gridiron_3x3_lines', docId));
      if (snap.exists()) {
        setLinesDoc(snap.data() as Gridiron3x3LinesDocument);
      } else {
        setLinesDoc(null);
      }
    } catch (err: any) {
      console.error('Error fetching gridiron lines:', err);
    } finally {
      setLoadingLines(false);
    }
  };

  // Fetch all contest groups
  const fetchContests = async () => {
    setLoadingContests(true);
    try {
      const snap = await getDocs(collection(db, 'gridiron_3x3_contests'));
      const list: GridironContest[] = snap.docs.map(d => ({ contestId: d.id, ...d.data() } as GridironContest));
      setContests(list);
      if (list.length > 0 && !selectedContestId) {
        const first = list[0];
        setSelectedContestId(first.contestId);
        if (first.season) setSeason(first.season);
        if (first.weekNumber) setWeekNumber(first.weekNumber);
      }
    } catch (err: any) {
      console.error('Error fetching gridiron contests:', err);
    } finally {
      setLoadingContests(false);
    }
  };

  // Fetch user entries for selected contest
  const fetchEntries = async () => {
    if (!selectedContestId) {
      setEntries([]);
      return;
    }
    setLoadingEntries(true);
    try {
      const q = query(
        collection(db, 'gridiron_3x3_entries'),
        where('contestId', '==', selectedContestId),
        where('weekNumber', '==', weekNumber)
      );
      const snap = await getDocs(q);
      const list: GridironEntry[] = snap.docs.map(d => ({ entryId: d.id, ...d.data() } as GridironEntry));
      setEntries(list);
    } catch (err: any) {
      console.error('Error fetching gridiron entries:', err);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchLines();
  }, [season, weekNumber]);

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [selectedContestId, weekNumber]);

  const handleSyncLines = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/gridiron-3x3/sync-lines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ season, weekNumber })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: `Lines synced! ${data.count} valid games captured for ${season} Week ${weekNumber}.` });
        await fetchLines();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to sync lines.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error syncing lines.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGradeWeek = async (finalizeAndPurge: boolean = false, overrideSeason?: number, overrideWeek?: number) => {
    setIsGrading(true);
    setStatusMessage(null);
    const targetSeason = overrideSeason || season;
    const targetWeek = overrideWeek || weekNumber;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/gridiron-3x3/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ season: targetSeason, weekNumber: targetWeek, finalizeAndPurge })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const msg = finalizeAndPurge
          ? `Week Finalized & Purged! Snapshotted ${data.snapshottedEntries || 0} entries into consolidated snapshot and purged ${data.purgedEntries || 0} individual records for Season ${targetSeason} Week ${targetWeek}.`
          : `Grading completed! Graded ${data.gradedEntries || 0} entries across ${data.updatedContests || 0} contests for Season ${targetSeason} Week ${targetWeek}.`;
        setStatusMessage({ type: 'success', text: msg });
        await fetchEntries();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to grade week.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error grading week.' });
    } finally {
      setIsGrading(false);
    }
  };

  const nflGames = linesDoc?.games?.filter(g => g.league === 'NFL') || [];
  const cfbGames = linesDoc?.games?.filter(g => g.league === 'CFB') || [];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
        <div>
          <h2 className="text-2xl text-zinc-100 font-bold flex items-center gap-2 font-display">
            <Trophy className="w-6 h-6 text-[#22c55e]" />
            Gridiron 3x3 Admin
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Manage static Tuesday snapshot lines, contest groups, participant entries, and grading.</p>
        </div>

        {/* Season & Week Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 text-xs text-zinc-200">
            <span className="text-zinc-400 font-semibold uppercase px-1">Season</span>
            <input
              type="number"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value, 10) || 2026)}
              className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 text-center font-mono focus:outline-none focus:border-[#22c55e]"
            />
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-1.5 text-xs text-zinc-200">
            <span className="text-zinc-400 font-semibold uppercase px-1">Week</span>
            <input
              type="number"
              min="1"
              max="20"
              value={weekNumber}
              onChange={(e) => setWeekNumber(parseInt(e.target.value, 10) || 1)}
              className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 text-center font-mono focus:outline-none focus:border-[#22c55e]"
            />
          </div>

          <Button
            size="sm"
            onClick={handleSyncLines}
            disabled={isSyncing}
            className="gap-2 font-semibold bg-blue-600 hover:bg-blue-500"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Sync Tuesday Lines
          </Button>

          <Button
            size="sm"
            onClick={() => handleGradeWeek(false)}
            disabled={isGrading}
            className="gap-2 font-semibold bg-[#22c55e] hover:bg-[#22c55e]/90 text-zinc-950"
          >
            {isGrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Grade Week
          </Button>

          <Button
            size="sm"
            onClick={() => handleGradeWeek(true)}
            disabled={isGrading}
            className="gap-2 font-semibold bg-amber-600 hover:bg-amber-500 text-zinc-100"
          >
            {isGrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Finalize & Purge Week
          </Button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className={cn(
          "p-4 rounded-xl border flex items-center justify-between text-xs font-semibold",
          statusMessage.type === 'success'
            ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-zinc-100">Dismiss</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveAdminTab('lines')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeAdminTab === 'lines' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Layers className="w-4 h-4" /> Snapshot Lines
        </button>

        <button
          onClick={() => setActiveAdminTab('contests')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeAdminTab === 'contests' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Trophy className="w-4 h-4" /> Contest Groups ({contests.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('entries')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeAdminTab === 'entries' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Users className="w-4 h-4" /> User Entries ({entries.length})
        </button>
      </div>

      {/* TAB 1: SNAPSHOT LINES */}
      {activeAdminTab === 'lines' && (
        <div className="space-y-4">
          {loadingLines ? (
            <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#22c55e]" /> Loading lines snapshot...
            </div>
          ) : !linesDoc ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-zinc-200 font-bold text-base">No Tuesday snapshot lines found for {season} Week {weekNumber}.</h3>
              <p className="text-zinc-400 text-xs max-w-md mx-auto">
                Snapshot lines are captured automatically every Tuesday at 12:00 PM EST or can be manually ingested using the "Sync Tuesday Lines" button above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overview Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4">
                  <span className="text-xs text-zinc-400 font-semibold uppercase">Total Games</span>
                  <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">{linesDoc.games?.length || 0}</div>
                </div>

                <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4">
                  <span className="text-xs text-blue-400 font-semibold uppercase">NFL Slate</span>
                  <div className="text-2xl font-bold text-blue-400 font-mono mt-1">{nflGames.length}</div>
                </div>

                <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4">
                  <span className="text-xs text-amber-400 font-semibold uppercase">CFB Slate</span>
                  <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{cfbGames.length}</div>
                </div>

                <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4">
                  <span className="text-xs text-zinc-400 font-semibold uppercase">Snapshot Time</span>
                  <div className="text-xs font-mono text-zinc-300 mt-2">
                    {linesDoc.snapshotTimestamp ? new Date(linesDoc.snapshotTimestamp).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Games Table */}
              <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-md">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">League</th>
                      <th className="p-3">Matchup</th>
                      <th className="p-3">Spread (Away / Home)</th>
                      <th className="p-3">Total Line</th>
                      <th className="p-3">Kickoff</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {(linesDoc.games || []).map((game) => (
                      <tr key={game.gameId} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase",
                            game.league === "NFL" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}>
                            {game.league}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-zinc-100">
                          {game.awayTeam.name} ({game.awayTeam.abbreviation}) @ {game.homeTeam.name} ({game.homeTeam.abbreviation})
                        </td>
                        <td className="p-3 font-mono text-zinc-200">
                          Away: {game.spread.awaySpread > 0 ? `+${game.spread.awaySpread}` : game.spread.awaySpread} | Home: {game.spread.homeSpread > 0 ? `+${game.spread.homeSpread}` : game.spread.homeSpread}
                        </td>
                        <td className="p-3 font-mono text-zinc-200">
                          {game.total.line}
                        </td>
                        <td className="p-3 font-mono text-zinc-400">
                          {new Date(game.kickoffTime).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-right uppercase font-bold text-zinc-400">
                          {game.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONTEST GROUPS */}
      {activeAdminTab === 'contests' && (
        <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-md">
          {loadingContests ? (
            <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#22c55e]" /> Loading contest groups...
            </div>
          ) : contests.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No contest groups created yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Contest Name</th>
                  <th className="p-3">Invite Code</th>
                  <th className="p-3">Season / Week</th>
                  <th className="p-3">Creator UID</th>
                  <th className="p-3">Participants</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {contests.map((c) => (
                  <tr key={c.contestId} className={cn("hover:bg-zinc-800/40 transition-colors", c.contestId === selectedContestId && "bg-[#22c55e]/5")}>
                    <td className="p-3 font-bold text-zinc-100">{c.name}</td>
                    <td className="p-3 font-mono font-bold text-cyan-400">{c.inviteCode}</td>
                    <td className="p-3 font-mono text-zinc-300">{c.season || 2026} Week {c.weekNumber || 1}</td>
                    <td className="p-3 font-mono text-zinc-400 truncate max-w-[150px]">{c.createdBy}</td>
                    <td className="p-3 font-mono font-bold text-zinc-200">{c.participants?.length || 0} Users</td>
                    <td className="p-3 text-right flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedContestId(c.contestId);
                          if (c.season) setSeason(c.season);
                          if (c.weekNumber) setWeekNumber(c.weekNumber);
                          setActiveAdminTab('entries');
                        }}
                        className="text-xs border-zinc-700 hover:bg-zinc-800"
                      >
                        Select & View Entries
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedContestId(c.contestId);
                          if (c.season) setSeason(c.season);
                          if (c.weekNumber) setWeekNumber(c.weekNumber);
                          handleGradeWeek(false, c.season || season, c.weekNumber || weekNumber);
                        }}
                        disabled={isGrading}
                        className="text-xs bg-[#22c55e] hover:bg-[#22c55e]/90 text-zinc-950 font-semibold gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Grade Contest
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: USER ENTRIES */}
      {activeAdminTab === 'entries' && (
        <div className="space-y-4">
          {/* Contest Dropdown Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#121212] border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase">Selected Group:</span>
              <select
                value={selectedContestId || ''}
                onChange={(e) => {
                  const targetId = e.target.value;
                  setSelectedContestId(targetId);
                  const found = contests.find(c => c.contestId === targetId);
                  if (found) {
                    if (found.season) setSeason(found.season);
                    if (found.weekNumber) setWeekNumber(found.weekNumber);
                  }
                }}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
              >
                {contests.map(c => (
                  <option key={c.contestId} value={c.contestId}>{c.name} ({c.inviteCode}) - S{c.season || 2026} W{c.weekNumber || 1}</option>
                ))}
              </select>
            </div>

            {selectedContestId && (
              <Button
                size="sm"
                onClick={() => handleGradeWeek(false)}
                disabled={isGrading}
                className="gap-2 font-semibold bg-[#22c55e] hover:bg-[#22c55e]/90 text-zinc-950"
              >
                {isGrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Grade Selected Contest ({season} Week {weekNumber})
              </Button>
            )}
          </div>

          <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-md">
            {loadingEntries ? (
              <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#22c55e]" /> Loading participant entries...
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No submitted entries for this contest and week.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Player</th>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Picks Count</th>
                    <th className="p-3">Submitted Picks</th>
                    <th className="p-3 text-right">Updated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {entries.map((entry) => (
                    <tr key={entry.entryId} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3 font-bold text-zinc-100">{entry.displayName}</td>
                      <td className="p-3 font-mono text-zinc-400 truncate max-w-[120px]">{entry.userId}</td>
                      <td className="p-3 font-mono font-bold text-zinc-200">{entry.picks?.length || 0} / 6</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(entry.picks || []).map((p, idx) => (
                            <span key={idx} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                              <span className="font-bold text-zinc-400 mr-1">{p.league}</span>
                              <span className="uppercase">{p.selection.replace('_', ' ')}</span> ({p.value > 0 ? `+${p.value}` : p.value})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-zinc-400">
                        {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
