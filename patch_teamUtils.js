import fs from 'fs';

// Patch MatchupCard.tsx
let matchupCard = fs.readFileSync('src/components/ui/MatchupCard.tsx', 'utf8');
matchupCard = matchupCard.replace(
    "import { Link as LinkIcon, Link2, Share2, Info, Star, ChevronDown, ChevronUp } from 'lucide-react';",
    "import { Link as LinkIcon, Link2, Share2, Info, Star, ChevronDown, ChevronUp } from 'lucide-react';\nimport { getTeamShortName } from '../../lib/teamUtils';"
);
matchupCard = matchupCard.replace(
    "{m.type === 'OVER_UNDER' ? 'OVER' : (m.awayTeam.shortName || m.awayTeam.name)}",
    "{m.type === 'OVER_UNDER' ? 'OVER' : getTeamShortName(m, false)}"
);
matchupCard = matchupCard.replace(
    "{m.type === 'OVER_UNDER' ? 'UNDER' : `@${m.homeTeam.shortName || m.homeTeam.name}`}",
    "{m.type === 'OVER_UNDER' ? 'UNDER' : `@${getTeamShortName(m, true)}`}"
);
fs.writeFileSync('src/components/ui/MatchupCard.tsx', matchupCard);

// Patch PickEmPage.tsx
let pickEmPage = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');
pickEmPage = pickEmPage.replace(
    "import { FirebaseImage } from '../../components/ui/FirebaseImage';",
    "import { FirebaseImage } from '../../components/ui/FirebaseImage';\nimport { getTeamShortName } from '../../lib/teamUtils';"
);
// Replace all 4 occurrences
pickEmPage = pickEmPage.replace(
    /\{m\.type === 'OVER_UNDER' \? 'OVER' : \(m\.awayTeam\.shortName \|\| m\.awayTeam\.name\)\}/g,
    "{m.type === 'OVER_UNDER' ? 'OVER' : getTeamShortName(m, false)}"
);
pickEmPage = pickEmPage.replace(
    /\{m\.type === 'OVER_UNDER' \? 'UNDER' : \(m\.homeTeam\.shortName \|\| m\.homeTeam\.name\)\}/g,
    "{m.type === 'OVER_UNDER' ? 'UNDER' : getTeamShortName(m, true)}"
);
fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', pickEmPage);

// Patch dashboard-pick.tsx
let dashPick = fs.readFileSync('src/components/dashboard/dashboard-pick.tsx', 'utf8');
dashPick = dashPick.replace(
    "import { FirebaseImage } from '../ui/FirebaseImage';",
    "import { FirebaseImage } from '../ui/FirebaseImage';\nimport { getTeamShortName } from '../../lib/teamUtils';"
);
dashPick = dashPick.replace(
    "{activeMatchup.awayTeam.shortName || activeMatchup.awayTeam.name}",
    "{getTeamShortName(activeMatchup, false)}"
);
dashPick = dashPick.replace(
    /\{activeMatchup\.type === 'OVER_UNDER' \? 'OVER' : \(activeMatchup\.awayTeam\.shortName \|\| activeMatchup\.awayTeam\.name\)\}/g,
    "{activeMatchup.type === 'OVER_UNDER' ? 'OVER' : getTeamShortName(activeMatchup, false)}"
);
dashPick = dashPick.replace(
    /\{activeMatchup\.type === 'OVER_UNDER' \? 'UNDER' : \(activeMatchup\.homeTeam\.shortName \|\| activeMatchup\.homeTeam\.name\)\}/g,
    "{activeMatchup.type === 'OVER_UNDER' ? 'UNDER' : getTeamShortName(activeMatchup, true)}"
);
fs.writeFileSync('src/components/dashboard/dashboard-pick.tsx', dashPick);

