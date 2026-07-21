const fs = require('fs');
let code = fs.readFileSync('src/pages/profile/ProfilePage.tsx', 'utf-8');

const startText = "import { Hexagons } from '../../components/ui/avatar-rings/hexagons';";
const endText = "export default function ProfilePage() {";

const startIndex = code.indexOf(startText);
const endIndex = code.indexOf(endText);

if (startIndex !== -1 && endIndex !== -1) {
  const newImports = `import { AvatarRingMap, ProfileBannerMap } from '../../lib/cosmetics';
import { TitleMap } from '../../components/ui/titles';
`;
  
  code = code.substring(0, startIndex) + 
         newImports + 
         code.substring(endIndex);
         
  fs.writeFileSync('src/pages/profile/ProfilePage.tsx', code);
  console.log("Fixed ProfilePage.tsx");
} else {
  console.log("Could not find start/end points");
}
