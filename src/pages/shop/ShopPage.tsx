import React, { useState, useEffect } from 'react';
import { FirebaseImage } from '../../components/ui/FirebaseImage';
import { ShoppingCart, Coins, Crown, Zap } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';

import { Hexagons } from '../../components/ui/avatar-rings/hexagons';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';


import { Hip } from '../../components/ui/avatar-rings/hip';
import { Inferno } from '../../components/ui/avatar-rings/inferno';
import { Mandala } from '../../components/ui/avatar-rings/mandala';
import { Ocean } from '../../components/ui/avatar-rings/ocean';
import { PhantomStar } from '../../components/ui/avatar-rings/phantomstar';
import { InfernoBanner } from '../../components/ui/profile-banners/inferno';
import { AbyssalSwellBanner } from '../../components/ui/profile-banners/abyssal-swell/AbyssalSwellBanner';
import { PhantomStarBanner } from '../../components/ui/profile-banners/phantom-star';
import { PhantomStaticBanner } from '../../components/ui/profile-banners/phantom-static/PhantomStaticBanner';
import { GenesisSyndicate } from '../../components/ui/profile-banners/genesis-syndicate';
import { GlobalStageBanner } from '../../components/ui/profile-banners/global-stage';
import { OpulentoVaultBanner } from '../../components/ui/profile-banners/opulento';
import { ZeroZeroShaderBanner } from "../../components/ui/profile-banners/zero-zero/ZeroZeroShaderBanner";
import { BoardRoomBanner } from '../../components/ui/profile-banners/board-room/BoardRoomBanner';
import { FourthOfJulyBanner } from '../../components/ui/profile-banners/fourth-of-july/FourthOfJulyBanner';
import { DaisyChainBanner } from '../../components/ui/profile-banners/daisy-chain/DaisyChainBanner';
import { XenonTerminalBanner } from '../../components/ui/profile-banners/xenon-terminal';
import { PrimeCircuitRing } from '../../components/ui/avatar-rings/prime-circuit-ring';
import { OpulentoAvatarRing } from '../../components/ui/avatar-rings/opulento';
import { ZeroZeroAvatarRing } from '../../components/ui/avatar-rings/zero-zero';
import { NovatrixCodeAvatarRing } from '../../components/ui/avatar-rings/novatrix-code';
import { NovatrixQuantAvatarRing } from '../../components/ui/avatar-rings/novatrix-quant';
import { SignalFloorAvatarRing } from '../../components/ui/avatar-rings/signal-floor';
import { BullBearAvatarRing } from '../../components/ui/avatar-rings/bull-bear';
import { EdgeLedgerAvatarRing } from '../../components/ui/avatar-rings/edge-ledger';
import { BadBeatAvatarRing } from '../../components/ui/avatar-rings/bad-beat';
import { NovatrixCodeBanner } from '../../components/ui/profile-banners/novatrix/NovatrixCodeBanner';
import { NovatrixQuantBanner } from '../../components/ui/profile-banners/novatrix/NovatrixQuantBanner';
import { SignalFloorBanner } from '../../components/ui/profile-banners/signal-floor/SignalFloorBanner';
import { EdgeLedgerBanner } from '../../components/ui/profile-banners/edge-ledger/EdgeLedgerBanner';
import { BadBeatBanner } from '../../components/ui/profile-banners/bad-beat';
import { TitleMap } from '../../components/ui/titles';

const AvatarRingMap: Record<string, React.FC<any>> = {
  "ResponsibleGamblerAvatarRing": ResponsibleGamblerAvatarRing,
  'Hexagons': Hexagons,
  'Hip': Hip,
  'Inferno': Inferno,
  'Mandala': Mandala,
  'Ocean': Ocean,
  'PhantomStar': PhantomStar,
  'PrimeCircuitRing': PrimeCircuitRing,
  'OpulentoAvatarRing': OpulentoAvatarRing,
  'ZeroZeroAvatarRing': ZeroZeroAvatarRing,
  'NovatrixCodeAvatarRing': NovatrixCodeAvatarRing,
  'NovatrixQuantAvatarRing': NovatrixQuantAvatarRing,
  'SignalFloorAvatarRing': SignalFloorAvatarRing,
  'BullBearAvatarRing': BullBearAvatarRing
  ,'EdgeLedgerAvatarRing': EdgeLedgerAvatarRing,
  'BadBeatAvatarRing': BadBeatAvatarRing
};

