import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase-error';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface WorldCupBracketProps {
  bracket: any; // The bracket document from Firestore
  adminView?: { userId: string, selections: Record<string, string>, paid: boolean };
}

import { Coins, Loader2, Check, X } from 'lucide-react';
import { BracketMatchupCard } from '../../components/ui/BracketMatchupCard';

export function WorldCupBracket({ bracket, adminView }: WorldCupBracketProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isPaid, setIsPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [liveMatchups, setLiveMatchups] = useState<Record<string, any>>({});

  const { user } = useAuth();

  useEffect(() => {
    async function loadSelections() {
      if (adminView) {
        setIsPaid(adminView.paid);
        setSelections(adminView.selections || {});
        return;
      }
      if (!user || !bracket?.id) return;
      try {
        const docRef = doc(db, 'bracketGamePredictions', `${bracket.id}_${user.uid}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.paid) setIsPaid(true);
          if (data.selections) {
            setSelections(data.selections);
          }
        }
      } catch (err) {
        console.error("Failed to load bracket predictions:", err);
      }
    }
    loadSelections();
  }, [user, bracket?.id]);

  useEffect(() => {
    if (!bracket?.matchIds || Object.keys(bracket.matchIds).length === 0) return;

    // Subscribe to matchups mapped to this bracket
    const gameIds = Object.values(bracket.matchIds).filter(Boolean) as string[];
    if (gameIds.length === 0) return;

    // chunk gameIds by 30 to comply with firestore 'in' limits
    const unsubscribes: any[] = [];
    const newLiveMatchups: Record<string, any> = {};

    for (let i = 0; i < gameIds.length; i += 30) {
       const chunk = gameIds.slice(i, i + 30);
       const q = query(collection(db, 'matchups'), where('gameId', 'in', chunk));

       const unsub = onSnapshot(q, (snap) => {
          snap.docs.forEach(d => {
             const mData = d.data();
             // Find corresponding mId
             const mId = Object.keys(bracket.matchIds).find(key => bracket.matchIds[key] === mData.gameId);
             if (mId) {
                newLiveMatchups[mId] = mData;
             }
          });
          setLiveMatchups({ ...newLiveMatchups });
       }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'matchups/bracket');
       });
       unsubscribes.push(unsub);
    }

    return () => {
       unsubscribes.forEach(u => u());
    };
  }, [bracket?.matchIds]);

  const handlePayToEnter = async () => {
    if (!user || !bracket?.id || isPaying) return;
    setIsPaying(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/brackets/enter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bracketId: bracket.id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enter bracket');
      }
      setIsPaid(true);
    } catch (err: any) {
      alert(err.message || "Failed to enter bracket. Check your links balance.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSelect = async (matchId: string, team: string, isLocked: boolean) => {
    if (isLocked || !isPaid || adminView) return;

    const next = { ...selections };
    const isDeselect = next[matchId] === team;

    if (isDeselect) {
      delete next[matchId];
    } else {
      next[matchId] = team;
    }

    const removedTeam = isDeselect ? team : (selections[matchId] && selections[matchId] !== team ? selections[matchId] : null);
    if (removedTeam) {
      for (const [mId, mTeam] of Object.entries(next)) {
         if (mTeam === removedTeam && mId !== matchId) {
           delete next[mId];
         }
      }
    }

    setSelections(next);

    if (user && bracket?.id) {
      try {
        const docRef = doc(db, 'bracketGamePredictions', `${bracket.id}_${user.uid}`);
        await setDoc(docRef, {
          userId: user.uid,
          bracketId: bracket.id,
          selections: next,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to save bracket prediction:", err);
      }
    }
  };

  const getSlot = (prevMatchId: string) => {
    const results = bracket.results || {};
    const eliminatedTeams = bracket.eliminatedTeams || [];

    const predicted = selections[prevMatchId] || null;
    const actual = results[prevMatchId] || null;

    let predictedWrong = false;
    if (predicted) {
      if (actual && actual !== predicted) {
         predictedWrong = true;
      } else if (eliminatedTeams.includes(predicted)) {
         predictedWrong = true;
      }
    }

    const display = actual || (predictedWrong ? null : predicted);
    return { predicted, actual, predictedWrong, display };
  };

  const getMatchTeams = (round: number, globalMatchIndex: number) => {
    if (round === 0) {
      const team1Str = bracket.teams[globalMatchIndex * 2] || `Team ${globalMatchIndex * 2 + 1}`;
      const team2Str = bracket.teams[globalMatchIndex * 2 + 1] || `Team ${globalMatchIndex * 2 + 2}`;
      return [
        { predicted: null, actual: team1Str, predictedWrong: false, display: team1Str },
        { predicted: null, actual: team2Str, predictedWrong: false, display: team2Str }
      ];
    } else {
      const prevRound = round - 1;
      const prevMatch1Index = globalMatchIndex * 2;
      const prevMatch2Index = globalMatchIndex * 2 + 1;

      const prevMatch1Id = `r${prevRound}-m${prevMatch1Index}`;
      const prevMatch2Id = `r${prevRound}-m${prevMatch2Index}`;

      return [getSlot(prevMatch1Id), getSlot(prevMatch2Id)];
    }
  };

  const theme = bracket?.theme || {};
  const primaryColor = theme.primaryColor || "#22c55e";

  const isMatchLocked = (round: number, matchId: string) => {
    const now = new Date();
    // The entire bracket locks when the Round of 16 starts (July 4th at 10 AM AZ time = 17:00:00Z)
    const globalLock = new Date('2026-07-04T17:00:00Z');
    return now > globalLock;
  };

  const renderMatch = (round: number, globalMatchIndex: number) => {
    const matchId = `r${round}-m${globalMatchIndex}`;
    const [team1Slot, team2Slot] = getMatchTeams(round, globalMatchIndex);
    const selectedTeam = selections[matchId];

    const locked = isMatchLocked(round, matchId);

    const matchTime = bracket?.matchTimes?.[matchId];
    const formattedTime = matchTime ? new Date(matchTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
    const matchResult = bracket?.results?.[matchId] || null;
    const liveMatchup = liveMatchups[matchId];

    return (
       <div key={matchId} className="mb-4 w-[180px]">
          <BracketMatchupCard
            matchId={matchId}
            round={round}
            team1Slot={team1Slot}
            team2Slot={team2Slot}
            matchResult={matchResult}
            selectedTeam={selectedTeam || null}
            formattedTime={formattedTime}
            locked={locked}
            primaryColor={primaryColor}
            onSelect={handleSelect}
            liveMatchup={liveMatchup}
          />
       </div>
    );
  };

  const renderRound = (round: number, startMatchIdx: number, matchCount: number, title: string) => {
    return (
      <div key={`${round}-${startMatchIdx}`} className="flex flex-col mx-4 justify-around py-4">
        <h3 className="text-zinc-400 font-bold mb-4 text-center text-xs uppercase sticky top-0">{title}</h3>
        <div className="flex flex-col justify-around h-full">
          {Array.from({ length: matchCount }).map((_, i) => renderMatch(round, startMatchIdx + i))}
        </div>
      </div>
    );
  };

  const finalWinnerId = 'r3-m0';
  const championSlot = getSlot(finalWinnerId);
  const isChampionCorrect = bracket?.results?.[finalWinnerId] && bracket.results[finalWinnerId] === championSlot.display && championSlot.predicted === championSlot.display;
  const isChampionDecided = bracket?.results?.[finalWinnerId] && bracket.results[finalWinnerId] === championSlot.display;

  const calculatePoints = () => {
    let pts = 0;
    let pot = 0;

    const pointsMap: Record<string, number> = {
      "0": bracket.pointValues?.["Round of 16"] || 20,
      "1": bracket.pointValues?.["Quarter Finals"] || 40,
      "2": bracket.pointValues?.["Semi Finals"] || 80,
      "3": bracket.pointValues?.["Finals"] || 160
    };

    const results = bracket.results || {};
    const eliminatedTeams = bracket.eliminatedTeams || [];

    for (const [mId, pickedTeam] of Object.entries(selections)) {
       const round = mId.split('-')[0].replace('r', '');
       const rPts = pointsMap[round] || 0;

       if (results[mId] === pickedTeam) {
          pts += rPts;
          pot += rPts;
       } else if (results[mId] && results[mId] !== pickedTeam) {
          // picked wrong, no points, no potential
       } else if (!results[mId] && !eliminatedTeams.includes(pickedTeam)) {
          // still alive
          pot += rPts;
       }
    }
    return { pts, pot };
  };

  const { pts: currentPoints, pot: potentialPoints } = calculatePoints();

  return (
    <div className="w-full flex flex-col items-center">
      {isPaid && (
        <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 mb-6 w-full max-w-2xl flex justify-around">
           <div className="text-center">
             <div className="text-zinc-400 text-xs font-bold uppercase mb-1">Current Points</div>
             <div className="text-2xl font-black text-white">{isNaN(currentPoints) ? 0 : currentPoints}</div>
           </div>
           <div className="text-center">
             <div className="text-zinc-400 text-xs font-bold uppercase mb-1">Potential Points</div>
             <div className="text-2xl font-black text-white">{isNaN(potentialPoints) ? 0 : potentialPoints}</div>
           </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-4 mb-6 w-full max-w-2xl text-center">
        <p className="text-zinc-300 text-sm">
          <strong className="text-white">Lock Time:</strong> The entire bracket locks on July 4th at 10:00 AM AZ time.
        </p>
      </div>

      {!isPaid && !adminView && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8 w-full max-w-2xl text-center flex flex-col items-center">
          <p className="text-yellow-200 mb-4 font-medium">
            You must enter this bracket to make picks.
          </p>
          <button
            onClick={handlePayToEnter}
            disabled={isPaying}
            className="flex items-center gap-2 bg-yellow-500 text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5" />}
            Pay {bracket?.cost || 10} Links to Enter
          </button>
        </div>
      )}

      <div className={cn("w-full overflow-x-auto pb-8 bg-[#0a0a0a] rounded-xl p-4 border border-[#27272a] relative transition-opacity", !isPaid && "opacity-50 pointer-events-none")}>
        <div className="min-w-max flex items-stretch justify-center">
        {/* Left Side */}
        <div className="flex">
          {renderRound(0, 0, 4, "Round of 16")}
          {renderRound(1, 0, 2, "Quarter-finals")}
          {renderRound(2, 0, 1, "Semi-finals")}
        </div>

        {/* Center - Finals */}
        <div className="flex flex-col items-center justify-center mx-4">
          <h3 className="font-bold mb-4 text-center text-xl uppercase tracking-widest" style={{ color: primaryColor }}>Champion</h3>
          <div
            className="bg-[#1a1a1a] rounded-xl p-6 min-w-[200px] text-center flex flex-col items-center justify-center min-h-[100px]"
            style={{
              borderColor: primaryColor,
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow: `0 0 20px ${primaryColor}26` // 26 is hex for ~15% opacity
            }}
          >
            {championSlot.predictedWrong && championSlot.predicted && (
              <span className="text-sm text-red-500 line-through mb-1 uppercase font-bold opacity-80">
                {championSlot.predicted}
              </span>
            )}
            {championSlot.display ? (
              <span className="flex items-center gap-2 justify-center w-full">
                <span className="text-2xl font-black text-white uppercase truncate px-2">{championSlot.display}</span>
                {isChampionDecided && <Check className={cn("w-6 h-6 flex-shrink-0", isChampionCorrect ? "text-green-500" : "text-zinc-500")} />}
                {championSlot.predictedWrong && <X className="w-6 h-6 flex-shrink-0 text-red-500" />}
              </span>
            ) : (
              <span className="text-zinc-600 italic">Select Winner</span>
            )}
          </div>

          <div className="mt-12 flex flex-col items-center">
             <h3 className="text-zinc-400 font-bold mb-4 text-center text-xs uppercase">Final</h3>
             {renderMatch(3, 0)}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex flex-row-reverse">
           {renderRound(0, 4, 4, "Round of 16")}
           {renderRound(1, 2, 2, "Quarter-finals")}
           {renderRound(2, 1, 1, "Semi-finals")}
        </div>
      </div>
      </div>
    </div>
  );
}
