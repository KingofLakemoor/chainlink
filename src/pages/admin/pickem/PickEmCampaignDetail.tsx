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
  const [themeLogoUrl, setThemeLogoUrl] = useState('');

  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');


  const fetchCampaign = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'pickemCampaigns', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCampaign({ id: docSnap.id, ...data });
        setSelectedWeek(data.currentWeek || 1);

        setThemePrimaryColor(data.theme?.primaryColor || '#22c55e');
        setThemeTitle(data.theme?.title || '');
        setThemeSubtitle(data.theme?.subtitle || '');
        setThemeLogoUrl(data.theme?.logoUrl || '');

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
      setMatchups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    if (campaign && selectedWeek) {
      fetchMatchups(selectedWeek);
    }
  }, [campaign, selectedWeek]);

  const updateCurrentWeek = async () => {
    if (!campaign || !id) return;
    try {

    let finalLogoUrl = themeLogoUrl;
    if (themeLogoFile) {
      const storage = getStorage(app);
      const storageRef = ref(storage, `pickem_logos/${Date.now()}_${themeLogoFile.name}`);
      await uploadBytes(storageRef, themeLogoFile);
      finalLogoUrl = await getDownloadURL(storageRef);
    }

      await updateDoc(doc(db, 'pickemCampaigns', id), {
        currentWeek: selectedWeek,
        startDate: startDateStr ? new Date(startDateStr).getTime() || campaign.startDate || Date.now() : campaign.startDate || Date.now(),
        endDate: endDateStr ? new Date(endDateStr).getTime() || campaign.endDate || Date.now() : campaign.endDate || Date.now(),

      theme: {
        primaryColor: themePrimaryColor,
        title: themeTitle,
        subtitle: themeSubtitle,
        logoUrl: finalLogoUrl,
      }

      });
      setCampaign(prev => ({ ...prev, currentWeek: selectedWeek, theme: { primaryColor: themePrimaryColor, title: themeTitle, subtitle: themeSubtitle, logoUrl: finalLogoUrl } }));
      alert(`Campaign updated`);
    } catch (err) {
      console.error(err);
      alert('Failed to update week');
    }
  };

  
  const handleAddProp = async () => {
    if (!id || !propTitle || !propOptionA || !propOptionB || !propDate) {
      alert('Please fill out all fields');
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
      alert('Failed to add prop');
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
      alert("No leagues configured for this campaign.");
      return;
    }

    if (!confirm(`Sync ${leaguesToSync.join(', ')} matchups for Week ${selectedWeek}?`)) return;

    setMatchupsLoading(true);
    try {
      let count = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const lg of leaguesToSync) {
        const res = await scrapeLeagueSchedules(lg, false);
        if (!res.data || res.data.length === 0) {
          console.warn(`No games found to sync for ${lg}.`);
          continue;
        }

        for (const m of res.data) {
          // Skip games that start before the campaign starts or after it ends
          if (campaign.startDate && m.startTime < campaign.startDate) {
            continue;
          }
          if (campaign.endDate && m.startTime > campaign.endDate) {
            continue;
          }

          const pickemMatchupId = `${id}_${selectedWeek}_${m.gameId}`;
          const docRef = doc(db, 'pickemMatchups', pickemMatchupId);

          let metadataToSave = m.metadata || null;

          // For CFB and NFL, check if it's before Thursday 2AM AZ time (9AM UTC) relative to the GAME'S week
          if ((lg === 'CFB' || lg === 'NFL') && m.metadata) {
             // Find the previous Thursday at 9AM UTC relative to the game's start time
             const gameDate = new Date(m.startTime);
             const gameDay = gameDate.getUTCDay();

             // How many days since the last Thursday?
             // If gameDay is Thursday (4), and hour >= 9, it's 0 days.
             // If gameDay is Thursday (4) and hour < 9, the "last Thursday" was 7 days ago.
             // We can simplify by just getting the current timestamp and finding the MOST RECENT Thursday 9AM UTC,
             // then checking if the current time is before that.
             // Wait, the lock time is the Thursday *of the game's week*.
             // For a CFB game on Saturday, lock is that same week's Thursday.
             // Let's construct the lock date based on the game's start time:
             const lockDate = new Date(m.startTime);

             // Determine days to subtract to get to Thursday (4)
             let daysToSubtract = gameDay - 4;
             if (daysToSubtract < 0) {
                 daysToSubtract += 7; // e.g., if game is Wed (3), lock was last Thursday (subtract 6)
             }

             lockDate.setUTCDate(lockDate.getUTCDate() - daysToSubtract);
             lockDate.setUTCHours(9, 0, 0, 0); // 9 AM UTC

             const now = new Date();
             const isBeforeThursdayLock = now.getTime() < lockDate.getTime();

             if (isBeforeThursdayLock) {
                metadataToSave = { ...m.metadata, spreadLocked: false };
             } else {
                metadataToSave = { ...m.metadata, spreadLocked: true };
             }
          }

          batch.set(docRef, {
            campaignId: id,
            week: selectedWeek,
            gameId: m.gameId,
            title: m.title,
            startTime: m.startTime,
            status: m.status,
            statusDesc: m.statusDesc,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            type: campaign.defaultMatchType || "STANDARD",
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
        alert("No games found to sync across any leagues.");
      }
    } catch (err) {
      console.error(err);
      alert('Failed to sync matchups');
    } finally {
      setMatchupsLoading(false);
    }
  };


  const handleToggleSpread = async (matchupId: string, currentType: string) => {
    try {
      const newType = currentType === "SPREAD" ? "STANDARD" : "SPREAD";
      await updateDoc(doc(db, "pickemMatchups", matchupId), {
        type: newType
      });
      setMatchups(prev => prev.map(m => m.id === matchupId ? { ...m, type: newType } : m));
    } catch (err) {
      console.error(err);
      alert("Failed to toggle matchup type");
    }
  };

  const handleSetAllToSpread = async () => {
    if (!confirm(`Set all Week ${selectedWeek} matchups to Against The Spread (ATS)?`)) return;

    try {
      const batch = writeBatch(db);
      matchups.forEach(m => {
        batch.update(doc(db, "pickemMatchups", m.id), { type: "SPREAD" });
      });
      await batch.commit();
      setMatchups(prev => prev.map(m => ({ ...m, type: "SPREAD" })));
      alert("All matchups set to ATS.");
    } catch (err) {
      console.error(err);
      alert("Failed to update matchups");
    }
  };

  const handleDeleteMatchup = async (matchupId: string) => {
    if (!confirm('Are you sure you want to remove this matchup from the pool?')) return;

    try {
      await deleteDoc(doc(db, 'pickemMatchups', matchupId));
      setMatchups(prev => prev.filter(m => m.id !== matchupId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove matchup');
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
      alert("Invalid option. Grading cancelled.");
      return;
    }

    if (!confirm(`Are you sure you want to trigger grading for this game${manualWinnerId ? ' with your manual selection' : ' automatically'}?`)) return;

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
            alert('Matchup graded successfully!');
        } else {
            alert('Failed to grade picks: ' + (data.error || 'Unknown error'));
        }
    } catch (err: any) {
        console.error('Error grading matchup:', err);
        alert(`Failed to contact server for grading. Error: ${err.message}`);
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

    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">{campaign.name}</h2>
        <Button variant="ghost" onClick={() => navigate('/admin/pickem')}>Back</Button>
      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <p className="text-zinc-400">Leagues: <span className="text-white font-medium">
            {campaign.leagues && campaign.leagues.length > 0 ? campaign.leagues.join(', ') : campaign.league}
          </span></p>
          <p className="text-zinc-400">Pick Limit: <span className="text-white font-medium">
            {campaign.pickLimit > 0 ? campaign.pickLimit : 'Unlimited'}
          </span></p>
          <p className="text-zinc-400">Active Week: <span className="text-white font-medium">{campaign.currentWeek}</span></p>
        </div>

        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Manage Week</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              {[...Array(20)].map((_, i) => (
                <option key={i+1} value={i+1}>Week {i+1}</option>
              ))}
            </select>
          </div>
          <Button onClick={updateCurrentWeek} variant="secondary">Update Campaign</Button>
        </div>


          {/* Campaign Schedule */}
          <div className="pt-6 border-t border-zinc-800 w-full mt-6 col-span-2">
            <h3 className="text-lg font-medium text-white mb-4">Campaign Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={startDateStr}
                  onChange={e => setStartDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={endDateStr}
                  onChange={e => setEndDateStr(e.target.value)}
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="pt-6 border-t border-zinc-800 w-full mt-6 col-span-2">
            <h3 className="text-lg font-medium text-white mb-4">White Label / Theme Settings</h3>

            <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Theme Title</label>
                  <input
                    type="text"
                    value={themeTitle}
                    onChange={e => setThemeTitle(e.target.value)}
                    placeholder="Leave blank to use Campaign Name"
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Theme Subtitle</label>
                  <input
                    type="text"
                    value={themeSubtitle}
                    onChange={e => setThemeSubtitle(e.target.value)}
                    placeholder="Optional subtitle"
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themePrimaryColor}
                      onChange={e => setThemePrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-zinc-400 text-sm">{themePrimaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Logo Image</label>
                  {themeLogoUrl && (
                    <div className="mb-2">
                      <img src={themeLogoUrl} alt="Current Logo" className="h-12 object-contain" loading="lazy" />
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
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

      </div>

      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
          <h3 className="font-bold text-lg capitalize">Week {selectedWeek} Matchups ({matchups.length})</h3>
          
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
                  <th className="px-4 py-3 font-medium text-center">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {matchups.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-200">{m.title}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.statusDesc || m.status}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(m.startTime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleSpread(m.id, m.type)}
                        className={`px-2 py-1 text-xs rounded-md font-bold ${m.type === "SPREAD" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}
                      >
                        {m.type === "SPREAD" ? "ATS" : "STD"}
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
