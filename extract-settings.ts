import fs from 'fs';
// Read ProfilePage
const profileCode = fs.readFileSync('src/pages/profile/ProfilePage.tsx', 'utf-8');

// The best way is for me to just manually construct the ProfileSettingsModal string,
// it's simple enough.
