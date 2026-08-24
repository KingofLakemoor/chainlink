const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("import { startAutoSyncJob } from './src/services/autoSync.js';", "import { startAutoSyncJob } from './src/services/autoSync.js';\nimport { startPickemRemindersJob } from './src/services/pickemReminders.js';");
code = code.replace("startAutoSyncJob();", "startAutoSyncJob();\n    startPickemRemindersJob();");

fs.writeFileSync('server.ts', code);
