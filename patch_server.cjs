const fs = require('fs');
const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const importStr = "import { startMonthlyRolloverJob } from './src/services/monthlyRollover.js';";
const replImport = importStr + "\nimport { startAutoSyncJob } from './src/services/autoSync.js';";

code = code.replace(importStr, replImport);

const callStr = "    startMonthlyRolloverJob();";
const replCall = callStr + "\n    startAutoSyncJob();";

code = code.replace(callStr, replCall);

fs.writeFileSync(file, code);
console.log("Patched server.ts with startAutoSyncJob");
