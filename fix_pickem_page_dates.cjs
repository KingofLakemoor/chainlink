const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf-8');

code = code.replace(
  "return now >= c.startDate && now <= c.endDate;",
  "const startToCheck = c.visibleDate || c.startDate;\n          return now >= startToCheck && now <= c.endDate;"
);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
