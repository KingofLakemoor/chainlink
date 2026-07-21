import { FirebaseImage } from '../../components/ui/FirebaseImage';
import React from 'react';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { ShoppingCart, Trophy, Link2, Coins, ChevronRight, Mail, Calendar,  } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, documentId, onSnapshot, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase-error';
import { DashboardPick, DashboardPickSkeleton } from '../../components/dashboard/dashboard-pick';

import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../../components/ui/titles';
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [picks, setPicks] = React.useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = React.useState<any[]>([]);
  const [allFetchedMatchups, setAllFetchedMatchups] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sponsors, setSponsors] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const q = query(collection(db, 'announcements'), where('active', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching announcements:", e);
        // Fallback without index
        try {
          const q = query(collection(db, 'announcements'), where('active', '==', true));
          const snap = await getDocs(q);
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });
          setAnnouncements(docs);
        } catch (innerE) {
            console.error("Failed fallback announcement fetch", innerE);
        }
      }
    };
    fetchAnnouncements();
  }, []);

  React.useEffect(() => {
    if (!user) return;
    const fetchPicks = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          setPicks([
            { id: '1', status: 'WIN', updatedAt: new Date('2024-01-10').getTime(), matchupId: 'mock-1' },
            { id: '2', status: 'PENDING', updatedAt: new Date('2024-02-15').getTime(), matchupId: 'mock-1' },
          ]);
          return;
        }

        const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const fetchedPicks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPicks(fetchedPicks);
      } catch (e) {
        console.error("Error fetching picks", e);
      }
    };
    fetchPicks();
  }, [user]);

  React.useEffect(() => {
    const fetchInventory = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          const mockItems = [
            { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring.', cost: 500, type: 'AVATAR_RING', active: true, image: 'border-yellow-500' },
            { id: 'banner_neon', name: 'Neon Banner', description: 'Bright profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' },
          ];
          setInventoryItems(mockItems);
          
          return;
        }

        const snap = await getDocs(collection(db, 'shopItems'));
        const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventoryItems(fetchedItems);
      } catch (e) {
        console.error("Error fetching inventory", e);
      } finally {
        
      }
    };

    fetchInventory();
  }, [profile?.inventory]);

  React.useEffect(() => {
    if (!user) return;

    if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
       setAllFetchedMatchups([
            {
                id: 'mock-1',
                gameId: 'mock-1',
                title: 'Mock Team A @ Mock Team B',
                league: 'EPL',
                status: 'STATUS_SCHEDULED',
                startTime: Date.now() + 1000000,
                statusDesc: 'Upcoming',
                cost: 0,
                awayTeam: { id: 'teamA', name: 'Mock Team A', image: 'https://via.placeholder.com/150', score: 0 },
                homeTeam: { id: 'teamB', name: 'Mock Team B', image: 'https://via.placeholder.com/150', score: 0 },
                metadata: {}
            }
       ]);
       setIsLoading(false);
       return;
    }

    const unsubMatchups = onSnapshot(collection(db, 'matchups'), (snap) => {
      if (snap.empty) {
        setAllFetchedMatchups([]);
      } else {
        const allMatchups = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setAllFetchedMatchups(allMatchups);
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matchups');
    });

    return () => {
      unsubMatchups();
    };
  }, [user]);

  React.useEffect(() => {
    const unsubSponsors = onSnapshot(query(collection(db, 'sponsors'), where('active', '==', true)), (snap) => {
      if (!snap.empty) {
        setSponsors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setSponsors([]);
      }
    }, (error) => {
      console.warn("Sponsors list is currently unavailable:", error);
      setSponsors([]);
    });

    return () => {
      unsubSponsors();
    };
  }, []);

  const currentMonthStats = React.useMemo(() => {
    if (!picks || picks.length === 0) return { wins: 0, losses: 0, pushes: 0, longestWinChain: 0, longestLossChain: 0, currentChain: 0 };

    const sortedPicks = [...picks].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let stats = { wins: 0, losses: 0, pushes: 0, longestWinChain: 0, longestLossChain: 0, currentChain: 0 };
    let currentChain = 0;

    sortedPicks.forEach(pick => {
      if (pick.status === 'PENDING') return;

      const date = new Date(pick.updatedAt || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthKey === currentMonthKey) {
        if (pick.status === 'WIN') {
          stats.wins += 1;
          currentChain = currentChain < 0 ? 1 : currentChain + 1;
          stats.longestWinChain = Math.max(stats.longestWinChain, currentChain);
        } else if (pick.status === 'LOSS') {
          stats.losses += 1;
          currentChain = currentChain > 0 ? -1 : (currentChain === 0 ? -1 : currentChain - 1);
          stats.longestLossChain = Math.max(stats.longestLossChain, Math.abs(currentChain));
        } else if (pick.status === 'PUSH') {
          stats.pushes += 1;
        }
        stats.currentChain = currentChain;
      }
    });

    return stats;
  }, [picks]);

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

  const activePick = picks.find(p => p.status === 'PENDING');
  const activeMatchup = activePick ? allFetchedMatchups.find(m => m.gameId === activePick.matchupId) : null;

  if (!profile || !user) {
    return <div className="p-8 text-center text-zinc-400">Loading Dashboard...</div>;
  }

  const joinDate = user?.metadata?.creationTime ? format(new Date(user.metadata.creationTime), 'MMM d, yyyy') : 'Unknown';

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      {/* Profile Header */}
      <div className={`bg-[#121212] border border-zinc-800 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden ${
        BannerComponent || (equippedBannerImage?.startsWith('/') || equippedBannerImage?.startsWith('http') || equippedBannerImage?.startsWith('gs://')) ? '' : (equippedBannerImage || '')
      }`}>
         {BannerComponent && (
            <div className="absolute inset-0 z-0">
               <BannerComponent isStatic={false} />
            </div>
         )}
         {!BannerComponent && (equippedBannerImage?.startsWith('/') || equippedBannerImage?.startsWith('http') || equippedBannerImage?.startsWith('gs://')) && (
            <FirebaseImage src={equippedBannerImage} fallback={`https://placehold.co/600x200/18181b/ffffff?text=${encodeURIComponent(equippedBannerItem?.name || "Profile Banner")}`} alt="Profile Banner" className="absolute inset-0 w-full h-full object-cover z-0" />
         )}
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
               <div className={`relative z-10 w-full h-full rounded-full overflow-hidden ${RingComponent ? 'border-2 border-black/50' : ''}`}>
                 {profile.image ? (
                   <FirebaseImage fallback={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || "guest"}`} src={profile.image} alt={profile.username || profile.name} className="w-full h-full object-cover" loading="lazy" />
                 ) : (
                   <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-4xl font-bold text-zinc-400">
                     {(profile.username || profile.name)?.charAt(0) || user.email?.charAt(0) || '?'}
                   </div>
                 )}
               </div>
            </div>
         </div>

         <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-1 font-display drop-shadow-md">{profile.username || profile.name}</h1>
            {TitleComponent ? (
               <div className="mb-3 inline-block">
                  <TitleComponent isStatic={false} />
               </div>
            ) : profile?.equippedCosmetics?.TITLE ? (
               <div className="mb-3 inline-block">
                  <span className="text-sm font-bold text-[#22c55e] px-2 py-0.5 rounded bg-black/40 border border-[#22c55e]/30 shadow-sm backdrop-blur-sm">
                     {inventoryItems.find(i => i.id === profile.equippedCosmetics.TITLE)?.name || 'Title'}
                  </span>
               </div>
            ) : null}
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

         <div className="z-10 flex flex-col gap-3">
             <div className="bg-black/40 backdrop-blur-md border border-zinc-700/50 rounded-xl p-4 flex flex-col items-center justify-center min-w-[140px]">
                 <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> Links Balance</span>
                 <span className="text-3xl font-display font-bold text-cyan-400 drop-shadow-md">{profile.links?.toLocaleString() || 0}</span>
             </div>
             <Link to="/shop" className="w-full">
                 <Button className="w-full bg-zinc-100 text-zinc-950 hover:bg-white font-bold h-10 flex items-center gap-2">
                     <ShoppingCart className="w-4 h-4" />
                     Visit Store
                 </Button>
             </Link>
         </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
          {/* Stats Column */}
          <div className="md:col-span-1 space-y-6">
              <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" /> Current Month Stats
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#18181a] rounded-xl p-4 border border-zinc-800 flex flex-col items-center">
                          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Wins</span>
                          <span className="text-2xl font-bold text-green-500">{isNaN(currentMonthStats.wins) ? 0 : currentMonthStats.wins}</span>
                      </div>
                      <div className="bg-[#18181a] rounded-xl p-4 border border-zinc-800 flex flex-col items-center">
                          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Losses</span>
                          <span className="text-2xl font-bold text-red-500">{isNaN(currentMonthStats.losses) ? 0 : currentMonthStats.losses}</span>
                      </div>
                      <div className="bg-[#18181a] rounded-xl p-4 border border-zinc-800 flex flex-col items-center">
                          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Pushes</span>
                          <span className="text-2xl font-bold text-zinc-300">{isNaN(currentMonthStats.pushes) ? 0 : currentMonthStats.pushes}</span>
                      </div>
                      <div className="bg-[#18181a] rounded-xl p-4 border border-zinc-800 flex flex-col items-center">
                          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Chain</span>
                          <span className={cn("text-2xl font-bold", currentMonthStats.currentChain > 0 ? "text-green-500" : currentMonthStats.currentChain < 0 ? "text-red-500" : "text-zinc-500")}>
                             {currentMonthStats.currentChain > 0 ? `W${currentMonthStats.currentChain}` : currentMonthStats.currentChain < 0 ? `L${Math.abs(currentMonthStats.currentChain)}` : '-'}
                          </span>
                      </div>
                  </div>
              </div>

              <div className="bg-[#121212] border border-zinc-800 rounded-2xl p-6 flex flex-col max-h-[300px]">
                  <h2 className="text-lg font-bold text-zinc-100 mb-4">Announcements</h2>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                      {announcements.length > 0 ? announcements.map(ann => (
                          <div key={ann.id} className="bg-[#18181a] rounded-xl p-4 border border-zinc-800 relative overflow-hidden">
                              {ann.priority === 'HIGH' && (
                                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                              )}
                              <h3 className="font-bold text-zinc-200 text-sm mb-1">{ann.title}</h3>
                              <p className="text-sm text-zinc-400 whitespace-pre-wrap">{ann.content}</p>
                          </div>
                      )) : (
                          <div className="bg-[#18181a] rounded-xl p-4 border border-zinc-800">
                              <p className="text-sm text-zinc-400">Welcome to ChainLink Dashboard! Stay tuned for upcoming events and features.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Active Pick / Main Content */}
          <div className="md:col-span-2">
             {isLoading ? (
                <DashboardPickSkeleton />
             ) : (
                <DashboardPick activePick={activePick} activeMatchup={activeMatchup} sponsors={sponsors} />
             )}
          </div>
      </div>

      {/* Sponsor Badges */}
      {sponsors.filter(s => s.featured).length > 0 && (
        <div className="pt-6 border-t border-zinc-800/50 mt-8">
            <p className="text-center text-xs text-zinc-500 uppercase font-bold tracking-wider mb-4">Sponsored By</p>
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
    </div>
  );
}
