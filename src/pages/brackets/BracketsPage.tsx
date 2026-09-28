import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Loader2, Layers, CheckCircle2, Lock, ArrowLeft, DollarSign, Calendar, Sparkles, AlertCircle, Save } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { useToast } from '../../components/ui/Toast';
import { BracketMatchupCard } from '../../components/ui/BracketMatchupCard';
import { FirebaseImage } from '../../components/ui/FirebaseImage';
import { getRoundNamesForBracket, formatPointValuesInOrder } from '../../utils/bracketUtils';

const getTeamAbbreviation = (team: string) => {
  if (!team) return "";
  const specialCases: Record<string, string> = {
    "United States": "USA",
    "United Kingdom": "UK",
    "South Korea": "KOR",
    "North Korea": "PRK",
    "Saudi Arabia": "KSA",
    "Costa Rica": "CRC",
    "New Zealand": "NZL",
    "South Africa": "RSA",
  };
  return specialCases[team] || team.substring(0, 3).toUpperCase();
};

export function BracketsPage() {
  const { bracketId } = useParams<{ bracketId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [publicBrackets, setPublicBrackets] = useState<any[]>([]);
  const [loadingBracketsList, setLoadingBracketsList] = useState(true);

  const [bracket, setBracket] = useState<any>(null);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [activeTab, setActiveTab] = useState<'bracket' | 'leaderboard'>('bracket');

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [userPrediction, setUserPrediction] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [submittingPicks, setSubmittingPicks] = useState(false);

  const [userPredictionsMap, setUserPredictionsMap] = useState<Record<string, any>>({});

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Fetch all public brackets & user predictions for listing
  useEffect(() => {
    async function fetchPublicBrackets() {
      if (!db) return;
      setLoadingBracketsList(true);
      try {
        const bracketsRef = collection(db, 'brackets');
        const q = query(bracketsRef, where('isPublic', '==', true));
        const snap = await getDocs(q);

        let fetchedBrackets: any[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.isArchived && !data.archived) {
            fetchedBrackets.push({ id: docSnap.id, ...data });
          }
        });

        setPublicBrackets(fetchedBrackets);

        // Fetch user's predictions across all brackets
        if (user) {
          const predQ = query(collection(db, 'bracketGamePredictions'), where('userId', '==', user.uid));
          const predSnap = await getDocs(predQ);
          const map: Record<string, any> = {};
          predSnap.forEach(pDoc => {
            const data = pDoc.data();
            map[data.bracketId] = data;
          });
          setUserPredictionsMap(map);
        }
      } catch (err) {
        console.error("Error fetching public brackets list:", err);
        setPublicBrackets([]);
      } finally {
        setLoadingBracketsList(false);
      }
    }

    fetchPublicBrackets();
  }, [user]);

  // Fetch active bracket details when bracketId changes
  useEffect(() => {
    if (!bracketId) {
      setBracket(null);
      return;
    }

    async function fetchBracketDetail() {
      if (!db) return;
      setLoadingBracket(true);

      try {
        const docRef = doc(db, 'brackets', bracketId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const activeB = {
            id: docSnap.id,
            ...data
          };
          setBracket(activeB);
        } else {
          setBracket(null);
        }

        // Fetch user prediction doc
        if (user) {
          const predRef = doc(db, 'bracketGamePredictions', `${bracketId}_${user.uid}`);
          const predSnap = await getDoc(predRef);
          if (predSnap.exists()) {
            const predData = predSnap.data();
            setUserPrediction(predData);
            setSelections(predData.selections || {});
          } else {
            setUserPrediction(null);
            setSelections({});
          }
        } else {
          setUserPrediction(null);
          setSelections({});
        }
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error("Error fetching bracket detail:", err);
        setBracket(null);
      } finally {
        setLoadingBracket(false);
      }
    }

    fetchBracketDetail();
  }, [bracketId, user]);

  // Handle Leaderboard tab fetching
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!db || !bracket || activeTab !== 'leaderboard') return;
      setLeaderboardLoading(true);
      try {
        const pQuery = query(
          collection(db, 'bracketGamePredictions'),
          where('bracketId', '==', bracket.id)
        );
        const pSnap = await getDocs(pQuery);

        const participantStats: Record<string, { points: number, potentialPoints: number, uid: string, finalFour?: string[], champion?: string }> = {};

        const isMlb = bracket.sport === 'MLB' || bracket.id?.includes('mlb');
        const baseTeams = bracket.teams?.length || 16;
        const roundNames = isMlb
          ? ["Wild Card Series", "Division Series", "League Championship Series", "World Series"]
          : baseTeams === 16
          ? ["Round of 16", "Quarter Finals", "Semi Finals", "Finals"]
          : ["Round of 32", "Round of 16", "Quarter Finals", "Semi Finals", "Finals"];

        const pointsMap: Record<string, number> = {};
        roundNames.forEach((rName, idx) => {
          pointsMap[String(idx)] = bracket.pointValues?.[rName] || (Math.pow(2, idx) * 10);
        });

        const results = bracket.results || {};
        const explicitlyEliminated = bracket.eliminatedTeams || [];

        pSnap.docs.forEach(d => {
          const data = d.data();
          let pts = 0;
          let pot = 0;
          const sels = data.selections || {};
          for (const [mId, pickedTeam] of Object.entries(sels)) {
             const round = mId.split('-')[0].replace('r', '');
             const rPts = pointsMap[round] || 0;
             if (results[mId] === pickedTeam) {
                pts += rPts;
                pot += rPts;
             } else if (results[mId] && results[mId] !== pickedTeam) {
                // Wrong pick
             } else if (!results[mId] && !explicitlyEliminated.includes(pickedTeam as string)) {
                // Still alive
                pot += rPts;
             }
          }
          const uid = data.userId || d.id.split('_')[1];
          const finalFour = [
            sels['r1-m0'],
            sels['r1-m1'],
            sels['r1-m2'],
            sels['r1-m3']
          ].filter(Boolean) as string[];
          const champion = sels[`r${roundNames.length - 1}-m0` as keyof typeof sels] as string;

          if (uid) {
            participantStats[uid] = { points: pts, potentialPoints: pot, uid, finalFour, champion };
          }
        });

        const participantIds = Object.keys(participantStats);

        if (participantIds.length > 0) {
          const token = await user?.getIdToken();
          let usersMap: Record<string, any> = {};

          const chunkedUids = [];
          for (let i = 0; i < participantIds.length; i += 50) {
            chunkedUids.push(participantIds.slice(i, i + 50));
          }

          await Promise.all(chunkedUids.map(async (chunk) => {
            const res = await fetch(`/api/users/public?uids=${chunk.join(',')}`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
              const data = await res.json();
              const usersList = data.users || [];
              usersList.forEach((u: any) => { usersMap[u.id] = u; });
            }
          }));

          const formattedLeaderboard = participantIds.map(uid => ({
             uid,
             name: usersMap[uid]?.username || usersMap[uid]?.displayName || 'Unknown User',
             avatar: usersMap[uid]?.image || usersMap[uid]?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
             ...participantStats[uid]
          })).sort((a, b) => b.points !== a.points ? b.points - a.points : b.potentialPoints - a.potentialPoints);

          setLeaderboardData(formattedLeaderboard);
        } else {
          setLeaderboardData([]);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
  }, [bracket, activeTab, user]);

  // Round names & total rounds computation
  const roundNames = useMemo(() => {
    return getRoundNamesForBracket(bracket);
  }, [bracket]);

  const totalRounds = roundNames.length;

  // Compute matchup team slots for each match across all rounds
  const roundsData = useMemo(() => {
    if (!bracket || !bracket.teams || totalRounds === 0) return [];

    const baseTeams = bracket.teams;
    const results = bracket.results || {};
    const eliminated = bracket.eliminatedTeams || [];

    const rounds = [];

    // Helper to get winner of a match, with automatic BYE advancement
    const getWinnerOfMatch = (rIdx: number, mIdx: number): string | null => {
      const mId = `r${rIdx}-m${mIdx}`;
      if (results[mId]) return results[mId];
      if (selections[mId]) return selections[mId];

      if (rIdx === 0) {
        const t1 = baseTeams[mIdx * 2] || null;
        const t2 = baseTeams[mIdx * 2 + 1] || null;
        if (t1 === "BYE" && t2 && t2 !== "BYE") return t2;
        if (t2 === "BYE" && t1 && t1 !== "BYE") return t1;
      }
      return null;
    };

    for (let r = 0; r < totalRounds; r++) {
      const matchesInRound = Math.pow(2, totalRounds - 1 - r);
      const roundMatches = [];

      for (let m = 0; m < matchesInRound; m++) {
        const matchId = `r${r}-m${m}`;
        let team1: string | null = null;
        let team2: string | null = null;

        if (r === 0) {
          team1 = baseTeams[m * 2] || null;
          team2 = baseTeams[m * 2 + 1] || null;
        } else {
          team1 = getWinnerOfMatch(r - 1, m * 2);
          team2 = getWinnerOfMatch(r - 1, m * 2 + 1);
        }

        const matchResult = results[matchId] || null;
        const selectedTeam = selections[matchId] || null;

        // Check locking
        let locked = false;
        if (bracket.status === 'COMPLETED' || bracket.payoutComplete) {
          locked = true;
        } else if (bracket.lockDate && Date.now() >= new Date(bracket.lockDate).getTime()) {
          locked = true;
        } else if (bracket.matchTimes?.[matchId] && Date.now() >= new Date(bracket.matchTimes[matchId]).getTime()) {
          locked = true;
        }

        const formattedTime = bracket.matchTimes?.[matchId]
          ? new Date(bracket.matchTimes[matchId]).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : null;

        roundMatches.push({
          matchId,
          round: r,
          matchIndex: m,
          team1Slot: { display: team1, isEliminated: team1 ? eliminated.includes(team1) : false },
          team2Slot: { display: team2, isEliminated: team2 ? eliminated.includes(team2) : false },
          matchResult,
          selectedTeam,
          formattedTime,
          locked
        });
      }

      rounds.push({
        roundIndex: r,
        roundName: roundNames[r] || `Round ${r + 1}`,
        pointValue: bracket.pointValues?.[roundNames[r]] || (Math.pow(2, r) * 10),
        matches: roundMatches
      });
    }

    return rounds;
  }, [bracket, totalRounds, roundNames, selections]);

  // Handle selecting a team in an unlocked matchup
  const handleSelectTeam = (matchId: string, teamName: string, locked: boolean) => {
    if (locked || !teamName || teamName === "BYE") return;

    setSelections(prev => {
      const updated = { ...prev, [matchId]: teamName };

      // Helper to clear invalid downstream choices if team selection was changed
      const currentRoundIdx = parseInt(matchId.split('-')[0].replace('r', ''), 10);
      const currentMatchIdx = parseInt(matchId.split('-')[1].replace('m', ''), 10);

      const clearDownstream = (r: number, m: number) => {
        if (r >= totalRounds - 1) return;
        const nextRound = r + 1;
        const nextMatch = Math.floor(m / 2);
        const nextMatchId = `r${nextRound}-m${nextMatch}`;

        const nextSelected = updated[nextMatchId];
        if (nextSelected && nextSelected === prev[matchId] && nextSelected !== teamName) {
          delete updated[nextMatchId];
          clearDownstream(nextRound, nextMatch);
        }
      };

      clearDownstream(currentRoundIdx, currentMatchIdx);
      return updated;
    });

    setHasUnsavedChanges(true);
  };

  // Submit/Save predictions
  const handleSubmitPicks = async () => {
    if (!user) {
      addToast({ title: 'Authentication Required', body: 'Please sign in to submit your bracket picks.' });
      navigate('/login');
      return;
    }
    if (!bracket) return;

    setSubmittingPicks(true);
    try {
      const token = await user.getIdToken();

      // Check if user has already paid/registered for this bracket
      const isPaid = userPrediction?.paid;
      const cost = bracket.cost || 0;

      if (!isPaid && cost > 0) {
        // Invoke /api/brackets/enter
        const enterRes = await fetch('/api/brackets/enter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ bracketId: bracket.id })
        });
        const enterData = await enterRes.json();
        if (!enterRes.ok || !enterData.success) {
          throw new Error(enterData.error || 'Failed to register for bracket.');
        }
      }

      // Save predictions in Firestore
      const predRef = doc(db, 'bracketGamePredictions', `${bracket.id}_${user.uid}`);
      const updatedPredDoc = {
        userId: user.uid,
        bracketId: bracket.id,
        selections,
        paid: true,
        updatedAt: new Date().toISOString()
      };

      await setDoc(predRef, updatedPredDoc, { merge: true });

      setUserPrediction(updatedPredDoc);
      setUserPredictionsMap(prev => ({ ...prev, [bracket.id]: updatedPredDoc }));
      setHasUnsavedChanges(false);

      addToast({ title: 'Picks Saved!', body: 'Bracket picks submitted successfully!' });
    } catch (err: any) {
      console.error("Error submitting picks:", err);
      addToast({ title: 'Submission Error', body: err.message || 'Failed to save bracket picks.' });
    } finally {
      setSubmittingPicks(false);
    }
  };

  const theme = bracket?.theme || {};
  const primaryColor = theme.primaryColor || "#22c55e";
  const title = theme.title || bracket?.name || "Brackets";
  const subtitle = theme.subtitle || "Predict the tournament champions and climb the leaderboard.";

  // Render Public Brackets Hub / Listing view if no bracketId is selected
  if (!bracketId) {
    return (
      <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#22c55e]" />
            Tournament Brackets
          </h1>
          <p className="text-zinc-400 text-lg">Select an active bracket below to make your picks and compete for prizes.</p>
        </div>

        {loadingBracketsList ? (
          <div className="flex items-center justify-center p-16 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#22c55e] mr-3" />
            Loading public brackets...
          </div>
        ) : publicBrackets.length === 0 ? (
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            No public brackets available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicBrackets.map((b) => {
              const userPred = userPredictionsMap[b.id];
              const isEntered = userPred && userPred.paid;
              const isLocked = b.lockDate && Date.now() >= new Date(b.lockDate).getTime();

              const totalEntriesPot = b.totalPot || 0;
              const prizePotPercent = b.prizePotPercent ?? 0.65;
              const totalPrizePot = Math.floor(totalEntriesPot * prizePotPercent);

              return (
                <div
                  key={b.id}
                  className="bg-[#121212] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 flex flex-col justify-between transition-all group hover:shadow-xl hover:shadow-black/50 relative overflow-hidden"
                >
                  <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#22c55e]/5 rounded-full blur-2xl group-hover:bg-[#22c55e]/15 transition-colors pointer-events-none" />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-1 rounded-full mb-2 inline-block">
                          {b.sport || 'Tournament'}
                        </span>
                        <h3 className="text-xl font-bold text-white group-hover:text-[#22c55e] transition-colors leading-snug">
                          {b.name}
                        </h3>
                      </div>
                      {isEntered ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Entered
                        </span>
                      ) : isLocked ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                          Locked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                          Open
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5 my-5 text-sm">
                      <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                        <span className="flex items-center gap-2 text-zinc-400 font-medium">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          Entry Cost
                        </span>
                        <span className="text-white font-bold font-mono">
                          {b.cost ? `${b.cost} Links` : 'Free'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                        <span className="flex items-center gap-2 text-zinc-400 font-medium">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          Prize Pot
                        </span>
                        <span className="text-white font-bold font-mono">
                          {totalPrizePot.toLocaleString()} Links
                        </span>
                      </div>

                      {b.pointValues && (
                        <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                          <span className="flex items-center gap-2 text-zinc-400 font-medium">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            Points / Round
                          </span>
                          <span className="text-zinc-300 font-medium text-xs font-mono">
                            {formatPointValuesInOrder(b)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/brackets/${b.id}`)}
                    className="w-full mt-4 bg-zinc-800 hover:bg-[#22c55e] text-zinc-200 hover:text-black font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                  >
                    {isEntered ? 'View / Edit Picks' : 'View Bracket & Enter'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Bracket Detail View
  return (
    <div className="flex-1 p-6 md:p-8 w-full pt-20 md:pt-8 overflow-hidden">
      <div className="mb-6 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/brackets')}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-3 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Brackets
          </button>
          <h1 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight flex items-center gap-3">
            {theme.logoUrl ? (
              <FirebaseImage src={theme.logoUrl} alt={title} className="w-10 h-10 object-contain" loading="lazy" />
            ) : (
              <Trophy className="w-8 h-8" style={{ color: primaryColor }} />
            )}
            {title}
          </h1>
          {subtitle && <p className="text-zinc-400 text-sm md:text-base mt-1">{subtitle}</p>}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {activeTab === 'bracket' && (
            <button
              onClick={handleSubmitPicks}
              disabled={submittingPicks || (!hasUnsavedChanges && userPrediction?.paid)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
                hasUnsavedChanges || !userPrediction?.paid
                  ? 'bg-[#22c55e] hover:bg-[#1ea34d] text-black shadow-[#22c55e]/20 cursor-pointer animate-pulse'
                  : 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {submittingPicks ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Picks...
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Picks
                </>
              ) : userPrediction?.paid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Picks Submitted
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Submit Bracket Picks
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {loadingBracket ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
        </div>
      ) : bracket ? (
        <div className="w-full max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] border border-zinc-800 p-4 rounded-xl">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-800 px-3 py-1 rounded-full">
                Sport: {bracket.sport}
              </span>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-800 px-3 py-1 rounded-full">
                Entry Fee: {bracket.cost ? `${bracket.cost} Links` : 'Free'}
              </span>
              {bracket.pointValues && (
                <span className="text-xs text-zinc-400 hidden lg:inline-block">
                  Points per round: {formatPointValuesInOrder(bracket)}
                </span>
              )}
            </div>

            <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-zinc-800 shrink-0">
              <button
                onClick={() => setActiveTab('bracket')}
                className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'bracket'
                    ? 'text-black shadow-lg'
                    : 'text-zinc-400 hover:text-white'
                }`}
                style={activeTab === 'bracket' ? { backgroundColor: primaryColor } : undefined}
              >
                <Layers className="w-4 h-4" />
                Bracket
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'leaderboard'
                    ? 'text-black shadow-lg'
                    : 'text-zinc-400 hover:text-white'
                }`}
                style={activeTab === 'leaderboard' ? { backgroundColor: primaryColor } : undefined}
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </button>
            </div>
          </div>

          {activeTab === 'bracket' && (
            <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:p-8 overflow-x-auto custom-scrollbar">
              {hasUnsavedChanges && (
                <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-bold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    You have unsaved pick selections. Make sure to click "Save Picks" above before leaving.
                  </span>
                  <button
                    onClick={handleSubmitPicks}
                    disabled={submittingPicks}
                    className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1 rounded-lg text-xs font-black transition-colors shrink-0"
                  >
                    Save Now
                  </button>
                </div>
              )}

              <div className="flex gap-6 min-w-[800px] justify-between">
                {roundsData.map((round) => (
                  <div key={round.roundIndex} className="flex-1 flex flex-col items-center min-w-[180px]">
                    <div className="text-center mb-6 w-full">
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-1">
                        {round.roundName}
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-800">
                        {round.pointValue} pts
                      </span>
                    </div>

                    <div className="flex flex-col justify-around h-full w-full gap-4 my-auto">
                      {round.matches.map((match) => (
                        <BracketMatchupCard
                          key={match.matchId}
                          matchId={match.matchId}
                          round={match.round}
                          team1Slot={match.team1Slot}
                          team2Slot={match.team2Slot}
                          matchResult={match.matchResult}
                          selectedTeam={match.selectedTeam}
                          formattedTime={match.formattedTime}
                          locked={match.locked}
                          primaryColor={primaryColor}
                          onSelect={handleSelectTeam}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (() => {
            const totalEntriesPot = bracket.totalPot ?? (leaderboardData.length * (bracket.cost ?? 10));
            const prizePotPercent = bracket.prizePotPercent ?? 0.65;
            const totalPrizePot = Number.isNaN(totalEntriesPot) ? 0 : Math.floor(totalEntriesPot * prizePotPercent);

            const payoutSplit = bracket.payoutSplit || { first: 70, second: 20, third: 10 };
            const firstPayout = Math.floor(totalPrizePot * ((payoutSplit.first ?? 70) / 100));
            const secondPayout = Math.floor(totalPrizePot * ((payoutSplit.second ?? 20) / 100));
            const thirdPayout = Math.floor(totalPrizePot * ((payoutSplit.third ?? 10) / 100));

            const isBracketLocked = bracket.lockDate && Date.now() >= new Date(bracket.lockDate).getTime();

            return (
              <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden max-w-7xl mx-auto">
                {bracket?.cost !== undefined && (
                  <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6">
                    <div>
                      <div className="text-zinc-400 font-medium uppercase text-xs tracking-wider mb-1">Total Prize Pot ({Math.round(prizePotPercent * 100)}% Payout)</div>
                      <div className="text-2xl font-black text-white flex items-center gap-2 font-mono">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        {totalPrizePot.toLocaleString()} <span className="text-sm font-medium text-zinc-500">Links</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 text-xs bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="text-zinc-400 font-semibold">1st:</span>
                        <span className="text-white font-bold font-mono">{firstPayout.toLocaleString()} Links</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-zinc-300"></span>
                        <span className="text-zinc-400 font-semibold">2nd:</span>
                        <span className="text-white font-bold font-mono">{secondPayout.toLocaleString()} Links</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                        <span className="text-zinc-400 font-semibold">3rd:</span>
                        <span className="text-white font-bold font-mono">{thirdPayout.toLocaleString()} Links</span>
                      </div>
                    </div>
                  </div>
                )}
                {leaderboardLoading ? (
                  <div className="p-12 text-center text-zinc-500 font-medium flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: primaryColor }} />
                    Loading leaderboard...
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 font-medium">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                    No one has entered this bracket yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#18181A] text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
                          <th className="px-6 py-4 font-medium">Participant</th>
                          <th className="px-6 py-4 font-medium text-center">Final Four</th>
                          <th className="px-6 py-4 font-medium text-center">Points</th>
                          <th className="px-6 py-4 font-medium text-center">Potential</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {leaderboardData.map((participant, index) => {
                          const actualR1Winners = [
                            bracket?.results?.['r1-m0'],
                            bracket?.results?.['r1-m1'],
                            bracket?.results?.['r1-m2'],
                            bracket?.results?.['r1-m3']
                          ].filter(Boolean) as string[];

                          return (
                          <tr
                            key={participant.uid}
                            className={`hover:bg-zinc-800/20 transition-colors`}
                            style={participant.uid === user?.uid ? { backgroundColor: `${primaryColor}1A` } : undefined}
                          >
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                                index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                index === 1 ? 'bg-zinc-300/20 text-zinc-300' :
                                index === 2 ? 'bg-orange-500/20 text-orange-500' :
                                'text-zinc-500'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={participant.avatar} alt="" className="w-8 h-8 rounded-full bg-zinc-800" />
                                <span className={`font-medium ${participant.uid === user?.uid ? 'text-white' : 'text-zinc-300'}`}>
                                  {participant.name}
                                </span>
                                {participant.uid === user?.uid && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">You</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {!isBracketLocked ? (
                                <span className="text-xs font-bold text-zinc-500 italic">Picks are In</span>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  {participant.finalFour?.map((team: string, i: number) => {
                                    const isEliminated = bracket?.eliminatedTeams?.includes(team);
                                    const isActualFinalFour = actualR1Winners.includes(team);
                                    const isChampion = team === participant.champion;

                                    let className = "text-[10px] font-bold px-1.5 py-0.5 rounded-sm ";

                                    if (isChampion) {
                                      className += "border border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)] ";
                                    } else {
                                      className += "border border-transparent ";
                                    }

                                    if (isActualFinalFour) {
                                      className += "text-green-500 ";
                                    } else if (isEliminated) {
                                      className += "text-red-500 line-through opacity-80 ";
                                    } else {
                                      className += "text-zinc-400 ";
                                    }

                                    return (
                                      <span key={i} className={className} title={team}>
                                        {getTeamAbbreviation(team)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-white">
                              {isNaN(participant.points) ? 0 : String(participant.points)}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-zinc-400">
                              {isNaN(participant.potentialPoints) ? 0 : participant.potentialPoints}
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 text-center max-w-7xl mx-auto">
          <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Bracket Not Found</h2>
          <p className="text-zinc-400 max-w-md mx-auto mb-6">
            The requested tournament bracket could not be found or has been removed.
          </p>
          <button
            onClick={() => navigate('/brackets')}
            className="bg-[#22c55e] hover:bg-[#1ea34d] text-black font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            Back to All Brackets
          </button>
        </div>
      )}
    </div>
  );
}
