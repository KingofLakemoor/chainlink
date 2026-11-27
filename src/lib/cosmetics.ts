import { Hexagons } from '../components/ui/avatar-rings/hexagons';
import { Hip } from '../components/ui/avatar-rings/hip';
import { Inferno } from '../components/ui/avatar-rings/inferno';
import { Mandala } from '../components/ui/avatar-rings/mandala';
import { Ocean } from '../components/ui/avatar-rings/ocean';
import { PhantomStar } from '../components/ui/avatar-rings/phantomstar';
import { PrimeCircuitRing } from '../components/ui/avatar-rings/prime-circuit-ring';
import { OpulentoAvatarRing } from '../components/ui/avatar-rings/opulento';
import { ZeroZeroAvatarRing } from '../components/ui/avatar-rings/zero-zero';
import { NovatrixCodeAvatarRing } from '../components/ui/avatar-rings/novatrix-code';
import { NovatrixQuantAvatarRing } from '../components/ui/avatar-rings/novatrix-quant';
import { SignalFloorAvatarRing } from '../components/ui/avatar-rings/signal-floor';
import { BullBearAvatarRing } from '../components/ui/avatar-rings/bull-bear';
import { EdgeLedgerAvatarRing } from '../components/ui/avatar-rings/edge-ledger';
import { BadBeatAvatarRing } from '../components/ui/avatar-rings/bad-beat';
import { ResponsibleGamblerAvatarRing } from '../components/ui/avatar-rings/responsible-gambler/ResponsibleGamblerAvatarRing';
import { ViceNeonAvatarRing } from '../components/ui/avatar-rings/vice-neon';

import { InfernoBanner } from '../components/ui/profile-banners/inferno';
import { AbyssalSwellBanner } from '../components/ui/profile-banners/abyssal-swell/AbyssalSwellBanner';
import { PhantomStarBanner } from '../components/ui/profile-banners/phantom-star';
import { PhantomStaticBanner } from '../components/ui/profile-banners/phantom-static/PhantomStaticBanner';
import { GenesisSyndicate } from '../components/ui/profile-banners/genesis-syndicate';
import { GlobalStageBanner } from '../components/ui/profile-banners/global-stage';
import { OpulentoVaultBanner } from '../components/ui/profile-banners/opulento';
import { ZeroZeroShaderBanner } from "../components/ui/profile-banners/zero-zero/ZeroZeroShaderBanner";
import { BoardRoomBanner } from '../components/ui/profile-banners/board-room/BoardRoomBanner';
import { FourthOfJulyBanner } from '../components/ui/profile-banners/fourth-of-july/FourthOfJulyBanner';
import { DaisyChainBanner } from '../components/ui/profile-banners/daisy-chain/DaisyChainBanner';
import { XenonTerminalBanner } from '../components/ui/profile-banners/xenon-terminal';
import { NovatrixCodeBanner } from '../components/ui/profile-banners/novatrix/NovatrixCodeBanner';
import { NovatrixQuantBanner } from '../components/ui/profile-banners/novatrix/NovatrixQuantBanner';
import { SignalFloorBanner } from '../components/ui/profile-banners/signal-floor/SignalFloorBanner';
import { EdgeLedgerBanner } from '../components/ui/profile-banners/edge-ledger/EdgeLedgerBanner';
import { BadBeatBanner } from '../components/ui/profile-banners/bad-beat';
import { HaboobBanner } from '../components/ui/HaboobBanner';
import { EmeraldStormBanner } from '../components/banners/EmeraldStormBanner';
import { WinterBeaconBanner } from '../components/banners/WinterBeaconBanner';
import { SilverSupernovaBanner } from '../components/banners/SilverSupernovaBanner';
import { EmpirePulseBanner } from '../components/banners/EmpirePulseBanner';
import { AlpineSurgeBanner } from '../components/banners/AlpineSurgeBanner';
import { CrimsonKingdomBanner } from '../components/banners/CrimsonKingdomBanner';
import { SeismicStrikeBanner } from '../components/banners/SeismicStrikeBanner';
import { GoldenSpiralBanner } from '../components/banners/GoldenSpiralBanner';
import { ResponsibleGamblerBaseBanner, ResponsibleGamblerReadableBanner, ResponsibleGamblerDarkHumorBanner } from "../components/ui/profile-banners/responsible-gambler";
import { PinktoberBanner } from '../components/ui/profile-banners/pinktober';
import { TaskForceCamoBanner } from '../components/ui/profile-banners/task-force-camo';
import { ViceCityBanner } from '../components/ui/profile-banners/vice-city';
import { MidwayChargeBanner } from '../components/banners/MidwayChargeBanner';
import { CrescentCrownBanner } from '../components/banners/CrescentCrownBanner';
import { GothamMachBanner } from '../components/banners/GothamMachBanner';
import { ArcSurgeBanner } from '../components/banners/ArcSurgeBanner';
import { TurkeyGobblerBanner } from '../components/banners/TurkeyGobblerBanner';
import { BlackFridayBFBSBanner } from '../components/banners/BlackFridayBFBSBanner';
import { ChainLinkProBanner } from '../components/banners/ChainLinkProBanner';
import { ProSyndicateBanner } from '../components/banners/ProSyndicateBanner';
import { ChainLinkProAvatarRing } from '../components/ui/avatar-rings/chainlink-pro';
import { SyndicateAvatarRing } from '../components/ui/avatar-rings/syndicate';

