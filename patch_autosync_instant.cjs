const fs = require('fs');
const file = 'src/services/autoSync.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  // Run every 2 minutes
  syncInterval = setInterval(async () => {`;

const replStr = `  // Run every 2 minutes
  const runSync = async () => {`;

const targetStr2 = `  }, 2 * 60 * 1000);`;

const replStr2 = `  };
  
  // Run immediately on start
  runSync();
  syncInterval = setInterval(runSync, 2 * 60 * 1000);`;

code = code.replace(targetStr, replStr).replace(targetStr2, replStr2);
fs.writeFileSync(file, code);
console.log("Patched autoSync.ts for instant execution");
