const fs = require('fs');
let code = fs.readFileSync('src/services/autoSync.ts', 'utf8');

code = code.replace(".where('status', '==', 'STATUS_IN_PROGRESS')", ".where('status', 'in', ['STATUS_IN_PROGRESS', 'STATUS_DELAYED'])");

fs.writeFileSync('src/services/autoSync.ts', code);
