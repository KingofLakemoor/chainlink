import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
    console.log("Starting manual sync of LLWS...");
    await syncLeagueSchedules('LLWS');
    console.log("Sync complete.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
