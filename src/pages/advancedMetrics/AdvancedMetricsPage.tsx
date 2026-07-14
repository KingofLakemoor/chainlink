import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Medal, Link2, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FirebaseImage } from '../../components/ui/FirebaseImage';
import LifetimeStats from '../mypicks/LifetimeStats';
import { useNavigate } from 'react-router-dom';
import { TeamInsights } from './TeamInsights';

export default function AdvancedMetricsPage() {
const fetchMatchupsForPicks = async (fetchedPicks: any[]) => {
    if (fetchedPicks.length === 0) return [];

    // Extract unique matchupIds
    const matchupIdsToFetch = Array.from(new Set(fetchedPicks.map(p => p.matchupId).filter(Boolean)));

    if (matchupIdsToFetch.length === 0) return [];

    // Chunk into 30s for the 'in' operator
    const chunks = [];
    for (let i = 0; i < matchupIdsToFetch.length; i += 30) {
      chunks.push(matchupIdsToFetch.slice(i, i + 30));
    }

    const fetchedMatchups = [];
    for (const chunk of chunks) {
      const q = query(collection(db, 'matchups'), where('gameId', 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => fetchedMatchups.push({id: d.id, ...d.data()}));
    }

    return fetchedMatchups;
  };

  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ALL_TIME' | 'MEDALS' | 'LEAGUE_STATS' | 'TEAM_INSIGHTS'>('ALL_TIME');

  // States for All Time Picks
  const [picks, setPicks] = useState<any[]>([]);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [lastVisiblePick, setLastVisiblePick] = useState<QueryDocumentSnapshot<DocumentData, DocumentData> | null>(null);
  const [isLoadingPicks, setIsLoadingPicks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePicks, setHasMorePicks] = useState(true);

  // States for Medals
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.premium) return;

    const fetchMedals = async () => {
      try {
        const snap = await getDocs(collection(db, 'achievements'));
        setAchievements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Error fetching achievements", e);
      } finally {
        setAchievementsLoading(false);
      }
    };
    fetchMedals();
  }, [profile]);

  useEffect(() => {
    if (!user || !profile?.premium) return;




  const fetchInitialPicks = async () => {
      setIsLoadingPicks(true);
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
           setPicks([
             { id: '1', status: 'WIN', updatedAt: Date.now() - 22 * 60 * 60 * 1000, matchupId: 'mock-1', pick: { id: 'teamA', name: 'Phillies', image: 'https://via.placeholder.com/150' }, links: 10 },
             { id: '2', status: 'LOSS', updatedAt: Date.now() - 17 * 60 * 60 * 1000, matchupId: 'mock-3', pick: { id: 'teamF', name: 'Cubs', image: 'https://via.placeholder.com/150' }, links: 0 },
             { id: '3', status: 'PENDING', updatedAt: Date.now() - 2 * 60 * 60 * 1000, matchupId: 'mock-2', pick: { id: 'teamC', name: 'Spartak Moscow', image: 'https://via.placeholder.com/150' } },
           ]);
        } else {
          const q = query(
            collection(db, 'picks'),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc'),
            limit(30)
          );
          const snap = await getDocs(q);
          const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
          setPicks(fetchedPicks);
          const newMatchups = await fetchMatchupsForPicks(fetchedPicks);
          setMatchups(newMatchups);

          if (snap.docs.length > 0) {
            setLastVisiblePick(snap.docs[snap.docs.length - 1]);
          }
          if (snap.docs.length < 30) {
            setHasMorePicks(false);
          }
        }
      } catch (e) {
        console.error("Error fetching picks", e);
      } finally {
        setIsLoadingPicks(false);
      }
    };
    fetchInitialPicks();


  }, [user, profile]);

  const loadMorePicks = async () => {
    if (!user || !lastVisiblePick || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const q = query(
        collection(db, 'picks'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc'),
        startAfter(lastVisiblePick),
        limit(30)
      );
      const snap = await getDocs(q);
      const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
      setPicks(prev => [...prev, ...fetchedPicks]);
      const newMatchups = await fetchMatchupsForPicks(fetchedPicks);
      setMatchups(prev => {
        const existingIds = new Set(prev.map(m => m.gameId));
        const uniqueNew = newMatchups.filter(m => !existingIds.has(m.gameId));
        return [...prev, ...uniqueNew];
      });
      if (snap.docs.length > 0) {
        setLastVisiblePick(snap.docs[snap.docs.length - 1]);
      }
      if (snap.docs.length < 30) {
        setHasMorePicks(false);
      }
    } catch (e) {
      console.error("Error loading more picks", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (!profile?.premium) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Advanced Metrics</h1>
        <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
          Unlock the power of your data. Premium members get access to all-time pick history, detailed medal tables, and lifetime W-L-D tracking across every league.
        </p>
        <div className="grid sm:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto text-left">
          <div className="bg-[#121212] border border-zinc-800 p-6 rounded-2xl">
            <CheckCircle2 className="w-6 h-6 text-indigo-400 mb-4" />
            <h3 className="font-bold text-white mb-2">Lifetime Picks</h3>
            <p className="text-sm text-zinc-400">Scroll through every pick you've ever made on ChainLink.</p>
          </div>
          <div className="bg-[#121212] border border-zinc-800 p-6 rounded-2xl">
            <CheckCircle2 className="w-6 h-6 text-indigo-400 mb-4" />
            <h3 className="font-bold text-white mb-2">Medal Table</h3>
            <p className="text-sm text-zinc-400">View a visual history of every achievement and medal you've earned.</p>
          </div>
          <div className="bg-[#121212] border border-zinc-800 p-6 rounded-2xl">
            <CheckCircle2 className="w-6 h-6 text-indigo-400 mb-4" />
            <h3 className="font-bold text-white mb-2">League Stats</h3>
            <p className="text-sm text-zinc-400">Track your win-loss-push record separately for the NFL, NBA, MLB, and more.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/shop')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold transition-colors"
        >
          Upgrade to Premium in Shop
        </button>
      </div>
    );
  }

  // Pre-process achievements for medal table
  const achievementsByWeight = achievements.reduce((acc: any, ach: any) => {
    const weight = ach.weight || 0;
    if (!acc[weight]) acc[weight] = [];
    acc[weight].push(ach);
    return acc;
  }, {});

  // Sort achievements within each weight class
  Object.keys(achievementsByWeight).forEach(weight => {
    achievementsByWeight[weight].sort((a: any, b: any) => {
      // Sort by type first
      const typeComparison = (a.type || '').localeCompare(b.type || '');
      if (typeComparison !== 0) return typeComparison;

      // Then by threshold
      const aThreshold = Number(a.threshold || 0);
      const bThreshold = Number(b.threshold || 0);
      if (aThreshold !== bThreshold) return aThreshold - bThreshold;

      // Finally by name
      return (a.name || '').localeCompare(b.name || '');
    });
  });

  const sortedWeights = Object.keys(achievementsByWeight).map(Number).sort((a, b) => b - a);
  const userAchievements = profile?.achievements || [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-zinc-100 font-display">Advanced Metrics</h1>
        <div className="flex bg-zinc-900 rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL_TIME')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap", activeTab === 'ALL_TIME' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            All Time Picks
          </button>
          <button
            onClick={() => setActiveTab('MEDALS')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap", activeTab === 'MEDALS' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            Medal Table
          </button>
          <button
            onClick={() => setActiveTab('LEAGUE_STATS')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap", activeTab === 'LEAGUE_STATS' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            Stats By League
          </button>
          <button
            onClick={() => setActiveTab('TEAM_INSIGHTS')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap", activeTab === 'TEAM_INSIGHTS' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200")}
          >
            Team Insights
          </button>
        </div>
      </div>

      {activeTab === 'LEAGUE_STATS' && (
        <LifetimeStats userStats={profile?.statsByLeague || {}} />
      )}

      {activeTab === 'TEAM_INSIGHTS' && (
        <TeamInsights />
      )}

      {activeTab === 'MEDALS' && (
        <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-zinc-200 mb-6 flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-400" /> Medal Table
          </h2>

          {achievementsLoading ? (
            <div className="text-center text-zinc-500 py-8">Loading achievements...</div>
          ) : achievements.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No achievements found.</div>
          ) : (
            <div className="flex flex-col gap-[2px] bg-zinc-800 border border-zinc-800 rounded overflow-hidden">
               {sortedWeights.map((weight) => (
                  <div key={weight} className="bg-[#1e1e1e] flex flex-wrap min-h-[76px] relative">
                     {weight >= 3 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent pointer-events-none"></div>}
                     {weight === 2 && <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none"></div>}

                     {achievementsByWeight[weight].map((ach: any) => {
                        let count = 0;
                        if (userAchievements && Array.isArray(userAchievements)) {
                            count = userAchievements.filter(id => {
                                if (typeof id === 'string') return id === ach.id;
                                if (id && typeof id === 'object') return (id.achievementId || id.id) === ach.id;
                                return false;
                            }).length;
                        }

                        const hasEarned = count > 0;

                        return (
                           <div key={ach.id} className="w-[60px] md:w-[76px] flex flex-col group relative" title={`${ach.name}\n${ach.description}`}>
                              <div className={`h-[60px] flex items-center justify-center border-r border-zinc-800/50 ${hasEarned ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                 <FirebaseImage src={ach.image || ''} fallback="/logo.png" alt={ach.name} className="w-10 h-10 object-contain drop-shadow-md" />
                              </div>
                              <div className={`h-4 text-[9px] md:text-[10px] font-mono font-bold flex items-center justify-center border-t border-r border-zinc-800/50 ${hasEarned ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                 {count}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ALL_TIME' && (
        <>
          {isLoadingPicks ? (
            <div className="p-8 text-center text-zinc-400">Loading All Time Picks...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {picks.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-zinc-500">
                    <p>No picks found.</p>
                  </div>
                ) : (
                  picks.map(pick => {
                    const matchup = matchups.find(m => m.gameId === pick.matchupId);

                    let statusColorClass = 'bg-[#121212] border-zinc-800';
                    let statusTextColor = 'text-zinc-400';
                    let statusText = pick.status;

                    let displayTeamName = pick.pick?.name;
                    if (matchup && matchup.type === 'OVER_UNDER') {
                      displayTeamName = `${displayTeamName} (${matchup.overUnderNumber})`;
                    } else if (matchup && matchup.type === 'SPREAD') {
                      const spread = pick.pick?.id === matchup.awayTeam?.id ? matchup.awayTeamSpread : matchup.homeTeamSpread;
                      const spreadStr = spread > 0 ? `+${spread}` : spread;
                      displayTeamName = `${displayTeamName} ${spreadStr}`;
                    }
                    let displayTeamImage = pick.pick?.image;

                    if (!displayTeamName || !displayTeamImage) {
                      if (matchup && matchup.awayTeam?.id === pick.pick?.id) {
                          displayTeamName = matchup.awayTeam.name;
                          displayTeamImage = matchup.awayTeam.image;
                      } else if (matchup && matchup.homeTeam?.id === pick.pick?.id) {
                          displayTeamName = matchup.homeTeam.name;
                          displayTeamImage = matchup.homeTeam.image;
                      } else {
                          displayTeamName = 'Unknown';
                          displayTeamImage = 'https://via.placeholder.com/150';
                      }
                    }

                    if (pick.status === 'WIN') {
                      statusColorClass = 'bg-green-950/20 border-green-900/50';
                      statusTextColor = 'text-green-500';
                    } else if (pick.status === 'LOSS') {
                      statusColorClass = 'bg-red-950/20 border-red-900/50';
                      statusTextColor = 'text-red-500';
                    } else if (pick.status === 'PUSH') {
                      statusColorClass = 'bg-zinc-900 border-zinc-700';
                      statusTextColor = 'text-zinc-500';
                    } else if (pick.status === 'PENDING') {
                      statusColorClass = 'bg-blue-950/20 border-blue-900/50';
                      statusTextColor = 'text-blue-400';
                      statusText = 'In Progress';
                    }

                    return (
                      <div key={pick.id} className={cn("rounded-xl border p-6 flex flex-col items-center justify-center gap-4 transition-colors", statusColorClass)}>
                        <div className="text-base font-medium text-zinc-200 text-center">{displayTeamName}</div>
                        <div className="text-xs text-zinc-500 font-medium text-center px-2">
                          {matchup?.title || matchup?.gameId || 'Unknown Matchup'}
                        </div>
                        <div className={cn("text-xs font-bold uppercase tracking-wider", statusTextColor)}>
                          {statusText}
                        </div>
                        <div className="w-20 h-20 flex items-center justify-center">
                          <img src={displayTeamImage} alt={displayTeamName} className="w-full h-full object-contain drop-shadow-md" loading="lazy" />
                        </div>
                        <div className="text-xs text-zinc-400 mt-2">
                          {matchup?.startTime
                            ? new Date(matchup.startTime).toLocaleDateString()
                            : (pick.updatedAt ? new Date(pick.updatedAt).toLocaleDateString() : 'Unknown date')}
                        </div>
                        {(pick.status === 'WIN' || pick.status === 'LOSS') && pick.links > 0 && (
                          <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full mt-2">
                            <Link2 className={cn("w-3.5 h-3.5", pick.status === 'WIN' ? "text-green-500" : "text-zinc-600")} />
                            <span className={cn("text-xs font-bold", pick.status === 'WIN' ? "text-green-500" : "text-zinc-500")}>
                              {pick.status === 'WIN' ? `+${pick.links}` : '0'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {hasMorePicks && picks.length > 0 && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMorePicks}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More Picks'}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