export const AvatarRingMap: Record<string, React.FC<any>> = {
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
  'BullBearAvatarRing': BullBearAvatarRing,
  'EdgeLedgerAvatarRing': EdgeLedgerAvatarRing,
  'BadBeatAvatarRing': BadBeatAvatarRing,
  'ViceNeonAvatarRing': ViceNeonAvatarRing,
  'ViceCityAvatarRing': ViceNeonAvatarRing,
  'ring_vice_neon': ViceNeonAvatarRing,
  'ring_vice_city': ViceNeonAvatarRing,
  'ChainLinkProAvatarRing': ChainLinkProAvatarRing,
  'ChainLinkProRing': ChainLinkProAvatarRing,
  'ring_chainlink_pro': ChainLinkProAvatarRing,
  'ring_chainlink_pro_member': ChainLinkProAvatarRing,
  'SyndicateAvatarRing': SyndicateAvatarRing,
  'ProSyndicateRing': SyndicateAvatarRing,
  'ring_pro_syndicate': SyndicateAvatarRing,
};

export const ProfileBannerMap: Record<string, React.FC<any>> = {
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
  'SignalFloorBanner': SignalFloorBanner,
  'EdgeLedgerBanner': EdgeLedgerBanner,
  'BadBeatBanner': BadBeatBanner,
  'HaboobBanner': HaboobBanner,
  'EmeraldStormBanner': EmeraldStormBanner,
  'WinterBeaconBanner': WinterBeaconBanner,
  'SilverSupernovaBanner': SilverSupernovaBanner,
  'EmpirePulseBanner': EmpirePulseBanner,
  'AlpineSurgeBanner': AlpineSurgeBanner,
  'CrimsonKingdomBanner': CrimsonKingdomBanner,
  'SeismicStrikeBanner': SeismicStrikeBanner,
  'GoldenSpiralBanner': GoldenSpiralBanner,
  'PinktoberBanner': PinktoberBanner,
  'TaskForceCamoBanner': TaskForceCamoBanner,
  'ViceCityBanner': ViceCityBanner,
  'ViceNeonBanner': ViceCityBanner,
  'banner_vice_city': ViceCityBanner,
  'MidwayChargeBanner': MidwayChargeBanner,
  'MidwayCharge': MidwayChargeBanner,
  'banner_midway_charge': MidwayChargeBanner,
  'banner_chicago_bears': MidwayChargeBanner,
  'CrescentCrownBanner': CrescentCrownBanner,
  'CrescentCrown': CrescentCrownBanner,
  'banner_crescent_crown': CrescentCrownBanner,
  'banner_new_orleans_saints': CrescentCrownBanner,
  'GothamMachBanner': GothamMachBanner,
  'GothamMach': GothamMachBanner,
  'banner_gotham_mach': GothamMachBanner,
  'banner_new_york_jets': GothamMachBanner,
  'ArcSurgeBanner': ArcSurgeBanner,
  'ArcSurge': ArcSurgeBanner,
  'banner_arc_surge': ArcSurgeBanner,
  'banner_los_angeles_chargers': ArcSurgeBanner,
  'TurkeyGobblerBanner': TurkeyGobblerBanner,
  'TurkeyGobbler': TurkeyGobblerBanner,
  'banner_turkey_gobbler': TurkeyGobblerBanner,
  'banner_turkey_day_gobbler': TurkeyGobblerBanner,
  'BlackFridayBFBSBanner': BlackFridayBFBSBanner,
  'BlackFridayBanner': BlackFridayBFBSBanner,
  'BlackFridayBFBS': BlackFridayBFBSBanner,
  'BlackFriday': BlackFridayBFBSBanner,
  'banner_black_friday': BlackFridayBFBSBanner,
  'banner_black_friday_bfbs': BlackFridayBFBSBanner,
  'ChainLinkProBanner': ChainLinkProBanner,
  'banner_chainlink_pro': ChainLinkProBanner,
  'banner_chainlink_pro_member': ChainLinkProBanner,
  'ProSyndicateBanner': ProSyndicateBanner,
  'banner_pro_syndicate': ProSyndicateBanner,
};

