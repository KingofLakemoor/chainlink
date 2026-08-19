import { syncLeagueSchedules } from './src/services/scheduleProcessor.js';

async function run() {
    console.log("Syncing LLWS...");
    await syncLeagueSchedules('LLWS');
    console.log("LLWS Synced");
}
run().catch(console.error).finally(() => process.exit(0));
