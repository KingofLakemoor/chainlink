import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove import for ProfilePage
content = content.replace("import ProfilePage from './pages/profile/ProfilePage';\n", "");
content = content.replace("import ProfilePage from './pages/profile/ProfilePage';", "");

// 2. Remove the /profile Route
content = content.replace('<Route path="/profile" element={<PrivateRoute><MainLayout><ProfilePage /></MainLayout></PrivateRoute>} />\n', "");
content = content.replace('<Route path="/profile" element={<PrivateRoute><MainLayout><ProfilePage /></MainLayout></PrivateRoute>} />', "");

fs.writeFileSync('src/App.tsx', content);
