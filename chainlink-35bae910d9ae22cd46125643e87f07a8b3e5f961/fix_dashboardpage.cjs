const fs = require('fs');
let code = fs.readFileSync('src/pages/dashboard/DashboardPage.tsx', 'utf-8');

const startText = "import { Hexagons } from '../../components/ui/avatar-rings/hexagons';";
const endText = "export default function PlayDashboard() {";

let startIndex = code.indexOf(startText);
let endIndex = code.indexOf(endText);
if (endIndex === -1) {
  endIndex = code.indexOf("export default function DashboardPage() {");
}

if (startIndex !== -1 && endIndex !== -1) {
  const newImports = `import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../../components/ui/titles';
`;
  
  code = code.substring(0, startIndex) + 
         newImports + 
         code.substring(endIndex);
         
  fs.writeFileSync('src/pages/dashboard/DashboardPage.tsx', code);
  console.log("Fixed DashboardPage.tsx");
} else {
  console.log("Could not find start/end points");
}
