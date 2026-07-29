const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/system/MonthlyRolloverPage.tsx', 'utf-8');

code = code.replace("from '../../../components/ui/Card';", "from '../../../components/ui/card';");
code = code.replace("from '../../../components/ui/Button';", "from '../../../components/ui/button';");

fs.writeFileSync('src/pages/admin/system/MonthlyRolloverPage.tsx', code);
