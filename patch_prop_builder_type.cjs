const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/matchups/PlayerPropBuilderPage.tsx', 'utf8');

code = code.replace("type: 'PROP',", "type: 'STATS',");

fs.writeFileSync('src/pages/admin/matchups/PlayerPropBuilderPage.tsx', code);
