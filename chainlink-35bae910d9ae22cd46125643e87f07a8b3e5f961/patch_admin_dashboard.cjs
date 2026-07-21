const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

if (!code.includes('import PlayerPropBuilderPage')) {
  code = code.replace("import PGABuilderPage from './pga/PGABuilderPage';", "import PGABuilderPage from './pga/PGABuilderPage';\nimport PlayerPropBuilderPage from './matchups/PlayerPropBuilderPage';");
}

if (!code.includes('<Route path="prop-builder"')) {
  code = code.replace('<Route path="pga-builder" element={<PGABuilderPage />} />', '<Route path="pga-builder" element={<PGABuilderPage />} />\n                <Route path="prop-builder" element={<PlayerPropBuilderPage />} />');
}

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', code);
