import fs from 'fs';
const content = fs.readFileSync('src/apiRouter.ts', 'utf8');

const newRouteLogic = `apiRouter.post("/admin/sync-schedules", validateAdmin, async (req, res) => {
  try {
    let { league } = req.body;
    let result = {};
    
    // Handle potential aliases from external crons
    if (league === 'MEX' || league === 'Liga MX') {
      league = 'LMX';
    }

    if (!league || league === 'All' || league === 'ALL') {
      // If no specific league is provided, sync all active leagues
      if (!adminDb) throw new Error('adminDb not initialized');
      const activeLeaguesSnap = await adminDb.collection('leagueSettings').where('active', '==', true).get();
      const activeLeagues = activeLeaguesSnap.docs.map(doc => doc.id);
      
      let totalUpdated = 0;
      let totalCreated = 0;
      const errors = [];
      
      for (const activeLeague of activeLeagues) {
        if (activeLeague === 'PROP') {
           await updateAllProps();
        } else {
           try {
             const res = await syncLeagueSchedules(activeLeague);
             totalUpdated += res.matchupsUpdated || 0;
             totalCreated += res.scoreMatchupsCreated || 0;
           } catch (e) {
             errors.push(\`\${activeLeague}: \${e.message}\`);
           }
        }
      }
      
      result = { 
        success: true, 
        message: 'Synced all active leagues', 
        matchupsUpdated: totalUpdated, 
        scoreMatchupsCreated: totalCreated,
        errors: errors.length > 0 ? errors : undefined
      };
    } else if (league === 'PROP') {
      await updateAllProps();
      result = { success: true, message: 'Prop updates complete' };
    } else {
      result = await syncLeagueSchedules(league);
    }

    // Call process-notifications internally to avoid requiring a separate cron job
    try {`;

const target = `apiRouter.post("/admin/sync-schedules", validateAdmin, async (req, res) => {
  try {
    const { league } = req.body;
    let result = {};
    if (league === 'PROP') {
      await updateAllProps();
      result = { success: true, message: 'Prop updates complete' };
    } else {
      result = await syncLeagueSchedules(league);
    }

    // Call process-notifications internally to avoid requiring a separate cron job
    try {`;

if (content.includes('const { league } = req.body;')) {
    const updated = content.replace(target, newRouteLogic);
    fs.writeFileSync('src/apiRouter.ts', updated);
    console.log("Patched apiRouter.ts");
} else {
    console.log("Could not find target content");
}
