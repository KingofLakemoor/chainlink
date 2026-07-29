const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf-8');
code = code.replace(
    "const MonthlyRolloverPage = React.lazy(() => import('./system/MonthlyRolloverPage'));\nconst MonthlyRolloverPage = React.lazy(() => import('./system/MonthlyRolloverPage'));",
    "const MonthlyRolloverPage = React.lazy(() => import('./system/MonthlyRolloverPage'));"
);
fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', code);