import { ResponsibleGamblerBaseBanner, ResponsibleGamblerReadableBanner, ResponsibleGamblerDarkHumorBanner } from "../../components/ui/profile-banners/responsible-gambler";
import { ResponsibleGamblerAvatarRing } from "../../components/ui/avatar-rings/responsible-gambler/ResponsibleGamblerAvatarRing";
import { ResponsibleGamblerTitle } from "../../components/ui/titles/responsible-gambler/ResponsibleGamblerTitle";

const ProfileBannerMap: Record<string, React.FC<any>> = {
  "ResponsibleGamblerBanner": ResponsibleGamblerBaseBanner,
  "ResponsibleGamblerReadableBanner": ResponsibleGamblerReadableBanner,
  "ResponsibleGamblerDarkHumorBanner": ResponsibleGamblerDarkHumorBanner,
  'BoardRoomBanner': BoardRoomBanner,
  'FourthOfJulyBanner': FourthOfJulyBanner,
  'InfernoBanner': InfernoBanner,
  'AbyssalSwellBanner': AbyssalSwellBanner,
  'PhantomStarBanner': PhantomStarBanner,
  'PhantomStaticBanner': PhantomStaticBanner,
  'GenesisSyndicate': GenesisSyndicate,
  'GlobalStageBanner': GlobalStageBanner,
  'OpulentoVaultBanner': OpulentoVaultBanner,
  'ZeroZeroShaderBanner': ZeroZeroShaderBanner,
  'DaisyChainBanner': DaisyChainBanner,
  'XenonTerminalBanner': XenonTerminalBanner,
  'NovatrixCodeBanner': NovatrixCodeBanner,
  'NovatrixQuantBanner': NovatrixQuantBanner,
  'SignalFloorBanner': SignalFloorBanner
  ,'EdgeLedgerBanner': EdgeLedgerBanner,
  'BadBeatBanner': BadBeatBanner
};




