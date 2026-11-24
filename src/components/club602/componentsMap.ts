import React from 'react';

// Avatar Rings
import { Hexagons } from './components/avatar-rings/hexagons';
import { Hip } from './components/avatar-rings/hip';
import { Inferno as InfernoAvatarRing } from './components/avatar-rings/inferno';
import { Mandala } from './components/avatar-rings/mandala';
import { Ocean as OceanAvatarRing } from './components/avatar-rings/ocean';
import { PhantomStar as PhantomStarAvatarRing } from './components/avatar-rings/phantomstar';
import { PrimeCircuitRing } from './components/avatar-rings/prime-circuit-ring';
import { OpulentoAvatarRing } from './components/avatar-rings/opulento';
import { ZeroZeroAvatarRing } from './components/avatar-rings/zero-zero';
import { NovatrixCodeAvatarRing } from './components/avatar-rings/novatrix-code';
import { NovatrixQuantAvatarRing } from './components/avatar-rings/novatrix-quant';
import { SignalFloorAvatarRing } from './components/avatar-rings/signal-floor';
import { BullBearAvatarRing } from './components/avatar-rings/bull-bear';
import { EdgeLedgerAvatarRing } from './components/avatar-rings/edge-ledger';
import { BadBeatAvatarRing } from './components/avatar-rings/bad-beat';
import { ResponsibleGamblerAvatarRing } from './components/avatar-rings/responsible-gambler/ResponsibleGamblerAvatarRing';
import { ViceNeonAvatarRing } from './components/avatar-rings/vice-neon';

// Profile Banners
import { InfernoBanner } from './components/profile-banners/inferno';
import { AbyssalSwellBanner } from './components/profile-banners/abyssal-swell/AbyssalSwellBanner';
import { PhantomStarBanner } from './components/profile-banners/phantom-star';
import { PhantomStaticBanner } from './components/profile-banners/phantom-static/PhantomStaticBanner';
import { GenesisSyndicate } from './components/profile-banners/genesis-syndicate';
import { GlobalStageBanner } from './components/profile-banners/global-stage';
import { OpulentoVaultBanner } from './components/profile-banners/opulento';
import { ZeroZeroShaderBanner } from './components/profile-banners/zero-zero/ZeroZeroShaderBanner';
import { BoardRoomBanner } from './components/profile-banners/board-room/BoardRoomBanner';
import { FourthOfJulyBanner } from './components/profile-banners/fourth-of-july/FourthOfJulyBanner';
import { DaisyChainBanner } from './components/profile-banners/daisy-chain/DaisyChainBanner';
import { XenonTerminalBanner } from './components/profile-banners/xenon-terminal';
import { NovatrixCodeBanner } from './components/profile-banners/novatrix/NovatrixCodeBanner';
import { NovatrixQuantBanner } from './components/profile-banners/novatrix/NovatrixQuantBanner';
import { SignalFloorBanner } from './components/profile-banners/signal-floor/SignalFloorBanner';
import { EdgeLedgerBanner } from './components/profile-banners/edge-ledger/EdgeLedgerBanner';
import { BadBeatBanner } from './components/profile-banners/bad-beat';
import { HaboobBanner } from './components/profile-banners/HaboobBanner';
import {
  ResponsibleGamblerBaseBanner,
  ResponsibleGamblerReadableBanner,
  ResponsibleGamblerDarkHumorBanner
} from './components/profile-banners/responsible-gambler';
import { PinktoberBanner } from './components/profile-banners/pinktober';
import { TaskForceCamoBanner } from './components/profile-banners/task-force-camo';
import { ViceCityBanner } from './components/profile-banners/vice-city';

