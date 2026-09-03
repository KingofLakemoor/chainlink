import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, setDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Layers, Search, Shield, ChevronRight, Lock, CheckCircle, XCircle, AlertTriangle, ExternalLink, ArrowLeft } from 'lucide-react';
import { CharityBanner } from '../../components/pickem/CharityBanner';
import { FirebaseImage } from '../../components/ui/FirebaseImage';
import { cn } from '../../lib/utils';
import { getTeamShortName } from '../../lib/teamUtils';

export default function PickEmLandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'my_picks' | 'join'>('my_picks');
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [joinedCampaignIds, setJoinedCampaignIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const [directCampaign, setDirectCampaign] = useState<any>(null);
  const [directJoining, setDirectJoining] = useState(false);
  const [directJoinError, setDirectJoinError] = useState('');
  
  const [campaignDetails, setCampaignDetails] = useState<Record<string, { matchups: any[], picks: any[] }>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const storedCode = localStorage.getItem('chainlink_join_code') || '';
      const urlCode = (searchParams.get('joinCode') || searchParams.get('code') || storedCode || '').trim();

      try {
        // Fetch participants and picks for current user to know all campaigns they have joined or entered picks for
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

        const joinedIds = new Set<string>();
        const partCampaignIds = new Set<string>();
        [...(partSnap as any).docs, ...(partUserSnap as any).docs].forEach(d => {
          const cid = d.data().campaignId;
          if (cid) {
            joinedIds.add(cid);
            partCampaignIds.add(cid);
          }
        });

        const unhealedCampaignIds = new Set<string>();
        [...(picksSnap as any).docs, ...(picksUserSnap as any).docs].forEach(d => {
          const cid = d.data().campaignId;
          if (cid) {
            joinedIds.add(cid);
            if (!partCampaignIds.has(cid)) {
              unhealedCampaignIds.add(cid);
            }
          }
        });

        // Auto-heal missing participant records in background
        if (unhealedCampaignIds.size > 0 && auth.currentUser) {
          auth.currentUser.getIdToken().then(token => {
            unhealedCampaignIds.forEach(cid => {
              fetch('/api/pickem/join', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ campaignId: cid })
              }).catch(err => console.error("Auto-heal join error:", err));
            });
          }).catch(console.error);
        }

        setJoinedCampaignIds(joinedIds);

        // Fetch all campaigns
        const campSnap = await getDocs(collection(db, 'pickemCampaigns'));
        let allCamps = campSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        let allUnarchivedCamps = allCamps.filter(c => {
          const isArch = c.isArchived === true || c.isArchived === 'true' || c.archived === true || c.archived === 'true';
          return !isArch;
        });

        if (urlCode) {
          let matched = allUnarchivedCamps.find(c =>
            (c.joinCode && c.joinCode.trim().toLowerCase() === urlCode.toLowerCase()) ||
            c.id.toLowerCase() === urlCode.toLowerCase() ||
            (c.name && c.name.trim().toLowerCase() === urlCode.toLowerCase())
          );

          if (!matched) {
            // Also try searching Firestore docs for unarchived matching joinCode, id, or name
            const matchedDoc = campSnap.docs.find(d => {
              const data = d.data();
              const isArch = data.isArchived === true || data.isArchived === 'true' || data.archived === true || data.archived === 'true';
              if (isArch) return false;
              return (
                (data.joinCode && data.joinCode.trim().toLowerCase() === urlCode.toLowerCase()) ||
                d.id.toLowerCase() === urlCode.toLowerCase() ||
                (data.name && data.name.trim().toLowerCase() === urlCode.toLowerCase())
              );
            });
            if (matchedDoc) {
              matched = { id: matchedDoc.id, ...matchedDoc.data() as any };
            }
          }

          if (matched) {
            if (joinedIds.has(matched.id)) {
              localStorage.removeItem('chainlink_join_code');
              navigate(`/pickem/${matched.id}`, { replace: true });
              return;
            } else {
              if (matched.joinCode) {
                localStorage.setItem('chainlink_join_code', matched.joinCode.trim());
              }
              setDirectCampaign(matched);
              setLoading(false);
              return;
            }
          } else {
            setActiveTab('join');
            setJoinCode(urlCode);
            setJoinError(`No active campaign found for code: "${urlCode}"`);
          }
        }

        let camps = allCamps.filter(c => {
          if (joinedIds.has(c.id)) return true; // Always show joined campaigns even if archived
          const isArch = c.isArchived === true || c.isArchived === 'true' || c.archived === true || c.archived === 'true';
          if (isArch) return false;
          return true; // Show all non-archived campaigns so public campaigns are always joinable
        });
        setCampaigns(camps);

        if (joinedIds.size === 0 && !urlCode) {
          setActiveTab('join');
        }
        
        // For joined campaigns, fetch current week matchups and picks in parallel to show status
        const details: Record<string, { matchups: any[], picks: any[] }> = {};
        const joinedCids = Array.from(joinedIds);

        await Promise.all(joinedCids.map(async (cid) => {
          const camp = camps.find(c => c.id === cid);
          if (!camp) return;

          const mQuery = query(collection(db, 'pickemMatchups'), where('campaignId', '==', cid));
          const pQuery = query(collection(db, 'pickemPicks'), where('participantId', '==', user.uid));

          const [mSnap, pSnap] = await Promise.all([getDocs(mQuery), getDocs(pQuery)]);

          const week = camp.currentWeek ?? 1;
          const matchups = mSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter(m => m.week === week).sort((a, b) => a.startTime - b.startTime);
          const picks = pSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter(p => p.campaignId === cid && p.week === week);

          details[cid] = { matchups, picks };
        }));

        setCampaignDetails(details);

      } catch (err) {
        console.error(err);
        if (!urlCode) {
          setActiveTab('join');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleJoinDirectCampaign = async (camp: any) => {
    if (!user) return;
    setDirectJoining(true);
    setDirectJoinError('');
    try {
      const storedCode = localStorage.getItem('chainlink_join_code') || '';
      const urlCode = (searchParams.get('joinCode') || searchParams.get('code') || storedCode || camp.joinCode || '').trim();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/pickem/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignId: camp.id,
          ...(urlCode ? { joinCode: urlCode } : {})
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join campaign');
      }
      localStorage.removeItem('chainlink_join_code');
      setJoinedCampaignIds(prev => new Set(prev).add(camp.id));
      navigate(`/pickem/${camp.id}`);
    } catch (err: any) {
      console.error(err);
      setDirectJoinError(err.message || 'Failed to join campaign.');
    } finally {
      setDirectJoining(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;
    setJoinError('');
    
    const cleanCode = joinCode.trim();

    // Find campaign with this code in loaded campaigns first
    let targetCampaignId = campaigns.find(c =>
      (c.joinCode && c.joinCode.trim().toLowerCase() === cleanCode.toLowerCase()) ||
      c.id.toLowerCase() === cleanCode.toLowerCase() ||
      (c.name && c.name.trim().toLowerCase() === cleanCode.toLowerCase())
    )?.id;

    // If not found in loaded campaigns, query Firestore for any unarchived campaign matching joinCode, id, or name
    if (!targetCampaignId) {
      try {
        const campSnap = await getDocs(collection(db, 'pickemCampaigns'));
        const matchedDoc = campSnap.docs.find(d => {
          const data = d.data();
          if (data.isArchived || data.archived) return false;
          return (
            (data.joinCode && data.joinCode.trim().toLowerCase() === cleanCode.toLowerCase()) ||
            d.id.toLowerCase() === cleanCode.toLowerCase() ||
            (data.name && data.name.trim().toLowerCase() === cleanCode.toLowerCase())
          );
        });
        if (matchedDoc) {
          targetCampaignId = matchedDoc.id;
          const newCamp = { id: matchedDoc.id, ...matchedDoc.data() };
          setCampaigns(prev => prev.some(c => c.id === newCamp.id) ? prev : [...prev, newCamp]);
        }
      } catch (err) {
        console.error("Error looking up campaign by join code:", err);
      }
    }
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/pickem/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...(targetCampaignId ? { campaignId: targetCampaignId } : {}),
          joinCode: cleanCode
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join campaign');
      }
      const joinedId = data.campaignId || targetCampaignId;
      if (joinedId) {
        localStorage.removeItem('chainlink_join_code');
        setJoinedCampaignIds(prev => new Set(prev).add(joinedId));
        navigate(`/pickem/${joinedId}`);
        return;
      }
      setActiveTab('my_picks');
      setJoinCode('');
    } catch (err: any) {
      console.error(err);
      setJoinError(err.message || 'Invalid join code or campaign not found.');
    }
  };

  const handleJoinPublic = async (camp: any) => {
    if (!user) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/pickem/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId: camp.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join campaign');
      }
      setJoinedCampaignIds(prev => new Set(prev).add(camp.id));
      setSelectedPublicCamp(null);
      navigate(`/pickem/${camp.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to join campaign.');
    }
  };

  const [selectedPublicCamp, setSelectedPublicCamp] = useState<any>(null);

  const myCampaigns = campaigns.filter(c => joinedCampaignIds.has(c.id));
  const publicCampaigns = campaigns.filter(c => {
    if (joinedCampaignIds.has(c.id)) return false;
    const isPriv = c.isPrivate === true || c.isPrivate === 'true';
    const isArch = c.isArchived === true || c.isArchived === 'true' || c.archived === true || c.archived === 'true';
    return !isPriv && !isArch;
  });

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading Pick'em...</div>;
  }

  if (directCampaign) {
    const isCharity = directCampaign.isCharity || directCampaign.name === 'YES Day Walk for Autism 2026';

    return (
      <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full pt-20 md:pt-8">
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => {
              setDirectCampaign(null);
              setSearchParams({}, { replace: true });
            }}
            className="text-zinc-400 hover:text-white text-sm flex items-center gap-2 transition-colors font-medium bg-[#121212] border border-zinc-800 px-4 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Browse All Pick 'Em Leagues
          </button>
        </div>

        <div className="text-center mb-8">
          {directCampaign.theme?.logoUrl ? (
            <FirebaseImage
              src={directCampaign.theme.logoUrl}
              alt={directCampaign.theme?.title || directCampaign.name}
              className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl bg-zinc-900 p-2 border border-zinc-800 shadow-xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 mx-auto mb-4 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.15)]">
              <Layers className="w-10 h-10 text-[#22c55e]" />
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-display font-black text-white mb-3 tracking-tight">
            {directCampaign.theme?.title || directCampaign.name}
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            {directCampaign.theme?.subtitle || "You've been invited to join this Pick 'Em campaign! Review details below and click Join to get started."}
          </p>
        </div>

        {isCharity && <CharityBanner />}

        <div className="bg-[#121212] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 md:p-8 border-b border-zinc-800/80 bg-[#161618] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#22c55e] bg-[#22c55e]/10 px-3 py-1 rounded-full border border-[#22c55e]/20">
                  {directCampaign.isPrivate ? 'Private Campaign' : 'Public Campaign'}
                </span>
                {directCampaign.isOpen === false && (
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                    Campaign Closed
                  </span>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mt-2">
                League Details
              </h3>
            </div>
            {directCampaign.leagues && directCampaign.leagues.length > 0 && (
              <div className="text-right">
                <span className="text-xs text-zinc-400 block uppercase tracking-wider font-semibold">Leagues</span>
                <span className="text-white font-medium text-base">{directCampaign.leagues.join(', ')}</span>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#18181A] border border-zinc-800/60 p-4 rounded-xl">
                <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Match Type</span>
                <span className="text-white font-medium text-base">
                  {directCampaign.defaultMatchType === 'SPREAD' ? 'Against the Spread' : directCampaign.defaultMatchType === 'BOTH' ? 'Moneyline / ATS' : 'Moneyline (Straight Up)'}
                </span>
              </div>
              <div className="bg-[#18181A] border border-zinc-800/60 p-4 rounded-xl">
                <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Weekly Picks</span>
                <span className="text-white font-medium text-base">
                  {directCampaign.pickLimit > 0 ? `${directCampaign.pickLimit} per week` : 'All Games'}
                </span>
              </div>
              <div className="bg-[#18181A] border border-zinc-800/60 p-4 rounded-xl">
                <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Duration</span>
                <span className="text-white font-medium text-base">
                  {directCampaign.hasWeekZero ? (directCampaign.totalWeeks || 1) + 1 : (directCampaign.totalWeeks || 1)} Weeks
                </span>
              </div>
              <div className="bg-[#18181A] border border-zinc-800/60 p-4 rounded-xl">
                <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Entry Fee</span>
                <span className="text-white font-medium text-base">
                  {directCampaign.entryFee > 0 ? `${directCampaign.entryFee} Links` : 'Free'}
                </span>
              </div>
            </div>

            {directJoinError && (
              <div className="p-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl">
                {directJoinError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-800/80">
              <Button
                size="lg"
                className="flex-1 h-14 text-lg font-bold shadow-[0_0_25px_rgba(34,197,94,0.25)]"
                onClick={() => handleJoinDirectCampaign(directCampaign)}
                disabled={directJoining || directCampaign.isOpen === false}
              >
                {directCampaign.isOpen === false
                  ? 'Campaign Closed to New Entries'
                  : directJoining
                    ? 'Joining Campaign...'
                    : `Join ${directCampaign.theme?.title || directCampaign.name} Now`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full pt-20 md:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 tracking-tight flex items-center gap-3">
          <Layers className="w-8 h-8 text-[#22c55e]" />
          Pick'em
        </h1>
        <p className="text-zinc-400 text-lg">Make weekly picks and compete on the leaderboard.</p>
      </div>

      <div className="flex gap-4 mb-8 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('my_picks')}
          className={cn("px-4 py-3 font-semibold text-sm transition-colors relative", activeTab === 'my_picks' ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
        >
          My Pick Em
          {activeTab === 'my_picks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={cn("px-4 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2", activeTab === 'join' ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
        >
          Join Pick Em
          {publicCampaigns.length > 0 && (
            <span className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 text-xs px-2 py-0.5 rounded-full font-bold">
              {publicCampaigns.length}
            </span>
          )}
          {activeTab === 'join' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
        </button>
      </div>

      {activeTab === 'my_picks' && (
        <div className="space-y-6">
          {myCampaigns.length > 0 && publicCampaigns.length > 0 && (
            <div className="p-4 bg-[#18181A] border border-zinc-800/80 rounded-xl flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm">More Leagues Available!</h4>
                <p className="text-xs text-zinc-400">There {publicCampaigns.length === 1 ? 'is 1 other public campaign' : `are ${publicCampaigns.length} other public campaigns`} open to join.</p>
              </div>
              <Button size="sm" onClick={() => setActiveTab('join')} className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold text-xs whitespace-nowrap">
                Browse Leagues ({publicCampaigns.length})
              </Button>
            </div>
          )}

          {myCampaigns.length === 0 ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-12 text-center">
              <Layers className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No active Pick'ems</h3>
              <p className="text-zinc-400 mb-6">You haven't joined any campaigns yet.</p>
              <Button onClick={() => setActiveTab('join')}>Find a Pick'em to Join</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {myCampaigns.map(c => {
                const details = campaignDetails[c.id];
                const totalGames = details?.matchups.length || 0;
                const picksMade = details?.picks.length || 0;
                const allowedPicks = (c.pickLimit && c.pickLimit > 0) ? Math.min(c.pickLimit, totalGames) : totalGames;
                
                return (
                  <div key={c.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col transition-transform hover:border-zinc-700 cursor-pointer" onClick={() => navigate(`/pickem/${c.id}`)}>
                    <div className="p-6 border-b border-zinc-800/50">
                      <div className="flex items-center gap-4 mb-4">
                        {c.theme?.logoUrl ? (
                          <FirebaseImage src={c.theme.logoUrl} className="w-12 h-12 object-contain rounded-md bg-zinc-900" />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-zinc-900 flex items-center justify-center">
                            <Layers className="w-6 h-6 text-zinc-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-white leading-tight">{c.theme?.title || c.name}</h3>
                          <p className="text-sm text-zinc-400 mt-1">Week {c.currentWeek ?? 1}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className={picksMade >= allowedPicks ? "text-green-500 font-semibold flex items-center gap-1" : "text-amber-500 font-semibold flex items-center gap-1"}>
                          {picksMade >= allowedPicks ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          {picksMade} / {allowedPicks} Picks In
                        </span>
                        <span className="text-zinc-500 flex items-center gap-1 hover:text-white transition-colors">
                          View & Edit <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                    
                    {details && details.matchups.length > 0 && (
                      <div className="p-6 bg-[#18181A] flex-1 flex flex-col justify-center">
                        <div className="flex flex-wrap gap-2 mb-2">
                           {Array.from({ length: allowedPicks }).map((_, i) => {
                             const validPicks = (details.picks || []).filter(p => p.pick?.teamId);
                             const pick = validPicks[i];
                             if (!pick || !pick.pick?.teamId) {
                               return (
                                 <div key={`empty-${i}`} className="w-10 h-10 rounded-full border-2 border-zinc-800 bg-[#121212] flex-shrink-0" />
                               );
                             }
                             
                             const m = details.matchups.find(matchup => matchup.id === pick.matchupId);
                             if (!m) {
                               return (
                                 <div key={`empty-${i}`} className="w-10 h-10 rounded-full border-2 border-zinc-800 bg-[#121212] flex-shrink-0" />
                               );
                             }

                             let imageUrl = '';
                             let altText = '';
                             if (m.type === 'OVER_UNDER') {
                                 imageUrl = pick.pick.teamId === 'OVER' ? '/images/over.png' : '/images/under.png';
                                 altText = pick.pick.teamId;
                             } else {
                                 imageUrl = pick.pick.teamId === m.awayTeam.id ? m.awayTeam.image : m.homeTeam.image;
                                 altText = pick.pick.teamId === m.awayTeam.id ? m.awayTeam.name : m.homeTeam.name;
                             }
                             let borderColorClass = 'border-zinc-500';
                             if (pick.status === 'WIN') borderColorClass = 'border-green-500 ring-2 ring-green-500/20';
                             else if (pick.status === 'LOSS') borderColorClass = 'border-red-500 opacity-50';
                             else if (pick.status === 'PUSH') borderColorClass = 'border-zinc-400';
                             return (
                               <div key={m.id} className={`w-10 h-10 rounded-full border-2 overflow-hidden bg-zinc-900 flex-shrink-0 ${borderColorClass}`} title={`${altText} ${pick.status !== 'PENDING' ? '- '+pick.status : ''}`}>
                                 <FirebaseImage src={imageUrl} alt={altText} className="w-full h-full object-contain p-1" />
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'join' && (
        <div className="space-y-8">
          
          <CharityBanner />

          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-zinc-400" /> Join Private League
            </h3>
            <p className="text-sm text-zinc-400 mb-4">Enter a join code provided by the league commissioner to access a private pick'em campaign.</p>
            <form onSubmit={handleJoinWithCode} className="flex gap-3 max-w-md">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter Code..."
                className="flex-1 bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white font-mono uppercase focus:ring-1 focus:ring-[#22c55e] outline-none"
              />
              <Button type="submit" disabled={!joinCode.trim()}>Join</Button>
            </form>
            {joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-4">Public Campaigns</h3>
            {publicCampaigns.length === 0 ? (
              <div className="text-zinc-500 bg-[#121212] rounded-xl p-8 text-center border border-zinc-800/50">
                No public campaigns are currently available to join.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicCampaigns.map(c => (
                  <div key={c.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        {c.theme?.logoUrl ? (
                          <FirebaseImage src={c.theme.logoUrl} className="w-10 h-10 object-contain rounded bg-zinc-900" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-zinc-900 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-zinc-500" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-lg leading-tight">{c.theme?.title || c.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#22c55e] font-semibold bg-[#22c55e]/10 px-2 py-0.5 rounded-full inline-block">
                              {c.leagues ? c.leagues.join(', ') : 'Mixed'}
                            </span>
                            {c.isOpen === false && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                Closed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400 mb-6">{c.theme?.subtitle || "Join this public pick'em campaign and compete against others."}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div className="bg-[#18181A] p-3 rounded-lg">
                          <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Format</span>
                          <span className="text-white font-medium">{c.defaultMatchType === 'SPREAD' ? 'ATS' : c.defaultMatchType === 'BOTH' ? 'Moneyline/ATS' : 'Moneyline'}</span>
                        </div>
                        <div className="bg-[#18181A] p-3 rounded-lg">
                          <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Weekly Picks</span>
                          <span className="text-white font-medium">{c.pickLimit > 0 ? c.pickLimit : 'Unlimited'}</span>
                        </div>
                      </div>
                      
                      <Button className="w-full" onClick={() => setSelectedPublicCamp(c)}>View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPublicCamp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-start justify-between">
              <div className="flex items-center gap-4">
                {selectedPublicCamp.theme?.logoUrl ? (
                  <FirebaseImage src={selectedPublicCamp.theme?.logoUrl} className="w-16 h-16 object-contain rounded-lg bg-zinc-900" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-zinc-900 flex items-center justify-center">
                    <Layers className="w-8 h-8 text-[#22c55e]" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{selectedPublicCamp.theme?.title || selectedPublicCamp.name}</h3>
                  <p className="text-sm text-[#22c55e] font-semibold">{selectedPublicCamp.leagues?.join(', ')} • Week {selectedPublicCamp.currentWeek ?? 1} {selectedPublicCamp.entryFee ? `• ${selectedPublicCamp.entryFee} Links` : ''}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-zinc-300 text-lg">{selectedPublicCamp.theme?.subtitle || "Get ready to make your picks and climb the leaderboard!"}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#18181A] border border-zinc-800/50 p-4 rounded-xl">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Match Type</span>
                  <span className="text-white font-medium text-lg">{selectedPublicCamp.defaultMatchType === 'SPREAD' ? 'Against the Spread' : selectedPublicCamp.defaultMatchType === 'BOTH' ? 'Moneyline / ATS' : 'Moneyline (Straight Up)'}</span>
                </div>
                <div className="bg-[#18181A] border border-zinc-800/50 p-4 rounded-xl">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Pick Limit</span>
                  <span className="text-white font-medium text-lg">{selectedPublicCamp.pickLimit > 0 ? `${selectedPublicCamp.pickLimit} per week` : 'All Games'}</span>
                </div>
                <div className="bg-[#18181A] border border-zinc-800/50 p-4 rounded-xl">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Duration</span>
                  <span className="text-white font-medium text-lg">{selectedPublicCamp.hasWeekZero ? (selectedPublicCamp.totalWeeks || 1) + 1 : (selectedPublicCamp.totalWeeks || 1)} Weeks</span>
                </div>
                <div className="bg-[#18181A] border border-zinc-800/50 p-4 rounded-xl">
                  <span className="text-zinc-500 block text-xs uppercase tracking-wider font-bold mb-1">Entry Fee</span>
                  <span className="text-white font-medium text-lg">{selectedPublicCamp.entryFee > 0 ? `${selectedPublicCamp.entryFee} Links` : 'Free'}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-800 bg-[#18181A] flex gap-4">
              <Button variant="ghost" className="flex-1" onClick={() => setSelectedPublicCamp(null)}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={() => handleJoinPublic(selectedPublicCamp)}
                disabled={selectedPublicCamp.isOpen === false}
              >
                {selectedPublicCamp.isOpen === false ? 'Campaign Closed' : 'Join Campaign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