export default function ShopPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState(false);

  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isMerchModalOpen, setIsMerchModalOpen] = useState(false);
  const [selectedMerchItem, setSelectedMerchItem] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    size: 'M',
    color: 'Black'
  });
  const [activePreviewImage, setActivePreviewImage] = useState<string>('');


  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          setItems([
            { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring for your avatar.', cost: 500, type: 'AVATAR_RING', active: true, image: 'Hexagons' },
            { id: 'ring_bull_bear', name: 'Bull & Bear', description: 'A market ring showing bullish and bearish forces.', cost: 3500, type: 'AVATAR_RING', active: true, image: 'BullBearAvatarRing' },
            { id: 'banner_neon', name: 'Neon Banner', description: 'Brighten up your profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'InfernoBanner' },

            { id: 'merch_level_one_tee', name: 'ChainLink Level One Tee', description: 'The official ChainLink Level One Tee.', cost: 1000, type: 'MERCH', active: true, image: 'gs://chainlink-2-72590.firebasestorage.app/tee banner.png' },
            { id: 'merch_trucker_hat', name: 'ChainLink Trucker Hat', description: 'The official ChainLink Trucker Hat.', cost: 850, type: 'MERCH', active: true, image: 'gs://chainlink-2-72590.firebasestorage.app/trucker banner.png' },
          ]);
          setLoading(false);
          return;
        }

        const q = query(collection(db, 'shopItems'), where('active', '==', true));
        const snap = await getDocs(q);
        const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(fetchedItems);
      } catch (e) {
        console.error("Error fetching shop items", e);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();

    // Check for Stripe success/cancel params
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('success')) {
      setMessage({ text: 'Payment successful! Your account has been updated.', type: 'success' });
      // Remove query params from URL
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (searchParams.get('canceled')) {
      setMessage({ text: 'Payment was canceled.', type: 'error' });
      // Remove query params from URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);


  const handleClaimDaily = async () => {
    if (!user) return;
    setClaimLoading(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/shop/claim-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Successfully claimed 10 daily links!", type: 'success' });
      } else {
        setMessage({ text: data.error || "Failed to claim links.", type: 'error' });
      }
    } catch (e) {
      setMessage({ text: "An error occurred.", type: 'error' });
    } finally {
      setClaimLoading(false);
    }
  };

  const handleStripeCheckout = async (itemType: string, amount?: number) => {
    if (!user) {
      setMessage({ text: "You must be logged in to make purchases.", type: 'error' });
      return;
    }

    setBuyLoading(`${itemType}-${amount}`);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemType, amount })
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ text: data.error || "Failed to initiate checkout.", type: 'error' });
      }
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      setMessage({ text: "An error occurred during checkout.", type: 'error' });
    } finally {
      setBuyLoading(null);
    }
  };

  const handleBuy = async (itemId: string, cost: number) => {
    if (!user) {
      setMessage({ text: "You must be logged in to buy items.", type: 'error' });
      return;
    }
    if ((profile?.links || 0) < cost) {
      setMessage({ text: "Not enough links!", type: 'error' });
      return;
    }

    setBuyLoading(itemId);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Purchase successful! Equip it in your Profile.", type: 'success' });
      } else {
        setMessage({ text: data.error || "Purchase failed.", type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: "An error occurred.", type: 'error' });
    } finally {
      setBuyLoading(null);
    }
  };


  const handleBuyMerch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMerchItem) return;

    if ((profile?.links || 0) < selectedMerchItem.cost) {
      setMessage({ text: "Not enough links!", type: 'error' });
      setIsMerchModalOpen(false);
      return;
    }

    setBuyLoading(selectedMerchItem.id);
    setMessage(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/shop/buy-merch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: selectedMerchItem.id, shippingInfo })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: "Order placed successfully! We will email you with updates.", type: 'success' });
        setIsMerchModalOpen(false);
      } else {
        setMessage({ text: data.error || "Purchase failed.", type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: "An error occurred.", type: 'error' });
    } finally {
      setBuyLoading(null);
    }
  };



  const regularItems = items.filter(item => item.active !== false && item.forSale !== false && !item.premiumOnly);
  const featuredCosmetics = items.filter(item => item.featured && item.active !== false && item.forSale !== false && (item.type === 'AVATAR_RING' || item.type === 'PROFILE_BANNER' || item.type === 'TITLE') && !item.premiumOnly);

  const allBanners = [...featuredCosmetics.filter(item => item.type === 'PROFILE_BANNER'), ...regularItems.filter(item => item.type === 'PROFILE_BANNER' && !item.featured)];
  const allRings = [...featuredCosmetics.filter(item => item.type === 'AVATAR_RING'), ...regularItems.filter(item => item.type === 'AVATAR_RING' && !item.featured)];
  const allTitles = [...featuredCosmetics.filter(item => item.type === 'TITLE'), ...regularItems.filter(item => item.type === 'TITLE' && !item.featured)];
  const proItems = items.filter(item => item.active !== false && item.forSale !== false && item.premiumOnly);

  const renderCosmeticCard = (item: any) => {
    const ownsItem = profile?.inventory?.includes(item.id);

    return (
      <div key={item.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
         {/* Preview area */}
         <div className="h-32 bg-zinc-900 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
            {item.type === 'PROFILE_BANNER' && (
              item.thumbnail ? (
                  <FirebaseImage src={item.thumbnail} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : ProfileBannerMap[item.image] ? (
                <div className="absolute inset-0">
                  {React.createElement(ProfileBannerMap[item.image], { isStatic: false })}
                </div>
              ) : (item.image?.startsWith('/') || item.image?.startsWith('http') || item.image?.startsWith('gs://')) ? (
                  <FirebaseImage src={item.image} fallback={`https://placehold.co/600x200/18181b/ffffff?text=${encodeURIComponent(item.name)}`} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className={`absolute inset-0 ${item.image || 'bg-zinc-800'}`}></div>
                )
            )}
            {item.type === 'AVATAR_RING' && (
              <div className="relative w-16 h-16 flex items-center justify-center z-10">
                {item.thumbnail ? (
                  <FirebaseImage src={item.thumbnail} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : AvatarRingMap[item.image] ? (
                   <>
                     <div className="absolute inset-0 transform scale-[1.3] pointer-events-none">
                       {React.createElement(AvatarRingMap[item.image], { isStatic: false })}
                     </div>
                     <div className="relative w-full h-full p-1.5">
                       <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 shadow-inner">Avatar</div>
                     </div>
                   </>
                ) : (
                  <div className={`w-16 h-16 rounded-full border-4 ${item.image || 'border-zinc-500'} bg-zinc-800 flex items-center justify-center text-xs text-zinc-500`}>Avatar</div>
                )}
              </div>
            )}
            {item.type === 'TITLE' && (
              <div className="z-10">
                {item.thumbnail ? (
                  <FirebaseImage src={item.thumbnail} alt={item.name} className="w-full h-full object-contain max-h-16" />
                ) : TitleMap[item.preview || item.image || ''] ? (
                  <div className="flex justify-center py-2">
                    {React.createElement(TitleMap[item.preview || item.image || ''], { isStatic: false })}
                  </div>
                ) : (
                  <div className={`text-xl font-bold text-zinc-300 font-display px-4 py-2 bg-black/50 rounded-lg border border-zinc-700 ${item.image || ''}`}>{item.name}</div>
                )}
              </div>
            )}
         </div>
         <div className="p-5 flex flex-col flex-1 relative">
            <div className="flex justify-between items-start mb-2">
               <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-zinc-200">{item.name}</h3>
                  {item.premiumOnly && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 mt-1">ChainLink Pro Exclusive</span>
                  )}
               </div>
               <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded uppercase font-bold tracking-wider">{item.category || item.type.replace('_', ' ')}</span>
            </div>
            <p className="text-sm text-zinc-400 flex-1 mb-4">{item.description}</p>

            <div className="flex items-center justify-between mt-auto">
               <div className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                 <Coins className="w-4 h-4" /> {item.cost.toLocaleString()}
               </div>
               {item.premiumOnly && !profile?.premium && !ownsItem ? (
                 <Button
                   disabled
                   className="bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-not-allowed opacity-80"
                 >
                   Requires Pro
                 </Button>
               ) : (
                 <Button
                   onClick={() => handleBuy(item.id, item.cost)}
                   disabled={ownsItem || buyLoading === item.id || !user || (profile?.links || 0) < item.cost}
                   variant={ownsItem ? "secondary" : "default"}
                   className={ownsItem ? "" : "bg-[#22c55e] hover:bg-[#16a34a] text-white"}
                 >
                   {buyLoading === item.id ? 'Processing...' : ownsItem ? 'Owned' : 'Buy Now'}
                 </Button>
               )}
            </div>
         </div>
      </div>
    );
  };

  const merchItems = items.filter(item => item.type === 'MERCH');


  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 font-display flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-[#22c55e]" />
            Link Shop
          </h1>
          <p className="text-zinc-400 mt-1">Spend your links on cosmetics and merch.</p>
        </div>
        {profile && (
          <div className="bg-[#121212] border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
             <span className="text-zinc-400 font-medium">Your Balance:</span>
             <div className="text-xl font-mono font-bold text-cyan-400 flex items-center gap-1">
               <Coins className="w-5 h-5" />
               {profile.links?.toLocaleString() || 0}
             </div>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-8 border font-medium ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-12">

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Buy Links & Premium
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">150 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">A quick refill to keep you in the game</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 150)}
                  disabled={buyLoading === 'links-150' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-150' ? 'Loading...' : '$5.25'}
                </Button>
              </div>
            </div>

            {/* Monthly */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">350 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">Standard boost for your Links</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 350)}
                  disabled={buyLoading === 'links-350' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-350' ? 'Loading...' : '$10.49'}
                </Button>
              </div>
            </div>

            {/* Merch Tier */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                POPULAR
              </div>
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 mt-2">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">1,050 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">Enough for a merch redemption</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 1050)}
                  disabled={buyLoading === 'links-1050' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-1050' ? 'Loading...' : '$29.99'}
                </Button>
              </div>
            </div>

            {/* Bulk Tier */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                BEST VALUE
              </div>
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 mt-2">
                <Coins className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">1,800 Links</h3>
              <p className="text-zinc-400 text-sm mb-6 flex-1">Massive boost for serious players</p>
              <div className="w-full">
                <Button
                  onClick={() => handleStripeCheckout('links', 1800)}
                  disabled={buyLoading === 'links-1800' || !user}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {buyLoading === 'links-1800' ? 'Loading...' : '$49.99'}
                </Button>
              </div>
            </div>

            {/* Premium Subscription / Pro Shop */}
            {profile?.premium ? (
              <div className="bg-gradient-to-b from-purple-900/40 to-[#121212] border border-purple-500/30 rounded-xl p-6 flex flex-col items-center text-center sm:col-span-2 lg:col-span-4 w-full">
                <div className="flex flex-col md:flex-row items-center justify-between w-full mb-6">
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Crown className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-bold text-white">ChainLink Pro</h3>
                      <p className="text-purple-300/70 text-sm">Thanks for being a Pro member!</p>
                    </div>
                  </div>
                  <div className="bg-[#121212]/80 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center w-full md:w-auto min-w-[200px]">
                    <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Daily Bonus</span>
                    <Button
                      onClick={handleClaimDaily}
                      disabled={claimLoading || profile?.lastDailyClaim === new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold"
                    >
                      {claimLoading ? 'Claiming...' : profile?.lastDailyClaim === new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' }) ? 'Claimed Today' : 'Claim 10 Links'}
                    </Button>
                  </div>
                </div>

                <div className="w-full border-t border-purple-500/20 my-6"></div>

                <h4 className="text-lg font-bold text-white mb-4 self-start">Pro Exclusive Items</h4>
                {proItems.length === 0 ? (
                  <div className="text-purple-300/60 p-4 border border-purple-500/20 rounded-lg w-full">
                    New Pro cosmetics coming soon!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
                    {proItems.map(item => renderCosmeticCard(item))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-b from-purple-900/40 to-[#121212] border border-purple-500/30 rounded-xl p-6 flex flex-col items-center text-center sm:col-span-2 lg:col-span-4 max-w-2xl mx-auto w-full">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Crown className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">ChainLink Pro</h3>
                <div className="text-purple-200/70 text-sm mb-6 flex-1 text-left space-y-1 w-full max-w-sm">
                  <p className="mb-2 text-center">Unlock the ultimate ChainLink experience:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Claim 10 Links</strong> daily in the Shop</li>
                    <li><strong>Queue future picks</strong> automatically</li>
                    <li>Exclusive <strong>Advanced Metrics</strong> tracking</li>
                    <li>Access to <strong>Pro-exclusive shop items</strong></li>
                    <li>A special <strong>Pro Only cosmetic set</strong> every month</li>
                    <li>Full access to <strong><a href="https://scriptless.club602.com/premium" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-300">ScriptLess Premium</a></strong></li>
                  </ul>
                </div>
                <div className="w-full">
                  <Button
                    onClick={() => handleStripeCheckout('premium')}
                    disabled={buyLoading === 'premium-undefined' || !user || profile?.premium}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    {profile?.premium ? 'Active' : buyLoading === 'premium-undefined' ? 'Loading...' : '$4.99 / mo'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Banners</h2>

          {loading ? (
            <div className="text-zinc-500">Loading shop...</div>
          ) : allBanners.length === 0 ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              No banners available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allBanners.map(item => renderCosmeticCard(item))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Rings</h2>

          {loading ? (
            <div className="text-zinc-500">Loading shop...</div>
          ) : allRings.length === 0 ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              No rings available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allRings.map(item => renderCosmeticCard(item))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Titles</h2>

          {loading ? (
            <div className="text-zinc-500">Loading shop...</div>
          ) : allTitles.length === 0 ? (
            <div className="bg-[#121212] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              No titles available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTitles.map(item => renderCosmeticCard(item))}
            </div>
          )}
        </section>


        <section>
          <h2 className="text-2xl font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">Merch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Existing Tee Card */}
            {merchItems.find(i => i.id === 'merch_level_one_tee') && (() => {
              const item = merchItems.find(i => i.id === 'merch_level_one_tee')!;
              return (
                <div key={item.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                  <div className="h-40 bg-zinc-900 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                     {item.image ? (
                        <FirebaseImage src={item.image} fallback={`https://placehold.co/400x400/18181b/ffffff?text=${encodeURIComponent(item.name)}`} alt={item.name} className="w-full h-full object-cover" />
                     ) : (
                        <>
                           <div className="absolute inset-0 bg-zinc-800"></div>
                           <div className="text-6xl z-10">👕</div>
                        </>
                     )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-zinc-200 mb-2">{item.name}</h3>
                    <p className="text-sm text-zinc-400 flex-1 mb-6">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                        <Coins className="w-4 h-4" /> {item.cost.toLocaleString()}
                      </div>
                      <Button
                         variant="default"
                         className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
                         disabled={buyLoading === item.id || !user || (profile?.links || 0) < item.cost}
                         onClick={() => {
                           setSelectedMerchItem(item);
                           setIsMerchModalOpen(true);
                         }}
                      >
                         {buyLoading === item.id ? 'Processing...' : 'Buy Now'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. Custom Link Card for Club 602 Merch Shop */}
            <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
              <div className="h-40 bg-zinc-900 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                <FirebaseImage src="gs://chainlink-2-72590.firebasestorage.app/602 Merch Banner.jpeg" fallback="https://placehold.co/600x400/18181b/ffffff?text=Club+602+Merch" alt="Club 602 Merch" className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-zinc-200 mb-2">Club 602 Merch Shop</h3>
                <p className="text-sm text-zinc-400 flex-1 mb-6">Browse the full collection of Club 602 gear.</p>
                <div className="flex items-center justify-end">
                  <a href="https://www.club602.com/merch" target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-200">
                      Visit Shop
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* 3. New Trucker Hat Card */}
            {merchItems.find(i => i.id === 'merch_trucker_hat') && (() => {
              const item = merchItems.find(i => i.id === 'merch_trucker_hat')!;
              return (
                <div key={item.id} className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                  <div className="h-40 bg-zinc-900 flex items-center justify-center relative overflow-hidden border-b border-zinc-800">
                     {item.image ? (
                        <FirebaseImage src={item.image} fallback={`https://placehold.co/400x400/18181b/ffffff?text=${encodeURIComponent(item.name)}`} alt={item.name} className="w-full h-full object-cover" />
                     ) : (
                        <>
                           <div className="absolute inset-0 bg-zinc-800"></div>
                           <div className="text-6xl z-10">🧢</div>
                        </>
                     )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-zinc-200 mb-2">{item.name}</h3>
                    <p className="text-sm text-zinc-400 flex-1 mb-6">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                        <Coins className="w-4 h-4" /> {item.cost.toLocaleString()}
                      </div>
                      <Button
                         variant="default"
                         className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
                         disabled={buyLoading === item.id || !user || (profile?.links || 0) < item.cost}
                         onClick={() => {
                           setSelectedMerchItem(item);
                           setIsMerchModalOpen(true);
                         }}
                      >
                         {buyLoading === item.id ? 'Processing...' : 'Buy Now'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

</section>

      <Modal isOpen={isMerchModalOpen} onClose={() => setIsMerchModalOpen(false)}>
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Order {selectedMerchItem?.name}</h2>
          {selectedMerchItem?.description && (
            <p className="text-zinc-400 text-sm mb-4">
              {selectedMerchItem.description}
            </p>
          )}

          {/* Product Preview Images */}
          {selectedMerchItem?.id === 'merch_level_one_tee' && (
             <div className="mb-6">
                <div className="aspect-square bg-zinc-900 rounded-lg overflow-hidden mb-3 border border-zinc-800 flex items-center justify-center">
                   <FirebaseImage src={activePreviewImage || selectedMerchItem.image} fallback={`https://placehold.co/600x600/18181b/ffffff?text=${encodeURIComponent(selectedMerchItem.name)}`}
                    alt="Product Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                  {[
                    { color: 'Black', src: '/images/merch/unisex-sports-tee-black-front-6a1a327fdd456.jpg' },
                    { color: 'Navy', src: '/images/merch/unisex-sports-tee-navy-front-6a1a327fdd64c.jpg' },
                    { color: 'Dark Heather', src: '/images/merch/unisex-sports-tee-dark-heather-front-6a1a327fdd4e7.jpg' },
                    { color: 'Kelly Green', src: '/images/merch/unisex-sports-tee-kelly-green-front-6a1a327fdd561.jpg' },
                    { color: 'Lime', src: '/images/merch/unisex-sports-tee-lime-front-6a1a327fdd5d8.jpg' },
                    { color: 'Ash', src: '/images/merch/unisex-sports-tee-ash-front-6a1a327fdd2b4.jpg' },
                    { color: 'White', src: '/images/merch/unisex-sports-tee-white-front-6a1a327fdd6c0.jpg' }
                  ].map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setActivePreviewImage(img.src);
                        setShippingInfo({...shippingInfo, color: img.color});
                      }}
                      className={`w-16 h-16 rounded-md bg-zinc-800 border-2 shrink-0 overflow-hidden ${(activePreviewImage === img.src || (activePreviewImage === '' && shippingInfo.color === img.color)) ? 'border-emerald-500' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      {/* Using the image directly is fine, but since we don't have them all we'll just show the color block as a fallback, or rely on broken image icons for now */}
                       <FirebaseImage src={img.src} alt={img.color} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = img.color; e.currentTarget.parentElement!.className += ' text-xs flex items-center justify-center' }} />
                    </button>
                  ))}
                </div>
             </div>
          )}

          {selectedMerchItem?.id === 'merch_trucker_hat' && (
             <div className="mb-6">
                <div className="aspect-square bg-zinc-900 rounded-lg overflow-hidden mb-3 border border-zinc-800 flex items-center justify-center">
                   <FirebaseImage src={activePreviewImage || selectedMerchItem.image} fallback={`https://placehold.co/600x600/18181b/ffffff?text=${encodeURIComponent(selectedMerchItem.name)}`}
                    alt="Product Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                  {[
                    { color: 'Kelly Green Front', src: '/images/merch/5-panel-trucker-cap-kelly-white-kelly-front-6a32e56ba13ce.png' },
                    { color: 'Kelly Green Side', src: '/images/merch/5-panel-trucker-cap-kelly-white-kelly-right-front-6a32e56ba1613.png' },
                    { color: 'Black Front', src: '/images/merch/5-panel-trucker-cap-black-white-black-front-6a32e56ba11e1.png' },
                    { color: 'Black Side', src: '/images/merch/5-panel-trucker-cap-black-white-black-left-front-6a32e56ba1803.png' }
                  ].map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setActivePreviewImage(img.src);
                        // Extract color base
                        const colorBase = img.color.includes('Kelly') ? 'Kelly Green' : 'Black';
                        setShippingInfo({...shippingInfo, color: colorBase});
                      }}
                      className={`w-16 h-16 rounded-md bg-zinc-800 border-2 shrink-0 overflow-hidden ${(activePreviewImage === img.src) ? 'border-emerald-500' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                       <FirebaseImage src={img.src} alt={img.color} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = img.color; e.currentTarget.parentElement!.className += ' text-xs text-center flex items-center justify-center p-1' }} />
                    </button>
                  ))}
                </div>
             </div>
          )}


          <p className="text-zinc-400 text-sm mb-4">
            Please enter your shipping information below. This is required for physical merchandise.
          </p>
          <form onSubmit={handleBuyMerch}>
            <div className="space-y-4">

              {selectedMerchItem?.id === 'merch_level_one_tee' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-zinc-400 mb-1">Color</label>
                    <select
                      id="color"
                      value={shippingInfo.color}
                      onChange={(e) => {
                         const val = e.target.value;
                         setShippingInfo({...shippingInfo, color: val});
                         // Try to update preview image based on color selection
                         const imgMap: Record<string, string> = {
                           'Black': '/images/merch/unisex-sports-tee-black-front-6a1a327fdd456.jpg',
                           'Navy': '/images/merch/unisex-sports-tee-navy-front-6a1a327fdd64c.jpg',
                           'Dark Heather': '/images/merch/unisex-sports-tee-dark-heather-front-6a1a327fdd4e7.jpg',
                           'Kelly Green': '/images/merch/unisex-sports-tee-kelly-green-front-6a1a327fdd561.jpg',
                           'Lime': '/images/merch/unisex-sports-tee-lime-front-6a1a327fdd5d8.jpg',
                           'Ash': '/images/merch/unisex-sports-tee-ash-front-6a1a327fdd2b4.jpg',
                           'White': '/images/merch/unisex-sports-tee-white-front-6a1a327fdd6c0.jpg'
                         };
                         if (imgMap[val]) setActivePreviewImage(imgMap[val]);
                      }}
                      className="w-full rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Black">Black</option>
                      <option value="Navy">Navy</option>
                      <option value="Dark Heather">Dark Heather</option>
                      <option value="Kelly Green">Kelly Green</option>
                      <option value="Lime">Lime</option>
                      <option value="Ash">Ash</option>
                      <option value="White">White</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="size" className="block text-sm font-medium text-zinc-400 mb-1">Size</label>
                    <select
                      id="size"
                      value={shippingInfo.size}
                      onChange={(e) => setShippingInfo({...shippingInfo, size: e.target.value})}
                      className="w-full rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="2XL">2XL</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedMerchItem?.id === 'merch_trucker_hat' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-zinc-400 mb-1">Color</label>
                    <select
                      id="color"
                      value={shippingInfo.color}
                      onChange={(e) => {
                         const val = e.target.value;
                         setShippingInfo({...shippingInfo, color: val});
                         const imgMap: Record<string, string> = {
                           'Black': '/images/merch/5-panel-trucker-cap-black-white-black-front-6a32e56ba11e1.png',
                           'Kelly Green': '/images/merch/5-panel-trucker-cap-kelly-white-kelly-front-6a32e56ba13ce.png'
                         };
                         if (imgMap[val]) setActivePreviewImage(imgMap[val]);
                      }}
                      className="w-full rounded-md bg-zinc-900 border border-zinc-800 text-zinc-100 py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Black">Black</option>
                      <option value="Kelly Green">Kelly Green</option>
                    </select>
                  </div>
                </div>
              )}


              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                <Input
                  id="fullName"
                  required
                  value={shippingInfo.fullName}
                  onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div>
                <label htmlFor="streetAddress" className="block text-sm font-medium text-zinc-400 mb-1">Street Address</label>
                <Input
                  id="streetAddress"
                  required
                  value={shippingInfo.streetAddress}
                  onChange={(e) => setShippingInfo({...shippingInfo, streetAddress: e.target.value})}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-zinc-400 mb-1">City</label>
                  <Input
                    id="city"
                    required
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-zinc-400 mb-1">State/Province</label>
                  <Input
                    id="state"
                    required
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-zinc-400 mb-1">ZIP/Postal Code</label>
                  <Input
                    id="zip"
                    required
                    value={shippingInfo.zip}
                    onChange={(e) => setShippingInfo({...shippingInfo, zip: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-zinc-400 mb-1">Country</label>
                  <Input
                    id="country"
                    required
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {message.text}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <Button type="button" onClick={() => setIsMerchModalOpen(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={buyLoading === selectedMerchItem?.id} className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white">
                   {buyLoading === selectedMerchItem?.id ? 'Processing...' : 'Place Order'}
                </Button>
              </div>
            </div>
          </form>
        </div>
</Modal>

      </div>
    </div>
  );
}
