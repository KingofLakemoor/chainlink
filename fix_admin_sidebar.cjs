const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/components/AdminSidebar.tsx', 'utf-8');

code = code.replace(
  "{ id: 'guide', label: 'Operating Guide', icon: BookOpen, path: '/admin/guide' },",
  "{ id: 'guide', label: 'Operating Guide', icon: BookOpen, path: '/admin/guide' },\n      { id: 'monthly-rollover', label: 'Monthly Rollover', icon: Settings, path: '/admin/system/rollover' },"
);

fs.writeFileSync('src/pages/admin/components/AdminSidebar.tsx', code);
