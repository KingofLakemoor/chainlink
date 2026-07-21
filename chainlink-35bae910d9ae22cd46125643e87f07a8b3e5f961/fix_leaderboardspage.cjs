const fs = require('fs');
let code = fs.readFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', 'utf-8');

const startText = "import { Hexagons } from '../../components/ui/avatar-rings/hexagons';";
const endText = "class CosmeticsErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean }> {";

let startIndex = code.indexOf(startText);
let endIndex = code.indexOf(endText);

if (startIndex !== -1 && endIndex !== -1) {
  const newImports = `import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../../components/ui/titles';
`;
  
  code = code.substring(0, startIndex) + 
         newImports + 
         code.substring(endIndex);
         
  fs.writeFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', code);
  console.log("Fixed LeaderboardsPage.tsx");
} else {
  console.log("Could not find start/end points");
}
