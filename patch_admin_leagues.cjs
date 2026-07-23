const fs = require('fs');
const file = 'src/pages/admin/leagues/AdminLeagues.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const ALL_LEAGUES = \["MLB", "NBA"/,
  'const ALL_LEAGUES = ["PROP", "SCRIPTLESS", "MLB", "NBA"'
);

fs.writeFileSync(file, code);