// WebGL Shader Banners
import { EmeraldStormBanner } from './components/banners/EmeraldStormBanner';
import { WinterBeaconBanner } from './components/banners/WinterBeaconBanner';
import { SilverSupernovaBanner } from './components/banners/SilverSupernovaBanner';
import { EmpirePulseBanner } from './components/banners/EmpirePulseBanner';
import { AlpineSurgeBanner } from './components/banners/AlpineSurgeBanner';
import { CrimsonKingdomBanner } from './components/banners/CrimsonKingdomBanner';
import { SeismicStrikeBanner } from './components/banners/SeismicStrikeBanner';
import { GoldenSpiralBanner } from './components/banners/GoldenSpiralBanner';
import { CrescentCrownBanner } from './components/banners/CrescentCrownBanner';
import { MidwayChargeBanner } from './components/banners/MidwayChargeBanner';
import { GothamMachBanner } from './components/banners/GothamMachBanner';
import { ArcSurgeBanner } from './components/banners/ArcSurgeBanner';
import { TurkeyGobblerBanner } from './components/banners/TurkeyGobblerBanner';

// Custom Titles
import { ResponsibleGamblerTitle } from './components/titles/responsible-gambler/ResponsibleGamblerTitle';
import { V1OriginatorTitle } from './components/titles/v1-originator';
import { OpulentoTitle } from './components/titles/opulento';
import { ZeroZeroTitle } from './components/titles/zero-zero';
import { NovatrixCodeTitle } from './components/titles/novatrix-code';
import { NovatrixQuantTitle } from './components/titles/novatrix-quant';
import { SignalFloorTitle } from './components/titles/signal-floor';
import { EdgeLedgerTitle } from './components/titles/edge-ledger';
import { BadBeatTitle } from './components/titles/bad-beat';
import { BetaTesterTitle } from './components/titles/beta-tester';
import { ViceLordTitle } from './components/titles/vice-lord';

/**
 * Universal Avatar Ring Component Map (keyed by component identifier or cosmetic ID)
 */
export const AvatarRingMap: Record<string, React.FC<any>> = {
  ResponsibleGamblerAvatarRing,
  Hexagons,
  Hip,
  Inferno: InfernoAvatarRing,
  Mandala,
  Ocean: OceanAvatarRing,
  PhantomStar: PhantomStarAvatarRing,
  PrimeCircuitRing,
  OpulentoAvatarRing,
  ZeroZeroAvatarRing,
  NovatrixCodeAvatarRing,
  NovatrixQuantAvatarRing,
  SignalFloorAvatarRing,
  BullBearAvatarRing,
  EdgeLedgerAvatarRing,
  BadBeatAvatarRing,
  // Direct cosmetic ID mappings
  ring_responsible_gambler: ResponsibleGamblerAvatarRing,
  ring_hexagons: Hexagons,
  ring_hip: Hip,
  ring_inferno: InfernoAvatarRing,
  ring_mandala: Mandala,
  ring_ocean: OceanAvatarRing,
  ring_phantomstar: PhantomStarAvatarRing,
  ring_prime_circuit: PrimeCircuitRing,
  ring_opulento: OpulentoAvatarRing,
  ring_zero_zero_zero: ZeroZeroAvatarRing,
  ring_novatrix_code: NovatrixCodeAvatarRing,
  ring_novatrix_quant: NovatrixQuantAvatarRing,
  ring_signal_floor: SignalFloorAvatarRing,
  ring_bull_bear: BullBearAvatarRing,
  ring_edge_ledger: EdgeLedgerAvatarRing,
  ring_bad_beat: BadBeatAvatarRing,
  ViceNeonAvatarRing,
  ring_vice_neon: ViceNeonAvatarRing
};

/**
 * Universal Profile & Roster Banner Component Map (keyed by component identifier or cosmetic ID)
 */
