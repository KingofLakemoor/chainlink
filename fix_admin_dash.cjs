const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf-8');

const importStatement = "const MonthlyRolloverPage = React.lazy(() => import('./system/MonthlyRolloverPage'));\nconst EditPickPage = React.lazy(() => import('./picks/EditPickPage'));";
code = code.replace("const EditPickPage = React.lazy(() => import('./picks/EditPickPage'));", importStatement);

const routeStatement = "<Route path=\"system/rollover\" element={<MonthlyRolloverPage />} />\n                {/* Fallback */}";
code = code.replace("{/* Fallback */}", routeStatement);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', code);
