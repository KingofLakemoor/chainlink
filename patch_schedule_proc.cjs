const fs = require('fs');
const file = 'src/services/scheduleProcessor.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      let defaultActive = true;
      if (leagueSettingsSnap.exists) {
        const settings = leagueSettingsSnap.data();
        if (settings && typeof settings.active === 'boolean') {
          defaultActive = settings.active;
        }
      }`;

const replStr = `      let defaultActive = true;
      if (leagueSettingsSnap.exists) {
        const settings = leagueSettingsSnap.data();
        if (settings && typeof settings.active === 'boolean') {
          defaultActive = settings.active;
        }
      }
      
      // If we are actively syncing this league via autoSync fallback (because of a Pickem Campaign), 
      // ensure we make it active on the main game board so the games actually appear.
      if (!defaultActive) {
         defaultActive = true; 
      }`;

code = code.replace(targetStr, replStr);
fs.writeFileSync(file, code);
console.log("Patched scheduleProcessor to force defaultActive=true");
