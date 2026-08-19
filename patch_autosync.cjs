const fs = require('fs');
const file = 'src/services/autoSync.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      const activeLeaguesSnap = await adminDb.collection('leagueSettings').where('active', '==', true).get();
      const activeLeagues = activeLeaguesSnap.docs.map(doc => doc.id);`;

const replStr = `      const activeLeaguesSnap = await adminDb.collection('leagueSettings').where('active', '==', true).get();
      const activeLeaguesSet = new Set(activeLeaguesSnap.docs.map(doc => doc.id));

      // Also ensure any league actively used in a PickEm Campaign is synced
      const pickemCampaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
      pickemCampaignsSnap.docs.forEach(doc => {
          const c = doc.data();
          if (c.league) activeLeaguesSet.add(c.league);
          if (c.leagues) c.leagues.forEach(l => activeLeaguesSet.add(l));
      });
      
      const activeLeagues = Array.from(activeLeaguesSet);`;

code = code.replace(targetStr, replStr);
fs.writeFileSync(file, code);
console.log("Patched autoSync.ts with PickEm logic");
