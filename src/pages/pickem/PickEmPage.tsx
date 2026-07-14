import { FirebaseImage } from '../../components/ui/FirebaseImage';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, doc, query, where, setDoc, getDoc, deleteDoc, documentId } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Layers, CheckCircle, Trophy, Lock, XCircle } from 'lucide-react';
import { MATCHUP_FINAL_STATUSES } from '../../services/espnScraper';

export default function PickEmPage() {
  const getPickStyle = (pick: any, isLocked: boolean) => {
    if (!pick) return null;

    if (pick.status === 'WIN') {
      return { borderColor: '#22c55e', backgroundColor: '#22c55e1A', color: '#22c55e', icon: 'CheckCircle' };
    }
    if (pick.status === 'LOSS') {
      return { borderColor: '#ef4444', backgroundColor: '#ef44441A', color: '#ef4444', icon: 'XCircle' };
    }

    if (isLocked) {
      return { borderColor: '#71717a', backgroundColor: '#71717a1A', color: '#71717a', icon: 'Lock' };
    }

    return { borderColor: '#ffffff', backgroundColor: '#ffffff1A', color: '#ffffff', icon: 'CheckCircle' };
  };


  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [matchupsLoading, setMatchupsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'matchups' | 'leaderboard'>('matchups');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const snap = await getDocs(collection(db, 'pickemCampaigns'));
        let camps = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

        const now = Date.now();
        camps = camps.filter((c: any) => {
          const hasDates = c.startDate && c.endDate;
          if (!hasDates) return true; // Keep legacy campaigns
          return now >= c.startDate && now <= c.endDate;
        });

        // Mock for local dev
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          if (campaignId === 'charity') {
             camps.push({
               id: 'charity',
               name: 'Charity Pick Em 2026',
               currentWeek: 1,
               pickLimit: 5,
               theme: {
                 title: "Charity Pick Em",
                 subtitle: "Make your picks to support a great cause!",
                 primaryColor: "#3b82f6", // Blue
                 logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=charity-pickem"
               }
             });
          }
        }

        setCampaigns(camps);

        let initialCampaign = camps.length > 0 ? camps[0] : null;
        if (campaignId) {
          const found = camps.find(c => c.id === campaignId);
          if (found) initialCampaign = found;
        }

        if (initialCampaign) {
          setSelectedCampaign(initialCampaign);
          setSelectedWeek(initialCampaign.currentWeek || 1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const fetchMatchupsAndPicks = async (campaignId: string, week: number) => {
    setMatchupsLoading(true);
    try {
      const mQuery = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', campaignId),
        where('week', '==', week)
      );
      const mSnap = await getDocs(mQuery);
      setMatchups(mSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.startTime - b.startTime));

      if (user) {
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('campaignId', '==', campaignId),
          where('week', '==', week),
          where('participantId', '==', user.uid)
        );
        const pSnap = await getDocs(pQuery);
        const picksMap: Record<string, any> = {};
        pSnap.docs.forEach(d => {
          const data = d.data();
          picksMap[data.matchupId] = { id: d.id, ...data };
        });
        setUserPicks(picksMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMatchupsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCampaign && selectedWeek) {
      // Fetch matchups even if user is not authenticated (for leaderboard)
      // fetchMatchupsAndPicks normally needs a user to fetch picks,
      // but we need it to just fetch matchups if user is missing, or we can just fetch it as is
      fetchMatchupsAndPicks(selectedCampaign.id, selectedWeek);
    }
  }, [selectedCampaign, selectedWeek, user]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!selectedCampaign || activeTab !== 'leaderboard') return;

      setLeaderboardLoading(true);
      try {
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('campaignId', '==', selectedCampaign.id)
        );
        const pSnap = await getDocs(pQuery);

        const participantStats: Record<string, { wins: number, losses: number, pushes: number, points: number, picks: any[] }> = {};

        pSnap.docs.forEach(d => {
          const pick = d.data();
          const pId = pick.participantId;
          if (!participantStats[pId]) {
            participantStats[pId] = { wins: 0, losses: 0, pushes: 0, points: 0, picks: [] };
          }

          participantStats[pId].picks.push(pick);

          if (pick.status === 'WIN') {
            participantStats[pId].wins += 1;
            participantStats[pId].points += pick.pointsEarned || 1;
          } else if (pick.status === 'LOSS') {
            participantStats[pId].losses += 1;
          } else if (pick.status === 'PUSH') {
            participantStats[pId].pushes += 1;
          }
        });

        const participantIds = Object.keys(participantStats);
        if (participantIds.length > 0) {
          // Chunk participant IDs to avoid 10-item limit in 'in' queries, or fetch all users and filter
          // For simplicity and safety, we'll fetch the users directly or query if small
          const usersMap: Record<string, any> = {};

          // Fetch public user profiles via API endpoint to avoid permission denied errors
          const token = await auth.currentUser?.getIdToken();
          const chunkedUids = [];
          for (let i = 0; i < participantIds.length; i += 50) {
            chunkedUids.push(participantIds.slice(i, i + 50));
          }

          await Promise.all(chunkedUids.map(async (chunk) => {
            const res = await fetch(`/api/users/public?uids=${chunk.join(',')}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              const usersList = data.users || [];
              usersList.forEach((u: any) => {
                usersMap[u.id] = u;
              });
            } else {
              console.warn("Failed to fetch participant user details chunk for Pick Em leaderboard.");
            }
          }));

          const formattedLeaderboard = participantIds.map(uid => ({
             uid,
             name: usersMap[uid]?.username || usersMap[uid]?.displayName || 'Unknown User',
             avatar: usersMap[uid]?.image || usersMap[uid]?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
             ...participantStats[uid]
          })).sort((a, b) => b.points - a.points); // Sort by points descending

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
  }, [selectedCampaign, activeTab]);

  const handleClearPick = async (matchup: any) => {
    if (!user || !selectedCampaign) return;
    if (matchup.status !== 'STATUS_SCHEDULED') return;

    try {
      const pickId = `${selectedCampaign.id}_${selectedWeek}_${matchup.id}_${user.uid}`;
      const pickRef = doc(db, 'pickemPicks', pickId);
      await deleteDoc(pickRef);
      setUserPicks(prev => {
        const next = { ...prev };
        delete next[matchup.id];
        return next;
      });
    } catch (err) {
      console.error(err);
      alert('Failed to clear pick');
    }
  };

  const handlePick = async (matchup: any, teamId: string) => {
    if (!user || !selectedCampaign) return;
    if (matchup.status !== 'STATUS_SCHEDULED') return;

    try {
      const pickId = `${selectedCampaign.id}_${selectedWeek}_${matchup.id}_${user.uid}`;
      const pickRef = doc(db, 'pickemPicks', pickId);

      const existingPick = userPicks[matchup.id];
      if (existingPick?.pick.teamId === teamId) {
        // Unselect if clicking the same team
        await handleClearPick(matchup);
        return;
      }

      // Check pick limit before adding a new pick (skip if replacing existing pick in same matchup)
      if (!existingPick && selectedCampaign.pickLimit > 0) {
        const currentPicksCount = Object.keys(userPicks).length;
        if (currentPicksCount >= selectedCampaign.pickLimit) {
          alert(`You have reached the maximum of ${selectedCampaign.pickLimit} picks for this week.`);
          return;
        }
      }

      const newPick = {
        campaignId: selectedCampaign.id,
        participantId: user.uid,
        matchupId: matchup.id,
        week: selectedWeek,
        pick: { teamId },
        status: 'PENDING',
        pointsEarned: 0,
        submittedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(pickRef, newPick, { merge: true });
      setUserPicks(prev => ({ ...prev, [matchup.id]: { id: pickId, ...newPick } }));
    } catch (err) {
      console.error(err);
      alert('Failed to save pick');
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading Pick'em...</div>;

  const theme = selectedCampaign?.theme || {};
  const primaryColor = theme.primaryColor || "#22c55e";
  const title = theme.title || "Pick'em";
  const subtitle = theme.subtitle || "Make weekly picks and compete on the leaderboard.";

  if (campaigns.length === 0) {
    return (
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pt-20 md:pt-8 text-center">
        <Layers className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Active Campaigns</h2>
        <p className="text-zinc-400">There are no Pick'em campaigns available right now.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pt-20 md:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 uppercase tracking-tight flex items-center gap-3">
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt={title} className="w-10 h-10 object-contain" loading="lazy" />
          ) : (
            <Layers className="w-8 h-8" style={{ color: primaryColor }} />
          )}
          {title}
        </h1>
        <p className="text-zinc-400 text-lg">{subtitle}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selectedCampaign?.id || ''}
            onChange={e => {
              const camp = campaigns.find(c => c.id === e.target.value);
              setSelectedCampaign(camp);
              setSelectedWeek(camp?.currentWeek || 1);
            }}
            className="bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-medium min-w-[250px]"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-medium"
          >
            {[...Array(20)].map((_, i) => (
              <option key={i+1} value={i+1}>Week {i+1}</option>
            ))}
          </select>
        </div>

        <div className="flex bg-[#121212] p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('matchups')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'matchups'
                ? 'text-black shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            style={activeTab === 'matchups' ? { backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}33` } : undefined}
          >
            <Layers className="w-4 h-4" />
            Matchups
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'leaderboard'
                ? 'text-black shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
            style={activeTab === 'leaderboard' ? { backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}33` } : undefined}
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </button>
        </div>
      </div>

      {activeTab === 'matchups' && (
        <>
          {selectedCampaign?.pickLimit > 0 && (
            <div className="mb-6 p-4 bg-[#18181A] border border-zinc-800 rounded-xl flex items-center justify-between">
               <div>
                  <h3 className="text-white font-bold">Weekly Pick Limit</h3>
                  <p className="text-sm text-zinc-400">You can make up to {selectedCampaign.pickLimit} picks for this campaign per week.</p>
               </div>
               <div className="text-2xl font-black" style={{ color: primaryColor }}>
                 {Object.keys(userPicks).length} <span className="text-lg text-zinc-500">/ {selectedCampaign.pickLimit}</span>
               </div>
            </div>
          )}

          {matchupsLoading ? (
            <div className="text-center py-20 text-zinc-500">Loading matchups...</div>
          ) : matchups.length === 0 ? (
        <div className="text-center py-20 bg-[#121212] border border-zinc-800 rounded-xl">
          <Layers className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400 text-lg">No matchups scheduled for Week {selectedWeek}.</p>
        </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchups.map(m => {
                const pick = userPicks[m.id];
                const isLocked = m.status !== 'STATUS_SCHEDULED';

                const isSpread = m.type === 'SPREAD' && m.metadata?.spread !== undefined;
                const spread = m.metadata?.spread || 0;

                const isSpreadPendingLock = isSpread && (m.league === 'CFB' || m.league === 'NFL') && !m.metadata?.spreadLocked;

                return (
                  <div key={m.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-3 bg-[#18181A] border-b border-zinc-800 text-xs text-zinc-400 font-medium flex justify-between items-center">
                      <span>{new Date(m.startTime).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        {isSpread && (
                          <span className="px-2 py-1 text-[10px] uppercase tracking-wider rounded-md font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            ATS
                          </span>
                        )}
                        <span className={isLocked ? "text-red-400" : "text-green-400"}>
                          {m.statusDesc || (isLocked ? 'Locked' : 'Open')}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col gap-3">
                      {isSpreadPendingLock && (
                        <div className="text-center text-xs font-bold text-yellow-500/80 bg-yellow-500/10 py-1.5 rounded-md border border-yellow-500/20 mb-1">
                          Spread Lock Thursday Morning
                        </div>
                      )}

                      <button
                        onClick={() => handlePick(m, m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id)}
                        disabled={isLocked}
                        className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors
                          ${pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id)
                            ? '' // dynamic styles below
                            : 'border-zinc-800 hover:border-zinc-600 bg-[#18181A]'}
                          ${isLocked && pick?.pick.teamId !== (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        style={pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) ? (() => { const s = getPickStyle(pick, isLocked); return s ? { borderColor: s.borderColor, backgroundColor: s.backgroundColor } : undefined; })() : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <img src={m.type === 'OVER_UNDER' ? '/images/over.png' : m.awayTeam.image} alt={m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.name} className="w-8 h-8 object-contain" loading="lazy" />
                          <div className="flex flex-row items-baseline gap-2">
                            <span className="font-bold text-white">{m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.name}</span>
                            {isSpread && !isSpreadPendingLock && (
                               <span className="text-base text-zinc-400 font-medium">{spread > 0 ? `-${spread}` : `+${Math.abs(spread)}`}</span>
                            )}
                            {m.type === 'SOCCER_SCORE' && (() => {
                               const type = m.metadata?.awayScoreType || 'WIN_BY';
                               const val = m.metadata?.awayScoreValue;
                               const hasVal = val !== undefined && val !== null && val !== '';
                               return (
                                 <span className="text-base text-zinc-400 font-medium whitespace-nowrap">
                                   {type === 'WIN_BY' ? (hasVal ? `Win by ${val}+` : 'Win') : (hasVal ? `W/D/Lose by ${val}` : 'W/D/Lose')}
                                 </span>
                               );
                            })()}
                          </div>
                        </div>
                        {pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) && (() => {
                          const style = getPickStyle(pick, isLocked);
                          if (!style) return null;
                          const IconComponent = style.icon === 'Lock' ? Lock : (style.icon === 'XCircle' ? XCircle : CheckCircle);
                          return <IconComponent className="w-5 h-5" style={{ color: style.color }} />;
                        })()}
                      </button>

                      <div className="text-center text-xs text-zinc-600 font-bold uppercase">@</div>

                      <button
                        onClick={() => handlePick(m, m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)}
                        disabled={isLocked}
                        className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors
                          ${pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)
                            ? '' // dynamic styles below
                            : 'border-zinc-800 hover:border-zinc-600 bg-[#18181A]'}
                          ${isLocked && pick?.pick.teamId !== (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        style={pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) ? (() => { const s = getPickStyle(pick, isLocked); return s ? { borderColor: s.borderColor, backgroundColor: s.backgroundColor } : undefined; })() : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <img src={m.type === 'OVER_UNDER' ? '/images/under.png' : m.homeTeam.image} alt={m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.name} className="w-8 h-8 object-contain" loading="lazy" />
                          <div className="flex flex-row items-baseline gap-2">
                            <span className="font-bold text-white">{m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.name}</span>
                            {isSpread && !isSpreadPendingLock && (
                               <span className="text-base text-zinc-400 font-medium">{spread > 0 ? `+${spread}` : `-${Math.abs(spread)}`}</span>
                            )}
                            {m.type === 'SOCCER_SCORE' && (() => {
                               const type = m.metadata?.homeScoreType || 'WIN_DRAW_LOSE';
                               const val = m.metadata?.homeScoreValue;
                               const hasVal = val !== undefined && val !== null && val !== '';
                               return (
                                 <span className="text-base text-zinc-400 font-medium whitespace-nowrap">
                                   {type === 'WIN_BY' ? (hasVal ? `Win by ${val}+` : 'Win') : (hasVal ? `W/D/Lose by ${val}` : 'W/D/Lose')}
                                 </span>
                               );
                            })()}
                          </div>
                        </div>
                        {pick?.pick.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) && (() => {
                          const style = getPickStyle(pick, isLocked);
                          if (!style) return null;
                          const IconComponent = style.icon === 'Lock' ? Lock : (style.icon === 'XCircle' ? XCircle : CheckCircle);
                          return <IconComponent className="w-5 h-5" style={{ color: style.color }} />;
                        })()}
                      </button>

                      {pick && !isLocked && (
                        <button
                          onClick={() => handleClearPick(m)}
                          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 py-1 transition-colors underline"
                        >
                          Clear Pick
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
          {leaderboardLoading ? (
            <div className="p-12 text-center text-zinc-500 font-medium">Loading leaderboard...</div>
          ) : leaderboardData.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 font-medium">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              No picks have been graded for this campaign yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#18181A] text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
                    <th className="px-6 py-4 font-medium">Participant</th>
                    <th className="px-6 py-4 font-medium text-center">Points</th>
                    <th className="px-6 py-4 font-medium text-center">W-L-P</th>
                    <th className="px-6 py-4 font-medium text-left">Week {selectedWeek} Picks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {leaderboardData.map((participant, index) => (
                    <tr
                      key={participant.uid}
                      className={`hover:bg-zinc-800/20 transition-colors ${participant.uid === user?.uid ? '' : ''}`}
                      style={participant.uid === user?.uid ? { backgroundColor: `${primaryColor}0D` } : undefined}
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
                          <FirebaseImage fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.id || "guest"}`} src={participant.avatar} alt={participant.name} className="w-8 h-8 rounded-full bg-zinc-800" loading="lazy" />
                          <span className="font-medium text-white">{participant.name} {participant.uid === user?.uid && '(You)'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-lg" style={{ color: primaryColor }}>{participant.points}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-zinc-400 font-mono">
                        {participant.wins}-{participant.losses}-{participant.pushes}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 items-center flex-wrap">
                          {participant.picks && participant.picks.filter((p: any) => p.week === selectedWeek).map((pick: any) => {
                            const matchup = matchups.find((m: any) => m.id === pick.matchupId);
                            if (!matchup || matchup.status === 'STATUS_SCHEDULED') return null;

                            let imageUrl = '';
                            let altText = '';
                            if (matchup.type === 'OVER_UNDER') {
                                imageUrl = pick.pick.teamId === 'OVER' ? '/images/over.png' : '/images/under.png';
                                altText = pick.pick.teamId;
                            } else {
                                imageUrl = pick.pick.teamId === matchup.awayTeam.id ? matchup.awayTeam.image : matchup.homeTeam.image;
                                altText = pick.pick.teamId === matchup.awayTeam.id ? matchup.awayTeam.name : matchup.homeTeam.name;
                            }

                            let borderColorClass = 'border-zinc-500';
                            if (pick.status === 'WIN') borderColorClass = 'border-green-500';
                            else if (pick.status === 'LOSS') borderColorClass = 'border-red-500';

                            return (
                              <div key={pick.id} className={`w-8 h-8 rounded-full border-2 overflow-hidden bg-zinc-800 flex-shrink-0 ${borderColorClass}`} title={`${altText} - ${pick.status}`}>
                                <img src={imageUrl} alt={altText} className="w-full h-full object-contain p-0.5" />
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
