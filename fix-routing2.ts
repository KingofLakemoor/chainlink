import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove the lazy import
content = content.replace("const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage'));\n", "");

fs.writeFileSync('src/App.tsx', content);
