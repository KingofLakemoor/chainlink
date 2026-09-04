import { CharityBanner } from '../../components/pickem/CharityBanner';
import { CharityProgressTracker } from '../../components/pickem/CharityProgressTracker';
import { FirebaseImage } from '../../components/ui/FirebaseImage';
import { getTeamShortName } from '../../lib/teamUtils';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, doc, query, where, setDoc, getDoc, deleteDoc, documentId, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Layers, CheckCircle, Trophy, Lock, XCircle, Star, HelpCircle, AlertTriangle, ChevronRight, ExternalLink } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [userPicks, setUserPicks] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [matchupsLoading, setMatchupsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'matchups' | 'leaderboard'>('matchups');
  const [leaderboardView, setLeaderboardView] = useState<'season' | 'week'>('season');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [allCampaignMatchups, setAllCampaignMatchups] = useState<any[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [joining, setJoining] = useState(false);
  const autoJoinAttempted = useRef<Record<string, boolean>>({});
  const [isEliminated, setIsEliminated] = useState(false);
  const [usedTeams, setUsedTeams] = useState<Set<string>>(new Set());
  const [charityProgress, setCharityProgress] = useState<{ pot: number } | null>(null);

  useEffect(() => {
    const fetchCharityProgress = async () => {
      try {
        const res = await fetch('/api/charity/progress');
        if (res.ok) {
          const data = await res.json();
          setCharityProgress(data);
        }
      } catch (err) {
        console.error("Failed to fetch charity progress for leaderboard banner", err);
      }
    };
    fetchCharityProgress();
  }, []);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const snap = await getDocs(collection(db, 'pickemCampaigns'));
        let allCamps = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

        let joinedIds = new Set<string>();
        if (user) {
          const partQuery = query(collection(db, 'pickemParticipants'), where('participantId', '==', user.uid));
          const picksQuery = query(collection(db, 'pickemPicks'), where('participantId', '==', user.uid));
          const partUserQuery = query(collection(db, 'pickemParticipants'), where('userId', '==', user.uid));
          const picksUserQuery = query(collection(db, 'pickemPicks'), where('userId', '==', user.uid));

          const [partSnap, picksSnap, partUserSnap, picksUserSnap] = await Promise.all([
            getDocs(partQuery).catch(() => ({ docs: [] })),
            getDocs(picksQuery).catch(() => ({ docs: [] })),
            getDocs(partUserQuery).catch(() => ({ docs: [] })),
            getDocs(picksUserQuery).catch(() => ({ docs: [] }))
          ]);

          [...(partSnap as any).docs, ...(partUserSnap as any).docs].forEach((d: any) => {
            const cid = d.data().campaignId;
            if (cid) joinedIds.add(cid);
          });
          [...(picksSnap as any).docs, ...(picksUserSnap as any).docs].forEach((d: any) => {
            const cid = d.data().campaignId;
            if (cid) joinedIds.add(cid);
          });
        }

        let camps = allCamps.filter((c: any) => {
          if (joinedIds.has(c.id)) return true; // Always keep if user joined or submitted picks
          if (campaignId === c.id) return true; // Always keep if specifically requested in URL
          const isArch = c.isArchived === true || c.isArchived === 'true' || c.archived === true || c.archived === 'true';
          if (isArch) return false;
          return true; // Show all non-archived campaigns
        });
        
        camps.sort((a, b) => {
          const aEnd = a.endDate || 0;
          const bEnd = b.endDate || 0;
          return bEnd - aEnd;
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
          const defaultWeek = (initialCampaign.currentWeek !== undefined && initialCampaign.currentWeek !== null)
            ? initialCampaign.currentWeek
            : (initialCampaign.hasWeekZero ? 0 : 1);
          setSelectedWeek(defaultWeek);
          if (user) {
            const pairId = `${initialCampaign.id}_${user.uid}`;
            const docRef = await getDoc(doc(db, 'pickemParticipants', pairId));
            let userIsParticipant = docRef.exists();

            if (!userIsParticipant) {
              // Check if user has picks submitted for this campaign
              const pCheckQuery = query(
                collection(db, 'pickemPicks'),
                where('participantId', '==', user.uid)
              );
              const pCheckSnap = await getDocs(pCheckQuery);
              userIsParticipant = pCheckSnap.docs.some(d => d.data().campaignId === initialCampaign.id);

              if (userIsParticipant) {
                // Auto-heal missing participant record for this campaign
                user.getIdToken().then(token => {
                  fetch('/api/pickem/join', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ campaignId: initialCampaign.id })
                  }).catch(err => console.error("Auto-heal join error in PickEmPage:", err));
                }).catch(console.error);
              }
            }

            setIsParticipant(userIsParticipant);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  
  const handleJoinCampaign = async () => {
    if (!user || !selectedCampaign) return;
    setJoining(true);
    try {
      const storedCode = localStorage.getItem('chainlink_join_code') || '';
      const urlCode = searchParams.get('joinCode') || searchParams.get('code') || storedCode || selectedCampaign.joinCode || '';
      const token = await user.getIdToken();
      const res = await fetch('/api/pickem/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId: selectedCampaign.id, ...(urlCode ? { joinCode: urlCode.trim() } : {}) })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join campaign');
      }
      localStorage.removeItem('chainlink_join_code');
      setIsParticipant(true);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to join campaign.');
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (user && selectedCampaign && !isParticipant && !joining && !loading) {
      const campId = selectedCampaign.id;
      if (autoJoinAttempted.current[campId]) return;

      const storedCode = localStorage.getItem('chainlink_join_code') || '';
      const urlCode = (searchParams.get('joinCode') || searchParams.get('code') || storedCode || '').trim();

      // Auto-join if user came in with a join code, or if campaign is public & open
      const canAutoJoin = !!urlCode || (!selectedCampaign.isPrivate && selectedCampaign.isOpen !== false);
      if (canAutoJoin) {
        autoJoinAttempted.current[campId] = true;
        handleJoinCampaign();
      }
    }
  }, [user, selectedCampaign, isParticipant, loading]);

  const fetchMatchupsAndPicks = async (campaignId: string, week: number) => {
    setMatchupsLoading(true);
    try {
      const mQuery = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', campaignId)
      );
      const mSnap = await getDocs(mQuery);
      setMatchups(mSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => m.week === week).sort((a: any, b: any) => a.startTime - b.startTime));

      if (user) {
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('participantId', '==', user.uid)
        );
        const pSnap = await getDocs(pQuery);
        const picksMap: Record<string, any> = {};
        pSnap.docs.forEach(d => {
          const data = d.data();
          if (data.campaignId === campaignId && data.week === week) {
             picksMap[data.matchupId] = { id: d.id, ...data };
          }
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
    if (selectedCampaign && selectedWeek !== undefined && selectedWeek !== null) {
      // Fetch matchups even if user is not authenticated (for leaderboard)
      fetchMatchupsAndPicks(selectedCampaign.id, selectedWeek);
    }
  }, [selectedCampaign, selectedWeek, user]);

  useEffect(() => {
    const fetchSurvivorState = async () => {
      if (!user || !selectedCampaign || selectedCampaign.format !== 'SURVIVOR') {
        setUsedTeams(new Set());
        setIsEliminated(false);
        return;
      }

      try {
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('participantId', '==', user.uid)
        );
        const pSnap = await getDocs(pQuery);

        const used = new Set<string>();
        let eliminated = false;

        pSnap.docs.forEach(d => {
          const data = d.data();
          if (data.campaignId !== selectedCampaign.id) return;
          if (data.week !== selectedWeek && data.pick?.teamId) {
            used.add(data.pick.teamId);
          }
          if (data.status === 'LOSS') {
            eliminated = true;
          }
        });

        setUsedTeams(used);
        setIsEliminated(eliminated);
      } catch (err) {
        console.error("Failed to fetch survivor state:", err);
      }
    };

    fetchSurvivorState();
  }, [user, selectedCampaign, selectedWeek]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!selectedCampaign || activeTab !== 'leaderboard') return;

      setLeaderboardLoading(true);
      try {
        // Fetch all joined participants for this campaign so everyone shows on the leaderboard and counts towards prize pot
        const partQuery = query(
          collection(db, 'pickemParticipants'),
          where('campaignId', '==', selectedCampaign.id),
          limit(3000)
        );
        const partSnap = await getDocs(partQuery);

        const participantStats: Record<string, { wins: number, losses: number, pushes: number, points: number, picks: any[] }> = {};
        partSnap.docs.forEach(d => {
          const data = d.data();
          if (data.participantId) {
            participantStats[data.participantId] = { wins: 0, losses: 0, pushes: 0, points: 0, picks: [] };
          }
        });

        // Limited to recent picks to prevent O(N) client-side memory lockups
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('campaignId', '==', selectedCampaign.id),
          limit(3000)
        );
        const pSnap = await getDocs(pQuery);

        pSnap.docs.forEach(d => {
          const pick = { id: d.id, ...d.data() } as any;
          const pId = pick.participantId;
          if (!participantStats[pId]) {
            participantStats[pId] = { wins: 0, losses: 0, pushes: 0, points: 0, picks: [] };
          }

          participantStats[pId].picks.push(pick);
          if (leaderboardView === 'week' && pick.week !== selectedWeek) return;

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
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const chunkedUids = [];
          for (let i = 0; i < participantIds.length; i += 50) {
            chunkedUids.push(participantIds.slice(i, i + 50));
          }

          await Promise.all(chunkedUids.map(async (chunk) => {
            const res = await fetch(`/api/users/public?uids=${chunk.join(',')}`, { headers });
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

        // Fetch all campaign matchups to evaluate tiebreaker games for all weeks or selected week
        const allMQuery = query(
          collection(db, 'pickemMatchups'),
          where('campaignId', '==', selectedCampaign.id)
        );
        const allMSnap = await getDocs(allMQuery);
        const campaignMatchups = allMSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setAllCampaignMatchups(campaignMatchups);

        const formattedLeaderboard = participantIds.map(uid => {
           let tbValue = Infinity;
           let tbDisplay: any = '-';

           if (leaderboardView === 'week') {
             const weekMatchups = campaignMatchups.filter((m: any) => m.week === selectedWeek);
             const weekTbMatchup = weekMatchups.find((m: any) => m.isTiebreaker);
             if (weekTbMatchup) {
               const tbPick = participantStats[uid].picks.find((p: any) => p.matchupId === weekTbMatchup.id && p.tiebreakerTotal !== undefined && p.tiebreakerTotal !== null);
               if (weekTbMatchup.status === 'STATUS_FINAL') {
                 const actualTotal = Number(weekTbMatchup.homeScore ?? weekTbMatchup.homeTeam?.score ?? 0) + Number(weekTbMatchup.awayScore ?? weekTbMatchup.awayTeam?.score ?? 0);
                 if (tbPick) {
                   tbValue = Math.abs(tbPick.tiebreakerTotal - actualTotal);
                   tbDisplay = tbValue;
                 } else {
                   tbValue = 100;
                   tbDisplay = 100;
                 }
               } else {
                 if (tbPick) {
                   tbDisplay = tbPick.tiebreakerTotal;
                 }
               }
             }
           } else {
             // Season view: running total of absolute values from completed tiebreaker weeks
             const completedTbMatchups = campaignMatchups.filter((m: any) => m.isTiebreaker && m.status === 'STATUS_FINAL');
             if (completedTbMatchups.length > 0) {
               let runningTotal = 0;
               completedTbMatchups.forEach((m: any) => {
                 const actualTotal = Number(m.homeScore ?? m.homeTeam?.score ?? 0) + Number(m.awayScore ?? m.awayTeam?.score ?? 0);
                 const tbPick = participantStats[uid].picks.find((p: any) => p.matchupId === m.id && p.tiebreakerTotal !== undefined && p.tiebreakerTotal !== null);
                 if (tbPick) {
                   runningTotal += Math.abs(tbPick.tiebreakerTotal - actualTotal);
                 } else {
                   runningTotal += 100;
                 }
               });
               tbValue = runningTotal;
               tbDisplay = runningTotal;
             }
           }

           return {
               uid,
               name: usersMap[uid]?.username || usersMap[uid]?.displayName || 'Unknown User',
               avatar: usersMap[uid]?.image || usersMap[uid]?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
               tbValue,
               tbDisplay,
               ...participantStats[uid]
           };
        }).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points; // Sort by points
            if (a.tbValue !== b.tbValue) {
                return a.tbValue - b.tbValue; // Lower distance/total wins
            }
            return 0;
        });

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
  }, [selectedCampaign, activeTab, leaderboardView, selectedWeek, matchups]);

  
  const userPicksRef = useRef<Record<string, any>>({});
  userPicksRef.current = userPicks;

  const tiebreakerTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const handleTiebreakerChange = (matchup: any, rawVal: string) => {
    if (!user || !selectedCampaign) return;

    const isLocked = matchup.status !== 'STATUS_SCHEDULED' || (!!matchup.startTime && Date.now() >= matchup.startTime);
    if (isLocked) {
      alert("This matchup is locked. Tiebreaker score cannot be changed.");
      return;
    }

    const trimmed = rawVal.trim();
    const total = trimmed === '' ? null : parseInt(trimmed, 10);
    if (total !== null && (isNaN(total) || total < 0)) return;

    const existingPick = userPicksRef.current[matchup.id];

    if (total === null && !existingPick?.pick?.teamId) {
      if (tiebreakerTimeoutRef.current[matchup.id]) {
        clearTimeout(tiebreakerTimeoutRef.current[matchup.id]);
      }
      handleClearPick(matchup);
      return;
    }

    const pickId = existingPick?.id || `${selectedCampaign.id}_${selectedWeek}_${matchup.id}_${user.uid}`;

    const updatedPick = {
      ...existingPick,
      id: pickId,
      campaignId: selectedCampaign.id,
      participantId: user.uid,
      matchupId: matchup.id,
      week: selectedWeek,
      tiebreakerTotal: total,
      status: existingPick?.status || 'PENDING',
      createdAt: existingPick?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if (existingPick?.pick) {
      updatedPick.pick = existingPick.pick;
    }

    setUserPicks(prev => ({
      ...prev,
      [matchup.id]: updatedPick
    }));

    if (tiebreakerTimeoutRef.current[matchup.id]) {
      clearTimeout(tiebreakerTimeoutRef.current[matchup.id]);
    }

    tiebreakerTimeoutRef.current[matchup.id] = setTimeout(async () => {
      try {
        const currentRefPick = userPicksRef.current[matchup.id];
        const pickRef = doc(db, 'pickemPicks', pickId);

        const payload: any = {
          campaignId: selectedCampaign.id,
          participantId: user.uid,
          matchupId: matchup.id,
          week: selectedWeek,
          tiebreakerTotal: total,
          status: currentRefPick?.status || 'PENDING',
          createdAt: currentRefPick?.createdAt || Date.now(),
          updatedAt: Date.now()
        };

        if (currentRefPick?.pick) {
          payload.pick = currentRefPick.pick;
        }

        await setDoc(pickRef, payload, { merge: true });
      } catch (e: any) {
        console.error("Failed to update tiebreaker", e);
        alert("Failed to save tiebreaker score: " + (e.message || String(e)));
      }
    }, 400);
  };

  const handleClearPick = async (matchup: any) => {
    if (!user || !selectedCampaign) return;
    if (isEliminated && selectedCampaign.format === 'SURVIVOR') return;
    if (matchup.status !== 'STATUS_SCHEDULED' || (!!matchup.startTime && Date.now() >= matchup.startTime)) return;

    if (tiebreakerTimeoutRef.current[matchup.id]) {
      clearTimeout(tiebreakerTimeoutRef.current[matchup.id]);
    }

    try {
      const pickId = userPicks[matchup.id]?.id || `${selectedCampaign.id}_${selectedWeek}_${matchup.id}_${user.uid}`;
      const pickRef = doc(db, 'pickemPicks', pickId);
      await deleteDoc(pickRef);
      setUserPicks(prev => {
        const next = { ...prev };
        delete next[matchup.id];
        return next;
      });
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Missing or insufficient permissions")) {
         alert('Unable to clear pick. Missing permission or game is locked.');
      } else {
         alert('Failed to clear pick: ' + (err.message || String(err)));
      }
    }
  };

  const handlePick = async (matchup: any, teamId: string) => {
    if (!user || !selectedCampaign) return;
    if (matchup.status !== 'STATUS_SCHEDULED' || (!!matchup.startTime && Date.now() >= matchup.startTime)) return;

    try {
      const pickId = `${selectedCampaign.id}_${selectedWeek}_${matchup.id}_${user.uid}`;
      const pickRef = doc(db, 'pickemPicks', pickId);

      const existingPick = userPicks[matchup.id];

      if (tiebreakerTimeoutRef.current[matchup.id]) {
        clearTimeout(tiebreakerTimeoutRef.current[matchup.id]);
      }

      if (existingPick?.pick?.teamId === teamId) {
        // Unselect if clicking the same team
        await handleClearPick(matchup);
        return;
      }

      // Check pick limit before adding a new pick (skip if replacing existing pick in same matchup)
      const isNewTeamPick = !existingPick?.pick?.teamId;
      if (isNewTeamPick && selectedCampaign.pickLimit > 0 && selectedCampaign.name !== 'YES Day Walk for Autism 2026') {
        const currentPicksCount = Object.values(userPicks).filter((p: any) => p.pick?.teamId).length;
        if (currentPicksCount >= selectedCampaign.pickLimit) {
          alert(`You have reached the maximum of ${selectedCampaign.pickLimit} picks for this week.`);
          return;
        }
      }

      const newPick: any = {
        campaignId: selectedCampaign.id,
        participantId: user.uid,
        matchupId: matchup.id,
        week: selectedWeek,
        pick: { teamId },
        status: 'PENDING',
        pointsEarned: existingPick?.pointsEarned || 0,
        submittedAt: Date.now(),
        createdAt: existingPick?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      if (existingPick?.tiebreakerTotal !== undefined) {
        newPick.tiebreakerTotal = existingPick.tiebreakerTotal;
      }
      if (existingPick?.confidence !== undefined) {
        newPick.confidence = existingPick.confidence;
        newPick.pointsEarned = existingPick.confidence;
      }

      await setDoc(pickRef, newPick, { merge: true });
      setUserPicks(prev => ({ ...prev, [matchup.id]: { id: pickId, ...newPick } }));
    } catch (err: any) {
      console.error('Failed to save pick', err);
      alert('Failed to save pick: ' + (err.message || String(err)));
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
            <FirebaseImage src={theme.logoUrl} alt={title} className="w-10 h-10 object-contain" loading="lazy" />
          ) : (
            <Layers className="w-8 h-8" style={{ color: primaryColor }} />
          )}
          {title}
        </h1>
        <p className="text-zinc-400 text-lg mb-4">{subtitle}</p>
        
        {selectedCampaign?.name !== 'YES Day Walk for Autism 2026' && (selectedCampaign?.defaultMatchType !== 'STANDARD' || matchups.some(m => m.type === 'SPREAD')) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-amber-200 text-sm max-w-3xl mt-6">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-amber-400">Note on Spreads</p>
              <p>NFL and CFB spreads lock for the week on <strong>Thursday morning at 2 AM AZ Time</strong>. Please verify your picks before the lock to ensure the spread didn't shift on you.</p>
            </div>
          </div>
        )}
      </div>

      {selectedCampaign && !isParticipant && (() => {
        const isCharity = selectedCampaign.isCharity || selectedCampaign.name === 'YES Day Walk for Autism 2026' || selectedCampaign.id === 'charity';
        return (
          <div className="max-w-3xl mx-auto my-12 space-y-6">
            {isCharity && <CharityBanner />}

            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 md:p-12 text-center relative z-10 shadow-xl">
               <Layers className="w-16 h-16 text-[#22c55e] mx-auto mb-4" />
               <h2 className="text-3xl font-bold text-white mb-4">Join {selectedCampaign.theme?.title || selectedCampaign.name}</h2>
               <p className="text-zinc-400 text-lg mb-8">
                 {isCharity
                   ? "Once you have made your donation, click below to enter the league and make your picks."
                   : (selectedCampaign.theme?.subtitle || "Click below to enter the league and start making your weekly picks!")}
               </p>
               <Button size="lg" onClick={handleJoinCampaign} disabled={joining} className="px-10 h-12 text-lg font-bold">{joining ? 'Joining...' : 'Join Campaign Now'}</Button>
            </div>
          </div>
        );
      })()}
      {selectedCampaign && isParticipant && (
        <>
          {selectedCampaign.name === 'YES Day Walk for Autism 2026' && (
            <div className="w-full mb-8">
              <CharityProgressTracker />
            </div>
          )}
      {isEliminated && selectedCampaign?.format === 'SURVIVOR' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center font-medium mb-6">
           <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
           You have been eliminated from this Survivor campaign due to an incorrect pick. Better luck next year!
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          
          <Button variant="ghost" onClick={() => navigate('/pickem')} className="text-zinc-400 hover:text-white">
            <ChevronRight className="w-5 h-5 rotate-180 mr-1" />
            Back to Pick'em Dashboard
          </Button>


          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="bg-[#121212] border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-medium"
          >
            {[...Array(selectedCampaign?.hasWeekZero ? (selectedCampaign?.totalWeeks || 18) + 1 : (selectedCampaign?.totalWeeks || 18))].map((_, i) => {
              const weekNum = selectedCampaign?.hasWeekZero ? i : i + 1;
              const ws = selectedCampaign?.weekSettings?.[weekNum];
              const customLabel = ws?.label;
              const isVisible = ws?.isVisible !== false;
              
              if (!isVisible && profile?.role !== 'ADMIN') return null;
              
              return (
                <option key={weekNum} value={weekNum}>
                  {customLabel ? customLabel : `Week ${weekNum}`}
                </option>
              );
            })}
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
          {(selectedCampaign?.weekSettings?.[selectedWeek]?.isVisible === false && profile?.role !== 'ADMIN') ? (
            <div className="text-center py-12 bg-[#121212] border border-zinc-800 rounded-xl">
              <h3 className="text-xl font-bold text-white mb-2">Week {selectedWeek} Not Yet Available</h3>
              <p className="text-zinc-400">The matchups for this week are currently being finalized. Please check back later.</p>
            </div>
          ) : (
            <>
          {(() => {
             if (selectedCampaign?.format === 'CONFIDENCE') {
                const confidences = Object.values(userPicks).map(p => p.confidence).filter(c => c !== undefined && c !== null && c > 0);
                const uniqueConfidences = new Set(confidences);
                const duplicates = confidences.filter((item, index) => confidences.indexOf(item) !== index);
                const maxPoints = selectedCampaign.pickLimit > 0 ? selectedCampaign.pickLimit : matchups.length;
                
                const isMissing = uniqueConfidences.size < maxPoints;
                const hasDuplicates = duplicates.length > 0;
                
                if (hasDuplicates) {
                   return (
                      <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-4">
                         <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                         <div>
                            <h3 className="text-red-400 font-bold">Invalid Confidence Points</h3>
                            <p className="text-red-400/80 text-sm mt-1">You have assigned the same confidence value to multiple games. Each pick must have a unique point value between 1 and {maxPoints}. Please fix the duplicate values: {Array.from(new Set(duplicates)).join(', ')}</p>
                         </div>
                      </div>
                   );
                }
             }
             return null;
          })()}
          {selectedCampaign && (
            <div className="mb-6 p-4 bg-[#18181A] border border-zinc-800 rounded-xl flex items-center justify-between">
               <div>
                  <div className="flex items-center gap-2">
                     <h3 className="text-white font-bold">{selectedCampaign.pickLimit > 0 ? "Weekly Pick Limit" : "Weekly Picks"}</h3>
                     <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20">
                       <CheckCircle className="w-3 h-3" /> Auto-saved
                     </span>
                  </div>
                  <p className="text-sm text-zinc-400">
                     {selectedCampaign.pickLimit > 0 
                        ? `You can make up to ${selectedCampaign.pickLimit} picks for this campaign per week.`
                        : "Picks are saved automatically as you make them. Make sure you don't miss any games!"}
                  </p>
               </div>
               <div className="text-2xl font-black" style={{ color: primaryColor }}>
                 {Object.values(userPicks).filter((p: any) => p.pick?.teamId).length} <span className="text-lg text-zinc-500">/ {selectedCampaign.pickLimit > 0 ? Math.min(selectedCampaign.pickLimit, matchups.length) : matchups.length}</span>
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
                const isLocked = m.status !== 'STATUS_SCHEDULED' || (!!m.startTime && Date.now() >= m.startTime);
                const hasSelection = !!(
                  pick?.pick?.teamId ||
                  (pick?.tiebreakerTotal !== undefined && pick?.tiebreakerTotal !== null) ||
                  pick?.confidence
                );

                const isYesDay = selectedCampaign?.name === 'YES Day Walk for Autism 2026';
                const isSpread = !isYesDay && m.type === 'SPREAD' && m.metadata?.spread !== undefined;
                const spread = m.metadata?.spread || 0;

                const isSpreadPendingLock = isSpread && (m.league === 'CFB' || m.league === 'NFL') && !m.metadata?.spreadLocked;

                const hasMoneyline = m.metadata?.mlAway !== undefined && m.metadata?.mlHome !== undefined && m.metadata?.mlAway !== null && m.metadata?.mlHome !== null;
                const isAwayFavorite = hasMoneyline
                  ? Number(m.metadata.mlAway) < Number(m.metadata.mlHome)
                  : (m.metadata?.spread !== undefined ? Number(m.metadata.spread) > 0 : false);
                const isHomeFavorite = hasMoneyline
                  ? Number(m.metadata.mlHome) < Number(m.metadata.mlAway)
                  : (m.metadata?.spread !== undefined ? Number(m.metadata.spread) < 0 : false);

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
disabled={isLocked || (selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id))}

                        className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors
                          ${pick?.pick?.teamId === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id)
                            ? '' // dynamic styles below
                            : 'border-zinc-800 hover:border-zinc-600 bg-[#18181A]'}
                          ${isLocked && pick?.pick?.teamId !== (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        style={pick?.pick?.teamId === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) ? (() => { const s = getPickStyle(pick, isLocked); return s ? { borderColor: s.borderColor, backgroundColor: s.backgroundColor } : undefined; })() : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <FirebaseImage src={m.type === 'OVER_UNDER' ? '/images/over.png' : m.awayTeam.image} alt={m.type === 'OVER_UNDER' ? 'OVER' : getTeamShortName(m, false)} className="w-8 h-8 object-contain" loading="lazy" />
                            {profile?.premium && isAwayFavorite && m.type !== 'OVER_UNDER' && (
                              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shadow-md border border-[#131415] z-10" title="Betting Favorite">
                                <Star className="w-2.5 h-2.5 text-white fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-row items-baseline gap-2">
                            <span className="font-bold text-white">{m.type === 'OVER_UNDER' ? 'OVER' : getTeamShortName(m, false)}</span>
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
                          {(selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id)) && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">USED</span>}
                        </div>
                        {pick?.pick?.teamId === (m.type === 'OVER_UNDER' ? 'OVER' : m.awayTeam.id) && (() => {
                          const style = getPickStyle(pick, isLocked);
                          if (!style) return null;
                          const IconComponent = style.icon === 'Lock' ? Lock : (style.icon === 'XCircle' ? XCircle : CheckCircle);
                          return <IconComponent className="w-5 h-5" style={{ color: style.color }} />;
                        })()}
                      </button>

                      {m.type === 'PROP' ? <div className="text-center text-xs text-zinc-600 font-bold uppercase">VS</div> : <div className="text-center text-xs text-zinc-600 font-bold uppercase">@</div>}

                      <button
onClick={() => handlePick(m, m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)}
disabled={isLocked || (selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id))}

                        className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors
                          ${pick?.pick?.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)
                            ? '' // dynamic styles below
                            : 'border-zinc-800 hover:border-zinc-600 bg-[#18181A]'}
                          ${isLocked && pick?.pick?.teamId !== (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        style={pick?.pick?.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) ? (() => { const s = getPickStyle(pick, isLocked); return s ? { borderColor: s.borderColor, backgroundColor: s.backgroundColor } : undefined; })() : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <FirebaseImage src={m.type === 'OVER_UNDER' ? '/images/under.png' : m.homeTeam.image} alt={m.type === 'OVER_UNDER' ? 'UNDER' : getTeamShortName(m, true)} className="w-8 h-8 object-contain" loading="lazy" />
                            {profile?.premium && isHomeFavorite && m.type !== 'OVER_UNDER' && (
                              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shadow-md border border-[#131415] z-10" title="Betting Favorite">
                                <Star className="w-2.5 h-2.5 text-white fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-row items-baseline gap-2">
                            <span className="font-bold text-white">{m.type === 'OVER_UNDER' ? 'UNDER' : getTeamShortName(m, true)}</span>
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
                          {(selectedCampaign?.format === 'SURVIVOR' && usedTeams.has(m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id)) && <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">USED</span>}
                        </div>
                        {pick?.pick?.teamId === (m.type === 'OVER_UNDER' ? 'UNDER' : m.homeTeam.id) && (() => {
                          const style = getPickStyle(pick, isLocked);
                          if (!style) return null;
                          const IconComponent = style.icon === 'Lock' ? Lock : (style.icon === 'XCircle' ? XCircle : CheckCircle);
                          return <IconComponent className="w-5 h-5" style={{ color: style.color }} />;
                        })()}
                      </button>

                      
                      {m.isTiebreaker && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                           <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Tiebreaker Matchup</label>
                           <p className="text-zinc-400 text-sm mb-2">Predict the total combined score for this game.</p>
                           <input
                             type="number"
                             min="0"
                             placeholder="Total Score (e.g. 45)"
                             value={userPicks[m.id]?.tiebreakerTotal !== undefined && userPicks[m.id]?.tiebreakerTotal !== null ? userPicks[m.id].tiebreakerTotal : ''}
                             onChange={(e) => handleTiebreakerChange(m, e.target.value)}
                             disabled={isLocked}
                             className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                           />
                        </div>
                      )}

                      
                      {selectedCampaign?.format === 'CONFIDENCE' && pick && (
                        <div className="mt-4 p-3 bg-[#18181A] border border-zinc-800 rounded-lg">
                           <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Confidence Points</label>
                           <p className="text-zinc-500 text-sm mb-2">Assign points to this pick (e.g. 1 to 10)</p>
                           <input
                             type="number"
                             min="1"
                             placeholder="Points"
                             value={pick.confidence || ''}
                             onChange={(e) => {
                               const conf = parseInt(e.target.value) || 1;
                               if (!userPicks[m.id]?.id) return;
                               const pickIdToUpdate = userPicks[m.id].id;
                               setUserPicks(prev => ({
                                 ...prev,
                                 [m.id]: { ...prev[m.id], confidence: conf }
                               }));
                               
                               updateDoc(doc(db, 'pickemPicks', pickIdToUpdate), { confidence: conf, pointsEarned: conf })
                                 .catch((err) => {
                                   console.error("Failed to update confidence", err);
                                   alert("Failed to save confidence points: " + (err.message || String(err)));
                                 });
                             }}
                             disabled={isLocked}
                             className="w-full bg-[#121212] border border-zinc-700 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                           />
                        </div>
                      )}

                      {hasSelection && !isLocked && (
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
        </>
      )}

      {activeTab === 'leaderboard' && (
        
          <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
          {/* Prize Pool Summary Banner */}
          {(() => {
            const isYesDayCampaign = selectedCampaign?.isCharity ||
              selectedCampaign?.id === 'charity' ||
              selectedCampaign?.name === 'YES Day Walk for Autism 2026';

            const entryFee = selectedCampaign?.entryFee || 0;
            const totalEntries = leaderboardData.length;

            if (isYesDayCampaign) {
              const potAmount = charityProgress ? charityProgress.pot : 0;
              const formattedPot = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(potAmount);

              return (
                <div className="p-4 md:p-6 border-b border-zinc-800 bg-[#18181A]">
                  <div className="flex items-center gap-2 mb-3 text-yellow-500 font-bold text-sm uppercase tracking-wider">
                    <Trophy className="w-5 h-5" /> Campaign Prize Pool & Payout Breakdown
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center mb-4">
                    <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                      <span className="text-xs text-zinc-500 font-medium block mb-1">Entry Fee</span>
                      <span className="text-base font-bold text-white">Donation</span>
                    </div>
                    <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                      <span className="text-xs text-zinc-500 font-medium block mb-1">Total Entries</span>
                      <span className="text-base font-bold text-white">{totalEntries}</span>
                    </div>
                    <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                      <span className="text-xs text-zinc-500 font-medium block mb-1">1st Place Cash Prize (100% to 1st)</span>
                      <span className="text-base font-bold text-green-400">{formattedPot}</span>
                    </div>
                  </div>

                  <div className="bg-[#121212] border border-zinc-800 p-4 rounded-lg text-left">
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-2 text-yellow-500">
                      1st Place Additional Prizes:
                    </span>
                    <ul className="space-y-1 text-sm text-zinc-200 list-disc list-inside">
                      <li>The full Pick 'Em cash prize pot (100% to first: <strong className="text-green-400">{formattedPot}</strong>)</li>
                      <li>A 602 West Neon Tee</li>
                      <li>An exclusive Yes Day 2026 cosmetics pack on ChainLink and ScriptLess</li>
                    </ul>
                  </div>
                </div>
              );
            }

            const totalPot = totalEntries * entryFee;
            const firstPayout = Math.floor(totalPot * 0.45);
            const secondPayout = Math.floor(totalPot * 0.15);
            const thirdPayout = Math.floor(totalPot * 0.05);

            return (
              <div className="p-4 md:p-6 border-b border-zinc-800 bg-[#18181A]">
                <div className="flex items-center gap-2 mb-3 text-yellow-500 font-bold text-sm uppercase tracking-wider">
                  <Trophy className="w-5 h-5" /> Campaign Prize Pool & Payout Breakdown
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">Entry Fee</span>
                    <span className="text-base font-bold text-white">{entryFee > 0 ? `${entryFee} Links` : 'Free'}</span>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">Total Entries</span>
                    <span className="text-base font-bold text-white">{totalEntries}</span>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">1st Place (45%)</span>
                    <span className="text-base font-bold text-green-400">{firstPayout} Links</span>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">2nd Place (15%)</span>
                    <span className="text-base font-bold text-green-400">{secondPayout} Links</span>
                  </div>
                  <div className="bg-[#121212] border border-zinc-800 p-3 rounded-lg">
                    <span className="text-xs text-zinc-500 font-medium block mb-1">3rd Place (5%)</span>
                    <span className="text-base font-bold text-green-400">{thirdPayout} Links</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
            <h3 className="font-bold text-lg text-white">Leaderboard</h3>
            <div className="flex bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setLeaderboardView('season')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${leaderboardView === 'season' ? 'bg-[#121212] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                Season
              </button>
              <button
                onClick={() => setLeaderboardView('week')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${leaderboardView === 'week' ? 'bg-[#121212] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                Week {selectedWeek}
              </button>
            </div>
          </div>

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
                {(() => {
                  const showTiebreakerCol = leaderboardView === 'week'
                    ? matchups.some((m: any) => m.isTiebreaker)
                    : allCampaignMatchups.some((m: any) => m.isTiebreaker);

                  return (
                    <>
                      <thead className="bg-[#18181A] text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
                          <th className="px-6 py-4 font-medium">Participant</th>
                          <th className="px-6 py-4 font-medium text-center">Points</th>
                          <th className="px-6 py-4 font-medium text-center">W-L-P</th>
                          {showTiebreakerCol && (
                            <th className="px-6 py-4 font-medium text-center">Tiebreaker</th>
                          )}
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
                              <span className="font-bold text-lg" style={{ color: primaryColor }}>{isNaN(participant.points) ? 0 : String(participant.points)}</span>
                            </td>
                            <td className="px-6 py-4 text-center text-zinc-400 font-mono">
                              {isNaN(participant.wins) ? 0 : String(participant.wins)}-{isNaN(participant.losses) ? 0 : String(participant.losses)}-{isNaN(participant.pushes) ? 0 : String(participant.pushes)}
                            </td>
                            {showTiebreakerCol && (
                              <td className="px-6 py-4 text-center text-amber-500 font-mono font-bold">
                                {(() => {
                                  if (leaderboardView === 'week') {
                                    const weekTbMatchup = matchups.find((m: any) => m.isTiebreaker);
                                    if (!weekTbMatchup) return '-';
                                    const tbPick = participant.picks?.find((p: any) => p.matchupId === weekTbMatchup.id && p.tiebreakerTotal !== undefined && p.tiebreakerTotal !== null);
                                    const isFinal = weekTbMatchup.status === 'STATUS_FINAL';
                                    if (isFinal) {
                                      if (!tbPick) return 100;
                                      const actualTotal = Number(weekTbMatchup.homeScore ?? weekTbMatchup.homeTeam?.score ?? 0) + Number(weekTbMatchup.awayScore ?? weekTbMatchup.awayTeam?.score ?? 0);
                                      return Math.abs(tbPick.tiebreakerTotal - actualTotal);
                                    } else {
                                      if (!tbPick) return '-';
                                      const isLocked = weekTbMatchup.startTime && Date.now() >= weekTbMatchup.startTime;
                                      const isSelf = participant.uid === user?.uid;
                                      if (isLocked || isSelf) return tbPick.tiebreakerTotal;
                                      return <span title="Hidden until kickoff" className="flex items-center justify-center opacity-50"><Lock className="w-4 h-4 inline" /></span>;
                                    }
                                  } else {
                                    return participant.tbDisplay !== undefined ? participant.tbDisplay : '-';
                                  }
                                })()}
                              </td>
                            )}
                            <td className="px-6 py-4">
                        <div className="flex gap-2 items-center flex-wrap">
                          {participant.picks && participant.picks.filter((p: any) => p.week === selectedWeek).map((pick: any) => {
                            if (!pick?.pick?.teamId) return null;
                            const matchup = matchups.find((m: any) => m.id === pick.matchupId);
                            if (!matchup) return null;
                            
                            const isMyPick = participant.uid === user?.uid;
                            const isRevealed = matchup.status !== 'STATUS_SCHEDULED';
                            
                            if (!isRevealed && !isMyPick) {
                                return (
                                  <div key={pick.id} className="w-8 h-8 rounded-full border-2 border-zinc-600 overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0" title="Pick Hidden (Game not started)">
                                    <HelpCircle className="w-4 h-4 text-zinc-400" />
                                  </div>
                                );
                            }

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
                                <FirebaseImage src={imageUrl} alt={altText} className="w-full h-full object-contain p-0.5" />
                              </div>
                            );
                          })}
                        </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  );
                })()}
              </table>
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
