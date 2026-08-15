import { adminDb } from './src/lib/firebase-admin.js';
import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function fix() {
    console.log("Running sync with scoreboardOnly = FALSE for ATP...");
    await syncLeagueSchedules('ATP', false);
    console.log("Running sync with scoreboardOnly = FALSE for WTA...");
    await syncLeagueSchedules('WTA', false);
    console.log("Running sync with scoreboardOnly = FALSE for RPL...");
    await syncLeagueSchedules('RPL', false);
    
    const snap = await adminDb.collection('matchups')
        .where('league', '==', 'ATP')
        .where('active', '==', true)
        .where('status', '==', 'STATUS_SCHEDULED')
        .get();
    
    console.log(`After sync, found ${snap.size} active ATP matchups.`);
}
fix();
