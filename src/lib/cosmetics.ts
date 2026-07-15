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
import { ResponsibleGamblerBaseBanner, ResponsibleGamblerReadableBanner, ResponsibleGamblerDarkHumorBanner } from "../components/ui/profile-banners/responsible-gambler";

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
  'BadBeatAvatarRing': BadBeatAvatarRing
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
  'HaboobBanner': HaboobBanner
};
