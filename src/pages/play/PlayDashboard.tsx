import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase-error';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { MdOutlineSportsSoccer, MdOutlineSportsFootball,  MdOutlineSportsBasketball, MdOutlineSportsHockey, MdOutlineSportsBaseball, MdOutlineSportsTennis, MdOutlineSportsGolf } from 'react-icons/md';
import { MatchupCard } from '../../components/ui/MatchupCard';
import { FirebaseImage } from '../../components/ui/FirebaseImage';

export default function PlayDashboard() {
  const { user, profile, chain } = useAuth();
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'available' | 'chain'>('all');
  const [sharingMatchupId, setSharingMatchupId] = useState<string | null>(null);

  const [allFetchedMatchups, setAllFetchedMatchups] = useState<any[]>([]);
  const [globalUpcomingPicks, setGlobalUpcomingPicks] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    if (!db) {
      console.error("Firestore DB is not initialized.");
      return;
    }
    
    let unsubMatchups = () => {};

    const setupMatchups = () => {
      unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
        if (snap.empty) {
          setAllFetchedMatchups([]);
        } else {
          const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
          setAllFetchedMatchups(allMatchups);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'matchups');
      });
    };


    let unsubPicks = () => {};
    let unsubGlobalPicks = () => {};
    let unsubSponsors = () => {};

    const setupPicksListeners = () => {
      if (user) {
        const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
        unsubPicks = onSnapshot(q, (pickSnap) => {
          const picksInfo: Record<string, any> = {};
          pickSnap.docs.forEach(d => {
            const data = d.data();
            picksInfo[data.matchupId] = data;
          });
          setUserPicks(picksInfo);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `picks/user/${user.uid}`);
        });

        // Fetch all pending picks for global hot rating
        const globalQ = query(collection(db, 'picks'), where('status', '==', 'PENDING'));
        unsubGlobalPicks = onSnapshot(globalQ, (globalPickSnap) => {
          const allUpcomingPicks = globalPickSnap.docs.map(d => d.data());
          setGlobalUpcomingPicks(allUpcomingPicks);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'picks/pending');
        });
      } else {
        setUserPicks({});
        setGlobalUpcomingPicks([]);
      }

      // Fetch active sponsors
      const sponsorsQ = query(collection(db, 'sponsors'), where('active', '==', true));
      unsubSponsors = onSnapshot(sponsorsQ, (snap) => {
        if (!snap.empty) {
          const activeSponsors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setSponsors(activeSponsors);
        } else {
          setSponsors([]);
        }
      }, (error) => {
        console.warn("Sponsors list is currently unavailable:", error);
        setSponsors([]);
      });
    };

    setupMatchups();
    setupPicksListeners();

    return () => {
      unsubMatchups();
      unsubPicks();
      unsubGlobalPicks();
      unsubSponsors();
    };
  }, [user]);


  const { totalUpcomingPicks, matchupPickCounts } = React.useMemo(() => {
    let total = 0;
    const counts: Record<string, { total: number, away: number, home: number }> = {};

    globalUpcomingPicks.forEach(p => {
      if (!counts[p.matchupId]) {
        counts[p.matchupId] = { total: 0, away: 0, home: 0 };
      }
      counts[p.matchupId].total += 1;

      const matchup = allFetchedMatchups.find(m => m.gameId === p.matchupId);
      if (matchup && matchup.status === 'STATUS_SCHEDULED') {
         total += 1;
      }

      if (matchup) {
        if (matchup.type === 'OVER_UNDER') {
          if (p.pick?.id === 'OVER') counts[p.matchupId].away += 1;
          else if (p.pick?.id === 'UNDER') counts[p.matchupId].home += 1;
        } else {
          if (p.pick?.id === matchup.awayTeam?.id) counts[p.matchupId].away += 1;
          else if (p.pick?.id === matchup.homeTeam?.id) counts[p.matchupId].home += 1;
        }
      }
    });

    return { totalUpcomingPicks: total, matchupPickCounts: counts };
  }, [globalUpcomingPicks, allFetchedMatchups]);

  const matchups = React.useMemo(() => {
    let now = Date.now();
    
    // Auto-detect if database timestamps are shifted in the future (e.g. sandbox timezone in 2026 vs real browser in 2024)
    const scheduledMatchups = allFetchedMatchups.filter((m: any) => m.status === 'STATUS_SCHEDULED' && !m.abandoned && m.active !== false);
    if (scheduledMatchups.length > 0) {
      const minStartTime = Math.min(...scheduledMatchups.map((m: any) => m.startTime));
      if (minStartTime > now + 48 * 60 * 60 * 1000) {
        // Shift "now" to 1 hour before the first scheduled matchup so they fall in the active upcoming window
        now = minStartTime - 60 * 60 * 1000;
      }
    }

    const next24Hours = now + 24 * 60 * 60 * 1000;

    const filtered = allFetchedMatchups.filter((m: any) => {
      if (m.abandoned) return false;
      if (m.active === false) return false;

      const isFinal = m.status === 'STATUS_FINAL' || m.statusDesc?.toLowerCase().includes('final');
      const isLive = m.status !== 'STATUS_SCHEDULED' && !isFinal && m.status !== 'STATUS_POSTPONED' && m.status !== 'STATUS_CANCELED';

      let isUpcoming = m.status === 'STATUS_SCHEDULED' && m.startTime <= next24Hours && m.startTime > (now - 24 * 60 * 60 * 1000);
      if (m.league === 'PGA' && m.status === 'STATUS_SCHEDULED') {
        isUpcoming = true;
      }

      if (!((isLive || isUpcoming) && !isFinal)) return false;

      if (filterType === 'available' && m.status !== 'STATUS_SCHEDULED') return false;
      if (filterType === 'chain' && !m.featured) return false;

      if (selectedSport === 'FOOTBALL' && !['NFL', 'CFB', 'CFL'].includes(m.league)) return false;
      if (selectedSport === 'SOCCER' && !['MLS', 'LMX', 'EPL', 'NWSL', 'FIFA', 'FRA', 'TUR', 'RPL', 'CHN'].includes(m.league)) return false;
      if (selectedSport === 'BASKETBALL' && !['NBA', 'NBASL', 'MBB', 'WBB', 'WNBA'].includes(m.league)) return false;
      if (selectedSport === 'HOCKEY' && !['NHL'].includes(m.league)) return false;
      if (selectedSport === 'BASEBALL' && !['MLB', 'CBASE'].includes(m.league)) return false;
      if (selectedSport === 'TENNIS' && !['ATP', 'WTA'].includes(m.league)) return false;
      if (selectedSport === 'GOLF' && !['PGA'].includes(m.league)) return false;

      return true;
    });

    filtered.sort((a: any, b: any) => a.startTime - b.startTime);
    return filtered;
  }, [allFetchedMatchups, selectedSport, filterType]);


  const handleForfeitPick = async (matchup: any) => {
    if (!user || !profile) return;

    if (window.confirm("Are you sure you want to forfeit this pick? You will receive a loss and lose your streak.")) {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/picks/forfeit-pick', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ matchupId: matchup.gameId })
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to forfeit pick');
        }
      } catch (error) {
        console.error("Failed to forfeit pick", error);
        alert(error.message || "Failed to forfeit pick.");
      }
    }
  };

  const handleCancelPick = async (matchup: any) => {
    if (!user || !profile) return;

    const isCancelablePGA = matchup.league === 'PGA' && matchup.status === 'STATUS_IN_PROGRESS' && (matchup.statusDesc === 'In Progress' || matchup.statusDesc === 'Delayed');

    if (matchup.status !== 'STATUS_SCHEDULED' && !isCancelablePGA) {
      alert("This game has already started and cannot be cancelled.");
      return;
    }

    try {
      if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
        setUserPicks(prev => {
          const newPicks = { ...prev };
          delete newPicks[matchup.gameId];
          return newPicks;
        });
        return;
      }

      const pickId = user.uid + "_" + matchup.gameId;
      await deleteDoc(doc(db, 'picks', pickId));
    } catch (error) {
      console.error("Failed to cancel pick", error);
      alert("Failed to cancel pick.");
    }
  };

  const handleMakePick = async (matchup: any, team: any) => {
    if (!user) {
        window.location.href = '/login';
        return;
    }
    if (!profile || !chain) return;

    if (matchup.status !== 'STATUS_SCHEDULED') {
        alert("This game has already started.");
        return;
    }

    const activePicks = Object.values(userPicks).filter((p: any) => p.status === 'PENDING');
    const maxPicks = profile?.premium ? 2 : 1;

    if (activePicks.length >= maxPicks && (!userPicks[matchup.gameId] || userPicks[matchup.gameId].status !== 'PENDING')) {
       alert(profile?.premium ? "You already have the maximum of 2 active pending picks." : "You already have an active pending pick. Upgrade to ChainLink Pro to queue picks.");
       return;
    }

    if (userPicks[matchup.gameId]) {
      return; // Already picked
    }

    try {
      const pickId = user.uid + "_" + matchup.gameId;
      const pickDoc = {
        userId: user.uid,
        matchupId: matchup.gameId,
        pick: {
          id: team.id,
          name: team.name,
          image: team.image
        },
        status: 'PENDING',
        links: matchup.cost ?? 0,
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
         setUserPicks(prev => ({ ...prev, [matchup.gameId]: pickDoc }));
         return;
      }

      await setDoc(doc(db, 'picks', pickId), pickDoc);
    } catch (error) {
      console.error("Failed to save pick", error);
      alert("Failed to save pick.");
    }
  };

  const handleShareMatchup = (matchupId: string) => {
    setSharingMatchupId(matchupId);
    setTimeout(async () => {
      const el = document.getElementById(`matchup-card-${matchupId}`);
      if (el) {
        try {
          const htmlToImage = await import('html-to-image');

          const blob = await htmlToImage.toBlob(el, {
              backgroundColor: '#0a0a0a',
              pixelRatio: 2,
          });

          if (!blob) return;

          const file = new File([blob], `chainlink-matchup-${matchupId}.png`, { type: 'image/png' });

          const downloadFromBlob = (b: Blob) => {
             const url = URL.createObjectURL(b);
             downloadFallback(url, matchupId);
             setTimeout(() => URL.revokeObjectURL(url), 100);
          };

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'ChainLink Matchup',
              });
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                 downloadFromBlob(blob);
              }
            }
          } else {
            downloadFromBlob(blob);
          }

        } catch (error) {
          console.error("Failed to share matchup", error);
        }
      }
      setSharingMatchupId(null);
    }, 100);
  };

  const downloadFallback = (dataUrl: string, matchupId: string) => {
    const link = document.createElement('a');
    link.download = `chainlink-matchup-${matchupId}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activePicks = Object.values(userPicks)
    .filter((p: any) => p.status === 'PENDING')
    .sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
  const activePick: any = activePicks[0];
  const queuedPick: any = activePicks[1];
  const activeMatchup = activePick ? allFetchedMatchups.find(m => m.gameId === activePick.matchupId) : null;
  // We don't filter out queuedPick from available matchups below because the instructions say we should just display it underneath My Pick,
  // but let's check if the queued matchup should be filtered out from the main list.
  // Normally the activePick is filtered out. We should probably filter out both activePick and queuedPick.
  const filteredMatchups = matchups.filter(m => !activePicks.find((p: any) => p.matchupId === m.gameId));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

      {activeMatchup && (
        <div className="mb-10 w-full relative group">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-zinc-100">My Pick</h2>
          </div>
          <div className="relative">
            <MatchupCard
              m={activeMatchup}
              user={user}
              profile={profile}
              pickData={userPicks[activeMatchup.gameId]}
              hasActivePickAnywhere={Object.values(userPicks).filter((p: any) => p.status === 'PENDING')}
              mCounts={matchupPickCounts[activeMatchup.gameId]}
              sponsors={sponsors}
              onMakePick={handleMakePick}
              onCancelPick={handleCancelPick}
              onForfeitPick={handleForfeitPick}
              onShareMatchup={handleShareMatchup}
              sharingMatchupId={sharingMatchupId}
              isMyPick={true}
            />
          </div>
          {queuedPick && (() => {
            const queuedMatchup = allFetchedMatchups.find(m => m.gameId === queuedPick.matchupId);
            if (!queuedMatchup) return null;
            return (
              <div className="mt-4 bg-[#111111] border border-fuchsia-500/50 rounded-xl p-4 flex items-center justify-between shadow-[0_0_15px_rgba(217,70,239,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#27272a] flex items-center justify-center p-1 shadow-inner">
                    {queuedPick.pick.image ? (
                       <FirebaseImage src={queuedPick.pick.image} alt={queuedPick.pick.name} className="w-full h-full object-contain" />
                    ) : (
                       <span className="text-xs font-bold text-zinc-500">{queuedPick.pick.name}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-fuchsia-400 font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                       <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
                       </span>
                       Queued Pick: {queuedPick.pick.name}
                    </div>
                    <div className="text-zinc-500 text-xs mt-0.5 truncate max-w-[200px] sm:max-w-md">
                      {queuedMatchup.type === 'SOCCER_SCORE' ? `${queuedMatchup.awayTeam.name} @ ${queuedMatchup.homeTeam.name}` : queuedMatchup.title}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleCancelPick(queuedMatchup)} className="text-xs font-bold text-zinc-500 hover:text-red-500 transition-colors uppercase tracking-wide flex items-center gap-1 bg-[#1a1a1a] px-3 py-1.5 rounded-md border border-[#27272a] hover:border-red-500/50">
                  Cancel
                </button>
              </div>
            );
          })()}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 border-b border-zinc-800/80 pb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
          <Button variant={filterType === 'all' ? "secondary" : "ghost"} onClick={() => setFilterType('all')} className={cn("rounded-lg px-6 h-9", filterType === 'all' ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none" : "text-zinc-400 hover:text-zinc-200")}>All</Button>
          <Button variant={filterType === 'available' ? "secondary" : "ghost"} onClick={() => setFilterType('available')} className={cn("rounded-lg px-6 h-9", filterType === 'available' ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none" : "text-zinc-400 hover:text-zinc-200")}>Available</Button>
          <Button variant={filterType === 'chain' ? "secondary" : "ghost"} onClick={() => setFilterType('chain')} className={cn("rounded-lg px-6 h-9", filterType === 'chain' ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-none" : "text-zinc-400 hover:text-zinc-200")}>Chain Builder</Button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800">
          <Button variant="ghost" onClick={() => setSelectedSport(null)} className={cn("rounded-lg px-4 h-9 font-medium", selectedSport === null ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}>All</Button>
          <Button variant="ghost" onClick={() => setSelectedSport('FOOTBALL')} className={cn("rounded-lg px-3 h-9", selectedSport === 'FOOTBALL' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsFootball style={{width: "20px", height: "20px"}} /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('SOCCER')} className={cn("rounded-lg px-3 h-9", selectedSport === 'SOCCER' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsSoccer style={{width: "20px", height: "20px"}} /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('BASKETBALL')} className={cn("rounded-lg px-3 h-9", selectedSport === 'BASKETBALL' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsBasketball style={{width: "20px", height: "20px"}} /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('HOCKEY')} className={cn("rounded-lg px-3 h-9", selectedSport === 'HOCKEY' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsHockey style={{width: "20px", height: "20px"}} /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('BASEBALL')} className={cn("rounded-lg px-3 h-9", selectedSport === 'BASEBALL' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsBaseball style={{width: "20px", height: "20px"}} /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('TENNIS')} className={cn("rounded-lg px-3 h-9", selectedSport === 'TENNIS' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsTennis style={{width: "20px", height: "20px"}} /></Button>
          <Button variant="ghost" onClick={() => setSelectedSport('GOLF')} className={cn("rounded-lg px-3 h-9", selectedSport === 'GOLF' ? "bg-zinc-950 text-zinc-100" : "text-zinc-400 hover:text-zinc-200")}><MdOutlineSportsGolf style={{width: "20px", height: "20px"}} /></Button>
        </div>
      </div>

      {matchups.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No matchups available right now.</p>
          {profile?.role === "ADMIN" && (
            <p className="text-sm mt-2">Click "Admin: Sync ESPN Games" to fetch active schedules.</p>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {filteredMatchups.map((m, index) => (
            <React.Fragment key={m.gameId || index}>
              <MatchupCard
                m={m}
                user={user}
                profile={profile}
                pickData={userPicks[m.gameId]}
                hasActivePickAnywhere={Object.values(userPicks).filter((p: any) => p.status === 'PENDING')}
                mCounts={matchupPickCounts[m.gameId]}
                sponsors={sponsors}
                onMakePick={handleMakePick}
                onCancelPick={handleCancelPick}
              onForfeitPick={handleForfeitPick}
                onShareMatchup={handleShareMatchup}
                sharingMatchupId={sharingMatchupId}
                isMyPick={false}
              />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Sponsor Badges */}
      {sponsors.filter(s => s.featured).length > 0 && (
        <div className="pt-12 mt-12 mb-4 border-t border-zinc-800/50">
            <p className="text-center text-xs text-zinc-500 uppercase font-bold tracking-wider mb-6">Sponsored By</p>
            <div className="flex flex-wrap items-center justify-center gap-8 transition-all duration-300">
               {sponsors.filter(s => s.featured).sort((a, b) => (a.order || 0) - (b.order || 0)).map(sponsor => (
                 <a
                   key={sponsor.id}
                   href={sponsor.url ? (sponsor.url.startsWith('http') ? sponsor.url : `https://${sponsor.url}`) : '#'}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="opacity-50 hover:opacity-100 transition-opacity flex items-center justify-center grayscale hover:grayscale-0"
                   title={sponsor.name}
                 >
                   {sponsor.image ? (
                     <FirebaseImage src={sponsor.image} fallback="/logo.png" alt={sponsor.name} className="h-16 md:h-24 object-contain" />
                   ) : (
                     <div className="text-zinc-400 font-bold text-lg font-display tracking-tight">{sponsor.name}</div>
                   )}
                 </a>
               ))}
            </div>
        </div>
      )}

      <div className="mt-8 mb-8 px-4 text-center text-[10px] text-zinc-600/40 max-w-4xl mx-auto leading-relaxed">
        <p>&copy; {new Date().getFullYear()} Club 602. All rights reserved.</p>
        <p className="mt-1">
          DISCLAIMER: This site is not affiliated, associated, authorized, endorsed by, or in any way officially connected with any network, team, league or its subsidiaries or its affiliates. All logos, brands, and other trademarks or images featured or referred to within this website are the property of their respective trademark holders.
        </p>
      </div>
    </div>
  );
}
