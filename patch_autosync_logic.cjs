const fs = require('fs');
const file = 'src/services/autoSync.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      // Also ensure any league actively used in a PickEm Campaign is synced
      const pickemCampaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
      pickemCampaignsSnap.docs.forEach(doc => {
          const c = doc.data();
          if (c.league) activeLeaguesSet.add(c.league);
          if (c.leagues) c.leagues.forEach(l => activeLeaguesSet.add(l));
      });
      
      const activeLeagues = Array.from(activeLeaguesSet);`;

const replStr = `      // Also ensure any league actively used in a PickEm Campaign is synced
      const pickemCampaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
      pickemCampaignsSnap.docs.forEach(doc => {
          const c = doc.data();
          if (c.league) activeLeaguesSet.add(c.league);
          if (c.leagues) c.leagues.forEach(l => activeLeaguesSet.add(l));
      });

      // Ensure any league in an active Link4 Segment is synced
      const link4SegmentsSnap = await adminDb.collection('link4Segments').get();
      const nowMs = Date.now();
      link4SegmentsSnap.docs.forEach(doc => {
          const seg = doc.data();
          const endMs = new Date(seg.endTime).getTime();
          // If the segment hasn't ended yet (plus 1 day buffer for scoring), sync its sports
          if (endMs + (24 * 60 * 60 * 1000) > nowMs && seg.allowedSports) {
              seg.allowedSports.forEach(l => activeLeaguesSet.add(l));
          }
      });

      // Ensure any league with manually activated games on the main board is synced
      const activeMatchupsSnap = await adminDb.collection('matchups').where('active', '==', true).get();
      activeMatchupsSnap.docs.forEach(doc => {
          const m = doc.data();
          if (m.league) activeLeaguesSet.add(m.league);
      });
      
      const activeLeagues = Array.from(activeLeaguesSet);`;

code = code.replace(targetStr, replStr);
fs.writeFileSync(file, code);
console.log("Patched autoSync logic");
