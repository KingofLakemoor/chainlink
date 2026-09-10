import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch, query, limit, addDoc, setDoc, getDoc, where } from 'firebase/firestore';
import { db, auth, app } from '../../../lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { scrapeLeagueSchedules } from '../../../services/espnScraper';
import {
  Layers, Plus, Search, Edit, Trash2, Archive, ArchiveRestore, Lock, Unlock,
  RefreshCw, CheckCircle2, Trophy, Users, Calendar, Shield, X, Eye, Palette
} from 'lucide-react';

export default function PickEmAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawers state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Sync state
  const [resetting, setResetting] = useState(false);

  // --- Create Form State ---
  const [createData, setCreateForm] = useState({
    name: '',
    leagues: ['CFB'],
    defaultMatchType: 'STANDARD',
    format: 'STANDARD',
    pickLimit: 0,
    totalWeeks: 18,
    hasWeekZero: false,
    useTiebreaker: false,
    entryFee: 0,
    isOpen: true,
    isPrivate: false,
    joinCode: '',
    themePrimaryColor: '#22c55e',
    themeTitle: '',
    themeSubtitle: '',
    themeLogoUrl: '',
    gamesBeginDateStr: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    endDateStr: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 16)
  });
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // --- Detail / Edit Drawer State ---
  const [detailCampaign, setDetailCampaign] = useState<any | null>(null);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [activeLiveWeek, setActiveLiveWeek] = useState<number>(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [matchupsLoading, setMatchupsLoading] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);

  // Detail Edit Fields
  const [editThemeColor, setEditThemeColor] = useState('#22c55e');
  const [editThemeTitle, setEditThemeTitle] = useState('');
  const [editThemeSubtitle, setEditThemeSubtitle] = useState('');
  const [editThemeLogoUrl, setEditThemeLogoUrl] = useState('');
  const [editThemeLogoFile, setEditThemeLogoFile] = useState<File | null>(null);
  const [editIsOpen, setEditIsOpen] = useState(true);
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editJoinCode, setEditJoinCode] = useState('');
  const [editGamesBeginStr, setEditGamesBeginStr] = useState('');
  const [editEndDateStr, setEditEndDateStr] = useState('');
  const [editTotalWeeks, setEditTotalWeeks] = useState(18);
  const [editHasWeekZero, setEditHasWeekZero] = useState(false);
  const [editUseTiebreaker, setEditUseTiebreaker] = useState(false);
  const [editEntryFee, setEditEntryFee] = useState(0);

  // Week level settings
  const [weekLabel, setWeekLabel] = useState('');
  const [weekIsVisible, setWeekIsVisible] = useState(true);
  const [weekGamesBeginStr, setWeekGamesBeginStr] = useState('');
  const [weekEndStr, setWeekEndDateStr] = useState('');

  // Prop Modal inside Drawer
  const [showPropModal, setShowPropModal] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propOptionA, setPropOptionA] = useState('');
  const [propOptionB, setPropOptionB] = useState('');
  const [propDate, setPropDate] = useState('');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'pickemCampaigns'), limit(100)));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Check URL paths for deep links
  useEffect(() => {
    if (location.pathname.includes('/pickem/create')) {
      setIsCreateOpen(true);
      setEditingCampaignId(null);
    } else {
      const match = location.pathname.match(/\/pickem\/campaign\/([^/]+)/);
      if (match && match[1]) {
        setEditingCampaignId(match[1]);
        setIsCreateOpen(false);
      }
    }
  }, [location.pathname]);

  // Load Detail Campaign Data when editingCampaignId changes
  useEffect(() => {
    if (!editingCampaignId) {
      setDetailCampaign(null);
      return;
    }
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const docRef = doc(db, 'pickemCampaigns', editingCampaignId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setDetailCampaign({ id: snap.id, ...data });

          const initialWeek = (data.currentWeek !== undefined && data.currentWeek !== null) ? data.currentWeek : (data.hasWeekZero ? 0 : 1);
          setSelectedWeek(initialWeek);
          setActiveLiveWeek(initialWeek);
          setEditTotalWeeks(data.totalWeeks || 18);
          setEditHasWeekZero(!!data.hasWeekZero);
          setEditUseTiebreaker(!!data.useTiebreaker);
          setEditEntryFee(data.entryFee || 0);
          setEditIsOpen(data.isOpen !== false);
          setEditIsPrivate(!!data.isPrivate);
          setEditJoinCode(data.joinCode || '');

          setEditThemeColor(data.theme?.primaryColor || '#22c55e');
          setEditThemeTitle(data.theme?.title || '');
          setEditThemeSubtitle(data.theme?.subtitle || '');
          setEditThemeLogoUrl(data.theme?.logoUrl || '');

          if (data.gamesBeginDate) {
            const d = new Date(data.gamesBeginDate);
            setEditGamesBeginStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
          if (data.endDate) {
            const d = new Date(data.endDate);
            setEditEndDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
        }
      } catch (err) {
        console.error("Error fetching detail campaign:", err);
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [editingCampaignId]);

  // Load Matchups for Selected Week
  const fetchMatchups = async (week: number) => {
    if (!editingCampaignId) return;
    setMatchupsLoading(true);
    try {
      const q = query(
        collection(db, 'pickemMatchups'),
        where('campaignId', '==', editingCampaignId)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => m.week === week);
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
    if (detailCampaign && selectedWeek !== undefined) {
      fetchMatchups(selectedWeek);
      const ws = detailCampaign.weekSettings || {};
      const currentWS = ws[selectedWeek] || {};
      setWeekLabel(currentWS.label || '');
      setWeekIsVisible(currentWS.isVisible !== false);
      if (currentWS.gamesBeginDate) {
        const d = new Date(currentWS.gamesBeginDate);
        setWeekGamesBeginStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      } else {
        setWeekGamesBeginStr('');
      }
      if (currentWS.endDate) {
        const d = new Date(currentWS.endDate);
        setWeekEndDateStr(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      } else {
        setWeekEndDateStr('');
      }
    }
  }, [detailCampaign, selectedWeek]);

  // Toggle Actions
  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    await updateDoc(doc(db, "pickemCampaigns", id), { isArchived: !isArchived });
    fetchCampaigns();
  };

  const handleToggleOpen = async (id: string, currentIsOpen: boolean) => {
    await updateDoc(doc(db, "pickemCampaigns", id), { isOpen: !currentIsOpen });
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    await deleteDoc(doc(db, 'pickemCampaigns', id));
    fetchCampaigns();
  };

  const handleResetCampaigns = async () => {
    if (!confirm("This will un-archive and reset all current campaigns to OPEN and PUBLIC. Continue?")) return;
    setResetting(true);
    try {
      const snap = await getDocs(collection(db, 'pickemCampaigns'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, {
          isOpen: true,
          isPrivate: false,
          isArchived: false,
          archived: false
        });
      });
      await batch.commit();
      alert("All campaigns have been reset to Open & Public!");
      fetchCampaigns();
    } catch (err: any) {
      console.error("Reset error:", err);
      alert("Failed to reset campaigns.");
    } finally {
      setResetting(false);
    }
  };

  // Create Campaign
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.name.trim() || createData.leagues.length === 0) {
      alert("Please enter a name and select at least one league.");
      return;
    }

    setCreating(true);
    try {
      let finalLogoUrl = createData.themeLogoUrl;
      if (createLogoFile) {
        const storage = getStorage(app);
        const storageRef = ref(storage, `pickem_logos/${Date.now()}_${createLogoFile.name}`);
        await uploadBytes(storageRef, createLogoFile);
        finalLogoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'pickemCampaigns'), {
        name: createData.name.trim(),
        league: createData.leagues[0],
        leagues: createData.leagues,
        pickLimit: createData.pickLimit,
        totalWeeks: createData.totalWeeks,
        hasWeekZero: createData.hasWeekZero,
        useTiebreaker: createData.useTiebreaker,
        format: createData.format,
        type: 'STANDARD',
        defaultMatchType: createData.defaultMatchType,
        scoringType: 'WIN_LOSS',
        isOpen: createData.isOpen,
        gamesBeginDate: createData.gamesBeginDateStr ? new Date(createData.gamesBeginDateStr).getTime() : Date.now(),
        startDate: createData.gamesBeginDateStr ? new Date(createData.gamesBeginDateStr).getTime() : Date.now(),
        endDate: createData.endDateStr ? new Date(createData.endDateStr).getTime() : Date.now() + 180 * 86400000,
        theme: {
          primaryColor: createData.themePrimaryColor,
          title: createData.themeTitle,
          subtitle: createData.themeSubtitle,
          logoUrl: finalLogoUrl,
        },
        currentWeek: createData.hasWeekZero ? 0 : 1,
        isPrivate: createData.isPrivate,
        joinCode: createData.isPrivate ? createData.joinCode : '',
        entryFee: createData.entryFee,
        createdAt: Date.now()
      });

      setIsCreateOpen(false);
      navigate('/admin/pickem');
      fetchCampaigns();
    } catch (err: any) {
      console.error("Create campaign error:", err);
      alert("Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  };

  // Save Detail Campaign Changes
  const handleSaveDetail = async () => {
    if (!detailCampaign || !editingCampaignId) return;
    setSavingDetail(true);
    try {
      let finalLogoUrl = editThemeLogoUrl;
      if (editThemeLogoFile) {
        const storage = getStorage(app);
        const storageRef = ref(storage, `pickem_logos/${Date.now()}_${editThemeLogoFile.name}`);
        await uploadBytes(storageRef, editThemeLogoFile);
        finalLogoUrl = await getDownloadURL(storageRef);
      }

      const updatedWeekSettings = {
        ...(detailCampaign.weekSettings || {}),
        [selectedWeek]: {
          label: weekLabel,
          isVisible: weekIsVisible,
          gamesBeginDate: weekGamesBeginStr ? new Date(weekGamesBeginStr).getTime() : null,
          endDate: weekEndStr ? new Date(weekEndStr).getTime() : null
        }
      };

      await updateDoc(doc(db, 'pickemCampaigns', editingCampaignId), {
        currentWeek: activeLiveWeek,
        totalWeeks: editTotalWeeks,
        hasWeekZero: editHasWeekZero,
        useTiebreaker: editUseTiebreaker,
        entryFee: editEntryFee,
        isOpen: editIsOpen,
        isPrivate: editIsPrivate,
        joinCode: editIsPrivate ? editJoinCode : '',
        gamesBeginDate: editGamesBeginStr ? new Date(editGamesBeginStr).getTime() : null,
        endDate: editEndDateStr ? new Date(editEndDateStr).getTime() : null,
        weekSettings: updatedWeekSettings,
        theme: {
          primaryColor: editThemeColor,
          title: editThemeTitle,
          subtitle: editThemeSubtitle,
          logoUrl: finalLogoUrl,
        }
      });

      setDetailCampaign((prev: any) => ({
        ...prev,
        currentWeek: activeLiveWeek,
        totalWeeks: editTotalWeeks,
        hasWeekZero: editHasWeekZero,
        useTiebreaker: editUseTiebreaker,
        entryFee: editEntryFee,
        isOpen: editIsOpen,
        isPrivate: editIsPrivate,
        joinCode: editIsPrivate ? editJoinCode : '',
        gamesBeginDate: editGamesBeginStr ? new Date(editGamesBeginStr).getTime() : null,
        endDate: editEndDateStr ? new Date(editEndDateStr).getTime() : null,
        weekSettings: updatedWeekSettings,
        theme: { primaryColor: editThemeColor, title: editThemeTitle, subtitle: editThemeSubtitle, logoUrl: finalLogoUrl }
      }));

      fetchCampaigns();
      alert("Campaign settings saved successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save campaign settings.");
    } finally {
      setSavingDetail(false);
    }
  };

  // Add Custom Prop
  const handleAddProp = async () => {
    if (!editingCampaignId || !propTitle || !propOptionA || !propOptionB || !propDate) {
      alert("Please fill out all prop fields");
      return;
    }
    setMatchupsLoading(true);
    try {
      const matchId = `${editingCampaignId}_${selectedWeek}_prop_${Date.now()}`;
      await setDoc(doc(db, 'pickemMatchups', matchId), {
        campaignId: editingCampaignId,
        week: selectedWeek,
        gameId: `prop_${Date.now()}`,
        title: propTitle,
        type: 'PROP',
        startTime: new Date(propDate).getTime(),
        status: 'STATUS_SCHEDULED',
        statusDesc: 'Scheduled',
        awayTeam: { id: 'option_a', name: propOptionA, image: `https://ui-avatars.com/api/?name=${encodeURIComponent(propOptionA[0] || 'A')}&background=random` },
        homeTeam: { id: 'option_b', name: propOptionB, image: `https://ui-avatars.com/api/?name=${encodeURIComponent(propOptionB[0] || 'B')}&background=random` },
        createdAt: Date.now()
      });
      setShowPropModal(false);
      setPropTitle('');
      setPropOptionA('');
      setPropOptionB('');
      setPropDate('');
      fetchMatchups(selectedWeek);
    } catch (e: any) {
      console.error(e);
      alert("Failed to add prop");
    } finally {
      setMatchupsLoading(false);
    }
  };

  // Sync Week Matchups from ESPN
  const handleSyncMatchups = async () => {
    if (!detailCampaign || !editingCampaignId) return;
    const leaguesToSync = detailCampaign.leagues && detailCampaign.leagues.length > 0
      ? detailCampaign.leagues
      : (detailCampaign.league ? [detailCampaign.league] : []);

    if (leaguesToSync.length === 0) {
      alert("No leagues configured for this campaign.");
      return;
    }

    setMatchupsLoading(true);
    try {
      let count = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const lg of leaguesToSync) {
        const ws = detailCampaign.weekSettings?.[selectedWeek] || {};
        let effectiveBeginDate = ws.gamesBeginDate || detailCampaign.gamesBeginDate;
        let effectiveEndDate = ws.endDate || detailCampaign.endDate;

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
          while (curr <= end && days <= 35) {
            const str = curr.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
            const [month, day, year] = str.split("/");
            specificDates.push(`${year}${month}${day}`);
            curr = new Date(curr.getTime() + 86400000);
            days++;
          }
        }

        const res = await scrapeLeagueSchedules(lg, false, undefined, specificDates);
        if (!res.data || res.data.length === 0) continue;

        for (const m of res.data) {
          if (effectiveBeginDate && m.startTime < effectiveBeginDate) continue;
          if (effectiveEndDate && m.startTime > effectiveEndDate) continue;

          const pickemMatchupId = `${editingCampaignId}_${selectedWeek}_${m.gameId}`;
          const docRef = doc(db, 'pickemMatchups', pickemMatchupId);

          const existingMatchup = matchups.find(ex => ex.id === pickemMatchupId);
          let metadataToSave = m.metadata ? { ...m.metadata } : null;
          let finalType = detailCampaign.name === 'YES Day Walk for Autism 2026'
            ? "STANDARD"
            : (detailCampaign.defaultMatchType === "BOTH" ? ((metadataToSave?.spread !== undefined && metadataToSave?.spread !== null) ? "SPREAD" : "STANDARD") : (detailCampaign.defaultMatchType || "STANDARD"));

          if (existingMatchup && existingMatchup.type && detailCampaign.name !== 'YES Day Walk for Autism 2026') {
            finalType = existingMatchup.type;
          }

          const finalTitle = finalType === "SPREAD"
            ? (m.title.endsWith(' - ATS') ? m.title : `${m.title} - ATS`)
            : m.title.replace(/ - ATS$/, '');

          batch.set(docRef, {
            campaignId: editingCampaignId,
            week: selectedWeek,
            gameId: String(m.gameId),
            title: finalTitle,
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
        alert(`Synced ${count} matchups successfully!`);
        await fetchMatchups(selectedWeek);
      } else {
        alert("No games found within the specified date boundaries.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to sync matchups: " + err.message);
    } finally {
      setMatchupsLoading(false);
    }
  };

  const handleToggleTiebreaker = async (matchupId: string, currentVal: boolean) => {
    try {
      await updateDoc(doc(db, "pickemMatchups", matchupId), { isTiebreaker: !currentVal });
      setMatchups(prev => prev.map(m => m.id === matchupId ? { ...m, isTiebreaker: !currentVal } : m));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSpread = async (matchupId: string, currentType: string) => {
    if (detailCampaign?.name === 'YES Day Walk for Autism 2026') {
      alert("YES Day Walk for Autism 2026 is strictly Moneyline (STANDARD) picks.");
      return;
    }
    try {
      const targetMatchup = matchups.find(m => m.id === matchupId);
      const currentTitle = targetMatchup?.title || '';
      const newType = currentType === "SPREAD" ? "STANDARD" : "SPREAD";
      const newTitle = newType === "SPREAD"
        ? (currentTitle.endsWith(' - ATS') ? currentTitle : `${currentTitle} - ATS`)
        : currentTitle.replace(/ - ATS$/, '');

      await updateDoc(doc(db, "pickemMatchups", matchupId), { type: newType, title: newTitle });
      setMatchups(prev => prev.map(m => m.id === matchupId ? { ...m, type: newType, title: newTitle } : m));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMatchup = async (matchupId: string) => {
    try {
      await deleteDoc(doc(db, 'pickemMatchups', matchupId));
      setMatchups(prev => prev.filter(m => m.id !== matchupId));
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const totalCampaigns = campaigns.length;
  const openCampaigns = campaigns.filter(c => !c.isArchived && c.isOpen !== false).length;
  const closedCampaigns = campaigns.filter(c => !c.isArchived && c.isOpen === false).length;
  const archivedCampaigns = campaigns.filter(c => !!c.isArchived).length;

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter === 'OPEN' && (c.isArchived || c.isOpen === false)) return false;
    if (statusFilter === 'CLOSED' && (c.isArchived || c.isOpen !== false)) return false;
    if (statusFilter === 'ARCHIVED' && !c.isArchived) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchLeague = (c.leagues?.join(' ') || c.league || '').toLowerCase().includes(q);
      if (!matchName && !matchLeague) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Campaigns</span>
              <span className="text-2xl font-bold font-display text-white mt-1 block">{totalCampaigns}</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Open & Joinable</span>
              <span className="text-2xl font-bold font-display text-emerald-400 mt-1 block">{openCampaigns}</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Unlock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Closed</span>
              <span className="text-2xl font-bold font-display text-red-400 mt-1 block">{closedCampaigns}</span>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#121212] border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Archived</span>
              <span className="text-2xl font-bold font-display text-amber-400 mt-1 block">{archivedCampaigns}</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
              <Archive className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181A]">
          <h3 className="font-bold text-lg text-white">Pick 'Em Campaigns ({filteredCampaigns.length})</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="CLOSED">Closed Only</option>
              <option value="ARCHIVED">Archived Only</option>
            </select>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-zinc-700 w-52 text-white"
              />
            </div>

            <Button variant="outline" size="sm" onClick={handleResetCampaigns} disabled={resetting} className="text-xs gap-1 text-zinc-300">
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              Reset & Open
            </Button>

            <Button variant="secondary" size="sm" onClick={fetchCampaigns} className="text-xs">Refresh</Button>

            <Button
              size="sm"
              onClick={() => {
                setIsCreateOpen(true);
                navigate('/admin/pickem/create');
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs gap-1"
            >
              <Plus className="w-4 h-4" /> Create Campaign
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">Loading campaigns...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-medium">No campaigns found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#18181A] text-zinc-400 sticky top-0 border-b border-zinc-800 z-10 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Campaign Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">League(s)</th>
                  <th className="px-4 py-3 font-medium">Current Week</th>
                  <th className="px-4 py-3 font-medium">Entry Fee</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredCampaigns.map((camp) => {
                  const isArch = camp.isArchived || camp.archived;
                  const isOpen = camp.isOpen !== false;
                  const isPriv = !!camp.isPrivate;

                  return (
                    <tr key={camp.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-100">{camp.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isArch ? (
                            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-[10px] font-bold uppercase tracking-wider border border-yellow-500/20">Archived</span>
                          ) : isOpen ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">Open</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] font-bold uppercase tracking-wider border border-red-500/20">Closed</span>
                          )}
                          {isPriv && (
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-500/20">Private</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {camp.leagues && camp.leagues.length > 0 ? camp.leagues.join(', ') : camp.league}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 font-mono font-bold">Week {camp.currentWeek ?? 1}</td>
                      <td className="px-4 py-3 text-zinc-300 font-mono">{camp.entryFee ? `${camp.entryFee} Links` : 'Free'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingCampaignId(camp.id);
                              navigate(`/admin/pickem/campaign/${camp.id}`);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                            title="Manage Campaign Details & Week Matchups"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleOpen(camp.id, isOpen)}
                            className={`p-1.5 rounded transition-colors ${isOpen ? "text-emerald-400 hover:text-red-400 hover:bg-red-500/10" : "text-red-400 hover:text-emerald-400 hover:bg-emerald-500/10"}`}
                            title={isOpen ? "Close Campaign" : "Open Campaign"}
                          >
                            {isOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleToggleArchive(camp.id, isArch)}
                            className="p-1.5 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                            title={isArch ? "Unarchive" : "Archive"}
                          >
                            {isArch ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(camp.id)}
                            className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Slide-over Modal Drawer: Create Campaign --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-2xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <h3 className="font-bold text-xl text-white">Create Pick 'Em Campaign</h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  navigate('/admin/pickem');
                }}
                className="text-zinc-500 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-6 flex-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={createData.name}
                  onChange={e => setCreateForm({ ...createData, name: e.target.value })}
                  placeholder="e.g. 2026 College Football Season"
                  className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Supported Leagues *</label>
                <div className="flex flex-wrap gap-3">
                  {['CFB', 'CBASE', 'NFL', 'NBA', 'NBASL', 'MLB', 'LLWS', 'LMX'].map(l => (
                    <label key={l} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg hover:border-zinc-700">
                      <input
                        type="checkbox"
                        checked={createData.leagues.includes(l)}
                        onChange={() => {
                          const has = createData.leagues.includes(l);
                          setCreateForm({
                            ...createData,
                            leagues: has ? createData.leagues.filter(x => x !== l) : [...createData.leagues, l]
                          });
                        }}
                        className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                      />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Entry Fee (Links)</label>
                  <input
                    type="number"
                    min="0"
                    value={createData.entryFee}
                    onChange={e => setCreateForm({ ...createData, entryFee: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Weekly Pick Limit (0 = Unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={createData.pickLimit}
                    onChange={e => setCreateForm({ ...createData, pickLimit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Default Match Type</label>
                  <select
                    value={createData.defaultMatchType}
                    onChange={e => setCreateForm({ ...createData, defaultMatchType: e.target.value })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STANDARD">Standard (Moneyline)</option>
                    <option value="SPREAD">Against the Spread (ATS)</option>
                    <option value="BOTH">Moneyline/ATS (Use Spread if available)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Campaign Format</label>
                  <select
                    value={createData.format}
                    onChange={e => setCreateForm({ ...createData, format: e.target.value })}
                    className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="SURVIVOR">Survivor Mode</option>
                    <option value="CONFIDENCE">Confidence Points</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createData.isOpen}
                    onChange={e => setCreateForm({ ...createData, isOpen: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                  />
                  <span className="text-sm font-semibold text-zinc-200">Open & Joinable to Users</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createData.isPrivate}
                    onChange={e => setCreateForm({ ...createData, isPrivate: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                  />
                  <span className="text-sm font-semibold text-zinc-200">Private Campaign (Require Secret Code)</span>
                </label>

                {createData.isPrivate && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Secret Join Code</label>
                    <input
                      type="text"
                      value={createData.joinCode}
                      onChange={e => setCreateForm({ ...createData, joinCode: e.target.value })}
                      placeholder="e.g. VIP2026"
                      className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    navigate('/admin/pickem');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold">
                  {creating ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Slide-over Modal Drawer: Edit Campaign & Week Matchups --- */}
      {editingCampaignId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-[#121212] border-l border-zinc-800 w-full max-w-4xl h-full flex flex-col p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-bold text-xl text-white">{detailCampaign?.name || 'Manage Campaign'}</h3>
                <p className="text-xs text-zinc-400 font-mono">ID: {editingCampaignId}</p>
              </div>
              <button
                onClick={() => {
                  setEditingCampaignId(null);
                  navigate('/admin/pickem');
                }}
                className="text-zinc-500 hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-zinc-500">Loading campaign details...</div>
            ) : detailCampaign ? (
              <div className="space-y-6">
                {/* Week Selection & Sync Control Bar */}
                <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div>
                      <h4 className="font-bold text-base text-white">Week Management & Scheduling</h4>
                      <p className="text-xs text-zinc-400">Select active campaign week and configure game sync boundaries.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(Number(e.target.value))}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      >
                        {[...Array(detailCampaign?.hasWeekZero ? editTotalWeeks + 1 : editTotalWeeks)].map((_, i) => {
                          const w = detailCampaign?.hasWeekZero ? i : i + 1;
                          const lbl = detailCampaign?.weekSettings?.[w]?.label;
                          return (
                            <option key={w} value={w}>{lbl ? `Week ${w} (${lbl})` : `Week ${w}`}</option>
                          );
                        })}
                      </select>

                      <Button onClick={handleSaveDetail} disabled={savingDetail} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs">
                        {savingDetail ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-zinc-400 mb-1">Week Display Label</label>
                      <input
                        type="text"
                        value={weekLabel}
                        onChange={e => setWeekLabel(e.target.value)}
                        placeholder="e.g. Week 1 Opening Slate"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-400 mb-1">Week Sync Start</label>
                      <input
                        type="datetime-local"
                        value={weekGamesBeginStr}
                        onChange={e => setWeekGamesBeginStr(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-400 mb-1">Week Sync End</label>
                      <input
                        type="datetime-local"
                        value={weekEndStr}
                        onChange={e => setWeekEndDateStr(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                {/* Matchups Table for Selected Week */}
                <div className="bg-[#18181A] border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/60">
                    <h4 className="font-bold text-sm text-white">Week {selectedWeek} Matchups ({matchups.length})</h4>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => setShowPropModal(true)} size="sm" variant="outline" className="text-xs gap-1 text-zinc-300">
                        <Plus className="w-3.5 h-3.5" /> Add Prop
                      </Button>
                      <Button onClick={handleSyncMatchups} disabled={matchupsLoading} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs gap-1">
                        <RefreshCw className={`w-3.5 h-3.5 ${matchupsLoading ? 'animate-spin' : ''}`} /> Sync ESPN
                      </Button>
                    </div>
                  </div>

                  {matchupsLoading ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">Loading matchups...</div>
                  ) : matchups.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs font-medium">No matchups synced for Week {selectedWeek}. Click "Sync ESPN" to import.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[50vh] custom-scrollbar">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5 font-medium">Title</th>
                            <th className="px-4 py-2.5 font-medium">Status</th>
                            <th className="px-4 py-2.5 font-medium">Start Time</th>
                            <th className="px-4 py-2.5 font-medium text-center">Type</th>
                            <th className="px-4 py-2.5 font-medium text-center">Tiebreaker</th>
                            <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {matchups.map(m => (
                            <tr key={m.id} className="hover:bg-zinc-800/20 transition-colors">
                              <td className="px-4 py-2.5 font-bold text-zinc-200">{m.title}</td>
                              <td className="px-4 py-2.5 text-zinc-400">{m.statusDesc || m.status}</td>
                              <td className="px-4 py-2.5 text-zinc-400">{new Date(m.startTime).toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => handleToggleSpread(m.id, m.type)}
                                  className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider ${m.type === "SPREAD" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-zinc-800 text-zinc-400"}`}
                                >
                                  {m.type === "SPREAD" ? "ATS" : "STD"}
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => handleToggleTiebreaker(m.id, !!m.isTiebreaker)}
                                  className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider ${m.isTiebreaker ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 text-zinc-400"}`}
                                >
                                  {m.isTiebreaker ? "YES" : "NO"}
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button onClick={() => handleDeleteMatchup(m.id)} className="text-red-500/70 hover:text-red-500 p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
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
            ) : null}
          </div>
        </div>
      )}

      {/* Custom Prop Modal inside Drawer */}
      {showPropModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181A] rounded-xl border border-zinc-800 p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Custom Prop Matchup</h3>
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Prop Title / Question</label>
              <input type="text" value={propTitle} onChange={e => setPropTitle(e.target.value)} placeholder="e.g. First team to 20 points" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Option A</label>
              <input type="text" value={propOptionA} onChange={e => setPropOptionA(e.target.value)} placeholder="Option A" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Option B</label>
              <input type="text" value={propOptionB} onChange={e => setPropOptionB(e.target.value)} placeholder="Option B" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Event Start Time</label>
              <input type="datetime-local" value={propDate} onChange={e => setPropDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowPropModal(false)} size="sm">Cancel</Button>
              <Button onClick={handleAddProp} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold">Add Prop</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
