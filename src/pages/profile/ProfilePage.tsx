import { FirebaseImage } from '../../components/ui/FirebaseImage';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Trophy, Coins, Calendar, Mail, CheckCircle2, XCircle, MinusCircle, BarChart3, Pencil, Share2, Copy, Settings, Bell, Lock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { auth, db } from '../../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, getDocs, orderBy, query, where, documentId, doc, updateDoc } from 'firebase/firestore';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Link } from 'react-router-dom';
import { requestNotificationPermission } from '../../hooks/useNotifications';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../../components/ui/titles';
export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [picks, setPicks] = useState<any[]>([]);
  const [picksLoading, setPicksLoading] = useState(true);

  // Settings State
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{type: 'success' | 'error', text: React.ReactNode} | null>(null);

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username || '');
      setNewName(profile.name || '');
      setNotificationsEnabled(profile.notificationsEnabled !== false);
    }
  }, [profile]);

  const handleUpdateInfo = async () => {
    if (!user) return;
    setUpdatingSettings(true);
    setSettingsMessage(null);
    try {
      const userRef = doc(db, 'users', user.uid);

      // Basic validation
      if (!newUsername.trim() || !newName.trim()) {
        throw new Error("Username and Display Name cannot be empty.");
      }

      // Check if username is taken (if it changed)
      if (newUsername !== profile?.username) {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(newUsername)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Failed to check username availability.");
        const data = await res.json();
        if (data.exists) {
          throw new Error("Username is already taken.");
        }
      }

      await updateDoc(userRef, {
        username: newUsername,
        usernameLower: newUsername.toLowerCase(),
        name: newName
      });
      setSettingsMessage({ type: 'success', text: 'Profile information updated successfully.' });
    } catch (error: any) {
      setSettingsMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) return;
    const newValue = !notificationsEnabled;

    // Revert state initially, set it explicitly if permission is granted
    setNotificationsEnabled(newValue);

    if (newValue) {
      const result = await requestNotificationPermission(user.uid, profile);
      if (!result.granted) {
        setNotificationsEnabled(false);
        let errorMsg = "Notification permission denied.";
        if (result.reason === 'unsupported') errorMsg = "Push notifications are not supported in this browser.";
        if (result.reason === 'missing_vapid') errorMsg = "Missing VAPID key in environment variables.";
        if (result.reason !== 'denied' && result.reason !== 'unsupported' && result.reason !== 'missing_vapid') errorMsg = `Error: ${result.reason}`;
        
        setSettingsMessage({ type: 'error', text: <span>{errorMsg} Please check your <a href="https://support.google.com/chrome/answer/3220216?hl=en&co=GENIE.Platform%3DAndroid" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-400">browser settings</a>.</span> });
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationsEnabled: newValue
      });
      setSettingsMessage({ type: 'success', text: `Notifications ${newValue ? 'enabled' : 'disabled'}.` });
    } catch (error) {
      setNotificationsEnabled(!newValue); // Revert
      setSettingsMessage({ type: 'error', text: 'Failed to update notification settings.' });
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      setSettingsMessage({ type: 'error', text: 'No email associated with this account.' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSettingsMessage({ type: 'success', text: `Password reset email sent to ${user.email}.` });
    } catch (error: any) {
      setSettingsMessage({ type: 'error', text: error.message || 'Failed to send reset email.' });
    }
  };


  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [equipLoading, setEquipLoading] = useState<string | null>(null);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [avatarUpdateLoading, setAvatarUpdateLoading] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          const mockItems = [
            { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring.', cost: 500, type: 'AVATAR_RING', active: true, image: 'border-yellow-500' },
            { id: 'banner_neon', name: 'Neon Banner', description: 'Bright profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' },
          ];
          setInventoryItems(mockItems);
          setInventoryLoading(false);
          return;
        }

        const snap = await getDocs(collection(db, 'shopItems'));
        const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventoryItems(fetchedItems);
      } catch (e) {
        console.error("Error fetching inventory", e);
      } finally {
        setInventoryLoading(false);
      }
    };

    fetchInventory();
  }, [profile?.inventory]);

  useEffect(() => {
    const fetchPicks = async () => {
      if (!user) {
        setPicksLoading(false);
        return;
      }
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          // Mock picks for local UI testing
          setPicks([
            { id: '1', status: 'WIN', updatedAt: new Date('2024-01-10').getTime() },
            { id: '2', status: 'WIN', updatedAt: new Date('2024-01-15').getTime() },
            { id: '3', status: 'LOSS', updatedAt: new Date('2024-02-01').getTime() },
            { id: '4', status: 'WIN', updatedAt: new Date('2024-02-10').getTime() },
            { id: '5', status: 'WIN', updatedAt: new Date('2024-02-15').getTime() },
            { id: '6', status: 'WIN', updatedAt: new Date('2024-02-20').getTime() },
            { id: '7', status: 'LOSS', updatedAt: new Date('2024-02-25').getTime() },
            { id: '8', status: 'LOSS', updatedAt: new Date('2024-03-01').getTime() },
          ]);
          setPicksLoading(false);
          return;
        }

        const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPicks(fetchedPicks);
      } catch (e) {
        console.error("Error fetching picks", e);
      } finally {
        setPicksLoading(false);
      }
    };
    fetchPicks();
  }, [user]);

  const handleUpdateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAvatarUpdateLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        image: avatarUrlInput,
        updatedAt: Date.now()
      });
      setIsAvatarModalOpen(false);
    } catch (e) {
      console.error("Failed to update avatar", e);
    } finally {
      setAvatarUpdateLoading(false);
    }
  };


  const handleEquip = async (itemId: string | null, type: string) => {
    if (!user) return;
    setEquipLoading(type);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId, type })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Equip failed", res.status, text);
      }
    } catch (e) {
      console.error("Equip error", e);
    } finally {
      setEquipLoading(null);
    }
  };

  const handleUpdateVariant = async (variant: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/update-variant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ variant })
      });

      if (!res.ok) {
        console.error("Variant update failed", res.status);
      }
    } catch (e) {
      console.error("Variant update error", e);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 font-medium">
        Loading profile...
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-medium">
        <p>You must be logged in to view your profile.</p>
      </div>
    );
  }

  // Calculate Win Rate (using allTimeStats for lifetime profile view)
  const stats = profile.allTimeStats || profile.stats || { wins: 0, losses: 0, pushes: 0 };
  const totalDecisions = stats.wins + stats.losses;
  const winRate = totalDecisions > 0 ? (stats.wins / totalDecisions) * 100 : 0;

  // Aggregate monthly stats from picks
  const monthlyStats = React.useMemo(() => {
    if (!picks || picks.length === 0) return [];

    const sortedPicks = [...picks].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    const monthsMap: Record<string, any> = {};
    let currentChain = 0;
    let currentMonthKey = '';

    sortedPicks.forEach(pick => {
      if (pick.status === 'PENDING') return;

      const date = new Date(pick.updatedAt || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = format(date, 'MMMM yyyy');

      if (monthKey !== currentMonthKey) {
        currentChain = 0;
        currentMonthKey = monthKey;
      }

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          monthKey,
          monthLabel,
          wins: 0,
          losses: 0,
          pushes: 0,
          longestWinChain: 0,
          longestLossChain: 0,
        };
      }

      const monthData = monthsMap[monthKey];

      if (pick.status === 'WIN') {
        monthData.wins += 1;
        currentChain = currentChain < 0 ? 1 : currentChain + 1;
        monthData.longestWinChain = Math.max(monthData.longestWinChain, currentChain);
      } else if (pick.status === 'LOSS') {
        monthData.losses += 1;
        currentChain = currentChain > 0 ? -1 : (currentChain === 0 ? -1 : currentChain - 1);
        monthData.longestLossChain = Math.max(monthData.longestLossChain, Math.abs(currentChain));
      } else if (pick.status === 'PUSH') {
        monthData.pushes += 1;
      }
    });

    return Object.values(monthsMap).sort((a: any, b: any) => b.monthKey.localeCompare(a.monthKey));
  }, [picks]);

  // Formatting date
  let joinDate = 'Unknown';
  if (user.metadata?.creationTime) {
      try {
          joinDate = format(new Date(user.metadata.creationTime), "MMMM d, yyyy");
      } catch (e) {
          console.error("Error formatting date", e);
      }
  }

  const equippedBannerItem = inventoryItems.find(i => i.id === profile?.equippedCosmetics?.PROFILE_BANNER);
  const equippedBannerImage = equippedBannerItem?.image;
  let BannerComponent = ProfileBannerMap[equippedBannerImage || ''];
  if (equippedBannerItem?.id === 'banner_responsible_gambler' && profile?.equippedCosmetics?.BANNER_VARIANT) {
    BannerComponent = ProfileBannerMap[profile.equippedCosmetics.BANNER_VARIANT] || BannerComponent;
  }

  const equippedRingItem = inventoryItems.find(i => i.id === profile?.equippedCosmetics?.AVATAR_RING);
  const equippedRingImage = equippedRingItem?.image;
  const RingComponent = AvatarRingMap[equippedRingImage || ''];
  const TitleComponent = profile?.equippedCosmetics?.TITLE ? TitleMap[inventoryItems.find(i => i.id === profile.equippedCosmetics.TITLE)?.image || ''] : null;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

      {/* Profile Header */}
      <div className={`bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden ${
        BannerComponent || (equippedBannerImage?.startsWith('/') || equippedBannerImage?.startsWith('http') || equippedBannerImage?.startsWith('gs://')) ? '' : (equippedBannerImage || '')
      }`}>
         {/* Render WebGL banner if applicable */}
         {BannerComponent && (
            <div className="absolute inset-0 z-0">
               <BannerComponent isStatic={false} />
            </div>
         )}

         {/* Render static image banner if applicable */}
         {!BannerComponent && (equippedBannerImage?.startsWith('/') || equippedBannerImage?.startsWith('http') || equippedBannerImage?.startsWith('gs://')) && (
            <FirebaseImage src={equippedBannerImage} fallback={`https://placehold.co/600x200/18181b/ffffff?text=${encodeURIComponent(equippedBannerItem?.name || "Profile Banner")}`} alt="Profile Banner" className="absolute inset-0 w-full h-full object-cover z-0" />
         )}

         {/* Only show default background if no banner is equipped */}
         {!profile?.equippedCosmetics?.PROFILE_BANNER && (
            <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_10%,transparent_80%)] opacity-5 pointer-events-none"></div>
         )}

         <div className="relative">
            {RingComponent && (
               <div className="absolute inset-0 z-0 transform scale-[1.3] pointer-events-none">
                  <RingComponent isStatic={false} />
               </div>
            )}
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full shadow-xl z-10 relative flex-shrink-0 ${
               RingComponent
                 ? 'border-transparent'
                 : `overflow-hidden border-4 ${equippedRingImage || 'border-[#27272a]'}`
            }`}>
               <div
                 className={`relative z-10 w-full h-full rounded-full overflow-hidden group cursor-pointer ${RingComponent ? 'border-2 border-black/50' : ''}`}
                 onClick={() => {
                   setAvatarUrlInput(profile.image || '');
                   setIsAvatarModalOpen(true);
                 }}
               >
                 {profile.image ? (
                   <FirebaseImage fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || "guest"}`} src={profile.image} alt={profile.username || profile.name} className="w-full h-full object-cover transition-opacity group-hover:opacity-50" loading="lazy" />
                 ) : (
                   <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-4xl font-bold text-zinc-400 transition-opacity group-hover:opacity-50">
                     {(profile.username || profile.name)?.charAt(0) || user.email?.charAt(0) || '?'}
                   </div>
                 )}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                   <Pencil className="w-6 h-6 text-white drop-shadow-md" />
                 </div>
               </div>
            </div>
            {profile.role === 'ADMIN' && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-green-950 text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow border border-green-400">
                ADMIN
              </div>
            )}
         </div>

         <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-1 font-display drop-shadow-md">{profile.username || profile.name}</h1>

            {TitleComponent ? (
               <div className="mb-3 inline-block">
                  <TitleComponent isStatic={false} />
               </div>
            ) : profile?.equippedCosmetics?.TITLE ? (() => {
               const titleItem = inventoryItems.find(i => i.id === profile.equippedCosmetics.TITLE);
               return (
               <div className="mb-3 inline-block">
                  <span className={`text-sm font-bold text-[#22c55e] px-2 py-0.5 rounded bg-black/40 border border-[#22c55e]/30 shadow-sm backdrop-blur-sm ${titleItem?.image || ''}`}>
                     {titleItem?.name || 'Title'}
                  </span>
               </div>
               );
            })() : null}

            <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-sm text-zinc-300 justify-center md:justify-start drop-shadow-md font-medium">
               <div className="flex items-center gap-1.5 justify-center md:justify-start">
                 <Mail className="w-4 h-4 opacity-70" />
                 {user.email}
               </div>
               <div className="flex items-center gap-1.5 justify-center md:justify-start">
                 <Calendar className="w-4 h-4 opacity-70" />
                 Joined {joinDate}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Wallet & Status */}
        <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:col-span-1 h-fit">
           <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-400" /> Wallet
           </h2>
           <div className="flex flex-col gap-4">
              <div className="bg-[#18181A] rounded-xl p-4 border border-zinc-800/50 flex flex-col items-center justify-center">
                 <span className="text-sm text-zinc-400 font-medium mb-1 uppercase tracking-wider">Balance</span>
                 <div className="text-4xl font-mono font-bold text-cyan-400 flex items-center gap-2">
                   {profile.links?.toLocaleString() || 0}
                 </div>
              </div>
              <Button asChild className="w-full bg-cyan-500 hover:bg-cyan-600 text-white" variant="default">
                 <Link to="/shop">
                    Link Shop
                 </Link>
              </Button>
           </div>
        </div>

        {/* Stats Overview */}
        <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:col-span-2 h-fit">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Career Stats
              </h2>
              <div className="text-right">
                <span className="text-2xl font-bold text-zinc-100">{isNaN(winRate) ? 0 : winRate.toFixed(1)}%</span>
                <span className="text-xs text-zinc-500 block uppercase tracking-wider font-bold">Win Rate</span>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-green-500/20 transition-colors">
                 <CheckCircle2 className="w-6 h-6 text-green-500 mb-2 opacity-80" />
                 <span className="text-2xl font-bold text-green-400">{isNaN(stats.wins) ? 0 : String(stats.wins)}</span>
                 <span className="text-[10px] uppercase font-bold text-green-500/80 tracking-wider">Wins</span>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-red-500/20 transition-colors">
                 <XCircle className="w-6 h-6 text-red-500 mb-2 opacity-80" />
                 <span className="text-2xl font-bold text-red-400">{isNaN(stats.losses) ? 0 : String(stats.losses)}</span>
                 <span className="text-[10px] uppercase font-bold text-red-500/80 tracking-wider">Losses</span>
              </div>

              <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-zinc-500/20 transition-colors">
                 <MinusCircle className="w-6 h-6 text-zinc-500 mb-2 opacity-80" />
                 <span className="text-2xl font-bold text-zinc-400">{isNaN(stats.pushes) ? 0 : String(stats.pushes)}</span>
                 <span className="text-[10px] uppercase font-bold text-zinc-500/80 tracking-wider">Pushes</span>
              </div>
           </div>

           {/* Progress Bar */}
           <div className="mt-6">
              <div className="flex justify-between text-xs text-zinc-500 font-medium mb-2">
                 <span>Total Decisions: {isNaN(totalDecisions) ? 0 : String(totalDecisions)}</span>
              </div>
              <div className="h-2 w-full bg-red-500/20 rounded-full overflow-hidden flex">
                 <div className="h-full bg-green-500" style={{ width: `${winRate}%` }}></div>
              </div>
           </div>

        </div>

      </div>

      {/* Monthly Performance */}
      {picksLoading ? (
         <div className="text-center text-zinc-500 py-8">Loading monthly performance...</div>
      ) : monthlyStats.length > 0 && (
         <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 mt-6">
            <h2 className="text-lg font-bold text-zinc-200 mb-6 flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-cyan-400" /> Monthly Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {monthlyStats.map((stat: any) => {
                  const mTotal = stat.wins + stat.losses;
                  const mWinRate = mTotal > 0 ? ((stat.wins / mTotal) * 100).toFixed(1) : '0.0';

                  return (
                     <div key={stat.monthKey} className="bg-[#18181a] border border-zinc-800 rounded-xl p-4 flex flex-col hover:border-zinc-700 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                           <h3 className="text-zinc-200 font-bold">{stat.monthLabel}</h3>
                           <span className="text-xs font-mono font-bold bg-zinc-800/50 text-cyan-400 px-2 py-1 rounded">
                              {mWinRate}% WR
                           </span>
                        </div>

                        <div className="flex items-center justify-between text-sm mb-3">
                           <span className="text-zinc-500 font-medium">Record</span>
                           <div className="flex items-center gap-2 font-mono">
                              <span className="text-green-400 font-bold">{isNaN(stat.wins) ? 0 : String(stat.wins)}W</span>
                              <span className="text-zinc-600">-</span>
                              <span className="text-red-400 font-bold">{isNaN(stat.losses) ? 0 : String(stat.losses)}L</span>
                              {stat.pushes > 0 && (
                                 <>
                                    <span className="text-zinc-600">-</span>
                                    <span className="text-zinc-400 font-bold">{isNaN(stat.pushes) ? 0 : String(stat.pushes)}P</span>
                                 </>
                              )}
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                           <div className="bg-zinc-800/30 rounded p-2 flex flex-col items-center text-center">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Max Win<br />Chain</span>
                              <span className="text-green-400 font-bold font-mono">W{isNaN(stat.longestWinChain) ? 0 : String(stat.longestWinChain)}</span>
                           </div>
                           <div className="bg-zinc-800/30 rounded p-2 flex flex-col items-center text-center">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Max Loss<br />Chain</span>
                              <span className="text-red-400 font-bold font-mono">L{isNaN(stat.longestLossChain) ? 0 : String(stat.longestLossChain)}</span>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      )}

      {/* Referral Section */}
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 mt-6">
         <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-400" /> Refer & Earn
         </h2>
         <p className="text-sm text-zinc-400 mb-4">
            Invite friends to join using your personal link. Build your referral network!
         </p>
         {profile?.referralsCount !== undefined && (
            <div className="mb-4 pb-4 border-b border-zinc-800 flex items-center justify-between">
               <span className="text-zinc-400 text-sm">Total Referrals</span>
               <span className="font-bold text-lg text-purple-400">{Number.isNaN(Number(profile.referralsCount)) ? 0 : profile.referralsCount}</span>
            </div>
         )}
         <div className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
            <div className="flex-1 font-mono text-sm text-zinc-300 truncate">
               {window.location.origin}/?ref={profile?.id}
            </div>
            <Button
               variant="outline"
               size="sm"
               className="shrink-0 flex items-center gap-2 border-zinc-600 text-zinc-300 hover:text-white"
               onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?ref=${profile?.id}`);
                  // Note: In a real app we'd show a toast here
                  alert("Referral link copied!");
               }}
            >
               <Copy className="w-4 h-4" /> Copy
            </Button>
         </div>
      </div>


      {/* Inventory & Cosmetics */}
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 mt-6">
         <h2 className="text-lg font-bold text-zinc-200 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Coins className="w-5 h-5 text-cyan-400" /> Inventory & Cosmetics
            </div>
            <Link to="/shop" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
               Visit Shop
            </Link>
         </h2>

         {inventoryLoading ? (
            <div className="text-center text-zinc-500 py-8">Loading inventory...</div>
         ) : inventoryItems.length === 0 ? (
            <div className="text-center text-zinc-500 py-8 flex flex-col items-center justify-center">
               <div className="mb-2">You don't own any cosmetics yet.</div>
               <Link to="/shop">
                  <Button variant="outline" className="mt-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                     Browse Shop
                  </Button>
               </Link>
            </div>
         ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {inventoryItems.filter(item => profile?.inventory?.includes(item.id)).map(item => {
                  const isEquipped = profile?.equippedCosmetics?.[item.type] === item.id;

                  return (
                     <div key={item.id} className={`bg-[#18181a] border rounded-xl p-4 flex flex-col ${isEquipped ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-zinc-800'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="text-md font-bold text-zinc-200">{item.name}</h3>
                           <span className="text-[10px] px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">{item.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4 flex-1">{item.description}</p>


                        <Button
                           onClick={() => handleEquip(isEquipped ? null : item.id, item.type)}
                           disabled={equipLoading === item.type}
                           variant={isEquipped ? "destructive" : "default"}
                           className={`w-full ${isEquipped ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                           size="sm"
                        >
                           {equipLoading === item.type ? 'Processing...' : isEquipped ? 'Unequip' : 'Equip'}
                        </Button>

                        {isEquipped && item.id === 'banner_responsible_gambler' && (
                          <div className="mt-4 border-t border-zinc-800 pt-4">
                            <p className="text-xs text-zinc-500 mb-2 font-semibold">Select Variant:</p>
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={() => handleUpdateVariant('ResponsibleGamblerBanner')}
                                variant="outline"
                                size="sm"
                                className={`justify-start ${profile?.equippedCosmetics?.BANNER_VARIANT === 'ResponsibleGamblerBanner' || !profile?.equippedCosmetics?.BANNER_VARIANT ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-zinc-700 text-zinc-400'}`}
                              >
                                Base Banner
                              </Button>
                              <Button
                                onClick={() => handleUpdateVariant('ResponsibleGamblerReadableBanner')}
                                variant="outline"
                                size="sm"
                                className={`justify-start ${profile?.equippedCosmetics?.BANNER_VARIANT === 'ResponsibleGamblerReadableBanner' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-zinc-700 text-zinc-400'}`}
                              >
                                Readable PSA
                              </Button>
                              <Button
                                onClick={() => handleUpdateVariant('ResponsibleGamblerDarkHumorBanner')}
                                variant="outline"
                                size="sm"
                                className={`justify-start ${profile?.equippedCosmetics?.BANNER_VARIANT === 'ResponsibleGamblerDarkHumorBanner' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-zinc-700 text-zinc-400'}`}
                              >
                                Dark Humor
                              </Button>
                            </div>
                          </div>
                        )}

                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* Account Settings */}
      <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 mt-6">
         <h2 className="text-lg font-bold text-zinc-200 mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-400" /> Account Settings
         </h2>

         {settingsMessage && (
            <div className={`p-4 rounded-lg mb-6 text-sm flex items-center gap-2 ${settingsMessage.type === 'success' ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
               {settingsMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
               {settingsMessage.text}
            </div>
         )}

         <div className="space-y-8 max-w-2xl">
            {/* Profile Info */}
            <div>
               <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">Profile Information</h3>
               <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-zinc-300 mb-1.5">Username</label>
                     <Input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-zinc-100"
                        placeholder="Choose a username"
                     />
                     <p className="text-xs text-zinc-500 mt-1.5">Your unique identifier on ChainLink.</p>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-zinc-300 mb-1.5">Display Name</label>
                     <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-zinc-100"
                        placeholder="Your display name"
                     />
                     <p className="text-xs text-zinc-500 mt-1.5">This is how you appear to other users.</p>
                  </div>
                  <Button
                     onClick={handleUpdateInfo}
                     disabled={updatingSettings || (newUsername === profile?.username && newName === profile?.name)}
                     className="bg-cyan-500 hover:bg-cyan-600 text-black mt-2"
                  >
                     {updatingSettings ? 'Saving...' : 'Save Profile Information'}
                  </Button>
               </div>
            </div>

            <div className="h-px bg-zinc-800/50 w-full" />

            {/* Notifications */}
            <div>
               <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifications
               </h3>
               <div className="flex flex-col gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center justify-between">
                     <div>
                        <div className="font-medium text-zinc-200">Push Notifications</div>
                        <div className="text-sm text-zinc-500">Receive alerts when matchups start or complete.</div>
                     </div>
                     <button
                        onClick={handleToggleNotifications}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationsEnabled ? 'bg-[#22c55e]' : 'bg-zinc-700'}`}
                     >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                  </div>
                  <div className="text-xs text-zinc-500 bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50">
                     <strong className="text-zinc-400 block mb-1">Troubleshooting:</strong>
                     <ul className="list-disc pl-4 space-y-1">
                        <li><strong>iOS Users:</strong> You must first "Add to Home Screen" (install the app) via Safari's share menu before notifications can be enabled.</li>
                        <li><strong>Android/Web Users:</strong> If you cannot enable notifications, tap the lock icon in your browser's address bar and go to Site Settings to ensure notifications are allowed. Installing the app may also help.</li>
                        <li>If permissions were previously denied, you must manually allow them in your device or <a href="https://support.google.com/chrome/answer/3220216?hl=en&co=GENIE.Platform%3DAndroid" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300">browser settings</a>.</li>
                     </ul>
                  </div>
               </div>
            </div>

            <div className="h-px bg-zinc-800/50 w-full" />

            {/* Security */}
            <div>
               <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Security
               </h3>
               <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <div>
                     <div className="font-medium text-zinc-200">Password Reset</div>
                     <div className="text-sm text-zinc-500">Send a password reset link to your email address.</div>
                  </div>
                  <Button
                     onClick={handleResetPassword}
                     variant="outline"
                     className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                  >
                     Send Email
                  </Button>
               </div>

               {isInstallable && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-800">
                     <div>
                        <div className="font-medium text-zinc-200 flex items-center gap-2">
                           <Download className="w-4 h-4 text-cyan-400" />
                           Install App
                        </div>
                        <div className="text-sm text-zinc-500">Install ChainLink on your device for quick access.</div>
                     </div>
                     <Button
                        onClick={promptInstall}
                        variant="outline"
                        className="bg-cyan-950/30 text-cyan-400 border-cyan-900/50 hover:bg-cyan-900/50 hover:text-cyan-300"
                     >
                        Install
                     </Button>
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* Edit Avatar Modal */}
      <Modal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-zinc-100 mb-4">Edit Profile Avatar</h2>
          <form onSubmit={handleUpdateAvatar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Image URL</label>
              <Input
                type="url"
                placeholder="https://example.com/my-avatar.png"
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Provide a direct link to an image (PNG, JPG, GIF).
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button type="button" variant="outline" onClick={() => setIsAvatarModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={avatarUpdateLoading}>
                {avatarUpdateLoading ? 'Saving...' : 'Save Avatar'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