export const ProfileBannerMap: Record<string, React.FC<any>> = {
  ResponsibleGamblerBanner: ResponsibleGamblerBaseBanner,
  ResponsibleGamblerReadableBanner,
  ResponsibleGamblerDarkHumorBanner,
  BoardRoomBanner,
  FourthOfJulyBanner,
  InfernoBanner,
  AbyssalSwellBanner,
  PhantomStarBanner,
  PhantomStaticBanner,
  GenesisSyndicate,
  GlobalStageBanner,
  OpulentoVaultBanner,
  ZeroZeroShaderBanner,
  DaisyChainBanner,
  XenonTerminalBanner,
  NovatrixCodeBanner,
  NovatrixQuantBanner,
  SignalFloorBanner,
  EdgeLedgerBanner,
  BadBeatBanner,
  HaboobBanner,
  EmeraldStormBanner,
  WinterBeaconBanner,
  SilverSupernovaBanner,
  EmpirePulseBanner,
  AlpineSurgeBanner,
  CrimsonKingdomBanner,
  SeismicStrikeBanner,
  GoldenSpiralBanner,
  PinktoberBanner,
  TaskForceCamoBanner,
  ViceCityBanner,
  CrescentCrownBanner,
  MidwayChargeBanner,
  // Direct cosmetic ID mappings
  banner_responsible_gambler: ResponsibleGamblerBaseBanner,
  banner_board_room: BoardRoomBanner,
  banner_fourth_of_july: FourthOfJulyBanner,
  banner_inferno_board: InfernoBanner,
  banner_abyssal_swell: AbyssalSwellBanner,
  banner_phantom_star: PhantomStarBanner,
  banner_phantom_static: PhantomStaticBanner,
  banner_genesis_syndicate: GenesisSyndicate,
  banner_global_stage: GlobalStageBanner,
  banner_opulento_vault: OpulentoVaultBanner,
  banner_zero_zero_zero: ZeroZeroShaderBanner,
  banner_daisy_chain: DaisyChainBanner,
  banner_xenon_terminal: XenonTerminalBanner,
  banner_novatrix_code: NovatrixCodeBanner,
  banner_novatrix_quant: NovatrixQuantBanner,
  banner_signal_floor: SignalFloorBanner,
  banner_edge_ledger: EdgeLedgerBanner,
  banner_bad_beat: BadBeatBanner,
  banner_haboob: HaboobBanner,
  banner_emerald_storm: EmeraldStormBanner,
  banner_winter_beacon: WinterBeaconBanner,
  banner_silver_supernova: SilverSupernovaBanner,
  banner_empire_pulse: EmpirePulseBanner,
  banner_alpine_surge: AlpineSurgeBanner,
  banner_crimson_kingdom: CrimsonKingdomBanner,
  banner_seismic_strike: SeismicStrikeBanner,
  banner_golden_spiral: GoldenSpiralBanner,
  banner_pinktober: PinktoberBanner,
  banner_task_force_camo: TaskForceCamoBanner,
  banner_vice_city: ViceCityBanner,
  banner_crescent_crown: CrescentCrownBanner,
  banner_midway_charge: MidwayChargeBanner,
  GothamMachBanner,
  GothamMach: GothamMachBanner,
  banner_gotham_mach: GothamMachBanner,
  banner_new_york_jets: GothamMachBanner,
  ArcSurgeBanner,
  ArcSurge: ArcSurgeBanner,
  banner_arc_surge: ArcSurgeBanner,
  banner_los_angeles_chargers: ArcSurgeBanner,
  TurkeyGobblerBanner,
  TurkeyGobbler: TurkeyGobblerBanner,
  banner_turkey_gobbler: TurkeyGobblerBanner,
  banner_turkey_day_gobbler: TurkeyGobblerBanner
};

/**
 * Universal Custom Styled Title Component Map
 */
export const TitleMap: Record<string, React.FC<any>> = {
  ResponsibleGamblerTitle,
  BetaTesterTitle,
  V1OriginatorTitle,
  OpulentoTitle,
  ZeroZeroTitle,
  NovatrixCodeTitle,
  NovatrixQuantTitle,
  SignalFloorTitle,
  EdgeLedgerTitle,
  BadBeatTitle,
  ViceLordTitle,
  // Direct cosmetic ID mappings
  title_responsible_gambler: ResponsibleGamblerTitle,
  title_beta_tester: BetaTesterTitle,
  title_v1_originator: V1OriginatorTitle,
  title_opulento: OpulentoTitle,
  title_zero_zero: ZeroZeroTitle,
  title_novatrix_code: NovatrixCodeTitle,
  title_novatrix_quant: NovatrixQuantTitle,
  title_signal_floor: SignalFloorTitle,
  title_edge_ledger: EdgeLedgerTitle,
  title_bad_beat: BadBeatTitle,
  title_vice_lord: ViceLordTitle
};
