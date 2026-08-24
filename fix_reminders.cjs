const fs = require('fs');
let code = fs.readFileSync('src/services/pickemReminders.ts', 'utf8');

code = code.replace(/\\\`/g, "\`");
code = code.replace(/\\\$/g, "$");

fs.writeFileSync('src/services/pickemReminders.ts', code);