export interface AvailableCosmetic {
  id: string;
  name: string;
  category: 'banner' | 'ring' | 'title';
  key?: string;
  titleText?: string;
  description?: string;
}

export const AVAILABLE_COSMETICS: AvailableCosmetic[] = [
  // Banners
  { id: 'banner_chainlink_pro', name: 'ChainLink Pro', category: 'banner', key: 'ChainLinkProBanner', description: 'Exclusive iridescent royal purple and neon nebula banner for ChainLink Pro members' },
  { id: 'banner_pro_syndicate', name: 'Pro Syndicate', category: 'banner', key: 'ProSyndicateBanner', description: 'Forged obsidian and molten gold banner for prestigious Pro Syndicate members' },
  { id: 'banner_black_friday', name: 'Black Friday: BFBS Edition', category: 'banner', key: 'BlackFridayBFBSBanner', description: 'Limited Edition BFBS Pitch-Black Thanksgiving Moneysink Banner' },
  { id: 'banner_turkey_gobbler', name: 'The Turkey Day Gobbler', category: 'banner', key: 'TurkeyGobblerBanner', description: 'Exclusive 1st Annual Gobbler Champion Banner' },
  { id: 'banner_inferno', name: 'Inferno Banner', category: 'banner', key: 'InfernoBanner' },
  { id: 'banner_boardroom', name: 'Board Room Banner', category: 'banner', key: 'BoardRoomBanner' },
  { id: 'banner_phantom', name: 'Phantom Star Banner', category: 'banner', key: 'PhantomStarBanner' },
  { id: 'banner_emerald', name: 'Emerald Storm Banner', category: 'banner', key: 'EmeraldStormBanner' },
  { id: 'banner_opulento', name: 'Opulento Vault Banner', category: 'banner', key: 'OpulentoVaultBanner' },
  { id: 'banner_xenon', name: 'Xenon Terminal Banner', category: 'banner', key: 'XenonTerminalBanner' },
  { id: 'banner_pinktober', name: 'Pinktober', category: 'banner', key: 'PinktoberBanner' },
  { id: 'banner_task_force_camo', name: 'Task Force Camo', category: 'banner', key: 'TaskForceCamoBanner' },
  { id: 'banner_vice_city', name: 'Vice Neon', category: 'banner', key: 'ViceCityBanner' },
  { id: 'banner_midway_charge', name: 'The Midway Charge', category: 'banner', key: 'MidwayChargeBanner' },
  { id: 'banner_crescent_crown', name: 'The Crescent Crown', category: 'banner', key: 'CrescentCrownBanner' },
  { id: 'banner_gotham_mach', name: 'The Gotham Mach', category: 'banner', key: 'GothamMachBanner' },
  { id: 'banner_arc_surge', name: 'The Arc Surge', category: 'banner', key: 'ArcSurgeBanner' },

  // Avatar Rings
  { id: 'ring_chainlink_pro', name: 'ChainLink Pro Ring', category: 'ring', key: 'ChainLinkProAvatarRing', description: 'Royal purple rotating laser beacon ring exclusive to ChainLink Pro members' },
  { id: 'ring_pro_syndicate', name: 'Pro Syndicate Ring', category: 'ring', key: 'SyndicateAvatarRing', description: 'Forged imperial gold and purple tech gear ring for Pro Syndicate members' },
  { id: 'ring_inferno', name: 'Inferno Ring', category: 'ring', key: 'Inferno' },
  { id: 'ring_hexagons', name: 'Hexagons Ring', category: 'ring', key: 'Hexagons' },
  { id: 'ring_ocean', name: 'Ocean Ring', category: 'ring', key: 'Ocean' },
  { id: 'ring_opulento', name: 'Opulento Ring', category: 'ring', key: 'OpulentoAvatarRing' },
  { id: 'ring_vice_neon', name: 'Vice Neon Ring', category: 'ring', key: 'ViceNeonAvatarRing' },

  // Titles
  { id: 'title_chainlink_pro_member', name: 'Pro Member', category: 'title', titleText: 'PRO MEMBER', key: 'ChainLinkProMemberTitle', description: 'Signature glowing purple ChainLink Pro Member title' },
  { id: 'title_pro_syndicate', name: 'Pro Syndicate', category: 'title', titleText: 'PRO SYNDICATE', key: 'SyndicateSyndicTitle', description: 'Exclusive high-tier gold inner-circle title for Pro members' },
  { id: 'title_black_friday', name: 'Black Friday: BFBS', category: 'title', titleText: 'BLACK FRIDAY', key: 'BlackFridayTitle', description: 'Limited Edition BFBS Black Friday Title' },
  { id: 'title_whale', name: 'High Roller', category: 'title', titleText: 'HIGH ROLLER' },
  { id: 'title_legend', name: 'Gridiron Legend', category: 'title', titleText: 'GRIDIRON LEGEND' },
  { id: 'title_champ', name: 'Weekly Champion', category: 'title', titleText: 'WEEKLY CHAMP' },
  { id: 'title_vip', name: 'ChainLink VIP', category: 'title', titleText: 'CHAINLINK VIP' },
  { id: 'title_vice_lord', name: 'Vice Lord', category: 'title', titleText: 'VICE LORD', key: 'ViceLordTitle' },
];


