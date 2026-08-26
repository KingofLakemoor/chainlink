import fs from 'fs';
let content = fs.readFileSync('src/pages/pickem/PickEmLandingPage.tsx', 'utf-8');

content = content.replace(
  "import { db } from '../../lib/firebase';",
  "import { db, auth } from '../../lib/firebase';"
);

fs.writeFileSync('src/pages/pickem/PickEmLandingPage.tsx', content);
