import { Save, Loader2, Calendar, Plus, Edit2, Trash2, Clock, PlayCircle, Link as LinkIcon, Palette, Image as ImageIcon, RefreshCw, Coins } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, writeBatch, where } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { SUPPORTED_LEAGUES, scrapeLeagueSchedules } from '../../../services/espnScraper';

interface Link4SegmentTheme {
  primaryColor: string;
  logoUrl: string;
  sponsorName: string;
  sponsorUrl: string;
}

interface Link4Segment {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  allowedSports: string[];
  theme: Link4SegmentTheme;
  createdAt: number;
  updatedAt: number;
  payoutComplete?: boolean;
  cost: number;
}

const SPORTS = SUPPORTED_LEAGUES.map(league => ({ id: league, label: league }));

export default function Link4AdminPage() {
  const [segments, setSegments] = useState<Link4Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string>('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [allowedSports, setAllowedSports] = useState<string[]>([]);

  // Theme State
  const [primaryColor, setPrimaryColor] = useState('#22c55e');
  const [logoUrl, setLogoUrl] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSegments = async () => {
    try {
      const segmentsRef = collection(db, 'link4Segments');
      const q = query(segmentsRef, orderBy('startTime', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Link4Segment));
      setSegments(data);
    } catch (error) {
      console.error('Error fetching Link4 segments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const resetForm = () => {
    setIsEditing(false);
    setEditId('');
    setName('');
    setStartTime('');
    setEndTime('');
    setAllowedSports([]);
    setPrimaryColor('#22c55e');
    setLogoUrl('');
    setSponsorName('');
    setSponsorUrl('');
  };

  const handleEdit = (segment: Link4Segment) => {
    setIsEditing(true);
    setEditId(segment.id);
    setName(segment.name);

    // Format UTC string back to datetime-local format for the input
    try {
      const start = new Date(segment.startTime);
      const startString = new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setStartTime(startString);

      const end = new Date(segment.endTime);
      const endString = new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setEndTime(endString);
    } catch (e) {
      setStartTime(segment.startTime);
      setEndTime(segment.endTime);
    }

    setAllowedSports(segment.allowedSports || []);

    if (segment.theme) {
      setPrimaryColor(segment.theme.primaryColor || '#22c55e');
      setLogoUrl(segment.theme.logoUrl || '');
      setSponsorName(segment.theme.sponsorName || '');
      setSponsorUrl(segment.theme.sponsorUrl || '');
    } else {
      setPrimaryColor('#22c55e');
      setLogoUrl('');
      setSponsorName('');
      setSponsorUrl('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this segment?")) return;

    try {
      await deleteDoc(doc(db, 'link4Segments', id));
      setSegments(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting segment:', error);
      alert('Failed to delete segment');
    }
  };

  const handleSave = async () => {
    if (!name || !startTime || !endTime) {
      setSaveStatus({ type: 'error', message: 'Name, Start Time, and End Time are required' });
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus(null);

      const segmentId = isEditing ? editId : `segment_${Date.now()}`;
      const docRef = doc(db, 'link4Segments', segmentId);

      // Ensure we store dates as UTC strings so they can be reliably queried
      const startTimeUTC = new Date(startTime).toISOString();
      const endTimeUTC = new Date(endTime).toISOString();

      const payload: Partial<Link4Segment> = {
        name,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        allowedSports,
        theme: {
          primaryColor,
          logoUrl,
          sponsorName,
          sponsorUrl
        },
        updatedAt: Date.now(),
      };

      if (!isEditing) {
        payload.createdAt = Date.now();
      }

      await setDoc(docRef, payload, { merge: true });

      setSaveStatus({ type: 'success', message: `Segment ${isEditing ? 'updated' : 'created'} successfully` });
      resetForm();
      fetchSegments(); // Refresh list
    } catch (error) {
      console.error('Error saving segment:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save segment' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const toggleSport = (sportId: string) => {
    setAllowedSports(prev =>
      prev.includes(sportId)
        ? prev.filter(s => s !== sportId)
        : [...prev, sportId]
    );
  };

  const getSegmentStatus = (start: string, end: string) => {
    const now = new Date().getTime();
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (now < startTime) return { label: 'Upcoming', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' };
    if (now >= startTime && now <= endTime) return { label: 'Active', color: 'text-green-400 border-green-400/30 bg-green-400/10' };
    return { label: 'Completed', color: 'text-zinc-500 border-zinc-700 bg-zinc-800' };
  };


  const handlePayout = async (segmentId: string) => {
    if (!confirm('Are you sure you want to payout this segment? This action cannot be undone.')) return;
    setPayoutLoading(segmentId);
    try {
      const response = await fetch('/api/admin/link4/payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ segmentId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payout failed');
      }
      alert('Payout successful!');
    } catch (e: any) {
      console.error('Payout error:', e);
      alert(e.message);
    } finally {
      setPayoutLoading(null);
    }
  };

  const handleSyncEligible = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      // 1. Get all picked matchups to exclude them from updates
      const picksSnap = await getDocs(collection(db, 'link4Picks'));
      const pickedGameIds = new Set<string>();
      picksSnap.docs.forEach(d => {
         const data = d.data();
         const picks = Array.isArray(data.picks) ? data.picks : (data.picks ? Object.values(data.picks) : []);
         picks.forEach((p: any) => {
            if (p?.matchupId) {
               pickedGameIds.add(p.matchupId);
            } else if (p?.id && p.id.startsWith('pick-')) {
               pickedGameIds.add(p.id.replace('pick-', ''));
            }
         });
      });

      let scraperConfig: { maxMoneylineOdds?: number, sportOverrides?: Record<string, number> } = {};
      try {
        const scraperSnap = await getDocs(query(collection(db, 'systemSettings')));
        const scraperDoc = scraperSnap.docs.find(d => d.id === 'scraper')?.data();
        if (scraperDoc) {
          scraperConfig = scraperDoc as any;
        }
      } catch (e) {
        console.error("Error fetching system settings", e);
      }

      // 2. Determine which leagues to scrape. We'll scrape all active segment allowed sports, or all supported sports if none active
      let sportsToScrape: string[] | readonly string[] = SUPPORTED_LEAGUES;
      const activeSegment = segments.find(s => {
          const status = getSegmentStatus(s.startTime, s.endTime);
          return status.label === 'Active' || status.label === 'Upcoming';
      });
      if (activeSegment && Array.isArray(activeSegment.allowedSports) && activeSegment.allowedSports.length > 0) {
          sportsToScrape = activeSegment.allowedSports;
      }

      let totalSynced = 0;

      for (const league of sportsToScrape) {
         try {
            // @ts-ignore
            const result = await scrapeLeagueSchedules(league, false, scraperConfig);
            const scrapedMatchups = result.data;

            if (!scrapedMatchups || scrapedMatchups.length === 0) continue;

            const existingSnap = await getDocs(query(collection(db, 'matchups'), where('league', '==', league)));
            const existingMap = new Map<string, any>();
            existingSnap.docs.forEach(d => {
               const m = d.data();
               existingMap.set(m.gameId, d);
            });

            let defaultActive = true;
            try {
               const settingsSnap = await getDocs(query(collection(db, 'leagueSettings')));
               const leagueSetting = settingsSnap.docs.find(d => d.id === league)?.data();
               if (leagueSetting && typeof leagueSetting.active === 'boolean') {
                  defaultActive = leagueSetting.active;
               }
            } catch (e) {}

            let batch = writeBatch(db);
            let opCount = 0;

            for (const scrapedMatchup of scrapedMatchups) {
                // Only process games that have BOTH ML home and away
                const hasML = scrapedMatchup.metadata?.mlHome !== undefined && scrapedMatchup.metadata?.mlHome !== null &&
                              scrapedMatchup.metadata?.mlAway !== undefined && scrapedMatchup.metadata?.mlAway !== null;

                if (!hasML) continue;

                const gameId = scrapedMatchup.gameId;
                if (pickedGameIds.has(gameId)) continue; // Do not update picked games

                const existingDoc = existingMap.get(gameId);

                if (existingDoc) {
                    // Since we're syncing just for eligible ML, update if ML changed
                    const existingData = existingDoc.data();
                    batch.update(doc(db, 'matchups', existingDoc.id), {
                        'metadata.mlHome': scrapedMatchup.metadata.mlHome,
                        'metadata.mlAway': scrapedMatchup.metadata.mlAway,
                        updatedAt: Date.now()
                    });
                    opCount++;
                } else {
                    const newDocRef = doc(db, 'matchups', gameId);
                    batch.set(newDocRef, {
                        ...scrapedMatchup,
                        active: scrapedMatchup.active && defaultActive,
                        updatedAt: Date.now(),
                        createdAt: Date.now()
                    });
                    opCount++;
                }
                totalSynced++;

                if (opCount >= 500) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            }
            if (opCount > 0) {
                await batch.commit();
            }
         } catch (e) {
             console.error(`Error syncing ${league}:`, e);
         }
      }
      setSyncStatus({ type: 'success', message: `Successfully synced ${totalSynced} eligible games.` });
    } catch (e) {
      console.error("Error during manual sync:", e);
      setSyncStatus({ type: 'error', message: 'Failed to sync eligible games.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-4" />
        <p className="text-zinc-400">Loading Link4 segments...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl text-zinc-100 font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-green-500" />
          Manage Link4 Segments
        </h3>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Form */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden shadow-lg sticky top-8">
            <div className="p-4 border-b border-zinc-800 bg-[#1a1a1a] flex justify-between items-center">
              <h4 className="font-bold text-zinc-100 flex items-center gap-2">
                {isEditing ? <Edit2 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-green-500" />}
                {isEditing ? 'Edit Segment' : 'Create New Segment'}
              </h4>
              {isEditing && (
                <button onClick={resetForm} className="text-xs text-zinc-400 hover:text-white underline">
                  Cancel
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Segment Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NFL Week 12 Link4"
                  className="w-full bg-[#27272a] border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 flex items-center gap-1">
                  <PlayCircle className="w-4 h-4" /> Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#27272a] border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> End Time (Deadline)
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#27272a] border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Allowed Sports</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPORTS.map(sport => (
                    <label
                      key={sport.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        allowedSports.includes(sport.id)
                          ? 'bg-green-500/10 border-green-500/50 text-green-400'
                          : 'bg-[#27272a] border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedSports.includes(sport.id)}
                        onChange={() => toggleSport(sport.id)}
                        className="hidden"
                      />
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        allowedSports.includes(sport.id) ? 'border-green-500 bg-green-500' : 'border-zinc-500'
                      }`}>
                        {allowedSports.includes(sport.id) && <div className="w-1.5 h-1.5 bg-[#1a1a1a] rounded-full" />}
                      </div>
                      <span className="font-medium text-xs">{sport.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-800 my-2 pt-4">
                <h5 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Theme & Sponsorship (Optional)
                </h5>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                       Primary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-10 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 bg-[#27272a] border border-zinc-700 rounded-lg px-3 text-white focus:outline-none focus:border-green-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Logo URL
                    </label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full bg-[#27272a] border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-green-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Sponsor Name</label>
                    <input
                      type="text"
                      value={sponsorName}
                      onChange={(e) => setSponsorName(e.target.value)}
                      placeholder="e.g. ChainLink Partners"
                      className="w-full bg-[#27272a] border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-green-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> Sponsor URL
                    </label>
                    <input
                      type="url"
                      value={sponsorUrl}
                      onChange={(e) => setSponsorUrl(e.target.value)}
                      placeholder="https://sponsor.com"
                      className="w-full bg-[#27272a] border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-green-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                {saveStatus && (
                  <span className={`text-xs ${saveStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.message}
                  </span>
                )}
                {!saveStatus && <div />}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditing ? 'Save Changes' : 'Create Segment'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <h4 className="text-lg text-zinc-200 font-medium flex items-center gap-2">
              <Calendar className="w-5 h-5 text-zinc-400" />
              Segments List
            </h4>

            <div className="flex items-center gap-3">
               {syncStatus && (
                 <span className={`text-xs font-medium ${syncStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{syncStatus.message}</span>
               )}
               <button
                 onClick={handleSyncEligible}
                 disabled={isSyncing}
                 className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
               >
                 {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                 Sync Eligible Games
               </button>
            </div>
          </div>

          {segments.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-8 text-center">
              <p className="text-zinc-500">No Link4 segments created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segments.map(segment => {
                const status = getSegmentStatus(segment.startTime, segment.endTime);

                return (
                  <div key={segment.id} className="bg-[#1a1a1a] border border-[#27272a] rounded-xl p-5 hover:border-zinc-700 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="text-white font-bold text-lg mb-1">{segment.name}</h5>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(segment)}
                          className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(segment.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between text-zinc-400">
                        <span>Start:</span>
                        <span className="text-zinc-200">{new Date(segment.startTime).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>End:</span>
                        <span className="text-zinc-200">{new Date(segment.endTime).toLocaleString()}</span>
                      </div>

                      {segment.theme?.sponsorName && (
                        <div className="flex justify-between text-zinc-400">
                           <span>Sponsor:</span>
                           <span className="text-zinc-200 font-medium" style={{ color: segment.theme.primaryColor || '#fff' }}>
                             {segment.theme.sponsorName}
                           </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-zinc-500 mb-1.5">Allowed Sports:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {segment.allowedSports?.length > 0 ? (
                          segment.allowedSports.map(sport => (
                            <span key={sport} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] font-medium">
                              {sport}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500 text-xs italic">None selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
