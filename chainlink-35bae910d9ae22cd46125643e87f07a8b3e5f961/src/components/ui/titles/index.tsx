import { ResponsibleGamblerTitle } from "./responsible-gambler/ResponsibleGamblerTitle";
import React from 'react';
import { V1OriginatorTitle } from './v1-originator';
import { OpulentoTitle } from './opulento';
import { ZeroZeroTitle } from './zero-zero';
import { NovatrixCodeTitle } from './novatrix-code';
import { NovatrixQuantTitle } from './novatrix-quant';
import { SignalFloorTitle } from './signal-floor';
import { EdgeLedgerTitle } from './edge-ledger';
import { BadBeatTitle } from './bad-beat';
import { BetaTesterTitle } from './beta-tester';

export const TitleMap: Record<string, React.FC<any>> = {
  "ResponsibleGamblerTitle": ResponsibleGamblerTitle,
  "BetaTesterTitle": BetaTesterTitle,
  'V1OriginatorTitle': V1OriginatorTitle,
  'OpulentoTitle': OpulentoTitle,
  'ZeroZeroTitle': ZeroZeroTitle,
  'NovatrixCodeTitle': NovatrixCodeTitle,
  'NovatrixQuantTitle': NovatrixQuantTitle,
  'SignalFloorTitle': SignalFloorTitle,
  'EdgeLedgerTitle': EdgeLedgerTitle,
  'BadBeatTitle': BadBeatTitle,
};
