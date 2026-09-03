import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useGridironDraft } from '../../hooks/useGridironDraft';
import { Gridiron3x3Card } from '../../components/gridiron/Gridiron3x3Card';
import { GridironContest, Gridiron3x3Game, GridironEntry, GridironLeaderboardRecord } from '../../types/gridiron';
import { Button } from '../../components/ui/button';
import { Trophy, Users, Plus, Key, Copy, Check, Lock, Shield, Layers, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';

export default function Gridiron3x3Page() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    addToast({ title: type === 'success' ? 'Success' : 'Notice', body: message });
  };

  const [contests, setContests] = useState<GridironContest[]>([]);
  const [selectedContest, setSelectedContest] = useState<GridironContest | null>(null);

  const [season, setSeason] = useState<number>(2026);
  const [weekNumber, setWeekNumber] = useState<number>(1);

  const [games, setGames] = useState<Gridiron3x3Game[]>([]);
  const [entries, setEntries] = useState<GridironEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<GridironLeaderboardRecord[]>([]);

  const [activeTab, setActiveTab] = useState<'draft' | 'group' | 'leaderboard'>('draft');
  const [leagueFilter, setLeagueFilter] = useState<'ALL' | 'NFL' | 'CFB'>('ALL');

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [newContestName, setNewContestName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);

  // User's existing entry for active contest & week
  const userEntry = entries.find(e => e.userId === user?.uid);
  const draftHook = useGridironDraft(userEntry?.picks || []);

  // Fetch user's contests
  const fetchContests = async () => {
    try {
      const res = await fetch('/api/gridiron-3x3/contests', {
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContests(data.contests || []);
        if (data.contests?.length > 0 && !selectedContest) {
          setSelectedContest(data.contests[0]);
          setSeason(data.contests[0].season || 2026);
          setWeekNumber(data.contests[0].weekNumber || 1);
        }
      }
    } catch (e) {
      console.error('Error fetching contests:', e);
    }
  };

  // Fetch static lines snapshot
  const fetchLines = async () => {
    if (!user) return;
    setLoadingLines(true);
    try {
      const res = await fetch(`/api/gridiron-3x3/lines/${season}/${weekNumber}`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGames(data.lines?.games || []);
      }
    } catch (e) {
      console.error('Error fetching lines:', e);
    } finally {
      setLoadingLines(false);
    }
  };

  // Fetch entries for active contest & week
  const fetchEntries = async () => {
    if (!user || !selectedContest) return;
    try {
      const res = await fetch(`/api/gridiron-3x3/entries/${selectedContest.contestId}/${weekNumber}`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (e) {
      console.error('Error fetching entries:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContests();
    }
  }, [user]);

  useEffect(() => {
    if (selectedContest) {
      fetchLines();
      fetchEntries();
    }
  }, [selectedContest, season, weekNumber]);

  // Subscribe to real-time leaderboard subcollection
  useEffect(() => {
    if (!selectedContest) return;
    const q = query(collection(db, 'gridiron_3x3_contests', selectedContest.contestId, 'leaderboard'));
    const unsub = onSnapshot(q, (snap) => {
      const records: GridironLeaderboardRecord[] = [];
      snap.forEach(doc => {
        records.push(doc.data() as GridironLeaderboardRecord);
      });
      records.sort((a, b) => (b.winPercentage - a.winPercentage) || (b.totalWins - a.totalWins));
      setLeaderboard(records);
    }, (err) => console.error("Leaderboard listener error:", err));

    return () => unsub();
  }, [selectedContest]);

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContestName.trim()) return;

    try {
      const res = await fetch('/api/gridiron-3x3/create-contest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ name: newContestName, season, weekNumber })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Private contest created!', 'success');
        setIsCreating(false);
        setNewContestName('');
        await fetchContests();
        setSelectedContest(data.contest);
      } else {
        showToast(data.error || 'Failed to create contest', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleJoinContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) return;

    try {
      const res = await fetch('/api/gridiron-3x3/join-contest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ inviteCode: joinInviteCode })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Joined private contest!', 'success');
        setIsJoining(false);
        setJoinInviteCode('');
        await fetchContests();
        setSelectedContest(data.contest);
      } else {
        showToast(data.error || 'Failed to join contest', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmitEntry = async () => {
    if (!selectedContest || !draftHook.canSubmit) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/gridiron-3x3/submit-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          contestId: selectedContest.contestId,
          season,
          weekNumber,
          picks: draftHook.picks
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Entry submitted successfully!', 'success');
        await fetchEntries();
      } else {
        showToast(data.error || 'Failed to submit entry', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Submission error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteCode = () => {
    if (!selectedContest?.inviteCode) return;
    navigator.clipboard.writeText(selectedContest.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredGames = games.filter(g => {
    if (leagueFilter === 'NFL') return g.league === 'NFL';
    if (leagueFilter === 'CFB') return g.league === 'CFB';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
      {/* Top Header & Contest Selector Bar */}
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-6 h-6 text-[#22c55e]" />
            <h1 className="text-2xl font-bold font-display text-zinc-100">Gridiron 3x3</h1>
          </div>
          <p className="text-xs text-zinc-400">Weekly NFL & CFB Contest Mode • Static Tuesday Lines • 3 NFL / 3 CFB Picks</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Contest Dropdown */}
          {contests.length > 0 && (
            <select
              value={selectedContest?.contestId || ''}
              onChange={(e) => {
                const found = contests.find(c => c.contestId === e.target.value);
                if (found) setSelectedContest(found);
              }}
              className="bg-zinc-900 border border-[#3f3f46] rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
            >
              {contests.map(c => (
                <option key={c.contestId} value={c.contestId}>{c.name}</option>
              ))}
            </select>
          )}

          <Button size="sm" onClick={() => setIsCreating(true)} className="gap-2 font-semibold">
            <Plus className="w-4 h-4" /> Create Group
          </Button>

          <Button size="sm" variant="outline" onClick={() => setIsJoining(true)} className="gap-2 border-[#3f3f46]">
            <Key className="w-4 h-4" /> Join Code
          </Button>
        </div>
      </div>

      {/* Invite Code Sharing Banner */}
      {selectedContest && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-xs font-semibold uppercase text-zinc-400 block">Active Contest Group</span>
              <span className="text-sm font-bold text-zinc-100">{selectedContest.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-[#3f3f46] rounded-lg px-3 py-1.5">
            <span className="text-xs font-mono text-cyan-300 tracking-wider font-bold">{selectedContest.inviteCode}</span>
            <button onClick={copyInviteCode} className="text-zinc-400 hover:text-zinc-100 transition-colors">
              {copiedCode ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-2">
        <button
          onClick={() => setActiveTab('draft')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'draft' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Layers className="w-4 h-4" /> Draft Board
        </button>

        <button
          onClick={() => setActiveTab('group')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'group' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Users className="w-4 h-4" /> Group Entries
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            activeTab === 'leaderboard' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Trophy className="w-4 h-4" /> Standings
        </button>
      </div>

      {/* TAB 1: DRAFT BOARD */}
      {activeTab === 'draft' && (
        <div className="space-y-4">
          {/* League Filter Pills */}
          <div className="flex items-center gap-2">
            {(['ALL', 'NFL', 'CFB'] as const).map(lg => (
              <button
                key={lg}
                onClick={() => setLeagueFilter(lg)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                  leagueFilter === lg
                    ? "bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm"
                    : "bg-zinc-900 border-[#27272a] text-zinc-400 hover:text-zinc-200"
                )}
              >
                {lg}
              </button>
            ))}
          </div>

          {loadingLines ? (
            <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#22c55e]" /> Loading static Tuesday lines...
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="p-12 text-center bg-[#121212] border border-[#27272a] rounded-xl text-zinc-400">
              No games found for this week's draft board. Lines are captured every Tuesday at 12:00 PM EST.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredGames.map(game => (
                <Gridiron3x3Card
                  key={game.gameId}
                  game={game}
                  activePick={draftHook.getPickForGame(game.gameId)}
                  onTogglePick={draftHook.togglePick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GROUP ENTRIES (BLIND REVEAL) */}
      {activeTab === 'group' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#121212] border border-[#27272a] rounded-xl text-zinc-400">
              No participant entries submitted for this week yet.
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.entryId} className="bg-[#121212] border border-[#27272a] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                  <span className="font-bold text-zinc-100 text-sm">{entry.displayName}</span>
                  <span className="text-xs font-mono text-zinc-400">{entry.picks?.length || 0} / 6 Picks</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(entry.picks || []).map((p, i) => (
                    <div key={i} className="bg-zinc-900 border border-[#27272a] rounded-lg p-2 text-xs flex items-center justify-between">
                      <span className="font-bold uppercase text-zinc-400">{p.league}</span>
                      {p.selection === "HIDDEN" ? (
                        <span className="flex items-center gap-1 text-cyan-400 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                          <Lock className="w-3 h-3" /> HIDDEN
                        </span>
                      ) : (
                        <span className="font-bold text-zinc-100 uppercase">
                          {p.selection.replace('_', ' ')} ({p.value > 0 ? `+${p.value}` : p.value})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: STANDINGS & LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#121212] border border-[#27272a] rounded-xl overflow-hidden shadow-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 border-b border-[#27272a] text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Player</th>
                <th className="p-3">Total Record</th>
                <th className="p-3">NFL Record</th>
                <th className="p-3">CFB Record</th>
                <th className="p-3 text-right">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-500">No standings calculated yet.</td>
                </tr>
              ) : (
                leaderboard.map((rec, idx) => (
                  <tr key={rec.userId} className={cn("hover:bg-zinc-800/40 transition-colors", rec.userId === user?.uid && "bg-[#22c55e]/5")}>
                    <td className="p-3 font-mono font-bold text-zinc-400">#{idx + 1}</td>
                    <td className="p-3 font-bold text-zinc-100">{rec.displayName}</td>
                    <td className="p-3 font-mono text-zinc-200">{rec.totalWins}-{rec.totalLosses}{rec.totalPushes > 0 ? `-${rec.totalPushes}` : ''}</td>
                    <td className="p-3 font-mono text-blue-400">{rec.nflWins}-{rec.nflLosses}</td>
                    <td className="p-3 font-mono text-amber-400">{rec.cfbWins}-{rec.cfbLosses}</td>
                    <td className="p-3 text-right font-mono font-bold text-[#22c55e]">{rec.winPercentage}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky Tracker & Submit CTA Gate (Desktop Header / Mobile Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#121212]/95 border-t border-[#27272a] backdrop-blur-xl p-4 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase">NFL Picks:</span>
              <span className={cn("font-mono text-sm font-bold", draftHook.nflCount === 3 ? "text-[#22c55e]" : "text-amber-400")}>
                {draftHook.nflCount} / 3
              </span>
            </div>

            <div className="w-px h-4 bg-zinc-700" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase">CFB Picks:</span>
              <span className={cn("font-mono text-sm font-bold", draftHook.cfbCount === 3 ? "text-[#22c55e]" : "text-amber-400")}>
                {draftHook.cfbCount} / 3
              </span>
            </div>
          </div>

          <Button
            size="lg"
            disabled={!draftHook.canSubmit || isSubmitting}
            onClick={handleSubmitEntry}
            className="font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]"
          >
            {isSubmitting ? 'Saving...' : userEntry ? 'Update Entry' : 'Submit Picks'}
          </Button>
        </div>
      </div>

      {/* Create Contest Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-zinc-100">Create Private Gridiron Group</h3>
            <form onSubmit={handleCreateContest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newContestName}
                  onChange={(e) => setNewContestName(e.target.value)}
                  placeholder="e.g. Sunday Football Legends"
                  className="w-full bg-zinc-900 border border-[#3f3f46] rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button type="submit">Create Group</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Contest Modal */}
      {isJoining && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-zinc-100">Join Private Group</h3>
            <form onSubmit={handleJoinContest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Invite Code</label>
                <input
                  type="text"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3"
                  className="w-full bg-zinc-900 border border-[#3f3f46] rounded-lg px-3 py-2 text-sm text-zinc-100 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsJoining(false)}>Cancel</Button>
                <Button type="submit">Join Group</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
