import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useGridironDraft } from '../../hooks/useGridironDraft';
import { Gridiron3x3Card } from '../../components/gridiron/Gridiron3x3Card';
import { GridironContest, Gridiron3x3Game, GridironEntry, GridironLeaderboardRecord } from '../../types/gridiron';
import { Button } from '../../components/ui/button';
import { Trophy, Users, Plus, Key, Copy, Check, Lock, Shield, Layers, RefreshCw, CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight, HelpCircle, ArrowLeft, Calendar, Flame } from 'lucide-react';
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

  const [viewMode, setLandingViewMode] = useState<'landing' | 'workspace'>('landing');
  const [landingTab, setLandingTab] = useState<'my_groups' | 'join_create'>('my_groups');
  const [activeTab, setActiveTab] = useState<'draft' | 'group' | 'leaderboard'>('draft');
  const [leagueFilter, setLeagueFilter] = useState<'ALL' | 'NFL' | 'CFB'>('ALL');

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [newContestName, setNewContestName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);

  // Compute dynamic required pick counts based on available CFB games on the snapshot board
  const availableCfbCount = games.filter(g => g.league === "CFB").length;
  const requiredCfb = Math.min(3, availableCfbCount);
  const requiredNfl = 6 - requiredCfb;

  // User's existing entry for active contest & week
  const userEntry = entries.find(e => e.userId === user?.uid);
  const draftHook = useGridironDraft(userEntry?.picks || [], requiredNfl, requiredCfb);

  // Fetch user's contests
  const fetchContests = async () => {
    try {
      const res = await fetch('/api/gridiron-3x3/contests', {
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        const fetchedContests = data.contests || [];
        setContests(fetchedContests);
        if (fetchedContests.length === 0) {
          setLandingTab('join_create');
        } else if (!selectedContest) {
          setSelectedContest(fetchedContests[0]);
          setSeason(fetchedContests[0].season || 2026);
          setWeekNumber(fetchedContests[0].weekNumber || 1);
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
    const contestId = selectedContest?.contestId;
    if (!contestId) return;
    const q = query(collection(db, 'gridiron_3x3_contests', contestId, 'leaderboard'));
    const unsub = onSnapshot(q, (snap) => {
      const records: GridironLeaderboardRecord[] = [];
      snap.forEach(doc => {
        records.push(doc.data() as GridironLeaderboardRecord);
      });
      records.sort((a, b) => (b.winPercentage - a.winPercentage) || (b.totalWins - a.totalWins));
      setLeaderboard(records);
    }, (err) => console.error("Leaderboard listener error:", err));

    return () => unsub();
  }, [selectedContest?.contestId]);

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
        setLandingViewMode('workspace');
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
        setLandingViewMode('workspace');
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

  if (viewMode === 'landing') {
    const myContests = contests;

    return (
      <div className="max-w-7xl mx-auto px-4 py-6 pb-12 space-y-8">
        {/* Banner Hero */}
        <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#22c55e]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4" /> Weekly Football Contest
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-display text-zinc-100 tracking-tight">Gridiron 3x3</h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
              Select 6 picks every week against static Tuesday lines—3 NFL and 3 CFB spreads or totals. Competitor selections remain blind until kickoff lock time!
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={() => setIsCreating(true)} className="gap-2 font-bold shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <Plus className="w-4 h-4" /> Create Private Group
              </Button>
              <Button variant="outline" onClick={() => setIsJoining(true)} className="gap-2 border-[#3f3f46]">
                <Key className="w-4 h-4" /> Join with Code
              </Button>
            </div>
          </div>
        </div>

        {/* How to Play Guide Card */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2 font-display">
            <HelpCircle className="w-5 h-5 text-cyan-400" /> How Gridiron 3x3 Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-zinc-900 border border-[#27272a] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                <Calendar className="w-4 h-4 text-[#22c55e]" /> 1. Tuesday Static Lines
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Spreads and totals lock every Tuesday at 12:00 PM EST. The slate remains fixed for the entire week regardless of market movement.
              </p>
            </div>

            <div className="bg-zinc-900 border border-[#27272a] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                <Layers className="w-4 h-4 text-amber-400" /> 2. Balanced 6-Pick Board
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Choose exactly 6 picks—3 NFL spreads/totals and 3 CFB spreads/totals. Each game allows max 1 selection.
              </p>
            </div>

            <div className="bg-zinc-900 border border-[#27272a] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                <Lock className="w-4 h-4 text-cyan-400" /> 3. Blind Reveal & Live Grading
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Competitors' picks stay hidden until each game's kickoff time. Games automatically grade as final scores come in!
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (My Groups vs Join & Create) */}
        <div className="flex items-center gap-2 border-b border-[#27272a] pb-2">
          <button
            onClick={() => setLandingTab('my_groups')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              landingTab === 'my_groups' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Users className="w-4 h-4" /> My Groups ({myContests.length})
          </button>

          <button
            onClick={() => setLandingTab('join_create')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
              landingTab === 'join_create' ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Plus className="w-4 h-4" /> Join or Create Group
          </button>
        </div>

        {/* TAB 1: MY GROUPS */}
        {landingTab === 'my_groups' && (
          <div className="space-y-4">
            {myContests.length === 0 ? (
              <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-12 text-center space-y-3">
                <Trophy className="w-12 h-12 text-zinc-600 mx-auto" />
                <h3 className="text-zinc-200 font-bold text-lg">No Gridiron Groups Joined Yet</h3>
                <p className="text-zinc-400 text-xs max-w-md mx-auto">
                  Create your own private football group to compete with friends, or join an existing group with an invite code.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Button onClick={() => setIsCreating(true)} size="sm" className="font-bold">
                    Create Group
                  </Button>
                  <Button onClick={() => setIsJoining(true)} variant="outline" size="sm" className="border-[#3f3f46]">
                    Join Code
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myContests.map(c => (
                  <div key={c.contestId} className="bg-[#121212] border border-[#27272a] hover:border-zinc-700 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                          {c.inviteCode}
                        </span>
                        <span className="text-xs font-semibold text-zinc-400">
                          Season {c.season} • Wk {c.weekNumber}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100">{c.name}</h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-zinc-500" /> {c.participants?.length || 0} Members
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedContest(c);
                        setSeason(c.season || 2026);
                        setWeekNumber(c.weekNumber || 1);
                        setLandingViewMode('workspace');
                      }}
                      className="w-full font-bold gap-2"
                    >
                      Open Group Board <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: JOIN OR CREATE GROUP */}
        {landingTab === 'join_create' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Join Form Card */}
            <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-lg">
                <Key className="w-5 h-5 text-cyan-400" /> Join Private Group
              </div>
              <p className="text-xs text-zinc-400">Enter a 6-character group invite code to join a friend's private league.</p>
              <form onSubmit={handleJoinContest} className="space-y-4">
                <input
                  type="text"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3"
                  className="w-full bg-zinc-900 border border-[#3f3f46] rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider text-zinc-100 uppercase focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  required
                />
                <Button type="submit" className="w-full font-bold">Join Group</Button>
              </form>
            </div>

            {/* Create Form Card */}
            <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-lg">
                <Plus className="w-5 h-5 text-[#22c55e]" /> Create Private Group
              </div>
              <p className="text-xs text-zinc-400">Create your own group, invite friends, and run a weekly Gridiron 3x3 contest.</p>
              <form onSubmit={handleCreateContest} className="space-y-4">
                <input
                  type="text"
                  value={newContestName}
                  onChange={(e) => setNewContestName(e.target.value)}
                  placeholder="e.g. Sunday Football Legends"
                  className="w-full bg-zinc-900 border border-[#3f3f46] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                  required
                />
                <Button type="submit" className="w-full font-bold">Create Group</Button>
              </form>
            </div>
          </div>
        )}

        {/* Modals */}
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
      {/* Top Header & Contest Selector Bar */}
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setLandingViewMode('landing')}
            className="text-xs text-zinc-400 hover:text-zinc-100 flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Gridiron Groups
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-6 h-6 text-[#22c55e]" />
            <h1 className="text-2xl font-bold font-display text-zinc-100">Gridiron 3x3</h1>
          </div>
          <p className="text-xs text-zinc-400">Weekly NFL & CFB Contest Mode • Static Tuesday Lines • 3 NFL / 3 CFB Picks</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Selector */}
          <div className="flex items-center bg-zinc-900 border border-[#3f3f46] rounded-xl px-2 py-1 gap-1">
            <button
              onClick={() => setWeekNumber(prev => Math.max(1, prev - 1))}
              disabled={weekNumber <= 1}
              className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-zinc-200 px-2 uppercase">
              Week {weekNumber}
            </span>
            <button
              onClick={() => setWeekNumber(prev => Math.min(20, prev + 1))}
              disabled={weekNumber >= 20}
              className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

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
          <Layers className="w-4 h-4" /> Picks Board
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

      {/* TAB 1: PICKS BOARD */}
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
              No games found for this week's picks board. Lines are captured every Tuesday at 12:00 PM EST.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  {(entry.picks || []).map((p, i) => {
                    const isHidden = p.selection === "HIDDEN";
                    const game = games.find(g => g.gameId === p.gameId);
                    const matchupText = game ? `${game.awayTeam.name} @ ${game.homeTeam.name}` : 'Matchup';

                    let pickText = '';
                    if (!isHidden) {
                      if (p.selection === 'away_spread') {
                        const teamName = game?.awayTeam.name || 'Away';
                        const spreadFormatted = p.value > 0 ? `+${p.value}` : `${p.value}`;
                        pickText = `${teamName} ${spreadFormatted}`;
                      } else if (p.selection === 'home_spread') {
                        const teamName = game?.homeTeam.name || 'Home';
                        const spreadFormatted = p.value > 0 ? `+${p.value}` : `${p.value}`;
                        pickText = `${teamName} ${spreadFormatted}`;
                      } else if (p.selection === 'over') {
                        pickText = `OVER ${p.value}`;
                      } else if (p.selection === 'under') {
                        pickText = `UNDER ${p.value}`;
                      } else {
                        pickText = `${p.selection} (${p.value})`;
                      }
                    }

                    // Color coding logic based on pick grading status (won = green, lost = red, push = grey)
                    let statusBgClass = "bg-zinc-900 border-[#27272a]";
                    let badgeNode = null;

                    if (p.status === 'won') {
                      statusBgClass = "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]";
                      badgeNode = (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#22c55e]">
                          <CheckCircle2 className="w-3 h-3" /> W
                        </span>
                      );
                    } else if (p.status === 'lost') {
                      statusBgClass = "bg-red-500/10 border-red-500/30 text-red-400";
                      badgeNode = (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400">
                          <XCircle className="w-3 h-3" /> L
                        </span>
                      );
                    } else if (p.status === 'push') {
                      statusBgClass = "bg-zinc-800/80 border-zinc-700 text-zinc-300";
                      badgeNode = (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-700/50 border border-zinc-600 text-zinc-300">
                          <MinusCircle className="w-3 h-3" /> DRAW
                        </span>
                      );
                    }

                    return (
                      <div key={i} className={cn("border rounded-lg p-2.5 text-xs flex flex-wrap items-center justify-between gap-2 transition-colors", statusBgClass)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0",
                            p.league === "NFL" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}>
                            {p.league}
                          </span>
                          {!isHidden && (
                            <span className="text-zinc-300 font-medium truncate">
                              {matchupText}
                            </span>
                          )}
                        </div>

                        {isHidden ? (
                          <span className="flex items-center gap-1 text-cyan-400 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                            <Lock className="w-3 h-3" /> HIDDEN
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="font-bold text-zinc-100 uppercase">
                              {pickText}
                            </span>
                            {badgeNode}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
              <span className={cn("font-mono text-sm font-bold", draftHook.nflCount === requiredNfl ? "text-[#22c55e]" : "text-amber-400")}>
                {draftHook.nflCount} / {requiredNfl}
              </span>
            </div>

            <div className="w-px h-4 bg-zinc-700" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase">CFB Picks:</span>
              <span className={cn("font-mono text-sm font-bold", draftHook.cfbCount === requiredCfb ? "text-[#22c55e]" : "text-amber-400")}>
                {draftHook.cfbCount} / {requiredCfb}
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
