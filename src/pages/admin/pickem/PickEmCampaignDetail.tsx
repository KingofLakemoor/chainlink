import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../lib/firebase';
import { scrapeLeagueSchedules } from '../../../services/espnScraper';
import { RefreshCw, Trash2, Plus } from 'lucide-react';

export default function PickEmCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [activeLiveWeek, setActiveLiveWeek] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [matchupsLoading, setMatchupsLoading] = useState(false);
  const [showPropModal, setShowPropModal] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propOptionA, setPropOptionA] = useState('');
  const [propOptionB, setPropOptionB] = useState('');
  const [propDate, setPropDate] = useState('');


  const [themePrimaryColor, setThemePrimaryColor] = useState('#22c55e');
  const [themeTitle, setThemeTitle] = useState('');
  const [themeSubtitle, setThemeSubtitle] = useState('');
  const [themeLogoFile, setThemeLogoFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [themeLogoUrl, setThemeLogoUrl] = useState('');

  const [visibleDateStr, setVisibleDateStr] = useState('');
  const [gamesBeginDateStr, setGamesBeginDateStr] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [totalWeeks, setTotalWeeks] = useState<number>(18);
  const [hasWeekZero, setHasWeekZero] = useState<boolean>(false);
  const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);
  const [entryFee, setEntryFee] = useState<number>(0);
  const [weekSettings, setWeekSettings] = useState<Record<string, any>>({});
  const [weekGamesBeginDateStr, setWeekGamesBeginDateStr] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [weekIsVisible, setWeekIsVisible] = useState<boolean>(true);
  const [weekEndDateStr, setWeekEndDateStr] = useState('');


  const fetchCampaign = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'pickemCampaigns', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCampaign({ id: docSnap.id, ...data });
        const initialWeek = (data.currentWeek !== undefined && data.currentWeek !== null) ? data.currentWeek : (data.hasWeekZero ? 0 : 1);
        setSelectedWeek(initialWeek);
        setActiveLiveWeek(initialWeek);
        setTotalWeeks(data.totalWeeks || 18);
        setHasWeekZero(data.hasWeekZero || false);
        setUseTiebreaker(data.useTiebreaker || false);
        setEntryFee(data.entryFee || 0);
        setIsPrivate(data.isPrivate || false);
        setJoinCode(data.joinCode || '');
        setWeekSettings(data.weekSettings || {});

        setThemePrimaryColor(data.theme?.primaryColor || '#22c55e');
        setThemeTitle(data.theme?.title || '');
        setThemeSubtitle(data.theme?.subtitle || '');
        setThemeLogoUrl(data.theme?.logoUrl || '');

        if (data.visibleDate) {
          const d = new Date(data.visibleDate);
          setVisibleDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }
        if (data.gamesBeginDate) {
          const d = new Date(data.gamesBeginDate);
          setGamesBeginDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }
        if (data.startDate) {
          const d = new Date(data.startDate);
          setStartDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }
        if (data.endDate) {
          const d = new Date(data.endDate);
          setEndDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }

      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchups = async (week: number) => {
    if (!id) return;
    setMatchupsLoading(true);
    try {
      const q = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', id),
        where('week', '==', week)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const timeA = typeof a.startTime === 'number' ? a.startTime : (a.startTime ? new Date(a.startTime).getTime() : 0);
        const timeB = typeof b.startTime === 'number' ? b.startTime : (b.startTime ? new Date(b.startTime).getTime() : 0);
        return timeA - timeB;
      });
      setMatchups(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setMatchupsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    if (campaign && selectedWeek !== undefined && selectedWeek !== null) {
      fetchMatchups(selectedWeek);
      
      const ws = campaign.weekSettings || {};
      const currentWS = ws[selectedWeek] || {};
      setWeekLabel(currentWS.label || '');
      setWeekIsVisible(currentWS.isVisible !== false);
      if (currentWS.gamesBeginDate) {
         const d = new Date(currentWS.gamesBeginDate);
         setWeekGamesBeginDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      } else {
         setWeekGamesBeginDateStr('');
      }
      if (currentWS.endDate) {
         const d = new Date(currentWS.endDate);
         setWeekEndDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      } else {
         setWeekEndDateStr('');
      }
    }
  }, [campaign, selectedWeek]);

  const handleSaveCampaign = async () => {
    if (!campaign || !id) return;
    try {

    let finalLogoUrl = themeLogoUrl;
    if (themeLogoFile) {
      const storage = getStorage(app);
      const storageRef = ref(storage, `pickem_logos/${Date.now()}_${themeLogoFile.name}`);
      await uploadBytes(storageRef, themeLogoFile);
      finalLogoUrl = await getDownloadURL(storageRef);
    }

      const updatedWeekSettings = {
        ...(campaign.weekSettings || {}),
        [selectedWeek]: {
          label: weekLabel,
          isVisible: weekIsVisible,
          gamesBeginDate: weekGamesBeginDateStr ? new Date(weekGamesBeginDateStr).getTime() : null,
          endDate: weekEndDateStr ? new Date(weekEndDateStr).getTime() : null
        }
      };

      await updateDoc(doc(db, 'pickemCampaigns', id), {
        currentWeek: activeLiveWeek,
        totalWeeks: totalWeeks,
        hasWeekZero: hasWeekZero,
        useTiebreaker: useTiebreaker,
        entryFee: entryFee,
        isPrivate: isPrivate,
        joinCode: isPrivate ? joinCode : '',
        visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() : null,
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() : null,
        startDate: startDateStr ? new Date(startDateStr).getTime() : null,
        endDate: endDateStr ? new Date(endDateStr).getTime() : null,
        weekSettings: updatedWeekSettings,
        theme: {
          primaryColor: themePrimaryColor,
          title: themeTitle,
          subtitle: themeSubtitle,
          logoUrl: finalLogoUrl,
        }
      });
      
      setCampaign(prev => ({ 
        ...prev, 
        currentWeek: activeLiveWeek,
        totalWeeks,
        hasWeekZero,
        useTiebreaker, 
        entryFee,
        isPrivate,
        joinCode: isPrivate ? joinCode : '',
        visibleDate: visibleDateStr ? new Date(visibleDateStr).getTime() : null,
        gamesBeginDate: gamesBeginDateStr ? new Date(gamesBeginDateStr).getTime() : null,
        startDate: startDateStr ? new Date(startDateStr).getTime() : null,
        endDate: endDateStr ? new Date(endDateStr).getTime() : null,
        weekSettings: updatedWeekSettings,
        theme: { primaryColor: themePrimaryColor, title: themeTitle, subtitle: themeSubtitle, logoUrl: finalLogoUrl } 
      }));
      console.log(`Campaign updated`);
    } catch (err) {
      console.error(err);
      console.log('Failed to update week');
    }
  };

  
  const handleAddProp = async () => {
    if (!id || !propTitle || !propOptionA || !propOptionB || !propDate) {
      console.log('Please fill out all fields');
      return;
    }
    
    setMatchupsLoading(true);
    try {
      const matchId = `${id}_${selectedWeek}_prop_${Date.now()}`;
      await setDoc(doc(db, 'pickemMatchups', matchId), {
        campaignId: id,
        week: selectedWeek,
        gameId: `prop_${Date.now()}`,
        title: propTitle,
        type: 'PROP',
        startTime: new Date(propDate).getTime(),
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Scheduled',
        awayTeam: { id: 'option_a', name: propOptionA, image: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(propOptionA[0] || 'A') + '&background=random' },
        homeTeam: { id: 'option_b', name: propOptionB, image: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(propOptionB[0] || 'B') + '&background=random' },
        createdAt: Date.now()
      });
      setShowPropModal(false);
      setPropTitle('');
      setPropOptionA('');
      setPropOptionB('');
      setPropDate('');
      fetchMatchups(selectedWeek);
    } catch (e) {
      console.error(e);
      console.log('Failed to add prop');
    } finally {
      setMatchupsLoading(false);
    }
  };

  const handleSyncMatchups = async () => {
    if (!campaign || !id) return;
    const leaguesToSync = campaign.leagues && campaign.leagues.length > 0
      ? campaign.leagues
      : (campaign.league ? [campaign.league] : []);

    if (leaguesToSync.length === 0) {
      console.log("No leagues configured for this campaign.");
      return;
    }

    // confirm removed

    setMatchupsLoading(true);
    try {
      let count = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const lg of leaguesToSync) {
        const ws = campaign.weekSettings?.[selectedWeek] || {};
        let effectiveBeginDate = ws.gamesBeginDate || campaign.gamesBeginDate;
        let effectiveEndDate = ws.endDate || campaign.endDate;

        // Smart defaults: if only one boundary is provided, construct a 14-day window
        if (effectiveBeginDate && !effectiveEndDate) {
            effectiveEndDate = effectiveBeginDate + (14 * 86400000);
        } else if (!effectiveBeginDate && effectiveEndDate) {
            effectiveBeginDate = effectiveEndDate - (14 * 86400000);
        }

        let specificDates: string[] | undefined = undefined;

        if (effectiveBeginDate && effectiveEndDate) {
           specificDates = [];
           let curr = new Date(effectiveBeginDate);
           const end = new Date(effectiveEndDate);
           let days = 0;
           // Cap at 35 days (5 weeks) to avoid massive ESPN API requests
           while (curr <= end && days <= 35) {
              const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
              const [month, day, year] = str.split("/");
              specificDates.push(`${year}${month}${day}`);
              curr = new Date(curr.getTime() + 86400000);
              days++;
           }
        }
        const res = await scrapeLeagueSchedules(lg, false, undefined, specificDates);
        console.log('API returned games:', res.data?.length);
        if (res.data) res.data.forEach(m => console.log('Game', m.title, new Date(m.startTime).toLocaleString(), m.startTime, 'vs bounds:', campaign.gamesBeginDate, campaign.endDate));
        if (!res.data || res.data.length === 0) {
          console.warn(`No games found to sync for ${lg}.`);
          continue;
        }

        for (const m of res.data) {
          console.log('Game', m.title, new Date(m.startTime).toLocaleString(), 'vs bounds:', effectiveBeginDate ? new Date(effectiveBeginDate).toLocaleString() : null, effectiveEndDate ? new Date(effectiveEndDate).toLocaleString() : null);
          if (effectiveBeginDate && m.startTime < effectiveBeginDate) {
            continue;
          }
          if (effectiveEndDate && m.startTime > effectiveEndDate) {
            continue;
          }

          const pickemMatchupId = `${id}_${selectedWeek}_${m.gameId}`;
          const docRef = doc(db, 'pickemMatchups', pickemMatchupId);

          const existingMatchup = matchups.find(ex => ex.id === pickemMatchupId);
          let metadataToSave = m.metadata ? { ...m.metadata } : null;
          let finalType = campaign.name === 'YES Day Walk for Autism 2026'
            ? "STANDARD"
            : (campaign.defaultMatchType === "BOTH" ? ((metadataToSave?.spread !== undefined && metadataToSave?.spread !== null) ? "SPREAD" : "STANDARD") : (campaign.defaultMatchType || "STANDARD"));

          if (existingMatchup && existingMatchup.type && campaign.name !== 'YES Day Walk for Autism 2026') {
             finalType = existingMatchup.type; // Preserve admin overrides
          }

          // For CFB and NFL, check if it's before Thursday 2AM AZ time (9AM UTC) relative to the GAME'S week
          if ((lg === 'CFB' || lg === 'NFL') && metadataToSave) {
             // Find the previous Thursday at 9AM UTC relative to the game's start time
             const gameDate = new Date(m.startTime);
             const gameDay = gameDate.getUTCDay();

             const lockDate = new Date(m.startTime);
             let daysToSubtract = gameDay - 4;
             if (daysToSubtract < 0) {
                 daysToSubtract += 7; // e.g., if game is Wed (3), lock was last Thursday (subtract 6)
             }
             lockDate.setUTCDate(lockDate.getUTCDate() - daysToSubtract);
             lockDate.setUTCHours(9, 0, 0, 0); // 9 AM UTC

             const now = new Date();
             const isBeforeThursdayLock = now.getTime() < lockDate.getTime();

             if (isBeforeThursdayLock) {
                metadataToSave.spreadLocked = false;
             } else {
                metadataToSave.spreadLocked = true;
                if (existingMatchup && existingMatchup.metadata && existingMatchup.metadata.spread !== undefined) {
                   metadataToSave.spread = existingMatchup.metadata.spread; // Preserve the locked spread!
                }
             }
          }

          batch.set(docRef, {
            campaignId: id,
            week: selectedWeek,
            gameId: String(m.gameId),
            title: m.title,
            startTime: m.startTime,
            status: m.status,
            statusDesc: m.statusDesc,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            type: finalType,
            metadata: metadataToSave,
            createdAt: Date.now()
          }, { merge: true });

          count++;
          batchCount++;

          if (batchCount === 500) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      if (count > 0) {
        alert(`Synced ${count} matchups successfully across ${leaguesToSync.length} league(s)!`);
        await fetchMatchups(selectedWeek);
      } else {
        alert(`No games found. They may have been filtered out by week date bounds.`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to sync matchups: ' + (err.message || String(err)));
    } finally {
      setMatchupsLoading(false);
    }
  };


  
  const handleToggleTiebreaker = async (matchupId: string, currentVal: boolean) => {
    try {
      await updateDoc(doc(db, "pickemMatchups", matchupId), {
        isTiebreaker: !currentVal
      });
      setMatchups(prev => prev.map(m => m.id === matchupId ? { ...m, isTiebreaker: !currentVal } : m));
    } catch (err) {
      console.error(err);
      console.log("Failed to toggle tiebreaker");
    }
  };

  const handleToggleSpread = async (matchupId: string, currentType: string) => {
    if (campaign?.name === 'YES Day Walk for Autism 2026') {
      alert("YES Day Walk for Autism 2026 is strictly Moneyline (STANDARD) picks.");
      return;
    }
    try {
      const newType = currentType === "SPREAD" ? "STANDARD" : "SPREAD";
      await updateDoc(doc(db, "pickemMatchups", matchupId), {
        type: newType
      });
      setMatchups(prev => prev.map(m => m.id === matchupId ? { ...m, type: newType } : m));
    } catch (err) {
      console.error(err);
      console.log("Failed to toggle matchup type");
    }
  };

  const handleSetAllToSpread = async () => {
    if (campaign?.name === 'YES Day Walk for Autism 2026') {
      alert("YES Day Walk for Autism 2026 is strictly Moneyline (STANDARD) picks.");
      return;
    }
    if (!confirm(`Set all Week ${selectedWeek} matchups to Against The Spread (ATS)?`)) return;

    try {
      const batch = writeBatch(db);
      matchups.forEach(m => {
        batch.update(doc(db, "pickemMatchups", m.id), { type: "SPREAD" });
      });
      await batch.commit();
      setMatchups(prev => prev.map(m => ({ ...m, type: "SPREAD" })));
      console.log("All matchups set to ATS.");
    } catch (err) {
      console.error(err);
      console.log("Failed to update matchups");
    }
  };

  const handleDeleteMatchup = async (matchupId: string) => {
    

    try {
      await deleteDoc(doc(db, 'pickemMatchups', matchupId));
      setMatchups(prev => prev.filter(m => m.id !== matchupId));
    } catch (err) {
      console.error(err);
      console.log('Failed to remove matchup');
    }
  };

  const handleGradeMatchup = async (m: any) => {
    let promptMsg = `Manual Grading Options for ${m.title}:\n\n`;
    if (m.type === 'OVER_UNDER') {
      promptMsg += `1: OVER\n2: UNDER\n`;
    } else {
      promptMsg += `1: Home Win (${m.homeTeam?.name || 'Home'})\n2: Away Win (${m.awayTeam?.name || 'Away'})\n`;
    }
    promptMsg += `3: Push (Tie)\n4: Auto Grade\n\nEnter 1, 2, 3, or 4:`;

    const action = window.prompt(promptMsg);
    if (!action) return;

    let manualWinnerId: string | undefined = undefined;
    if (action === '1') manualWinnerId = m.type === 'OVER_UNDER' ? 'OVER' : m.homeTeam?.id;
    else if (action === '2') manualWinnerId = m.type === 'OVER_UNDER' ? 'UNDER' : m.awayTeam?.id;
    else if (action === '3') manualWinnerId = 'PUSH';
    else if (action === '4') manualWinnerId = undefined;
    else {
      console.log("Invalid option. Grading cancelled.");
      return;
    }

    

    try {
        const res = await fetch('/api/admin/grade-pickem-matchup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
            },
            body: JSON.stringify({ matchupId: m.id, manualWinnerId })
        });
        const data = await res.json();
        if (data.success) {
            console.log('Matchup graded successfully!');
        } else {
            console.log('Failed to grade picks: ' + (data.error || 'Unknown error'));
        }
    } catch (err: any) {
        console.error('Error grading matchup:', err);
        console.log(`Failed to contact server for grading. Error: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!campaign) return <div className="p-8">Campaign not found</div>;

  return (
    <>
      {showPropModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181A] rounded-xl border border-zinc-800 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Add Custom Prop Matchup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Prop Title / Question</label>
                <input type="text" value={propTitle} onChange={e => setPropTitle(e.target.value)} placeholder="e.g. First pitcher to 3 strikeouts" className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Option A</label>
                <input type="text" value={propOptionA} onChange={e => setPropOptionA(e.target.value)} placeholder="e.g. Gerrit Cole" className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Option B</label>
                <input type="text" value={propOptionB} onChange={e => setPropOptionB(e.target.value)} placeholder="e.g. Justin Verlander" className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Event Time</label>
                <input type="datetime-local" value={propDate} onChange={e => setPropDate(e.target.value)} className="w-full bg-[#121212] border border-zinc-800 rounded-lg px-4 py-2 text-white [color-scheme:dark]" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 justify-end">
              <Button variant="ghost" onClick={() => setShowPropModal(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
              <Button onClick={handleAddProp}>Add Prop</Button>
            </div>
          </div>
        </div>
      )}

    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
          <p className="text-xs text-zinc-400 mt-1">Manage campaign schedule, week settings, access controls, and theme parameters.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/admin/pickem')}>Back</Button>
          <Button onClick={handleSaveCampaign} className="bg-purple-600 hover:bg-purple-500 text-white font-bold">Save All Settings</Button>
        </div>
      </div>

      {/* Campaign Overview Stats Card */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
        <div className="px-2">
          <span className="text-xs font-medium text-zinc-400 block mb-1">Leagues</span>
          <span className="text-base font-semibold text-white">
            {campaign.leagues && campaign.leagues.length > 0 ? campaign.leagues.join(', ') : campaign.league || 'None'}
          </span>
        </div>
        <div className="px-2 pt-2 sm:pt-0">
          <span className="text-xs font-medium text-zinc-400 block mb-1">Pick Limit</span>
          <span className="text-base font-semibold text-white">
            {campaign.pickLimit > 0 ? `${campaign.pickLimit} picks/week` : 'Unlimited'}
          </span>
        </div>
        <div className="px-2 pt-2 sm:pt-0">
          <span className="text-xs font-medium text-zinc-400 block mb-1">Entry Fee</span>
          <span className="text-base font-semibold text-white">{entryFee > 0 ? `${entryFee} Links` : 'Free'}</span>
        </div>
        <div className="px-2 pt-2 sm:pt-0">
          <span className="text-xs font-medium text-zinc-400 block mb-1">Active Live Week</span>
          <select
            value={activeLiveWeek}
            onChange={(e) => setActiveLiveWeek(Number(e.target.value))}
            className="bg-[#18181A] border border-zinc-800 rounded px-2 py-1 text-sm font-semibold text-purple-400 focus:outline-none focus:border-purple-500"
          >
            {[...Array(campaign?.hasWeekZero ? totalWeeks + 1 : totalWeeks)].map((_, i) => {
              const w = campaign?.hasWeekZero ? i : i + 1;
              return (
                <option key={w} value={w}>Week {w}</option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Week Management Section */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div>
            <h3 className="text-lg font-bold text-white">Week Management</h3>
            <p className="text-xs text-zinc-400">Configure visibility and sync bounds for individual campaign weeks.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm font-medium focus:outline-none focus:border-purple-500"
            >
              {[...Array(campaign?.hasWeekZero ? totalWeeks + 1 : totalWeeks)].map((_, i) => {
                const w = campaign?.hasWeekZero ? i : i + 1;
                const lbl = campaign?.weekSettings?.[w]?.label;
                return (
                  <option key={w} value={w}>{lbl ? `Week ${w} (${lbl})` : `Week ${w}`}</option>
                );
              })}
            </select>
            <Button onClick={handleSaveCampaign} variant="secondary" size="sm">Save Week Selection</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Week {selectedWeek} Display Label <span className="text-zinc-500 font-normal">(Optional)</span></label>
              <input
                type="text"
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                placeholder="e.g. Preseason Week 2"
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/60 cursor-pointer">
              <input
                type="checkbox"
                checked={weekIsVisible}
                onChange={e => setWeekIsVisible(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#18181A] text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="text-sm font-medium text-zinc-200 block">Visible to Users</span>
                <span className="text-xs text-zinc-400">Allow users to view & pick matchups for Week {selectedWeek}.</span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Week {selectedWeek} Sync Start Boundary <span className="text-zinc-500 font-normal">(Optional)</span></label>
            <input
              type="datetime-local"
              value={weekGamesBeginDateStr}
              onChange={e => setWeekGamesBeginDateStr(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
            />
            <p className="text-xs text-zinc-500 mt-1.5">Earliest game start time to pull during sync.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Week {selectedWeek} Sync End Boundary <span className="text-zinc-500 font-normal">(Optional)</span></label>
            <input
              type="datetime-local"
              value={weekEndDateStr}
              onChange={e => setWeekEndDateStr(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
            />
            <p className="text-xs text-zinc-500 mt-1.5">Latest game start time to pull during sync.</p>
          </div>
        </div>
      </div>

      {/* Campaign Schedule & Rules Card */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white">Campaign Schedule & Rules</h3>
          <p className="text-xs text-zinc-400">Set overall campaign lifecycle dates, fees, and tiebreaker options.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Visible Date</label>
            <input
              type="datetime-local"
              value={visibleDateStr}
              onChange={e => setVisibleDateStr(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Games Begin Date</label>
            <input
              type="datetime-local"
              value={gamesBeginDateStr}
              onChange={e => setGamesBeginDateStr(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">End Date</label>
            <input
              type="datetime-local"
              value={endDateStr}
              onChange={e => setEndDateStr(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Entry Fee / Buy In (Links)</label>
            <input
              type="number"
              min="0"
              value={entryFee}
              onChange={e => setEntryFee(parseInt(e.target.value) || 0)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Total Weeks (excluding Week 0)</label>
            <input
              type="number"
              min="1"
              value={totalWeeks}
              onChange={e => setTotalWeeks(parseInt(e.target.value) || 1)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/60 cursor-pointer">
              <input
                type="checkbox"
                checked={hasWeekZero}
                onChange={e => setHasWeekZero(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#18181A] text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-zinc-200">Include Week 0 (e.g. for CFB)</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/60 cursor-pointer">
              <input
                type="checkbox"
                checked={useTiebreaker}
                onChange={e => setUseTiebreaker(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#18181A] text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-zinc-200">Enable Tiebreaker Features</span>
            </label>
          </div>
        </div>
      </div>

      {/* Grid for Access & Theme Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Settings */}
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">Access Settings</h3>
            <p className="text-xs text-zinc-400">Manage campaign visibility and access passcodes.</p>
          </div>

          <label className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/60 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-[#18181A] text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="text-sm font-medium text-zinc-200 block">Private Campaign</span>
              <span className="text-xs text-zinc-400">Require a join code to access this campaign.</span>
            </div>
          </label>

          {isPrivate && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Join Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Enter a secret code to join"
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {joinCode && (
                <div className="bg-zinc-900/80 p-4 rounded-lg border border-zinc-800 space-y-2">
                  <label className="block text-xs font-medium text-zinc-400">Direct Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/pickem?joinCode=${joinCode}`}
                      className="flex-1 bg-black/50 border border-zinc-800 rounded px-3 py-1.5 text-zinc-300 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/pickem?joinCode=${joinCode}`);
                        alert('Link copied to clipboard!');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* White Label / Theme Settings */}
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">White Label / Theme Settings</h3>
            <p className="text-xs text-zinc-400">Customize branding title, subtitle, colors, and logo.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Theme Title</label>
              <input
                type="text"
                value={themeTitle}
                onChange={e => setThemeTitle(e.target.value)}
                placeholder="Defaults to Campaign Name"
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Theme Subtitle</label>
              <input
                type="text"
                value={themeSubtitle}
                onChange={e => setThemeSubtitle(e.target.value)}
                placeholder="Optional subtitle"
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Primary Color</label>
              <div className="flex items-center gap-3 bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5">
                <input
                  type="color"
                  value={themePrimaryColor}
                  onChange={e => setThemePrimaryColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-zinc-200 text-sm font-mono">{themePrimaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Logo Image</label>
              {themeLogoUrl && (
                <div className="mb-2 p-1 bg-black/40 border border-zinc-800 rounded w-fit">
                  <img src={themeLogoUrl} alt="Current Logo" className="h-8 object-contain" loading="lazy" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setThemeLogoFile(e.target.files[0]);
                  }
                }}
                className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
          <h3 className="font-bold text-lg capitalize">{campaign?.weekSettings?.[selectedWeek]?.label || `Week ${selectedWeek}`} Matchups ({matchups.length})</h3>
          
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowPropModal(true)} size="sm" variant="outline" className="gap-2 text-white bg-zinc-800 hover:bg-zinc-700">
               <Plus className="w-4 h-4" />
               Add Custom Prop
            </Button>
            <Button onClick={handleSyncMatchups} size="sm" className="gap-2" disabled={matchupsLoading}>
               <RefreshCw className={`w-4 h-4 ${matchupsLoading ? 'animate-spin' : ''}`} />
               Sync Matchups
            </Button>
          </div>

        </div>

        {matchupsLoading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading matchups...</div>
        ) : matchups.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No matchups found for Week {selectedWeek}.</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Game Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Start Time</th>
                  <th className="px-4 py-3 font-medium">Odds</th>
                  <th className="px-4 py-3 font-medium text-center">Type</th>
                  <th className="px-4 py-3 font-medium text-center">Tiebreaker</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {matchups.slice().sort((a: any, b: any) => {
                  const timeA = typeof a.startTime === 'number' ? a.startTime : (a.startTime ? new Date(a.startTime).getTime() : 0);
                  const timeB = typeof b.startTime === 'number' ? b.startTime : (b.startTime ? new Date(b.startTime).getTime() : 0);
                  return timeA - timeB;
                }).map(m => (
                  <tr key={m.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-200">{m.title}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.statusDesc || m.status}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(m.startTime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {(() => {
                        const hasSpread = m.metadata?.spread !== undefined && m.metadata?.spread !== null && m.metadata?.spread !== '';
                        const spreadStr = hasSpread ? (Number(m.metadata.spread) > 0 ? `+${m.metadata.spread}` : `${m.metadata.spread}`) : null;

                        const hasMlAway = m.metadata?.mlAway !== undefined && m.metadata?.mlAway !== null && m.metadata?.mlAway !== '';
                        const hasMlHome = m.metadata?.mlHome !== undefined && m.metadata?.mlHome !== null && m.metadata?.mlHome !== '';
                        const hasML = hasMlAway || hasMlHome;

                        const formatML = (val: any) => {
                          if (val === undefined || val === null || val === '') return '-';
                          const num = Number(val);
                          return isNaN(num) ? String(val) : (num > 0 ? `+${num}` : String(num));
                        };

                        if (!hasSpread && !hasML) {
                          return <span className="text-zinc-600">-</span>;
                        }

                        return (
                          <div className="flex flex-col gap-0.5">
                            {hasSpread && (
                              <span className="text-zinc-300 font-semibold">
                                Spread: {spreadStr}
                              </span>
                            )}
                            {hasML && (
                              <span className="text-zinc-400">
                                ML: {formatML(m.metadata?.mlAway)} / {formatML(m.metadata?.mlHome)}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleSpread(m.id, m.type)}
                        className={`px-2 py-1 text-xs rounded-md font-bold ${m.type === "SPREAD" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}
                      >
                        {m.type === "SPREAD" ? "ATS" : "STD"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleTiebreaker(m.id, !!m.isTiebreaker)}
                        className={`px-2 py-1 text-xs rounded-md font-bold ${m.isTiebreaker ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}
                      >
                        {m.isTiebreaker ? "YES" : "NO"}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      <button onClick={() => handleGradeMatchup(m)} className="text-blue-500/70 hover:text-blue-500 p-2" title="Grade Matchup">
                         Grade
                      </button>
                      <button onClick={() => handleDeleteMatchup(m.id)} className="text-red-500/70 hover:text-red-500 p-2" title="Remove Matchup">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