export function getCosmeticById(id?: string | null): AvailableCosmetic | undefined {
  if (!id) return undefined;
  return AVAILABLE_COSMETICS.find(c => c.id === id || c.key === id);
}

/**
 * Authoritative set of ChainLink Pro exclusive cosmetic item IDs and component keys.
 * Users must maintain an active Pro membership to equip and display these cosmetics.
 */
export const PRO_COSMETIC_IDS = new Set<string>([
  // Signal Floor collection
  'banner_signal_floor',
  'ring_signal_floor',
  'title_signal_floor',
  'SignalFloorBanner',
  'SignalFloorAvatarRing',
  'SignalFloorTitle',

  // Edge Ledger collection
  'banner_edge_ledger',
  'ring_edge_ledger',
  'title_edge_ledger',
  'EdgeLedgerBanner',
  'EdgeLedgerAvatarRing',
  'EdgeLedgerTitle',

  // ChainLink Pro Member items (Free Pro Exclusive)
  'banner_chainlink_pro',
  'banner_chainlink_pro_member',
  'ChainLinkProBanner',
  'ring_chainlink_pro',
  'ring_chainlink_pro_member',
  'ChainLinkProAvatarRing',
  'ChainLinkProRing',
  'title_chainlink_pro_member',
  'ChainLinkProMemberTitle',

  // Pro Syndicate items (300 Links Pro Exclusive)
  'banner_pro_syndicate',
  'ProSyndicateBanner',
  'ring_pro_syndicate',
  'SyndicateAvatarRing',
  'ProSyndicateRing',
  'title_pro_syndicate',
  'SyndicateSyndicTitle',
]);

/**
 * Checks whether an item ID or key is an active Pro exclusive cosmetic.
 */
export function isProCosmetic(itemId?: string | null): boolean {
  if (!itemId) return false;
  return PRO_COSMETIC_IDS.has(itemId);
}

/**
 * Verifies if a user profile currently holds an active Pro / VIP Founder membership.
 */
export function isUserPro(user?: any | null): boolean {
  if (!user) return false;
  return Boolean(
    user.premium ||
    user.isPremium ||
    user.chainlinkPremium ||
    user.scriptlessPremium ||
    user.membershipTier === 'PRO' ||
    user.membershipTier === 'VIP_FOUNDER' ||
    user.membershipTier === 'FOUNDER'
  );
}

